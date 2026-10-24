import { createClient } from '@supabase/supabase-js';

export interface PrivateMediaStorage {
  assertPrivate(): Promise<void>;
  put(key: string, bytes: Buffer, contentType: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
  signRead(key: string, ttlSeconds?: number): Promise<string>;
  read(key:string):Promise<Buffer>;
}
export class StorageUnavailableError extends Error {
  readonly statusCode = 503;
  constructor() { super('Media storage unavailable'); this.name = 'StorageUnavailableError'; }
}
function validateKey(key: string) {
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)+$/.test(key)
    || key.split('/').some(part => part === '.' || part === '..')) throw new StorageUnavailableError();
}
export function createSupabaseMediaStorage(options: { url: string; secretKey: string; bucket: string }): PrivateMediaStorage {
  const client = createClient(options.url, options.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, { ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
    }) },
  });
  const bucket = client.storage.from(options.bucket);
  async function assertPrivate() {
    try {
      const { data, error } = await client.storage.getBucket(options.bucket);
      if (error || !data || data.public !== false) throw new StorageUnavailableError();
    } catch { throw new StorageUnavailableError(); }
  }
  return {
    assertPrivate,
    async read(key){
      validateKey(key);await assertPrivate();
      try{
        const {data,error}=await bucket.download(key);
        if(error||!data||data.size===0||data.size>8*1024*1024)throw new StorageUnavailableError();
        return Buffer.from(await data.arrayBuffer());
      }catch{throw new StorageUnavailableError();}
    },
    async put(key, bytes, contentType) {
      validateKey(key);
      await assertPrivate();
      try {
        const { error } = await bucket.upload(key, bytes, { contentType, upsert: false, cacheControl: '60' });
        if (error) throw new StorageUnavailableError();
      } catch { throw new StorageUnavailableError(); }
    },
    async remove(keys) {
      keys.forEach(validateKey);
      await assertPrivate();
      if (keys.length === 0) return;
      try {
        const { error } = await bucket.remove(keys);
        if (error) throw new StorageUnavailableError();
      } catch { throw new StorageUnavailableError(); }
    },
    async signRead(key, ttlSeconds = 60) {
      validateKey(key);
      if (!Number.isFinite(ttlSeconds) || ttlSeconds < 1) throw new StorageUnavailableError();
      await assertPrivate();
      try {
        const { data, error } = await bucket.createSignedUrl(key, Math.min(60, Math.floor(ttlSeconds)));
        if (error || !data?.signedUrl) throw new StorageUnavailableError();
        return data.signedUrl;
      } catch { throw new StorageUnavailableError(); }
    },
  };
}
