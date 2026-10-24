import Fastify from 'fastify';
import { it, expect } from 'vitest';
import { registerProfileRoutes } from '../src/profile/routes.ts';
it('resolves the current frame from verified profile identity on every read', async () => {
 const app = Fastify();
 let reads = 0;
 const profile = {id:'verified',recordMeet:true,onboardingCompletedAt:null,wallet:null};
 registerProfileRoutes(app,{verifyToken:async()=>({subject:'verified'}),repository:{getOrCreate:async()=>profile,updatePreferences:async()=>profile,completeOnboarding:async()=>profile},readFrame:async id=>{expect(id).toBe('verified');reads++;return {status:'none',frame:null};}});
 const response=await app.inject({url:'/v1/me',headers:{authorization:'Bearer test-adapter'}});
 expect(response.json().activeFrame).toEqual({status:'none',frame:null});
 await app.inject({url:'/v1/me',headers:{authorization:'Bearer test-adapter'}});
 expect(reads).toBe(2);
 await app.close();
});
it('auth rejects invalid bearer and database errors remain 500', async () => {
 const app = Fastify();
 registerProfileRoutes(app,{ verifyToken: async token => { if(token !== 'test-adapter') throw Error(); return {subject:'a'}; }, repository: {getOrCreate:async()=>{throw Error('db');},updatePreferences:async()=>{throw Error();},completeOnboarding:async()=>{throw Error();}} });
 expect((await app.inject('/v1/me')).statusCode).toBe(401);
 expect((await app.inject({url:'/v1/me',headers:{authorization:'Bearer test-adapter'}})).statusCode).toBe(500);
 await app.close();
});
it('only accepts own-account explicit preferences and onboarding', async () => {
 const app = Fastify({ajv:{customOptions:{removeAdditional:false,coerceTypes:false}}});
 const profile={id:'verified',recordMeet:true,onboardingCompletedAt:null,wallet:null};
 registerProfileRoutes(app,{verifyToken:async()=>({subject:'verified'}),repository:{getOrCreate:async subject=>({...profile,id:subject}),updatePreferences:async(subject,value)=>({...profile,id:subject,recordMeet:value}),completeOnboarding:async subject=>({...profile,id:subject,onboardingCompletedAt:'2026-10-23T00:00:00Z'})}});
 const headers={authorization:'Bearer test-adapter'};
 for(const field of ['accountId','userId','wallet']) expect((await app.inject({method:'PATCH',url:'/v1/me/preferences',headers,payload:{recordMeet:false,[field]:'other'}})).statusCode).toBe(400);
 for(const value of ['false',0,null]) expect((await app.inject({method:'PATCH',url:'/v1/me/preferences',headers,payload:{recordMeet:value}})).statusCode).toBe(400);
 expect((await app.inject({method:'PATCH',url:'/v1/me/preferences',headers,payload:{recordMeet:false}})).json()).toEqual({...profile,recordMeet:false});
 expect((await app.inject({method:'POST',url:'/v1/me/onboarding',headers,payload:{accountId:'other'}})).statusCode).toBe(400);
 expect((await app.inject({method:'POST',url:'/v1/me/onboarding',headers,payload:{}})).json().onboardingCompletedAt).toBeTruthy();
 expect((await app.inject({url:'/v1/me',headers})).json().id).toBe('verified');
 await app.close();
});
