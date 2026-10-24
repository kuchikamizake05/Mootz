'use client';

import { useState, type ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { monadTestnet } from 'viem/chains';
import { ApiError } from '@/lib/api/client';
import { env } from '@/lib/env';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Auth and permission failures are final; only transient failures retry.
            retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );

  if (!env.privyAppId) {
    return <ConfigMissing />;
  }

  return (
    <PrivyProvider
      appId={env.privyAppId}
      clientId={env.privyClientId}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: { accentColor: '#6D28D9', logo: '/brand/mootz-logo-v1.svg', landingHeader: 'Sign in to Mootz' },
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        // Wallet creation stays explicit; binding is a separate signed challenge (docs/privy-setup.md).
        embeddedWallets: { ethereum: { createOnLogin: 'off' } },
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrivyProvider>
  );
}

function ConfigMissing() {
  return (
    <main className="grid min-h-dvh place-items-center bg-mootz-canvas p-6 text-mootz-ink">
      <p className="max-w-sm text-center">
        <strong>NEXT_PUBLIC_PRIVY_APP_ID</strong> is not set. Copy <code>.env.example</code> to{' '}
        <code>.env.local</code> and restart the dev server.
      </p>
    </main>
  );
}
