import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool, PoolClient } from 'pg';
interface EventRow {id:string;organizer_id:string;title:string;description:string;starts_at:Date;ends_at:Date;location_label:string|null;latitude:number|null;longitude:number|null}
const uuid={type:'string',format:'uuid'};
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(statusCode:number):never=>{throw Object.assign(new Error('Event request rejected'),{statusCode});};
const pagination={type:'object',additionalProperties:false,properties:{limit:{type:'string',pattern:'^(?:[1-9]|[1-4][0-9]|50)$'},cursor:{type:'string',maxLength:512}}};
function cursor(value?:string):{time:string;id:string}|null {
 if(!value)return null;
 try {
  const parsed=JSON.parse(Buffer.from(value,'base64url').toString()) as Record<string,unknown>;
  if(typeof parsed.time!=='string'||typeof parsed.id!=='string'||!uuidPattern.test(parsed.id)||!Number.isFinite(Date.parse(parsed.time))||new Date(parsed.time).toISOString()!==parsed.time)return fail(400);
  return {time:parsed.time,id:parsed.id};
 } catch {return fail(400);}
}
async function organizer(db:Pick<PoolClient,'query'>,actor:string) {
 if(!(await db.query('SELECT account_id FROM event_organizers WHERE account_id=$1 FOR SHARE',[actor])).rowCount)return fail(403);
}
export function registerEventRoutes(app:FastifyInstance,options:{pool:Pool;verifyToken:(token:string)=>Promise<{subject:string}>;now?:()=>Date}) {
 const {pool}=options;const now=options.now??(()=>new Date());
 async function account(request:FastifyRequest) {
  const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');let subject:string;
  try{if(!match)return fail(401);subject=(await options.verifyToken(match[1]!)).subject;if(!subject)return fail(401);}catch{return fail(401);}
  const result=await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject]);return result.rows[0]?.id??fail(403);
 }
 const params={type:'object',additionalProperties:false,required:['id'],properties:{id:uuid}};
 const present=(row:EventRow)=>({id:row.id,title:row.title,description:row.description,startsAt:row.starts_at.toISOString(),endsAt:row.ends_at.toISOString(),locationLabel:row.location_label,location:row.latitude===null?null:{latitude:row.latitude,longitude:row.longitude}});
 app.get('/v1/me/organizer',async request=>{
  const actor=await account(request);
  return {enabled:!!(await pool.query('SELECT 1 FROM event_organizers WHERE account_id=$1',[actor])).rowCount};
 });
 type EventInput={clientRequestId:string;title:string;description?:string;startsAt:string;endsAt:string;locationLabel?:string|null;location?:{latitude:number;longitude:number}|null};
 app.post<{Body:EventInput}>('/v1/events',{schema:{body:{type:'object',additionalProperties:false,required:['clientRequestId','title','startsAt','endsAt'],properties:{
  clientRequestId:uuid,title:{type:'string',minLength:1,maxLength:200},description:{type:'string',maxLength:10000},
  startsAt:{type:'string',format:'date-time',maxLength:40},endsAt:{type:'string',format:'date-time',maxLength:40},locationLabel:{anyOf:[{type:'string',maxLength:200},{type:'null'}]},
  location:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['latitude','longitude'],properties:{latitude:{type:'number',minimum:-90,maximum:90},longitude:{type:'number',minimum:-180,maximum:180}}}]}
 }}}},async(request,reply)=>{
  const actor=await account(request);const input=request.body;
  const title=input.title.trim();const description=(input.description??'').trim();const location=input.locationLabel?.trim()||null;
  const latitude=input.location?.latitude??null;const longitude=input.location?.longitude??null;
  const starts=new Date(input.startsAt);const ends=new Date(input.endsAt);
  if(!title||!Number.isFinite(starts.getTime())||!Number.isFinite(ends.getTime())||ends<=starts)return fail(400);
  const client=await pool.connect();
  try {
   await client.query('BEGIN');await organizer(client,actor);
   const existing=(await client.query<EventRow>('SELECT * FROM events WHERE organizer_id=$1 AND client_request_id=$2',[actor,input.clientRequestId])).rows[0];
   let row=existing;let created=false;
   if(!row) {
    if(ends<=now())return fail(400);
    row=(await client.query<EventRow>(`INSERT INTO events(organizer_id,client_request_id,title,description,starts_at,ends_at,location_label,latitude,longitude)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(organizer_id,client_request_id) DO NOTHING RETURNING *`,[actor,input.clientRequestId,title,description,starts,ends,location,latitude,longitude])).rows[0];
    created=!!row;
    row??=(await client.query<EventRow>('SELECT * FROM events WHERE organizer_id=$1 AND client_request_id=$2',[actor,input.clientRequestId])).rows[0];
   }
   if(!row||row.title!==title||row.description!==description||row.location_label!==location||row.latitude!==latitude||row.longitude!==longitude||row.starts_at.getTime()!==starts.getTime()||row.ends_at.getTime()!==ends.getTime())return fail(409);
   await client.query('COMMIT');return reply.code(created?201:200).send(present(row));
  } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
 app.get<{Querystring:{limit?:string;cursor?:string}}>('/v1/me/events',{schema:{querystring:pagination}},async request=>{
  const actor=await account(request);await organizer(pool,actor);const after=cursor(request.query.cursor);const limit=Number(request.query.limit??20);
  const result=await pool.query<EventRow&{collection_status:'configured'|'not_configured';check_in_count:number}>(`SELECT e.*,
   CASE WHEN EXISTS(SELECT 1 FROM event_collections c WHERE c.event_id=e.id) THEN 'configured' ELSE 'not_configured' END AS collection_status,
   (SELECT count(*)::integer FROM event_checkins c WHERE c.event_id=e.id) AS check_in_count
   FROM events e WHERE e.organizer_id=$1 AND ($2::timestamptz IS NULL OR (e.starts_at,e.id)>($2::timestamptz,$3::uuid))
   ORDER BY e.starts_at,e.id LIMIT $4`,[actor,after?.time??null,after?.id??null,limit+1]);
  const rows=result.rows.slice(0,limit);const last=rows.at(-1);
  return {items:rows.map(row=>({...present(row),collectionStatus:row.collection_status,checkInCount:row.check_in_count})),nextCursor:result.rows.length>limit&&last?Buffer.from(JSON.stringify({time:last.starts_at.toISOString(),id:last.id})).toString('base64url'):null};
 });
 async function find(id:string){const result=await pool.query<EventRow>('SELECT * FROM events WHERE id=$1',[id]);return result.rows[0]??fail(404);}
 app.get<{Params:{id:string}}>('/v1/events/:id',{schema:{params}},async request=>{await account(request);return present(await find(request.params.id));});
  app.get<{Querystring:{limit?:string;cursor?:string}}>('/v1/events',{schema:{querystring:pagination}},async request=>{
  await account(request);const limit=Number(request.query.limit??20);const after=cursor(request.query.cursor);
  const result=await pool.query<EventRow>('SELECT * FROM events WHERE ($1::timestamptz IS NULL OR (starts_at,id)>($1::timestamptz,$2::uuid)) ORDER BY starts_at,id LIMIT $3',[after?.time??null,after?.id??null,limit+1]);const rows=result.rows.slice(0,limit);const last=rows.at(-1);
  return{items:rows.map(present),nextCursor:result.rows.length>limit&&last?Buffer.from(JSON.stringify({time:last.starts_at.toISOString(),id:last.id})).toString('base64url'):null};
 });
 app.get<{Params:{id:string}}>('/v1/events/:id/check-in',{schema:{params}},async request=>{
  const actor=await account(request);await find(request.params.id);const result=await pool.query<{checked_in_at:Date}>('SELECT checked_in_at FROM event_checkins WHERE event_id=$1 AND account_id=$2',[request.params.id,actor]);return{checkedIn:!!result.rows[0],checkedInAt:result.rows[0]?.checked_in_at.toISOString()??null};
 });
 app.post<{Params:{id:string};Body:{accountId:string}}>('/v1/events/:id/check-ins',{schema:{params,body:{type:'object',additionalProperties:false,required:['accountId'],properties:{accountId:uuid}}}},async request=>{
  const actor=await account(request);const client=await pool.connect();
  try{
   await client.query('BEGIN');await organizer(client,actor);const event=(await client.query<EventRow>('SELECT * FROM events WHERE id=$1 FOR UPDATE',[request.params.id])).rows[0];if(!event)return fail(404);if(event.organizer_id!==actor)return fail(403);
   const target=request.body.accountId;if(!(await client.query('SELECT 1 FROM accounts WHERE id=$1',[target])).rowCount)return fail(404);
   const existing=await client.query<{checked_in_at:Date}>('SELECT checked_in_at FROM event_checkins WHERE event_id=$1 AND account_id=$2',[event.id,target]);let checked=existing.rows[0]?.checked_in_at;
   if(!checked){const time=now();if(time<event.starts_at||time>=event.ends_at)return fail(409);checked=(await client.query<{checked_in_at:Date}>('INSERT INTO event_checkins(event_id,account_id,checked_in_by,checked_in_at) VALUES($1,$2,$3,$4) RETURNING checked_in_at',[event.id,target,actor,time])).rows[0]!.checked_in_at;}
   await client.query('COMMIT');return{checkedIn:true,checkedInAt:checked.toISOString()};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
}
