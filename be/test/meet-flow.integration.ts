import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { Pool } from 'pg';
import sharp from 'sharp';
import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, type Hex } from 'viem';
import { createApp } from '../src/app.ts';
import { createTokenVerifier } from '../src/auth/token.ts';
import { createProfileRepository } from '../src/profile/repository.ts';
import { processImage } from '../src/media/image.ts';
import { migrate } from '../src/db/migrate.ts';
import { meetTypes, hashOffer } from '../src/protocol/index.ts';
import { processMeetOutbox, type MeetTransport, type RelayJob, type MeetRecord } from '../src/relay/worker.ts';

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const wallets = Array.from({ length: 3 }, () => privateKeyToAccount(generatePrivateKey()));
const ids: string[] = [], tokens: string[] = [], moments: string[] = [];
const objects = new Map<string, Buffer>();
const domain = { chainId: 10143, verifyingContract: '0x1111111111111111111111111111111111111111' as const };
let app: ReturnType<typeof createApp>;
const headers = (index = 0) => ({ authorization: `Bearer ${tokens[index]}` });
const storage = {
  assertPrivate: async () => {},
  put: async (key: string, bytes: Buffer) => { if (objects.has(key)) throw Error('Object already exists'); objects.set(key, Buffer.from(bytes)); },
  remove: async (keys: string[]) => { for (const key of keys) objects.delete(key); },
  signRead: async (key: string) => { if (!objects.has(key)) throw Error('Missing object'); return `https://synthetic.invalid/${key}`; },
  read: async (key: string) => { const bytes = objects.get(key); if (!bytes) throw Error('Missing object'); return Buffer.from(bytes); },
};
beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
  await migrate(pool);
  const pair = await generateKeyPair('ES256');
  const verifier = await createTokenVerifier({ appId: 'mootz-flow-test', verificationKey: await exportSPKI(pair.publicKey) });
  const verifyToken = (token: string) => verifier.verify(token);
  app = createApp({
    origins: [], logger: false,
    database: { probe: async () => { await pool.query('SELECT PostGIS_Version()'); }, close: async () => {} },
    profile: { verifyToken, repository: createProfileRepository(pool) },
    wallet: { pool, verifyToken, chainId: 10143, domain: 'http://localhost:3000' },
    moments: { pool, verifyToken, storage, processImage },
    meets: { pool, verifyToken, domain, storage },
    dots: { pool, verifyToken },
  });
  for (let index = 0; index < wallets.length; index++) {
    const subject = `did:privy:flow-${crypto.randomUUID()}`;
    tokens.push(await new SignJWT({}).setProtectedHeader({ alg: 'ES256' }).setIssuer('privy.io').setAudience('mootz-flow-test').setSubject(subject).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey));
    const profile = await app.inject({ url: '/v1/me', headers: headers(index) });
    expect(profile.statusCode).toBe(200); ids.push(profile.json().id);
    await pool.query('INSERT INTO wallet_bindings(account_id,chain_id,address,verified_at) VALUES($1,10143,$2,now())', [ids[index], wallets[index]!.address.toLowerCase()]);
  }
});
afterAll(async () => {
  try {
    for (const table of ['meet_outbox', 'dots']) await pool.query(`DELETE FROM ${table} WHERE meet_id IN(SELECT id FROM meets WHERE poster_id=ANY($1::uuid[]))`, [ids]);
    await pool.query('DELETE FROM meets WHERE poster_id=ANY($1::uuid[])', [ids]);
    await pool.query('DELETE FROM meet_offers WHERE poster_id=ANY($1::uuid[])', [ids]);
    await pool.query('DELETE FROM moment_media WHERE moment_id=ANY($1::uuid[])', [moments]);
    await pool.query('DELETE FROM moments WHERE id=ANY($1::uuid[])', [moments]);
    for (const table of ['wallet_bindings', 'onchain_preferences']) await pool.query(`DELETE FROM ${table} WHERE account_id=ANY($1::uuid[])`, [ids]);
    await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])', [ids]);
  } finally { if (app) await app.close(); await pool.end(); objects.clear(); }
});

it('runs signed capture-to-Meet-to-Dot-to-relay through the composed app without widening moment access', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#6633aa' } }).png().toBuffer();
  const draft = await app.inject({ method: 'POST', url: '/v1/moments', headers: headers(), payload: { source: 'capture' } });
  expect(draft.statusCode).toBe(201); const momentId: string = draft.json().id; moments.push(momentId);
  for (const side of ['front', 'back']) {
    expect((await app.inject({ method: 'PUT', url: `/v1/moments/${momentId}/media/${side}`, headers: { ...headers(), 'content-type': 'image/png' }, payload: png })).statusCode).toBe(200);
  }
  expect((await app.inject({ method: 'POST', url: `/v1/moments/${momentId}/publish`, headers: headers(), payload: {} })).statusCode).toBe(200);
  const created = await app.inject({ method: 'POST', url: '/v1/meet/offers', headers: headers(), payload: { momentId } });
  expect(created.statusCode).toBe(201); const offer = created.json();
  const message = { ...offer.offer, issuedAt: BigInt(offer.offer.issuedAt), expiresAt: BigInt(offer.offer.expiresAt) };
  const posterSignature = await wallets[0]!.signTypedData({ domain: offer.domain, types: meetTypes, primaryType: 'MeetOffer', message });
  const proof = { offerDigest: hashOffer(offer.domain, message), posterSignature };
  const prefix = `/v1/meet/offers/${offer.id}`;
  expect((await app.inject({ method: 'PUT', url: prefix + '/signature', headers: headers(), payload: { signature: posterSignature } })).statusCode).toBe(200);
  const captured = (await pool.query<{ time: Date }>('SELECT clock_timestamp() AS time')).rows[0]!.time;
  const sample = { latitude: -6.2, longitude: 106.8, accuracyMeters: 5, capturedAtMs: captured.getTime() };
  expect((await app.inject({ method: 'PUT', url: prefix + '/location', headers: headers(), payload: sample })).statusCode).toBe(200);
  const preview = await app.inject({ method: 'POST', url: prefix + '/preview', headers: headers(1), payload: proof });
  expect(preview.statusCode).toBe(200); expect(preview.body).not.toContain('https://');
  const full = preview.json();
  const image = await app.inject({ method: 'POST', url: full.moment.images.find((item: { side: string }) => item.side === 'front').path, headers: headers(1), payload: proof });
  expect(image.statusCode).toBe(200); expect(image.headers['cache-control']).toBe('no-store');
  expect((await sharp(image.rawPayload).metadata()).format).toBe('jpeg');
  for (const suffix of ['', '/media/front']) expect((await app.inject({ url: `/v1/moments/${momentId}${suffix}`, headers: headers(1) })).statusCode).toBe(404);
  const scannerSignature = await wallets[1]!.signTypedData({ domain: offer.domain, types: meetTypes, primaryType: 'MeetAccept', message: full.acceptance });
  const payload = { offerDigest: proof.offerDigest, action: full.acceptance.action, signature: scannerSignature, location: sample };
  const accepted = await app.inject({ method: 'POST', url: prefix + '/accept', headers: headers(1), payload });
  expect(accepted.statusCode).toBe(201); expect(accepted.json().onchainStatus).toBe('pending');
  const retried = await app.inject({ method: 'POST', url: prefix + '/accept', headers: headers(1), payload });
  expect(retried.statusCode).toBe(200); expect(retried.json()).toEqual(accepted.json());
  const dotId = accepted.json().dotId;
  const firstUnlocks = await pool.query('SELECT account_id,unlocked_at FROM achievement_unlocks WHERE account_id=ANY($1::uuid[]) AND frame_id=$2 ORDER BY account_id', [ids.slice(0,2),'first_meet']);
  expect(firstUnlocks.rowCount).toBe(2);
  expect((await pool.query('SELECT account_id,unlocked_at FROM achievement_unlocks WHERE account_id=ANY($1::uuid[]) AND frame_id=$2 ORDER BY account_id', [ids.slice(0,2),'first_meet'])).rows).toEqual(firstUnlocks.rows);
  expect((await app.inject({ url: `/v1/dots/${dotId}`, headers: headers(1) })).statusCode).toBe(200);
  expect((await app.inject({ url: `/v1/dots/${dotId}`, headers: headers(2) })).statusCode).toBe(404);
  expect((await app.inject({ method: 'PUT', url: `/v1/dots/${dotId}/visibility`, headers: headers(1), payload: { hidden: true } })).statusCode).toBe(200);
  expect((await app.inject({ method: 'PUT', url: `/v1/dots/${dotId}/visibility`, headers: headers(), payload: { hidden: false } })).statusCode).toBe(409);
  expect((await app.inject({ method: 'PUT', url: `/v1/dots/${dotId}/visibility`, headers: headers(1), payload: { hidden: false } })).statusCode).toBe(200);
  const raw = '0x010203' as Hex, hash = keccak256(raw); let prepared: RelayJob | undefined; let record: MeetRecord | null = null;
  const transport: MeetTransport = {
    validateSigned: vi.fn(async () => {}),
    readRecord: vi.fn(async () => record),
    prepare: vi.fn(async job => { expect(job.id).toBe(offer.id); prepared = job; return { rawTransaction: raw, hash }; }),
    broadcast: vi.fn(async () => {
      expect(prepared).toBeDefined();
      const persisted = (await pool.query('SELECT raw_transaction,transaction_hash FROM meet_outbox WHERE meet_id=$1', [offer.id])).rows[0];
      expect(persisted).toEqual({ raw_transaction: raw, transaction_hash: hash });
      const job = prepared!; record = { poster: job.posterWallet, scanner: job.scannerWallet, acceptedAt: job.acceptedAt, eventId: job.offer.eventId, photoCommitment: job.offer.photoCommitment }; return hash;
    }),
    receipt: vi.fn(async () => 'success' as const),
  };
  expect((await processMeetOutbox(pool, transport)).recorded).toBe(1);
  expect((await processMeetOutbox(pool, transport)).processed).toBe(0); expect(transport.broadcast).toHaveBeenCalledTimes(1);
  expect((await app.inject({ url: `/v1/dots/${dotId}`, headers: headers(1) })).json().onchainStatus).toBe('recorded');
  expect((await pool.query('SELECT (SELECT count(*) FROM dots WHERE meet_id=$1) AS dots,(SELECT count(*) FROM meet_outbox WHERE meet_id=$1) AS jobs', [offer.id])).rows[0]).toEqual({ dots: '1', jobs: '1' });
  expect((await pool.query('SELECT poster_location FROM meet_offers WHERE id=$1', [offer.id])).rows[0].poster_location).toBeNull();
  expect((await app.inject({ url: `/v1/moments/${momentId}`, headers: headers(1) })).statusCode).toBe(404);
});
