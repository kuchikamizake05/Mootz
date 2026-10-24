import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

const valid = { DATABASE_URL: 'postgresql://demo:demo@localhost:5432/mootz', ALLOWED_ORIGINS: 'http://localhost:3000' };
describe('configuration boundary', () => {
  it('allows read-only collections and validates optional server issuer configuration', () => {
    const collection = { ...valid, EVENT_COLLECTION_RPC_URL: 'https://rpc.example', EVENT_COLLECTION_ADDRESS: '0x'+'22'.repeat(20) };
    expect(loadConfig(collection)).toHaveProperty('collection.chainId', 10143);
    for (const extra of [{ EVENT_COLLECTION_ADDRESS: '' }, { EVENT_COLLECTION_RPC_URL: 'http://public.example' }, { WALLET_CHAIN_ID: '1' }, { EVENT_CLAIM_ISSUER_PRIVATE_KEY: 'invalid' }, { EVENT_CLAIM_ISSUER_PRIVATE_KEY: '0x'+'00'.repeat(32) }]) {
      expect(() => loadConfig({ ...collection, ...extra })).toThrow();
    }
    expect(() => loadConfig({ ...valid, EVENT_CLAIM_ISSUER_PRIVATE_KEY: '0x'+'11'.repeat(32) })).toThrow();
  });
  it('requires a valid paired Meet RPC and registry on the supported chain', () => {
    expect(loadConfig(valid)).toHaveProperty('meet', undefined);
    expect(() => loadConfig({ ...valid, MEET_RPC_URL: 'https://rpc.example' })).toThrow();
    expect(() => loadConfig({ ...valid, MEET_REGISTRY_ADDRESS: '0x'+'11'.repeat(20) })).toThrow();
    for (const rpc of ['http://public.example','https://user:password@rpc.example','file:///private']) {
      expect(() => loadConfig({ ...valid, MEET_RPC_URL: rpc, MEET_REGISTRY_ADDRESS: '0x'+'11'.repeat(20) })).toThrow();
    }
    expect(() => loadConfig({ ...valid, MEET_RPC_URL: 'https://rpc.example', MEET_REGISTRY_ADDRESS: '0x'+'00'.repeat(20) })).toThrow();
    expect(() => loadConfig({ ...valid, MEET_RPC_URL: 'https://rpc.example', MEET_REGISTRY_ADDRESS: '0x'+'11'.repeat(20), WALLET_CHAIN_ID:'1' })).toThrow();
    expect(loadConfig({ ...valid, MEET_RPC_URL: 'http://127.0.0.1:8545', MEET_REGISTRY_ADDRESS: '0x'+'11'.repeat(20) }).meet).toMatchObject({rpcUrl:'http://127.0.0.1:8545',registryAddress:'0x'+'11'.repeat(20),chainId:10143});
  });
  it('loads explicit origins and safe defaults', () => {
    expect(loadConfig(valid)).toMatchObject({ port: 3001, host: '127.0.0.1', origins: ['http://localhost:3000'] });
  });
  it.each([
    {}, { ...valid, DATABASE_URL: 'https://example.com' }, { ...valid, DATABASE_URL: 'postgresql:/mootz' },
    { ...valid, ALLOWED_ORIGINS: '*' }, { ...valid, ALLOWED_ORIGINS: 'https://app.test/path' },
    { ...valid, PORT: '0' }, { ...valid, PORT: '3.5' }, { ...valid, PORT: '65536' },
    { ...valid, NODE_ENV: 'preview' }, { ...valid, LOG_LEVEL: 'secret' },
  ])('rejects invalid settings without exposing values', (env) => {
    expect(() => loadConfig(env)).toThrow();
    try { loadConfig(env); } catch (error) { expect(String(error)).not.toContain('demo:demo'); }
  });
  it('supports production and deduplicates origins', () => {
    expect(loadConfig({ ...valid, NODE_ENV: 'production', PORT: '8080', HOST: '0.0.0.0', LOG_LEVEL: 'warn', ALLOWED_ORIGINS: 'https://app.test,https://app.test' })).toMatchObject({ port: 8080, origins: ['https://app.test'] });
  });
  it('requires Privy settings together and keeps auth disabled when absent', () => {
    expect(loadConfig(valid)).toHaveProperty('privy', undefined);
    expect(() => loadConfig({ ...valid, PRIVY_APP_ID: 'app' })).toThrow();
    expect(() => loadConfig({ ...valid, PRIVY_VERIFICATION_KEY: 'key' })).toThrow();
    expect(loadConfig({ ...valid, PRIVY_APP_ID: 'app', PRIVY_VERIFICATION_KEY: 'public-key' })).toMatchObject({ privy: { appId: 'app', verificationKey: 'public-key' } });
  });
  it('validates server-owned wallet proof domain and chain', () => {
    expect(loadConfig(valid)).toMatchObject({ walletDomain: 'localhost:3001', walletChainId: 10143 });
    expect(() => loadConfig({ ...valid, WALLET_PROOF_DOMAIN: 'https://evil.test/path' })).toThrow();
    expect(() => loadConfig({ ...valid, WALLET_CHAIN_ID: '0' })).toThrow();
    expect(() => loadConfig({ ...valid, WALLET_CHAIN_ID: 'NaN' })).toThrow();
  });
  it('loads private storage only with paired server credentials', () => {
    expect(loadConfig(valid)).toHaveProperty('storage', undefined);
    expect(() => loadConfig({ ...valid, SUPABASE_URL: 'https://example.supabase.co' })).toThrow();
    expect(() => loadConfig({ ...valid, SUPABASE_SECRET_KEY: 'server-secret' })).toThrow();
    expect(() => loadConfig({ ...valid, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_publishable_wrong' })).toThrow();
    expect(() => loadConfig({ ...valid, SUPABASE_URL: 'https://example.supabase.co/path', SUPABASE_SECRET_KEY: 'server-secret' })).toThrow();
    expect(loadConfig({ ...valid, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'server-secret' })).toMatchObject({ storage: { url: 'https://example.supabase.co', secretKey: 'server-secret', bucket: 'mootz-private-media' } });
    expect(loadConfig({ ...valid, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'legacy-server-key' })).toHaveProperty('storage.secretKey', 'legacy-server-key');
  });
});

it('configures mainnet signing domains without rewriting the testnet fallback', () => {
 const env = { ...valid, WALLET_CHAIN_ID: '143', MEET_RPC_URL: 'https://rpc.monad.xyz', MEET_REGISTRY_ADDRESS: '0x'+'11'.repeat(20), EVENT_COLLECTION_RPC_URL: 'https://rpc.monad.xyz', EVENT_COLLECTION_ADDRESS: '0x'+'22'.repeat(20) };
 expect(loadConfig(env)).toMatchObject({ walletChainId: 143, meet: { chainId: 143 }, collection: { chainId: 143 } });
});
