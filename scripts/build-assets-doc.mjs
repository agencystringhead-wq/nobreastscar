// Regenerates docs/ASSETS.md: the inventory of every real image and the real content available per topic.
// Run after fetch-images and import-content:  node scripts/build-assets-doc.mjs
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const meta = JSON.parse(await readFile(join(root, 'scripts', 'image-meta.json'), 'utf8'));

// ---- case studies (frontmatter is JSON-valued YAML, one key per line) ----
const csDir = join(root, 'src', 'content', 'caseStudies');
const studies = [];
for (const f of (await readdir(csDir)).filter((n) => n.endsWith('.md'))) {
  const text = await readFile(join(csDir, f), 'utf8');
  const fm = {};
  for (const line of text.split('---')[1].trim().split('\n')) {
    const i = line.indexOf(': ');
    fm[line.slice(0, i)] = JSON.parse(line.slice(i + 2));
  }
  studies.push({ slug: f.replace(/\.md$/, ''), ...fm });
}
studies.sort((a, b) => a.order - b.order);
const base = (p) => p.replace(/^.*\//, '');
const studyOfImage = new Map(); // file name -> description
for (const s of studies) {
  if (s.thumbnail) studyOfImage.set(base(s.thumbnail), `Thumbnail (before/after) for "${s.title}"`);
  (s.images ?? []).forEach((img, i) => studyOfImage.set(base(img), `Before/after photo ${i + 1} of ${s.images.length} for "${s.title}"`));
}

// ---- hand-written descriptions for the non-case-study images (checked by eye) ----
const desc = {
  'pages/testimonial-video.webp': 'Thumbnail of the YouTube video embedded on /about/testimonials/ (id jz4FTvB-4vc), saved locally by import-content.mjs so the page makes no request to YouTube until play is pressed.',
  'hero/hero-woman-arch.webp': 'Derived file, not a live asset: a 4:5 portrait crop (1000x1250) of hero-woman.webp centred on her face and shoulders, made by scripts/make-hero-arch.mjs for the arch-shaped homepage hero.',
  'hero/hero-woman.webp': 'Live homepage hero photo (1400x854): a smiling blonde woman lying on a bed holding a tablet, soft white background with a white fade on the left. It is a CSS background of the first homepage section (`div.et_pb_section_0`, set in an inline style), not an <img>. Source: https://nobreastscar.com/wp-content/uploads/2017/01/hm-bannerimg.jpg. A faded 480px phone variant (nsb-mob-banner.jpg) exists on the live site and is not used.',
  'brand/nbs-logo-top.webp': 'Live header logo: "NoBreastScar.com Breast Enhancement Centers", dark lettering on transparent.',
  'brand/nbs-footer-logo.webp': 'Live footer logo: "NOBREASTSCAR.COM" in gold lettering on transparent. Made for dark backgrounds.',
  'brand/no-breast-scar-logo-1.webp': 'Live homepage banner logo: "NoBreastScar.com" in black serif capitals.',
  'doctor/dr-lynam.webp': 'Dr. Lynam portrait, cut out on a transparent background (467x695). Used in the live homepage letter and on every page.',
  'doctor/lynam-doc.webp': 'Same portrait, smaller (260x367), used in the live call-to-action blocks. Duplicate of dr-lynam.',
  'doctor/doctor-lynam.webp': 'Dr. Lynam portrait on a dark grey studio backdrop (200x270). Used on /about/. Small.',
  'doctor/nlynam-sign.webp': 'Dr. Lynam signature, dark ink on white (source is a JPG, no transparency). Used on the homepage letter.',
  'doctor/new-lynam-sign.webp': 'Same signature, near-duplicate file used on four inner pages.',
  'doctor/box-image-1.webp': 'Stock photo: smiling woman with long hair looking down. The "Reviews" tile image on /about/.',
  'doctor/smiling.webp': 'Stock photo: smiling blonde woman holding yellow flowers. The "Testimonials" tile on /about/ and the "Recovery and Post Op" tile on /procedures/.',
  'implants/silicon-img.webp': 'Product image of a clear silicone breast implant (257x141). Live homepage Silicone card.',
  'implants/saline-img.webp': 'Product image of a saline breast implant with fill port (215x141). Live homepage Saline card.',
  'implants/ideal-implant-img.webp': 'Product image of an IDEAL implant on its red stand (245x141). Live homepage Ideal Implant card.',
  'implants/ideal-implant-info.webp': 'Banner "Download IDEAL Implant Patient Information Brochure" with a PDF icon (690x80). Links to the brochure PDF.',
  'implants/gummy-bear.webp': 'Photo of a person in teal scrubs holding two implants. The Gummy Bear tile on /implants/.',
  'implants/breast-1.webp': 'Stock photo: woman in a black bikini on a beach. Tile image on /implants/ and /procedures/.',
  'implants/breast-img.webp': 'Stock photo: woman in a white bikini by the sea. Tile image on /implants/ and /procedures/.',
  'implants/gallery-box.webp': 'Stock photo: woman in white lingerie lying on a bed. Tile image on /implants/ and /procedures/.',
  'implants/pic.webp': 'Stock photo: woman lying on sand. The "How long do they last?" tile on /implants/.',
  'implants/right-size.webp': 'Stock photo: woman lying on her side against a pale backdrop. The "Choosing the right size" tile.',
  'implants/saline-silicon.webp': 'Stock photo: woman in a bikini on a wooden lounger. The "Silicone vs Saline" tile.',
  'implants/tear-round.webp': 'Stock photo: woman sitting on a beach. The "Teardrop vs Round" tile.',
  'procedures/anestisia.webp': 'Stock photo: woman resting her head on her hands. The Anesthesia tile on /procedures/.',
  'procedures/recovering-from-breast-enhancement.webp': 'Stock photo: woman lying on sand. The "Minimal Scar, Beneath Breast" tile on /procedures/.',
  'case-studies/hm-cs.webp': 'Live homepage gallery image (276x132): a before/after composite with black censor bars over the chest.',
  'case-studies/breast-gallery.webp': 'Small before/after composite (216x103), the banner of the three /gallery/ category pages. Uncensored patient photo, must be blurred.',
  'case-studies/breast-enhancement.webp': 'Stock photo (600x400), the "Breast Lift" tile on /gallery/.',
  'case-studies/implants.webp': 'Stock photo of a woman in a lace bra (600x400), the "Breast Lift with Implants" tile on /gallery/ and the Day Of Surgery tile.',
  'case-studies/transaxillary-breast-augmentatnpart-2.webp': 'Stock photo of a woman in black lingerie in a field (600x400), the Breast Enlargement tile on /gallery/ and the "Implant FAQ" tile.',
  'logos/american-society-logo.webp': 'American Society of Plastic Surgeons logo. Footer link to plasticsurgery.org.',
  'logos/american1.webp': 'American Board of Plastic Surgery, ABMS Maintenance of Certification. Footer link to abplasticsurgery.org.',
  'logos/realself-logo.webp': 'RealSelf 100, 2014 badge. Footer link to Dr. Lynam\'s RealSelf profile.',
  'logos/virginia-logo.webp': 'Virginia Commonwealth University seal. Footer link to vcu.edu.',
  'logos/univercity-of-richmond-logo.webp': 'University of Richmond shield. Footer link to richmond.edu.',
  'logos/wric-logo.webp': 'WRIC logo. Footer link to wric.com.',
  'logos/fox-richmond-logo.webp': 'Fox Richmond logo. Footer link to foxrichmond.com.',
  'logos/aspire-logo.webp': 'Aspire Galderma Rewards logo. Footer link.',
  'logos/brillant-logo.webp': 'Brilliant Distinctions logo. Footer link (programme is now Allē, link may be stale).',
  'logos/cosmet.webp': 'CosmetAssure, "We Cover Complications" logo. Footer link.',
  'logos/lastone.webp': 'CareCredit logo. Footer link to carecredit.com.',
  'logos/neosoft.webp': 'NeoGraft logo. Footer link.',
  'logos/st-point-logo.webp': 'Stony Point Surgery Center logo. Footer link.',
  'logos/maa-logo-new.webp': 'Medical Advertising Agency logo (already WebP on the live site). Footer credit.',
  'logos/vitallogo.webp': 'Vitals logo, source mark on reviews.',
  'logos/yelp.webp': 'Yelp logo, source mark on a review.',
  'logos/healthcare.webp': 'UCompareHealthCare logo, source mark on a review.',
  'logos/realself-new.webp': 'RealSelf 100, 2014 badge (smaller copy), source mark on RealSelf reviews.',
};
const travelDesc = {
  airtran: 'AirTran and Richmond International Airport logos', alteria: 'Dancers performing on a stage', amerricanairlines: 'American Airlines logo',
  avis: 'Avis logo', 'best-western': 'Best Western hotel room', 'black-sheep': 'The Black Sheep restaurant front', brio: 'Brio Tuscan Grille sign',
  budget: 'Budget Car Rental logo', cafe: 'Cafe interior with a long bar', 'car-rentals': 'Budget rental office (Car Rentals guide tile)', delta: 'Delta logo',
  doubletree: 'Doubletree hotel room', enterprise: 'Enterprise Rent-A-Car logo', 'four-points-hotel-richmond': 'Four Points hotel room', hertz: 'Hertz logo',
  hotels: 'Four Points hotel exterior at dusk (Hotels guide tile)', lewisginter: 'Rose garden and stone pergola (Lewis Ginter)', mama: 'Busy cafe interior (Mama J Kitchen)', marriot: 'Fairfield Inn hotel room',
  memorial: 'Statue inside a glass memorial hall (Entertainment and Landmarks guide tile)', 'quirk-hotel': 'Quirk Hotel rooftop bar', restaurants: 'The Black Sheep restaurant front (Restaurants guide tile)',
  'richmond-airlines': 'Richmond International Airport terminal (Airlines guide tile)', rva: 'Red trolley on a brick street', united: 'United Airlines logo', warmemorial: 'Statue inside a glass memorial hall',
};
for (const [k, v] of Object.entries(travelDesc)) desc[`travel/${k}.webp`] = `${v}. Used on the live Travel Kit pages.`;

// ---- tables ----
const dirs = ['hero', 'pages', 'brand', 'doctor', 'implants', 'logos', 'procedures', 'travel', 'case-studies'];
const rows = (dir) =>
  [...meta, ...(dir === 'hero' ? [{ file: 'src/assets/images/hero/hero-woman-arch.webp', width: 1000, height: 1250, alt: '', pages: ['/'] }] : []), ...(dir === 'pages' ? [{ file: 'src/assets/images/pages/testimonial-video.webp', width: 1280, height: 720, alt: '', pages: ['/about/testimonials/'] }] : [])]
    .filter((m) => m.file.includes(`/images/${dir}/`))
    .map((m) => {
      const key = m.file.replace('src/assets/images/', '');
      const what = desc[key] ?? studyOfImage.get(base(m.file)) ?? m.alt ?? '';
      const pages = m.pages.length > 3 ? `${m.pages.slice(0, 3).join(', ')} +${m.pages.length - 3}` : m.pages.join(', ');
      return `| \`${key}\` | ${m.width}x${m.height} | ${what} | ${pages} |`;
    })
    .join('\n');

const section = (dir, title, intro) => `### ${title}\n\n${intro}\n\n| File | Size | What it shows | Live pages |\n|---|---|---|---|\n${rows(dir)}\n`;

const out = `# Real assets and content inventory

Generated by \`scripts/build-assets-doc.mjs\` from \`scripts/image-meta.json\` and the content collections. Every image below exists on the live nobreastscar.com and was converted to WebP by \`scripts/fetch-images.mjs\`. Nothing here is invented. This is what the homepage and inner pages are allowed to use (SPEC §0).

- ${meta.length} images, all WebP, in \`src/assets/images/<section>/\`.
- ${studies.length} case studies in \`src/content/caseStudies/\` and 39 pages in \`src/content/pages/\` (38 from the page sitemap plus the \`/case-study/\` archive).
- Reviews and testimonials as data: \`src/data/reviews.json\`.
- One document: \`public/files/patient-brochure-digital.pdf\` (IDEAL implant patient brochure, linked from /implants/ideal-implants/).

## What the live site does NOT have

- **No hero <img>.** The live homepage hero photo is a CSS background (see hero/ below); in the page markup the banner holds only the logo image and text.
- **No photos of the practice, the staff, the building or an operating room.** The only person photographed is Dr. Lynam.
- **No illustrations or diagrams** of the incisions. (The incision diagrams in the old design mock-up were invented and are not used.)
- **No star rating, review count, awards count or statistics.** Reviews are quotes with a source logo.
- **No prices** except an incidental "around $1000 cheaper per pair" for saline on /implants/saline-implants/ and a hotel rate on /travel/. Neither is used on the homepage.
- **No per-case-study category.** The gallery pages overlap: see "Case studies" below.
- **No tile photos that depict the practice.** The live tiles on /procedures/, /implants/, /gallery/ and /about/ are stock lifestyle photos (listed below).

## Real content per topic

### Procedures (\`/procedures/*\`)
- **Three techniques**, each with its own page:
  - Transaxillary (armpit): incisions at the armpits, implants inserted with an endoscope ("a thin tube that has a camera and light on the end of it"), incision sutured and heals naturally, aftercare may include massaging the implants. No scars on the breasts. Downside: symmetry can be tougher, usually not an issue with an experienced surgeon. Saline or silicone, saline can be filled after insertion so the incision is smaller. (\`/procedures/no-scar-breast-augmentation-transaxillary/\`)
  - Inframammary (beneath breast): incision where the breast meets the chest wall; "used for a long time and provides very reliable results"; scars can be noticeable from some angles, saline keeps the scar smaller; the live CTA calls it "the most common breast augmentation technique". (\`/procedures/minimal-scar-beneath-breast/\`)
  - Periareolar: incision at the curve of the areola; "the least common method"; scars well camouflaged; saline gives the smallest incision, silicone needs longer scars; scars on the surface of the breasts; possible breastfeeding complications; "a great solution for certain women". (\`/procedures/minimal-scar-periaerolar-incision/\`)
- **Anesthesia:** mostly general anesthesia; safe if the person administering it is experienced; anesthesiologist monitors heart rate and breathing; no food for at least 8 hours before; drowsy for hours, memory and concentration affected for a day or two, no alcohol for 24 hours. (\`/procedures/anesthesia/\`)
- **Ready for surgery:** no food 8+ hours (small sips of water for medication allowed), arrange a driver, stop smoking, wear loose clothing (sports bra provided), keep taking prescribed medication except blood thinners, no lotions or antiperspirant. (\`/procedures/ready-for-surgery/\`)
- **Day of surgery:** shower with soap and water, arrive 2 hours before, someone to drive you home, someone with you for 24 hours, schedule free for at least a week. (\`/procedures/day-of-surgery/\`)
- **Recovery and post op:** side effects drowsiness, nausea, swelling, pain; somebody with you for 24 hours; no strenuous activity in the first couple of weeks; "Take at least a week off work", return if you feel well and your job isn't very physically demanding. (\`/procedures/recovery-and-post-op/\`)
- **Exercise post op:** no strenuous exercise for at least the first couple of weeks; walking is fine; light walks after about a week; light exercise like a stationary bike after a few weeks; no running or jumping for at least 6 weeks. (\`/procedures/exercise-post-op/\`)

### Implants (\`/implants/*\`)
- **Four types:** saline (salt water, safe in a silent rupture, from age 18, can be filled after insertion), silicone (more natural feel, costs more, from age 22, MRI every three years), IDEAL (a saline implant with a stronger internal structure, natural feel, easy to detect rupture), Gummy Bear (cohesive silicone, keeps shape, FDA approved early 2012).
- **Choosing:** Silicone vs Saline, Teardrop vs Round, Textured vs Smooth, Choosing the right size, Choosing the right type (five pages).
- **How long do they last:** "some women, their implants last for 20+ years, whereas other times the implants may need to be replaced after less than 5 years. However, implant manufacturers state that they last for 10 years on average". Signs of replacement: rupture, rippling, hardening.
- **Implant FAQ:** six questions with answers (types, saline vs silicone, safety, cost, uses beyond augmentation, choosing a surgeon).
- **Brochure:** IDEAL implant patient brochure PDF.

### Case studies (\`/case-study/*\`, \`/gallery/*\`)
- ${studies.length} case studies, each with age, gender, a short description, procedure details and 1 thumbnail plus 2 or 3 before/after images. Ethnicity, height and weight are "undisclosed" on every one.
- **Gallery pages are not 1:1 with a category.** /gallery/breast-enlargement/ and /gallery/breast-lift-with-implants/ list the **same 10** studies. /gallery/breast-lift/ lists **all ${studies.length}**. Only 6 of 26 case studies link to a gallery page in their own text (5 to Breast Lift, 1 to Breast Enlargement). So a filter by "category" cannot be honest; the collection stores \`galleries\` (which live pages list each study).
- All before/after photos are real, uncensored patient photos and must be blurred by default. The one exception is \`hm-cs.webp\`, a small composite with black censor bars.

### Reviews and testimonials (\`/about/reviews/\`, \`/about/testimonials/\`)
- ${JSON.parse(await readFile(join(root, 'src', 'data', 'reviews.json'), 'utf8')).reviews.length} reviews, each with a label (for example "Breast Augmentation Patient", "Trina D") and a source shown as a logo: Vitals, Yelp, UCompareHealthCare or RealSelf. 2 testimonials (Denise, Jane) with no source logo.
- Quotes are kept verbatim, including their typos, in \`src/data/reviews.json\`.

### Dr. Lynam (\`/about/\`, live homepage letter)
- Dr. Gregory T Lynam attended the University of Richmond, obtained dental and medical degrees at the Medical College of Virginia, entered the plastic surgery training program there after several years in general surgery. Studied procedures for the entire body, reconstructive and cosmetic.
- Voted one of the "Best Plastic Surgeons to take you back 20 years" in 2010 by Richmond Magazine.
- The live About page also says he is "the only board-certified plastic and maxillofacial surgeon in Richmond, VA". **SPEC §1 says not to repeat "the only"**: the imported About page keeps the live wording and needs client sign-off; the homepage must not use it.
- The letter text and signature are on the live homepage (see the homepage and \`doctor/\` images below).

### Travel (\`/travel/\`, \`/travel/travel-kit/\`, \`/hotels/\`, \`/restaurants/\`, \`/airlines/\`, \`/car-rentals/\`, \`/entertainment-and-landmarks/\`)
- Richmond International Airport has daily flights from across the country; the surgery on Stony Point Parkway "is easy to get to from the airport, whether you take a cab or other form of transport". (No "short cab ride".)
- Recovering in Richmond for the first week is recommended.
- Five hotels on /travel/ (The Berkeley Hotel, Best Western Plus Governor's Inn, "Crown Plaza" Richmond Downtown as spelled on the live page, Red Roof Inn Richmond South, Quirk Hotel); /hotels/ lists five (Four Points by Sheraton, Doubletree Richmond-Midlothian, Fairfield Inn & Suites West, Best Western Plus Governor's Inn, Quirk Hotel) with photos, phone numbers and a one-line description each.
- Travel kit: sports bra (check with Dr. Lynam), your medication (generally only blood thinners to avoid), comfortable clothing, a friend or family member for the first 24 hours, a laptop or tablet.
- Restaurant, airline, car rental and landmark guides with logos and photos.

### Contact and practice facts
- 8720 Stony Point Parkway, Suite 100, Richmond, VA 23235. (804) 560-5260. Medical Director Dr. Gregory Lynam. No-cost internet consultation. Patients travel from all over the world. Network sites: RichmondSurgicalArts.com, NoBreastScar.com, Quenchiv.com, RichmondBHRT.com.

## Images

Alt text on the live site is mostly empty or a file name, so descriptions below were written by looking at each image.

${section('hero', 'hero/', 'The live homepage hero photo, found in the theme CSS rather than the page markup.')}
${section('pages', 'pages/', 'Derived from the live site: the testimonial video thumbnail.')}
${section('brand', 'brand/', 'Logos of the practice itself.')}
${section('doctor', 'doctor/', 'The only photos of a person from the practice, plus two stock tiles used on /about/.')}
${section('implants', 'implants/', 'The three real implant product images are on the live homepage. The rest are stock lifestyle tiles.')}
${section('procedures', 'procedures/', 'Stock tile images on /procedures/.')}
${section('logos', 'logos/', 'Footer partner and credential logos, and the review source marks. The footer uses cleaned copies made by scripts/process-logos.mjs (asps, abps, realself, vcu, university-of-richmond, wric, fox-richmond, carecredit, aspire, brilliant-distinctions, cosmetassure, stony-point, neograft: 320x120 transparent lossless WebP; maa: trimmed only). Details in scripts/logo-report.json. The originals below are kept as the faithful conversions.')}
${section('travel', 'travel/', 'Hotels, restaurants, airlines, car rentals and landmarks for the Travel pages.')}
${section('case-studies', 'case-studies/', 'Real patient before/after photos (blur by default), plus a few stock tile images and the gallery banner.')}
`;
await writeFile(join(root, 'docs', 'ASSETS.md'), out);
console.log('Wrote docs/ASSETS.md', out.length, 'chars');
