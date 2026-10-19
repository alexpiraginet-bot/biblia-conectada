// Mesa da semana: the links of a chapter to other chapters, from public/data/verse-links/<slug>/<cap>.json.

/** a link of the passage: a verse of the chapter, a verse elsewhere, the votes (sum of both directions) */
export type MesaLink = { key: string; here: number; there: number; votes: number };

/**
 * Every link from a verse of the chapter to a verse of another chapter, most votes first (then canonical order).
 * `perVerse` is the chapter's verse-links file; `first` the global index of its verse 1.
 */
export function mesaLinks(perVerse: readonly (readonly number[])[], first: number): MesaLink[] {
  const end = first + perVerse.length;
  const links: MesaLink[] = [];
  perVerse.forEach((flat, i) => {
    for (let k = 0; k < flat.length; k += 2) {
      const there = flat[k];
      if (there >= first && there < end) continue; // links inside the passage are left out
      links.push({ key: `${first + i}-${there}`, here: first + i, there, votes: flat[k + 1] });
    }
  });
  return links.sort((a, b) => b.votes - a.votes || a.here - b.here || a.there - b.there);
}
