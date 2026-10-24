import { createHash,randomBytes,randomUUID } from 'node:crypto';
import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool,PoolClient } from 'pg';
import type { FrameState } from '../frames/service.ts';
export interface CleanupDatabase { query(sql:string,values:string[][]):Promise<{rowCount:number|null}> }
export async function compensateUpload(database:CleanupDatabase,storage:{remove(keys:string[]):Promise<void>},keys:string[]) {
 if(!keys.length)return;
 try {
  const references=await database.query('SELECT 1 FROM moment_media WHERE image_key=ANY($1::text[]) OR thumbnail_key=ANY($1::text[])',[keys]);
  if(references.rowCount===0)await storage.remove(keys);
 } catch {/* Preserve files when commit outcome or database availability is uncertain. */}
}
interface Storage {
 assertPrivate():Promise<void>; put(key:string,bytes:Buffer,mime:string):Promise<void>;
 remove(keys:string[]):Promise<void>; signRead(key:string,ttl:number):Promise<string>;
}
interface Image { image:Buffer;thumbnail:Buffer;width:number;height:number;sha256:string;thumbnailSha256:string;contentType:'image/jpeg' }
interface Row {id:string;author_id:string;source:string;caption:string;event_id:string|null;display_lat:number|null;display_lng:number|null;published_at:Date|null;created_at:Date;pair_commitment:string|null}
const uuid={type:'string',format:'uuid'};
const fail=(statusCode:number,message:string):never=>{throw Object.assign(new Error(message),{statusCode});};
// Proposed display grid only. Never use this grid for Meet distance verification.
export function displayLocation(latitude:number,longitude:number) {
 const latStep=200/111320;
 const latitudeCenter=(Math.floor((latitude+90)/latStep)+.5)*latStep-90;
 const lngStep=200/(111320*Math.max(.01,Math.cos(latitudeCenter*Math.PI/180)));
 return {latitude:Math.max(-90,Math.min(90,latitudeCenter)),longitude:Math.max(-180,Math.min(180,(Math.floor((longitude+180)/lngStep)+.5)*lngStep-180))};
}
export function registerMomentRoutes(app:FastifyInstance, options:{verifyToken:(token:string)=>Promise<{subject:string}>;pool:Pool;storage:Storage;processImage:(bytes:Buffer,mime:string)=>Promise<Image>;readFrame?:(accountId:string)=>Promise<FrameState>}) {
 const {pool,storage}=options;
 app.addContentTypeParser(['image/jpeg','image/png'],{parseAs:'buffer',bodyLimit:8*1024*1024},(_request,body,done)=>done(null,body));
 async function account(request:FastifyRequest):Promise<string> {
  const match=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');
  let subject:string;
  try {if(!match) return fail(401,'Unauthorized'); subject=(await options.verifyToken(match[1]!)).subject;if(!subject)return fail(401,'Unauthorized');} catch{return fail(401,'Unauthorized');}
  const result=await pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject]);
  if(!result.rows[0])return fail(403,'Account setup required');return result.rows[0].id;
 }
 async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
  const client=await pool.connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }
 async function owned(client:PoolClient,id:string,author:string) {
  const result=await client.query<Row>('SELECT * FROM moments WHERE id=$1 FOR UPDATE',[id]);
  const row=result.rows[0];if(!row||row.author_id!==author)return fail(404,'Moment not found');return row;
 }
 const authorized=`(m.author_id=$2 OR (m.published_at IS NOT NULL AND EXISTS(SELECT 1 FROM friendships f WHERE f.account_low=LEAST(m.author_id,$2::uuid) AND f.account_high=GREATEST(m.author_id,$2::uuid) AND f.status='accepted')))`;
 async function visible(id:string,viewer:string) {
  const result=await pool.query<Row>(`SELECT m.* FROM moments m WHERE m.id=$1 AND ${authorized}`,[id,viewer]);
  if(!result.rows[0])return fail(404,'Moment not found');return result.rows[0];
 }
 async function present(row:Row, frameCache = new Map<string,Promise<FrameState>>()){
  const assets=await pool.query<{side:string;thumbnail_key:string}>('SELECT side,thumbnail_key FROM moment_media WHERE moment_id=$1 ORDER BY side',[row.id]);
  const thumbnails:Record<string,string>={};
  for(const asset of assets.rows)thumbnails[asset.side]=await storage.signRead(asset.thumbnail_key,60);
  if(options.readFrame&&!frameCache.has(row.author_id))frameCache.set(row.author_id,options.readFrame(row.author_id));
  return {id:row.id,authorId:row.author_id,source:row.source,caption:row.caption,eventId:row.event_id,publishedAt:row.published_at?.toISOString()??null,createdAt:row.created_at.toISOString(),location:row.display_lat===null?null:{latitude:row.display_lat,longitude:row.display_lng},thumbnails,...(options.readFrame?{activeFrame:await frameCache.get(row.author_id)}:{})};
 }
 const idParams={type:'object',required:['id'],properties:{id:uuid}};
 const mediaParams={type:'object',required:['id','side'],properties:{id:uuid,side:{type:'string',enum:['front','back']}}};
 app.post<{Body:{source:'capture'|'upload';caption?:string;eventId?:string;location?:{latitude:number;longitude:number}}}>('/v1/moments',{schema:{body:{type:'object',additionalProperties:false,required:['source'],properties:{source:{type:'string',enum:['capture','upload']},caption:{type:'string',maxLength:2000},eventId:uuid,location:{type:'object',additionalProperties:false,required:['latitude','longitude'],properties:{latitude:{type:'number',minimum:-90,maximum:90},longitude:{type:'number',minimum:-180,maximum:180}}}}}}},async(request,reply)=>{
  const author=await account(request);const body=request.body;const location=body.location?displayLocation(body.location.latitude,body.location.longitude):null;
  if(body.caption&&/[\u0000\ud800-\udfff]/u.test(body.caption))return fail(400,'Invalid caption text');
  if(body.eventId&&!(await pool.query('SELECT 1 FROM events WHERE id=$1',[body.eventId])).rowCount)return fail(400,'Invalid event');
  const result=await pool.query<Row>('INSERT INTO moments(author_id,source,caption,event_id,display_lat,display_lng) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[author,body.source,body.caption??'',body.eventId??null,location?.latitude??null,location?.longitude??null]);
  return reply.code(201).send(await present(result.rows[0]!));
 });
 for(const retake of [false,true])app.put<{Params:{id:string;side:string}}>(`/v1/moments/:id/media/:side${retake?'/retake':''}`,{bodyLimit:8*1024*1024,schema:{params:mediaParams}},async request=>{
  const author=await account(request);const keys:string[]=[];const previousKeys:string[]=[];
  try{const result=await transaction(async client=>{
   const row=await owned(client,request.params.id,author);if(row.published_at)return fail(409,'Moment already published');
   const existing=await client.query<{image_key:string;thumbnail_key:string}>('SELECT image_key,thumbnail_key FROM moment_media WHERE moment_id=$1 AND side=$2',[row.id,request.params.side]);
   if(retake&&!existing.rows[0])return fail(404,'Media not found');
   if(!retake&&existing.rows[0])return fail(409,'Side already uploaded');
   if(retake)previousKeys.push(existing.rows[0]!.image_key,existing.rows[0]!.thumbnail_key);
   if(!Buffer.isBuffer(request.body))return fail(400,'Image required');
   const mime=(request.headers['content-type']??'').split(';')[0]!;if(!['image/jpeg','image/png'].includes(mime))return fail(400,'Unsupported image');
   await storage.assertPrivate();
   let image:Image;try{image=await options.processImage(request.body,mime);}catch{return fail(400,'Invalid image');}
   const prefix=`${author}/${row.id}/${randomUUID()}`;const main=`${prefix}.jpg`;const thumb=`${prefix}-thumb.jpg`;
   keys.push(main,thumb);await storage.put(main,image.image,image.contentType);await storage.put(thumb,image.thumbnail,image.contentType);
   if(retake)await client.query('UPDATE moment_media SET image_key=$3,thumbnail_key=$4,sha256=$5,thumbnail_sha256=$6,width=$7,height=$8 WHERE moment_id=$1 AND side=$2',[row.id,request.params.side,main,thumb,image.sha256,image.thumbnailSha256,image.width,image.height]);
   else await client.query('INSERT INTO moment_media(moment_id,side,image_key,thumbnail_key,sha256,thumbnail_sha256,width,height) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[row.id,request.params.side,main,thumb,image.sha256,image.thumbnailSha256,image.width,image.height]);
   return {side:request.params.side,status:'ready'};
  });await compensateUpload(pool,storage,previousKeys);return result;}catch(error){await compensateUpload(pool,storage,keys);throw error;}
 });
 app.post<{Params:{id:string}}>('/v1/moments/:id/publish',{schema:{params:idParams,body:{type:'object',additionalProperties:false,properties:{}}}},async request=>{
  const author=await account(request);
  return transaction(async client=>{
   const row=await owned(client,request.params.id,author);
   if(!row.published_at){
    const media=await client.query<{side:string;sha256:string}>('SELECT side,sha256 FROM moment_media WHERE moment_id=$1 ORDER BY side',[row.id]);
    if(media.rows.length!==2)return fail(409,'Both photos required');
    const salt=randomBytes(32).toString('hex');
    // Offchain snapshot proposal only; not the final smart contract commitment specification.
    const digest=createHash('sha256').update(JSON.stringify({version:'mootz-offchain-pair-v1',salt,front:media.rows.find(m=>m.side==='front')!.sha256,back:media.rows.find(m=>m.side==='back')!.sha256})).digest('hex');
    await client.query("UPDATE moments SET published_at=date_trunc('milliseconds',clock_timestamp()),pair_commitment=$2,commitment_salt=$3 WHERE id=$1",[row.id,digest,salt]);
   }
   return {id:row.id,status:'published'};
  });
 });
 app.get<{Params:{id:string}}>('/v1/moments/:id',{schema:{params:idParams}},async request=>present(await visible(request.params.id,await account(request))));
 app.get<{Params:{id:string;side:string}}>('/v1/moments/:id/media/:side',{schema:{params:mediaParams}},async request=>{
  await visible(request.params.id,await account(request));
  const result=await pool.query<{image_key:string}>('SELECT image_key FROM moment_media WHERE moment_id=$1 AND side=$2',[request.params.id,request.params.side]);
  if(!result.rows[0])return fail(404,'Media not found');return {url:await storage.signRead(result.rows[0].image_key,60),expiresIn:60};
 });
 const querySchema={type:'object',additionalProperties:false,properties:{limit:{type:'string',pattern:'^(?:[1-9]|[1-4][0-9]|50)$',default:'20'},cursor:{type:'string',maxLength:300},filter:{type:'string',enum:['all','friends','events'],default:'all'},eventId:uuid}};
 for(const path of ['/v1/feed','/v1/map'])app.get<{Querystring:{limit:string;cursor?:string;filter:string;eventId?:string}}>(path,{schema:{querystring:querySchema}},async request=>{
  const viewer=await account(request);const {cursor,filter,eventId}=request.query;const limit=Number(request.query.limit);
  let after:{time:string;id:string}|null=null;
  if(cursor){try{const parsed:unknown=JSON.parse(Buffer.from(cursor,'base64url').toString());if(!parsed||typeof parsed!=='object'||!('time'in parsed)||!('id'in parsed)||typeof parsed.time!=='string'||typeof parsed.id!=='string'||!/^\d{4}-\d\d-\d\dT/.test(parsed.time)||!Number.isFinite(Date.parse(parsed.time))||new Date(parsed.time).toISOString()!==parsed.time||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id))throw Error();after={time:parsed.time,id:parsed.id};}catch{return fail(400,'Invalid cursor');}}
  const result=await pool.query<Row>(`SELECT m.* FROM moments m WHERE $1::text IS NULL AND m.published_at IS NOT NULL AND ${authorized} AND ($3::timestamptz IS NULL OR (m.published_at,m.id)<($3::timestamptz,$4::uuid)) AND ($5::uuid IS NULL OR m.event_id=$5) ${path==='/v1/map'?'AND m.display_lat IS NOT NULL':''} ${filter==='events'?'AND m.event_id IS NOT NULL':''} ${filter==='friends'?'AND m.author_id<>$2':''} ORDER BY m.published_at DESC,m.id DESC LIMIT $6`,[null,viewer,after?.time??null,after?.id??null,eventId??null,limit+1]);
  const rows=result.rows.slice(0,limit);const last=rows.at(-1);
  const frameCache=new Map<string,Promise<FrameState>>();
  return {items:await Promise.all(rows.map(row=>present(row,frameCache))),nextCursor:result.rows.length>limit&&last?Buffer.from(JSON.stringify({time:last.published_at!.toISOString(),id:last.id})).toString('base64url'):null};
 });
}
