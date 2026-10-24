import { afterAll, beforeAll, expect, it } from 'vitest';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { createApp } from '../src/app.ts';
import { displayLocation } from '../src/moments/routes.ts';
import { purgeExpiredFriendLocations } from '../src/presence/routes.ts';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const subjects = Array.from({ length: 4 }, () => `presence:${crypto.randomUUID()}`);
const ids: string[] = [];
const app = createApp({ origins: [], logger: false, database: { probe: async () => {}, close: async () => {} },
  presence: { pool, verifyToken: async token => { if (!subjects.includes(token)) throw Error(); return { subject: token }; } } });
const headers = (i: number) => ({ authorization: `Bearer ${subjects[i]}` });
const sample = () => ({ latitude: -7.7520447, longitude: 110.3615532, accuracyMeters: 15, capturedAtMs: Date.now() });
const publish = () => app.inject({ method: 'PUT', url: '/v1/me/location', headers: headers(0), payload: sample() });
const inventory = (i: number) => app.inject({ url: '/v1/friends/locations', headers: headers(i) });
beforeAll(async () => {
  await migrate(pool);
  for (const subject of subjects) ids.push((await pool.query<{ id: string }>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id', [subject])).rows[0]!.id);
  for (const [i, status] of [[1, 'accepted'], [2, 'pending']] as const) {
    await pool.query('INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,$3)', [ids[0], ids[i], status]);
  }
});
afterAll(async () => {
  await app.close();
  await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])', [ids]);
  await pool.end();
});

it('shares only with accepted friends; coarsens, expires and replaces the position', async () => {
  expect((await app.inject({ url: '/v1/me/location-sharing', headers: headers(0) })).json()).toEqual({ enabled: true });
  expect((await publish()).statusCode).toBe(204);
  const friend = await inventory(1);
  expect(friend.statusCode).toBe(200);
  expect(friend.headers['cache-control']).toBe('no-store');
  expect(friend.json().items).toHaveLength(1);
  expect(friend.json().items[0]).toMatchObject({ accountId: ids[0], ...displayLocation(sample().latitude, sample().longitude) });
  expect((await inventory(2)).json().items).toEqual([]);
  expect((await inventory(3)).json().items).toEqual([]);
  expect((await inventory(0)).json().items).toEqual([]);
  await publish();
  expect((await pool.query('SELECT 1 FROM friend_locations WHERE account_id=$1', [ids[0]])).rowCount).toBe(1);
  await pool.query("UPDATE friend_locations SET expires_at=clock_timestamp()-interval '1 second' WHERE account_id=$1", [ids[0]]);
  expect((await inventory(1)).json().items).toEqual([]);
});
it('removing friendship revokes access even when the position has not expired', async () => {
  await publish();
  await pool.query('DELETE FROM friendships WHERE account_low=LEAST($1::uuid,$2::uuid) AND account_high=GREATEST($1::uuid,$2::uuid)', [ids[0], ids[1]]);
  expect((await inventory(1)).json().items).toEqual([]);
});
it('opt-out wins over concurrent uploads and persists across reads', async () => {
  const results = await Promise.all([
    publish(),
    app.inject({ method: 'PUT', url: '/v1/me/location-sharing', headers: headers(0), payload: { enabled: false } }),
  ]);
  expect(results[1]!.statusCode).toBe(200);
  expect([204, 409]).toContain(results[0]!.statusCode);
  expect((await pool.query('SELECT 1 FROM friend_locations WHERE account_id=$1', [ids[0]])).rowCount).toBe(0);
  expect((await publish()).statusCode).toBe(409);
  expect((await app.inject({ url: '/v1/me/location-sharing', headers: headers(0) })).json()).toEqual({ enabled: false });
});
it('removes a hidden-page position without disabling sharing and purges expired positions', async () => {
  await app.inject({ method: 'PUT', url: '/v1/me/location-sharing', headers: headers(0), payload: { enabled: true } });
  await publish();
  expect((await app.inject({ method: 'DELETE', url: '/v1/me/location', headers: headers(0) })).statusCode).toBe(204);
  expect((await pool.query('SELECT 1 FROM friend_locations WHERE account_id=$1', [ids[0]])).rowCount).toBe(0);
  expect((await app.inject({ url: '/v1/me/location-sharing', headers: headers(0) })).json()).toEqual({ enabled: true });
  await publish();
  await pool.query("UPDATE friend_locations SET expires_at=clock_timestamp()-interval '1 second' WHERE account_id=$1", [ids[0]]);
  await purgeExpiredFriendLocations(pool);
  expect((await pool.query('SELECT 1 FROM friend_locations WHERE account_id=$1', [ids[0]])).rowCount).toBe(0);
});
