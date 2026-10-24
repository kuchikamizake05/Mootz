import { env } from '@/lib/env';

// Backend error envelope: { error: { code, requestId } } (be/src/app.ts).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId: string | null,
  ) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
  }

  /** 401: token missing/expired. Renew login; never fall back to a client-supplied identity. */
  get needsLogin() {
    return this.status === 401;
  }

  /** 503: backend dependency unavailable. Not the same as empty content. */
  get unavailable() {
    return this.status === 503;
  }
}

export type TokenSource = () => Promise<string | null>;

export async function apiFetch<T>(getToken: TokenSource, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new ApiError(401, 'AUTH_REQUIRED', null);

  let response: Response;
  try {
    response = await fetch(env.apiBaseUrl + path, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', null);
  }

  const requestId = response.headers.get('x-request-id');
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.error?.code ?? `HTTP_${response.status}`, body?.error?.requestId ?? requestId);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Like apiFetch but returns raw bytes (e.g. scoped Meet preview images, Cache-Control: no-store). */
export async function apiFetchBytes(getToken: TokenSource, path: string, init: RequestInit = {}): Promise<Blob> {
  const token = await getToken();
  if (!token) throw new ApiError(401, 'AUTH_REQUIRED', null);
  let response: Response;
  try {
    response = await fetch(env.apiBaseUrl + path, {
      ...init,
      headers: { ...init.headers, authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', null);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.error?.code ?? `HTTP_${response.status}`, body?.error?.requestId ?? response.headers.get('x-request-id'));
  }
  return response.blob();
}

export const jsonBody =(body: unknown, method = 'POST'): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});
