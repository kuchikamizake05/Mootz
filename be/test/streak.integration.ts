import { afterAll,beforeAll,expect,it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerStreakRoutes } from '../src/streak/routes.ts';
const url=process.env.TEST_DATABASE_URL;if(!url)throw Error('TEST_DATABASE_URL required');
const pool=new Pool({connectionString:url});const app=Fastify({ajv:{customOptions:{coerceTypes:false,removeAdditional:false}}});
const subjects=['streak:'+crypto.randomUUID(),'streak:'+crypto.randomUUID()];const ids:string[]=[];
let clock=new Date('2026-10-23T16:59:59Z');
registerStreakRoutes(app,{pool,now:()=>clock,verifyToken:async token=>{if(![...subjects,'unprovisioned'].includes(token))throw Error();return{subject:token};}});
const read=(i=0,query='')=>app.inject({url:'/v1/me/streak'+query,headers:{authorization:'Bearer '+subjects[i]}});
async function post(at:string|null,source='capture',complete=true,owner=0){
 const id=(await pool.query<{id:string}>('INSERT INTO moments(author_id,source,published_at,pair_commitment) VALUES($1,$2,$3,$4) RETURNING id',[ids[owner],source,at,at?'fixture':null])).rows[0]!.id;
 for(const side of complete?['front','back']:['front'])await pool.query('INSERT INTO moment_media(moment_id,side,image_key,thumbnail_key,sha256,thumbnail_sha256,width,height) VALUES($1,$2,$3,$4,$5,$5,1,1)',[id,side,crypto.randomUUID(),crypto.randomUUID(),'fixture']);
}
beforeAll(async()=>{await migrate(pool);for(const subject of subjects)ids.push((await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id);});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM moment_media WHERE moment_id IN (SELECT id FROM moments WHERE author_id=ANY($1::uuid[]))',[ids]);await pool.query('DELETE FROM moments WHERE author_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('requires authentication and provisioned account; empty history is zero',async()=>{
 expect((await app.inject({url:'/v1/me/streak'})).statusCode).toBe(401);
 expect((await app.inject({url:'/v1/me/streak',headers:{authorization:'Bearer invalid'}})).statusCode).toBe(401);
 expect((await app.inject({url:'/v1/me/streak',headers:{authorization:'Bearer unprovisioned'}})).statusCode).toBe(403);
 expect((await read()).json()).toEqual({currentStreak:0,longestStreak:0,postedToday:false,lastPublicationDay:null,timeZone:'Asia/Jakarta'});
});
it('uses publication days in WIB, one count per day, and preserves longest history',async()=>{
 for(const day of ['17','18','19','21','22'])await post(`2026-10-${day}T03:00:00Z`);
 await post('2026-10-22T10:00:00Z');
 expect((await read()).json()).toEqual({currentStreak:2,longestStreak:3,postedToday:false,lastPublicationDay:'2026-10-22',timeZone:'Asia/Jakarta'});
 await post('2026-10-23T16:59:59Z');
 expect((await read()).json()).toMatchObject({currentStreak:3,longestStreak:3,postedToday:true,lastPublicationDay:'2026-10-23'});
 clock=new Date('2026-10-23T17:00:00Z');
 expect((await read()).json()).toMatchObject({currentStreak:3,postedToday:false});
 await post('2026-10-23T17:00:00Z');
 expect((await read()).json()).toMatchObject({currentStreak:4,longestStreak:4,postedToday:true,lastPublicationDay:'2026-10-24'});
 clock=new Date('2026-10-25T17:00:00Z');
 expect((await read()).json()).toMatchObject({currentStreak:0,longestStreak:4,postedToday:false});
 clock=new Date('2026-10-26T02:00:00Z');
 await post('2026-10-26T01:00:00Z');
 expect((await read()).json()).toMatchObject({currentStreak:1,longestStreak:4,postedToday:true});
});
it('excludes uploads, drafts, incomplete pairs, future publication and other accounts',async()=>{
 await post('2026-10-26T01:00:00Z','upload',true,1);
 await post(null,'capture',true,1);
 await post('2026-10-26T01:00:00Z','capture',false,1);
 await post('2026-10-27T01:00:00Z','capture',true,1);
 await post('2026-10-26T03:00:00Z','capture',true,1);
 expect((await read(1)).json()).toEqual({currentStreak:0,longestStreak:0,postedToday:false,lastPublicationDay:null,timeZone:'Asia/Jakarta'});
 expect((await read(1,'?accountId='+ids[0]+'&now=2030-01-01')).statusCode).toBe(400);
});
