import sharp from 'sharp';
import {createHash} from 'node:crypto';
export class MediaValidationError extends Error {
 readonly statusCode=400;
 constructor(){super('Invalid image');this.name='MediaValidationError';}
}
export async function processImage(bytes:Buffer,declaredMime:string):Promise<{image:Buffer;thumbnail:Buffer;width:number;height:number;sha256:string;thumbnailSha256:string;contentType:'image/jpeg'}>{
 try {
  if(bytes.length===0||bytes.length>8*1024*1024||!['image/jpeg','image/png'].includes(declaredMime))throw new MediaValidationError();
  const options={limitInputPixels:25_000_000,failOn:'warning' as const};
  const metadata=await sharp(bytes,options).metadata();
  if(metadata.format!==(declaredMime==='image/jpeg'?'jpeg':'png')||(metadata.pages??1)!==1)throw new MediaValidationError();
  const result=await sharp(bytes,options).rotate().flatten({background:'#ffffff'}).resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer({resolveWithObject:true});
  const thumbnail=await sharp(result.data,options).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
  if(result.data.length>8*1024*1024||thumbnail.length>8*1024*1024)throw new MediaValidationError();
  return {image:result.data,thumbnail,width:result.info.width,height:result.info.height,sha256:createHash('sha256').update(result.data).digest('hex'),thumbnailSha256:createHash('sha256').update(thumbnail).digest('hex'),contentType:'image/jpeg'};
 }catch{throw new MediaValidationError();}
}
