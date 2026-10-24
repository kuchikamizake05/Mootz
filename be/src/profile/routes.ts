import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { FrameState } from '../frames/service.ts';
export interface Profile { id: string; recordMeet: boolean; onboardingCompletedAt: string | null; wallet: string | null }
export interface ProfileRepository {
 getOrCreate(subject: string): Promise<Profile>;
 updatePreferences(subject: string, recordMeet: boolean): Promise<Profile>;
 completeOnboarding(subject: string): Promise<Profile>;
}
export function registerProfileRoutes(app: FastifyInstance, options: { verifyToken: (token: string) => Promise<{subject: string}>; repository: ProfileRepository; readFrame?: (accountId: string) => Promise<FrameState>; readAvatar?: (accountId: string) => Promise<string | null> }) {
 async function identity(request: FastifyRequest) {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
  try {
   if (!match) throw Error();
   const result = await options.verifyToken(match[1]!);
   if (!result.subject) throw Error();
   return result.subject;
  } catch { throw Object.assign(new Error('Unauthorized'), { statusCode: 401 }); }
 }
 app.get('/v1/me', async request => {
  const profile = await options.repository.getOrCreate(await identity(request));
  return { ...profile, ...(options.readAvatar ? { avatarUrl: await options.readAvatar(profile.id) } : {}), ...(options.readFrame ? { activeFrame: await options.readFrame(profile.id) } : {}) };
 });
 app.patch<{Body: {recordMeet: boolean}}>('/v1/me/preferences', { schema: {body: {type:'object',additionalProperties:false,required:['recordMeet'],properties:{recordMeet:{type:'boolean'}}}} }, async request => options.repository.updatePreferences(await identity(request), request.body.recordMeet));
 app.post('/v1/me/onboarding', { schema: {body: {type:'object',additionalProperties:false,properties:{}}} }, async request => options.repository.completeOnboarding(await identity(request)));
}
