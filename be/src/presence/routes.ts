import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import { displayLocation } from '../moments/routes.ts';
import type { PrivateMediaStorage } from '../media/storage.ts';

const fail = (statusCode: number): never => { throw Object.assign(new Error('Location sharing unavailable'), { statusCode }); };
export function registerPresenceRoutes(app: FastifyInstance, options: {
  pool: Pool; verifyToken: (token: string) => Promise<{ subject: string }>; avatarStorage?: Pick<PrivateMediaStorage, 'signRead'>;
}) {
  const { pool } = options;
  async function account(request: FastifyRequest): Promise<string> {
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '')?.[1];
    let subject: string;
    try { if (!token) return fail(401); subject = (await options.verifyToken(token)).subject; if (!subject) return fail(401); }
    catch { return fail(401); }
    const result = await pool.query<{ id: string }>('SELECT id FROM accounts WHERE provider_subject=$1', [subject]);
    return result.rows[0]?.id ?? fail(403);
  }
  async function locked<T>(id: string, action: (client: PoolClient, enabled: boolean) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('INSERT INTO location_preferences(account_id) VALUES($1) ON CONFLICT DO NOTHING', [id]);
      const row = await client.query<{ enabled: boolean }>('SELECT enabled FROM location_preferences WHERE account_id=$1 FOR UPDATE', [id]);
      const result = await action(client, row.rows[0]!.enabled);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  app.get('/v1/me/location-sharing', async request => {
    const id = await account(request);
    const result = await pool.query<{ enabled: boolean }>('SELECT enabled FROM location_preferences WHERE account_id=$1', [id]);
    return { enabled: result.rows[0]?.enabled ?? true };
  });
  app.put<{ Body: { enabled: boolean } }>('/v1/me/location-sharing', {
    schema: { body: { type: 'object', additionalProperties: false, required: ['enabled'], properties: { enabled: { type: 'boolean' } } } },
  }, async request => {
    const id = await account(request);
    return locked(id, async client => {
      await client.query('UPDATE location_preferences SET enabled=$2 WHERE account_id=$1', [id, request.body.enabled]);
      if (!request.body.enabled) await client.query('DELETE FROM friend_locations WHERE account_id=$1', [id]);
      return { enabled: request.body.enabled };
    });
  });
  app.put<{ Body: { latitude: number; longitude: number; accuracyMeters: number; capturedAtMs: number } }>('/v1/me/location', {
    schema: { body: { type: 'object', additionalProperties: false, required: ['latitude', 'longitude', 'accuracyMeters', 'capturedAtMs'], properties: {
      latitude: { type: 'number', minimum: -90, maximum: 90 }, longitude: { type: 'number', minimum: -180, maximum: 180 },
      accuracyMeters: { type: 'number', exclusiveMinimum: 0, maximum: 500 }, capturedAtMs: { type: 'integer', minimum: 0 },
    } } },
  }, async (request, reply) => {
    const id = await account(request);
    const { latitude, longitude, capturedAtMs } = request.body;
    const age = Date.now() - capturedAtMs;
    if (age < -5000 || age > 30000) return fail(400);
    const point = displayLocation(latitude, longitude);
    await locked(id, async (client, enabled) => {
      if (!enabled) return fail(409);
      await client.query(`INSERT INTO friend_locations(account_id,latitude,longitude,updated_at,expires_at)
        VALUES($1,$2,$3,clock_timestamp(),clock_timestamp()+interval '60 seconds')
        ON CONFLICT (account_id) DO UPDATE SET latitude=excluded.latitude,longitude=excluded.longitude,
        updated_at=excluded.updated_at,expires_at=excluded.expires_at`, [id, point.latitude, point.longitude]);
    });
    return reply.code(204).send();
  });
  app.delete('/v1/me/location', async (request, reply) => {
    const id = await account(request);
    await locked(id, async client => { await client.query('DELETE FROM friend_locations WHERE account_id=$1', [id]); });
    return reply.code(204).send();
  });
  app.get('/v1/friends/locations', async request => {
    const id = await account(request);
    const result = await pool.query<{ accountId: string; displayName: string | null; latitude: number; longitude: number; updatedAt: Date; expiresAt: Date; avatarKey: string | null }>(`
      SELECT l.account_id AS "accountId",a.display_name AS "displayName",l.latitude,l.longitude,
        l.updated_at AS "updatedAt",l.expires_at AS "expiresAt",a.avatar_key AS "avatarKey"
      FROM friend_locations l JOIN accounts a ON a.id=l.account_id
      JOIN location_preferences p ON p.account_id=l.account_id
      JOIN friendships f ON f.account_low=LEAST(l.account_id,$1::uuid) AND f.account_high=GREATEST(l.account_id,$1::uuid)
      WHERE f.status = 'accepted' AND p.enabled AND l.expires_at > clock_timestamp()
      ORDER BY l.updated_at DESC LIMIT 500`, [id]);
    return { items: await Promise.all(result.rows.map(async ({ avatarKey, ...item }) => ({
      ...item,
      avatarUrl: avatarKey && options.avatarStorage ? await options.avatarStorage.signRead(avatarKey, 60).catch(() => null) : null,
    }))) };
  });
}

export async function purgeExpiredFriendLocations(pool: Pool) {
  await pool.query('DELETE FROM friend_locations WHERE expires_at <= clock_timestamp()');
}
