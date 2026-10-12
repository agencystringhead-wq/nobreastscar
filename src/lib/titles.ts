// Display titles: Title Case and no dashes. The live <title> (seoTitle) is untouched.
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'with']);

export function displayTitle(title: string): string {
  const s = title.replace(/\s+[–—-]\s+/g, ', ').replace(/\s+/g, ' ').trim();
  return s
    .split(' ')
    .map((w, i) => {
      if (/^[A-Z0-9]{2,}[?,.!]*$/.test(w)) return w; // FAQ, IDEAL, SSF
      const bare = w.toLowerCase().replace(/[^a-z]/g, '');
      if (i > 0 && SMALL.has(bare)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

/** Split a display title into plain text and the italic coral accent (the last word, or the last two in long titles). */
export function accentSplit(title: string): { plain: string; accent: string } {
  const words = title.split(' ');
  const n = words.length;
  const k = n >= 4 ? 2 : 1;
  return { plain: words.slice(0, n - k).join(' '), accent: words.slice(n - k).join(' ') };
}
