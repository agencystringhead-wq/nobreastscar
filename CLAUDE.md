# nobreastscar.com rebuild (Astro)

A fresh Astro website for nobreastscar.com: Richmond Breast Enhancement Center, Medical Director Dr. Gregory Lynam. It replaces the current WordPress site. The content and page URLs stay the same; the design, code and image files are all new.

## Read these before writing code
1. `docs/SPEC.md`: the full build spec, which is the source of truth.
2. `design/homepage-design.html` and `design/homepage-design.webp`: the approved homepage design. Match its layout, colors, type and section order. It's a static mockup; rebuild it as Astro components and don't paste it in.
3. `docs/CONTENT.md`: the facts used on the homepage and which live page each one came from.

## Non-negotiables
- **Fresh Astro project**, static output, deployed to Cloudflare Pages (`nobreastscar.pages.dev`) from GitHub.
- **Page URLs identical** to the live site, with a trailing slash. The ~38 pages are in https://nobreastscar.com/page-sitemap.xml and the 27 case studies in https://nobreastscar.com/case-study-sitemap.xml.
- **Live content and images only.** The site uses only content and images that exist on the live nobreastscar.com. Nothing invented: no claims, stats, prices, testimonials, stock photos or illustrations. No placeholder boxes, `[photo]` or `[n]` labels on the finished site. If a section has no real content, change it, merge it or remove it, and keep the approved look (colours, fonts, colour-blocked bands, big footer with the JotForm). `docs/ASSETS.md` lists every real image and the real content per topic.
- **WebP only.** Every image in the repo and the build is `.webp`. The one exception is the favicon (`.svg` + `.ico`). A build check enforces this.
- **Big site-wide footer** with the JotForm (ID `62864268680467`), the full sitemap, every logo and the network sites.
- **Before/after photos are shown as on the live site**: not blurred, in a lightbox on the case study pages (client decision, replaces the earlier blur-by-default rule).
- **No em dashes** in UI copy.
- **Staging is noindex** (`_headers` + `robots.txt`) until launch day.

## Workflow
- Work on feature branches, open PRs into `main`, and never commit straight to `main`.
- No `Co-Authored-By` lines in commits.
- Cloudflare Pages: build `npm run build`, output `dist`, env `NODE_VERSION=20`.
- Build in the phases listed in `docs/SPEC.md` §10 and stop for review after each phase.
