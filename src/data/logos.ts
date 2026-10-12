// Footer logo wall (SPEC §6). Links as on the live footer. Images are the live logos, cleaned by
// scripts/process-logos.mjs into src/assets/images/logos/<file>.webp (320x120, transparent, lossless).
export interface Logo {
  name: string;
  href: string;
  /** File name (without extension) under src/assets/images/logos/. */
  file: string;
}

export const credentialLogos: Logo[] = [
  { name: 'American Society of Plastic Surgeons', href: 'http://www.plasticsurgery.org/', file: 'asps' },
  { name: 'American Board of Plastic Surgery', href: 'https://www.abplasticsurgery.org/', file: 'abps' },
  { name: 'RealSelf', href: 'https://www.realself.com/find/Virginia/Richmond/Plastic-Surgeon/Gregory-Lynam', file: 'realself' },
  { name: 'VCU', href: 'http://www.vcu.edu/', file: 'vcu' },
  { name: 'University of Richmond', href: 'http://www.richmond.edu/', file: 'university-of-richmond' },
];

export const mediaLogos: Logo[] = [
  { name: 'WRIC', href: 'http://wric.com/', file: 'wric' },
  { name: 'Fox Richmond', href: 'http://www.foxrichmond.com/', file: 'fox-richmond' },
];

export const partnerLogos: Logo[] = [
  { name: 'CareCredit', href: 'http://www.carecredit.com/', file: 'carecredit' },
  { name: 'Aspire', href: 'https://www.aspirerewards.com/app/home.do', file: 'aspire' },
  // Brilliant Distinctions is now Allē, so this link is probably stale. Confirm with the client (SPEC §11.5).
  { name: 'Brilliant Distinctions', href: 'https://www.brilliantdistinctionsprogram.com/', file: 'brilliant-distinctions' },
  { name: 'CosmetAssure', href: 'http://cosmetassure.com/', file: 'cosmetassure' },
  { name: 'Stony Point Surgery Center', href: 'http://www.stonypointsc.com/', file: 'stony-point' },
  { name: 'NeoGraft', href: 'http://neograft.com/', file: 'neograft' },
];
