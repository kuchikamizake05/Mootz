import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
interface EventRow {id:string;organizer_id:string;title:string;description:string;starts_at:Date;ends_at:Date;location_label:string|null}
const uuid={type:'string',format:'uuid'};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(statusCode:number):never=>{throw Object.assign(new Error('Event request rejected'),{statusCode});};
export function registerEventRoutes(app:FastifyInstance,options:{pool:Pool;verifyToken:(token:string)=>Promise<{subject:string}>;now?:()=>Date}) {
 const {pool}=options;const now=options.now??(()=>new Date());
 async function account(request:FastifyRequest) {
  const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');let subject:string;
  try{if(!match)return fail(401);subject=(await options.verifyToken(match[1]!)).subject;if(!subject)return fail(401);}catch{return fail(401);}
  const result=await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject]);return result.rows[0]?.id??fail(403);
 }
 const params={type:'object',additionalProperties:false,required:['id'],properties:{id:uuid}};
 const present=(row:EventRow)=>({id:row.id,title:row.title,description:row.description,startsAt:row.starts_at.toISOString(),endsAt:row.ends_at.toISOString(),locationLabel:row.location_label});
 async function find(id:string){const result=await pool.query<EventRow>('SELECT * FROM events WHERE id=$1',[id]);return result.rows[0]??fail(404);}
 app.get<{Params:{id:string}}>('/v1/events/:id',{schema:{params}},async request=>{await account(request);return present(await find(request.params.id));});
 app.get<{Querystring:{limit?:string;cursor?:string}}>('/v1/events',{schema:{querystring:{type:'object',additionalProperties:false,properties:{limit:{type:'string',pattern:'^(?:[1-9]|[1-4][0-9]|50)$'},cursor:{type:'string',maxLength:512}}}}},async request=>{
  await account(request);const limit=Number(request.query.limit??20);let after:{time:string;id:string}|null=null;
  if(request.query.cursor){try{const value=JSON.parse(Buffer.from(request.query.cursor,'base64url').toString()) as Record<string,unknown>;if(typeof value.time!=='string'||typeof value.id!=='string'||!uuidPattern.test(value.id)||!Number.isFinite(Date.parse(value.time))||new Date(value.time).toISOString()!==value.time)return fail(400);after={time:value.time,id:value.id};}catch{return fail(400);}}
  const result=await pool.query<EventRow>('SELECT * FROM events WHERE ($1::timestamptz IS NULL OR (starts_at,id)>($1::timestamptz,$2::uuid)) ORDER BY starts_at,id LIMIT $3',[after?.time??null,after?.id??null,limit+1]);const rows=result.rows.slice(0,limit);const last=rows.at(-1);
  return{items:rows.map(present),nextCursor:result.rows.length>limit&&last?Buffer.from(JSON.stringify({time:last.starts_at.toISOString(),id:last.id})).toString('base64url'):null};
 });
 app.get<{Params:{id:string}}>('/v1/events/:id/check-in',{schema:{params}},async request=>{
  const actor=await account(request);await find(request.params.id);const result=await pool.query<{checked_in_at:Date}>('SELECT checked_in_at FROM event_checkins WHERE event_id=$1 AND account_id=$2',[request.params.id,actor]);return{checkedIn:!!result.rows[0],checkedInAt:result.rows[0]?.checked_in_at.toISOString()??null};
 });
 app.post<{Params:{id:string};Body:{accountId:string}}>('/v1/events/:id/check-ins',{schema:{params,body:{type:'object',additionalProperties:false,required:['accountId'],properties:{accountId:uuid}}}},async request=>{
  const actor=await account(request);const client=await pool.connect();
  try{
   await client.query('BEGIN');const event=(await client.query<EventRow>('SELECT * FROM events WHERE id=$1 FOR UPDATE',[request.params.id])).rows[0];if(!event)return fail(404);if(event.organizer_id!==actor)return fail(403);
   const target=request.body.accountId;if(!(await client.query('SELECT 1 FROM accounts WHERE id=$1',[target])).rowCount)return fail(404);
   const existing=await client.query<{checked_in_at:Date}>('SELECT checked_in_at FROM event_checkins WHERE event_id=$1 AND account_id=$2',[event.id,target]);let checked=existing.rows[0]?.checked_in_at;
   if(!checked){const time=now();if(time<event.starts_at||time>=event.ends_at)return fail(409);checked=(await client.query<{checked_in_at:Date}>('INSERT INTO event_checkins(event_id,account_id,checked_in_by,checked_in_at) VALUES($1,$2,$3,$4) RETURNING checked_in_at',[event.id,target,actor,time])).rows[0]!.checked_in_at;}
   await client.query('COMMIT');return{checkedIn:true,checkedInAt:checked.toISOString()};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
}
