import { afterAll, beforeAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import sharp from 'sharp';
import { createApp } from '../src/app.ts';
import { migrate } from '../src/db/migrate.ts';
import { processImage } from '../src/media/image.ts';
import { readAvatarUrl } from '../src/profile/avatar.ts';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const subjects = Array.from({ length: 3 }, () => `avatar:${crypto.randomUUID()}`);
const ids: string[] = [];
const files = new Map<string, Buffer>();
const signed: string[] = [];
let failUpload = false;
let failSigning = false;
const storage = {
  assertPrivate: async () => {},
  put: async (key: string, bytes: Buffer) => { files.set(key, bytes); if (failUpload) throw Error('private provider details'); },
  remove: async (keys: string[]) => { keys.forEach(key => files.delete(key)); },
  signRead: async (key: string) => { signed.push(key); if (failSigning) throw Error('private signing details'); return 'https://media.test/avatar?temporary=1'; },
};
const verifyToken = async (token: string) => { if (!subjects.includes(token)) throw Error(); return { subject: token }; };
const app = createApp({ origins: [], logger: false, database: { probe: async () => {}, close: async () => {} },
  avatars: { pool, storage, processImage, verifyToken }, presence: { pool, verifyToken, avatarStorage: storage } });
const headers = (i: number) => ({ authorization: `Bearer ${subjects[i]}`, 'content-type': 'image/png' });
let image: Buffer;
beforeAll(async () => {
  await migrate(pool);
  image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#6d28d9' } }).png().toBuffer();
  for (const subject of subjects) ids.push((await pool.query<{ id: string }>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id', [subject])).rows[0]!.id);
  await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'accepted')", [ids[0], ids[1]]);
});
afterAll(async () => {
  await app.close();
  await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])', [ids]);
  await pool.end();
});
it('rejects unauthenticated and malformed avatar uploads without storing files', async () => {
  expect((await app.inject({ method: 'PUT', url: '/v1/me/avatar', headers: { 'content-type': 'image/png' }, payload: image })).statusCode).toBe(401);
  expect((await app.inject({ method: 'PUT', url: '/v1/me/avatar', headers: headers(0), payload: Buffer.from('not an image') })).statusCode).toBe(400);
  expect(files.size).toBe(0);
});
it('stores a normalized private avatar and only signs it for current friends with a location', async () => {
  const response = await app.inject({ method: 'PUT', url: '/v1/me/avatar', headers: headers(0), payload: image });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual({ avatarUrl: 'https://media.test/avatar?temporary=1' });
  expect(files.size).toBe(1);
  const normalized = [...files.values()][0]!;
  expect((await sharp(normalized).metadata()).format).toBe('jpeg');
  expect(await readAvatarUrl(pool, storage, ids[0]!)).toBe('https://media.test/avatar?temporary=1');
  await app.inject({ method: 'PUT', url: '/v1/me/location', headers: { authorization: `Bearer ${subjects[0]}` }, payload: { latitude: -7.75, longitude: 110.36, accuracyMeters: 10, capturedAtMs: Date.now() } });
  signed.length = 0;
  const stranger = await app.inject({ url: '/v1/friends/locations', headers: { authorization: `Bearer ${subjects[2]}` } });
  expect(stranger.json().items).toEqual([]);
  expect(signed).toEqual([]);
  const friend = await app.inject({ url: '/v1/friends/locations', headers: { authorization: `Bearer ${subjects[1]}` } });
  expect(friend.json().items[0].avatarUrl).toBe(response.json().avatarUrl);
  expect(friend.json().items[0]).not.toHaveProperty('avatarKey');
});
it('replaces and removes only the authenticated account avatar', async () => {
  expect((await app.inject({ method: 'PUT', url: '/v1/me/avatar', headers: headers(0), payload: image })).statusCode).toBe(200);
  expect(files.size).toBe(1);
  expect((await app.inject({ method: 'DELETE', url: '/v1/me/avatar', headers: { authorization: `Bearer ${subjects[1]}` } })).statusCode).toBe(204);
  expect(files.size).toBe(1);
  expect((await app.inject({ method: 'DELETE', url: '/v1/me/avatar', headers: { authorization: `Bearer ${subjects[0]}` } })).statusCode).toBe(204);
  expect(files.size).toBe(0);
  expect(await readAvatarUrl(pool, storage, ids[0]!)).toBeNull();
});
it('cleans failed uploads without removing the previous avatar and fails safely when signing is unavailable', async () => {
  await app.inject({ method: 'PUT', url: '/v1/me/avatar', headers: headers(0), payload: image });
  failUpload = true;
  try {
    const response = await app.inject({ method: 'PUT', url: '/v1/me/avatar', headers: headers(0), payload: image });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('private provider details');
    expect(files.size).toBe(1);
  } finally { failUpload = false; }
  failSigning = true;
  try { expect(await readAvatarUrl(pool, storage, ids[0]!)).toBeNull(); }
  finally { failSigning = false; }
});
