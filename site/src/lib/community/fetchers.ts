// Browser-side loading of the public data the community pages need, each file fetched once per page load.
import type { PonteCalendar, PonteFile } from "./ponte";

const cache = new Map<string, Promise<unknown>>();
function get<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`);
      return r.json() as Promise<T>;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export const loadBridge = (n: number) => get<PonteFile>(`/data/ponte/${n}.json`);
export const loadCalendar = () => get<PonteCalendar>("/data/ponte/calendar.json");
/** links of every verse of a chapter: [partner, votes, partner, votes, …], most votes first */
export const loadVerseLinks = (slug: string, chapter: number) => get<number[][]>(`/data/verse-links/${slug}/${chapter}.json`);
/** BLIVRE text of every verse of a chapter */
export const loadChapterText = (slug: string, chapter: number) => get<string[]>(`/data/text/${slug}/${chapter}.json`);

/** Votes of the link between two verses, or undefined when they are not linked (`links` = one verse's flat list). */
export function linkVotes(links: readonly number[] | undefined, partner: number): number | undefined {
  if (!links) return undefined;
  for (let i = 0; i < links.length; i += 2) if (links[i] === partner) return links[i + 1];
  return undefined;
}
