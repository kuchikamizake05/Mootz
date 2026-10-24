import { afterAll,beforeAll,expect,it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerReactionRoutes } from '../src/reactions/routes.ts';
const url=process.env.TEST_DATABASE_URL;if(!url)throw Error('TEST_DATABASE_URL required');
const pool=new Pool({connectionString:url});const app=Fastify({ajv:{customOptions:{coerceTypes:false,removeAdditional:false}}});
const subjects:string[]=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];const ids:string[]=[];const moments:string[]=[];const objects=new Map<string,Buffer>();let processed=0;let failPut=false;
registerReactionRoutes(app,{pool,verifyToken:async token=>{if(!subjects.includes(token))throw Error();return{subject:token};},storage:{assertPrivate:async()=>{},put:async(k,b)=>{if(failPut&&k.endsWith('-thumb.jpg'))throw Error('Synthetic storage failure');objects.set(k,b);},remove:async keys=>{keys.forEach(k=>objects.delete(k));},signRead:async k=>'https://fake.invalid/'+k},processImage:async()=>{processed++;return{image:Buffer.from('image'),thumbnail:Buffer.from('thumb'),sha256:'hash',thumbnailSha256:'hash',width:1,height:1,contentType:'image/jpeg'};}});
const headers=(i=0)=>({authorization:'Bearer '+subjects[i]});
const upload=(i=0)=>app.inject({method:'POST',url:'/v1/me/selfies',headers:{...headers(i),'content-type':'image/jpeg'},payload:Buffer.from('fake')});
beforeAll(async()=>{await migrate(pool);for(const subject of subjects)ids.push((await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id);for(const published of [true,false])moments.push((await pool.query<{id:string}>("INSERT INTO moments(author_id,source,published_at,pair_commitment) VALUES($1,'capture',$2,$3) RETURNING id",[ids[0],published?new Date():null,published?'fixture':null])).rows[0]!.id);});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM moment_reactions WHERE moment_id=ANY($1::uuid[])',[moments]);await pool.query('DELETE FROM selfies WHERE account_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM moments WHERE id=ANY($1::uuid[])',[moments]);await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('protects private library, limits uploads and validates pagination',async()=>{
 expect((await app.inject({url:'/v1/me/selfies'})).statusCode).toBe(401);
 for(let n=0;n<5;n++)expect((await upload()).statusCode).toBe(201);
 expect((await upload()).statusCode).toBe(429);expect(processed).toBe(5);
 const first=await app.inject({url:'/v1/me/selfies?limit=2',headers:headers()});expect(first.statusCode).toBe(200);expect(first.json().items).toHaveLength(2);expect(first.json().nextCursor).toBeTruthy();
 const second=await app.inject({url:'/v1/me/selfies?limit=2&cursor='+first.json().nextCursor,headers:headers()});expect(second.statusCode).toBe(200);expect(new Set([...first.json().items,...second.json().items].map((r:{id:string})=>r.id)).size).toBe(4);
 expect((await app.inject({url:'/v1/me/selfies',headers:headers(1)})).json().items).toEqual([]);
 expect((await app.inject({url:'/v1/me/selfies?limit=51',headers:headers()})).statusCode).toBe(400);
 expect((await app.inject({url:'/v1/me/selfies?cursor=bad',headers:headers()})).statusCode).toBe(400);
 for(const cursor of ['null',JSON.stringify({time:'2026-10-23T00:00:00.000Z',id:'-'.repeat(36)})])expect((await app.inject({url:'/v1/me/selfies?cursor='+Buffer.from(cursor).toString('base64url'),headers:headers()})).statusCode).toBe(400);
});
it('keeps sent reactions independent of library deletion and enforces current audience',async()=>{
 const selfie=(await upload(1)).json().id;const replacement=(await upload(1)).json().id;const own=(await app.inject({url:'/v1/me/selfies',headers:headers()})).json().items[0].id;
 const put=(selfieId:string,id=moments[0]!)=>app.inject({method:'PUT',url:`/v1/moments/${id}/reaction`,headers:headers(1),payload:{selfieId}});
 expect((await put(selfie)).statusCode).toBe(404);
 await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'accepted')",[ids[0],ids[1]]);
 expect((await put(selfie,moments[1])).statusCode).toBe(404);expect((await put(own)).statusCode).toBe(404);
 expect((await put(selfie)).statusCode).toBe(200);expect((await put(replacement)).statusCode).toBe(200);
 const list=()=>app.inject({url:`/v1/moments/${moments[0]}/reactions`,headers:headers()});
 expect((await list()).json().items).toHaveLength(1);
 expect((await app.inject({method:'DELETE',url:'/v1/me/selfies/'+replacement,headers:headers()})).statusCode).toBe(404);
 expect((await app.inject({method:'DELETE',url:'/v1/me/selfies/'+replacement,headers:headers(1)})).statusCode).toBe(204);
 expect((await list()).json().items).toHaveLength(1);expect((await put(replacement)).statusCode).toBe(404);
 await pool.query("UPDATE friendships SET status='blocked' WHERE account_low=LEAST($1::uuid,$2::uuid) AND account_high=GREATEST($1::uuid,$2::uuid)",[ids[0],ids[1]]);
 expect((await app.inject({url:`/v1/moments/${moments[0]}/reactions`,headers:headers(1)})).statusCode).toBe(404);
 expect((await app.inject({url:`/v1/moments/${moments[0]}/reactions`,headers:headers(2)})).statusCode).toBe(404);
 await pool.query("UPDATE friendships SET status='accepted' WHERE account_low=LEAST($1::uuid,$2::uuid) AND account_high=GREATEST($1::uuid,$2::uuid)",[ids[0],ids[1]]);
 for(let n=0;n<2;n++)expect((await app.inject({method:'DELETE',url:`/v1/moments/${moments[0]}/reaction`,headers:headers(1)})).statusCode).toBe(204);
 expect((await list()).json().items).toEqual([]);
});

it('serializes upload quota and compensates only failed new storage objects',async()=>{
 const baseline=objects.size;failPut=true;expect((await upload(2)).statusCode).toBe(500);failPut=false;expect(objects.size).toBe(baseline);
 expect((await app.inject({url:'/v1/me/selfies',headers:headers(2)})).json().items).toEqual([]);
 const requests=await Promise.all(Array.from({length:7},()=>upload(2)));expect(requests.filter(r=>r.statusCode===201)).toHaveLength(5);expect(requests.filter(r=>r.statusCode===429)).toHaveLength(2);
});
