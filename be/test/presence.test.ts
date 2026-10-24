import { afterEach, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { createApp } from '../src/app.ts';

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
const id = '00000000-0000-4000-8000-000000000001';
function setup(enabled = true) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('FROM accounts WHERE')) return { rows: [{ id }] };
    if (sql.includes('RETURNING enabled') || sql.includes('SELECT enabled')) return { rows: [{ enabled }] };
    return { rows: [] };
  });
  const release = vi.fn();
  const pool = { query, connect: async () => ({ query, release }) } as unknown as Pool;
  const app = createApp({ origins: [], logger: false, database: { probe: async () => {}, close: async () => {} },
    presence: { pool, verifyToken: async token => { if (token !== 'valid') throw Error('private token'); return { subject: 'test' }; } } });
  apps.push(app);
  return { app, query };
}
const headers = { authorization: 'Bearer valid' };
const position = () => ({ latitude: -7.75, longitude: 110.36, accuracyMeters: 20, capturedAtMs: Date.now() });

it('requires authentication and does not trust a submitted account ID', async () => {
  const { app, query } = setup();
  expect((await app.inject('/v1/friends/locations')).statusCode).toBe(401);
  expect(query).not.toHaveBeenCalled();
  expect((await app.inject({ method: 'PUT', url: '/v1/me/location', headers, payload: { ...position(), accountId: id } })).statusCode).toBe(400);
});
it('rejects invalid tokens and identities without an account', async () => {
  const { app, query } = setup();
  expect((await app.inject({ url: '/v1/friends/locations', headers: { authorization: 'Bearer invalid' } })).statusCode).toBe(401);
  expect(query).not.toHaveBeenCalled();
  query.mockResolvedValueOnce({ rows: [] });
  expect((await app.inject({ url: '/v1/friends/locations', headers })).statusCode).toBe(403);
});
it('rejects stale, future, inaccurate and invalid samples', async () => {
  const { app } = setup();
  for (const sample of [{ capturedAtMs: Date.now() - 60000 }, { capturedAtMs: Date.now() + 60000 }, { accuracyMeters: 600 }, { latitude: 91 }]) {
    expect((await app.inject({ method: 'PUT', url: '/v1/me/location', headers, payload: { ...position(), ...sample } })).statusCode).toBe(400);
  }
});
it('refuses position updates after account sharing has been switched off', async () => {
  const { app, query } = setup(false);
  expect((await app.inject({ method: 'PUT', url: '/v1/me/location', headers, payload: position() })).statusCode).toBe(409);
  expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO friend_locations'))).toBe(false);
});
it('coarsens the position, stores only the latest sample, and gives it a short lease', async () => {
  const { app, query } = setup();
  expect((await app.inject({ method: 'PUT', url: '/v1/me/location', headers, payload: position() })).statusCode).toBe(204);
  const call = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO friend_locations'));
  expect(call?.[0]).toContain('ON CONFLICT (account_id) DO UPDATE');
  expect(call?.[0]).toContain("interval '60 seconds'");
});
it('serializes disabling with writes and deletes the last location', async () => {
  const { app, query } = setup();
  expect((await app.inject({ method: 'PUT', url: '/v1/me/location-sharing', headers, payload: { enabled: false } })).statusCode).toBe(200);
  const sql = query.mock.calls.map(([sql]) => sql).join('\n');
  expect(sql).toContain('FOR UPDATE');
  expect(sql).toContain('DELETE FROM friend_locations');
  expect(sql).toContain('COMMIT');
});
it('reads only unexpired, enabled locations through current accepted friendships', async () => {
  const { app, query } = setup();
  expect((await app.inject({ url: '/v1/friends/locations', headers })).json()).toEqual({ items: [] });
  const sql = query.mock.calls.map(([sql]) => sql).join('\n');
  expect(sql).toContain("f.status = 'accepted'");
  expect(sql).toContain('p.enabled');
  expect(sql).toContain('l.expires_at > clock_timestamp()');
});
