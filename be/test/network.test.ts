import { expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createDatabase } from '../src/database.ts';

it('serves real HTTP and returns 503 when PostgreSQL cannot connect', async () => {
  const app = createApp({ origins: ['http://localhost:3000'], database: createDatabase('postgresql://test:test@127.0.0.1:1/unavailable'), logger: false });
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const live = await fetch(`${address}/health`);
    expect(live.status).toBe(200);
    expect(await live.json()).toEqual({ status: 'ok' });
    const ready = await fetch(`${address}/ready`);
    expect(ready.status).toBe(503);
    expect(await ready.json()).toMatchObject({ error: { code: 'DEPENDENCY_UNAVAILABLE' } });
  } finally { await app.close(); }
});
