// One-off importer: live nobreastscar.com HTML -> Markdown in the Astro content collections.
//
//   node scripts/fetch-images.mjs      # first, so scripts/image-map.json exists
//   node scripts/import-content.mjs
//
// Reads every URL in page-sitemap.xml and case-study-sitemap.xml (cached under .cache/), keeps the real page
// content, drops the Divi decoration and the boilerplate blocks repeated on every page (Travel Kit teaser,
// Dr. Lynam letter, separator bars), rewrites image URLs through image-map.json and internal links to relative
// paths. After this runs nothing depends on WordPress at runtime.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, relative, posix } from 'node:path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { LIVE, liveUrls, fetchHtml, pool, pathOf, topSections, normalizeImage, originalImageUrl, root } from './lib/live.mjs';

const imageMap = JSON.parse(await readFile(join(root, 'scripts', 'image-map.json'), 'utf8'));
// Case-study photos come from scripts/import-case-images.mjs (originals, WebP q85, one folder per case study).
const caseManifest = JSON.parse(await readFile(join(root, 'scripts', 'case-images.json'), 'utf8')).manifest;
const pagesDir = join(root, 'src', 'content', 'pages');
const csDir = join(root, 'src', 'content', 'caseStudies');
const warnings = [];
const warn = (path, msg) => warnings.push(`${path}: ${msg}`);

// ---------- helpers ----------

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '*' });
td.addRule('dropEmptyLinks', { filter: (n) => n.nodeName === 'A' && !n.textContent.trim() && !n.querySelector('img'), replacement: () => '' });

/** SPEC §1 typo fixes plus the agreed content fixes. Never applied to review or testimonial quotes. */
const TYPOS = [
  [/minimial/g, 'minimal'],
  [/Minimial/g, 'Minimal'],
  [/comitted/g, 'committed'],
  [/Tranaxillary/g, 'Transaxillary'],
  // Content fixes agreed with the client (logged in docs/CONTENT.md):
  // 1. No "only board-certified" claim (SPEC §1).
  [/\bthe only board-certified\b/g, 'a board-certified'],
  // 2. The live transaxillary intro repeats half a sentence.
  [/(on the actual breasts\.) any scars left behind on the breasts themselves\./g, '$1'],
  // 3. Hotel name.
  [/Crown Plaza/g, 'Crowne Plaza'],
];
function fixTypos(s) {
  return TYPOS.reduce((acc, [re, to]) => acc.replace(re, to), s);
}

const clean = (s) => s.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

/** Frontmatter as JSON-valued YAML (valid YAML, no extra dependency). */
function frontmatter(obj) {
  const lines = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

/** Uploaded documents (PDFs) linked from content. Copied into public/files/ so nothing points back at WordPress. */
const pendingFiles = new Map(); // live URL -> /files/<name>

/** Live absolute link -> site-relative path (keeps trailing slash). External links stay as they are. */
function localHref(href) {
  if (!href) return href;
  if (/^tel:/i.test(href)) {
    // Live links look like tel:\(804\) 226-1923 or tel:(804)%20560-5260. Normalise to digits.
    const digits = decodeURIComponent(href.slice(4)).replace(/\D/g, '');
    return 'tel:' + (digits.length === 10 ? '+1' + digits : digits);
  }
  try {
    const u = new URL(href, LIVE);
    if (u.hostname.replace(/^www\./, '') === 'nobreastscar.com' && u.pathname.startsWith('/wp-content/uploads/')) {
      if (/\.pdf$/i.test(u.pathname)) {
        const name = u.pathname.split('/').pop().toLowerCase();
        pendingFiles.set(u.href, '/files/' + name);
        return '/files/' + name;
      }
      warn(href, 'link to an upload that is not a PDF, left as is');
      return href;
    }
    if (u.hostname.replace(/^www\./, '') === 'nobreastscar.com') {
      let p = u.pathname;
      if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/';
      return p + u.hash;
    }
  } catch {
    /* fall through */
  }
  return href;
}

function mapImage(src, base) {
  if (!src) return null;
  const abs = normalizeImage(src, base);
  return imageMap[abs] ?? imageMap[normalizeImage(originalImageUrl(src), base)] ?? null;
}

const NOISE = [
  '.et_pb_code', '.home-banner-btn', 'a.small-button', 'a.smallblue', 'a.et_pb_button', '.et_pb_button_module_wrapper',
  'form', 'script', 'style', 'iframe', 'noscript', '.breadcrumb', '.inner-breadcrumb', '.hatom-extra',
].join(',');

/**
 * Convert one chunk of live HTML (cheerio element) to Markdown.
 * `mdFile` is the destination .md path, used to build relative image paths.
 */
function toMarkdown($, el, mdFile, pageUrl, path) {
  const $s = $(el).clone();
  $s.find(NOISE).remove();
  // Divi toggles (FAQ, reviews) become plain headings + content.
  $s.find('.et_pb_toggle').each((_, t) => {
    const title = $(t).find('.et_pb_toggle_title').first().text().trim();
    const content = $(t).find('.et_pb_toggle_content').first().html() ?? '';
    $(t).replaceWith(`<h3>${title}</h3>${content}`);
  });
  $s.find('img').each((_, img) => {
    const src = $(img).attr('data-src') || $(img).attr('src');
    // Doctor cut-out used as decoration on every call-to-action block; it stays available in doctor/.
    if (/lynam-doc/.test(src || '')) {
      $(img).remove();
      return;
    }
    const local = mapImage(src, pageUrl);
    if (!local) {
      if (src && !/bg-img\.png|lynam-doc|home-icon/.test(src)) warn(path, `image not in image-map, dropped: ${src}`);
      $(img).remove();
      return;
    }
    const rel = relative(dirname(mdFile), join(root, local)).split('\\').join('/');
    $(img).attr('src', rel).removeAttr('srcset').removeAttr('sizes').removeAttr('data-src').removeAttr('width').removeAttr('height');
  });
  $s.find('a').each((_, a) => {
    const href = $(a).attr('href');
    if (href) $(a).attr('href', localHref(href));
    $(a).removeAttr('target').removeAttr('class');
  });
  // Drop wrappers that only held decoration.
  $s.find('p').each((_, p) => {
    if (!$(p).text().trim() && !$(p).find('img').length) $(p).remove();
  });
  // Normalise heading levels so the shallowest heading is h2 (the page template supplies the h1).
  const levels = $s.find('h1,h2,h3,h4,h5,h6').map((_, h) => Number(h.tagName[1])).get();
  if (levels.length) {
    const shift = Math.min(...levels) - 2;
    if (shift !== 0) {
      $s.find('h1,h2,h3,h4,h5,h6').each((_, h) => {
        const n = Math.min(6, Math.max(2, Number(h.tagName[1]) - shift));
        h.tagName = `h${n}`;
      });
    }
  }
  return clean(td.turndown($s.html() ?? ''));
}

const textOf = ($, el) => $(el).text().replace(/\s+/g, ' ').trim();

// ---------- pages ----------

const GALLERY_CATEGORY = new Set(['/gallery/breast-enlargement/', '/gallery/breast-lift/', '/gallery/breast-lift-with-implants/']);
const GENERATED = new Set(['/site-map/', '/case-study/', '/gallery/breast-enlargement/', '/gallery/breast-lift/', '/gallery/breast-lift-with-implants/']);

function pageFile(path) {
  const rel = path === '/' ? 'index' : path.replace(/^\/|\/$/g, '') + '/index';
  return join(pagesDir, rel + '.md');
}

const quoteSource = { vitallogo: 'Vitals', yelp: 'Yelp', realself: 'RealSelf', healthcare: 'UCompareHealthCare' };

async function importPage(url, extras) {
  const path = pathOf(url);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const mdFile = pageFile(path);
  const seoTitle = $('title').first().text().trim();
  const description = ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').trim();
  const sections = topSections($);
  if (!sections.length) warn(path, 'no Divi sections found');

  const cls = (e) => $(e).attr('class') || '';
  const isSep = (e) => cls(e).includes('sep-section');
  const isDoctor = (e) => cls(e).includes('doctor-section');
  const isTravelTeaser = (e) => /^We.re A National Breast Enhancement Center Located in Richmond/i.test(textOf($, e));

  // Breadcrumb + title come from the banner (first section).
  const banner = sections[0];
  const breadcrumb = [];
  $(banner)
    .find('.breadcrumb')
    .first()
    .contents()
    .each((_, n) => {
      if (n.type === 'tag' && n.name === 'a') breadcrumb.push({ label: $(n).text().trim(), href: localHref($(n).attr('href')) });
      else if (n.type === 'text') {
        const t = $(n).text().replace(/[»\s]+/g, ' ').trim();
        if (t) breadcrumb.push({ label: t });
      }
    });
  let title = $(banner).find('.banner-title, h1.page-title, h1').first().text().replace(/\s+/g, ' ').trim();
  if (!title && breadcrumb.length) title = breadcrumb[breadcrumb.length - 1].label;
  if (!title) title = seoTitle.split('|')[0].trim();
  if (path === '/') title = 'Thinking About Breast Enhancement?';
  if (path === '/case-study/') title = 'Case Studies';

  // Lead = the banner copy under the title.
  const $banner = $(banner).clone();
  $banner.find('.banner-title, h1, h2').first().remove();
  const lead = path === '/site-map/' ? '' : toMarkdown($, $banner, mdFile, url, path);

  // Body = every other kept section.
  const bodyParts = [];
  let cta;
  let reviewItems;
  for (const sec of sections.slice(1)) {
    if (isSep(sec) || isDoctor(sec) || isTravelTeaser(sec)) continue;
    // The "Ready to start this life changing process?" call to action sits in its own text module,
    // sometimes inside a section that also holds body copy. Pull just that module out.
    const $sec = $(sec).clone();
    const ctaHeading = $sec
      .find('h1,h2,h3,h4')
      .filter((_, h) => /^Ready to start this life changing process/i.test($(h).text().replace(/\s+/g, ' ').trim()))
      .first();
    if (ctaHeading.length) {
      // Layout: a row with the heading, then a `.lynam-text` row holding the copy and the doctor cut-out.
      const headRow = ctaHeading.closest('.et_pb_row');
      const textRow = $sec.find('.lynam-text').first().length ? $sec.find('.lynam-text').first() : headRow.next('.et_pb_row');
      cta = { heading: 'Ready to start this life changing process?', text: toMarkdown($, textRow, mdFile, url, path) };
      headRow.remove();
      textRow.remove();
    }
    if (!textOf($, $sec) && !$sec.find('img').length) continue;
    bodyParts.push(toMarkdown($, $sec, mdFile, url, path));
  }

  let video;
  const yt = $('#main-content iframe[src*="youtube"]').first().attr('src');
  if (yt) video = { id: yt.split('/embed/')[1].split(/[?&]/)[0], title: 'Patient testimonial video' };

  // Reviews and testimonials: the quotes live in Divi toggles inside the first section. Keep them verbatim.
  if (path === '/about/reviews/' || path === '/about/testimonials/') {
    reviewItems = $(banner)
      .find('.et_pb_toggle')
      .map((_, t) => {
        const label = $(t).find('.et_pb_toggle_title').first().text().replace(/\s+/g, ' ').trim();
        const $c = $(t).find('.et_pb_toggle_content').first();
        const text = $c.find('p').filter((_, p) => !$(p).find('img').length).map((_, p) => $(p).text().trim()).get().join('\n\n');
        const logoSrc = $c.find('img').first().attr('src');
        const logo = logoSrc ? mapImage(logoSrc, url) : null;
        const key = logo ? Object.keys(quoteSource).find((k) => logo.includes(k)) : null;
        return { label, text, logo, source: key ? quoteSource[key] : null };
      })
      .get();
    // The quotes are the page body; render them as Markdown too.
    const quoteMd = reviewItems
      .map((r) => {
        const rel = r.logo ? relative(dirname(mdFile), join(root, r.logo)).split('\\').join('/') : null;
        return `### ${r.label}\n\n${r.text.split('\n\n').map((p) => `> ${p}`).join('\n>\n')}${rel ? `\n\n![${r.source ?? 'Source'}](${rel})` : ''}`;
      })
      .join('\n\n');
    bodyParts.unshift(quoteMd);
  }

  // If the banner also carries the page's sections (e.g. the FAQ), only the text before the first heading is the lead.
  const isLegal = path === '/about/reviews/' || path === '/about/testimonials/';
  let leadMd = lead;
  const h = isLegal ? -1 : lead.search(/^#{2,6} /m);
  if (h > 0) {
    bodyParts.unshift(lead.slice(h));
    leadMd = lead.slice(0, h).trim();
  } else if (h === 0) {
    bodyParts.unshift(lead);
    leadMd = '';
  }
  const generated = GENERATED.has(path);
  let body = bodyParts.filter(Boolean).join('\n\n');
  let leadOut = leadMd;
  if (!isLegal) {
    body = fixTypos(body);
    leadOut = fixTypos(leadOut);
  }
  // The page body is the banner copy followed by the sections (the template styles the first paragraphs as the intro).
  let finalBody;
  let tiles = [];
  if (path === '/contact/') {
    // The /contact/ banner holds the address block; drop the stray copyright line (the footer has it).
    finalBody = leadOut
      .split('\n')
      .filter((l) => !l.trim().startsWith('©'))
      .join('\n')
      .trim();
  } else if (isLegal) {
    finalBody = body; // the quotes
  } else if (GALLERY_CATEGORY.has(path)) {
    // Keep the intro text. Drop the banner caption and the uncensored sample photo: the case studies are listed
    // from the collection, blurred, instead.
    finalBody = leadOut.split(/\n\s*Actual Patient/)[0].trim();
  } else if (generated) {
    finalBody = '';
  } else {
    finalBody = [leadOut, body].filter(Boolean).join('\n\n');
    // Section landing pages: the live "Choose one of our ... to learn more" tiles are rebuilt from the collection.
    // The live "Choose one of our ... to learn more" tiles pair each child page with an image. Keep that pairing as data
    // (frontmatter "tiles") so the new card grids can use the same real images.
    const tileBlock = finalBody.match(/(?:^|\n+)#{2,3} (?:Choose one of our|NOBreastScar Travel Kit)[\s\S]*$/)?.[0] ?? '';
    tiles = [...tileBlock.matchAll(/!\[[^\]]*\]\(([^)]+)\)[\s\S]*?\[View more\]\(([^)]+)\)/g)].map((m) => ({ href: m[2], image: m[1] }));
    finalBody = finalBody.replace(/(?:^|\n+)#{2,3} (?:Choose one of our|NOBreastScar Travel Kit)[\s\S]*$/, '').trim();
  }
  body = finalBody;
  const finalLead = '';

  const words = (body + ' ' + finalLead).split(/\s+/).filter(Boolean).length;
  if (!generated && path !== '/' && words < 25) warn(path, `very little text imported (${words} words)`);

  const fm = {
    title: isLegal ? title : fixTypos(title),
    seoTitle: isLegal ? seoTitle : fixTypos(seoTitle),
    description: isLegal ? description : fixTypos(description),
    path,
    breadcrumb: breadcrumb.length ? breadcrumb : undefined,
    lead: finalLead || undefined,
    cta: cta && cta.text ? cta : undefined,
    tiles: tiles.length ? tiles : undefined,
    generated: generated || undefined,
  };
  await mkdir(dirname(mdFile), { recursive: true });
  await writeFile(mdFile, frontmatter(fm) + '\n' + body + '\n');

  return { path, title, words, images: (body.match(/!\[/g) || []).length, reviewItems, video };
}

// ---------- case studies ----------

const parseGalleryMembership = async (pages) => {
  const cats = { 'breast-enlargement': [], 'breast-lift': [], 'breast-lift-with-implants': [] };
  for (const cat of Object.keys(cats)) {
    const url = pages.find((u) => pathOf(u) === `/gallery/${cat}/`);
    if (!url) continue;
    const $ = cheerio.load(await fetchHtml(url));
    $('.case-study-area a[href*="/case-study/"]').each((_, a) => {
      const slug = pathOf(new URL($(a).attr('href'), url).href).split('/').filter(Boolean).pop();
      if (!cats[cat].includes(slug)) cats[cat].push(slug);
    });
  }
  return cats;
};

const undisclosed = (v) => (v && !/^undisclosed$/i.test(v.trim()) ? v : undefined);

async function importCaseStudy(url, membership, order) {
  const path = pathOf(url);
  const slug = path.split('/').filter(Boolean).pop();
  const mdFile = join(csDir, slug + '.md');
  const $ = cheerio.load(await fetchHtml(url));
  const seoTitle = $('title').first().text().trim();
  const description = ($('meta[name="description"]').attr('content') || '').trim();
  const title = $('h1.entry-title').first().text().replace(/\s+/g, ' ').trim();
  const patient = {};
  $('ul.single-casestudy li').each((_, li) => {
    const k = $(li).find('span').first().text().replace(':', '').trim().toLowerCase();
    const v = $(li).clone().children('span').remove().end().text().trim();
    if (k) patient[k] = v;
  });
  const rel = (img) => relative(dirname(mdFile), join(root, img)).split('\\').join('/');
  const man = caseManifest[slug];
  if (!man) warn(path, 'no entry in scripts/case-images.json (run import-case-images.mjs)');
  const featuredFile = man?.featured?.file;
  const thumbFile = man?.thumbnail?.same ? featuredFile : man?.thumbnail?.file;
  const imageFiles = (man?.images ?? []).map((i) => i.file);
  if (!title) warn(path, 'no title');
  if (!featuredFile) warn(path, 'no featured image');
  if (!imageFiles.length) warn(path, 'no case-study images');

  // The live gallery pages are the only real categorisation: Breast Enlargement and Breast Lift with Implants
// list the same 10 studies, Breast Lift lists all of them. Keep the real membership, never a guessed category.
  const galleries = Object.entries(membership).filter(([, slugs]) => slugs.includes(slug)).map(([c]) => c);
  if (!galleries.length) warn(path, 'not listed on any gallery page');

  const $desc = $('.case-desc').first().clone();
  $desc.find('h1,.hatom-extra').remove();
  const caseDescription = toMarkdown($, $desc, mdFile, url, path);
  const procedures = toMarkdown($, $('.procedure-details-area').first().clone().find('h1').remove().end(), mdFile, url, path);

  const t = title.toLowerCase();
  const size = title.match(/(\d{3})\s?cc/i)?.[1];
  const implantType = /silicone|silicon\b/i.test(title) ? 'silicone' : /saline/i.test(title) ? 'saline' : undefined;
  const technique = /trans-?axillary|arm ?pit/i.test(t) ? 'transaxillary' : undefined;

  const fm = {
    title,
    seoTitle,
    description,
    path,
    galleries,
    order,
    galleryOrder: man?.galleryOrder,
    featured: featuredFile ? rel(featuredFile) : undefined,
    thumbnail: thumbFile ? rel(thumbFile) : undefined,
    images: imageFiles.map(rel),
    // Fields the live page marks "undisclosed" are not facts, so they are left out.
    age: undisclosed(patient.age),
    gender: undisclosed(patient.gender),
    ethnicity: undisclosed(patient.ethnicity),
    height: undisclosed(patient.height),
    weight: undisclosed(patient.weight),
    implantSize: size ? `${size}cc` : undefined,
    implantType,
    technique,
  };
  const body = [caseDescription && `## Case description\n\n${caseDescription}`, procedures && `## Procedure details\n\n${procedures}`].filter(Boolean).join('\n\n');
  await mkdir(csDir, { recursive: true });
  await writeFile(mdFile, frontmatter(fm) + '\n' + body + '\n');
  return { path, title, galleries, images: imageFiles.length };
}

// ---------- run ----------

const { pages, caseStudies } = await liveUrls();

// Start clean so removed live pages do not linger.
await rm(pagesDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
await rm(csDir, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });

// The case-study sitemap also lists the /case-study/ archive page itself: that one is a page, not a case study.
const csUrls = caseStudies.filter((u) => pathOf(u) !== '/case-study/');
const archiveUrl = caseStudies.find((u) => pathOf(u) === '/case-study/');
const pageResults = await pool([...pages, ...(archiveUrl ? [archiveUrl] : [])], 6, (u) => importPage(u));
const membership = await parseGalleryMembership(pages);

// Live display order = order on /gallery/breast-lift/, which lists every case study.
const archiveOrder = membership['breast-lift'];
const csResults = await pool(csUrls, 6, (u) => {
  const slug = pathOf(u).split('/').filter(Boolean).pop();
  const idx = archiveOrder.indexOf(slug);
  return importCaseStudy(u, membership, idx === -1 ? 999 : idx);
});

// Copy linked PDFs.
await mkdir(join(root, 'public', 'files'), { recursive: true });
for (const [from, to] of pendingFiles) {
  const res = await fetch(from);
  if (!res.ok) { warn(from, `PDF download failed ${res.status}`); continue; }
  await writeFile(join(root, 'public', to), Buffer.from(await res.arrayBuffer()));
  console.log(`Copied ${from} -> public${to}`);
}

// Reviews / testimonials as data for the homepage and the reviews page template.
const reviews = pageResults.find((r) => r.path === '/about/reviews/')?.reviewItems ?? [];
const testimonials = pageResults.find((r) => r.path === '/about/testimonials/')?.reviewItems ?? [];
await mkdir(join(root, 'src', 'data'), { recursive: true });
// The testimonial page embeds a YouTube video. The site shows a click-to-load facade, so keep the id and a local WebP
// copy of the video's own thumbnail (no request to YouTube until the visitor clicks play).
const video = pageResults.find((r) => r.path === '/about/testimonials/')?.video;
let videoThumb;
if (video) {
  for (const name of ['maxresdefault', 'hqdefault']) {
    const res = await fetch(`https://i.ytimg.com/vi/${video.id}/${name}.jpg`);
    if (!res.ok) continue;
    const dest = 'src/assets/images/pages/testimonial-video.webp';
    await mkdir(join(root, 'src', 'assets', 'images', 'pages'), { recursive: true });
    const sharp = (await import('sharp')).default;
    await sharp(Buffer.from(await res.arrayBuffer())).webp({ quality: 82 }).toFile(join(root, dest));
    videoThumb = dest;
    break;
  }
  if (!videoThumb) warn('/about/testimonials/', 'could not fetch the video thumbnail');
}
await writeFile(join(root, 'src', 'data', 'reviews.json'), JSON.stringify({ reviews, testimonials, video: video ? { ...video, thumbnail: videoThumb } : undefined }, null, 2) + '\n');

console.log(`Imported ${pageResults.length} pages and ${csResults.length} case studies`);
console.log(`Case studies listed per gallery page:`, Object.fromEntries(Object.entries(membership).map(([k, v]) => [k, v.length])));
console.log(`Reviews: ${reviews.length}, testimonials: ${testimonials.length}`);
if (warnings.length) {
  console.log(`\n${warnings.length} warnings:`);
  for (const w of warnings) console.log('  - ' + w);
}
