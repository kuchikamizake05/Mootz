import { expect,it } from 'vitest';
import { exportSPKI,generateKeyPair,SignJWT } from 'jose';
import sharp from 'sharp';
import { createApp } from '../src/app.ts';
import { createDatabase } from '../src/database.ts';
import { migrate } from '../src/db/migrate.ts';
import { createTokenVerifier } from '../src/auth/token.ts';
import { createProfileRepository } from '../src/profile/repository.ts';
import { processImage } from '../src/media/image.ts';
it('composes authenticated social modules and revokes media, comments and reactions when friendship ends',async()=>{
 const url=process.env.TEST_DATABASE_URL;if(!url)throw Error('TEST_DATABASE_URL required');
 const database=createDatabase(url);const {pool}=database;const ids:string[]=[];let eventId:string|undefined;
 const pair=await generateKeyPair('ES256');const verifier=await createTokenVerifier({appId:'social-flow-test',verificationKey:await exportSPKI(pair.publicKey)});
 const verifyToken=(token:string)=>verifier.verify(token);const shared={pool,verifyToken};const objects=new Map<string,Buffer>();
 const storage={assertPrivate:async()=>{},put:async(key:string,bytes:Buffer)=>{expect(objects.has(key)).toBe(false);objects.set(key,bytes);},remove:async(keys:string[])=>{keys.forEach(key=>objects.delete(key));},signRead:async(key:string)=>{expect(objects.has(key)).toBe(true);return 'https://synthetic.invalid/'+encodeURIComponent(key);}};
 const app=createApp({origins:[],database,logger:false,profile:{verifyToken,repository:createProfileRepository(pool)},wallet:{...shared,domain:'localhost:3000',chainId:10143},moments:{...shared,storage,processImage},friends:shared,streak:shared,comments:shared,events:shared,reactions:{...shared,storage,processImage},storageReadiness:storage.assertPrivate});
 try {
  await migrate(pool);await app.ready();
  const tokens=await Promise.all(Array.from({length:2},()=>new SignJWT({}).setProtectedHeader({alg:'ES256'}).setIssuer('privy.io').setAudience('social-flow-test').setSubject('did:privy:social-flow-'+crypto.randomUUID()).setIssuedAt().setExpirationTime('5m').sign(pair.privateKey)));
  const headers=(i=0)=>({authorization:'Bearer '+tokens[i]});
  for(let i=0;i<2;i++){const result=await app.inject({url:'/v1/me',headers:headers(i)});expect(result.statusCode).toBe(200);ids.push(result.json().id);}
  expect(ids[0]).not.toBe(ids[1]);
  const names=[0,1].map(()=>'sf_'+crypto.randomUUID().replaceAll('-','').slice(0,12));
  for(let i=0;i<2;i++)expect((await app.inject({method:'PUT',url:'/v1/me/username',headers:headers(i),payload:{username:names[i]}})).json().username).toBe(names[i]);
  const image=await sharp({create:{width:2,height:2,channels:3,background:'#a020f0'}}).png().toBuffer();
  const draft=await app.inject({method:'POST',url:'/v1/moments',headers:headers(),payload:{source:'capture'}});expect(draft.statusCode).toBe(201);const momentId=draft.json().id;expect(draft.json().authorUsername).toBe(names[0]);
  for(const suffix of ['front','back','front/retake'])expect((await app.inject({method:'PUT',url:`/v1/moments/${momentId}/media/${suffix}`,headers:{...headers(),'content-type':'image/png'},payload:image})).statusCode).toBe(200);
  expect(objects.size).toBe(4);
  expect((await app.inject({method:'POST',url:`/v1/moments/${momentId}/publish`,headers:headers(),payload:{}})).statusCode).toBe(200);
  const detail=()=>app.inject({url:`/v1/moments/${momentId}`,headers:headers(1)});
  expect((await detail()).statusCode).toBe(404);
  const request=await app.inject({method:'POST',url:'/v1/friends/requests',headers:headers(),payload:{username:names[1]!.toUpperCase()}});expect(request.statusCode).toBe(201);expect(request.json().accountId).toBe(ids[1]);expect(request.json().username).toBe(names[1]);expect(request.json().status).toBe('pending');expect((await detail()).statusCode).toBe(404);
  expect((await app.inject({method:'POST',url:`/v1/friends/${ids[0]}/accept`,headers:headers(1),payload:{}})).statusCode).toBe(200);expect((await detail()).statusCode).toBe(200);expect((await detail()).json().authorUsername).toBe(names[0]);
  expect((await app.inject({method:'POST',url:`/v1/moments/${momentId}/comments`,headers:headers(1),payload:{body:'Synthetic integration comment'}})).statusCode).toBe(201);
  const selfie=await app.inject({method:'POST',url:'/v1/me/selfies',headers:{...headers(1),'content-type':'image/png'},payload:image});expect(selfie.statusCode).toBe(201);
  expect((await app.inject({method:'PUT',url:`/v1/moments/${momentId}/reaction`,headers:headers(1),payload:{selfieId:selfie.json().id}})).statusCode).toBe(200);
  for(const suffix of ['comments','reactions']){const result=await app.inject({url:`/v1/moments/${momentId}/${suffix}`,headers:headers(1)});expect(result.statusCode).toBe(200);expect(result.json().items).toHaveLength(1);}
  const comments=await app.inject({url:`/v1/moments/${momentId}/comments`,headers:headers(1)});expect(comments.json().items[0].authorUsername).toBe(names[1]);
  expect((await app.inject({url:`/v1/moments/${momentId}/reactions`,headers:headers(1)})).json().items[0].username).toBe(names[1]);
  expect((await app.inject({url:'/v1/feed',headers:headers(1)})).json().items.find((item:{id:string})=>item.id===momentId).authorUsername).toBe(names[0]);
  expect((await app.inject({url:'/v1/friends',headers:headers(1)})).json().items[0]).toMatchObject({accountId:ids[0],username:names[0]});
  expect((await app.inject({method:'DELETE',url:`/v1/friends/${ids[0]}`,headers:headers(1)})).statusCode).toBe(204);
  for(const suffix of ['','/comments','/reactions','/media/front','/media/back'])expect((await app.inject({url:`/v1/moments/${momentId}${suffix}`,headers:headers(1)})).statusCode).toBe(404);
  const ownerStreak=await app.inject({url:'/v1/me/streak',headers:headers()});expect(ownerStreak.statusCode).toBe(200);expect(ownerStreak.json()).toMatchObject({currentStreak:1,postedToday:true});expect((await app.inject({url:'/v1/me/streak',headers:headers(1)})).json()).toMatchObject({currentStreak:0,postedToday:false});
  const now=Date.now();eventId=(await pool.query<{id:string}>("INSERT INTO events(organizer_id,title,starts_at,ends_at) VALUES($1,'Synthetic social-flow event',$2,$3) RETURNING id",[ids[0],new Date(now-60_000),new Date(now+60_000)])).rows[0]!.id;
  expect((await app.inject({method:'POST',url:`/v1/events/${eventId}/check-ins`,headers:headers(1),payload:{accountId:ids[1]}})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url:`/v1/events/${eventId}/check-ins`,headers:headers(),payload:{accountId:ids[1]}})).statusCode).toBe(200);
  expect((await app.inject({url:`/v1/events/${eventId}/check-in`,headers:headers(1)})).json()).toMatchObject({checkedIn:true});
 } finally {
  await pool.query('DELETE FROM moment_reactions WHERE account_id=ANY($1::uuid[])',[ids]);
  await pool.query('DELETE FROM selfies WHERE account_id=ANY($1::uuid[])',[ids]);
  await pool.query('DELETE FROM moment_comments WHERE moment_id IN (SELECT id FROM moments WHERE author_id=ANY($1::uuid[]))',[ids]);
  await pool.query('DELETE FROM moment_media WHERE moment_id IN (SELECT id FROM moments WHERE author_id=ANY($1::uuid[]))',[ids]);
  await pool.query('DELETE FROM moments WHERE author_id=ANY($1::uuid[])',[ids]);
  if(eventId){await pool.query('DELETE FROM event_checkins WHERE event_id=$1',[eventId]);await pool.query('DELETE FROM events WHERE id=$1',[eventId]);}
  await pool.query('DELETE FROM friendships WHERE account_low=ANY($1::uuid[]) OR account_high=ANY($1::uuid[])',[ids]);
  await pool.query('DELETE FROM preference_history WHERE account_id=ANY($1::uuid[])',[ids]);
  await pool.query('DELETE FROM onchain_preferences WHERE account_id=ANY($1::uuid[])',[ids]);
  await pool.query('DELETE FROM accounts WHERE id=ANY($1::uuid[])',[ids]);
  await app.close();objects.clear();
 }
});
