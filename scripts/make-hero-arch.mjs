// Derives the arch-shaped hero crop from the live hero photo.
//   node scripts/make-hero-arch.mjs
// Input:  src/assets/images/hero/hero-woman.webp (1400x854, from fetch-images.mjs)
// Output: src/assets/images/hero/hero-woman-arch.webp (1000x1250, 4:5 portrait, quality 82)
// The crop is centred on her face and shoulders, with the tablet mostly cropped out at the bottom.
import sharp from 'sharp';

const src = 'src/assets/images/hero/hero-woman.webp';
const out = 'src/assets/images/hero/hero-woman-arch.webp';
// Region in source pixels (4:5): face centre is about x=880, y=300.
const region = { left: 600, top: 40, width: 520, height: 650 };

await sharp(src)
  .extract(region)
  .resize(1000, 1250, { kernel: 'lanczos3' })
  .sharpen({ sigma: 0.6 })
  .webp({ quality: 82 })
  .toFile(out);
const m = await sharp(out).metadata();
console.log(`Wrote ${out} ${m.width}x${m.height}`);
