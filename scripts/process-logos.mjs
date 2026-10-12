// Cleans up the footer logos so they sit evenly on the cream tiles.
//
//   node scripts/process-logos.mjs
//
// For each live footer logo (URLs from scripts/image-map.json):
//   1. Download the original again (the fetch-images copy is already WebP).
//   2. If the background is plain white, make it transparent. Only white connected to the image border is
//      removed (flood fill), so white text inside a coloured badge is kept. Edge pixels get a soft alpha and
//      their colour is un-mixed from white, so there are no white halos.
//   3. Trim the transparent margins.
//   4. Fit onto a 320x120 transparent canvas, centred, contain, with equal padding.
//   5. Save as lossless WebP: src/assets/images/logos/<name>.webp
// The MAA credit logo is only cleaned and trimmed: it is shown at a fixed height in the bottom bar, so a padded
// 320x120 canvas would make it tiny.
// Also writes docs/screenshots/footer-logos-before-after.webp (contact sheet) and scripts/logo-report.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const map = JSON.parse(await readFile(join(root, 'scripts', 'image-map.json'), 'utf8'));
const UP = 'https://nobreastscar.com/wp-content/uploads/';

const LOGOS = [
  { name: 'asps', org: 'American Society of Plastic Surgeons', src: '2017/01/american-society-logo.jpg' },
  { name: 'abps', org: 'American Board of Plastic Surgery', src: '2016/10/american1.png' },
  { name: 'realself', org: 'RealSelf', src: '2017/01/realself-logo.jpg' },
  { name: 'vcu', org: 'VCU', src: '2017/01/virginia-logo.jpg' },
  { name: 'university-of-richmond', org: 'University of Richmond', src: '2017/01/univercity-of-richmond-logo.jpg' },
  { name: 'wric', org: 'WRIC', src: '2017/01/wric-logo.jpg' },
  { name: 'fox-richmond', org: 'Fox Richmond', src: '2017/01/fox-richmond-logo.jpg' },
  { name: 'carecredit', org: 'CareCredit', src: '2016/10/lastone.png' },
  { name: 'aspire', org: 'Aspire', src: '2017/01/aspire-logo.png' },
  { name: 'brilliant-distinctions', org: 'Brilliant Distinctions', src: '2017/01/brillant-logo.png' },
  { name: 'cosmetassure', org: 'CosmetAssure', src: '2016/10/cosmet.png' },
  { name: 'stony-point', org: 'Stony Point Surgery Center', src: '2017/01/st-point-logo.png' },
  { name: 'neograft', org: 'NeoGraft', src: '2016/10/neosoft.png' },
  { name: 'maa', org: 'Medical Advertising Agency', src: '2026/08/maa-logo-new.webp', trimOnly: true },
];

const CANVAS = { w: 320, h: 120, pad: 4 };
const BG_MIN = 240; // a pixel counts as background white when its darkest channel is at least this
const EDGE_HI = 250; // soft ramp: fully transparent at or above this ...
const EDGE_LO = 205; // ... fully opaque at or below this

async function download(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'nobreastscar-rebuild-import' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Returns { data, w, h, removed, note } with RGBA pixels. */
function removeWhite({ data, w, h }) {
  const px = (i) => i * 4;
  const isBg = (i) => data[px(i) + 3] < 10 || Math.min(data[px(i)], data[px(i) + 1], data[px(i) + 2]) >= BG_MIN;
  // Is the background plain white? Check the border.
  let border = 0;
  let white = 0;
  const edge = (x, y) => {
    border++;
    if (isBg(y * w + x)) white++;
  };
  for (let x = 0; x < w; x++) {
    edge(x, 0);
    edge(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    edge(0, y);
    edge(w - 1, y);
  }
  const share = white / border;
  if (share < 0.5) return { data, removed: false, note: `kept background: only ${(share * 100).toFixed(0)}% of the border is plain white` };

  // Flood fill the background from the border.
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const i = y * w + x;
    if (!bg[i] && isBg(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  // Soft edge: pixels within 2px of the background get a ramped alpha and are un-mixed from white.
  const near = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (bg[y * w + x]) continue;
      for (let dy = -2; dy <= 2 && !near[y * w + x]; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && bg[yy * w + xx]) {
            near[y * w + x] = 1;
            break;
          }
        }
    }
  let removedPixels = 0;
  for (let i = 0; i < w * h; i++) {
    const o = px(i);
    if (bg[i]) {
      data[o + 3] = 0;
      removedPixels++;
    } else if (near[i]) {
      const m = Math.min(data[o], data[o + 1], data[o + 2]);
      const a = m >= EDGE_HI ? 0 : m <= EDGE_LO ? 1 : (EDGE_HI - m) / (EDGE_HI - EDGE_LO);
      if (a < 1 && a > 0) {
        for (let c = 0; c < 3; c++) data[o + c] = Math.max(0, Math.min(255, Math.round((data[o + c] - 255 * (1 - a)) / a)));
      }
      data[o + 3] = Math.round(a * 255 * (data[o + 3] / 255));
    }
  }
  return { data, removed: true, note: `background removed (${((removedPixels / (w * h)) * 100).toFixed(0)}% of pixels)` };
}

function bounds({ data, w, h }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

await mkdir(join(root, 'src', 'assets', 'images', 'logos'), { recursive: true });
const report = [];
const sheetRows = [];

for (const logo of LOGOS) {
  const url = UP + logo.src;
  if (!map[url]) console.warn('not in image-map.json:', url);
  const original = await download(url);
  const { data, info } = await sharp(original, { animated: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cleaned = removeWhite({ data: Buffer.from(data), w: info.width, h: info.height });
  const box = bounds({ data: cleaned.data, w: info.width, h: info.height });
  let img = sharp(cleaned.data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(box);
  let outW;
  let outH;
  if (logo.trimOnly) {
    img = img.png();
    const trimmed = await img.toBuffer();
    const meta = await sharp(trimmed).metadata();
    [outW, outH] = [meta.width, meta.height];
    await sharp(trimmed).webp({ lossless: true }).toFile(join(root, 'src', 'assets', 'images', 'logos', `${logo.name}.webp`));
  } else {
    const fitted = await img
      .resize({ width: CANVAS.w - 2 * CANVAS.pad, height: CANVAS.h - 2 * CANVAS.pad, fit: 'inside', kernel: 'lanczos3' })
      .png()
      .toBuffer();
    await sharp({ create: { width: CANVAS.w, height: CANVAS.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fitted, gravity: 'centre' }])
      .webp({ lossless: true })
      .toFile(join(root, 'src', 'assets', 'images', 'logos', `${logo.name}.webp`));
    [outW, outH] = [CANVAS.w, CANVAS.h];
  }
  report.push({ name: logo.name, org: logo.org, source: url, sourceSize: `${info.width}x${info.height}`, output: `${outW}x${outH}`, note: cleaned.note });
  sheetRows.push({ logo, original });
  console.log(`${logo.name.padEnd(24)} ${info.width}x${info.height} -> ${outW}x${outH}  ${cleaned.note}`);
}
await writeFile(join(root, 'scripts', 'logo-report.json'), JSON.stringify(report, null, 2) + '\n');

// ---- contact sheet: before (original on white) | after (processed on cream tile) ----
const CELL = { w: 330, h: 128 };
const rowH = CELL.h + 22;
const comps = [];
const esc = (s) => s.replace(/&/g, '&amp;');
for (let i = 0; i < sheetRows.length; i++) {
  const { logo, original } = sheetRows[i];
  const y = i * rowH;
  const before = await sharp(original, { animated: false }).flatten({ background: '#ffffff' }).resize({ width: CELL.w - 10, height: CELL.h - 10, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  comps.push({ input: { create: { width: CELL.w, height: CELL.h, channels: 3, background: '#ffffff' } }, left: 0, top: y + 20 });
  comps.push({ input: before, left: 5 + Math.round((CELL.w - 10 - (await sharp(before).metadata()).width) / 2), top: y + 20 + 5 });
  const after = await sharp(join(root, 'src', 'assets', 'images', 'logos', `${logo.name}.webp`)).png().toBuffer();
  const am = await sharp(after).metadata();
  const afterScaled = am.width > CELL.w ? await sharp(after).resize({ width: CELL.w }).png().toBuffer() : after;
  const asm = await sharp(afterScaled).metadata();
  comps.push({ input: { create: { width: CELL.w, height: CELL.h, channels: 3, background: '#FFF8F2' } }, left: CELL.w + 20, top: y + 20 });
  comps.push({ input: afterScaled, left: CELL.w + 20 + Math.round((CELL.w - asm.width) / 2), top: y + 20 + Math.round((CELL.h - asm.height) / 2) });
  comps.push({
    input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL.w * 2 + 20}" height="20"><text x="2" y="14" font-size="13" font-family="Arial" fill="#222">${esc(logo.org)}  (${esc(report[i].note)})</text></svg>`),
    left: 0,
    top: y,
  });
}
await mkdir(join(root, 'docs', 'screenshots'), { recursive: true });
const sheet = sharp({ create: { width: CELL.w * 2 + 20, height: rowH * sheetRows.length + 4, channels: 3, background: '#ffffff' } }).composite(comps);
await sheet.clone().webp({ quality: 85 }).toFile(join(root, 'docs', 'screenshots', 'footer-logos-before-after.webp'));
await sheet.clone().png().toFile(process.env.LOGO_SHEET_PNG ?? join(root, '.cache', 'footer-logos-before-after.png'));
console.log('Contact sheet written.');
