import { createHash } from 'node:crypto';
import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool,PoolClient } from 'pg';
interface Row {id:string;moment_id:string;author_id:string;parent_id:string|null;reply_to_id:string|null;body:string|null;created_at:Date;deleted_at:Date|null;reply_to_author_id?:string|null;request_fingerprint?:string|null}
const uuid={type:'string',format:'uuid'};
const fail=(statusCode:number,message:string):never=>{throw Object.assign(new Error(message),{statusCode});};
const params={type:'object',required:['id'],properties:{id:uuid}};
const present=(row:Row)=>({id:row.id,momentId:row.moment_id,authorId:row.author_id,parentId:row.parent_id,replyToId:row.reply_to_id,replyToAuthorId:row.reply_to_author_id??null,body:row.body,createdAt:row.created_at.toISOString(),deleted:row.deleted_at!==null});
export function registerCommentRoutes(app:FastifyInstance,options:{pool:Pool;verifyToken:(token:string)=>Promise<{subject:string}>;rateLimit?:number}) {
 const {pool}=options;const rateLimit=options.rateLimit??20;
 if(!Number.isSafeInteger(rateLimit)||rateLimit<1||rateLimit>20)throw Error('Invalid comment rate limit');
 async function account(request:FastifyRequest) {
  const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');let subject:string;
  try{if(!match)return fail(401,'Unauthorized');subject=(await options.verifyToken(match[1]!)).subject;if(!subject)return fail(401,'Unauthorized');}catch{return fail(401,'Unauthorized');}
  const result=await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject]);if(!result.rows[0])return fail(403,'Account setup required');return result.rows[0].id;
 }
 async function transaction<T>(fn:(client:PoolClient)=>Promise<T>) {const client=await pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
 async function visible(client:PoolClient,id:string,viewer:string,lock:boolean) {
  const result=await client.query(`SELECT m.id FROM moments m WHERE m.id=$1 AND m.published_at IS NOT NULL AND (m.author_id=$2 OR EXISTS(SELECT 1 FROM friendships f WHERE f.account_low=LEAST(m.author_id,$2::uuid) AND f.account_high=GREATEST(m.author_id,$2::uuid) AND f.status='accepted')) ${lock?'FOR UPDATE OF m':''}`,[id,viewer]);if(!result.rowCount)return fail(404,'Moment not found');
 }
 app.post<{Params:{id:string};Body:{body:string;parentId?:string;clientRequestId?:string}}>('/v1/moments/:id/comments',{schema:{params,body:{type:'object',additionalProperties:false,required:['body'],properties:{body:{type:'string',maxLength:2000},parentId:uuid,clientRequestId:uuid}}}},async(request,reply)=>{
  const viewer=await account(request);const body=request.body.body.trim();if(/[\u0000\uD800-\uDFFF]/u.test(body)||Array.from(body).length<1||Array.from(body).length>500)return fail(400,'Comment must contain 1 to 500 characters');
  let created=true;const fingerprint=createHash('sha256').update(JSON.stringify([request.params.id.toLowerCase(),body,request.body.parentId?.toLowerCase()??null])).digest('hex');
  const row=await transaction(async client=>{
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`comment-rate:${viewer}`]);await visible(client,request.params.id,viewer,true);
   if(request.body.clientRequestId){const previous=(await client.query<Row>('SELECT c.*,target.author_id AS reply_to_author_id FROM moment_comments c LEFT JOIN moment_comments target ON target.id=c.reply_to_id WHERE c.author_id=$1 AND c.client_request_id=$2',[viewer,request.body.clientRequestId])).rows[0];if(previous){if(previous.request_fingerprint!==fingerprint)return fail(409,'Comment request key already used');created=false;return previous;}}
   let parentId:string|null=null;let replyToId:string|null=null;let replyToAuthorId:string|null=null;
   if(request.body.parentId){const target=(await client.query<Row>('SELECT * FROM moment_comments WHERE id=$1 AND moment_id=$2',[request.body.parentId,request.params.id])).rows[0];if(!target||(target.parent_id!==null&&target.deleted_at!==null))return fail(400,'Invalid parent comment');parentId=target.parent_id??target.id;replyToId=target.id;replyToAuthorId=target.author_id;}
   const count=await client.query<{count:string}>("SELECT count(*) FROM moment_comments WHERE author_id=$1 AND created_at>clock_timestamp()-interval '1 minute'",[viewer]);if(Number(count.rows[0]!.count)>=rateLimit)return fail(429,'Comment rate limit exceeded');
   const result=await client.query<Row>('INSERT INTO moment_comments(moment_id,author_id,parent_id,reply_to_id,body,client_request_id,request_fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[request.params.id,viewer,parentId,replyToId,body,request.body.clientRequestId??null,request.body.clientRequestId?fingerprint:null]);return {...result.rows[0]!,reply_to_author_id:replyToAuthorId};
  });reply.code(created?201:200);return present(row);
 });
 app.get<{Params:{id:string};Querystring:{limit?:string;cursor?:string;parentId?:string}}>('/v1/moments/:id/comments',{schema:{params,querystring:{type:'object',additionalProperties:false,properties:{limit:{type:'string',pattern:'^(?:[1-9]|[1-4][0-9]|50)$'},cursor:{type:'string',maxLength:300},parentId:uuid}}}},async request=>{
  const viewer=await account(request);const limit=Number(request.query.limit??20);let after:{time:string;id:string}|null=null;
  if(request.query.cursor){try{const value:unknown=JSON.parse(Buffer.from(request.query.cursor,'base64url').toString());if(!value||typeof value!=='object'||!('time'in value)||!('id'in value)||typeof value.time!=='string'||typeof value.id!=='string'||!Number.isFinite(Date.parse(value.time))||new Date(value.time).toISOString()!==value.time||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id))throw Error();after={time:value.time,id:value.id};}catch{return fail(400,'Invalid cursor');}}
  return transaction(async client=>{await visible(client,request.params.id,viewer,false);if(request.query.parentId){const root=await client.query('SELECT 1 FROM moment_comments WHERE id=$1 AND moment_id=$2 AND parent_id IS NULL',[request.query.parentId,request.params.id]);if(!root.rowCount)return fail(400,'Invalid root comment');}
   const result=await client.query<Row>(`SELECT c.*,target.author_id AS reply_to_author_id FROM moment_comments c LEFT JOIN moment_comments target ON target.id=c.reply_to_id WHERE c.moment_id=$1 AND c.parent_id IS NOT DISTINCT FROM $2::uuid AND (c.deleted_at IS NULL OR (c.parent_id IS NULL AND EXISTS(SELECT 1 FROM moment_comments child WHERE child.parent_id=c.id AND child.deleted_at IS NULL))) AND ($3::timestamptz IS NULL OR (c.created_at,c.id)>($3::timestamptz,$4::uuid)) ORDER BY c.created_at,c.id LIMIT $5`,[request.params.id,request.query.parentId??null,after?.time??null,after?.id??null,limit+1]);const rows=result.rows.slice(0,limit);const last=rows.at(-1);return{items:rows.map(present),nextCursor:result.rows.length>limit&&last?Buffer.from(JSON.stringify({time:last.created_at.toISOString(),id:last.id})).toString('base64url'):null};
  });
 });
 app.delete<{Params:{id:string;commentId:string}}>('/v1/moments/:id/comments/:commentId',{schema:{params:{type:'object',required:['id','commentId'],properties:{id:uuid,commentId:uuid}}}},async(request,reply)=>{
  const viewer=await account(request);await transaction(async client=>{await visible(client,request.params.id,viewer,true);const row=(await client.query<Row>('SELECT * FROM moment_comments WHERE id=$1 AND moment_id=$2 AND author_id=$3',[request.params.commentId,request.params.id,viewer])).rows[0];if(!row)return fail(404,'Comment not found');await client.query("UPDATE moment_comments SET body=NULL,deleted_at=COALESCE(deleted_at,clock_timestamp()) WHERE id=$1",[row.id]);});return reply.code(204).send();
 });
}
