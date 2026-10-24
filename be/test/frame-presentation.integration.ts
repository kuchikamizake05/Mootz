import { afterAll, beforeAll, expect, it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerMomentRoutes } from '../src/moments/routes.ts';
import type { FrameState } from '../src/frames/service.ts';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const app = Fastify();
const subjects = ['frame-author:', 'frame-viewer:'].map(prefix => prefix + crypto.randomUUID());
const ids: string[] = [];
let moment = '', reads = 0;
let active: FrameState = { status: 'none', frame: null };
registerMomentRoutes(app, {
  pool, verifyToken: async token => ({ subject: token }),
  storage: { assertPrivate: async () => {}, put: async () => {}, remove: async () => {}, signRead: async () => 'https://synthetic.invalid/unused' },
  processImage: async () => { throw Error('Unused synthetic fixture'); },
  readFrame: async account => { expect(account).toBe(ids[0]); reads++; return active; },
});
const headers = { authorization: 'Bearer ' + subjects[1] };
beforeAll(async () => {
  await migrate(pool);
  for (const subject of subjects) ids.push((await pool.query<{ id: string }>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id', [subject])).rows[0]!.id);
  moment = (await pool.query<{ id: string }>("INSERT INTO moments(author_id,source,published_at,pair_commitment,display_lat,display_lng) VALUES($1,'upload',clock_timestamp(),'synthetic',0,0) RETURNING id", [ids[0]])).rows[0]!.id;
});
afterAll(async () => {
  await app.close();
  if (moment) await pool.query('DELETE FROM moments WHERE id=$1', [moment]);
  await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])', [ids]);
  await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])', [ids]);
  await pool.end();
});
it('does not resolve author frames before the existing moment audience check', async () => {
  expect((await app.inject({ url: '/v1/moments/' + moment, headers })).statusCode).toBe(404);
  expect(reads).toBe(0);
  await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'accepted')", ids);
});
it('uses current frame state consistently for moment detail, Map and Feed', async () => {
  for (const path of ['/v1/moments/' + moment, '/v1/feed', '/v1/map']) {
    const response = await app.inject({ url: path, headers });
    expect(response.statusCode).toBe(200);
    const item = response.json().items?.find((row: { id: string }) => row.id === moment) ?? response.json();
    expect(item.activeFrame).toEqual(active);
  }
  active = { status: 'unavailable', frame: null };
  const response = await app.inject({ url: '/v1/feed', headers });
  expect(response.statusCode).toBe(200);
  expect(response.json().items.find((row: { id: string }) => row.id === moment).activeFrame).toEqual(active);
  expect(reads).toBe(4);
});
