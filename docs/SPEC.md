# nobreastscar.com Build Spec (Astro)

Practice: Richmond Breast Enhancement Center (No Breast Scar). Medical Director: Dr. Gregory Lynam.
NAP: 8720 Stony Point Parkway, Suite 100, Richmond, VA 23235 · (804) 560-5260
GTM container: `GTM-KGR42B5`
JotForm: "No Scar Contact Form", ID `62864268680467`
Staging: https://nobreastscar.pages.dev (custom domain nobreastscar.com at launch)

Approved homepage design: `design/homepage-design.html` (screenshot: `design/homepage-design.png`). Where this spec and the design disagree on a visual detail, follow the design. Where they disagree on behavior, data or URLs, follow this spec.

---

## 1. Ground rules

- **Content:** reuse the live site's wording. Fix only obvious typos ("minimial" to "minimal", "comitted" to "committed", "Tranaxillary" to "Transaxillary"). Homepage summaries of inner pages must stay faithful to those pages (see `docs/CONTENT.md`).
- **No invented facts:** no stats, prices, ratings, review counts or claims that aren't on the live site. Unknown values render as `[placeholder]` and are listed in §11.
- **Don't use "the only"** board-certified surgeon claim from the About page. Use "board-certified plastic and maxillofacial surgeon" instead.
- **URLs:** every page keeps its live URL with a trailing slash. Keep misspelled live slugs as they are (e.g. `/procedures/minimal-scar-periaerolar-incision/`).
- **No em dashes** in UI copy.
- **Accessibility:** WCAG 2.1 AA. Text contrast at least 4.5:1. Touch targets at least 44px. Real `<button>` and `<a>` elements. Visible focus rings.

## 2. Images: WebP only

- `scripts/fetch-images.mjs` downloads each image once from the live site, converts it with `sharp` and saves it to `src/assets/images/<section>/<clean-kebab-name>.webp`.
  - Photos: quality 82.
  - Logos, the signature and anything with transparency: `lossless: true`.
  - The script writes `scripts/image-map.json` (old URL → new file).
- Never commit the originals. No `wp-content` folder anywhere.
- `scripts/check-image-formats.mjs` runs before `astro build` (wire it into `npm run build`). It fails the build if any `.png`, `.jpg`, `.jpeg`, `.gif` or `.avif` exists under `src/` or `public/`. The only exceptions are `public/favicon.svg` and `public/favicon.ico`.
- Use a single `Img.astro` wrapper around `astro:assets` `<Image>` with `format="webp"`, explicit width and height, responsive `widths`, and `loading="lazy"` on everything except the hero. No `<Picture>`/AVIF.
- The Open Graph image is WebP.

## 3. Design system

### Colors (CSS custom properties on `:root`, mapped into Tailwind `@theme`)

| Token | Hex | Use |
|---|---|---|
| `--plum` | `#2A1730` | Header, hero, footer, dark cards |
| `--plum-2` | `#3B2244` | Gallery band, borders on dark |
| `--plum-line` | `#4A2F52` | Rules inside the footer |
| `--coral` | `#EF6B57` | Accent on dark backgrounds, highlights, utility bar |
| `--brick` | `#C2412E` | Primary buttons and links on light backgrounds (passes AA with white text) |
| `--brick-deep` | `#9C3222` | Hover |
| `--cream` | `#FFF8F2` | Page background |
| `--blush` | `#FBE3DA` | Light section band, cards |
| `--blush-2` | `#F3C7B9` | Tile imagery fallback |
| `--mint` | `#CDE6DF` | Tiles and cards |
| `--teal` | `#1F4F4B` | Surgery timeline band, Recovery tile |
| `--butter` | `#F6E7B8` | Travel band, tiles |
| `--ink` | `#1E1420` | Body text |
| `--ink-soft` | `#5E4F5C` | Secondary text |
| `--line` | `#EAD9D0` | Hairlines on light |

### Type
- **Display:** Fraunces (variable, opsz on). Weight 350 for headings; italic, in coral or brick, for the highlighted word in each headline.
  - H1: about 78px desktop, `clamp(2.6rem, 6vw, 4.9rem)`, leading 1.0.
  - H2: 46 to 52px.
- **Body:** Source Sans 3, 17px, line-height 1.65.
- **Eyebrows:** 12px, uppercase, letter-spacing 0.16em, weight 700.
- Self-host with `@fontsource-variable/fraunces` and `@fontsource/source-sans-3`. No Google Fonts request in production.

### Shape and motion
- Radius 8px on cards and tiles. Pill buttons.
- Max width 1240px, 24px gutters.
- Fade-up on scroll (IntersectionObserver, 12px translate, 400ms), off under `prefers-reduced-motion`.

## 4. Site shell

1. **Utility bar** (coral): "No-cost internet consultation · Patients travel from all over the world", plus the phone number and an Online Consultation link.
2. **Sticky header** (plum): wordmark "No Breast *Scar*" + "Richmond, VA", nav, and a "Get Started" pill.
   - Nav: Procedures, Implants, Gallery, Travel, About, Contact.
   - Mega menus:
     - **Procedures:** Techniques (Transaxillary, Beneath Breast, Periareolar, Anesthesia) and Your surgery (Ready For Surgery?, Day Of Surgery, Recovery and Post Op, Exercise Post Op).
     - **Implants:** Types (Saline, Silicone, Ideal, Gummy Bear, Implant FAQ, How long do they last?) and Choosing (Silicone vs Saline, Teardrop vs Round, Textured vs Smooth, Choosing the right size, Choosing the right type).
     - **Gallery:** the 3 categories.
     - **About:** Reviews, Testimonials.
   - The nav data lives in `src/data/nav.ts` and is shared with the footer sitemap.
3. **Mobile:** a full-screen drawer with accordions, plus a sticky bottom bar with "Call" and "Online Consult". "Online Consult" scrolls to `#consult` in the footer.
4. **Big footer** on every page (§6).

## 5. Homepage sections (in order, matching the design)

1. **Hero** (plum)
   - Eyebrow, H1 "Thinking About *Breast Enhancement?*", the two live-site paragraphs, and two buttons.
   - Arch-shaped image slot on the right, with a floating card: "The no-scar technique: Incision hidden in the armpit. No scars on the breasts."
   - Fact strip below:
     - 3 incision options
     - 2 implant families
     - `[n]` case studies: the count comes from the content collection, never hard-coded
     - $0 internet consultation
2. **Explore tiles:** five colored tiles (Procedures, Implants, Patient Gallery, Travel to Richmond, Recovery), each with an image slot, title and one-line description.
3. **"The no-scar breast augmentation, explained"**
   - Sticky left column with an incision diagram and a "Read the full guide" link.
   - Right column with 4 numbered steps: armpit incision, endoscope, saline or silicone, closed and left to heal.
   - Then a dark "honest trade-off" card about symmetry.
4. **"Which Breast Enhancement Procedure Fits You?"** (blush): three cards, each with an `IncisionDiagram`, a tag, a scar/implant/note list and a link.
   - Armpit: dark card, "No scar" tag.
   - Crease: "Most common" tag.
   - Areola: "For certain women" tag, with a breastfeeding note.
5. **Implants**
   - Silicone (Age 22+), Saline (Age 18+) and Ideal Implant cards.
   - Dark "How long do they last?" strip: 10 yrs average per manufacturers, 20+ for some, under 5 for others.
   - Compare pills.
6. **Gallery** (plum-2)
   - Category filter buttons (All, Breast Enlargement, Breast Lift, Breast Lift with Implants).
   - 6 featured case studies from the collection, blurred by default.
   - A "View results" toggle that unblurs the whole grid for that visit only. Store nothing.
7. **Reviews:** one large plum quote plus 4 colored quote cards, quoted exactly from `/about/reviews/` with their source names. "All reviews" link.
8. **Surgery timeline** (teal): five steps.
   - Night before: fast 8 hours
   - Surgery day: general anesthesia
   - First 24 hours: companion
   - First week: at least one week off
   - Following weeks: no strenuous activity
   - Each step links to its page.
9. **Travel** (butter)
   - Live-site heading and paragraph.
   - Fly in (Richmond International Airport) and Stay (first week in Richmond) cards.
   - A "Pack this" checklist.
   - Hotel chips: The Berkeley Hotel, Best Western Plus Governor's Inn, Crowne Plaza Richmond Downtown, Red Roof Inn Richmond South, Quirk Hotel.
10. **Dr. Lynam**
    - Photo, then a Training card:
      - University of Richmond
      - Dental and medical degrees, Medical College of Virginia
      - General surgery, then plastic surgery training at MCV
      - Board-certified plastic and maxillofacial surgeon
      - Richmond Magazine Best Plastic Surgeons 2010
    - Then the director's letter in italic serif and the signature image.
11. **Implant FAQ** (blush): six questions from `/implants/implant-faq/` as `<details>` accordions, with the first one open. Add `FAQPage` JSON-LD.
12. **Big footer** (§6).

## 6. Big footer (`SiteFooter.astro`, every page)

Four bands on plum:

1. **Get Started + form**
   - Left column: eyebrow "Internet Consult", H2 "Get *Started*", large phone link, the live-site sentence, Visit/Medical Director blocks, and a static SVG map card linking to Google Maps.
   - Right column (`id="consult"`): the JotForm on a cream card with a coral top border.
   - `JotForm.astro`: a plain iframe, `src="https://form.jotform.com/62864268680467"`, `title="No Scar Contact Form"`, `loading="lazy"`, `allow="geolocation; microphone; camera; fullscreen; payment"`, width 100%, initial height 865px, no border, `scrolling="no"`.
   - Do **not** load the `jsform` script. Add a small inline `message` listener that accepts only origin `https://form.jotform.com`, parses `setHeight:<px>:62864268680467` and resizes the iframe.
   - Under the iframe, a fallback line: "Form not loading? Call (804) 560-5260".
   - The contact page reuses `JotForm.astro`.
2. **Sitemap:** five columns generated from `nav.ts`: Procedures (8), Implants (6), Choosing an implant (5), Gallery (3), and About (Reviews, Testimonials, Travel, Contact, Sitemap).
3. **Every logo:** WebP logos on cream tiles, each linking where the live site links it, opening in a new tab with `rel="noopener"`, and with `alt` set to the organization name. Upgrade links to https where the site supports it.
   - Credentials and training: ASPS (plasticsurgery.org), American Board of Plastic Surgery, RealSelf (Dr. Lynam's profile), VCU, University of Richmond.
   - As seen on: WRIC, Fox Richmond.
   - Financing and partners: CareCredit, Aspire, Brilliant Distinctions, CosmetAssure, Stony Point Surgery Center, NeoGraft.
4. **Network + bottom bar**
   - Wordmark.
   - Network sites: RichmondSurgicalArts.com, NoBreastScar.com, Quenchiv.com, RichmondBHRT.com.
   - © {current year} Dr. Gregory Lynam · All Rights Reserved · Sitemap.
   - "Website by Medical Advertising Agency".

## 7. Inner pages

- `pages` collection: the ~38 pages, imported to Markdown. Render them with `PageLayout.astro`:
  - plum page hero with breadcrumb and H1
  - prose body at a max of 72ch
  - a sticky sidebar on wide screens with the section's sibling links and a consult CTA
  - big footer
- `caseStudies` collection: 27 entries.
  - Schema: `title`, `category` (enum `breast-enlargement | breast-lift | breast-lift-with-implants`; confirm it maps 1:1 to the gallery pages before locking it), `images`, and optional `age`, `implantSize`, `implantType`, `technique`.
  - URL: `/case-study/<slug>/`.
  - Before/after images use `BlurReveal.astro`.
- The three gallery pages are grids filtered by category.
- `/site-map/` is generated from both collections.

## 8. Project setup

- `npm create astro@latest`, minimal template, TypeScript strict, `output: 'static'`.
- `astro.config.mjs`:
  - `site: 'https://nobreastscar.pages.dev'` (switch at launch)
  - `trailingSlash: 'always'`
  - `build.format: 'directory'`
  - integrations: `@astrojs/sitemap`, Tailwind v4 via `@tailwindcss/vite`
- Structure:
  ```
  src/assets/images/{hero,tiles,procedures,implants,case-studies,doctor,logos,brand}/
  src/components/  src/layouts/  src/pages/  src/styles/global.css
  src/content/{pages,caseStudies}/ + src/content.config.ts
  src/data/{nav.ts, site.ts, home.json}
  scripts/{fetch-images.mjs, import-content.mjs, check-image-formats.mjs}
  public/{favicon.svg, favicon.ico, _headers, robots.txt}
  ```
- `scripts/import-content.mjs`:
  - Pulls pages and case studies once from the WP REST API (`/wp-json/wp/v2/pages`, plus the case-study post type endpoint; find its REST base from `/wp-json/wp/v2/types`).
  - Converts the HTML to Markdown with frontmatter.
  - Rewrites image URLs via `image-map.json`.
  - Strips inline styles and WordPress shortcodes.
  - After the import, nothing depends on WordPress at runtime.
- Homepage copy lives in `src/data/home.json`, so copy edits don't touch components.
- `site.ts` holds the NAP, phone, GTM ID and JotForm ID in one place.
- Client JS is limited to: mega menu, mobile drawer, gallery filter/reveal, JotForm resize and the scroll fade. Use vanilla JS or `client:idle` islands; no React.

## 9. SEO, analytics, hosting

- Keep each page's title and meta description from the live site.
- Canonical URLs on `https://nobreastscar.com`.
- JSON-LD:
  - Sitewide: `MedicalClinic` + `Physician` (Dr. Gregory Lynam, NAP, `sameAs` RealSelf).
  - `FAQPage` on the homepage and the FAQ page.
  - `BreadcrumbList` on inner pages.
- GTM `GTM-KGR42B5`: script in `<head>`, noscript iframe after `<body>`.
- Viewport: `width=device-width, initial-scale=1`. Do not disable zoom.
- `@astrojs/sitemap` output must match the two live sitemaps path for path. Write `scripts/check-urls.mjs` to diff them and run it in CI.
- **Staging:** `public/_headers` sends `X-Robots-Tag: noindex` on `/*`, and `robots.txt` disallows all.
- **Launch checklist:** remove both, set `site` to `https://nobreastscar.com`, add the custom domain in Pages, submit the sitemap in Search Console.
- **Quality bar** (Lighthouse mobile): Performance 95+, Accessibility 100, SEO 100. LCP under 2.0s. No horizontal scroll at 360px. Test at 360, 768, 1024 and 1440 widths.

## 10. Build phases (stop for review after each)

1. Scaffold, config, design tokens, fonts, `BaseLayout`, header, mobile drawer, big footer with JotForm, staging noindex. Deploy to pages.dev.
2. Image fetch and convert scripts, the format check, the content import for all pages and case studies, and the URL diff check passing.
3. Homepage, all 11 sections, matching `design/homepage-design.html`.
4. Inner page layout, gallery pages, case study template, site map page.
5. JSON-LD, GTM, the Lighthouse pass, the accessibility pass, and a launch-readiness report.

## 11. Open items (render as `[placeholder]` until supplied)

1. Hero photo (none exists on the live site).
2. Tile photos for the five explore tiles.
3. Transparent signature image.
4. SVG logo, if the client has one (the wordmark is fine until then).
5. Brilliant Distinctions is now Allē, so the link is probably stale. Confirm with the client.
6. The final case-study count is read from the collection (the sitemap shows 27).
