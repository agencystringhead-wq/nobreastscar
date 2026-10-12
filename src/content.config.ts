import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Both collections are written by scripts/import-content.mjs from the live site (see docs/ASSETS.md).

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    /** Page heading as on the live page. */
    title: z.string(),
    /** The live <title>, kept for SEO. */
    seoTitle: z.string(),
    description: z.string().optional(),
    /** Live URL path with trailing slash, e.g. /procedures/anesthesia/ */
    path: z.string(),
    breadcrumb: z.array(z.object({ label: z.string(), href: z.string().optional() })).optional(),
    /** Intro copy shown under the title (Markdown). */
    lead: z.string().optional(),
    /** The "Ready to start this life changing process?" block that closes many live pages. */
    cta: z.object({ heading: z.string(), text: z.string() }).optional(),
    /** Section landing pages: the live tile image for each child page (path relative to the .md file). */
    tiles: z.array(z.object({ href: z.string(), image: z.string() })).optional(),
    /** True when the page body is generated from the case-study collection instead of imported. */
    generated: z.boolean().optional(),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/caseStudies' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      seoTitle: z.string(),
      description: z.string().optional(),
      path: z.string(),
      /**
       * Which live gallery pages list this study. The live site is not 1:1: Breast Enlargement and
       * Breast Lift with Implants list the same 10 studies and Breast Lift lists all 26.
       */
      galleries: z.array(z.enum(['breast-enlargement', 'breast-lift', 'breast-lift-with-implants'])),
      /** Live display order (newest first), taken from /gallery/breast-lift/. */
      order: z.number(),
      /** Position of this study on each live gallery page that lists it (live order). */
      galleryOrder: z.record(z.string(), z.number()).optional(),
      /** The large lead image of the live case study (a before/after composite). Never cropped on the case page. */
      featured: image(),
      /** The live gallery card image (the live site uses the featured file). */
      thumbnail: image().optional(),
      /** Every image in the live "Images" section, in live order. */
      images: z.array(image()),
      age: z.string().optional(),
      gender: z.string().optional(),
      ethnicity: z.string().optional(),
      height: z.string().optional(),
      weight: z.string().optional(),
      /** The next three are read from the live title only when it states them. */
      implantSize: z.string().optional(),
      implantType: z.enum(['saline', 'silicone']).optional(),
      technique: z.string().optional(),
    }),
});

export const collections = { pages, caseStudies };
