Read CLAUDE.md, then docs/SPEC.md and docs/CONTENT.md, then look at design/homepage-design.webp and open design/homepage-design.html.

Build the new nobreastscar.com as a fresh Astro site, following the spec exactly. The homepage must match the approved design. Keep every live page URL the same, keep all images WebP only, and put the big footer with the JotForm on every page.

Work in the 5 phases in SPEC.md §10. Start with Phase 1 only:
1. Run git init and make an initial commit on main, then create a feature branch for the phase.
2. Scaffold Astro and set up the config, design tokens, fonts, BaseLayout, header with mega menus, mobile drawer, sticky mobile action bar, the big footer with the JotForm component, and the staging noindex files.
3. Make sure `npm run build` passes.

When Phase 1 is done, stop. Give me a short summary of what you built, anything you had to assume, and the exact steps to push to GitHub and connect Cloudflare Pages (project name `nobreastscar`, build `npm run build`, output `dist`, NODE_VERSION=20). Don't start Phase 2 until I say so.
