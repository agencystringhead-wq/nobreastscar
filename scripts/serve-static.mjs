// Minimal static file server for a built folder.  node scripts/serve-static.mjs <dir> <port>
// Used to run Lighthouse against a launch-like copy of dist/ (robots allowed) while staging blocks indexing.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const [dir = 'dist', port = '4323'] = process.argv.slice(2);
const rootDir = resolve(dir);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.pdf': 'application/pdf',
};

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = resolve(join(rootDir, normalize(pathname)));
  if (!file.startsWith(rootDir)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      'content-type': types[ext] ?? 'application/octet-stream',
      'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(rootDir, '404.html'));
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}).listen(Number(port), () => console.log(`Serving ${rootDir} on http://localhost:${port}`));
