// Turns an imported Markdown body into structured sections for the editorial page layout.
// Content is split at each H2. Blocks are classified (paragraph, image, list, table, question, ...) so the
// templates can lay them out as two-column image blocks, check-lists, card lists, accordions or card grids.
import { marked } from 'marked';

type Tok = any; // marked tokens are loosely typed

export type Block =
  | { type: 'p'; html: string; text: string }
  | { type: 'image'; src: string; alt: string; href?: string }
  | { type: 'list'; ordered: boolean; items: { html: string; title?: string; rest?: string }[] }
  | { type: 'sub'; depth: number; html: string; text: string; question: boolean }
  | { type: 'question'; html: string; text: string } // a bold-only paragraph ending in "?"
  | { type: 'quote'; html: string }
  | { type: 'table'; html: string };

export interface Section {
  id: string;
  /** Plain text of the H2 (undefined for the part of the intro that follows the lead). */
  heading?: string;
  question: boolean;
  blocks: Block[];
}

export type Part =
  | { kind: 'blocks'; blocks: Block[] }
  | { kind: 'accordion'; items: { id: string; q: string; blocks: Block[] }[] }
  | { kind: 'media'; items: { image: Extract<Block, { type: 'image' }>; blocks: Block[] }[] };

const strip = (md: string) =>
  md
    .replace(/\*\*/g, '')
    .replace(/[_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
export const slug = (s: string) =>
  strip(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'section';
const inline = (md: string) => marked.parseInline(md.replace(/\n/g, ' ')) as string;

function imageOf(tokens: Tok[]): { src: string; alt: string; href?: string } | null {
  const meaningful = tokens.filter((t) => !(t.type === 'text' && !t.raw.trim()));
  if (meaningful.length !== 1) return null;
  const t = meaningful[0];
  if (t.type === 'image') return { src: t.href, alt: t.text };
  if (t.type === 'link') {
    const inner = (t.tokens ?? []).filter((x: Tok) => !(x.type === 'text' && !x.raw.trim()));
    if (inner.length === 1 && inner[0].type === 'image') return { src: inner[0].href, alt: inner[0].text, href: t.href };
  }
  return null;
}

export function parseBody(md: string): { intro: Block[]; sections: Section[] } {
  const tokens = marked.lexer(md) as Tok[];
  const intro: Block[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;
  const used = new Set<string>();
  const push = (b: Block) => (current ? current.blocks : intro).push(b);

  for (const t of tokens) {
    if (t.type === 'space' || t.type === 'html') continue;
    if (t.type === 'heading' && t.depth <= 2) {
      const heading = strip(t.text);
      let id = slug(heading);
      while (used.has(id)) id += '-2';
      used.add(id);
      current = { id, heading, question: heading.endsWith('?'), blocks: [] };
      sections.push(current);
      continue;
    }
    if (t.type === 'heading') {
      const text = strip(t.text);
      push({ type: 'sub', depth: t.depth, html: inline(t.text), text, question: text.endsWith('?') });
      continue;
    }
    if (t.type === 'paragraph') {
      const img = imageOf(t.tokens ?? []);
      if (img) {
        push({ type: 'image', ...img });
        continue;
      }
      // A paragraph that mixes an inline image with text (the About page): the image becomes its own block.
      for (const x of (t.tokens ?? []) as Tok[]) if (x.type === 'image') push({ type: 'image', src: x.href, alt: x.text });
      const own = (t.tokens ?? []).some((x: Tok) => x.type === 'image');
      const paraMd: string = own ? t.text.replace(/!\[[^\]]*\]\([^)]*\)/g, '').trim() : t.text;
      if (own && !paraMd) continue;
      const meaningful = (t.tokens ?? []).filter((x: Tok) => !(x.type === 'text' && !x.raw.trim()) && x.type !== 'image');
      const text = strip(paraMd);
      if (meaningful.length === 1 && meaningful[0].type === 'strong' && text.endsWith('?')) {
        push({ type: 'question', html: inline(meaningful[0].text), text });
        continue;
      }
      push({ type: 'p', html: inline(paraMd), text });
      continue;
    }
    if (t.type === 'list') {
      const items = (t.items as Tok[]).map((it) => {
        const raw: string = it.text.trim();
        const m = raw.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
        if (m) {
          const title = strip(m[1]).replace(/[\s–—:-]+$/, '');
          const rest = m[2].replace(/^[–—:-]\s*/, '').trim();
          return { html: inline(raw), title, rest: rest ? inline(rest) : '' };
        }
        return { html: inline(raw) };
      });
      push({ type: 'list', ordered: Boolean(t.ordered), items });
      continue;
    }
    if (t.type === 'blockquote') {
      push({ type: 'quote', html: marked.parser(t.tokens) as string });
      continue;
    }
    if (t.type === 'table') {
      push({ type: 'table', html: marked.parser([t] as any) as string });
      continue;
    }
  }
  return { intro, sections };
}

/** Plain text of a block (for excerpts). */
export const blockText = (b: Block): string => (b.type === 'p' || b.type === 'question' || b.type === 'sub' ? b.text : b.type === 'list' ? b.items.map((i) => i.title ?? '').join(' ') : '');

/**
 * Group a section's blocks into layout parts:
 *  - question blocks (and sub-headings ending in "?") with their answers become one accordion
 *  - an image followed by text, repeated (the live travel guide listings), becomes a media card grid
 *  - everything else stays as ordinary blocks
 */
export function toParts(blocks: Block[], idPrefix: string): Part[] {
  const parts: Part[] = [];
  const plain: Block[] = [];
  const flush = () => {
    if (plain.length) parts.push({ kind: 'blocks', blocks: plain.splice(0) });
  };
  const images = blocks.filter((b) => b.type === 'image').length;
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    const isQ = b.type === 'question' || (b.type === 'sub' && b.question);
    if (isQ) {
      flush();
      const items: { id: string; q: string; blocks: Block[] }[] = [];
      while (i < blocks.length && (blocks[i].type === 'question' || (blocks[i].type === 'sub' && (blocks[i] as any).question))) {
        const q = blocks[i] as any;
        const body: Block[] = [];
        i++;
        while (i < blocks.length && !(blocks[i].type === 'question' || (blocks[i].type === 'sub' && (blocks[i] as any).question))) body.push(blocks[i++]);
        items.push({ id: `${idPrefix}-${slug(q.text)}`, q: q.text, blocks: body });
      }
      parts.push({ kind: 'accordion', items });
      continue;
    }
    if (b.type === 'image' && images >= 2) {
      flush();
      const items: { image: Extract<Block, { type: 'image' }>; blocks: Block[] }[] = [];
      while (i < blocks.length && blocks[i].type === 'image') {
        const image = blocks[i++] as Extract<Block, { type: 'image' }>;
        const body: Block[] = [];
        while (i < blocks.length && blocks[i].type !== 'image') body.push(blocks[i++]);
        items.push({ image, blocks: body });
      }
      parts.push({ kind: 'media', items });
      continue;
    }
    plain.push(b);
    i++;
  }
  flush();
  return parts;
}
