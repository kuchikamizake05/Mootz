import { createPublicClient, defineChain, http, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createDatabase } from '../database.ts';
import { inspectRelayState } from './inspect.ts';

async function main() {
  const rpcUrl = process.env.MEET_RPC_URL?.trim() || process.env.EVENT_COLLECTION_RPC_URL?.trim();
  const privateKey = process.env.RELAYER_PRIVATE_KEY?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!rpcUrl || !privateKey || !databaseUrl || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) throw new Error('Required private configuration is unavailable');
  const parsedRpc = new URL(rpcUrl);
  if (parsedRpc.username || parsedRpc.password || parsedRpc.hash || !(parsedRpc.protocol === 'https:' || (parsedRpc.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsedRpc.hostname)))) throw new Error('Invalid RPC configuration');
  const account = privateKeyToAccount(privateKey as Hex);
  const chain = defineChain({ id: 10143, name: 'Configured Mootz testnet', nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } });
  const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 5000, retryCount: 1 }) });
  if (await client.getChainId() !== 10143) throw new Error('Configured RPC chain is unavailable');
  const database = createDatabase(databaseUrl);
  try {
    const result = await inspectRelayState(database.pool, {
      async accountState(address) {
        const [latestNonce, pendingNonce, balanceWei] = await Promise.all([
          client.getTransactionCount({ address }),
          client.getTransactionCount({ address, blockTag: 'pending' }),
          client.getBalance({ address }),
        ]);
        let finalizedNonce: number | null = null;
        try { finalizedNonce = await client.getTransactionCount({ address, blockTag: 'finalized' }); } catch { /* Provider may not expose a finalized block tag. */ }
        return { latestNonce, pendingNonce, finalizedNonce, balanceWei };
      },
      async receipt(hash) {
        try { return (await client.getTransactionReceipt({ hash })).status === 'success' ? 'success' : 'reverted'; }
        catch (error) { return error instanceof Error && error.name === 'TransactionReceiptNotFoundError' ? 'pending' : 'unavailable'; }
      },
    }, account.address as Address);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally { await database.close(); }
}

main().catch(() => {
  process.stderr.write('Read-only relay inspection unavailable; check private server configuration and database/RPC connectivity\n');
  process.exitCode = 1;
});
