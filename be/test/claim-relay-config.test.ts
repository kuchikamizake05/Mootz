import { expect, it } from 'vitest';
import { loadClaimRelayConfig } from '../src/claim-relay/config.ts';

const key = `0x${'11'.repeat(32)}`;
const valid = { DATABASE_URL: 'postgresql://demo:demo@localhost:5432/mootz', ALLOWED_ORIGINS: 'http://localhost:3000', EVENT_COLLECTION_RPC_URL: 'https://rpc.example', EVENT_COLLECTION_ADDRESS: `0x${'22'.repeat(20)}`, CLAIM_RELAYER_ENABLED: 'true', RELAYER_PRIVATE_KEY: key };
it('requires separate explicit opt-in, valid deployment configuration and a server relayer key', () => {
  expect(loadClaimRelayConfig(valid)).toMatchObject({ privateKey: key, config: { collection: { chainId: 10143 } } });
  for (const override of [{ CLAIM_RELAYER_ENABLED: '' }, { CLAIM_RELAYER_ENABLED: 'false' }, { EVENT_COLLECTION_ADDRESS: '' }, { RELAYER_PRIVATE_KEY: '' }, { RELAYER_PRIVATE_KEY: '0x'+'00'.repeat(32) }, { EVENT_CLAIM_ISSUER_PRIVATE_KEY: key }]) {
    expect(() => loadClaimRelayConfig({ ...valid, ...override })).toThrow();
  }
  expect(() => loadClaimRelayConfig({ ...valid, RELAYER_ENABLED: 'true', CLAIM_RELAYER_ENABLED: '' })).toThrow();
});
it('does not expose malformed key values in configuration errors', () => {
  try { loadClaimRelayConfig({ ...valid, RELAYER_PRIVATE_KEY: 'sensitive-invalid-key' }); throw new Error('expected failure'); }
  catch (error) { expect(String(error)).not.toContain('sensitive-invalid-key'); }
});
