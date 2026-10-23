/** Counts from the complete, small verse-links file of one chapter, never from the canvas's top-N sample.
 * A connection is an unordered pair of distinct verses, with any vote. Internal pairs appear in both rows
 * of the file and must count only once in the chapter total; each endpoint still counts its partner. */
export function chapterConnectionCounts(first: number, rows: readonly (readonly number[])[]) {
  const pairs = new Set<string>();
  const byVerse = rows.map((row, i) => {
    const here = first + i;
    const partners = new Set<number>();
    for (let j = 0; j + 1 < row.length; j += 2) {
      const there = row[j];
      if (there === here) continue;
      partners.add(there);
      pairs.add(here < there ? `${here}:${there}` : `${there}:${here}`);
    }
    return partners.size;
  });
  return { total: pairs.size, byVerse };
}
