'use client';

import { useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiFetchBytes } from './client';
import type { components } from './generated/identity';

export type Profile = components['schemas']['Profile'];

/** Authenticated fetch bound to the current Privy session; a fresh token is requested per call. */
export function useApi() {
  const { getAccessToken } = usePrivy();
  return useCallback(
    <T>(path: string, init?: RequestInit) => apiFetch<T>(getAccessToken, path, init),
    [getAccessToken],
  );
}

/** Authenticated fetch returning a Blob, for binary endpoints. */
export function useApiBytes() {
  const { getAccessToken } = usePrivy();
  return useCallback((path: string, init?: RequestInit) => apiFetchBytes(getAccessToken, path, init), [getAccessToken]);
}

/** GET /v1/me also provisions the backend account on first login. */
export function useProfile() {
  const { ready, authenticated, user } = usePrivy();
  const api = useApi();
  return useQuery({
    queryKey: ['me', user?.id],
    queryFn: () => api<Profile>('/v1/me'),
    enabled: ready && authenticated,
  });
}
