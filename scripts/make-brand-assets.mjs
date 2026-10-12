// Generates the brand files that are not photos:
//   public/favicon.svg, public/favicon.ico, public/apple-touch-icon.png   coral italic "S" on plum
//   public/og-default.webp                                                1200x630 social share image
//   public/logo.webp                                                      wordmark on plum, used by the schema.org logo
//
//   node scripts/make-brand-assets.mjs
//
// The "S" is the real Fraunces glyph outline (via fontkit), so the icon does not depend on installed fonts.
// The share image is rendered in Edge or Chrome (playwright-core) with the self-hosted Fraunces and Source Sans files,
// using the live hero photo (src/assets/images/hero/hero-woman.webp) and the wordmark.
// apple-touch-icon.png is the one PNG in the project: iOS does not accept WebP for home-screen icons.
import * as fontkit from 'fontkit';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const pub = join(root, 'public');
const PLUM = '#2A1730';
const CORAL = '#EF6B57';
const font = (p) => resolve(root, 'node_modules', p);

// ---------- favicon ----------
const italic = fontkit.openSync(font('@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2'));
const glyph = italic.glyphsForString('S')[0];
const { minX, minY, maxX, maxY } = glyph.bbox;
const gh = maxY - minY;
const gw = maxX - minX;
const icon = (rx) => {
  const size = 64;
  const target = 36; // glyph height inside the 64 box
  const s = target / gh;
  const tx = (size - gw * s) / 2 - minX * s;
  const ty = (size - target) / 2 + maxY * s; // y is flipped: SVG y = ty - fontY * s
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="No Breast Scar"><rect width="64" height="64" rx="${rx}" fill="${PLUM}"/><path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(5)} ${(-s).toFixed(5)})" fill="${CORAL}" d="${glyph.path.toSVG()}"/></svg>\n`;
};
await mkdir(pub, { recursive: true });
await writeFile(join(pub, 'favicon.svg'), icon(14));
await sharp(Buffer.from(icon(0)), { density: 600 }).resize(180, 180).png().toFile(join(pub, 'apple-touch-icon.png'));

// favicon.ico: PNG-in-ICO with 16, 32 and 48px images
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((n) => sharp(Buffer.from(icon(14)), { density: 600 }).resize(n, n).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e[0] = sizes[i];
  e[1] = sizes[i];
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
await writeFile(join(pub, 'favicon.ico'), Buffer.concat([header, ...entries, ...pngs]));
console.log('favicon.svg, favicon.ico, apple-touch-icon.png written');

// ---------- share image and logo ----------
const exe = [process.env.BROWSER_PATH, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean).find(existsSync);
if (!exe) throw new Error('No Edge or Chrome found. Set BROWSER_PATH.');
const url = (p) => pathToFileURL(font(p)).href;
const hero = pathToFileURL(resolve(root, 'src/assets/images/hero/hero-woman.webp')).href;
const css = `
@font-face{font-family:'Fraunces';src:url('${url('@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2')}');font-weight:100 900;font-style:normal}
@font-face{font-family:'Fraunces';src:url('${url('@fontsource-variable/fraunces/files/fraunces-latin-opsz-italic.woff2')}');font-weight:100 900;font-style:italic}
@font-face{font-family:'Source Sans 3';src:url('${url('@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff2')}');font-weight:700}
*{box-sizing:border-box}body{margin:0;background:${PLUM};color:#FFF8F2;overflow:hidden}
.mark{font-family:'Fraunces',Georgia,serif;font-weight:400;font-variation-settings:'opsz' 144;letter-spacing:-0.01em;line-height:1}
.mark em{color:${CORAL};font-style:italic}
`;
const ogHtml = `<!doctype html><meta charset="utf-8"><style>${css}
.wrap{position:relative;width:1200px;height:630px}
.photo{position:absolute;right:0;top:0;width:690px;height:630px;object-fit:cover;object-position:68% 28%}
.fade{position:absolute;right:0;top:0;width:690px;height:630px;background:linear-gradient(90deg,${PLUM} 0%,rgba(42,23,48,.85) 22%,rgba(42,23,48,0) 62%)}
.copy{position:absolute;left:72px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;width:640px}
.mark{font-size:104px}
.sub{margin-top:30px;font:700 22px 'Source Sans 3',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#F6D9D0;display:flex;align-items:center;gap:16px}
.sub i{display:inline-block;width:44px;height:3px;background:${CORAL}}
.line{margin-top:26px;font-family:'Fraunces',Georgia,serif;font-size:34px;line-height:1.25;color:#E9DCE6;max-width:520px}
</style><div class="wrap"><img class="photo" src="${hero}"><div class="fade"></div>
<div class="copy"><div class="mark">No Breast <em>Scar</em></div><div class="sub"><i></i>Richmond Breast Enhancement Center</div></div></div>`;
const logoHtml = `<!doctype html><meta charset="utf-8"><style>${css}
.wrap{width:1200px;height:400px;display:flex;align-items:center;justify-content:center;gap:28px}
.mark{font-size:150px}.sub{font:700 26px 'Source Sans 3',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#CDB8C9;align-self:flex-end;margin-bottom:84px}
</style><div class="wrap"><div class="mark">No Breast <em>Scar</em></div><div class="sub">Richmond, VA</div></div>`;

const browser = await chromium.launch({ executablePath: exe, args: ['--allow-file-access-from-files'] });
const cache = join(root, '.cache');
await mkdir(cache, { recursive: true });
async function render(html, w, h, outFile, resizeTo) {
  const file = join(cache, 'brand-render.html');
  await writeFile(file, html);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  let img = sharp(png);
  if (resizeTo) img = img.resize(resizeTo.w, resizeTo.h);
  await img.webp({ quality: 88 }).toFile(outFile);
}
await render(ogHtml, 1200, 630, join(pub, 'og-default.webp'));
await render(logoHtml, 1200, 400, join(pub, 'logo.webp'), { w: 600, h: 200 });
await browser.close();
console.log('og-default.webp (1200x630) and logo.webp written');
