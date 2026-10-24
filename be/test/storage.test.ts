import { expect, it, vi } from 'vitest';
const bucket = { upload: vi.fn(), remove: vi.fn(), createSignedUrl: vi.fn(), download:vi.fn() };
const getBucket = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { getBucket, from: () => bucket } }) }));
import { createSupabaseMediaStorage } from '../src/media/storage.ts';
function setup() {
  vi.clearAllMocks();
  getBucket.mockResolvedValue({ data: { public: false }, error: null });
  bucket.upload.mockResolvedValue({ error: null });
  bucket.remove.mockResolvedValue({ error: null });
  bucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://storage.test/signed' }, error: null });
  bucket.download.mockResolvedValue({data:new Blob(['private-image'],{type:'image/jpeg'}),error:null});
  return createSupabaseMediaStorage({ url: 'https://storage.test', secretKey: 'secret', bucket: 'photos' });
}
it('downloads private bytes for scoped preview without exposing a reusable provider URL',async()=>{
 const storage=setup();expect(await storage.read('account/photo.jpg')).toEqual(Buffer.from('private-image'));
 expect(bucket.download).toHaveBeenCalledWith('account/photo.jpg');expect(bucket.createSignedUrl).not.toHaveBeenCalled();
 bucket.download.mockRejectedValue(new Error('private-provider-details'));await expect(storage.read('account/photo.jpg')).rejects.toThrow('Media storage unavailable');
 getBucket.mockResolvedValue({data:{public:true},error:null});bucket.download.mockClear();await expect(storage.read('account/photo.jpg')).rejects.toThrow();expect(bucket.download).not.toHaveBeenCalled();
});
it('checks bucket privacy and never overwrites uploads', async () => {
  const storage = setup();
  await storage.put('user/photo.jpg', Buffer.from('photo'), 'image/jpeg');
  expect(getBucket).toHaveBeenCalledWith('photos');
  expect(bucket.upload).toHaveBeenCalledWith('user/photo.jpg', expect.any(Buffer), { contentType: 'image/jpeg', upsert: false, cacheControl: '60' });
});
it.each([{ data: { public: true }, error: null }, { data: null, error: null }, { data: { public: false }, error: new Error('secret') }])('fails closed for unavailable/private bucket checks', async result => {
  const storage = setup(); getBucket.mockResolvedValue(result);
  await expect(storage.signRead('user/photo.jpg')).rejects.toThrow('Media storage unavailable');
  expect(bucket.createSignedUrl).not.toHaveBeenCalled();
});
it('bounds signed links to 60 seconds', async () => {
  const storage = setup();
  await storage.signRead('user/photo.jpg', 300);
  expect(bucket.createSignedUrl).toHaveBeenCalledWith('user/photo.jpg', 60);
});
it.each(['../secret', '/absolute', 'user/../photo', 'user\\photo', 'user/%2e%2e/photo', ''])('rejects unsafe keys %s', async key => {
  const storage = setup();
  await expect(storage.signRead(key)).rejects.toThrow();
  expect(bucket.createSignedUrl).not.toHaveBeenCalled();
});
it('hides SDK upload and signing errors', async () => {
  const storage = setup(); bucket.upload.mockResolvedValue({ error: new Error('secret') });
  await expect(storage.put('user/photo.jpg', Buffer.from('x'), 'image/jpeg')).rejects.toThrow('Media storage unavailable');
  bucket.createSignedUrl.mockRejectedValue(new Error('secret'));
  await expect(storage.signRead('user/photo.jpg')).rejects.toThrow('Media storage unavailable');
});
it('checks privacy before removing objects', async () => {
  const storage = setup(); await storage.remove(['user/photo.jpg']);
  expect(getBucket).toHaveBeenCalled(); expect(bucket.remove).toHaveBeenCalledWith(['user/photo.jpg']);
});
it('uses default and smaller exact signing lifetimes', async () => {
  const storage = setup();
  await storage.signRead('user/photo.jpg');
  await storage.signRead('user/photo.jpg', 12);
  expect(bucket.createSignedUrl).toHaveBeenNthCalledWith(1, 'user/photo.jpg', 60);
  expect(bucket.createSignedUrl).toHaveBeenNthCalledWith(2, 'user/photo.jpg', 12);
});
it.each([0, -1, NaN, Infinity])('rejects invalid lifetime %s', async ttl => {
  const storage = setup(); await expect(storage.signRead('user/photo.jpg', ttl)).rejects.toThrow();
});
it('rechecks privacy after a previously private bucket becomes public', async () => {
  const storage = setup(); await storage.assertPrivate();
  getBucket.mockResolvedValue({ data: { public: true }, error: null });
  await expect(storage.put('user/photo.jpg', Buffer.from('x'), 'image/jpeg')).rejects.toThrow('Media storage unavailable');
  expect(bucket.upload).not.toHaveBeenCalled();
});
it('hides removal failure', async () => {
  const storage = setup(); bucket.remove.mockRejectedValue(new Error('secret'));
  await expect(storage.remove(['user/photo.jpg'])).rejects.toMatchObject({ message: 'Media storage unavailable', statusCode: 503 });
});
