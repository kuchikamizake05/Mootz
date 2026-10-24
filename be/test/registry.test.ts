import { describe, expect, it, vi } from 'vitest';
import type { Address, PublicClient } from 'viem';
import { createRegistryAccess } from '../src/chain/registry.ts';
import { hashOffer, meetDomain } from '../src/protocol/index.ts';
const registry = '0x1111111111111111111111111111111111111111' as Address;
const wallet = '0x2222222222222222222222222222222222222222' as Address;
describe.each([143, 10143] as const)('Monad chain %i', (chainId) => {
const config = { rpcUrl: 'https://rpc.invalid/private', registryAddress: registry, chainId: chainId };
function client() {
  return {
    getChainId: vi.fn(async (): Promise<number> => chainId),
    getCode: vi.fn(async (): Promise<string | undefined> => '0x6000'),
    readContract: vi.fn(async ({ functionName, args }: { functionName: string; args?: unknown[] }): Promise<unknown> => {
      if (functionName === 'QR_LIFETIME') return 60n;
      if (functionName === 'RELAY_WINDOW') return 300n;
      return hashOffer(meetDomain(config.chainId, registry), args![0] as Parameters<typeof hashOffer>[1]);
    }),
  };
}
const cast = (c: ReturnType<typeof client>) => c as unknown as Pick<PublicClient, 'getChainId' | 'getCode' | 'readContract'>;
describe('readonly registry access', () => {
  it('checks deployment and signing domain then accepts empty EOA bytecode', async () => {
    const c = client(); const access = await createRegistryAccess(config, cast(c));
    expect(access.domain).toEqual({ chainId: chainId, verifyingContract: registry });
    c.getCode.mockResolvedValue(undefined);
    await expect(access.assertWallet(wallet)).resolves.toBeUndefined();
    c.getCode.mockResolvedValue('0x');
    await expect(access.assertWallet(wallet)).resolves.toBeUndefined();
    expect(c.readContract.mock.calls.map(([p]) => p.functionName)).toEqual(['QR_LIFETIME', 'RELAY_WINDOW', 'hashOffer']);
  });
  it.each(['chain', 'code', 'qr', 'relay', 'domain', 'rpc'] as const)('sanitizes %s preflight failures', async (failure) => {
    const c = client();
    if (failure === 'chain') c.getChainId.mockResolvedValue(1);
    if (failure === 'code') c.getCode.mockResolvedValue('0x');
    if (failure === 'qr') c.readContract.mockResolvedValue(61n);
    if (failure === 'relay') c.readContract.mockImplementation(async ({ functionName }) => functionName === 'QR_LIFETIME' ? 60n : 301n);
    if (failure === 'domain') c.readContract.mockImplementation(async ({ functionName }) => functionName === 'QR_LIFETIME' ? 60n : functionName === 'RELAY_WINDOW' ? 300n : `0x${'00'.repeat(32)}`);
    if (failure === 'rpc') c.getChainId.mockRejectedValue(new Error(config.rpcUrl));
    await expect(createRegistryAccess(config, cast(c))).rejects.toMatchObject({ message: 'Meet registry unavailable', statusCode: 503 });
  });
  it.each(['0x6000', `0xef0100${'11'.repeat(20)}`])('rejects deployed or delegated wallet %s', async (code) => {
    const c = client(); const access = await createRegistryAccess(config, cast(c)); c.getCode.mockResolvedValue(code);
    await expect(access.assertWallet(wallet)).rejects.toMatchObject({ statusCode: 403, code: 'WALLET_UNSUPPORTED' });
  });
  it('does not misclassify RPC failure as unsupported wallet', async () => {
    const c = client(); const access = await createRegistryAccess(config, cast(c)); c.getCode.mockRejectedValue(new Error(config.rpcUrl));
    await expect(access.assertWallet(wallet)).rejects.toMatchObject({ message: 'Meet registry unavailable', statusCode: 503 });
  });
});

});
