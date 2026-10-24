import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createApp } from '../src/app.ts';

const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
function setup(probe = vi.fn(async () => {})) {
  const close = vi.fn(async () => {});
  const app = createApp({ origins: ['https://app.test'], database: { probe, close }, logger: false });
  apps.push(app);
  return { app, close, probe };
}
describe('service foundation', () => {
  it('fails closed for frame inventory and equip without configured authentication', async () => {
    const { app } = setup();
    for (const url of ['/v1/me/frames', '/v1/me/frame']) {
      const response = await app.inject(url);
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ error: { code: 'AUTH_UNAVAILABLE' } });
    }
  });
  it('fails closed for claim submission and status without authentication configuration', async () => {
    const { app } = setup();
    const event = '00000000-0000-4000-8000-000000000000';
    for (const [method, url] of [['POST', `/v1/events/${event}/claims`], ['GET', `/v1/events/${event}/claims/${event}`]] as const) {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ error: { code: 'COLLECTION_UNAVAILABLE' } });
    }
  });
  it('preserves documented collection errors without leaking provider details', async () => {
    const { app } = setup();
    for (const [index, code, statusCode] of [[0,'CLAIM_REQUEST_CONFLICT',409],[1,'COLLECTION_MAPPING_INVALID',503],[2,'VERIFIED_WALLET_REQUIRED',403],[3,'INVALID_CLAIM',409]] as const) {
      app.get('/collection-error-'+index, () => { throw Object.assign(new Error('private provider detail'), { code, statusCode }); });
    }
    for (const [index, code, statusCode] of [[0,'CLAIM_REQUEST_CONFLICT',409],[1,'COLLECTION_MAPPING_INVALID',503],[2,'VERIFIED_WALLET_REQUIRED',403],[3,'INVALID_CLAIM',409]] as const) {
      const response = await app.inject('/collection-error-'+index);
      expect(response.statusCode).toBe(statusCode);
      expect(response.json()).toMatchObject({ error: { code } });
      expect(response.body).not.toContain('private provider');
    }
  });
  it('fails closed for unconfigured collection claims and equips', async () => {
    const { app } = setup();
    for (const [method, url] of [['GET','/v1/events/00000000-0000-4000-8000-000000000000/collection'],['POST','/v1/events/00000000-0000-4000-8000-000000000000/claim-authorizations'],['PUT','/v1/me/equipped-collection']] as const) {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ error: { code: 'COLLECTION_UNAVAILABLE' } });
    }
  });
  it('fails closed when Meet deployment configuration is unavailable',async()=>{
    const {app}=setup();
    for(const [method,url] of [['POST','/v1/meet/offers'],['GET','/v1/meets/00000000-0000-4000-8000-000000000000']] as const){
      const response=await app.inject({method,url});expect(response.statusCode).toBe(503);expect(response.json()).toMatchObject({error:{code:'MEET_UNAVAILABLE'}});
    }
    const dots=await app.inject('/v1/dots');expect(dots.statusCode).toBe(503);expect(dots.json()).toMatchObject({error:{code:'AUTH_UNAVAILABLE'}});
  });
  it('fails closed for missing media configuration and reports private bucket readiness separately', async () => {
    const { app } = setup();
    expect((await app.inject('/ready/storage')).statusCode).toBe(503);
    expect((await app.inject('/v1/feed')).json()).toMatchObject({ error: { code: 'MEDIA_UNAVAILABLE' } });
    const ready = createApp({ origins: ['https://app.test'], database: { probe: async () => {}, close: async () => {} }, logger: false, storageReadiness: async () => {} });
    apps.push(ready);
    expect((await ready.inject('/ready/storage')).json()).toEqual({ status: 'ready' });
  });
  it('reports dependency failures without exposing provider details', async () => {
    const { app } = setup();
    app.get('/test-storage-failure', () => { throw Object.assign(new Error('secret service URL'), { statusCode: 503 }); });
    const response = await app.inject('/test-storage-failure');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: { code: 'DEPENDENCY_UNAVAILABLE' } });
    expect(response.body).not.toContain('secret');
  });
  it('fails closed when Privy is not configured', async () => {
    const { app } = setup();
    for (const [method, url] of [['GET', '/v1/me'], ['PATCH', '/v1/me/preferences'], ['POST', '/v1/me/onboarding']] as const) {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ error: { code: 'AUTH_UNAVAILABLE' } });
    }
  });
  it('fails closed for friendship and streak routes without authentication configuration', async () => {
    const { app } = setup();
    for (const [method, url] of [
      ['GET', '/v1/friends'], ['POST', '/v1/friends/requests'],
      ['POST', '/v1/friends/00000000-0000-4000-8000-000000000000/accept'],
      ['DELETE', '/v1/friends/00000000-0000-4000-8000-000000000000'],
      ['GET', '/v1/me/streak'],
    ] as const) {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ error: { code: 'AUTH_UNAVAILABLE' } });
    }
  });
  it('fails closed for comments, event check-ins and private selfie routes', async () => {
    const { app } = setup();
    for (const [method, url, code] of [
      ['GET', '/v1/events', 'AUTH_UNAVAILABLE'],
      ['GET', '/v1/events/00000000-0000-4000-8000-000000000000', 'AUTH_UNAVAILABLE'],
      ['POST', '/v1/events/00000000-0000-4000-8000-000000000000/check-ins', 'AUTH_UNAVAILABLE'],
      ['POST', '/v1/events', 'AUTH_UNAVAILABLE'],
      ['GET', '/v1/me/organizer', 'AUTH_UNAVAILABLE'],
      ['GET', '/v1/me/events', 'AUTH_UNAVAILABLE'],
      ['GET', '/v1/moments/00000000-0000-4000-8000-000000000000/comments', 'AUTH_UNAVAILABLE'],
      ['GET', '/v1/me/selfies', 'MEDIA_UNAVAILABLE'],
      ['PUT', '/v1/moments/00000000-0000-4000-8000-000000000000/reaction', 'MEDIA_UNAVAILABLE'],
    ] as const) {
      const response = await app.inject({ method, url });
      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({ error: { code } });
    }
  });
  it('separates process health from database readiness', async () => {
    const { app, probe } = setup(vi.fn(async () => { throw new Error('postgresql://private:secret@db'); }));
    expect((await app.inject('/health')).json()).toEqual({ status: 'ok' });
    expect(probe).not.toHaveBeenCalled();
    const response = await app.inject('/ready');
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ error: { code: 'DEPENDENCY_UNAVAILABLE' } });
    expect(response.body).not.toContain('secret');
  });
  it('reports ready and generates a response request ID', async () => {
    const { app, probe } = setup();
    const response = await app.inject({ url: '/ready', headers: { 'x-request-id': 'untrusted' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready' });
    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-request-id']).not.toBe('untrusted');
    expect(probe).toHaveBeenCalledOnce();
  });
  it('permits allowlisted browser preflight', async () => {
    const { app } = setup();
    const response = await app.inject({ method: 'OPTIONS', url: '/health', headers: {
      origin: 'https://app.test', 'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization,content-type',
    } });
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://app.test');
  });
  it.each(['https://evil.test', 'null', 'https://app.test.evil.test'])('rejects disallowed origin %s', async origin => {
    const { app, probe } = setup();
    const response = await app.inject({ url: '/ready', headers: { origin } });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ error: { code: 'ORIGIN_NOT_ALLOWED' } });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(probe).not.toHaveBeenCalled();
  });
  it('normalizes missing routes and unexpected failures', async () => {
    const { app } = setup();
    app.get('/test-failure', () => { throw new Error('private database password'); });
    const missing = await app.inject('/not-found');
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ error: { code: 'NOT_FOUND', requestId: expect.any(String) } });
    const failed = await app.inject('/test-failure');
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toMatchObject({ error: { code: 'INTERNAL_ERROR' } });
    expect(failed.body).not.toContain('password');
  });
  it('closes the database with the application', async () => {
    const { app, close } = setup();
    await app.ready();
    await app.close();
    expect(close).toHaveBeenCalledOnce();
  });
  it('rejects malformed and oversized bodies without echoing payloads', async () => {
    const { app } = setup();
    app.post('/test-body', async () => ({ ok: true }));
    for (const payload of ['{"private":', JSON.stringify({ private: 'x'.repeat(70_000) })]) {
      const response = await app.inject({ method: 'POST', url: '/test-body', headers: { 'content-type': 'application/json' }, payload });
      expect([400, 413]).toContain(response.statusCode);
      expect(response.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
      expect(response.body).not.toContain('private');
    }
  });
});
