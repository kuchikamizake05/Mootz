import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { PrivateMediaStorage } from '../media/storage.ts';
import type { processImage } from '../media/image.ts';

type Storage = Pick<PrivateMediaStorage, 'assertPrivate' | 'put' | 'remove' | 'signRead'>;
const fail = (statusCode: number): never => { throw Object.assign(new Error('Avatar unavailable'), { statusCode }); };
export async function readAvatarUrl(pool: Pool, storage: Pick<Storage, 'signRead'>, accountId: string) {
  const result = await pool.query<{ avatar_key: string | null }>('SELECT avatar_key FROM accounts WHERE id=$1', [accountId]);
  const key = result.rows[0]?.avatar_key;
  return key ? storage.signRead(key, 60).catch(() => null) : null;
}

export function registerAvatarRoutes(app: FastifyInstance, options: {
  pool: Pool; storage: Storage; processImage: typeof processImage;
  verifyToken: (token: string) => Promise<{ subject: string }>;
}) {
  const { pool, storage } = options;
  async function account(request: FastifyRequest) {
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '')?.[1];
    let subject: string;
    try { if (!token) return fail(401); subject = (await options.verifyToken(token)).subject; if (!subject) return fail(401); }
    catch { return fail(401); }
    const result = await pool.query<{ id: string }>('SELECT id FROM accounts WHERE provider_subject=$1', [subject]);
    return result.rows[0]?.id ?? fail(403);
  }
  async function replace(id: string, key: string | null) {
    const client = await pool.connect();
    let previous: string | null = null;
    try {
      await client.query('BEGIN');
      const result = await client.query<{ avatar_key: string | null }>('SELECT avatar_key FROM accounts WHERE id=$1 FOR UPDATE', [id]);
      if (!result.rows[0]) return fail(404);
      previous = result.rows[0].avatar_key;
      await client.query('UPDATE accounts SET avatar_key=$2,updated_at=now() WHERE id=$1', [id, key]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    if (previous) await storage.remove([previous]).catch(() => {});
  }
  void app.register(async scoped => {
    for (const mime of ['image/jpeg', 'image/png']) {
      if (!scoped.hasContentTypeParser(mime)) scoped.addContentTypeParser(mime, { parseAs: 'buffer', bodyLimit: 8 * 1024 * 1024 }, (_request, body, done) => done(null, body));
    }
    scoped.put('/v1/me/avatar', { bodyLimit: 8 * 1024 * 1024 }, async request => {
      const id = await account(request);
      const mime = (request.headers['content-type'] ?? '').split(';')[0]!;
      if (!['image/jpeg', 'image/png'].includes(mime) || !Buffer.isBuffer(request.body)) return fail(400);
      let image: Awaited<ReturnType<typeof processImage>>;
      try { image = await options.processImage(request.body, mime); } catch { return fail(400); }
      const key = `${id}/avatar/${randomUUID()}.jpg`;
      try {
        await storage.assertPrivate();
        await storage.put(key, image.thumbnail, 'image/jpeg');
        await replace(id, key);
      } catch (error) {
        // A lost COMMIT response must not delete the image that the account now references.
        try {
          const references = await pool.query('SELECT 1 FROM accounts WHERE avatar_key=$1', [key]);
          if (references.rowCount === 0) await storage.remove([key]);
        } catch { /* Keep uncertain uploads private for later cleanup. */ }
        throw error;
      }
      return { avatarUrl: await readAvatarUrl(pool, storage, id) };
    });
    scoped.delete('/v1/me/avatar', async (request, reply) => {
      await replace(await account(request), null);
      return reply.code(204).send();
    });
  });
}
