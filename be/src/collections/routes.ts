import { randomBytes,randomUUID } from 'node:crypto';
import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool,PoolClient } from 'pg';
import type { Address,Hex } from 'viem';
import { collectionDomain,claimTypes,recoverClaim,uuidBytes32,type Claim } from '../protocol/index.ts';
import type { CollectionGateway } from './types.ts';
export type { CollectionGateway } from './types.ts';
type Mapping={id:string;event_id:string;chain_id:string;contract_address:string;collection_id:string;claim_starts_at:Date;claim_ends_at:Date;display_name:string;artwork_url:string};
type Voucher={id:string;collection_ref:string;recipient:string;issuer:string;deadline:Date;claim:Omit<Claim,'collectionId'|'deadline'>&{collectionId:string;deadline:string};signature:string};
const uuid={type:'string',format:'uuid'};const params={type:'object',additionalProperties:false,required:['id'],properties:{id:uuid}};
function fail(statusCode:number,code:string):never{throw Object.assign(new Error(code),{statusCode,code});}
export function registerCollectionRoutes(app:FastifyInstance,options:{pool:Pool;gateway:CollectionGateway;verifyToken(token:string):Promise<{subject:string}>;now?:()=>Date}) {
 const {pool,gateway}=options;const domain=collectionDomain(gateway.domain.chainId,gateway.domain.verifyingContract);
 const time=async(client:Pool|PoolClient)=>options.now?.()??(await client.query<{time:Date}>('SELECT clock_timestamp() AS time')).rows[0]!.time;
 async function account(request:FastifyRequest){let subject:string;try{const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');if(!match)throw Error();subject=(await options.verifyToken(match[1]!)).subject;if(!subject)throw Error();}catch{return fail(401,'UNAUTHORIZED');}return(await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject])).rows[0]?.id??fail(403,'ACCOUNT_REQUIRED');}
 async function context(client:Pool|PoolClient,id:string,actor:string,lock=false){
  const mapping=(await client.query<Mapping>('SELECT * FROM event_collections WHERE event_id=$1'+(lock?' FOR SHARE':''),[id])).rows[0];if(!mapping)fail(404,'NOT_FOUND');
  if(Number(mapping.chain_id)!==gateway.domain.chainId||mapping.contract_address!==gateway.domain.verifyingContract.toLowerCase())fail(503,'COLLECTION_UNAVAILABLE');
  const binding=(await client.query<{address:Address}>('SELECT address FROM wallet_bindings WHERE account_id=$1 AND chain_id=$2 AND revoked_at IS NULL'+(lock?' FOR SHARE':''),[actor,gateway.domain.chainId])).rows[0];if(!binding)fail(403,'WALLET_REQUIRED');
  const checkin=!!(await client.query('SELECT 1 FROM event_checkins WHERE event_id=$1 AND account_id=$2'+(lock?' FOR SHARE':''),[id,actor])).rowCount;
  let state:Awaited<ReturnType<CollectionGateway['read']>>;try{state=await gateway.read(BigInt(mapping.collection_id),binding.address);}catch{fail(503,'CHAIN_UNAVAILABLE');}
  if(state.eventId.toLowerCase()!==uuidBytes32(id)||state.cap<=0n||state.totalSupply<0n||state.totalSupply>state.cap||state.balance<0n)fail(503,'COLLECTION_UNAVAILABLE');
  const now=await time(client);const eligibility=state.balance>0n||state.claimed?'already_owned':!checkin?'not_checked_in':now<mapping.claim_starts_at?'not_open':now>=mapping.claim_ends_at?'closed':state.totalSupply>=state.cap?'sold_out':!state.issuerAuthorized||!gateway.issuerAddress||!gateway.signClaim?'issuer_unavailable':'eligible';
  return{mapping,recipient:binding.address,state,eligibility,now};
 }
 const present=(v:Voucher)=>({authorizationId:v.id,domain,types:claimTypes,claim:v.claim,signature:v.signature,expiresAt:v.deadline.toISOString(),status:'authorized' as const});
 app.get<{Params:{id:string}}>('/v1/events/:id/collection',{schema:{params}},async request=>{const actor=await account(request);const c=await context(pool,request.params.id,actor);return{collection:{id:c.mapping.id,eventId:c.mapping.event_id,chainId:Number(c.mapping.chain_id),contractAddress:c.mapping.contract_address,collectionId:c.mapping.collection_id,displayName:c.mapping.display_name,artworkUrl:c.mapping.artwork_url,claimStartsAt:c.mapping.claim_starts_at.toISOString(),claimEndsAt:c.mapping.claim_ends_at.toISOString()},eligibility:c.eligibility,cap:c.state.cap.toString(),totalSupply:c.state.totalSupply.toString(),remaining:(c.state.cap-c.state.totalSupply).toString(),balance:c.state.balance.toString(),claimed:c.state.claimed};});
 app.post<{Params:{id:string};Body:{clientRequestId:string}}>('/v1/events/:id/claim-authorizations',{schema:{params,body:{type:'object',additionalProperties:false,required:['clientRequestId'],properties:{clientRequestId:uuid}}}},async request=>{
  const actor=await account(request);const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['event-claim:'+actor]);await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[actor]);const c=await context(client,request.params.id,actor,true);
   const failures:Record<string,[number,string]>={already_owned:[409,'ALREADY_OWNED'],not_checked_in:[403,'CHECK_IN_REQUIRED'],not_open:[409,'CLAIM_NOT_OPEN'],closed:[410,'CLAIM_CLOSED'],sold_out:[409,'SOLD_OUT'],issuer_unavailable:[503,'COLLECTION_UNAVAILABLE']};const rejection=failures[c.eligibility];if(rejection)fail(...rejection);
   const previous=(await client.query<Voucher>('SELECT * FROM claim_authorizations WHERE account_id=$1 AND client_request_id=$2',[actor,request.body.clientRequestId])).rows[0];
   if(previous){if(previous.collection_ref!==c.mapping.id||previous.claim.collectionId!==c.mapping.collection_id||previous.recipient!==c.recipient.toLowerCase()||previous.issuer!==gateway.issuerAddress!.toLowerCase())fail(409,'CLAIM_REQUEST_CONFLICT');const retryTime=await time(client);if(previous.deadline<=retryTime||retryTime>=c.mapping.claim_ends_at)fail(410,'CLAIM_EXPIRED');await client.query('COMMIT');return present(previous);}
   if((await client.query('SELECT 1 FROM claim_authorizations WHERE account_id=$1 AND collection_ref=$2 AND deadline>$3',[actor,c.mapping.id,c.now])).rowCount)fail(409,'CLAIM_PENDING');
   const deadline=new Date(Math.floor(Math.min(c.now.getTime()+120000,c.mapping.claim_ends_at.getTime())/1000)*1000);if(deadline<=c.now)fail(410,'CLAIM_CLOSED');
   const claim:Claim={collectionId:BigInt(c.mapping.collection_id),recipient:c.recipient,issuer:gateway.issuerAddress!,nonce:`0x${randomBytes(32).toString('hex')}`,deadline:BigInt(deadline.getTime()/1000)};let signature:Hex;
   try{signature=await gateway.signClaim!(claim);if((await recoverClaim(domain,claim,signature)).toLowerCase()!==claim.issuer.toLowerCase())throw Error();}catch{fail(503,'COLLECTION_UNAVAILABLE');}
   const finalTime=await time(client);if(finalTime>=deadline||finalTime>=c.mapping.claim_ends_at||finalTime<c.mapping.claim_starts_at)fail(410,'CLAIM_EXPIRED');
   const serialized={...claim,collectionId:claim.collectionId.toString(),deadline:claim.deadline.toString()};const row=(await client.query<Voucher>('INSERT INTO claim_authorizations(id,account_id,collection_ref,recipient,issuer,nonce,deadline,claim,signature,client_request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[randomUUID(),actor,c.mapping.id,claim.recipient.toLowerCase(),claim.issuer.toLowerCase(),claim.nonce,deadline,serialized,signature,request.body.clientRequestId])).rows[0]!;await client.query('COMMIT');return present(row);
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
}
