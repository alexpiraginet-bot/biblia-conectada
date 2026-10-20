// The eight book groups along the sculpture's axis, from Pentateuco to Apocalipse: the groups of the medallions
// (src/data/medalhoes.json, from Theographic's bookDiv). A group is not always one stretch of the canon: Theographic
// counts Lamentações among the poetic books, so the Profetas run in two stretches with it between them. The axis draws
// one band per stretch and names each group once, on its longest stretch. The page reads the groups on the server and
// hands them over (medalhoes.json stays out of the browser bundles); the poster script reads the same file. Pure, no
// DOM (tests/sculpture-plus.test.ts).

/** A stretch of consecutive books of one group, as a range of chapters on the axis: [first, end). */
export type AxisGroup = { id: string; name: string; first: number; end: number };

type BookLike = { osis: string; firstChapter: number; verses: readonly number[] };

/** The stretches of consecutive books with the same group, in canon order; throws when a book has no group. */
export function axisGroups(books: readonly BookLike[], groupOf: (osis: string) => string | null, nameOf: (id: string) => string): AxisGroup[] {
  const out: AxisGroup[] = [];
  for (const b of books) {
    const id = groupOf(b.osis);
    if (!id) throw new Error(`axis groups: ${b.osis} has no group`);
    const end = b.firstChapter + b.verses.length;
    const last = out[out.length - 1];
    if (last?.id === id) last.end = end;
    else out.push({ id, name: nameOf(id), first: b.firstChapter, end });
  }
  return out;
}

/** Each group once, in the order it first appears, with its longest stretch (where its name goes on the axis). */
export function groupNames(stretches: readonly AxisGroup[]): AxisGroup[] {
  const best = new Map<string, AxisGroup>();
  for (const s of stretches) {
    const b = best.get(s.id);
    if (!b || s.end - s.first > b.end - b.first) best.set(s.id, s);
  }
  return [...best.values()].sort((p, q) => stretches.findIndex((s) => s.id === p.id) - stretches.findIndex((s) => s.id === q.id));
}
