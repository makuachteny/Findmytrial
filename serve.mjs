// Serves the public website at / and the portals at /app/ from one origin.
// Run `npm run build` first.
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCtgovProxy } from './ctgov-proxy.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT ?? 4173);
const PROXY_PREFIX = '/app/api/ctgov';
const WEBSITE = resolve(ROOT, 'website/dist');
const APP = resolve(ROOT, 'app/dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

// Returns null for paths that escape the build folder, such as /../package.json.
function inside(base, relative) {
  const path = resolve(join(base, relative));
  return path === base || path.startsWith(base + sep) ? path : null;
}

async function locate(pathname) {
  const inApp = pathname === '/app' || pathname.startsWith('/app/');
  const base = inApp ? APP : WEBSITE;
  const relative = inApp ? pathname.slice('/app'.length) : pathname;
  const path = inside(base, relative);
  if (path === null) return { status: 403 };
  if (await isFile(path)) return { status: 200, path };
  // Portal routes such as /app/patient/trials are client-side, so they load the app shell.
  if (extname(relative)) return { status: 404 };
  const fallback = join(base, 'index.html');
  return (await isFile(fallback)) ? { status: 200, path: fallback } : { status: 404 };
}

const ctgov = createCtgovProxy();

const server = createServer(async (request, response) => {
  let pathname;
  let search;
  try {
    const url = new URL(request.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
    search = url.search;
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }
  if (pathname === PROXY_PREFIX || pathname.startsWith(`${PROXY_PREFIX}/`)) {
    if (request.method !== 'GET') {
      response.writeHead(405, { Allow: 'GET' }).end();
      return;
    }
    const { status, headers, body } = await ctgov(pathname.slice(PROXY_PREFIX.length), search);
    response.writeHead(status, { ...headers, 'Cache-Control': 'no-store' }).end(body);
    return;
  }
  if (pathname === '/app') {
    response.writeHead(301, { Location: '/app/' }).end();
    return;
  }
  const { status, path } = await locate(pathname);
  if (!path) {
    response.writeHead(status).end(status === 403 ? 'Forbidden' : 'Not found');
    return;
  }
  const hashed = path.includes(`${sep}assets${sep}`);
  response.writeHead(200, {
    'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
    'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(path).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Website: http://localhost:${PORT}/`);
  console.log(`Portals: http://localhost:${PORT}/app/signin`);
});
