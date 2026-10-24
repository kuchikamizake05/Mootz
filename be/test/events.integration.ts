import { afterAll,beforeAll,expect,it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerEventRoutes } from '../src/events/routes.ts';
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const app=Fastify({ajv:{customOptions:{coerceTypes:false,removeAdditional:false}}});
const subjects=Array.from({length:3},()=>`event-test:${crypto.randomUUID()}`);const ids:string[]=[];const events:string[]=[];
let clock=new Date('2026-10-23T05:00:00.000Z');
registerEventRoutes(app,{pool,now:()=>clock,verifyToken:async token=>{if(!subjects.includes(token))throw Error();return{subject:token};}});
const headers=(i=0)=>({authorization:'Bearer '+subjects[i]});
const check=(i:number,target=ids[1],event=events[0])=>app.inject({method:'POST',url:`/v1/events/${event}/check-ins`,headers:headers(i),payload:{accountId:target}});
beforeAll(async()=>{if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required');await migrate(pool);for(const subject of subjects)ids.push((await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id);for(let n=0;n<3;n++)events.push((await pool.query<{id:string}>("INSERT INTO events(organizer_id,title,description,starts_at,ends_at,location_label) VALUES($1,$2,'Details',$3,$4,'Demo venue') RETURNING id",[ids[0],`Event ${n}`,new Date(`2026-10-${23+n}T04:00:00Z`),new Date(`2026-10-${23+n}T06:00:00Z`)])).rows[0]!.id);});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM event_checkins WHERE event_id=ANY($1::uuid[])',[events]);await pool.query('DELETE FROM events WHERE id=ANY($1::uuid[])',[events]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('requires auth and returns event metadata without organizer identity',async()=>{
 expect((await app.inject({url:'/v1/events'})).statusCode).toBe(401);
 expect((await app.inject({url:'/v1/events',headers:{authorization:'Bearer invalid'}})).statusCode).toBe(401);
 const detail=await app.inject({url:`/v1/events/${events[0]}`,headers:headers(1)});expect(detail.statusCode).toBe(200);expect(detail.json()).toEqual({id:events[0],title:'Event 0',description:'Details',startsAt:'2026-10-23T04:00:00.000Z',endsAt:'2026-10-23T06:00:00.000Z',locationLabel:'Demo venue'});expect(detail.body).not.toMatch(/organizer|provider|event-test/);
 expect((await app.inject({url:`/v1/events/${crypto.randomUUID()}`,headers:headers()})).statusCode).toBe(404);
});
it('lists chronologically with bounded stable keyset pagination',async()=>{
 let cursor:string|null=null;const seen:string[]=[];do{const result:Awaited<ReturnType<typeof app.inject>>=await app.inject({url:'/v1/events?limit=2'+(cursor?'&cursor='+cursor:''),headers:headers()});expect(result.statusCode).toBe(200);seen.push(...result.json().items.map((e:{id:string})=>e.id));cursor=result.json().nextCursor;}while(cursor);expect(seen.filter(id=>events.includes(id))).toEqual(events);expect(new Set(seen).size).toBe(seen.length);
 for(const query of ['limit=0','limit=51','cursor=bad','unexpected=true',...['null','{}',JSON.stringify({time:'2026-02-30T00:00:00.000Z',id:events[0]})].map(value=>'cursor='+Buffer.from(value).toString('base64url'))])expect((await app.inject({url:'/v1/events?'+query,headers:headers()})).statusCode).toBe(400);
});
it('only organizer checks in existing accounts, idempotently and concurrently',async()=>{
 expect((await app.inject({method:'POST',url:'/v1/events/'+events[0]+'/check-ins',payload:{accountId:ids[1]}})).statusCode).toBe(401);expect((await check(1)).statusCode).toBe(403);expect((await check(2)).statusCode).toBe(403);
 expect((await check(0,crypto.randomUUID())).statusCode).toBe(404);
 expect((await app.inject({method:'POST',url:`/v1/events/${events[0]}/check-ins`,headers:headers(1),payload:{accountId:ids[1],organizerId:ids[0]}})).statusCode).toBe(400);
 const before=await app.inject({url:`/v1/events/${events[0]}/check-in`,headers:headers(1)});expect(before.json()).toEqual({checkedIn:false,checkedInAt:null});
 const results=await Promise.all(Array.from({length:6},()=>check(0)));expect(results.every(r=>r.statusCode===200)).toBe(true);expect(new Set(results.map(r=>r.json().checkedInAt)).size).toBe(1);
 const own=await app.inject({url:`/v1/events/${events[0]}/check-in`,headers:headers(1)});expect(own.json()).toEqual({checkedIn:true,checkedInAt:clock.toISOString()});
 const unrelated=await app.inject({url:`/v1/events/${events[0]}/check-in`,headers:headers(2)});expect(unrelated.json()).toEqual({checkedIn:false,checkedInAt:null});
});
it('uses server event window but preserves successful retries afterward',async()=>{
 clock=new Date('2026-10-23T03:59:59Z');expect((await check(0,ids[2])).statusCode).toBe(409);
 clock=new Date('2026-10-23T06:00:00Z');expect((await check(0,ids[2])).statusCode).toBe(409);expect((await check(0)).statusCode).toBe(200);
 clock=new Date('2026-10-23T04:00:00Z');expect((await check(0,ids[2])).statusCode).toBe(200);
});
