// Full-page screenshots of chosen pages at chosen widths, saved as WebP.
//   node scripts/screenshot.mjs <outDir> <baseUrl|dist> <path> [<path> ...]      (widths: SHOT_WIDTHS="1440,375")
// When the second argument is a folder (for example "dist"), a temporary static server is started for it and
// stopped afterwards, so nothing keeps running. Set MSYS_NO_PATHCONV=1 in Git Bash so "/paths/" are not rewritten.
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [outDir, target, ...paths] = process.argv.slice(2);
const widths = (process.env.SHOT_WIDTHS ?? '1440,375').split(',').map(Number);
const exe = [process.env.BROWSER_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(existsSync);

let server;
let base = target;
if (existsSync(target) && statSync(target).isDirectory()) {
  const port = 4326;
  server = spawn(process.execPath, [join(process.cwd(), 'scripts', 'serve-static.mjs'), resolve(target), String(port)], { stdio: 'ignore' });
  base = `http://localhost:${port}`;
  await new Promise((r) => setTimeout(r, 1200));
}

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath: exe });
try {
  for (const width of widths) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const p of paths) {
      await page.goto(base + p, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
      await page.evaluate(() => document.querySelectorAll('.fade-up').forEach((e) => e.classList.add('is-visible')));
      // Scroll through the page so lazy images and iframes load before the full-page capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 90));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(900);
      const name = (p.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home') + `-${width}.webp`;
      const buf = await page.screenshot({ fullPage: true, type: 'png' });
      await sharp(buf).webp({ quality: 72 }).toFile(join(outDir, name));
      console.log(name);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server?.kill('SIGKILL');
  setTimeout(() => process.exit(0), 300);
}
