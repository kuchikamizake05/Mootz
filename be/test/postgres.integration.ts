import { expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createDatabase } from '../src/database.ts';

it('reports readiness against a real PostgreSQL/PostGIS database', async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is required for database integration');
  const app = createApp({ origins: ['http://localhost:3000'], database: createDatabase(url), logger: false });
  try {
    const response = await app.inject('/ready');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready' });
  } finally { await app.close(); }
});
