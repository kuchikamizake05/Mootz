import { readFile } from 'node:fs/promises';
import { createPublicClient, defineChain, http, keccak256, stringToHex, type Abi, type Address, type Hex, type PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { claimTypes, collectionDomain, hashClaim, type Claim } from '../protocol/index.js';
import type { CollectionGateway } from '../collections/types.js';

type CollectionClient = Pick<PublicClient, 'getChainId' | 'getBlockNumber' | 'getCode' | 'readContract'>;
type CollectionConfig = { rpcUrl: string; contractAddress: Address; chainId: 10143; issuerPrivateKey?: Hex };
const issuerRole = keccak256(stringToHex('ISSUER_ROLE'));
const nonzeroBytes32 = (value: unknown): value is Hex => typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value) && !/^0x0{64}$/i.test(value);
function unavailable() {
  return Object.assign(new Error('Event collection unavailable'), { statusCode: 503, code: 'CHAIN_UNAVAILABLE' });
}

export async function createCollectionGateway(config: CollectionConfig, client?: CollectionClient): Promise<CollectionGateway> {
  try {
    const domain = collectionDomain(config.chainId, config.contractAddress);
    const abi = JSON.parse(await readFile(new URL('../../abi/EventCollection.json', import.meta.url), 'utf8')) as Abi;
    const chain = defineChain({ id: 10143, name: 'Monad Testnet', nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [config.rpcUrl] } } });
    const rpc = client ?? createPublicClient({ chain, transport: http(config.rpcUrl, { timeout: 5000, retryCount: 1 }) });
    const account = config.issuerPrivateKey === undefined ? null : privateKeyToAccount(config.issuerPrivateKey);
    async function snapshot() {
      if (config.chainId !== 10143 || await rpc.getChainId() !== 10143) throw unavailable();
      const blockNumber = await rpc.getBlockNumber();
      const code = await rpc.getCode({ address: config.contractAddress, blockNumber });
      if (!code || code === '0x') throw unavailable();
      return blockNumber;
    }
    const read = (functionName: string, args: readonly unknown[], blockNumber: bigint) => rpc.readContract({ address: config.contractAddress, abi, functionName, args, blockNumber });
    const initialBlock = await snapshot();
    const probe: Claim = { collectionId: 1n, recipient: '0x2222222222222222222222222222222222222222', issuer: '0x3333333333333333333333333333333333333333', nonce: `0x${'11'.repeat(32)}`, deadline: 1700000000n };
    if (await read('hashClaim', [probe], initialBlock) !== hashClaim(domain, probe)) throw unavailable();
    if (account) {
      const issuerCode = await rpc.getCode({ address: account.address, blockNumber: initialBlock });
      if (issuerCode && issuerCode !== '0x') throw unavailable();
    }
    const gateway: CollectionGateway = {
      domain: { chainId: config.chainId, verifyingContract: config.contractAddress },
      issuerAddress: account?.address ?? null,
      async read(collectionId, recipient) {
        try {
          hashClaim(domain, { ...probe, collectionId, recipient });
          if (collectionId === 0n) throw unavailable();
          const block = await snapshot();
          const [collection, totalSupply, balance, claimed, issuerAuthorized] = await Promise.all([
            read('collections', [collectionId], block), read('totalSupply', [collectionId], block),
            read('balanceOf', [recipient, collectionId], block), read('claimed', [collectionId, recipient], block),
            account ? read('hasRole', [issuerRole, account.address], block) : Promise.resolve(false),
          ]);
          if (!Array.isArray(collection)) throw unavailable();
          const [eventId, cap, metadataURI] = collection as unknown[];
          if (!nonzeroBytes32(eventId) || typeof cap !== 'bigint' || cap <= 0n || typeof metadataURI !== 'string' || metadataURI.length === 0 || typeof totalSupply !== 'bigint' || totalSupply < 0n || totalSupply > cap || typeof balance !== 'bigint' || balance < 0n || balance > 1n || balance > totalSupply || typeof claimed !== 'boolean' || typeof issuerAuthorized !== 'boolean' || claimed !== (balance === 1n)) throw unavailable();
          return { eventId, cap, metadataURI, totalSupply, balance, claimed, issuerAuthorized };
        } catch { throw unavailable(); }
      },
    };
    if (account) gateway.signClaim = async (claim) => {
      try {
        hashClaim(domain, claim);
        if (claim.collectionId === 0n || claim.issuer.toLowerCase() !== account.address.toLowerCase()) throw unavailable();
        const block = await snapshot();
        const [code, authorized] = await Promise.all([
          rpc.getCode({ address: account.address, blockNumber: block }),
          read('hasRole', [issuerRole, account.address], block),
        ]);
        if ((code && code !== '0x') || authorized !== true) throw unavailable();
        return await account.signTypedData({ domain, types: claimTypes, primaryType: 'Claim', message: claim });
      } catch { throw unavailable(); }
    };
    return gateway;
  } catch { throw unavailable(); }
}
