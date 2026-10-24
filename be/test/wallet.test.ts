import { describe, expect, it } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletChallengeService, type WalletChallenge, type ChallengeRepository } from '../src/wallet/challenges.ts';

function fixture() {
  const rows = new Map<string, WalletChallenge>();
  const repository: ChallengeRepository = {
    async insert(c) { rows.set(c.id, c); },
    async find(id) { return rows.get(id); },
    async consume(c) { return rows.delete(c.id); },
  };
  return { service: createWalletChallengeService(repository, 'demo.mootz.test'), repository };
}
const now = new Date('2026-10-23T00:00:00Z');

describe('EOA wallet control challenges', () => {
  it('verifies an exact real signature once, including concurrent submissions', async () => {
    const { service } = fixture();
    const account = privateKeyToAccount(generatePrivateKey());
    const c = await service.issue('account-a', account.address, now);
    const signature = await account.signMessage({ message: c.message });
    const results = await Promise.allSettled([service.verify('account-a', c.id, account.address, signature, now), service.verify('account-a', c.id, account.address, signature, now)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  });

  it('rejects account changes, wrong signers, tampered messages, expiry, and another domain', async () => {
    const { service, repository } = fixture();
    const account = privateKeyToAccount(generatePrivateKey());
    const attacker = privateKeyToAccount(generatePrivateKey());
    const c = await service.issue('account-a', account.address, now);
    const signature = await account.signMessage({ message: c.message });
    await expect(service.verify('account-b', c.id, account.address, signature, now)).rejects.toThrow();
    await expect(service.verify('account-a', c.id, attacker.address, signature, now)).rejects.toThrow();
    await expect(service.verify('account-a', c.id, account.address, await attacker.signMessage({ message: c.message }), now)).rejects.toThrow();
    await expect(service.verify('account-a', c.id, account.address, await account.signMessage({ message: c.message + 'changed' }), now)).rejects.toThrow();
    await expect(service.verify('account-a', c.id, account.address, signature, c.expiresAt)).rejects.toThrow();
    await expect(createWalletChallengeService(repository, 'other.test').verify('account-a', c.id, account.address, signature, now)).rejects.toThrow();
    await expect(service.verify('account-a', c.id, account.address, signature, now)).resolves.toEqual(c);
  });

  it('rejects invalid inputs and creates distinct random challenges', async () => {
    const { service } = fixture();
    const account = privateKeyToAccount(generatePrivateKey());
    await expect(service.issue('a\nb', account.address, now)).rejects.toThrow();
    await expect(service.issue('a', '0x1234', now)).rejects.toThrow();
    const a = await service.issue('a', account.address, now);
    const b = await service.issue('a', account.address, now);
    expect(a.message).not.toEqual(b.message);
    await expect(service.verify('a', a.id, account.address, 'invalid', now)).rejects.toThrow();
  });
});
