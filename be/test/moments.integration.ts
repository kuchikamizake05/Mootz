import { afterAll,beforeAll,expect,it } from 'vitest';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from '../src/db/migrate.ts';
import { registerMomentRoutes } from '../src/moments/routes.ts';
const url=process.env.TEST_DATABASE_URL;if(!url)throw Error('TEST_DATABASE_URL required');
const pool=new Pool({connectionString:url});const app=Fastify({ajv:{customOptions:{coerceTypes:false}}});
const subjects=['moment-test:'+crypto.randomUUID(),'moment-test:'+crypto.randomUUID(),'moment-test:'+crypto.randomUUID()];
const ids:string[]=[];let processed=0;let fixtureEventId:string;let failPut=false;let failThumbnail=false;let failRemove=false;
// Fake private storage/image adapters deliberately exercise API orchestration, not decoder/provider behavior.
const objects=new Map<string,Buffer>();
registerMomentRoutes(app,{pool,verifyToken:async token=>{if(!subjects.includes(token))throw Error();return{subject:token};},storage:{assertPrivate:async()=>{},put:async(key,bytes)=>{if(failPut||(failThumbnail&&key.endsWith('-thumb.jpg')))throw Error('Storage failure');objects.set(key,bytes);},remove:async keys=>{if(failRemove)throw Error('Cleanup failure');keys.forEach(key=>objects.delete(key));},signRead:async key=>'https://fake.invalid/'+key},processImage:async(bytes)=>{processed++;if(bytes.toString()==='invalid')throw Error('Invalid');return{image:Buffer.from('normalized'),thumbnail:Buffer.from('thumb'),width:10,height:10,sha256:bytes.toString(),thumbnailSha256:bytes.toString()+'-thumb',contentType:'image/jpeg'};}});
const headers=(i=0)=>({authorization:'Bearer '+subjects[i]});
beforeAll(async()=>{await migrate(pool);for(const subject of subjects){ids.push((await pool.query<{id:string}>('INSERT INTO accounts(provider_subject) VALUES($1) RETURNING id',[subject])).rows[0]!.id);}fixtureEventId=(await pool.query<{id:string}>("INSERT INTO events(organizer_id,title,starts_at,ends_at) VALUES($1,'Synthetic moment test','2026-10-24T00:00:00Z','2026-10-24T01:00:00Z') RETURNING id",[ids[0]])).rows[0]!.id;});
afterAll(async()=>{await app.close();await pool.query('DELETE FROM moment_media WHERE moment_id IN (SELECT id FROM moments WHERE author_id=ANY($1::uuid[]))',[ids]);await pool.query('DELETE FROM moments WHERE author_id=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])',[ids]);await pool.query('DELETE FROM events WHERE id=$1',[fixtureEventId]);await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);await pool.end();});
it('protects drafts, publishes only complete pairs, preserves immutable retries and audience',async()=>{
 const create=await app.inject({method:'POST',url:'/v1/moments',headers:headers(),payload:{source:'capture',location:{latitude:-6.2,longitude:106.8}}});expect(create.statusCode).toBe(201);const id=create.json().id;
 expect((await app.inject({url:'/v1/moments/'+id,headers:headers(1)})).statusCode).toBe(404);
 const upload=(side:string,i=0)=>app.inject({method:'PUT',url:`/v1/moments/${id}/media/${side}`,headers:{...headers(i),'content-type':'image/jpeg'},payload:Buffer.from('fake')});
 expect((await upload('front',1)).statusCode).toBe(404);expect(processed).toBe(0);
 const publish=()=>app.inject({method:'POST',url:`/v1/moments/${id}/publish`,headers:headers(),payload:{}});
 expect((await publish()).statusCode).toBe(409);expect((await upload('front')).statusCode).toBe(200);expect((await publish()).statusCode).toBe(409);
 expect((await upload('front')).statusCode).toBe(409);expect((await upload('back')).statusCode).toBe(200);
 expect((await publish()).statusCode).toBe(200);
 const snapshot=await pool.query('SELECT pair_commitment,published_at FROM moments WHERE id=$1',[id]);
 expect((await publish()).statusCode).toBe(200);expect((await pool.query('SELECT pair_commitment,published_at FROM moments WHERE id=$1',[id])).rows).toEqual(snapshot.rows);
 expect((await upload('back')).statusCode).toBe(409);
 expect((await app.inject({url:'/v1/moments/'+id,headers:headers(1)})).statusCode).toBe(404);
 await pool.query("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'accepted')",[ids[0],ids[1]]);
 expect((await app.inject({url:'/v1/moments/'+id,headers:headers(1)})).statusCode).toBe(200);
 expect((await app.inject({url:'/v1/moments/'+id+'/media/front',headers:headers(2)})).statusCode).toBe(404);
 const feed=await app.inject({url:'/v1/feed',headers:headers(1)});expect(feed.statusCode).toBe(200);expect(feed.json().items.map((r:{id:string})=>r.id)).toContain(id);
 const map=await app.inject({url:'/v1/map',headers:headers(1)});expect(map.statusCode).toBe(200);expect(map.json().items.map((r:{id:string})=>r.id)).toContain(id);
 await pool.query("UPDATE friendships SET status='blocked' WHERE account_low=LEAST($1::uuid,$2::uuid) AND account_high=GREATEST($1::uuid,$2::uuid)",[ids[0],ids[1]]);
 expect((await app.inject({url:'/v1/moments/'+id,headers:headers(1)})).statusCode).toBe(404);
 expect((await app.inject({url:'/v1/feed?cursor=bad',headers:headers()})).statusCode).toBe(400);
 const invalidTime=Buffer.from(JSON.stringify({time:'2026-02-30T00:00:00Z',id})).toString('base64url');
 expect((await app.inject({url:'/v1/feed?cursor='+invalidTime,headers:headers()})).statusCode).toBe(400);
});
it('keeps event tags private, excludes unlocated moments from map, and paginates without duplicates',async()=>{
 const eventId=fixtureEventId;
 const created:string[]=[];
 for(let i=0;i<3;i++){
  const draft=await app.inject({method:'POST',url:'/v1/moments',headers:headers(),payload:{source:'upload',eventId,caption:'Synthetic pagination fixture'}});expect(draft.statusCode).toBe(201);const id=draft.json().id;created.push(id);
  for(const side of ['front','back'])expect((await app.inject({method:'PUT',url:`/v1/moments/${id}/media/${side}`,headers:{...headers(),'content-type':'image/png'},payload:Buffer.from('fake')})).statusCode).toBe(200);
  expect((await app.inject({method:'POST',url:`/v1/moments/${id}/publish`,headers:headers(),payload:{}})).statusCode).toBe(200);
 }
 const first=await app.inject({url:`/v1/feed?limit=2&eventId=${eventId}`,headers:headers()});expect(first.statusCode).toBe(200);expect(first.json().items).toHaveLength(2);expect(first.json().nextCursor).toBeTruthy();
 const second=await app.inject({url:`/v1/feed?limit=2&eventId=${eventId}&cursor=${first.json().nextCursor}`,headers:headers()});expect(second.statusCode).toBe(200);
 const found=[...first.json().items,...second.json().items].map((row:{id:string})=>row.id);expect(new Set(found).size).toBe(3);
 const map=await app.inject({url:`/v1/map?eventId=${eventId}`,headers:headers()});expect(map.statusCode).toBe(200);expect(map.json().items).toEqual([]);
 const outsider=await app.inject({url:`/v1/feed?filter=events&eventId=${eventId}`,headers:headers(2)});expect(outsider.statusCode).toBe(200);expect(outsider.json().items).toEqual([]);
 for(const id of created)expect((await app.inject({url:'/v1/moments/'+id,headers:headers(2)})).statusCode).toBe(404);
});

it('retakes only the owned draft side and preserves durable assets across failures',async()=>{
 const created=await app.inject({method:'POST',url:'/v1/moments',headers:headers(),payload:{source:'capture'}});const id=created.json().id;
 const send=(side:string,retake=false,i=0,bytes='original')=>app.inject({method:'PUT',url:`/v1/moments/${id}/media/${side}${retake?'/retake':''}`,headers:{...headers(i),'content-type':'image/jpeg'},payload:Buffer.from(bytes)});
 expect((await send('front',true)).statusCode).toBe(404);
 for(const side of ['front','back'])expect((await send(side)).statusCode).toBe(200);
 const snapshot=(await pool.query('SELECT * FROM moment_media WHERE moment_id=$1 ORDER BY side',[id])).rows;
 const count=processed;expect((await send('front',true,1)).statusCode).toBe(404);expect(processed).toBe(count);
 expect((await send('front',true,0,'invalid')).statusCode).toBe(400);
 failPut=true;try{expect((await send('front',true)).statusCode).toBe(500);}finally{failPut=false;}
 const objectCount=objects.size;failThumbnail=true;try{expect((await send('front',true)).statusCode).toBe(500);}finally{failThumbnail=false;}expect(objects.size).toBe(objectCount);
 expect((await pool.query('SELECT * FROM moment_media WHERE moment_id=$1 ORDER BY side',[id])).rows).toEqual(snapshot);
 const result=await send('front',true,0,'replacement');expect(result.statusCode).toBe(200);expect(result.json()).toEqual({side:'front',status:'ready'});
 const replaced=(await pool.query('SELECT * FROM moment_media WHERE moment_id=$1 ORDER BY side',[id])).rows;
 expect(replaced[0]).toEqual(snapshot[0]);expect(replaced[1].sha256).toBe('replacement');expect(replaced[1].image_key).not.toBe(snapshot[1].image_key);
 expect(objects.has(snapshot[1].image_key)).toBe(false);expect(objects.has(snapshot[1].thumbnail_key)).toBe(false);expect(objects.has(snapshot[0].image_key)).toBe(true);
 failRemove=true;try{expect((await send('front',true,0,'second')).statusCode).toBe(200);}finally{failRemove=false;}
 expect((await pool.query("SELECT sha256 FROM moment_media WHERE moment_id=$1 AND side='front'",[id])).rows[0].sha256).toBe('second');
 expect((await app.inject({method:'POST',url:`/v1/moments/${id}/publish`,headers:headers(),payload:{}})).statusCode).toBe(200);
 expect((await send('front',true)).statusCode).toBe(409);
});
it('rejects caption text PostgreSQL cannot represent before insertion',async()=>{
 for(const caption of ['bad\u0000caption','bad\ud800caption','bad\udc00caption']) {
  const response=await app.inject({method:'POST',url:'/v1/moments',headers:headers(),payload:{source:'upload',caption}});
  expect(response.statusCode).toBe(400);
 }
});
