import { expect,it } from 'vitest';
import { displayLocation } from '../src/moments/routes.ts';
it('coarsens location without retaining original coordinates',()=>{
 const point=displayLocation( -6.200123,106.816789);
 expect(point.latitude).not.toBe(-6.200123); expect(point.longitude).not.toBe(106.816789);
 expect(Math.abs(point.latitude+6.200123)).toBeLessThan(.002);
});
it('preserves uploaded files when commit succeeded ambiguously or recheck is unavailable',async()=>{
 const {compensateUpload}=await import('../src/moments/routes.ts');
 let removed=false;const storage={remove:async()=>{removed=true;}};
 await compensateUpload({query:async()=>({rowCount:1})},storage,['durable-main']);expect(removed).toBe(false);
 await compensateUpload({query:async()=>{throw Error('database unavailable');}},storage,['uncertain-main']);expect(removed).toBe(false);
 await compensateUpload({query:async()=>({rowCount:0})},storage,['orphan-main']);expect(removed).toBe(true);
});
