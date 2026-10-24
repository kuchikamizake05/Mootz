import { readFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, defineChain, http, type Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { loadClaimRelayConfig } from './config.js';
import { createDatabase } from '../database.js';
import { createCollectionGateway } from '../chain/collection.js';
import { loadFeePolicy } from '../chain/fees.js';
import { createViemClaimTransport } from './viem.js';
import { processClaimOutbox } from './worker.js';

async function main() {
  const { config, privateKey } = loadClaimRelayConfig(process.env);
  const collection = config.collection!;
  const chain = defineChain({ id: collection.chainId, name: 'Configured Mootz Monad', nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [collection.rpcUrl] } } });
  const transport = http(collection.rpcUrl, { timeout: 5000, retryCount: 1 });
  const publicClient = createPublicClient({ chain, transport });
  await createCollectionGateway({ rpcUrl: collection.rpcUrl, contractAddress: collection.contractAddress, chainId: collection.chainId }, publicClient);
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ chain, transport, account });
  const abi = JSON.parse(await readFile(new URL('../../abi/EventCollection.json', import.meta.url), 'utf8')) as Abi;
  const feePolicy = loadFeePolicy(process.env, 'CLAIM_RELAY');
  const database = createDatabase(config.databaseUrl);
  try {
    const result = await processClaimOutbox(database.pool, createViemClaimTransport({ publicClient, walletClient, account, abi, chainId: collection.chainId, verifyingContract: collection.contractAddress, feePolicy }), { chainId: collection.chainId });
    process.stdout.write(JSON.stringify(result) + '\n');
  } finally { await database.close(); }
}
main().catch(() => {
  process.stderr.write('Claim relayer unavailable or disabled; inspect private server configuration and deployment\n');
  process.exitCode = 1;
});
