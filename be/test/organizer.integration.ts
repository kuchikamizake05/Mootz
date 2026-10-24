import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { setOrganizer } from '../src/events/admin.ts';
import { mapCollection } from '../src/events/map-collection.ts';
import { publicationFixture } from './support/collection-publication.ts';

const schema = 'organizer_' + crypto.randomUUID().replaceAll('-', '');
const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema},public` });
const subjects = Array.from({ length: 3 }, () => `organizer-test:${crypto.randomUUID()}`);
const ids: string[] = [];
let clock = new Date('2026-10-24T02:00:00Z');
const app = createApp({ origins: ['https://mootz.fun'], database: { probe: async () => {}, close: async () => {} }, logger: false,
  events: { pool, now: () => clock, verifyToken: async token => { if (!subjects.includes(token)) throw Error(); return { subject: token }; } } });
const headers = (i = 0) => ({ authorization: `Bearer ${subjects[i]}` });
const body = (extra = {}) => ({ clientRequestId: crypto.randomUUID(), title: ' Workshop ', description: 'Together', startsAt: '2026-10-24T08:00:00+07:00', endsAt: '2026-10-24T10:00:00+07:00', locationLabel: ' Jogja ', location: { latitude: -7.77, longitude: 110.37 }, ...extra });
const create = (payload = body(), i = 0) => app.inject({ method: 'POST', url: '/v1/events', headers: headers(i), payload });
let eventId: string;
beforeAll(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  // Event tests need real SQL/locks but no PostGIS or unrelated media fixtures.
  for (const file of ['001_identity.sql', '005_event_checkins.sql', '010_event_claims.sql', '020_event_organizers.sql', '021_event_location.sql']) {
    await pool.query(await readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const subject of subjects) ids.push((await pool.query<{ id: string }>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id', [subject])).rows[0]!.id);
});
afterAll(async () => { await app.close(); await pool.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); });

it('requires operator-granted access, rejects identity spoofing and exposes only own access', async () => {
  expect((await app.inject({ method: 'POST', url: '/v1/events', payload: body() })).statusCode).toBe(401);
  expect((await app.inject({ url: '/v1/me/organizer', headers: headers() })).json()).toEqual({ enabled: false });
  expect((await create()).statusCode).toBe(403);
  expect((await app.inject({ url: '/v1/me/events', headers: headers() })).statusCode).toBe(403);
  await expect(setOrganizer(pool, 'not-a-uuid', true)).rejects.toThrow();
  await expect(setOrganizer(pool, crypto.randomUUID(), true)).rejects.toThrow();
  await setOrganizer(pool, ids[0]!, true); await setOrganizer(pool, ids[0]!, true);
  expect((await create(body({ organizerId: ids[1] }))).statusCode).toBe(400);
  expect((await app.inject({ url: '/v1/me/organizer', headers: headers() })).json()).toEqual({ enabled: true });
  expect((await app.inject({ url: '/v1/me/organizer', headers: headers(1) })).json()).toEqual({ enabled: false });
});
it('creates once under concurrent retries, normalizes time, and rejects conflicting reuse', async () => {
  const input = body(); const responses = await Promise.all(Array.from({ length: 5 }, () => create(input)));
  expect(responses.filter(r => r.statusCode === 201)).toHaveLength(1);
  expect(responses.every(r => [200, 201].includes(r.statusCode))).toBe(true);
  expect(new Set(responses.map(r => r.json().id)).size).toBe(1); eventId = responses[0]!.json().id;
  expect(responses[0]!.json()).toMatchObject({ title: 'Workshop', startsAt: '2026-10-24T01:00:00.000Z', endsAt: '2026-10-24T03:00:00.000Z', locationLabel: 'Jogja', location: input.location });
  for (const url of ['/v1/events/' + eventId, '/v1/events', '/v1/me/events']) {
    const result = (await app.inject({ url, headers: headers() })).json();
    expect((result.items ? result.items.find((e: { id: string }) => e.id === eventId) : result).location).toEqual(input.location);
  }
  expect((await create({ ...input, location: { latitude: -7.78, longitude: 110.37 } })).statusCode).toBe(409);
  expect(responses[0]!.body).not.toMatch(/organizer|provider|clientRequestId/);
  expect((await create({ ...input, title: 'Changed' })).statusCode).toBe(409);
  clock = new Date('2026-10-25T02:00:00Z'); expect((await create(input)).statusCode).toBe(200);
  clock = new Date('2026-10-24T02:00:00Z');
});
it.each([{ location: { latitude: 91, longitude: 0 } }, { location: { latitude: 0, longitude: -181 } }, { location: { latitude: 0 } }, { location: { latitude: 0, longitude: 0, secret: true } }, { title: ' ' }, { endsAt: '2026-10-23T00:00:00Z' }, { endsAt: '2026-10-24T01:00:00Z' }, { startsAt: '2026-02-30T01:00:00Z' }, { startsAt: '2026-10-24T01:00:00' }, { title: 'x'.repeat(201) }, { locationLabel: 'x'.repeat(201) }, { clientRequestId: 'invalid' }])('rejects invalid event input %j', async extra => {
  expect((await create(body(extra))).statusCode).toBe(400);
});
it('retains legacy events without a map pin', async () => {
  const response = await create(body({ location: null }));
  expect(response.statusCode).toBe(201); expect(response.json().location).toBeNull();
  await pool.query('DELETE FROM events WHERE id=$1', [response.json().id]);
});
it('isolates organizer event lists, check-ins and pagination', async () => {
  await setOrganizer(pool, ids[1]!, true);
  const other = await create(body({ title: 'Other organizer' }), 1); expect(other.statusCode).toBe(201);
  await create(body({ title: 'Second event', startsAt: '2026-10-25T01:00:00Z', endsAt: '2026-10-25T03:00:00Z' }));
  const check = (i: number) => app.inject({ method: 'POST', url: `/v1/events/${eventId}/check-ins`, headers: headers(i), payload: { accountId: ids[2] } });
  expect((await check(1)).statusCode).toBe(403);
  expect((await check(0)).statusCode).toBe(200); expect((await check(0)).statusCode).toBe(200);
  const first = (await app.inject({ url: '/v1/me/events?limit=1', headers: headers() })).json();
  expect(first.items).toHaveLength(1); expect(first.items[0]).toMatchObject({ id: eventId, checkInCount: 1, collectionStatus: 'not_configured' });
  const next = (await app.inject({ url: `/v1/me/events?limit=1&cursor=${first.nextCursor}`, headers: headers() })).json();
  expect(next.items[0].title).toBe('Second event'); expect(next.nextCursor).toBeNull();
  expect((await app.inject({ url: '/v1/me/events', headers: headers(1) })).json().items.map((e: { id: string }) => e.id)).toEqual([other.json().id]);
  for (const query of ['limit=0', 'cursor=bad', 'organizerId=' + ids[1]]) expect((await app.inject({ url: '/v1/me/events?' + query, headers: headers() })).statusCode).toBe(400);
  clock = new Date('2026-10-24T03:00:00Z');
  expect((await app.inject({ method: 'POST', url: `/v1/events/${eventId}/check-ins`, headers: headers(), payload: { accountId: ids[1] } })).statusCode).toBe(409);
  expect((await check(0)).statusCode).toBe(200); clock = new Date('2026-10-24T02:00:00Z');
});
it('only maps a finalized matching collection and persists its evidence without overwriting', async () => {
  const f = publicationFixture(eventId);
  await mapCollection(pool, f.input, f.config, f.client); await mapCollection(pool, f.input, f.config, f.client);
  const mapping = (await pool.query('SELECT * FROM event_collections WHERE event_id=$1', [eventId])).rows[0];
  expect(mapping.creation_transaction_hash).toBe(f.input.transactionHash); expect(mapping.creation_block_number).toBe('10');
  await expect(mapCollection(pool, { ...f.input, displayName: 'Overwrite' }, f.config, f.client)).rejects.toThrow('Existing collection mapping differs');
  expect((await pool.query('SELECT display_name FROM event_collections WHERE event_id=$1', [eventId])).rows[0].display_name).toBe(f.input.displayName);
  const mine = (await app.inject({ url: '/v1/me/events', headers: headers() })).json(); expect(mine.items[0].collectionStatus).toBe('configured');
});
it('revocation blocks creation, listing and even check-in retries without deleting events', async () => {
  await setOrganizer(pool, ids[0]!, false);
  expect((await create()).statusCode).toBe(403);
  expect((await app.inject({ url: '/v1/me/events', headers: headers() })).statusCode).toBe(403);
  expect((await app.inject({ method: 'POST', url: `/v1/events/${eventId}/check-ins`, headers: headers(), payload: { accountId: ids[2] } })).statusCode).toBe(403);
  expect((await app.inject({ url: `/v1/events/${eventId}`, headers: headers(2) })).statusCode).toBe(200);
});
