// Shared by the header mega menus and the footer sitemap (SPEC §4, §6).
export interface NavLink {
  label: string;
  href: string;
  /** Longer label used in the footer sitemap, matching the live site wording. */
  footerLabel?: string;
}
export interface NavGroup {
  heading: string;
  href?: string;
  links: NavLink[];
}
export interface NavItem {
  label: string;
  href: string;
  groups?: NavGroup[];
}

export const procedureTechniques: NavLink[] = [
  { label: 'Transaxillary', footerLabel: 'No Scar Breast Augmentation, Transaxillary', href: '/procedures/no-scar-breast-augmentation-transaxillary/' },
  { label: 'Beneath Breast', footerLabel: 'Minimal Scar, Beneath Breast', href: '/procedures/minimal-scar-beneath-breast/' },
  { label: 'Periareolar', footerLabel: 'Minimal Scar, Periareolar Incision', href: '/procedures/minimal-scar-periaerolar-incision/' },
  { label: 'Anesthesia', href: '/procedures/anesthesia/' },
];
export const yourSurgery: NavLink[] = [
  { label: 'Ready For Surgery?', href: '/procedures/ready-for-surgery/' },
  { label: 'Day Of Surgery', href: '/procedures/day-of-surgery/' },
  { label: 'Recovery and Post Op', href: '/procedures/recovery-and-post-op/' },
  { label: 'Exercise Post Op', href: '/procedures/exercise-post-op/' },
];
export const implantTypes: NavLink[] = [
  { label: 'Saline', footerLabel: 'Saline Implants', href: '/implants/saline-implants/' },
  { label: 'Silicone', footerLabel: 'Silicone Implants', href: '/implants/silicone-implants/' },
  { label: 'Ideal', footerLabel: 'Ideal Implants', href: '/implants/ideal-implants/' },
  { label: 'Gummy Bear', footerLabel: 'Gummy Bear Implants', href: '/implants/gummy-bear-implants/' },
  { label: 'Implant FAQ', href: '/implants/implant-faq/' },
  { label: 'How long do they last?', href: '/implants/how-long-do-they-last/' },
];
export const implantChoosing: NavLink[] = [
  { label: 'Silicone vs Saline', href: '/implants/silicone-vs-saline/' },
  { label: 'Teardrop vs Round', footerLabel: 'Teardrop Shaped vs Round', href: '/implants/tear-drop-shaped-vs-round/' },
  { label: 'Textured vs Smooth', href: '/implants/textured-vs-smooth/' },
  { label: 'Choosing the right size', href: '/implants/choosing-the-right-size/' },
  { label: 'Choosing the right type', href: '/implants/choosing-the-right-type/' },
];
export const galleryLinks: NavLink[] = [
  { label: 'Breast Enlargement', href: '/gallery/breast-enlargement/' },
  { label: 'Breast Lift', href: '/gallery/breast-lift/' },
  { label: 'Breast Lift with Implants', href: '/gallery/breast-lift-with-implants/' },
];
export const aboutLinks: NavLink[] = [
  { label: 'Reviews', href: '/about/reviews/' },
  { label: 'Testimonials', href: '/about/testimonials/' },
];

export const nav: NavItem[] = [
  {
    label: 'Procedures',
    href: '/procedures/',
    groups: [
      { heading: 'Techniques', links: procedureTechniques },
      { heading: 'Your surgery', links: yourSurgery },
    ],
  },
  {
    label: 'Implants',
    href: '/implants/',
    groups: [
      { heading: 'Types', links: implantTypes },
      { heading: 'Choosing', links: implantChoosing },
    ],
  },
  { label: 'Gallery', href: '/gallery/', groups: [{ heading: 'Categories', links: galleryLinks }] },
  { label: 'Travel', href: '/travel/' },
  { label: 'About', href: '/about/', groups: [{ heading: 'About', links: aboutLinks }] },
  { label: 'Contact', href: '/contact/' },
];

/** Footer sitemap columns: Procedures (8), Implants (6), Choosing an implant (5), Gallery (3), About (5). */
export const footerColumns: NavGroup[] = [
  { heading: 'Procedures', href: '/procedures/', links: [...procedureTechniques, ...yourSurgery] },
  { heading: 'Implants', href: '/implants/', links: implantTypes },
  { heading: 'Choosing an implant', links: implantChoosing },
  { heading: 'Gallery', href: '/gallery/', links: galleryLinks },
  {
    heading: 'About',
    href: '/about/',
    links: [
      ...aboutLinks,
      { label: 'Travel', href: '/travel/' },
      { label: 'Contact', href: '/contact/' },
      { label: 'Sitemap', href: '/site-map/' },
    ],
  },
];

/** Travel guide pages that exist on the live site (all under the Travel nav item). */
export const travelLinks: NavLink[] = [
  { label: 'Travel', href: '/travel/' },
  { label: 'Travel Kit', href: '/travel/travel-kit/' },
  { label: 'Hotels', href: '/hotels/' },
  { label: 'Restaurants', href: '/restaurants/' },
  { label: 'Airlines', href: '/airlines/' },
  { label: 'Car Rentals', href: '/car-rentals/' },
  { label: 'Entertainment and Landmarks', href: '/entertainment-and-landmarks/' },
];

export interface SiteSection {
  key: string;
  title: string;
  href: string;
  links: NavLink[];
}

/** Sections used by the page sidebar and the section landing pages. */
export const sections: SiteSection[] = [
  { key: 'procedures', title: 'Procedures', href: '/procedures/', links: [...procedureTechniques, ...yourSurgery] },
  { key: 'implants', title: 'Implants', href: '/implants/', links: [...implantTypes, ...implantChoosing] },
  { key: 'gallery', title: 'Gallery', href: '/gallery/', links: galleryLinks },
  { key: 'about', title: 'About', href: '/about/', links: aboutLinks },
  { key: 'travel', title: 'Travel', href: '/travel/', links: travelLinks.slice(1) },
];

/** The section a path belongs to, or undefined (contact, site map and the home page have none). */
export function sectionOf(path: string): SiteSection | undefined {
  if (['/hotels/', '/restaurants/', '/airlines/', '/car-rentals/', '/entertainment-and-landmarks/'].includes(path)) return sections.find((s) => s.key === 'travel');
  return sections.find((s) => path === s.href || path.startsWith(s.href));
}
