import { loadConfig } from './config.ts';
import { createDatabase } from './database.ts';
import { createApp } from './app.ts';
import { createTokenVerifier } from './auth/token.ts';
import { createProfileRepository } from './profile/repository.ts';
import { createSupabaseMediaStorage } from './media/storage.ts';
import { processImage } from './media/image.ts';
import { createRegistryAccess } from './chain/registry.ts';
import { purgeExpiredOfferLocations } from './meet/routes.ts';
import { createCollectionGateway } from './chain/collection.ts';
import { readFrame } from './frames/service.ts';
import { purgeExpiredFriendLocations } from './presence/routes.ts';
import { readAvatarUrl } from './profile/avatar.ts';

async function main() {
  const config = loadConfig(process.env);
  const verifier = config.privy ? await createTokenVerifier(config.privy) : undefined;
  const storage = config.storage ? createSupabaseMediaStorage(config.storage) : undefined;
  const registry=config.meet?await createRegistryAccess(config.meet):undefined;
  const collection = config.collection ? await createCollectionGateway(config.collection) : undefined;
  const database = createDatabase(config.databaseUrl);
  const currentFrame=(accountId:string)=>readFrame(database.pool,accountId,collection);
  const app = createApp({ origins: config.origins, database, logger: { level: config.logLevel },
    ...(storage ? { storageReadiness: () => storage.assertPrivate() } : {}),
    ...(verifier && collection ? {
      collections: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, gateway: collection },
    } : {}),
    ...(verifier && storage ? { moments: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, storage, processImage, readFrame:currentFrame } } : {}),
    ...(verifier && storage ? { reactions: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, storage, processImage } } : {}),
    ...(verifier&&storage&&registry?{meets:{verifyToken:(token:string)=>verifier.verify(token),pool:database.pool,domain:registry.domain,storage,assertWallet:registry.assertWallet}}:{}),
    ...(verifier ? {
      ...(storage ? { avatars: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, storage, processImage } } : {}),
      presence: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, ...(storage ? { avatarStorage: storage } : {}) },
      profile: { verifyToken: (token: string) => verifier.verify(token), repository: createProfileRepository(database.pool, config.walletChainId), readFrame:currentFrame, ...(storage ? { readAvatar: (id: string) => readAvatarUrl(database.pool, storage, id) } : {}) },
      frames: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, ...(collection ? { gateway:collection } : {}) },
      wallet: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, domain: config.walletDomain, chainId: config.walletChainId },
      friends: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool },
      streak: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool },
      comments: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool },
      events: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool },
      equips: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, ...(collection ? { gateway: collection } : {}) },
      claimSubmissions: { verifyToken: (token: string) => verifier.verify(token), pool: database.pool, ...(collection ? { gateway: collection } : {}) },
      dots: { verifyToken: (token:string)=>verifier.verify(token),pool:database.pool },
    } : {}),
  });
  const purge=()=>Promise.all([purgeExpiredOfferLocations(database.pool),purgeExpiredFriendLocations(database.pool)]).catch(()=>{process.stderr.write('Location cleanup unavailable\n');});
  let cleanup:ReturnType<typeof setInterval>|undefined;
  app.addHook('onReady',async()=>{await purge();cleanup=setInterval(()=>{void purge();},15000);cleanup.unref();});
  app.addHook('onClose',async()=>{if(cleanup)clearInterval(cleanup);});
  let closing = false;
  async function shutdown() {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 10_000);
    deadline.unref();
    try { await app.close(); } catch { process.exitCode = 1; }
    finally { clearTimeout(deadline); }
  }
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
  try { await app.listen({ port: config.port, host: config.host }); }
  catch { await shutdown(); throw new Error('Backend failed to listen'); }
}

main().catch(() => {
  process.stderr.write('Backend startup failed; check server configuration\n');
  process.exitCode = 1;
});
