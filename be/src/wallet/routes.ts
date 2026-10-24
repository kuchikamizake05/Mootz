import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { createProfileRepository } from '../profile/repository.ts';
import { createPostgresChallengeRepository, createWalletChallengeService, WalletProofError } from './challenges.ts';

function failure(statusCode: number, message: string) { return Object.assign(new Error(message), { statusCode }); }

export function registerWalletRoutes(app: FastifyInstance, options: {
  verifyToken(token: string): Promise<{ subject: string }>;
  pool: Pool; domain: string; chainId: number;
}) {
  if (!Number.isSafeInteger(options.chainId) || options.chainId < 1) throw new Error('Invalid wallet chain ID');
  async function identity(request: FastifyRequest) {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
    try {
      if (!match) throw Error();
      const { subject } = await options.verifyToken(match[1]!);
      if (!subject) throw Error();
      return subject;
    } catch { throw failure(401, 'Unauthorized'); }
  }
  const walletSchema = { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$' };
  app.post<{ Body: { wallet: string } }>('/v1/me/wallet-challenges', { schema: { body: {
    type: 'object', additionalProperties: false, required: ['wallet'], properties: { wallet: walletSchema },
  } } }, async request => {
    const subject = await identity(request);
    const account = await createProfileRepository(options.pool).getOrCreate(subject);
    const client = await options.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE', [account.id]);
      const counts = await client.query<{recent:number;outstanding:number}>(`SELECT
        COUNT(*) FILTER (WHERE created_at > now()-interval '1 minute')::int AS recent,
        COUNT(*) FILTER (WHERE consumed_at IS NULL AND expires_at > now())::int AS outstanding
        FROM wallet_challenges WHERE subject=$1`, [subject]);
      if (counts.rows[0]!.recent >= 5 || counts.rows[0]!.outstanding >= 5) throw failure(429, 'Wallet challenge limit reached');
      const challenge = await createWalletChallengeService(createPostgresChallengeRepository(client), options.domain).issue(subject, request.body.wallet);
      await client.query('COMMIT');
      return { challengeId: challenge.id, wallet: challenge.wallet, message: challenge.message, expiresAt: challenge.expiresAt.toISOString() };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof WalletProofError) throw failure(400, error.message);
      throw error;
    } finally { client.release(); }
  });
  app.post<{ Body: { challengeId: string; wallet: string; signature: string } }>('/v1/me/wallet-bindings', { schema: { body: {
    type: 'object', additionalProperties: false, required: ['challengeId', 'wallet', 'signature'], properties: {
      challengeId: { type: 'string', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }, wallet: walletSchema,
      signature: { type: 'string', pattern: '^0x[0-9a-fA-F]{130}$' },
    },
  } } }, async request => {
    const subject = await identity(request);
    const account = await createProfileRepository(options.pool).getOrCreate(subject);
    const client = await options.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE', [account.id]);
      const proof = await createWalletChallengeService(createPostgresChallengeRepository(client), options.domain)
        .verify(subject, request.body.challengeId, request.body.wallet, request.body.signature);
      const existing = await client.query<{address:string}>('SELECT address FROM wallet_bindings WHERE account_id=$1 AND chain_id=$2 AND revoked_at IS NULL', [account.id, options.chainId]);
      if (existing.rows[0] && existing.rows[0].address !== proof.wallet) throw failure(409, 'Wallet binding conflict');
      if (!existing.rows[0]) await client.query('INSERT INTO wallet_bindings(account_id,chain_id,address,verified_at) VALUES($1,$2,$3,now())', [account.id, options.chainId, proof.wallet]);
      await client.query('COMMIT');
      return { wallet: proof.wallet, chainId: options.chainId };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error instanceof WalletProofError) throw failure(400, error.message);
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') throw failure(409, 'Wallet binding conflict');
      throw error;
    } finally { client.release(); }
  });
}
