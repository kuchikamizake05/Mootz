import { privateKeyToAccount } from 'viem/accounts';
export interface Config {
  port: number;
  host: string;
  databaseUrl: string;
  origins: string[];
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  privy: { appId: string; verificationKey: string } | undefined;
  walletDomain: string;
  walletChainId: number;
  storage: { url: string; secretKey: string; bucket: string } | undefined;
  meet: { rpcUrl: string; registryAddress: `0x${string}`; chainId: 143 | 10143 } | undefined;
  collection: { rpcUrl: string; contractAddress: `0x${string}`; chainId: 143 | 10143; issuerPrivateKey?: `0x${string}` } | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const databaseUrl = env.DATABASE_URL;
  try {
    const parsed = new URL(databaseUrl ?? '');
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error();
  } catch { throw new Error('DATABASE_URL must be a PostgreSQL URL'); }
  const origins = [...new Set((env.ALLOWED_ORIGINS ?? '').split(',').map(origin => origin.trim()))];
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error();
    } catch { throw new Error('ALLOWED_ORIGINS must contain explicit HTTP origins'); }
  }
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
  if (!['development', 'test', 'production'].includes(env.NODE_ENV ?? 'development')) throw new Error('Invalid NODE_ENV');
  const logLevel = env.LOG_LEVEL ?? 'info';
  if (!['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'].includes(logLevel)) throw new Error('Invalid LOG_LEVEL');
  const appId = env.PRIVY_APP_ID?.trim();
  const verificationKey = env.PRIVY_VERIFICATION_KEY?.replace(/\\n/g, '\n').trim();
  if (Boolean(appId) !== Boolean(verificationKey)) throw new Error('Set PRIVY_APP_ID and PRIVY_VERIFICATION_KEY together');
  const privy = appId && verificationKey ? { appId, verificationKey } : undefined;
  const walletDomain = env.WALLET_PROOF_DOMAIN ?? 'localhost:3001';
  if (!/^[a-zA-Z0-9.-]+(?::\d+)?$/.test(walletDomain)) throw new Error('Invalid WALLET_PROOF_DOMAIN');
  const walletChainId = Number(env.WALLET_CHAIN_ID ?? 10143);
  if (!Number.isSafeInteger(walletChainId) || walletChainId <= 0) throw new Error('Invalid WALLET_CHAIN_ID');
  const storageUrl = env.SUPABASE_URL?.trim();
  const secretKey = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (Boolean(storageUrl) !== Boolean(secretKey)) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY together');
  let storage: Config['storage'];
  if (storageUrl && secretKey) {
    try {
      const parsed = new URL(storageUrl);
      if (parsed.protocol !== 'https:' || parsed.origin !== storageUrl || parsed.username || parsed.password) throw new Error();
    } catch { throw new Error('SUPABASE_URL must be an HTTPS origin'); }
    if (secretKey.startsWith('sb_publishable_')) throw new Error('Supabase storage requires a server secret key');
    if (env.SUPABASE_SECRET_KEY && env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SECRET_KEY !== env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Set only one Supabase server key');
    const bucket = env.SUPABASE_STORAGE_BUCKET || 'mootz-private-media';
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucket)) throw new Error('Invalid SUPABASE_STORAGE_BUCKET');
    storage = { url: storageUrl, secretKey, bucket };
  }
  const rpcUrl=env.MEET_RPC_URL?.trim();const registryAddress=env.MEET_REGISTRY_ADDRESS?.trim();
  if(Boolean(rpcUrl)!==Boolean(registryAddress))throw new Error('Set MEET_RPC_URL and MEET_REGISTRY_ADDRESS together');
  let meet:Config['meet'];
  if(rpcUrl&&registryAddress){
    try{const url=new URL(rpcUrl);if(url.username||url.password||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw Error();}catch{throw new Error('Invalid Meet RPC URL');}
    if(!/^0x[0-9a-fA-F]{40}$/.test(registryAddress)||/^0x0{40}$/i.test(registryAddress)||![143,10143].includes(walletChainId))throw new Error('Invalid Meet registry or chain');
    meet={rpcUrl,registryAddress:registryAddress as `0x${string}`,chainId:walletChainId as 143 | 10143};
  }
  const collectionRpc = env.EVENT_COLLECTION_RPC_URL?.trim();
  const collectionAddress = env.EVENT_COLLECTION_ADDRESS?.trim();
  const issuerPrivateKey = env.EVENT_CLAIM_ISSUER_PRIVATE_KEY?.trim();
  if (Boolean(collectionRpc) !== Boolean(collectionAddress) || (issuerPrivateKey && !collectionRpc)) throw new Error('Set Event collection RPC and address together');
  let collection: Config['collection'];
  if (collectionRpc && collectionAddress) {
    try {
      const url = new URL(collectionRpc);
      if (url.username || url.password || url.hash || !(url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname)))) throw Error();
      if (!/^0x[0-9a-fA-F]{40}$/.test(collectionAddress) || /^0x0{40}$/i.test(collectionAddress) || ![143,10143].includes(walletChainId)) throw Error();
      if (issuerPrivateKey) {
        if (!/^0x[0-9a-fA-F]{64}$/.test(issuerPrivateKey)) throw Error();
        privateKeyToAccount(issuerPrivateKey as `0x${string}`);
      }
    } catch { throw new Error('Invalid Event collection configuration'); }
    collection = { rpcUrl: collectionRpc, contractAddress: collectionAddress as `0x${string}`, chainId: walletChainId as 143 | 10143, ...(issuerPrivateKey ? { issuerPrivateKey: issuerPrivateKey as `0x${string}` } : {}) };
  }
  return { port, host: env.HOST ?? '127.0.0.1', databaseUrl: databaseUrl!, origins, logLevel: logLevel as Config['logLevel'], privy, walletDomain, walletChainId, storage,meet,collection };
}
