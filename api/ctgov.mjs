// Vercel's version of the /app/api/ctgov route in serve.mjs. vercel.json rewrites requests here.
import { createCtgovProxy } from '../ctgov-proxy.mjs';

const ctgov = createCtgovProxy();

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.writeHead(405, { Allow: 'GET' }).end();
    return;
  }
  const url = new URL(request.url, 'http://localhost');
  const path = url.searchParams.get('path') ?? '';
  url.searchParams.delete('path');
  const { status, headers, body } = await ctgov(`/${path}`, url.search);
  const cacheable = status === 200 || status === 404;
  response
    .writeHead(status, {
      ...headers,
      // Function instances don't share memory, so the CDN does most of the caching here.
      'Cache-Control': cacheable ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'no-store',
    })
    .end(body);
}
