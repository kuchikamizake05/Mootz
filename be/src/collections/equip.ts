import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { Address } from 'viem';
import type { CollectionGateway } from './types.ts';
import { uuidBytes32 } from '../protocol/index.ts';
type Mapping={id:string;event_id:string;chain_id:string;contract_address:string;collection_id:string;display_name:string;artwork_url:string|null;equipped_at?:Date};
const fail=(statusCode:number,code:string):never=>{throw Object.assign(new Error(code),{statusCode,code});};
export function registerEquipRoutes(app:FastifyInstance,options:{pool:Pool;verifyToken:(token:string)=>Promise<{subject:string}>;gateway?:Pick<CollectionGateway,'domain'|'read'>}) {
 const {pool}=options;
 async function actor(request:FastifyRequest){
  const token=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'')?.[1];let subject:string;
  try{if(!token)return fail(401,'UNAUTHORIZED');subject=(await options.verifyToken(token)).subject;if(!subject)return fail(401,'UNAUTHORIZED');}catch{return fail(401,'UNAUTHORIZED');}
  return (await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject])).rows[0]?.id??fail(403,'ACCOUNT_REQUIRED');
 }
 async function equip(account:string,ref?:string){
  const client=await pool.connect();
  try{
   await client.query('BEGIN');await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[account]);
   const row=(await client.query<Mapping>(ref?'SELECT c.* FROM event_collections c WHERE c.id=$1':'SELECT c.*,e.equipped_at FROM collection_equips e JOIN event_collections c ON c.id=e.collection_ref WHERE e.account_id=$1',[ref??account])).rows[0];
   if(!row){await client.query('COMMIT');if(ref)return fail(404,'COLLECTION_NOT_FOUND');return{equipped:null};}
   const wallet=(await client.query<{address:Address}>('SELECT address FROM wallet_bindings WHERE account_id=$1 AND chain_id=$2 AND revoked_at IS NULL FOR SHARE',[account,row.chain_id])).rows[0];
   let owns=false;
   if(wallet){
    const gateway=options.gateway;if(!gateway)return fail(503,'CHAIN_UNAVAILABLE');
    if(Number(row.chain_id)!==gateway.domain.chainId||row.contract_address.toLowerCase()!==gateway.domain.verifyingContract.toLowerCase())return fail(503,'COLLECTION_MAPPING_INVALID');
    let state:Awaited<ReturnType<CollectionGateway['read']>>;try{state=await gateway.read(BigInt(row.collection_id),wallet.address);}catch{return fail(503,'CHAIN_UNAVAILABLE');}
    if(state.eventId.toLowerCase()!==uuidBytes32(row.event_id))return fail(503,'COLLECTION_MAPPING_INVALID');owns=state.balance>0n;
   }
   if(!owns){if(ref)return fail(403,wallet?'COLLECTION_NOT_OWNED':'VERIFIED_WALLET_REQUIRED');await client.query('DELETE FROM collection_equips WHERE account_id=$1',[account]);await client.query('COMMIT');return{equipped:null};}
   if(ref){row.equipped_at=(await client.query<{equipped_at:Date}>('INSERT INTO profile_frames(account_id,collection_ref) VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET collection_ref=excluded.collection_ref,achievement_id=NULL,equipped_at=CASE WHEN profile_frames.collection_ref=excluded.collection_ref THEN profile_frames.equipped_at ELSE clock_timestamp() END RETURNING equipped_at',[account,ref])).rows[0]!.equipped_at;}
   await client.query('COMMIT');return{equipped:{collectionRef:row.id,eventId:row.event_id,collectionId:row.collection_id,chainId:Number(row.chain_id),contractAddress:row.contract_address,displayName:row.display_name,artworkUrl:row.artwork_url,equippedAt:row.equipped_at!.toISOString()}};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 app.get('/v1/me/equipped-collection',async request=>equip(await actor(request)));
 app.put<{Body:{collectionRef:string}}>('/v1/me/equipped-collection',{schema:{body:{type:'object',additionalProperties:false,required:['collectionRef'],properties:{collectionRef:{type:'string',format:'uuid'}}}}},async request=>equip(await actor(request),request.body.collectionRef));
 app.delete('/v1/me/equipped-collection',async(request,reply)=>{const account=await actor(request);const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT id FROM accounts WHERE id=$1 FOR UPDATE',[account]);await client.query('DELETE FROM collection_equips WHERE account_id=$1',[account]);await client.query('COMMIT');return reply.code(204).send();}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}});
}
