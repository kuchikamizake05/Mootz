import { describe, expect, it, vi } from 'vitest';
import { TransactionReceiptNotFoundError, type Address, type Hex, type PublicClient } from 'viem';
import { createViemChainReadAdapter } from '../src/chain-sync/viem.ts';

const contract = '0x1111111111111111111111111111111111111111' as Address;
const otherContract = '0x2222222222222222222222222222222222222222' as Address;
const txHash = `0x${'a'.repeat(64)}` as Hex;
const blockHash = `0x${'b'.repeat(64)}` as Hex;
const topic = `0x${'c'.repeat(64)}` as Hex;

function fixture() {
  const client = {
    getChainId: vi.fn(async () => 10143),
    getBlockNumber: vi.fn(async () => 42n),
    getBlock: vi.fn(async () => ({ number: 40n, hash: blockHash })),
    getLogs: vi.fn(async () => []),
    getTransactionReceipt: vi.fn(async () => ({
      transactionHash: txHash, status: 'success' as const, blockNumber: 40n, blockHash,
      to: contract, from: otherContract, logs: [],
    })),
  };
  return { client, adapter: createViemChainReadAdapter(client as unknown as PublicClient, [contract]) };
}

describe('viem chain read adapter', () => {
  it('reads the head and rejects an RPC that is serving the wrong chain', async () => {
    const f = fixture();
    await expect(f.adapter.getHead()).resolves.toBe(42n);
    f.client.getChainId.mockResolvedValue(1);
    await expect(f.adapter.getHead()).rejects.toThrow('Chain sync provider unavailable');
    expect(f.client.getBlockNumber).toHaveBeenCalledTimes(1);
  });

  it('treats unsupported, failed, or malformed finalized block responses as unavailable', async () => {
    const f = fixture();
    f.client.getBlock.mockRejectedValueOnce(new Error('finalized tag unsupported'));
    await expect(f.adapter.getFinalizedBlock()).resolves.toBeNull();
    f.client.getBlock.mockResolvedValueOnce({ number: undefined, hash: undefined } as never);
    await expect(f.adapter.getFinalizedBlock()).resolves.toBeNull();
    f.client.getBlock.mockResolvedValueOnce({ number: -1n, hash: blockHash } as never);
    await expect(f.adapter.getFinalizedBlock()).resolves.toBeNull();
  });

  it('returns a canonical block only when the RPC responds for the requested height with a valid hash', async () => {
    const f = fixture();
    f.client.getBlock.mockResolvedValueOnce({ number: 40n, hash: blockHash });
    await expect(f.adapter.getBlock(40n)).resolves.toEqual({ number: 40n, hash: blockHash });
    f.client.getBlock.mockResolvedValueOnce({ number: 39n, hash: blockHash });
    await expect(f.adapter.getBlock(40n)).resolves.toBeNull();
    f.client.getBlock.mockResolvedValueOnce({ number: 40n, hash: '0x1234' } as never);
    await expect(f.adapter.getBlock(40n)).resolves.toBeNull();
  });

  it('allows only configured contract addresses for log reads', async () => {
    const f = fixture();
    await expect(f.adapter.getLogs({ address: otherContract, fromBlock: 10n, toBlock: 20n, eventName: 'MeetRecorded' }))
      .rejects.toThrow('Chain sync provider unavailable');
    expect(f.client.getLogs).not.toHaveBeenCalled();
  });

  it('passes an event-specific bounded log filter through to the configured contract', async () => {
    const f = fixture();
    const log = { address: contract, transactionHash: txHash, logIndex: 1, blockNumber: 12n, blockHash, data: '0x' as Hex, topics: [topic] };
    f.client.getLogs.mockResolvedValue([log] as never);
    await expect(f.adapter.getLogs({ address: contract, fromBlock: 10n, toBlock: 20n, eventName: 'CollectionClaimed' })).resolves.toEqual([log]);
    expect(f.client.getLogs).toHaveBeenCalledWith(expect.objectContaining({
      address: contract, fromBlock: 10n, toBlock: 20n,
      event: expect.objectContaining({ name: 'CollectionClaimed' }),
    }));
  });

  it('returns exact receipt fields and maps receipt absence to null', async () => {
    const f = fixture();
    const receipt = { transactionHash: txHash, status: 'success', blockNumber: 40n, blockHash, to: contract, from: otherContract, logs: [] };
    f.client.getTransactionReceipt.mockResolvedValue(receipt as never);
    await expect(f.adapter.getReceipt(txHash)).resolves.toEqual(receipt);
    expect(f.client.getTransactionReceipt).toHaveBeenCalledWith({ hash: txHash });
    f.client.getTransactionReceipt.mockRejectedValueOnce(new TransactionReceiptNotFoundError({ hash: txHash }));
    await expect(f.adapter.getReceipt(txHash)).resolves.toBeNull();
  });

  it('sanitizes provider failures without returning private RPC details', async () => {
    const f = fixture();
    f.client.getBlockNumber.mockRejectedValue(new Error('request failed: https://secret-rpc.example/token-123'));
    await expect(f.adapter.getHead()).rejects.toThrow('Chain sync provider unavailable');
    await expect(f.adapter.getHead()).rejects.not.toThrow('secret-rpc.example');
    f.client.getTransactionReceipt.mockRejectedValue(new Error('request failed: https://secret-rpc.example/token-123'));
    await expect(f.adapter.getReceipt(txHash)).rejects.toThrow('Chain sync provider unavailable');
    await expect(f.adapter.getReceipt(txHash)).rejects.not.toThrow('token-123');
  });
});

it('mainnet read adapter refuses a testnet RPC', async () => {
 const f=fixture();const adapter=createViemChainReadAdapter(f.client as unknown as PublicClient,[contract],143);
 await expect(adapter.getHead()).rejects.toThrow('Chain sync provider unavailable');
 f.client.getChainId.mockResolvedValue(143);
 await expect(adapter.getHead()).resolves.toBe(42n);
});
