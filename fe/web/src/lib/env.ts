import { isAddress, type Address } from 'viem';

// NEXT_PUBLIC_* values are inlined at build time, so each must be referenced literally.
const optionalAddress = (value: string | undefined): Address | null =>
  value && isAddress(value) ? value : null;

export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001',
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  privyClientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined,
  mapTilerKey: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || null,
  chainId: Number(process.env.NEXT_PUBLIC_MONAD_CHAIN_ID || 143),
  meetRegistryAddress: optionalAddress(process.env.NEXT_PUBLIC_MEET_REGISTRY_ADDRESS),
  eventCollectionAddress: optionalAddress(process.env.NEXT_PUBLIC_EVENT_COLLECTION_ADDRESS),
  /** UI-only preview with labelled fictional fixtures; never mixed with real API data. */
  demoFixtures: process.env.NEXT_PUBLIC_DEMO_FIXTURES === "1",
} as const;
