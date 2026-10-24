import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { expect, it } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { migrate } from '../src/db/migrate.ts';
import { registerWalletRoutes } from '../src/wallet/routes.ts';

it('atomically binds signed wallets, prevents cross-account reuse, rolls back proofs, and limits concurrent issuance', async () => {
  if (!process.env.TEST_DATABASE_URL) throw Error('TEST_DATABASE_URL required');
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  await migrate(pool);
  const subjects = ['a','b','c'].map(x => `wallet:${randomUUID()}:${x}`);
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false, coerceTypes: false } } });
  registerWalletRoutes(app, { pool, domain:'demo.mootz.test', chainId:10143, verifyToken:async token=>({subject:token}) });
  const account = privateKeyToAccount(generatePrivateKey());
  const headers = (i:number) => ({authorization:`Bearer ${subjects[i]}`});
  async function challenge(i:number, wallet = account.address) {
    const response = await app.inject({method:'POST',url:'/v1/me/wallet-challenges',headers:headers(i),payload:{wallet}});
    expect(response.statusCode).toBe(200);
    return response.json() as {challengeId:string;message:string};
  }
  try {
    expect((await app.inject({method:'POST',url:'/v1/me/wallet-bindings',headers:headers(0),payload:{challengeId:'-'.repeat(36),wallet:account.address,signature:`0x${'0'.repeat(130)}`}})).statusCode).toBe(400);
    const c = await challenge(0);
    const payload = {challengeId:c.challengeId,wallet:account.address,signature:await account.signMessage({message:c.message})};
    expect((await app.inject({method:'POST',url:'/v1/me/wallet-bindings',headers:headers(1),payload})).statusCode).toBe(400);
    const replay = await Promise.all(Array.from({length:2},()=>app.inject({method:'POST',url:'/v1/me/wallet-bindings',headers:headers(0),payload})));
    expect(replay.map(r=>r.statusCode).sort()).toEqual([200,400]);
    const b = await challenge(1);
    const conflicting = {challengeId:b.challengeId,wallet:account.address,signature:await account.signMessage({message:b.message})};
    expect((await app.inject({method:'POST',url:'/v1/me/wallet-bindings',headers:headers(1),payload:conflicting})).statusCode).toBe(409);
    expect((await pool.query('SELECT consumed_at FROM wallet_challenges WHERE id=$1',[b.challengeId])).rows[0].consumed_at).toBeNull();
    const second = privateKeyToAccount(generatePrivateKey());
    const rotation = await challenge(0,second.address);
    expect((await app.inject({method:'POST',url:'/v1/me/wallet-bindings',headers:headers(0),payload:{challengeId:rotation.challengeId,wallet:second.address,signature:await second.signMessage({message:rotation.message})}})).statusCode).toBe(409);
    const limited = await Promise.all(Array.from({length:8},()=>app.inject({method:'POST',url:'/v1/me/wallet-challenges',headers:headers(2),payload:{wallet:account.address}})));
    expect(limited.filter(r=>r.statusCode===200)).toHaveLength(5);
    expect(limited.filter(r=>r.statusCode===429)).toHaveLength(3);
    expect((await app.inject({method:'POST',url:'/v1/me/wallet-challenges',payload:{wallet:account.address}})).statusCode).toBe(401);
  } finally {
    await app.close();
    await pool.query('DELETE FROM wallet_challenges WHERE subject=ANY($1::text[])',[subjects]);
    await pool.query('DELETE FROM wallet_bindings WHERE account_id IN(SELECT id FROM accounts WHERE provider_subject=ANY($1::text[]))',[subjects]);
    await pool.query('DELETE FROM onchain_preferences WHERE account_id IN(SELECT id FROM accounts WHERE provider_subject=ANY($1::text[]))',[subjects]);
    await pool.query('DELETE FROM accounts WHERE provider_subject=ANY($1::text[])',[subjects]);
    await pool.end();
  }
});
