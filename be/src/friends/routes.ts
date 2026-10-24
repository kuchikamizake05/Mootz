import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Pool, PoolClient } from 'pg';
import { syncAchievements } from '../frames/service.ts';
interface Relationship { username?:string|null;account_low:string;account_high:string;requested_by:string;status:'pending'|'accepted'|'blocked';created_at:Date;updated_at:Date }
const uuid={type:'string',format:'uuid'};
const fail=(statusCode:number):never=>{throw Object.assign(new Error('Friend request rejected'),{statusCode});};
export function registerFriendRoutes(app:FastifyInstance,options:{pool:Pool;verifyToken:(token:string)=>Promise<{subject:string}>}) {
 const {pool}=options;
 async function account(request:FastifyRequest) {
  const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');let subject:string;
  try {if(!match)return fail(401);subject=(await options.verifyToken(match[1]!)).subject;if(!subject)return fail(401);}catch{return fail(401);}
  const result=await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject]);
  return result.rows[0]?.id??fail(403);
 }
 function present(row:Relationship,actor:string) {
  return {accountId:row.account_low===actor?row.account_high:row.account_low,username:row.username??null,status:row.status,direction:row.requested_by===actor?'outgoing':'incoming',createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString()};
 }
 async function pair<T>(actor:string,target:string,action:(client:PoolClient,row:Relationship|undefined)=>Promise<T>):Promise<T> {
  if(actor===target)return fail(400);
  const client=await pool.connect();
  try {
   await client.query('BEGIN');
   const key=[actor,target].sort().join(':');
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['friendship:'+key]);
   const result=await client.query<Relationship>('SELECT * FROM friendships WHERE account_low=LEAST($1::uuid,$2::uuid) AND account_high=GREATEST($1::uuid,$2::uuid) FOR UPDATE',[actor,target]);
   if(result.rows[0]?.status==='blocked')return fail(404);
   const output=await action(client,result.rows[0]);await client.query('COMMIT');return output;
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 const params={type:'object',additionalProperties:false,required:['accountId'],properties:{accountId:uuid}};
 const requestBody={type:'object',additionalProperties:false,properties:{accountId:uuid,username:{type:'string',minLength:1,maxLength:64}},oneOf:[{required:['accountId']},{required:['username']}]};
 async function usernameOf(id:string){return(await pool.query<{username:string|null}>('SELECT username FROM accounts WHERE id=$1',[id])).rows[0]?.username??null;}
 app.post<{Body:{accountId?:string;username?:string}}>('/v1/friends/requests',{schema:{body:requestBody}},async(request,reply)=>{
  const actor=await account(request);let target=request.body.accountId?.toLowerCase();
  if(!target)target=(await pool.query<{id:string}>('SELECT id FROM accounts WHERE username=$1',[request.body.username!.trim().toLowerCase()])).rows[0]?.id??fail(404);
  const result=await pair(actor,target,async(client,row)=>{
   if(row){if(row.status==='pending'&&row.requested_by!==actor)return fail(409);return{row,created:false};}
   if(!(await client.query('SELECT 1 FROM accounts WHERE id=$1',[target])).rowCount)return fail(404);
   const inserted=await client.query<Relationship>("INSERT INTO friendships(account_low,account_high,requested_by,status) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid),$1,'pending') RETURNING *",[actor,target]);
   return{row:inserted.rows[0]!,created:true};
  });return reply.code(result.created?201:200).send(present({...result.row,username:await usernameOf(target)},actor));
 });
 app.post<{Params:{accountId:string}}>('/v1/friends/:accountId/accept',{schema:{params,body:{type:'object',additionalProperties:false,properties:{}}}},async request=>{
  const actor=await account(request);return pair(actor,request.params.accountId.toLowerCase(),async(client,row)=>{
   if(!row)return fail(404);if(row.status==='accepted'){await syncAchievements(client,[row.account_low,row.account_high]);return present({...row,username:await usernameOf(request.params.accountId.toLowerCase())},actor);}if(row.requested_by===actor)return fail(409);
   const updated=await client.query<Relationship>("UPDATE friendships SET status='accepted',updated_at=now() WHERE account_low=$1 AND account_high=$2 RETURNING *",[row.account_low,row.account_high]);await syncAchievements(client,[row.account_low,row.account_high]);return present({...updated.rows[0]!,username:await usernameOf(request.params.accountId.toLowerCase())},actor);
  });
 });
 app.delete<{Params:{accountId:string}}>('/v1/friends/:accountId',{schema:{params}},async(request,reply)=>{
  const actor=await account(request);await pair(actor,request.params.accountId.toLowerCase(),async(client,row)=>{if(row)await client.query('DELETE FROM friendships WHERE account_low=$1 AND account_high=$2',[row.account_low,row.account_high]);});return reply.code(204).send();
 });
 app.get<{Querystring:{status?:string;direction?:string;limit?:string;cursor?:string}}>('/v1/friends',{schema:{querystring:{type:'object',additionalProperties:false,properties:{status:{type:'string',enum:['all','pending','accepted']},direction:{type:'string',enum:['all','incoming','outgoing']},limit:{type:'string',pattern:'^([1-9]|[1-4][0-9]|50)$'},cursor:{type:'string',maxLength:1024}}}}},async request=>{
  const actor=await account(request);const {status='all',direction='all',limit='20',cursor}=request.query;let after:string|null=null;
  if(cursor){try{const value=JSON.parse(Buffer.from(cursor,'base64url').toString()) as Record<string,unknown>;if(value.actor!==actor||value.status!==status||value.direction!==direction||typeof value.after!=='string'||!/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(value.after))return fail(400);after=value.after;}catch{return fail(400);}}
  const result=await pool.query<Relationship>(`SELECT f.*,a.username FROM friendships f JOIN accounts a ON a.id=CASE WHEN f.account_low=$1 THEN f.account_high ELSE f.account_low END WHERE (f.account_low=$1 OR f.account_high=$1) AND f.status<>'blocked' AND ($2='all' OR f.status=$2) AND ($3='all' OR ($3='outgoing' AND f.requested_by=$1) OR ($3='incoming' AND f.requested_by<>$1)) AND ($4::uuid IS NULL OR a.id>$4::uuid) ORDER BY a.id LIMIT $5`,[actor,status,direction,after,Number(limit)+1]);
  const items=result.rows.slice(0,Number(limit)).map(row=>present(row,actor));const nextCursor=result.rows.length>Number(limit)?Buffer.from(JSON.stringify({actor,status,direction,after:items.at(-1)!.accountId})).toString('base64url'):null;
  return{items,nextCursor};
 });
}
