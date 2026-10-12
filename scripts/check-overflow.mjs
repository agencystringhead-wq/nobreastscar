// Loads every page of the built site at phone width and fails if any page scrolls sideways.
//
//   npm run build && node scripts/check-overflow.mjs [dist|baseUrl] [width]
// With a folder (default "dist") a temporary static server is started and stopped afterwards. Uses the locally
// installed Microsoft Edge or Chrome through playwright-core (no browser download).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const target = process.argv[2] ?? 'dist';
const width = Number(process.argv[3] ?? 375);
const exe = [process.env.BROWSER_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(existsSync);
if (!exe) throw new Error('No Edge or Chrome found. Set BROWSER_PATH.');

let server;
let base = target;
if (existsSync(target) && statSync(target).isDirectory()) {
  const port = 4327;
  server = spawn(process.execPath, [join(process.cwd(), 'scripts', 'serve-static.mjs'), resolve(target), String(port)], { stdio: 'ignore' });
  base = `http://localhost:${port}`;
  await new Promise((r) => setTimeout(r, 1200));
}

const xml = await (await fetch(`${base}/sitemap-0.xml`)).text();
const paths = [...xml.matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]).concat('/404.html');

const browser = await chromium.launch({ executablePath: exe });
const bad = [];
try {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'load', timeout: 45000 });
    const r = await page.evaluate(() => {
      const w = innerWidth;
      const off = [...document.querySelectorAll('body *')]
        .filter((e) => {
          const b = e.getBoundingClientRect();
          if (!(b.width > 0 && b.right > w + 1) || e.closest('[hidden]') || getComputedStyle(e).position === 'fixed') return false;
          // Content inside a horizontally scrolling strip (for example the On this page pills) is clipped, not overflow.
          for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX;
            if (o === 'auto' || o === 'scroll' || o === 'hidden') return false;
          }
          return true;
        })
        .slice(0, 3)
        .map((e) => e.tagName + '.' + String(e.className?.baseVal ?? e.className).slice(0, 40));
      return { sw: document.documentElement.scrollWidth, w, off };
    });
    if (r.sw > r.w || r.off.length) bad.push({ p, ...r });
  }
} finally {
  await browser.close();
  server?.kill('SIGKILL');
}
console.log(`Checked ${paths.length} pages at ${width}px.`);
if (bad.length) {
  for (const b of bad) console.log(`  ${b.p}: scrollWidth ${b.sw} > ${b.w}  ${b.off.join(', ')}`);
  setTimeout(() => process.exit(1), 300);
} else {
  console.log('Overflow check passed: no horizontal scroll on any page.');
  setTimeout(() => process.exit(0), 300);
}
