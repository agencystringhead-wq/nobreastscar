import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Collections are filled by scripts/import-content.mjs in Phase 2.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    /** Live URL path with trailing slash, e.g. /procedures/anesthesia/ */
    path: z.string(),
    section: z.string().optional(),
  }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/caseStudies' }),
  schema: z.object({
    title: z.string(),
    // Confirm this maps 1:1 to the three gallery pages before locking it (SPEC §7).
    category: z.enum(['breast-enlargement', 'breast-lift', 'breast-lift-with-implants']),
    images: z.array(z.string()),
    age: z.number().optional(),
    implantSize: z.string().optional(),
    implantType: z.string().optional(),
    technique: z.string().optional(),
  }),
});

export const collections = { pages, caseStudies };
