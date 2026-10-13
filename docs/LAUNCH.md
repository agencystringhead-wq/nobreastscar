# Launch checklist and client questions

Items that need an answer from the client before or on launch day. Nothing here is invented on the site; each
one is left out or kept as the live site has it until answered.

## Client questions

- **Office hours.** The live site does not publish any. The `/contact/` page leaves them out. If the client wants
  them shown, send the exact hours (and whether the "Visit us" card should carry them); they would also go into the
  `openingHoursSpecification` of the clinic JSON-LD in `src/pages/contact.astro` and `src/lib/schema.ts`.
- **Brilliant Distinctions.** It is now Allē, so the footer link is probably stale. Confirm the right link and logo.
- **Map pin.** The live site's embedded map had no pin and was centred about 200 m from the office. `/contact/` now
  uses an address embed that puts the pin on 8720 Stony Point Parkway, Suite 100. Ask the client to confirm the pin.

## Launch day

- Remove the staging `noindex` (`public/_headers` and `public/robots.txt`).
- Point the domain at Cloudflare Pages and keep the redirects in `public/_redirects` and `functions/wp-content/`.
