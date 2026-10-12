// Shared helpers for the one-off import scripts. Nothing here runs at build time or runtime.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const LIVE = 'https://nobreastscar.com';
export const root = process.cwd();
const cacheDir = join(root, '.cache', 'live-html');

/** Fetch text with a small retry. */
async function getText(url) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'nobreastscar-rebuild-import' } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

/** Fetch live HTML, cached on disk under .cache/ (gitignored) so reruns are fast and polite. */
export async function fetchHtml(url, { refresh = false } = {}) {
  await mkdir(cacheDir, { recursive: true });
  const file = join(cacheDir, encodeURIComponent(url) + '.html');
  if (!refresh && existsSync(file)) return readFile(file, 'utf8');
  const html = await getText(url);
  await writeFile(file, html);
  return html;
}

export async function sitemapUrls(name) {
  const xml = await getText(`${LIVE}/${name}`);
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** All live URLs the new site must reproduce: [pages, caseStudies]. */
export async function liveUrls() {
  const [pages, caseStudies] = await Promise.all([sitemapUrls('page-sitemap.xml'), sitemapUrls('case-study-sitemap.xml')]);
  return { pages, caseStudies };
}

/** Run async work with limited concurrency. */
export async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

export const pathOf = (url) => new URL(url).pathname;

/**
 * The top-level Divi sections of a page's main content, in order.
 * Each entry: { el, cls, text } with `text` the collapsed visible text.
 */
export function topSections($) {
  return $('#main-content .et_pb_section')
    .filter((_, e) => $(e).parents('.et_pb_section').length === 0)
    .toArray();
}

/** Strip the -300x143 style size suffix WordPress adds to resized uploads. */
export function originalImageUrl(src) {
  return src.replace(/-\d+x\d+(\.[a-zA-Z]+)$/, '$1');
}

/** Absolute, size-suffix-free key used to identify an image across pages. */
export function normalizeImage(src, base = LIVE) {
  const abs = new URL(src, base).href.replace(/^http:\/\//, 'https://');
  return abs;
}
