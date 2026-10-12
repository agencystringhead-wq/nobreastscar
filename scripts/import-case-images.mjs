// Re-scans every live case study and rebuilds its images from the ORIGINAL files, at full quality.
//
//   node scripts/import-case-images.mjs
//
// For each of the 26 case studies (the 27th URL in the sitemap is the /case-study/ archive page) it collects:
//   - the featured image  (.patient-image on the case page, also the og:image)
//   - every image in the "Images" section, in live order
//   - the thumbnail the live /gallery/* pages use for the card
// and, for each, fetches the original file (WordPress size suffixes such as -300x143 are stripped; if only a resized
// file exists it is used and logged). Images are converted to WebP (quality 85, original aspect ratio, max 1600px wide)
// and written to src/assets/images/case-studies/<slug>/{featured,image-1,image-2,...}.webp.
// The result is written to scripts/case-images.json, which import-content.mjs, fetch-images.mjs and the ASSETS.md
// generator read. Mismatches between a case title and its file names are listed in the manifest under "flags".
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { join, basename } from 'node:path';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { liveUrls, fetchHtml, pool, pathOf, originalImageUrl, normalizeImage, LIVE, root } from './lib/live.mjs';

const outRoot = join(root, 'src', 'assets', 'images', 'case-studies');
const GALLERIES = ['breast-enlargement', 'breast-lift', 'breast-lift-with-implants'];
const log = [];
const flags = [];

const clean = (s) => s.replace(/\s+/g, ' ').trim();
const key = (u) => normalizeImage(originalImageUrl(u), LIVE).replace(/^https?:\/\//, '');

// ---- fetch with cache, preferring the original (unsuffixed) file ----
const cache = new Map();
async function fetchOriginal(src, where) {
  const abs = normalizeImage(src, LIVE);
  const orig = originalImageUrl(abs);
  const k = orig;
  if (cache.has(k)) return cache.get(k);
  const p = (async () => {
    const tryOrig = await fetch(orig, { headers: { 'user-agent': 'nobreastscar-rebuild-import' } });
    if (tryOrig.ok) {
      if (orig !== abs) log.push(`${where}: live src was resized (${basename(abs)}); fetched the original ${basename(orig)}`);
      return { url: orig, buf: Buffer.from(await tryOrig.arrayBuffer()) };
    }
    const trySrc = await fetch(abs, { headers: { 'user-agent': 'nobreastscar-rebuild-import' } });
    if (!trySrc.ok) throw new Error(`cannot fetch ${abs} (${trySrc.status})`);
    log.push(`${where}: ONLY A RESIZED VERSION EXISTS for ${basename(orig)}; used ${basename(abs)}`);
    return { url: abs, buf: Buffer.from(await trySrc.arrayBuffer()), resizedOnly: true };
  })();
  cache.set(k, p);
  return p;
}

async function toWebp(buf, dest) {
  await mkdir(join(dest, '..'), { recursive: true });
  const info = await sharp(buf, { animated: false }).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(dest);
  return { width: info.width, height: info.height, bytes: info.size };
}

// ---- gallery pages: order, card thumbnail and card title per case ----
const { pages, caseStudies } = await liveUrls();
const csUrls = caseStudies.filter((u) => pathOf(u) !== '/case-study/');
const gallery = {}; // slug -> { thumb, title, order:{cat:n} }
for (const cat of GALLERIES) {
  const url = pages.find((u) => pathOf(u) === `/gallery/${cat}/`);
  const $ = cheerio.load(await fetchHtml(url));
  let n = 0;
  $('.case-study-area').each((_, el) => {
    const a = $(el).find('a[href*="/case-study/"]').first();
    const slug = pathOf(new URL(a.attr('href'), LIVE).href).split('/').filter(Boolean).pop();
    const g = (gallery[slug] ??= { order: {} });
    g.thumb ??= $(el).find('img').first().attr('src');
    g.title ??= clean($(el).find('h2.case-title').first().text());
    g.age ??= clean($(el).find('li').first().text().replace(/^Age:\s*/i, ''));
    g.order[cat] = n++;
  });
}

// ---- each case study page ----
const manifest = {};
const sourceUse = new Map(); // normalized source -> slugs
const work = await pool(csUrls, 4, async (url) => {
  const slug = pathOf(url).split('/').filter(Boolean).pop();
  const $ = cheerio.load(await fetchHtml(url));
  const title = clean($('h1.entry-title').first().text());
  const featuredSrc = $('.patient-image img').first().attr('src');
  const og = $('meta[property="og:image"]').attr('content');
  const imageSrcs = $('.case-study-images img')
    .map((_, i) => $(i).attr('src'))
    .get()
    .filter(Boolean);
  return { slug, title, featuredSrc, og, imageSrcs };
});

for (const w of work) {
  const { slug, title, featuredSrc, og, imageSrcs } = w;
  const g = gallery[slug] ?? { order: {} };
  const where = `/case-study/${slug}/`;
  if (!featuredSrc) log.push(`${where}: NO featured image on the live page`);
  if (!gallery[slug]) log.push(`${where}: not listed on any live gallery page (no card thumbnail)`);
  if (og && featuredSrc && key(og) !== key(featuredSrc)) log.push(`${where}: og:image (${basename(og)}) differs from the featured image (${basename(featuredSrc)}); kept the featured image shown on the page`);

  const dir = join(outRoot, slug);
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  const entry = { slug, title, galleryTitle: g.title && g.title !== title ? g.title : undefined, galleryAge: g.age, galleryOrder: g.order, images: [], notes: [] };

  const sources = [];
  if (featuredSrc) {
    const f = await fetchOriginal(featuredSrc, where);
    const dim = await toWebp(f.buf, join(dir, 'featured.webp'));
    entry.featured = { file: `src/assets/images/case-studies/${slug}/featured.webp`, source: f.url, ...dim };
    sources.push(f.url);
    if (f.resizedOnly) entry.notes.push('featured exists only as a resized file');
  }
  // gallery thumbnail: same file as the featured image, or its own file
  if (g.thumb) {
    const t = await fetchOriginal(g.thumb, where + ' (gallery thumbnail)');
    if (entry.featured && t.url === entry.featured.source) entry.thumbnail = { same: 'featured' };
    else {
      const dim = await toWebp(t.buf, join(dir, 'thumbnail.webp'));
      entry.thumbnail = { file: `src/assets/images/case-studies/${slug}/thumbnail.webp`, source: t.url, ...dim };
      log.push(`${where}: the live gallery thumbnail (${basename(t.url)}) is a different file from the featured image`);
      sources.push(t.url);
    }
  }
  let i = 1;
  for (const src of imageSrcs) {
    const im = await fetchOriginal(src, where);
    const dim = await toWebp(im.buf, join(dir, `image-${i}.webp`));
    entry.images.push({ file: `src/assets/images/case-studies/${slug}/image-${i}.webp`, source: im.url, ...dim });
    sources.push(im.url);
    if (im.resizedOnly) entry.notes.push(`image ${i} exists only as a resized file`);
    i++;
  }
  for (const s of new Set(sources)) {
    const k = s.replace(/^https?:\/\//, '');
    sourceUse.set(k, [...(sourceUse.get(k) ?? []), slug]);
  }
  manifest[slug] = entry;
  console.log(slug.padEnd(70), `featured ${entry.featured?.width}x${entry.featured?.height}`, `images ${entry.images.length}`);
}

// ---- flag live mismatches (title vs file name) ----
const cc = (s) => [...s.matchAll(/(\d{3})\s?cc/gi)].map((m) => m[1]);
for (const e of Object.values(manifest)) {
  const files = [e.featured?.source, ...e.images.map((i) => i.source)].filter(Boolean).map((u) => decodeURIComponent(basename(u)));
  const titleCc = cc(e.title);
  const fileCc = [...new Set(files.flatMap(cc))];
  if (fileCc.length && titleCc.length && !fileCc.some((n) => titleCc.includes(n)))
    flags.push({ slug: e.slug, title: e.title, issue: `title says ${titleCc.join(' and ')}cc but the image file names say ${fileCc.join(' and ')}cc`, files });
  const fileText = files.join(' ').toLowerCase();
  if (/lift/.test(fileText) && !/lift/i.test(e.title)) flags.push({ slug: e.slug, title: e.title, issue: 'title does not mention a breast lift but the image file names do', files });
}
for (const [k, slugs] of sourceUse) {
  const uniq = [...new Set(slugs)];
  if (uniq.length > 1) flags.push({ slug: uniq.join(', '), issue: `the same live image file is used by ${uniq.length} case studies`, files: [basename(k)] });
}

const sourceToFile = {};
for (const e of Object.values(manifest)) {
  const add = (src, file) => {
    const k = src;
    if (!sourceToFile[k]) sourceToFile[k] = file;
  };
  if (e.featured) add(e.featured.source, e.featured.file);
  if (e.thumbnail?.file) add(e.thumbnail.source, e.thumbnail.file);
  e.images.forEach((i) => add(i.source, i.file));
}
await writeFile(join(root, 'scripts', 'case-images.json'), JSON.stringify({ generated: 'scripts/import-case-images.mjs', manifest, sourceToFile, flags, log }, null, 2) + '\n');
console.log(`\n${Object.keys(manifest).length} case studies, ${Object.keys(sourceToFile).length} distinct source files`);
console.log(`${log.length} log lines, ${flags.length} flags (see scripts/case-images.json)`);
