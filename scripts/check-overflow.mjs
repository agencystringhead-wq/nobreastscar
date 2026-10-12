// Loads every page of the built site (served from dist/ by `astro preview`) at phone width and fails if any page
// scrolls sideways. Uses the locally installed Microsoft Edge or Chrome through playwright-core (no browser download).
//
//   npm run build && npx astro preview --port 4322 &   then   node scripts/check-overflow.mjs [baseUrl] [width]
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:4322';
const width = Number(process.argv[3] ?? 375);
const candidates = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Edge or Chrome found. Set BROWSER_PATH.');

const xml = await (await fetch(`${base}/sitemap-0.xml`)).text();
const paths = [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]).concat('/404.html');

const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const bad = [];
for (const p of paths) {
  await page.goto(base + p, { waitUntil: 'load' });
  const r = await page.evaluate(() => {
    const w = innerWidth;
    const off = [...document.querySelectorAll('body *')]
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.right > w + 1 && !e.closest('[hidden]') && getComputedStyle(e).position !== 'fixed';
      })
      .slice(0, 3)
      .map((e) => e.tagName + '.' + String(e.className?.baseVal ?? e.className).slice(0, 40));
    return { sw: document.documentElement.scrollWidth, w, off };
  });
  if (r.sw > r.w || r.off.length) bad.push({ p, ...r });
}
await browser.close();
console.log(`Checked ${paths.length} pages at ${width}px.`);
if (bad.length) {
  for (const b of bad) console.log(`  ${b.p}: scrollWidth ${b.sw} > ${b.w}  ${b.off.join(', ')}`);
  process.exit(1);
}
console.log('Overflow check passed: no horizontal scroll on any page.');
