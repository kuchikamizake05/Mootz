import { afterAll, beforeAll, expect, it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerFriendRoutes } from '../src/friends/routes.ts';

const url = process.env.TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== '/mootz_frames_tests') throw Error('Dedicated mootz_frames_tests database required');
const pool = new Pool({ connectionString: url });
const app = Fastify();
const subjects = Array.from({ length: 6 }, () => `frame-friend:${crypto.randomUUID()}`);
const ids: string[] = [];
let moment: string;
registerFriendRoutes(app, { pool, verifyToken: async token => {
 if (!subjects.includes(token)) throw Error('Invalid fixture token');
 return { subject: token };
} });
const headers = (index: number) => ({ authorization: `Bearer ${subjects[index]}` });
const unlock = () => pool.query<{unlocked_at: Date}>("SELECT unlocked_at FROM achievement_unlocks WHERE account_id=$1 AND frame_id='social_butterfly'", [ids[0]]);

beforeAll(async () => {
 await migrate(pool);
 for (const subject of subjects) ids.push((await pool.query<{id: string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id', [subject])).rows[0]!.id);
 moment = (await pool.query<{id: string}>("INSERT INTO moments(author_id,source) VALUES($1,'capture') RETURNING id", [ids[0]])).rows[0]!.id;
 // Sanitized database fixtures represent completed offchain Meets, not signed protocol vectors.
 for (let index = 1; index <= 5; index++) {
  const id = crypto.randomUUID();
  await pool.query("INSERT INTO meet_offers(id,moment_id,poster_id,poster_wallet,chain_id,verifying_contract,offer,expires_at) VALUES($1,$2,$3,$4,10143,$5,'{}',now())", [id, moment, ids[0], '0x' + '11'.repeat(20), '0x' + '33'.repeat(20)]);
  await pool.query("INSERT INTO meets(id,moment_id,poster_id,scanner_id,poster_wallet,scanner_wallet,accepted_at,area_key,server_day,offer,acceptance,poster_signature,scanner_signature,chain_id,verifying_contract,chain_status) VALUES($1,$2,$3,$4,$5,$6,now(),$1::uuid::text,current_date,'{}','{}','fixture','fixture',10143,$7,'not_saved')", [id, moment, ids[0], ids[index], '0x' + '11'.repeat(20), '0x' + '22'.repeat(20), '0x' + '33'.repeat(20)]);
  await pool.query('INSERT INTO dots(meet_id) VALUES($1)', [id]);
  await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$2,$3)", [ids[0], ids[index], index === 5 ? 'pending' : 'accepted']);
 }
});

afterAll(async () => {
 await app.close();
 await pool.query('DELETE FROM achievement_unlocks WHERE account_id=ANY($1::uuid[])', [ids]);
 await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])', [ids]);
 await pool.query('DELETE FROM dots WHERE meet_id IN(SELECT id FROM meets WHERE moment_id=$1)', [moment]);
 await pool.query('DELETE FROM meets WHERE moment_id=$1', [moment]);
 await pool.query('DELETE FROM meet_offers WHERE moment_id=$1', [moment]);
 await pool.query('DELETE FROM moments WHERE id=$1', [moment]);
 await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])', [ids]);
 await pool.end();
});

it('rejects accepting your own request without unlocking an achievement', async () => {
 const response = await app.inject({ method: 'POST', url: `/v1/friends/${ids[0]}/accept`, headers: headers(5), payload: {} });
 expect(response.statusCode).toBe(409);
 expect((await unlock()).rowCount).toBe(0);
});

it('persists the fifth previously-met friend unlock immediately and retains it after unfriend', async () => {
 const response = await app.inject({ method: 'POST', url: `/v1/friends/${ids[5]}/accept`, headers: headers(0), payload: {} });
 expect(response.statusCode).toBe(200);
 const earned = (await unlock()).rows[0];
 expect(earned).toBeDefined();
 // Model an accepted friendship predating achievement reconciliation.
 await pool.query("DELETE FROM achievement_unlocks WHERE account_id=$1 AND frame_id='social_butterfly'", [ids[0]]);
 const retry = await app.inject({ method: 'POST', url: `/v1/friends/${ids[5]}/accept`, headers: headers(0), payload: {} });
 expect(retry.statusCode).toBe(200);
 const reconciled = (await unlock()).rows[0];
 expect(reconciled).toBeDefined();
 expect((await app.inject({ method: 'POST', url: `/v1/friends/${ids[5]}/accept`, headers: headers(0), payload: {} })).statusCode).toBe(200);
 expect((await unlock()).rows[0]).toEqual(reconciled);
 expect((await app.inject({ method: 'DELETE', url: `/v1/friends/${ids[5]}`, headers: headers(0) })).statusCode).toBe(204);
 expect((await unlock()).rows[0]).toEqual(reconciled);
});
