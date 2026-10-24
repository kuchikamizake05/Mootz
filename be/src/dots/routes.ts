import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { meetChainStatus, presentFinality, type ChainObservation } from '../chain/finality.js';
interface DotRow extends ChainObservation {id:string;meet_id:string;moment_id:string;poster_id:string;scanner_id:string;created_at:Date;hidden_by:string|null;poster_username:string|null;scanner_username:string|null;chain_status:'pending'|'recorded'|'not_saved';display_lat:number|null;display_lng:number|null}
const uuid={type:'string',format:'uuid'};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(statusCode:number):never=>{throw Object.assign(new Error('Dot request rejected'),{statusCode});};
const selection="SELECT d.id,d.meet_id,date_trunc('milliseconds',d.created_at) AS created_at,d.hidden_by,t.moment_id,t.poster_id,t.scanner_id,t.chain_status,pa.username AS poster_username,sa.username AS scanner_username,r.observed_status,r.receipt_block_number,r.finalized_at,CASE WHEN m.display_lat IS NOT NULL AND m.display_lng IS NOT NULL THEN t.display_lat ELSE NULL END AS display_lat,CASE WHEN m.display_lat IS NOT NULL AND m.display_lng IS NOT NULL THEN t.display_lng ELSE NULL END AS display_lng FROM dots d JOIN meets t ON t.id=d.meet_id JOIN moments m ON m.id=t.moment_id JOIN accounts pa ON pa.id=t.poster_id JOIN accounts sa ON sa.id=t.scanner_id LEFT JOIN chain_receipt_observations r ON r.source='meet' AND r.job_id=t.id AND r.chain_id=t.chain_id AND r.contract_address=lower(t.verifying_contract) AND r.transaction_hash=lower(t.transaction_hash)";
const audience=`(t.poster_id=$1::uuid OR t.scanner_id=$1::uuid OR EXISTS(SELECT 1 FROM friendships f WHERE f.account_low=LEAST(t.poster_id,$1::uuid) AND f.account_high=GREATEST(t.poster_id,$1::uuid) AND f.status='accepted'))`;
function present(row:DotRow){const status=meetChainStatus(row.chain_status,row);return{id:row.id,meetId:row.meet_id,momentId:row.moment_id,participants:[row.poster_id,row.scanner_id],participantUsernames:[row.poster_username,row.scanner_username],createdAt:row.created_at.toISOString(),onchainStatus:status,recorded:status==='recorded',...presentFinality(row),location:row.display_lat===null?null:{latitude:row.display_lat,longitude:row.display_lng},hidden:row.hidden_by!==null};}
export function registerDotRoutes(app:FastifyInstance,options:{pool:Pool;verifyToken:(token:string)=>Promise<{subject:string}>}){
 const {pool}=options;
 async function account(request:FastifyRequest){
  const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');let subject:string;
  try{if(!match)return fail(401);subject=(await options.verifyToken(match[1]!)).subject;if(!subject)return fail(401);}catch{return fail(401);}
  const result=await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject]);return result.rows[0]?.id??fail(403);
 }
 app.get<{Querystring:{limit?:string;cursor?:string;momentId?:string;map?:string}}>('/v1/dots',{schema:{querystring:{type:'object',additionalProperties:false,properties:{limit:{type:'string',pattern:'^(?:[1-9]|[1-4][0-9]|50)$'},cursor:{type:'string',maxLength:1024},momentId:uuid,map:{type:'string',enum:['true','false']}}}}},async request=>{
  const actor=await account(request);const {limit='20',momentId,map='false',cursor}=request.query;let after:{time:string;id:string}|null=null;
  if(cursor){try{
   const parsed=JSON.parse(Buffer.from(cursor,'base64url').toString()) as Record<string,unknown>;
   if(!parsed||parsed.actor!==actor||parsed.map!==map||parsed.momentId!==(momentId?.toLowerCase()??null)||typeof parsed.time!=='string'||!Number.isFinite(Date.parse(parsed.time))||new Date(parsed.time).toISOString()!==parsed.time||typeof parsed.id!=='string'||!uuidPattern.test(parsed.id))return fail(400);
   after={time:parsed.time,id:parsed.id};
  }catch{return fail(400);}}
  const result=await pool.query<DotRow>(`${selection} WHERE ${audience} AND ($2::uuid IS NULL OR t.moment_id=$2) AND ($3::timestamptz IS NULL OR (date_trunc('milliseconds',d.created_at),d.id)<($3::timestamptz,$4::uuid)) ${map==='true'?'AND m.display_lat IS NOT NULL AND m.display_lng IS NOT NULL AND t.display_lat IS NOT NULL AND t.display_lng IS NOT NULL AND d.hidden_by IS NULL':''} ORDER BY date_trunc('milliseconds',d.created_at) DESC,d.id DESC LIMIT $5`,[actor,momentId??null,after?.time??null,after?.id??null,Number(limit)+1]);
  const rows=result.rows.slice(0,Number(limit));const last=rows.at(-1);
  return{items:rows.map(present),nextCursor:result.rows.length>Number(limit)&&last?Buffer.from(JSON.stringify({actor,map,momentId:momentId?.toLowerCase()??null,time:last.created_at.toISOString(),id:last.id})).toString('base64url'):null};
 });
 app.get('/v1/me/dots/summary',async request=>{
  const actor=await account(request);
  const result=await pool.query<{dot_count:string;unique_partners:string}>('SELECT count(*) AS dot_count,count(DISTINCT CASE WHEN t.poster_id=$1 THEN t.scanner_id ELSE t.poster_id END) AS unique_partners FROM dots d JOIN meets t ON t.id=d.meet_id WHERE t.poster_id=$1 OR t.scanner_id=$1',[actor]);
  return{dotCount:Number(result.rows[0]!.dot_count),uniquePartners:Number(result.rows[0]!.unique_partners)};
 });
 const params={type:'object',additionalProperties:false,required:['id'],properties:{id:uuid}};
 app.get<{Params:{id:string}}>('/v1/dots/:id',{schema:{params}},async request=>{
  const actor=await account(request);const result=await pool.query<DotRow>(`${selection} WHERE ${audience} AND d.id=$2`,[actor,request.params.id]);return result.rows[0]?present(result.rows[0]):fail(404);
 });
 app.put<{Params:{id:string};Body:{hidden:boolean}}>('/v1/dots/:id/visibility',{schema:{params,body:{type:'object',additionalProperties:false,required:['hidden'],properties:{hidden:{type:'boolean'}}}}},async request=>{
  const actor=await account(request);const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const result=await client.query<DotRow>(`${selection} WHERE d.id=$1 AND (t.poster_id=$2 OR t.scanner_id=$2) FOR UPDATE OF d`,[request.params.id,actor]);const row=result.rows[0];if(!row)return fail(404);
   if(row.hidden_by!==null&&row.hidden_by!==actor)return fail(409);
   await client.query('UPDATE dots SET hidden_by=$2 WHERE id=$1',[row.id,request.body.hidden?actor:null]);
   await client.query('COMMIT');return{id:row.id,hidden:request.body.hidden};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
}
