// Crawls the built site (dist/) and checks every internal link, image, script and stylesheet reference.
//
//   npm run build && node scripts/check-links.mjs
//
// - /path/ must exist as dist/path/index.html (links keep their trailing slash).
// - /file.ext must exist as dist/file.ext.
// - #fragment links must match an id on the same page.
// External links (http, https, mailto, tel) are not checked. Exits 1 when anything is broken.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import * as cheerio from 'cheerio';

const dist = join(process.cwd(), 'dist');

async function* walk(dir) {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) yield* walk(full);
    else yield full;
  }
}
const exists = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

const broken = new Map(); // "target" -> Set(pages)
let checked = 0;
let pages = 0;
const note = (target, page, why) => {
  const key = `${target}  (${why})`;
  if (!broken.has(key)) broken.set(key, new Set());
  broken.get(key).add(page);
};

for await (const file of walk(dist)) {
  if (!file.endsWith('.html')) continue;
  pages++;
  const pageUrl = '/' + relative(dist, file).split(sep).join('/').replace(/index\.html$/, '');
  const $ = cheerio.load(await readFile(file, 'utf8'));
  const ids = new Set($('[id]').map((_, e) => $(e).attr('id')).get());
  const refs = [];
  $('a[href]').each((_, e) => refs.push(['link', $(e).attr('href')]));
  $('img[src], script[src], iframe[src]').each((_, e) => refs.push(['asset', $(e).attr('src')]));
  $('link[href]').each((_, e) => refs.push(['asset', $(e).attr('href')]));
  $('img[srcset], source[srcset]').each((_, e) =>
    $(e)
      .attr('srcset')
      .split(',')
      .forEach((s) => refs.push(['asset', s.trim().split(/\s+/)[0]])),
  );

  for (const [kind, raw] of refs) {
    if (!raw || /^(https?:|mailto:|tel:|data:|javascript:)/i.test(raw) || raw.startsWith('//')) continue;
    checked++;
    if (raw.startsWith('#')) {
      if (raw.length > 1 && !ids.has(decodeURIComponent(raw.slice(1)))) note(raw, pageUrl, 'no element with that id on the page');
      continue;
    }
    const clean = raw.split('#')[0].split('?')[0];
    if (!clean.startsWith('/')) {
      note(raw, pageUrl, 'relative URL, use an absolute path');
      continue;
    }
    const target = join(dist, decodeURIComponent(clean));
    if (clean.endsWith('/')) {
      if (!(await exists(join(target, 'index.html')))) note(clean, pageUrl, kind === 'link' ? 'no such page' : 'missing');
    } else if (!(await exists(target))) {
      // A link without a trailing slash is also wrong for pages: report with the hint.
      const asPage = await exists(join(target, 'index.html'));
      note(clean, pageUrl, asPage ? 'page link is missing its trailing slash' : 'missing file');
    }
  }
}

console.log(`Checked ${checked} internal references across ${pages} pages.`);
if (broken.size) {
  console.log(`\n${broken.size} broken:`);
  for (const [target, where] of broken) {
    const list = [...where];
    console.log(`  ${target}\n      on ${list.slice(0, 4).join(', ')}${list.length > 4 ? ` and ${list.length - 4} more` : ''}`);
  }
  process.exit(1);
}
console.log('Link check passed: no broken internal links, images or anchors.');
