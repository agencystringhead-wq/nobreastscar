// Sitewide schema.org structured data: the clinic and its physician. Every value comes from the live site
// (NAP, RealSelf profile, training) except the coordinates, which are from OpenStreetMap for the same address.
import { site } from '../data/site';

const base = site.productionUrl;

export function siteGraph() {
  const clinicId = `${base}/#clinic`;
  const doctorId = `${base}/about/#dr-gregory-lynam`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MedicalClinic',
        '@id': clinicId,
        name: `${site.name} | ${site.practice}`,
        url: `${base}/`,
        logo: { '@type': 'ImageObject', url: `${base}/logo.webp`, width: 600, height: 200 },
        image: `${base}/og-default.webp`,
        telephone: '+1-804-560-5260',
        address: {
          '@type': 'PostalAddress',
          streetAddress: `${site.address.street}, ${site.address.suite}`,
          addressLocality: site.address.city,
          addressRegion: site.address.region,
          postalCode: site.address.zip,
          addressCountry: 'US',
        },
        geo: { '@type': 'GeoCoordinates', latitude: site.geo.latitude, longitude: site.geo.longitude },
        hasMap: site.mapsUrl,
        medicalSpecialty: 'https://schema.org/PlasticSurgery',
        sameAs: [site.realSelf],
        employee: { '@id': doctorId },
      },
      {
        '@type': ['Physician', 'Person'],
        '@id': doctorId,
        name: site.director,
        url: `${base}/about/`,
        medicalSpecialty: 'https://schema.org/PlasticSurgery',
        telephone: '+1-804-560-5260',
        worksFor: { '@id': clinicId },
        alumniOf: [
          { '@type': 'CollegeOrUniversity', name: 'University of Richmond' },
          { '@type': 'CollegeOrUniversity', name: 'Medical College of Virginia' },
        ],
        sameAs: [site.realSelf],
      },
    ],
  };
}
