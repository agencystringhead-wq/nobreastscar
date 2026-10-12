// After `astro build`: copy every WebP under src/assets/images (including the per-case-study folders) into
// dist/img/<path>.webp so the image redirects in public/_redirects point at stable URLs.
import { cpSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
let count = 0;
cpSync(join(root, 'src', 'assets', 'images'), join(root, 'dist', 'img'), {
  recursive: true,
  filter: (src) => {
    if (src.endsWith('.webp')) {
      count++;
      return true;
    }
    return !/\.[a-z0-9]+$/i.test(src); // directories only
  },
});
console.log(`Published ${count} images to dist/img/ for the legacy image redirects.`);
