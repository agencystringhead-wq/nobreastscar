// Single source of truth for NAP, phone, GTM and JotForm IDs (SPEC §8).
export const site = {
  name: 'No Breast Scar',
  practice: 'Richmond Breast Enhancement Center',
  director: 'Dr. Gregory Lynam',
  tagline: 'Richmond, VA',
  phone: '(804) 560-5260',
  phoneHref: 'tel:+18045605260',
  address: {
    street: '8720 Stony Point Parkway',
    suite: 'Suite 100',
    city: 'Richmond',
    region: 'VA',
    zip: '23235',
  },
  mapsUrl: 'https://maps.google.com/?q=8720+Stony+Point+Parkway+Suite+100+Richmond+VA+23235',
  gtmId: 'GTM-KGR42B5',
  /** From OpenStreetMap (Nominatim) for 8720 Stony Point Parkway, Richmond, VA 23235. */
  geo: { latitude: 37.5510712, longitude: -77.5637009 },
  realSelf: 'https://www.realself.com/find/Virginia/Richmond/Plastic-Surgeon/Gregory-Lynam',
  jotformId: '62864268680467',
  jotformTitle: 'No Scar Contact Form',
  productionUrl: 'https://nobreastscar.com',
  agency: { name: 'Medical Advertising Agency', url: 'https://medicaladvertising.agency/' },
  utilityText: 'No-cost internet consultation · Patients travel from all over the world',
  network: [
    { label: 'RichmondSurgicalArts.com', href: 'https://www.richmondsurgicalarts.com' },
    { label: 'NoBreastScar.com', href: 'https://nobreastscar.com/' },
    { label: 'Quenchiv.com', href: 'https://www.quenchiv.com/' },
    { label: 'RichmondBHRT.com', href: 'https://www.richmondbhrt.com/' },
  ],
} as const;
