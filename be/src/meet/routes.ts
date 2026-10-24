import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import type { Address, Hex } from 'viem';
import { createProfileRepository } from '../profile/repository.ts';
import { meetDomain, meetTypes, RECORD_MEET, OFFCHAIN_MEET, uuidBytes32, storedPhotoCommitment, hashOffer, recoverOffer, recoverAccept, type MeetOffer, type MeetAccept } from '../protocol/index.ts';
import { assessMeetLocation, meetAreaCenter, MeetLocationError, type MeetLocationSample } from './location-policy.ts';
import { syncAchievements } from '../frames/service.ts';
type SerializedOffer = Omit<MeetOffer,'issuedAt'|'expiresAt'> & {issuedAt:string;expiresAt:string};
type OfferRow = {id:string;moment_id:string;poster_id:string;poster_wallet:Address;chain_id:string;verifying_contract:Address;offer:SerializedOffer;poster_signature:string|null;poster_location:MeetLocationSample|null;expires_at:Date};
type Actor = {id:string;wallet:Address;action:Hex};
const uuid = {type:'string',pattern:'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'};
const bytes32 = {type:'string',pattern:'^0x[0-9a-fA-F]{64}$'};
const signature = {type:'string',pattern:'^0x[0-9a-fA-F]{130}$'};
const location = {type:'object',additionalProperties:false,required:['latitude','longitude','accuracyMeters','capturedAtMs'],properties:{latitude:{type:'number'},longitude:{type:'number'},accuracyMeters:{type:'number'},capturedAtMs:{type:'integer'}}};
const params = {type:'object',required:['id'],properties:{id:uuid}};
const body = (properties:Record<string,unknown>) => ({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
function fail(statusCode:number, code:string):never {throw Object.assign(new Error(code),{statusCode,code});}
const typed = (offer:SerializedOffer):MeetOffer => ({...offer,issuedAt:BigInt(offer.issuedAt),expiresAt:BigInt(offer.expiresAt)});
export async function purgeExpiredOfferLocations(pool:Pool) { await pool.query('UPDATE meet_offers SET poster_location=NULL WHERE poster_location IS NOT NULL AND expires_at<=clock_timestamp()'); }
export function registerMeetRoutes(app:FastifyInstance, options:{pool:Pool;verifyToken(token:string):Promise<{subject:string}>;domain:{chainId:number;verifyingContract:Address};storage:{signRead(key:string,ttl:number):Promise<string>;read?(key:string):Promise<Buffer>};assertWallet?:(address:Address)=>Promise<void>;now?:()=>Date}) {
  const domain=meetDomain(options.domain.chainId,options.domain.verifyingContract);
  async function time(client:Pool|PoolClient=options.pool) {return options.now?.() ?? (await client.query<{time:Date}>('SELECT clock_timestamp() AS time')).rows[0]!.time;}
  async function identity(request:FastifyRequest) {
    const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??''); let subject:string;
    try {if(!match)throw Error(); subject=(await options.verifyToken(match[1]!)).subject;if(!subject)throw Error();}catch{fail(401,'UNAUTHORIZED');}
    return createProfileRepository(options.pool,options.domain.chainId).getOrCreate(subject);
  }
  async function actor(request:FastifyRequest):Promise<Actor> {
    const profile=await identity(request);
    if(!profile.wallet)fail(403,'WALLET_REQUIRED');
    return {id:profile.id,wallet:profile.wallet as Address,action:profile.recordMeet?RECORD_MEET:OFFCHAIN_MEET};
  }
  async function current(client:PoolClient,id:string):Promise<Actor> {
    await client.query('SELECT id FROM accounts WHERE id=$1 FOR SHARE',[id]);
    const result=await client.query<{address:Address;record_meet:boolean}>('SELECT w.address,p.record_meet FROM wallet_bindings w JOIN onchain_preferences p ON p.account_id=w.account_id WHERE w.account_id=$1 AND w.chain_id=$2 AND w.revoked_at IS NULL FOR SHARE OF w,p',[id,options.domain.chainId]);
    if(!result.rows[0])fail(403,'WALLET_REQUIRED'); const row=result.rows[0];return{id,wallet:row.address,action:row.record_meet?RECORD_MEET:OFFCHAIN_MEET};
  }
  async function offer(id:string,client:Pool|PoolClient=options.pool,lock=false) {const row=(await client.query<OfferRow>('SELECT * FROM meet_offers WHERE id=$1'+(lock?' FOR UPDATE':''),[id])).rows[0];if(!row)fail(404,'NOT_FOUND');return row;}
  function active(row:OfferRow,at:Date) {if(at>=row.expires_at)fail(410,'MEET_EXPIRED');if(Number(row.chain_id)!==domain.chainId||row.verifying_contract.toLowerCase()!==domain.verifyingContract.toLowerCase())fail(409,'DOMAIN_CHANGED');}
  function unchanged(row:OfferRow,poster:Actor) {if(poster.wallet!==row.poster_wallet)fail(409,'WALLET_CHANGED');if(poster.action!==row.offer.action)fail(409,'CONSENT_CHANGED');}
  async function verifyPoster(row:OfferRow) {if(!row.poster_signature)fail(404,'NOT_FOUND');try{if((await recoverOffer(domain,typed(row.offer),row.poster_signature)).toLowerCase()!==row.poster_wallet)throw Error();}catch{fail(400,'INVALID_SIGNATURE');}}
  async function eventCheck(client:PoolClient,momentId:string,actors:string[],at:Date) {
    const event=(await client.query<{event_id:string|null;starts_at:Date;ends_at:Date}>('SELECT m.event_id,e.starts_at,e.ends_at FROM moments m LEFT JOIN events e ON e.id=m.event_id WHERE m.id=$1',[momentId])).rows[0]!;
    if(event.event_id){if(at<event.starts_at||at>=event.ends_at)fail(403,'EVENT_INELIGIBLE');const checkins=await client.query('SELECT account_id FROM event_checkins WHERE event_id=$1 AND account_id=ANY($2::uuid[])',[event.event_id,actors]);if(checkins.rowCount!==actors.length)fail(403,'CHECK_IN_REQUIRED');}
    return event;
  }
  const response=(row:OfferRow)=>({id:row.id,domain,types:meetTypes,offer:row.offer,expiresAt:row.expires_at.toISOString()});
  async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{const client=await options.pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');if(error instanceof MeetLocationError)fail(error.code==='INVALID_LOCATION'?400:422,error.code);throw error;}finally{client.release();}}
  app.post<{Body:{momentId:string}}>('/v1/meet/offers',{schema:{body:body({momentId:uuid})}},async(request,reply)=>{
    const owner=await actor(request);
    const result=await transaction(async client=>{
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`meet-issue:${owner.id}`]);
      const poster=await current(client,owner.id);const at=await time(client);
      if(((await client.query('SELECT id FROM meet_offers WHERE poster_id=$1 AND created_at>clock_timestamp()-interval \'1 minute\'',[owner.id])).rowCount??0)>=30)fail(429,'RATE_LIMITED');
      const moment=(await client.query<{id:string;source:string;published_at:Date|null;event_id:string|null;commitment_salt:string}>('SELECT * FROM moments WHERE id=$1 AND author_id=$2',[request.body.momentId,owner.id])).rows[0];
      if(!moment)fail(404,'NOT_FOUND');if(!moment.published_at||moment.source!=='capture'||at.toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})!==moment.published_at.toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}))fail(409,'MOMENT_INELIGIBLE');
      const media=(await client.query<{side:string;sha256:string}>('SELECT side,sha256 FROM moment_media WHERE moment_id=$1',[moment.id])).rows;
      if(media.length!==2)fail(409,'MOMENT_INELIGIBLE');
      const id=randomUUID();const issuedAt=Math.floor(at.getTime()/1000);const expires=new Date((issuedAt+60)*1000);
      const value:SerializedOffer={action:poster.action,meetId:uuidBytes32(id),momentId:uuidBytes32(moment.id),photoCommitment:storedPhotoCommitment(moment.id,media.find(m=>m.side==='front')!.sha256,media.find(m=>m.side==='back')!.sha256,moment.commitment_salt),poster:poster.wallet,nonce:`0x${randomBytes(32).toString('hex')}`,issuedAt:String(issuedAt),expiresAt:String(issuedAt+60),eventId:moment.event_id?uuidBytes32(moment.event_id):`0x${'0'.repeat(64)}`};
      await client.query('INSERT INTO meet_offers(id,moment_id,poster_id,poster_wallet,chain_id,verifying_contract,offer,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,moment.id,poster.id,poster.wallet,domain.chainId,domain.verifyingContract,value,expires]);return response(await offer(id,client));
    });reply.code(201);return result;
  });
  app.put<{Params:{id:string};Body:{signature:string}}>('/v1/meet/offers/:id/signature',{schema:{params,body:body({signature})}},async request=>{
    const owner=await actor(request);return transaction(async client=>{const row=await offer(request.params.id,client,true);if(row.poster_id!==owner.id)fail(404,'NOT_FOUND');active(row,await time(client));unchanged(row,await current(client,owner.id));
      try{if((await recoverOffer(domain,typed(row.offer),request.body.signature)).toLowerCase()!==row.poster_wallet)throw Error();}catch{fail(400,'INVALID_SIGNATURE');}
      await options.assertWallet?.(row.poster_wallet);active(row,await time(client));if(row.poster_signature&&row.poster_signature!==request.body.signature)fail(409,'SIGNATURE_CONFLICT');await client.query('UPDATE meet_offers SET poster_signature=$2 WHERE id=$1',[row.id,request.body.signature]);return {...response(row),posterSignature:request.body.signature};});
  });
  app.put<{Params:{id:string};Body:MeetLocationSample}>('/v1/meet/offers/:id/location',{schema:{params,body:location}},async request=>{
    const owner=await actor(request);return transaction(async client=>{const row=await offer(request.params.id,client,true);if(row.poster_id!==owner.id)fail(404,'NOT_FOUND');active(row,await time(client));if(!row.poster_signature)fail(409,'OFFER_UNSIGNED');assessMeetLocation(request.body,request.body,(await time(client)).getTime());await client.query('UPDATE meet_offers SET poster_location=$2 WHERE id=$1',[row.id,request.body]);return{received:true};});
  });
  app.post<{Params:{id:string};Body:{offerDigest:Hex;posterSignature:string}}>('/v1/meet/offers/:id/preview',{schema:{params,body:body({offerDigest:bytes32,posterSignature:signature})}},async request=>{
    const scanner=await actor(request);return transaction(async client=>{const row=await offer(request.params.id,client,true);const at=await time(client);active(row,at);if(row.poster_id===scanner.id)fail(409,'SELF_MEET');if((await client.query('SELECT id FROM meets WHERE id=$1',[row.id])).rowCount)fail(409,'MEET_USED');await verifyPoster(row);unchanged(row,await current(client,row.poster_id));if(request.body.offerDigest!==hashOffer(domain,typed(row.offer))||request.body.posterSignature!==row.poster_signature)fail(400,'INVALID_SIGNATURE');await options.assertWallet?.(scanner.wallet);await eventCheck(client,row.moment_id,[row.poster_id,scanner.id],at);
      const media=(await client.query<{side:string;image_key:string;sha256:string}>('SELECT side,image_key,sha256 FROM moment_media WHERE moment_id=$1',[row.moment_id])).rows;
      const images=media.map(item=>({side:item.side,path:`/v1/meet/offers/${row.id}/media/${item.side}`,method:'POST',sha256:item.sha256}));
      active(row,await time(client));const moment=(await client.query<{caption:string;commitment_salt:string;username:string|null}>('SELECT m.caption,m.commitment_salt,a.username FROM moments m JOIN accounts a ON a.id=m.author_id WHERE m.id=$1',[row.moment_id])).rows[0]!;
      return{moment:{id:row.moment_id,authorUsername:moment.username,caption:moment.caption,images},proof:{salt:moment.commitment_salt},domain,types:meetTypes,acceptance:{action:scanner.action,offerDigest:request.body.offerDigest,scanner:scanner.wallet},expiresAt:row.expires_at.toISOString()};});
  });
  app.post<{Params:{id:string;side:string};Body:{offerDigest:Hex;posterSignature:string}}>('/v1/meet/offers/:id/media/:side',{schema:{params:{type:'object',required:['id','side'],properties:{id:uuid,side:{type:'string',enum:['front','back']}}},body:body({offerDigest:bytes32,posterSignature:signature})}},async(request,reply)=>{
    const scanner=await actor(request);
    const bytes=await transaction(async client=>{
      const row=await offer(request.params.id,client,true);active(row,await time(client));
      if(row.poster_id===scanner.id)fail(409,'SELF_MEET');
      if((await client.query('SELECT id FROM meets WHERE id=$1',[row.id])).rowCount)fail(409,'MEET_USED');
      await verifyPoster(row);unchanged(row,await current(client,row.poster_id));
      const viewer=await current(client,scanner.id);if(viewer.wallet!==scanner.wallet)fail(409,'WALLET_CHANGED');
      if(request.body.offerDigest!==hashOffer(domain,typed(row.offer))||request.body.posterSignature!==row.poster_signature)fail(400,'INVALID_SIGNATURE');
      await options.assertWallet?.(scanner.wallet);await eventCheck(client,row.moment_id,[row.poster_id,scanner.id],await time(client));
      const media=(await client.query<{image_key:string}>('SELECT image_key FROM moment_media WHERE moment_id=$1 AND side=$2',[row.moment_id,request.params.side])).rows[0];
      if(!media)fail(404,'NOT_FOUND');if(!options.storage.read)fail(503,'MEDIA_UNAVAILABLE');
      const image=await options.storage.read(media.image_key);
      unchanged(row,await current(client,row.poster_id));if((await current(client,scanner.id)).wallet!==scanner.wallet)fail(409,'WALLET_CHANGED');
      await eventCheck(client,row.moment_id,[row.poster_id,scanner.id],await time(client));active(row,await time(client));return image;
    });
    return reply.header('Content-Type','image/jpeg').header('Cache-Control','no-store').send(bytes);
  });
  app.post<{Params:{id:string};Body:{offerDigest:Hex;action:Hex;signature:string;location:MeetLocationSample}}>('/v1/meet/offers/:id/accept',{schema:{params,body:body({offerDigest:bytes32,action:bytes32,signature,location})}},async(request,reply)=>{
    const scanner=await actor(request);return transaction(async client=>{const row=await offer(request.params.id,client,true);
      const existing=(await client.query<{scanner_id:string;scanner_signature:string;acceptance:MeetAccept;id:string;chain_status:string;dot_id:string}>('SELECT m.*,d.id AS dot_id FROM meets m JOIN dots d ON d.meet_id=m.id WHERE m.id=$1',[row.id])).rows[0];
      if(existing){if(existing.scanner_id!==scanner.id||existing.scanner_signature!==request.body.signature||existing.acceptance.offerDigest!==request.body.offerDigest||existing.acceptance.action!==request.body.action)fail(409,'MEET_USED');return{meetId:row.id,dotId:existing.dot_id,status:'valid',onchainStatus:existing.chain_status};}
      active(row,await time(client));if(row.poster_id===scanner.id)fail(409,'SELF_MEET');await verifyPoster(row);
      // Account order is stable across opposite-direction offers and preference updates.
      const ordered=[row.poster_id,scanner.id].sort();const actors=new Map<string,Actor>();for(const id of ordered)actors.set(id,await current(client,id));
      const poster=actors.get(row.poster_id)!;const currentScanner=actors.get(scanner.id)!;unchanged(row,poster);if(currentScanner.action!==request.body.action)fail(409,'CONSENT_CHANGED');if(poster.wallet===currentScanner.wallet)fail(409,'SELF_MEET');
      const acceptance:MeetAccept={action:request.body.action,offerDigest:request.body.offerDigest,scanner:currentScanner.wallet};
      try{if(request.body.offerDigest!==hashOffer(domain,typed(row.offer))||(await recoverAccept(domain,acceptance,request.body.signature)).toLowerCase()!==currentScanner.wallet)throw Error();}catch{fail(400,'INVALID_SIGNATURE');}
      await options.assertWallet?.(poster.wallet);await options.assertWallet?.(currentScanner.wallet);
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`meet-pair:${ordered.join(':')}`]);const at=await time(client);active(row,at);
      if(!row.poster_location)fail(422,'LOCATION_STALE');const assessed=assessMeetLocation(row.poster_location,request.body.location,at.getTime());const event=await eventCheck(client,row.moment_id,ordered,at);
      const previous=await client.query<{area_key:string}>('SELECT area_key FROM meets WHERE LEAST(poster_id,scanner_id)=$1 AND GREATEST(poster_id,scanner_id)=$2 AND server_day=$3',[ordered[0],ordered[1],assessed.serverDay]);if(previous.rows.some(m=>m.area_key===assessed.areaKey))fail(409,'MEET_AREA_USED');if((previous.rowCount??0)>=5)fail(409,'MEET_DAILY_LIMIT');
      const momentDisplay=(await client.query<{display_lat:number|null}>('SELECT display_lat FROM moments WHERE id=$1',[row.moment_id])).rows[0]!;
      const display=momentDisplay.display_lat===null?null:meetAreaCenter(assessed.areaKey);
      const finalAt=await time(client);active(row,finalAt);
      if(event.event_id&&(finalAt<event.starts_at||finalAt>=event.ends_at))fail(403,'EVENT_INELIGIBLE');
      const finalLocation=assessMeetLocation(row.poster_location,request.body.location,finalAt.getTime());
      if(finalLocation.serverDay!==assessed.serverDay)fail(409,'SERVER_DAY_CHANGED');
      const status=poster.action===RECORD_MEET&&currentScanner.action===RECORD_MEET?'pending':'not_saved';
      await client.query('INSERT INTO meets(id,moment_id,poster_id,scanner_id,poster_wallet,scanner_wallet,accepted_at,area_key,server_day,offer,acceptance,poster_signature,scanner_signature,chain_id,verifying_contract,chain_status,display_lat,display_lng) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)',[row.id,row.moment_id,row.poster_id,scanner.id,poster.wallet,currentScanner.wallet,finalAt,assessed.areaKey,assessed.serverDay,row.offer,acceptance,row.poster_signature,request.body.signature,domain.chainId,domain.verifyingContract,status,display?.latitude??null,display?.longitude??null]);
      const dot=(await client.query<{id:string}>('INSERT INTO dots(meet_id) VALUES($1) RETURNING id',[row.id])).rows[0]!;await syncAchievements(client,ordered);if(status==='pending')await client.query('INSERT INTO meet_outbox(meet_id) VALUES($1)',[row.id]);await client.query('UPDATE meet_offers SET poster_location=NULL WHERE id=$1',[row.id]);reply.code(201);return{meetId:row.id,dotId:dot.id,status:'valid',onchainStatus:status};});
  });
  app.get<{Params:{id:string}}>('/v1/meets/:id',{schema:{params}},async request=>{const person=await identity(request);const row=(await options.pool.query<{id:string;dot_id:string;chain_status:string;accepted_at:Date;transaction_hash:string|null}>('SELECT m.id,d.id AS dot_id,m.chain_status,m.accepted_at,m.transaction_hash FROM meets m JOIN dots d ON d.meet_id=m.id WHERE m.id=$1 AND $2 IN(m.poster_id,m.scanner_id)',[request.params.id,person.id])).rows[0];if(!row)fail(404,'NOT_FOUND');return{meetId:row.id,dotId:row.dot_id,status:'valid',onchainStatus:row.chain_status,acceptedAt:row.accepted_at.toISOString(),transactionHash:row.transaction_hash};});
}
