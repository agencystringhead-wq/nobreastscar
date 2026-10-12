// Footer logo wall (SPEC §6). Links as in the approved design. Phase 2 should verify which http links can move to https.
// `image` is filled in by Phase 2 (WebP files written by scripts/fetch-images.mjs).
// Until then each tile shows the organization name as text.
export interface Logo {
  name: string;
  href: string;
  /** Path under src/assets/images/logos/ once Phase 2 has produced the WebP. */
  image?: string;
}

export const credentialLogos: Logo[] = [
  { name: 'American Society of Plastic Surgeons', href: 'https://www.plasticsurgery.org/' },
  { name: 'American Board of Plastic Surgery', href: 'https://www.abplasticsurgery.org/' },
  { name: 'RealSelf', href: 'https://www.realself.com/find/Virginia/Richmond/Plastic-Surgeon/Gregory-Lynam' },
  { name: 'VCU', href: 'https://www.vcu.edu/' },
  { name: 'University of Richmond', href: 'https://www.richmond.edu/' },
];

export const mediaLogos: Logo[] = [
  { name: 'WRIC', href: 'https://www.wric.com/' },
  { name: 'Fox Richmond', href: 'https://www.foxrichmond.com/' },
];

export const partnerLogos: Logo[] = [
  { name: 'CareCredit', href: 'https://www.carecredit.com/' },
  { name: 'Aspire', href: 'https://www.aspirerewards.com/app/home.do' },
  // Brilliant Distinctions is now Allē, so this link is probably stale. Confirm with the client (SPEC §11.5).
  { name: 'Brilliant Distinctions', href: 'https://www.brilliantdistinctionsprogram.com/' },
  { name: 'CosmetAssure', href: 'http://cosmetassure.com/' },
  { name: 'Stony Point Surgery Center', href: 'http://www.stonypointsc.com/' },
  { name: 'NeoGraft', href: 'http://neograft.com/' },
];
