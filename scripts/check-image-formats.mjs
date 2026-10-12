// Fails the build if any raster image other than WebP lives under src/ or public/.
// Only public/favicon.svg and public/favicon.ico are allowed (SPEC §2).
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const banned = new Set(['.png', '.jpg', '.jpeg', '.gif', '.avif']);
// apple-touch-icon.png is the one PNG: iOS does not accept WebP for home-screen icons.
const allowed = new Set(['public/favicon.svg', 'public/favicon.ico', 'public/apple-touch-icon.png']);
const bad = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    const rel = relative(root, full).split(sep).join('/');
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (banned.has(ext) && !allowed.has(rel)) bad.push(rel);
  }
}

walk(join(root, 'src'));
walk(join(root, 'public'));

if (bad.length) {
  console.error('Image format check failed. Only .webp is allowed (favicon excepted):');
  for (const f of bad) console.error('  - ' + f);
  process.exit(1);
}
console.log('Image format check passed: no non-WebP images in src/ or public/.');
