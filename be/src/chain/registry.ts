import { readFile } from 'node:fs/promises';
import { createPublicClient, defineChain, http, type Abi, type Address, type PublicClient } from 'viem';
import { hashOffer, meetDomain, RECORD_MEET, type MeetOffer } from '../protocol/index.js';

type RegistryClient = Pick<PublicClient, 'getChainId' | 'getCode' | 'readContract'>;
type RegistryConfig = { rpcUrl: string; registryAddress: Address; chainId: 143 | 10143 };
function unavailable() {
  return Object.assign(new Error('Meet registry unavailable'), { statusCode: 503 });
}

export async function createRegistryAccess(config: RegistryConfig, client?: RegistryClient) {
  const domain = { chainId: config.chainId, verifyingContract: config.registryAddress };
  let publicClient: RegistryClient;
  try {
    const abi = JSON.parse(await readFile(new URL('../../abi/MeetRegistry.json', import.meta.url), 'utf8')) as Abi;
    const chain = defineChain({ id: config.chainId, name: config.chainId === 143 ? 'Monad' : 'Monad Testnet', nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [config.rpcUrl] } } });
    publicClient = client ?? createPublicClient({ chain, transport: http(config.rpcUrl, { timeout: 5000, retryCount: 1 }) });
    if (![143,10143].includes(config.chainId) || await publicClient.getChainId() !== config.chainId) throw unavailable();
    const code = await publicClient.getCode({ address: config.registryAddress });
    if (!code || code === '0x') throw unavailable();
    const read = (functionName: string, args?: readonly unknown[]) => publicClient.readContract({ address: config.registryAddress, abi, functionName, ...(args ? { args } : {}) });
    if (await read('QR_LIFETIME') !== 60n || await read('RELAY_WINDOW') !== 300n) throw unavailable();
    const fixed = `0x${'11'.repeat(32)}` as const;
    const probe: MeetOffer = { action: RECORD_MEET, meetId: fixed, momentId: fixed, photoCommitment: fixed, poster: '0x2222222222222222222222222222222222222222', nonce: fixed, issuedAt: 1700000000n, expiresAt: 1700000060n, eventId: `0x${'00'.repeat(32)}` };
    if (await read('hashOffer', [probe]) !== hashOffer(meetDomain(domain.chainId, domain.verifyingContract), probe)) throw unavailable();
  } catch {
    throw unavailable();
  }
  return {
    domain,
    async assertWallet(address: Address): Promise<void> {
      let code;
      try { code = await publicClient.getCode({ address }); }
      catch { throw unavailable(); }
      if (code && code !== '0x') throw Object.assign(new Error('WALLET_UNSUPPORTED'), { statusCode: 403, code: 'WALLET_UNSUPPORTED' });
    },
  };
}
