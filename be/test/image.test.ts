import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
import {processImage} from '../src/media/image.ts';
it('decodes synthetic images, removes metadata and hashes exact stored bytes',async()=>{
 const input=await sharp({create:{width:2400,height:1200,channels:4,background:'#8844aa80'}}).png().withMetadata().toBuffer();
 const out=await processImage(input,'image/png');
 expect(out.width).toBe(2048);expect(out.height).toBe(1024);
 expect(out.sha256).toBe(createHash('sha256').update(out.image).digest('hex'));
 expect(out.thumbnailSha256).toBe(createHash('sha256').update(out.thumbnail).digest('hex'));
 const metadata=await sharp(out.image).metadata();
 expect(metadata.format).toBe('jpeg');expect(metadata.exif).toBeUndefined();expect(metadata.icc).toBeUndefined();
 expect((await sharp(out.thumbnail).metadata()).width).toBe(320);
});
it('rejects malformed, oversized, unsupported and mismatched declared media',async()=>{
 const png=await sharp({create:{width:10,height:10,channels:3,background:'white'}}).png().toBuffer();
 for(const [bytes,mime] of [[png,'image/jpeg'],[Buffer.from('malformed'),'image/png'],[Buffer.alloc(8*1024*1024+1),'image/jpeg'],[Buffer.from('<svg width="10" height="10"></svg>'),'image/svg+xml']] as const){
 await expect(processImage(bytes,mime)).rejects.toMatchObject({statusCode:400});
 }
});
it('rejects decoded pixel bombs and unsupported decoded formats',async()=>{
 const huge=await sharp({create:{width:5001,height:5000,channels:3,background:'white'}}).png().toBuffer();
 await expect(processImage(huge,'image/png')).rejects.toMatchObject({statusCode:400});
 const gif=await sharp({create:{width:10,height:10,channels:3,background:'white'}}).gif().toBuffer();
 await expect(processImage(gif,'image/png')).rejects.toMatchObject({statusCode:400});
});
it('applies orientation before reporting dimensions',async()=>{
 const jpeg=await sharp({create:{width:30,height:10,channels:3,background:'white'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const out=await processImage(jpeg,'image/jpeg');
 expect(out.width).toBe(10);expect(out.height).toBe(30);
 expect((await sharp(out.image).metadata()).exif).toBeUndefined();
});
