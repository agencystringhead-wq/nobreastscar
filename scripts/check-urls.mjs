// Diffs the built sitemap against the two live sitemaps, path for path (SPEC §9). Exits 1 on any difference.
//
//   npm run build && node scripts/check-urls.mjs
//
// Run in CI after the build. Needs network access to nobreastscar.com.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { liveUrls, pathOf, root } from './lib/live.mjs';

const dist = join(root, 'dist');
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

const builtFiles = (await readdir(dist)).filter((f) => /^sitemap-\d+\.xml$/.test(f));
if (!builtFiles.length) {
  console.error('No dist/sitemap-*.xml found. Run `npm run build` first.');
  process.exit(1);
}
const built = new Set();
for (const f of builtFiles) for (const u of locs(await readFile(join(dist, f), 'utf8'))) built.add(pathOf(u));

const { pages, caseStudies } = await liveUrls();
const live = new Set([...pages, ...caseStudies].map(pathOf));

const missing = [...live].filter((p) => !built.has(p)).sort();
const extra = [...built].filter((p) => !live.has(p)).sort();

console.log(`live: ${live.size} URLs (${pages.length} in page-sitemap, ${caseStudies.length} in case-study-sitemap)`);
console.log(`built: ${built.size} URLs`);
if (missing.length) console.log('\nMissing from the build:\n' + missing.map((p) => '  ' + p).join('\n'));
if (extra.length) console.log('\nIn the build but not on the live site:\n' + extra.map((p) => '  ' + p).join('\n'));
if (missing.length || extra.length) process.exit(1);
console.log('\nURL check passed: every live URL is built and nothing extra is published.');
