// The chapter the Explorar opens on: below the home cover and at /explorar. Isaías 9 holds the cover's verse
// (Isaías 9:6, the verse with the most links), so the home reads as one story. No data imports: next.config.ts uses it.
export const EXPLORE_HOME = { slug: "isaias", chapter: 9 } as const;

/** Chapters always prerendered, besides the most linked ones: the home centre and João 1 (Alex's reference image). */
export const EXPLORE_ALWAYS = [EXPLORE_HOME, { slug: "joao", chapter: 1 }] as const;

export const EXPLORE_HOME_PATH = `/explorar/${EXPLORE_HOME.slug}/${EXPLORE_HOME.chapter}`;

export function explorePath(slug: string, chapter: number): string {
  return `/explorar/${slug}/${chapter}`;
}

export function connectionPath(centre: { slug: string; chapter: number }, partner: { slug: string; chapter: number }): string {
  return `/explorar/${centre.slug}/${centre.chapter}/${partner.slug}/${partner.chapter}`;
}
