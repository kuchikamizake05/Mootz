import { privateKeyToAccount } from 'viem/accounts';
import type { Hex } from 'viem';
import { loadConfig } from '../config.js';

export function loadClaimRelayConfig(env: NodeJS.ProcessEnv) {
  if (env.CLAIM_RELAYER_ENABLED !== 'true') throw new Error('Claim relayer disabled');
  const config = loadConfig(env);
  const privateKey = env.RELAYER_PRIVATE_KEY?.trim();
  try {
    if (!config.collection || !privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw Error();
    const account = privateKeyToAccount(privateKey as Hex);
    if (config.collection.issuerPrivateKey && account.address === privateKeyToAccount(config.collection.issuerPrivateKey).address) throw Error();
  } catch { throw new Error('Claim relayer requires a verified collection and dedicated server key'); }
  return { config, privateKey: privateKey as Hex };
}
