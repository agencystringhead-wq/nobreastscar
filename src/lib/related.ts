// Cards for a section's child pages: the page's own title and first lines, plus the real image the live site
// used for that page (its landing-page tile), or the page's first photo, or nothing (the card shows a coloured tile).
import { allPages, excerpt, type Page } from './content';
import { sections, sectionOf, type SiteSection } from '../data/nav';
import { resolveImage, isPhotoShaped } from './images';
import { displayTitle } from './titles';
import { parseBody } from './blocks';
import type { CardItem } from '../components/CardGrid.astro';

async function firstPhoto(page: Page): Promise<ImageMetadata | undefined> {
  const { intro, sections: secs } = parseBody(page.body ?? '');
  for (const b of [...intro, ...secs.flatMap((s) => s.blocks)]) {
    if (b.type === 'image') {
      const m = await resolveImage(b.src);
      if (m && isPhotoShaped(m)) return m;
    }
  }
  return undefined;
}

/** Tile images from every landing page: href -> image path. */
async function tileMap(pages: Page[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const p of pages) for (const t of p.data.tiles ?? []) map.set(t.href, t.image);
  return map;
}

export async function cardFor(href: string, label: string, pages: Page[], tiles: Map<string, string>): Promise<CardItem> {
  const page = pages.find((p) => p.data.path === href);
  const image = (await resolveImage(tiles.get(href))) ?? (page ? await firstPhoto(page) : undefined);
  return {
    href,
    title: page ? displayTitle(page.data.title) : label,
    excerpt: page ? excerpt(page.body ?? '', 130) || (page.data.description ?? '').slice(0, 130) : undefined,
    image,
  };
}

/** Every child page of a section (for landing pages). */
export async function childCards(section: SiteSection): Promise<CardItem[]> {
  const pages = await allPages();
  const tiles = await tileMap(pages);
  return Promise.all(section.links.filter((l) => l.href !== section.href).map((l) => cardFor(l.href, l.label, pages, tiles)));
}

/** "More in <section>": the siblings that follow the current page (wrapping round), up to six. */
export async function relatedCards(path: string, limit = 6): Promise<{ title: string; items: CardItem[] } | null> {
  const section = sectionOf(path);
  if (!section) return null;
  const links = section.links.filter((l) => l.href !== section.href);
  const idx = links.findIndex((l) => l.href === path);
  const ordered = idx < 0 ? links : [...links.slice(idx + 1), ...links.slice(0, idx)];
  const pages = await allPages();
  const tiles = await tileMap(pages);
  const items = await Promise.all(ordered.slice(0, limit).map((l) => cardFor(l.href, l.label, pages, tiles)));
  return items.length ? { title: `More in ${section.title}`, items } : null;
}

export { sections };
