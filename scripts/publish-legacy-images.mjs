// After `astro build`: copy every WebP under src/assets/images into dist/img/<section>/<name>.webp so the
// image redirects in public/_redirects point at stable URLs.
import { cp, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const src = join(root, 'src', 'assets', 'images');
const out = join(root, 'dist', 'img');
let count = 0;
for (const section of await readdir(src, { withFileTypes: true })) {
  if (!section.isDirectory()) continue;
  await mkdir(join(out, section.name), { recursive: true });
  for (const f of await readdir(join(src, section.name))) {
    if (!f.endsWith('.webp')) continue;
    await cp(join(src, section.name, f), join(out, section.name, f));
    count++;
  }
}
console.log(`Published ${count} images to dist/img/ for the legacy image redirects.`);
