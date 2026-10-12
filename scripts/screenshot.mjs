// Full-page screenshots of chosen pages at chosen widths, saved as WebP.
//   node scripts/screenshot.mjs <outDir> <baseUrl> <path> [<path> ...]   (widths: SHOT_WIDTHS="1440,375")
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, base, ...paths] = process.argv.slice(2);
const widths = (process.env.SHOT_WIDTHS ?? '1440,375').split(',').map(Number);
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'networkidle' }).catch(() => {});
    await page.evaluate(() => document.querySelectorAll('.fade-up').forEach((e) => e.classList.add('is-visible')));
    await page.waitForTimeout(600);
    const name = (p.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home') + `-${width}.webp`;
    const buf = await page.screenshot({ fullPage: true, type: 'png' });
    await sharp(buf).webp({ quality: 72 }).toFile(join(outDir, name));
    console.log(name);
  }
  await ctx.close();
}
await browser.close();
