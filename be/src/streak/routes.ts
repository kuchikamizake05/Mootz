import type { FastifyInstance,FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
export function registerStreakRoutes(app:FastifyInstance,options:{pool:Pool;verifyToken:(token:string)=>Promise<{subject:string}>;now?:()=>Date}) {
 const fail=(statusCode:number,message:string):never=>{throw Object.assign(new Error(message),{statusCode});};
 async function account(request:FastifyRequest) {
  const token=/^Bearer ([^\s]+)$/i.exec(request.headers.authorization??'');let subject:string;
  try {if(!token)return fail(401,'Unauthorized');subject=(await options.verifyToken(token[1]!)).subject;if(!subject)return fail(401,'Unauthorized');}catch{return fail(401,'Unauthorized');}
  const row=(await options.pool.query<{id:string}>('SELECT id FROM accounts WHERE provider_subject=$1',[subject])).rows[0];
  if(!row)return fail(403,'Account setup required');return row.id;
 }
 app.get('/v1/me/streak',{schema:{querystring:{type:'object',additionalProperties:false,properties:{}}}},async request=>{
  const id=await account(request);const now=options.now?.();
  const result=await options.pool.query<{currentStreak:number;longestStreak:number;postedToday:boolean;lastPublicationDay:string|null}>(`
   WITH clock AS (SELECT COALESCE($2::timestamptz,statement_timestamp()) AS instant), days AS (
    SELECT DISTINCT (m.published_at AT TIME ZONE 'Asia/Jakarta')::date AS day
    FROM moments m CROSS JOIN clock WHERE m.author_id=$1 AND m.source='capture' AND m.published_at<=clock.instant
     AND EXISTS(SELECT 1 FROM moment_media mm WHERE mm.moment_id=m.id AND mm.side='front')
     AND EXISTS(SELECT 1 FROM moment_media mm WHERE mm.moment_id=m.id AND mm.side='back')
   ), numbered AS (
    SELECT day,day-(row_number() OVER(ORDER BY day))::integer AS island FROM days
   ), runs AS (
    SELECT min(day) AS first_day,max(day) AS last_day,count(*)::integer AS length FROM numbered GROUP BY island
   ), calendar AS (SELECT (instant AT TIME ZONE 'Asia/Jakarta')::date AS today FROM clock)
   SELECT COALESCE((SELECT length FROM runs,calendar WHERE last_day>=today-1 ORDER BY last_day DESC LIMIT 1),0) AS "currentStreak",
    COALESCE((SELECT max(length) FROM runs),0) AS "longestStreak",
    EXISTS(SELECT 1 FROM days,calendar WHERE day=today) AS "postedToday",
    (SELECT to_char(max(day),'YYYY-MM-DD') FROM days) AS "lastPublicationDay"
  `,[id,now?.toISOString()??null]);
  return {...result.rows[0]!,timeZone:'Asia/Jakarta'};
 });
}
