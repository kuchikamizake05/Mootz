import { describe, expect, it, vi } from 'vitest';
import type { Address, Hex, PublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createCollectionGateway } from '../src/chain/collection.ts';
import { collectionDomain, hashClaim, recoverClaim, type Claim } from '../src/protocol/index.ts';
const contract = '0x1111111111111111111111111111111111111111' as Address;
const recipient = '0x2222222222222222222222222222222222222222' as Address;
const key = `0x${'01'.repeat(32)}` as Hex;
const issuer = privateKeyToAccount(key).address;
const config = { rpcUrl: 'https://rpc.invalid/private', contractAddress: contract, chainId: 10143 as const };
function fixture() {
  return {
    getChainId: vi.fn(async () => 10143),
    getBlockNumber: vi.fn(async () => 120n),
    getCode: vi.fn(async ({ address }: { address: Address }): Promise<Hex> => address === contract ? '0x6000' : '0x'),
    readContract: vi.fn(async ({ functionName, args }: { functionName: string; args?: readonly unknown[] }): Promise<unknown> => {
      if (functionName === 'hashClaim') return hashClaim(collectionDomain(10143, contract), args![0] as Claim);
      if (functionName === 'collections') return [`0x${'11'.repeat(32)}`, 20n, 'ipfs://public'];
      if (functionName === 'totalSupply') return 2n;
      if (functionName === 'balanceOf') return 0n;
      if (functionName === 'claimed') return false;
      if (functionName === 'hasRole') return true;
      throw new Error('unexpected call');
    }),
  };
}
const cast = (c: ReturnType<typeof fixture>) => c as unknown as Pick<PublicClient, 'getChainId' | 'getBlockNumber' | 'getCode' | 'readContract'>;
const claim: Claim = { collectionId: 1n, recipient, issuer, nonce: `0x${'ab'.repeat(32)}`, deadline: 1900000000n };
describe('EventCollection gateway', () => {
  it('pins ownership reads to one block and exposes no signer without configuration', async () => {
    const c = fixture(); const gateway = await createCollectionGateway(config, cast(c));
    expect(gateway.issuerAddress).toBeNull(); expect(gateway.signClaim).toBeUndefined();
    expect(await gateway.read(1n, recipient)).toEqual({ eventId: `0x${'11'.repeat(32)}`, cap: 20n, totalSupply: 2n, balance: 0n, claimed: false, metadataURI: 'ipfs://public', issuerAuthorized: false });
    const calls = c.readContract.mock.calls.map(([p]) => p).filter(p => p.functionName !== 'hashClaim');
    expect(calls).toHaveLength(4);
    for (const call of calls) expect(call).toMatchObject({ blockNumber: 120n });
  });
  it('signs canonical vouchers locally and rejects revoked issuer authority', async () => {
    const c = fixture(); const gateway = await createCollectionGateway({ ...config, issuerPrivateKey: key }, cast(c));
    expect(await recoverClaim(collectionDomain(10143, contract), claim, await gateway.signClaim!(claim))).toBe(issuer);
    expect((await gateway.read(1n, recipient)).issuerAuthorized).toBe(true);
    c.readContract.mockResolvedValue(false);
    await expect(gateway.signClaim!(claim)).rejects.toMatchObject({ code: 'CHAIN_UNAVAILABLE', statusCode: 503 });
  });
  it.each(['chain', 'code', 'domain', 'rpc', 'key', 'issuer-code'] as const)('sanitizes %s startup failures', async failure => {
    const c = fixture();
    if (failure === 'chain') c.getChainId.mockResolvedValue(1);
    if (failure === 'code') c.getCode.mockResolvedValue('0x');
    if (failure === 'domain') c.readContract.mockResolvedValue(`0x${'00'.repeat(32)}`);
    if (failure === 'rpc') c.getChainId.mockRejectedValue(new Error(config.rpcUrl));
    if (failure === 'issuer-code') c.getCode.mockResolvedValue('0x6000');
    await expect(createCollectionGateway({ ...config, issuerPrivateKey: failure === 'key' ? `0x${'00'.repeat(32)}` : key }, cast(c))).rejects.toMatchObject({ message: 'Event collection unavailable', statusCode: 503, code: 'CHAIN_UNAVAILABLE' });
  });
  it.each(['chain', 'rpc', 'missing', 'supply', 'balance', 'claimed'] as const)('fails closed on %s reads', async failure => {
    const c = fixture(); const gateway = await createCollectionGateway(config, cast(c));
    const original = c.readContract.getMockImplementation()!;
    if (failure === 'chain') c.getChainId.mockResolvedValue(1);
    c.readContract.mockImplementation(async p => {
      if (failure === 'rpc') throw new Error(config.rpcUrl);
      if (failure === 'missing' && p.functionName === 'collections') return [`0x${'00'.repeat(32)}`, 0n, ''];
      if (failure === 'supply' && p.functionName === 'totalSupply') return 21n;
      if (failure === 'balance' && p.functionName === 'balanceOf') return -1n;
      if (failure === 'claimed' && p.functionName === 'claimed') return 'false';
      return original(p);
    });
    await expect(gateway.read(1n, recipient)).rejects.toMatchObject({ code: 'CHAIN_UNAVAILABLE', statusCode: 503 });
  });
  it('rejects wrong issuer, zero recipient and malformed nonce', async () => {
    const gateway = await createCollectionGateway({ ...config, issuerPrivateKey: key }, cast(fixture()));
    for (const changed of [{ ...claim, issuer: recipient }, { ...claim, recipient: `0x${'00'.repeat(20)}` as Address }, { ...claim, nonce: '0xab' as Hex }]) {
      await expect(gateway.signClaim!(changed)).rejects.toMatchObject({ statusCode: 503 });
    }
  });
  it('rejects delegated issuer code introduced after startup', async () => {
    const c = fixture(); const gateway = await createCollectionGateway({ ...config, issuerPrivateKey: key }, cast(c));
    c.getCode.mockImplementation(async ({ address }) => address === contract ? '0x6000' : `0xef0100${'11'.repeat(20)}`);
    await expect(gateway.signClaim!(claim)).rejects.toMatchObject({ code: 'CHAIN_UNAVAILABLE' });
  });
  it('treats claimed ownership inconsistencies as unavailable', async () => {
    const c = fixture(); const gateway = await createCollectionGateway(config, cast(c));
    const original = c.readContract.getMockImplementation()!;
    c.readContract.mockImplementation(async p => p.functionName === 'claimed' ? true : original(p));
    await expect(gateway.read(1n, recipient)).rejects.toMatchObject({ code: 'CHAIN_UNAVAILABLE' });
  });
});
