import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import type { Database } from './database.ts';
import { registerProfileRoutes } from './profile/routes.ts';
import { registerWalletRoutes } from './wallet/routes.ts';
import { registerMomentRoutes } from './moments/routes.ts';
import { registerFriendRoutes } from './friends/routes.ts';
import { registerStreakRoutes } from './streak/routes.ts';
import { registerCommentRoutes } from './comments/routes.ts';
import { registerEventRoutes } from './events/routes.ts';
import { registerReactionRoutes } from './reactions/routes.ts';
import { registerMeetRoutes } from './meet/routes.ts';
import { registerDotRoutes } from './dots/routes.ts';
import { registerCollectionRoutes } from './collections/routes.ts';
import { registerEquipRoutes } from './collections/equip.ts';
import { registerClaimSubmissionRoutes } from './claim-relay/routes.ts';
import { registerFrameRoutes } from './frames/routes.ts';
import { registerPresenceRoutes } from './presence/routes.ts';
import { registerAvatarRoutes } from './profile/avatar.ts';

export interface AppOptions {
  origins: string[];
  database: Database;
  logger?: false | { level: string };
  profile?: Parameters<typeof registerProfileRoutes>[1];
  wallet?: Parameters<typeof registerWalletRoutes>[1];
  moments?: Parameters<typeof registerMomentRoutes>[1];
  friends?: Parameters<typeof registerFriendRoutes>[1];
  streak?: Parameters<typeof registerStreakRoutes>[1];
  comments?: Parameters<typeof registerCommentRoutes>[1];
  events?: Parameters<typeof registerEventRoutes>[1];
  reactions?: Parameters<typeof registerReactionRoutes>[1];
  meets?: Parameters<typeof registerMeetRoutes>[1];
  dots?: Parameters<typeof registerDotRoutes>[1];
  collections?: Parameters<typeof registerCollectionRoutes>[1];
  equips?: Parameters<typeof registerEquipRoutes>[1];
  claimSubmissions?: Parameters<typeof registerClaimSubmissionRoutes>[1];
  frames?: Parameters<typeof registerFrameRoutes>[1];
  presence?: Parameters<typeof registerPresenceRoutes>[1];
  avatars?: Parameters<typeof registerAvatarRoutes>[1];
  storageReadiness?: () => Promise<void>;
}

export function createApp(options: AppOptions) {
  const app = Fastify({
    logger: options.logger === false ? false : {
      level: options.logger?.level ?? 'info',
      serializers: { req: req => ({ method: req.method }), res: res => ({ statusCode: res.statusCode }) },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    bodyLimit: 64 * 1024,
    requestTimeout: 15_000,
    connectionTimeout: 10_000,
    trustProxy: false,
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
  });
  const failure = (code: string, requestId: string) => ({ error: { code, requestId } });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
    reply.header('cache-control', 'no-store');
    if (request.headers.origin && !options.origins.includes(request.headers.origin)) {
      return reply.code(403).send(failure('ORIGIN_NOT_ALLOWED', request.id));
    }
  });
  app.register(cors, {
    origin: options.origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['authorization', 'content-type'],
    exposedHeaders: ['x-request-id'],
    credentials: false,
  });
  app.setNotFoundHandler((request, reply) => reply.code(404).send(failure('NOT_FOUND', request.id)));
  app.setErrorHandler((error, request, reply) => {
    const candidate = error instanceof Error && 'statusCode' in error ? error.statusCode : undefined;
    const status = typeof candidate === 'number' && ((candidate >= 400 && candidate < 500) || candidate === 503) ? candidate : 500;
    // Driver errors may embed credentials or query values. Log classification only.
    request.log.error({ statusCode: status }, 'Request failed');
    const publicMeetCodes=new Set(['INVALID_SIGNATURE','INVALID_LOCATION','LOCATION_ACCURACY','LOCATION_STALE','MEET_DISTANCE','MEET_USED','MEET_AREA_USED','MEET_DAILY_LIMIT','CONSENT_CHANGED','MEET_EXPIRED','WALLET_REQUIRED','WALLET_UNSUPPORTED','CHECK_IN_REQUIRED','EVENT_INELIGIBLE','DOMAIN_CHANGED','MOMENT_INELIGIBLE','OFFER_UNSIGNED','SELF_MEET','SERVER_DAY_CHANGED','SIGNATURE_CONFLICT','WALLET_CHANGED','INVALID_USERNAME','USERNAME_TAKEN']);
    const collectionCodes = new Set(['ALREADY_OWNED','SOLD_OUT','CLAIM_CLOSED','CLAIM_NOT_OPEN','CLAIM_PENDING','CLAIM_EXPIRED','CLAIM_REQUEST_CONFLICT','COLLECTION_NOT_OWNED','VERIFIED_WALLET_REQUIRED','ACCOUNT_REQUIRED','COLLECTION_NOT_FOUND','INVALID_CLAIM','FRAME_LOCKED']);
    const dependencyCodes = new Set(['CHAIN_UNAVAILABLE','COLLECTION_UNAVAILABLE','COLLECTION_MAPPING_INVALID']);
    const detail=error instanceof Error&&'code'in error&&typeof error.code==='string'&&(((publicMeetCodes.has(error.code)||collectionCodes.has(error.code))&&status>=400&&status<500)||(status===503&&dependencyCodes.has(error.code)))?error.code:undefined;
    const code = detail??(status === 500 ? 'INTERNAL_ERROR' : status === 503 ? 'DEPENDENCY_UNAVAILABLE' : status === 401 ? 'UNAUTHORIZED' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : status === 429 ? 'RATE_LIMITED' : 'INVALID_REQUEST');
    reply.code(status).send(failure(code, request.id));
  });
  app.get('/health', async () => ({ status: 'ok' }));
  if (options.avatars) registerAvatarRoutes(app, options.avatars);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('MEDIA_UNAVAILABLE', request.id));
    app.put('/v1/me/avatar', unavailable);
    app.delete('/v1/me/avatar', unavailable);
  }
  if (options.presence) registerPresenceRoutes(app, options.presence);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('AUTH_UNAVAILABLE', request.id));
    app.get('/v1/me/location-sharing', unavailable);
    app.put('/v1/me/location-sharing', unavailable);
    app.put('/v1/me/location', unavailable);
    app.delete('/v1/me/location', unavailable);
    app.get('/v1/friends/locations', unavailable);
  }
  if (options.profile) registerProfileRoutes(app, options.profile);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('AUTH_UNAVAILABLE', request.id));
    app.get('/v1/me', unavailable);
    app.patch('/v1/me/preferences', unavailable);
    app.post('/v1/me/onboarding', unavailable);
  }
  if (options.wallet) registerWalletRoutes(app, options.wallet);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('AUTH_UNAVAILABLE', request.id));
    app.post('/v1/me/wallet-challenges', unavailable);
    app.post('/v1/me/wallet-bindings', unavailable);
  }
  if (options.friends) registerFriendRoutes(app, options.friends);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('AUTH_UNAVAILABLE', request.id));
    app.get('/v1/friends', unavailable);
    app.post('/v1/friends/requests', unavailable);
    app.post('/v1/friends/:accountId/accept', unavailable);
    app.delete('/v1/friends/:accountId', unavailable);
  }
  if (options.streak) registerStreakRoutes(app, options.streak);
  else app.get('/v1/me/streak', async (request, reply) => reply.code(503).send(failure('AUTH_UNAVAILABLE', request.id)));
  if (options.comments) registerCommentRoutes(app, options.comments);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('AUTH_UNAVAILABLE', request.id));
    app.get('/v1/moments/:id/comments', unavailable);
    app.post('/v1/moments/:id/comments', unavailable);
    app.delete('/v1/moments/:id/comments/:commentId', unavailable);
  }
  if (options.events) registerEventRoutes(app, options.events);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('AUTH_UNAVAILABLE', request.id));
    app.get('/v1/events', unavailable);
    app.get('/v1/events/:id', unavailable);
    app.get('/v1/events/:id/check-in', unavailable);
    app.post('/v1/events/:id/check-ins', unavailable);
  }
  if (options.moments) registerMomentRoutes(app, options.moments);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('MEDIA_UNAVAILABLE', request.id));
    app.all('/v1/moments', unavailable);
    app.all('/v1/moments/*', unavailable);
    app.get('/v1/feed', unavailable);
    app.get('/v1/map', unavailable);
  }
  if (options.reactions) registerReactionRoutes(app, options.reactions);
  else {
    const unavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('MEDIA_UNAVAILABLE', request.id));
    app.get('/v1/me/selfies', unavailable);
    app.post('/v1/me/selfies', unavailable);
    app.delete('/v1/me/selfies/:selfieId', unavailable);
    app.put('/v1/moments/:id/reaction', unavailable);
    app.delete('/v1/moments/:id/reaction', unavailable);
    app.get('/v1/moments/:id/reactions', unavailable);
  }
  if(options.meets)registerMeetRoutes(app,options.meets);
  else{
    const unavailable=async(request:import('fastify').FastifyRequest,reply:import('fastify').FastifyReply)=>reply.code(503).send(failure('MEET_UNAVAILABLE',request.id));
    app.all('/v1/meet/offers',unavailable);app.all('/v1/meet/offers/*',unavailable);app.all('/v1/meets/:id',unavailable);
  }
  if(options.dots)registerDotRoutes(app,options.dots);
  else{
    const unavailable=async(request:import('fastify').FastifyRequest,reply:import('fastify').FastifyReply)=>reply.code(503).send(failure('AUTH_UNAVAILABLE',request.id));
    app.get('/v1/dots',unavailable);app.get('/v1/dots/:id',unavailable);app.put('/v1/dots/:id/visibility',unavailable);app.get('/v1/me/dots/summary',unavailable);
  }
  const collectionUnavailable = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => reply.code(503).send(failure('COLLECTION_UNAVAILABLE', request.id));
  if (options.collections) registerCollectionRoutes(app, options.collections);
  else {
    app.get('/v1/events/:id/collection', collectionUnavailable);
    app.post('/v1/events/:id/claim-authorizations', collectionUnavailable);
  }
  if (options.equips) registerEquipRoutes(app, options.equips);
  else {
    app.get('/v1/me/equipped-collection', collectionUnavailable);
    app.put('/v1/me/equipped-collection', collectionUnavailable);
    app.delete('/v1/me/equipped-collection', collectionUnavailable);
  }
  if (options.claimSubmissions) registerClaimSubmissionRoutes(app, options.claimSubmissions);
  else {
    app.post('/v1/events/:id/claims', collectionUnavailable);
    app.get('/v1/events/:id/claims/:claimId', collectionUnavailable);
  }
  if(options.frames)registerFrameRoutes(app,options.frames);
  else {
    const unavailable=async(request:import('fastify').FastifyRequest,reply:import('fastify').FastifyReply)=>reply.code(503).send(failure('AUTH_UNAVAILABLE',request.id));
    app.get('/v1/me/frames',unavailable);app.all('/v1/me/frame',unavailable);
  }
  app.get('/ready/storage', async (request, reply) => {
    try {
      if (!options.storageReadiness) throw new Error();
      await options.storageReadiness();
      return { status: 'ready' };
    } catch { return reply.code(503).send(failure('DEPENDENCY_UNAVAILABLE', request.id)); }
  });
  app.get('/ready', async (request, reply) => {
    try {
      await options.database.probe();
      return { status: 'ready' };
    } catch {
      return reply.code(503).send(failure('DEPENDENCY_UNAVAILABLE', request.id));
    }
  });
  app.addHook('onClose', async () => { await options.database.close(); });
  return app;
}
