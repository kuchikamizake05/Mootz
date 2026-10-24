import { createServer } from 'node:http';
import { once } from 'node:events';
import { expect, it } from 'vitest';
import { createSupabaseMediaStorage } from '../src/media/storage.ts';

it('uses the real SDK HTTP contract for private upload and short signed access', async () => {
  const received: { path: string; bytes: Buffer; expires?: number }[] = [];
  let isPublic = false;
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    const path = request.url ?? '';
    received.push({ path, bytes });
    response.setHeader('content-type', 'application/json');
    if (path === '/storage/v1/bucket/photos') {
      response.end(JSON.stringify({ id: 'photos', name: 'photos', public: isPublic }));
    } else if(request.method==='GET'&&path.includes('/object/')&&path.includes('/account/photo.jpg')){
      response.setHeader('content-type','image/jpeg');response.end(Buffer.from('synthetic-image-bytes'));
    } else if (path.startsWith('/storage/v1/object/sign/photos/')) {
      received.at(-1)!.expires = JSON.parse(bytes.toString()).expiresIn;
      response.end(JSON.stringify({ signedURL: '/object/sign/photos/account/photo.jpg?token=synthetic' }));
    } else {
      response.end(JSON.stringify({ Key: 'photos/account/photo.jpg' }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test listener failed');
  const storage = createSupabaseMediaStorage({ url: `http://127.0.0.1:${address.port}`, secretKey: 'synthetic-server-key', bucket: 'photos' });
  try {
    const image = Buffer.from('synthetic-image-bytes');
    await storage.put('account/photo.jpg', image, 'image/jpeg');
    expect(received.find(item => item.path === '/storage/v1/object/photos/account/photo.jpg')?.bytes).toEqual(image);
    expect(await storage.read('account/photo.jpg')).toEqual(image);
    expect(await storage.signRead('account/photo.jpg')).toContain('/storage/v1/object/sign/photos/account/photo.jpg?token=synthetic');
    expect(received.find(item => item.expires)?.expires).toBe(60);
    isPublic = true;
    const count = received.filter(item => item.path.includes('/object/sign/')).length;
    await expect(storage.signRead('account/photo.jpg')).rejects.toMatchObject({ statusCode: 503 });
    expect(received.filter(item => item.path.includes('/object/sign/'))).toHaveLength(count);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
