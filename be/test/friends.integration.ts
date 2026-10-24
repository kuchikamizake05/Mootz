import { afterAll,beforeAll,expect,it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerMomentRoutes } from '../src/moments/routes.ts';
import { registerFriendRoutes } from '../src/friends/routes.ts';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const app=Fastify({ajv:{customOptions:{coerceTypes:false,removeAdditional:false}}});
const subjects=Array.from({length:5},()=>`friend-test:${crypto.randomUUID()}`);const ids:string[]=[];
registerFriendRoutes(app,{pool,verifyToken:async token=>{if(!subjects.includes(token))throw Error();return{subject:token};}});
registerMomentRoutes(app,{pool,verifyToken:async token=>{if(!subjects.includes(token))throw Error();return{subject:token};},storage:{assertPrivate:async()=>{},put:async()=>{},remove:async()=>{},signRead:async()=> 'https://fake.invalid/media'},processImage:async()=>{throw Error('unused');}});
const headers=(i=0)=>({authorization:'Bearer '+subjects[i]});
const request=(i:number,j:number)=>app.inject({method:'POST',url:'/v1/friends/requests',headers:headers(i),payload:{accountId:ids[j]}});
const accept=(i:number,j:number)=>app.inject({method:'POST',url:`/v1/friends/${ids[j]}/accept`,headers:headers(i),payload:{}});
const remove=(i:number,j:number)=>app.inject({method:'DELETE',url:`/v1/friends/${ids[j]}`,headers:headers(i)});
beforeAll(async()=>{if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required');await migrate(pool);for(const subject of subjects)ids.push((await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id);});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM moments WHERE author_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('authenticates actor, validates targets and rejects forged identity',async()=>{
 expect((await app.inject({url:'/v1/friends'})).statusCode).toBe(401);
 expect((await app.inject({url:'/v1/friends',headers:{authorization:'Bearer invalid'}})).statusCode).toBe(401);
 expect((await request(0,0)).statusCode).toBe(400);
 expect((await app.inject({method:'POST',url:'/v1/friends/requests',headers:headers(),payload:{accountId:crypto.randomUUID()}})).statusCode).toBe(404);
 expect((await app.inject({method:'POST',url:'/v1/friends/requests',headers:headers(),payload:{accountId:ids[1],requestedBy:ids[2]}})).statusCode).toBe(400);
});
it('requires recipient acceptance, handles retries, declines and removes',async()=>{
 expect((await request(0,1)).statusCode).toBe(201);expect((await request(0,1)).statusCode).toBe(200);
 expect((await request(1,0)).statusCode).toBe(409);expect((await accept(0,1)).statusCode).toBe(409);
 expect((await accept(2,0)).statusCode).toBe(404);
 expect((await accept(1,0)).statusCode).toBe(200);expect((await accept(1,0)).statusCode).toBe(200);
 const listed=await app.inject({url:'/v1/friends',headers:headers()});expect(listed.json().items).toEqual([expect.objectContaining({accountId:ids[1],status:'accepted',direction:'outgoing'})]);
 expect(listed.body).not.toMatch(/provider_subject|friend-test:|wallet|email/);
 expect((await remove(1,0)).statusCode).toBe(204);expect((await remove(1,0)).statusCode).toBe(204);
 expect((await request(0,1)).statusCode).toBe(201);expect((await remove(1,0)).statusCode).toBe(204);
});
it('serializes duplicate and crossing requests without auto-acceptance',async()=>{
 const duplicates=await Promise.all(Array.from({length:8},()=>request(0,2)));expect(duplicates.map(r=>r.statusCode).sort()).toEqual([200,200,200,200,200,200,200,201]);
 await remove(0,2);const crossed=await Promise.all([request(0,2),request(2,0)]);expect(crossed.map(r=>r.statusCode).sort()).toEqual([201,409]);
 const rows=await pool.query("SELECT status FROM friendships WHERE account_low=LEAST($1::uuid,$2::uuid) AND account_high=GREATEST($1::uuid,$2::uuid)",[ids[0],ids[2]]);expect(rows.rows).toEqual([{status:'pending'}]);
});
it('never bypasses blocked records and hides them from lists',async()=>{
 await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'blocked')",[ids[0],ids[3]]);
 for(const response of [await request(0,3),await request(3,0),await accept(0,3),await remove(0,3)])expect(response.statusCode).toBe(404);
 const result=await app.inject({url:'/v1/friends',headers:headers()});expect(result.json().items.map((r:{accountId:string})=>r.accountId)).not.toContain(ids[3]);
});
it('bounds lists and validates scoped keyset cursors',async()=>{
 await request(0,4);const first=await app.inject({url:'/v1/friends?limit=1&status=pending',headers:headers()});expect(first.statusCode).toBe(200);expect(first.json().items).toHaveLength(1);expect(first.json().nextCursor).toBeTruthy();
 const next=await app.inject({url:'/v1/friends?limit=1&status=pending&cursor='+first.json().nextCursor,headers:headers()});expect(next.statusCode).toBe(200);expect(next.json().items[0].accountId).not.toBe(first.json().items[0].accountId);
 for(const query of ['limit=0','limit=51','cursor=bad','direction=bad'])expect((await app.inject({url:'/v1/friends?'+query,headers:headers()})).statusCode).toBe(400);
 expect((await app.inject({url:'/v1/friends?status=accepted&cursor='+first.json().nextCursor,headers:headers()})).statusCode).toBe(400);
});

it('revokes newly checked moment, Feed and Map access after friend removal',async()=>{
 await remove(0,1);await request(0,1);await accept(1,0);
 const row=await pool.query<{id:string}>("INSERT INTO moments(author_id,source,published_at,pair_commitment,display_lat,display_lng) VALUES($1,'upload',now(),'synthetic-fixture',0,0) RETURNING id",[ids[0]]);const id=row.rows[0]!.id;
 expect((await app.inject({url:'/v1/moments/'+id,headers:headers(1)})).statusCode).toBe(200);
 expect((await remove(1,0)).statusCode).toBe(204);
 expect((await app.inject({url:'/v1/moments/'+id,headers:headers(1)})).statusCode).toBe(404);
 for(const route of ['feed','map'])expect((await app.inject({url:'/v1/'+route,headers:headers(1)})).json().items.map((item:{id:string})=>item.id)).not.toContain(id);
});
