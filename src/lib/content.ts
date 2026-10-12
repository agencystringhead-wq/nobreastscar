// Helpers shared by the inner-page templates. All text comes from the imported collections.
import { getCollection, type CollectionEntry } from 'astro:content';
import { marked } from 'marked';

export type Page = CollectionEntry<'pages'>;
export type CaseStudy = CollectionEntry<'caseStudies'>;

/** Markdown to plain text: links, bold, headings and list markers removed. */
export function plain(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/^\s*-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First paragraph of a Markdown body as plain text, cut at a word boundary. */
export function excerpt(md: string, max = 170): string {
  const paras = md
    .split(/\n{2,}/)
    .map((p) => plain(p))
    .filter((p) => p && !/^(Browse|View more)/i.test(p));
  const text = paras[0] ?? '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:\s–-]+$/, '') + '…';
}

/** Inline Markdown (links, bold) to safe HTML. */
export function mdInline(md: string): string {
  return marked.parseInline(md.replace(/\n/g, ' ')) as string;
}
/** Block Markdown to HTML. */
export function mdBlock(md: string): string {
  return marked.parse(md) as string;
}

export async function allPages(): Promise<Page[]> {
  return getCollection('pages');
}
export async function pageByPath(path: string): Promise<Page | undefined> {
  return (await allPages()).find((p) => p.data.path === path);
}
export async function studies(): Promise<CaseStudy[]> {
  return (await getCollection('caseStudies')).sort((a, b) => a.data.order - b.data.order);
}

export const galleryLabels: Record<string, string> = {
  'breast-enlargement': 'Breast Enlargement',
  'breast-lift': 'Breast Lift',
  'breast-lift-with-implants': 'Breast Lift with Implants',
};

/**
 * The gallery a case study is shown under: the narrowest live gallery page that lists it
 * (Breast Enlargement, then Breast Lift with Implants, then Breast Lift which lists every study).
 */
export function primaryGallery(s: CaseStudy): string {
  const g = s.data.galleries;
  return g.includes('breast-enlargement') ? 'breast-enlargement' : g.includes('breast-lift-with-implants') ? 'breast-lift-with-implants' : 'breast-lift';
}

/** Meta description: the live one, unless it is empty or WordPress leftovers; then the page's own first paragraph. */
export function metaDescription(live: string | undefined, body: string, max = 155): string {
  if (live && !/was last modified/i.test(live)) return live;
  return excerpt(body, max);
}

/** Questions and answers from the imported FAQ page (Markdown: "## Question" followed by paragraphs and lists). */
export interface Faq {
  q: string;
  html: string;
  text: string;
}
export function faqFromBody(body: string): Faq[] {
  return body
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const [q, ...rest] = part.split('\n');
      const md = rest.join('\n').trim();
      return { q: plain(q), html: mdBlock(md), text: plain(md) };
    });
}
