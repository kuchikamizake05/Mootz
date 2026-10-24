import { randomUUID } from 'node:crypto';
import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { expect, it } from 'vitest';
import { Pool } from 'pg';
import { createApp } from '../src/app.ts';
import { createTokenVerifier } from '../src/auth/token.ts';
import { createProfileRepository } from '../src/profile/repository.ts';
import { migrate } from '../src/db/migrate.ts';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

it('uses signed identity for persisted preferences and rejects account spoofing', async () => {
  if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await migrate(pool);
  const keys = await generateKeyPair('ES256');
  const verifier = await createTokenVerifier({ appId: 'integration-app', verificationKey: await exportSPKI(keys.publicKey) });
  const subject = `did:privy:integration-${randomUUID()}`;
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'ES256' }).setSubject(subject).setIssuer('privy.io').setAudience('integration-app').setIssuedAt().setExpirationTime('5m').sign(keys.privateKey);
  const app = createApp({ origins: ['https://app.test'], database: { probe: async () => { await pool.query('SELECT PostGIS_Version()'); }, close: async () => {} }, logger: false,
    profile: { verifyToken: token => verifier.verify(token), repository: createProfileRepository(pool) },
    wallet: { verifyToken: token => verifier.verify(token), pool, domain: 'mootz.test', chainId: 10143 } });
  const headers = { authorization: `Bearer ${token}` };
  try {
    expect((await app.inject('/v1/me')).statusCode).toBe(401);
    const first = await app.inject({ url: '/v1/me', headers });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ recordMeet: true, onboardingCompletedAt: null, wallet: null, username: null });
    const spoof = await app.inject({ method: 'PATCH', url: '/v1/me/preferences', headers, payload: { recordMeet: false, accountId: randomUUID() } });
    expect(spoof.statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/v1/me/preferences', headers, payload: { recordMeet: 'false' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/v1/me/preferences', headers, payload: { recordMeet: false } })).statusCode).toBe(200);
    const second = await app.inject({ url: '/v1/me', headers });
    expect(second.json()).toMatchObject({ id: first.json().id, recordMeet: false });
    expect((await app.inject({ method: 'POST', url: '/v1/me/onboarding', headers, payload: {} })).json().onboardingCompletedAt).toBeTruthy();
    const handle = `it_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const put = (payload: unknown, h: Record<string, string> = headers) => app.inject({ method: 'PUT', url: '/v1/me/username', headers: h, payload: payload as object });
    expect((await put({ username: handle }, {})).statusCode).toBe(401);
    for (const username of ['ab', 'bad name', 'a'.repeat(21), 'admin', 'Support']) { const bad = await put({ username }); expect(bad.statusCode).toBe(400); expect(bad.json().error.code).toBe('INVALID_USERNAME'); }
    const set = await put({ username: `  ${handle.toUpperCase()} ` });
    expect(set.statusCode).toBe(200); expect(set.json()).toMatchObject({ id: first.json().id, username: handle });
    expect((await put({ username: handle })).statusCode).toBe(200);
    expect((await app.inject({ url: '/v1/me', headers })).json().username).toBe(handle);
    expect((await app.inject({ method: 'PATCH', url: '/v1/me/preferences', headers, payload: { recordMeet: false } })).json().username).toBe(handle);
    expect((await app.inject({ method: 'POST', url: '/v1/me/onboarding', headers, payload: {} })).json().username).toBe(handle);
    const other = `did:privy:integration-${randomUUID()}`;
    const otherToken = await new SignJWT({}).setProtectedHeader({ alg: 'ES256' }).setSubject(other).setIssuer('privy.io').setAudience('integration-app').setIssuedAt().setExpirationTime('5m').sign(keys.privateKey);
    const otherHeaders = { authorization: `Bearer ${otherToken}` };
    try {
      const taken = await put({ username: handle.toUpperCase() }, otherHeaders);
      expect(taken.statusCode).toBe(409); expect(taken.json().error).toMatchObject({ code: 'USERNAME_TAKEN' });
      expect((await app.inject({ url: '/v1/me', headers: otherHeaders })).json().username).toBeNull();
      const changed = `${handle.slice(0, 15)}_2`;
      expect((await put({ username: changed })).json().username).toBe(changed);
      expect((await put({ username: handle }, otherHeaders)).statusCode).toBe(200);
      expect((await put({ username: handle })).statusCode).toBe(409);
    } finally {
      for (const table of ['preference_history', 'onchain_preferences']) await pool.query(`DELETE FROM ${table} WHERE account_id IN (SELECT id FROM accounts WHERE provider_subject=$1)`, [other]);
      await pool.query('DELETE FROM accounts WHERE provider_subject=$1', [other]);
    }
    const signer = privateKeyToAccount(generatePrivateKey());
    const issued = await app.inject({ method: 'POST', url: '/v1/me/wallet-challenges', headers, payload: { wallet: signer.address } });
    expect(issued.statusCode).toBe(200);
    const proof = issued.json() as { challengeId: string; message: string };
    const bound = await app.inject({ method: 'POST', url: '/v1/me/wallet-bindings', headers, payload: {
      wallet: signer.address, challengeId: proof.challengeId, signature: await signer.signMessage({ message: proof.message }),
    } });
    expect(bound.statusCode).toBe(200);
    expect((await app.inject({ url: '/v1/me', headers })).json().wallet).toBe(signer.address.toLowerCase());
  } finally {
    await app.close();
    const account = await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1', [subject]);
    if (account.rows[0]) {
      await pool.query('DELETE FROM wallet_challenges WHERE subject=$1', [subject]);
      await pool.query('DELETE FROM wallet_bindings WHERE account_id=$1', [account.rows[0].id]);
      await pool.query('DELETE FROM preference_history WHERE account_id=$1', [account.rows[0].id]);
      await pool.query('DELETE FROM onchain_preferences WHERE account_id=$1', [account.rows[0].id]);
      await pool.query('DELETE FROM accounts WHERE id=$1', [account.rows[0].id]);
    }
    await pool.end();
  }
});
