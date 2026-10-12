// Downloads every image used on the live nobreastscar.com pages and case studies once,
// converts it to WebP with sharp and writes src/assets/images/<section>/<name>.webp.
//
//   node scripts/fetch-images.mjs            # skips files that already exist
//   node scripts/fetch-images.mjs --force    # re-download and re-convert everything
//
// Outputs:
//   scripts/image-map.json   old live URL -> new repo path (used by import-content.mjs)
//   scripts/image-meta.json  size, alt text and the live pages each image appears on (feeds docs/ASSETS.md)
//
// Originals are never written to disk. Photos: quality 82. Logos and anything with transparency: lossless.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, basename, extname } from 'node:path';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { LIVE, liveUrls, fetchHtml, pool, pathOf, normalizeImage, originalImageUrl, root } from './lib/live.mjs';

const force = process.argv.includes('--force');
const outRoot = join(root, 'src', 'assets', 'images');

// Decorative or chrome-only images that are not content.
const SKIP = [/bg-img\.png$/i, /home-icon-new\.png$/i];

const kebab = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function sectionFor(url, firstPage) {
  const file = basename(new URL(url).pathname).toLowerCase();
  if (/^(nbs-logo-top|nbs-footer-logo|no-breast-scar-logo)/.test(file)) return 'brand';
  if (/^maa-logo/.test(file)) return 'logos';
  if (/(dr-lynam|doctor-lynam|lynam-doc|lynam-sign|nlynam-sign)/.test(file)) return 'doctor';
  if (/^(vitallogo|yelp|healthcare|realself-new)\./.test(file)) return 'logos';
  if (/-(logo)\.(png|jpg|webp)$/.test(file) || /^(american1|cosmet|lastone|neosoft)\./.test(file)) return 'logos';
  if (/^(silicon-img|saline-img|ideal-implant-img|ideal-implant-info)/.test(file)) return 'implants';
  if (/^hm-cs\./.test(file) || /^breast-gallery\./.test(file)) return 'case-studies';
  const p = firstPage;
  if (p.startsWith('/case-study/') || p.startsWith('/gallery/')) return 'case-studies';
  if (p.startsWith('/implants/')) return 'implants';
  if (p.startsWith('/procedures/')) return 'procedures';
  if (p.startsWith('/about/')) return 'doctor';
  if (/^\/(travel|hotels|restaurants|airlines|car-rentals|entertainment-and-landmarks)\//.test(p)) return 'travel';
  return 'pages';
}

// Images that are CSS backgrounds in the WordPress theme, so they never appear as <img>.
// The homepage hero is set by `div.et_pb_section.et_pb_section_0{background-image:url(...)}` in an inline style.
// (The theme also swaps in a faded 480px copy, nsb-mob-banner.jpg, on phones. Not used: low resolution and washed out.)
const EXTRAS = [
  {
    src: 'https://nobreastscar.com/wp-content/uploads/2017/01/hm-bannerimg.jpg',
    section: 'hero',
    name: 'hero-woman',
    alt: 'Smiling woman lying on a bed holding a tablet',
    page: '/',
  },
];

const LOSSLESS_SECTIONS = new Set(['logos', 'brand']);

async function download(src) {
  // Prefer the full-size original when WordPress gave us a resized variant.
  for (const candidate of [originalImageUrl(src), src]) {
    const res = await fetch(candidate, { headers: { 'user-agent': 'nobreastscar-rebuild-import' } });
    if (res.ok) return { buf: Buffer.from(await res.arrayBuffer()), used: candidate };
  }
  throw new Error('download failed: ' + src);
}

async function main() {
  const { pages, caseStudies } = await liveUrls();
  const all = [...pages, ...caseStudies];
  const found = new Map(); // normalized src -> { alts:Set, pages:Set }

  await pool(all, 6, async (url) => {
    const $ = cheerio.load(await fetchHtml(url));
    const page = pathOf(url);
    const isHome = page === '/';
    $('img').each((_, el) => {
      const inMain = $(el).closest('#main-content').length > 0;
      // Chrome (header logo, footer logos) is identical on every page: read it from the homepage only.
      if (!inMain && !isHome) return;
      const raw = $(el).attr('data-src') || $(el).attr('data-lazy-src') || $(el).attr('src');
      if (!raw || raw.startsWith('data:')) return;
      const abs = normalizeImage(raw, url);
      if (SKIP.some((re) => re.test(abs))) return;
      const entry = found.get(abs) ?? { alts: new Set(), pages: new Set() };
      const alt = ($(el).attr('alt') || '').trim();
      if (alt) entry.alts.add(alt);
      entry.pages.add(page);
      found.set(abs, entry);
    });
    // og:image, if the page declares a real upload
    const og = $('meta[property="og:image"]').attr('content');
    if (og && og.includes('/wp-content/uploads/')) {
      const abs = normalizeImage(og, url);
      const entry = found.get(abs) ?? { alts: new Set(), pages: new Set() };
      entry.pages.add(page);
      found.set(abs, entry);
    }
  });

  for (const x of EXTRAS) {
    const entry = found.get(x.src) ?? { alts: new Set(), pages: new Set() };
    entry.alts.add(x.alt);
    entry.pages.add(x.page);
    found.set(x.src, entry);
  }

  // Case-study photos are imported separately (originals, WebP q85, one folder per case study): see
  // scripts/import-case-images.mjs. Skip them here and merge its results into the map afterwards.
  const caseFile = join(root, 'scripts', 'case-images.json');
  const caseData = existsSync(caseFile) ? JSON.parse(await readFile(caseFile, 'utf8')) : { manifest: {}, sourceToFile: {} };
  const caseSources = new Set(Object.keys(caseData.sourceToFile));
  for (const k of [...found.keys()]) if (caseSources.has(k)) found.delete(k);

  const sources = [...found.keys()].sort();
  console.log(`${sources.length} unique images across ${all.length} pages`);

  // Assign stable output names, resolving collisions.
  const used = new Set();
  const plan = sources.map((src) => {
    const info = found.get(src);
    const firstPage = [...info.pages].sort()[0];
    const extra = EXTRAS.find((x) => x.src === src);
    const section = extra?.section ?? sectionFor(src, firstPage);
    let name = extra?.name ?? kebab(basename(new URL(src).pathname, extname(new URL(src).pathname)));
    let rel = `src/assets/images/${section}/${name}.webp`;
    let n = 2;
    while (used.has(rel)) rel = `src/assets/images/${section}/${name}-${n++}.webp`;
    used.add(rel);
    return { src, rel, section, info };
  });

  const map = {};
  const meta = [];
  await pool(plan, 6, async ({ src, rel, section, info }) => {
    const dest = join(root, rel);
    await mkdir(dirname(dest), { recursive: true });
    let buf;
    if (force || !existsSync(dest)) {
      const dl = await download(src);
      buf = dl.buf;
      const img = sharp(buf, { animated: false });
      const m = await img.metadata();
      const lossless = LOSSLESS_SECTIONS.has(section) || m.hasAlpha || /sign/i.test(src);
      let pipeline = sharp(buf, { animated: false });
      if ((m.width ?? 0) > 2400) pipeline = pipeline.resize({ width: 2400, withoutEnlargement: true });
      await pipeline.webp(lossless ? { lossless: true } : { quality: 82 }).toFile(dest);
    }
    const out = await sharp(dest).metadata();
    map[src] = rel;
    meta.push({
      file: rel,
      source: src,
      width: out.width,
      height: out.height,
      alt: [...info.alts][0] ?? '',
      pages: [...info.pages].sort(),
    });
  });

  for (const [src, file] of Object.entries(caseData.sourceToFile)) map['https://' + src.replace(/^https?:\/\//, '')] = file;
  for (const e of Object.values(caseData.manifest)) {
    const add = (x) => x?.file && meta.push({ file: x.file, source: x.source, width: x.width, height: x.height, alt: '', pages: ['/case-study/' + e.slug + '/'] });
    add(e.featured);
    add(e.thumbnail?.file ? e.thumbnail : null);
    e.images.forEach(add);
  }

  const sortedMap = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
  meta.sort((a, b) => a.file.localeCompare(b.file));
  await writeFile(join(root, 'scripts', 'image-map.json'), JSON.stringify(sortedMap, null, 2) + '\n');
  await writeFile(join(root, 'scripts', 'image-meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(`Wrote ${meta.length} WebP files and scripts/image-map.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
