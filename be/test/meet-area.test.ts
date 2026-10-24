import { expect,it } from 'vitest';
import { assessMeetLocation,meetAreaCenter } from '../src/meet/location-policy.ts';
it('uses a generalized meeting-area center rather than a photo coordinate',()=>{
 const now=Date.parse('2026-10-23T10:00:00Z');
 const sample={latitude:-6.200123,longitude:106.816789,accuracyMeters:10,capturedAtMs:now};
 const result=assessMeetLocation(sample,sample,now);const center=meetAreaCenter(result.areaKey);
 expect(center.latitude).not.toBe(sample.latitude);expect(center.longitude).not.toBe(sample.longitude);
 expect(Math.abs(center.latitude-sample.latitude)).toBeLessThan(.002);
 expect(assessMeetLocation({...sample,...center},{...sample,...center},now).areaKey).toBe(result.areaKey);
 for(const key of ['bad','meet-area-v1:-1:0','meet-area-v1:1000000000:0','meet-area-v1:1:999999999'])expect(()=>meetAreaCenter(key)).toThrow();
});
