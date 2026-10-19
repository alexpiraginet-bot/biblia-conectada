// Data of the community pages (no accounts, nothing on a server): the trail "Antes do Natal", the Ponte calendar and
// the links of every chapter that the bridge strip and the Mesa da semana fetch in the browser.
// Called once by scripts/build-data.ts; tests/community.test.ts and tests/ponte.test.ts check what it writes.
import { join } from "node:path";
import { createGrid } from "../../src/lib/canon/grid";
import {
  PONTE_DAYS,
  PONTE_LAUNCH,
  PONTE_TIME_ZONE,
  bridgeNumber,
  encodeDistances,
  saoPauloDate,
  type PonteBuilt,
  type PonteCalendar,
  type PonteFile,
} from "../../src/lib/community/ponte";
import type { TrailFile } from "../../src/lib/community/trail";
import type { Canon } from "./canon";
import { ponteCalendar, type VerseLinks } from "./ponte";
import { OUT } from "./sources";
import { TRAIL, bestPairsPerBook, trailSteps } from "./trilha";

export const COMMUNITY_OUT = {
  /** read by the pages at build time */
  trail: join(OUT.generated, "community", `trilha-${TRAIL.slug}.json`),
  ponteBuilt: join(OUT.generated, "community", "ponte-built.json"),
  /** fetched by the browser */
  ponteDir: join(OUT.publicData, "ponte"),
  verseLinksDir: join(OUT.publicData, "verse-links"),
};

export const VOTE_DEFINITION = "soma dos votos das duas direções, a mesma do painel de ligações";

export function buildCommunity(
  input: { canon: Canon; text: string[]; links: VerseLinks; now?: Date },
  write: (path: string, data: string | Uint8Array) => void,
  log: (msg: string) => void,
) {
  const { canon, text, links } = input;
  const grid = createGrid(canon.books);
  const bookOf = (gv: number) => grid.locate(gv).book.index;
  const chapterOf = (gv: number) => {
    const { book, chapter } = grid.locate(gv);
    return book.firstChapter + chapter - 1;
  };
  const json = (v: unknown) => JSON.stringify(v);

  // ---- trail
  const perBook = bestPairsPerBook(links, canon.books, bookOf);
  const steps = trailSteps(perBook, canon.books);
  const trail: TrailFile = {
    slug: TRAIL.slug,
    title: TRAIL.title,
    definition: VOTE_DEFINITION,
    firstDate: steps[0].date,
    lastDate: steps[steps.length - 1].date,
    otBooksWithPairs: perBook.length,
    steps: steps.map((s) => ({
      step: s.step,
      date: s.date,
      book: s.book,
      votes: s.votes,
      pairs: s.pairs,
      ot: { gv: s.ot, text: text[s.ot] },
      nt: { gv: s.nt, text: text[s.nt] },
    })),
  };
  write(COMMUNITY_OUT.trail, json(trail));
  log(`trail: ${steps.length} steps from ${perBook.length} Old Testament books, ${trail.firstDate} to ${trail.lastDate}`);

  // ---- links of each chapter, per verse: [partner, votes, partner, votes, …], most votes first
  for (const book of canon.books) {
    book.verses.forEach((n, c) => {
      const first = canon.chapterFirst[book.firstChapter + c];
      const perVerse = Array.from({ length: n }, (_, v) => links[first + v].flatMap(([p, w]) => [p, w]));
      write(join(COMMUNITY_OUT.verseLinksDir, book.slug, `${c + 1}.json`), json(perVerse));
    });
  }

  // ---- Ponte nº N
  const bridges = ponteCalendar(links, {
    isOT: (gv) => canon.books[bookOf(gv)].testament === "AT",
    chapterOf,
    textLength: (gv) => text[gv].length,
  });
  const builtOn = saoPauloDate(input.now ?? new Date());
  const builtThrough = Math.max(0, Math.min(PONTE_DAYS, bridgeNumber(builtOn)));
  const calendar: PonteCalendar = {
    format: "biblia-conectada/ponte-calendar@1",
    launch: PONTE_LAUNCH,
    timeZone: PONTE_TIME_ZONE,
    builtThrough,
    bridges: bridges.map((b) => [b.start, b.target, b.min]),
    definition: `ligações com qualquer voto (as mesmas do painel de leitura); votos de uma ligação: ${VOTE_DEFINITION}`,
  };
  write(join(COMMUNITY_OUT.ponteDir, "calendar.json"), json(calendar));
  for (const b of bridges) {
    const verses = new Set([b.start, b.target, ...b.strongest]);
    const file: PonteFile = {
      format: "biblia-conectada/ponte@1",
      n: b.n,
      date: b.date,
      start: b.start,
      target: b.target,
      min: b.min,
      routes: b.routes,
      strongest: b.strongest,
      strongestVotes: b.strongestVotes,
      texts: Object.fromEntries([...verses].sort((x, y) => x - y).map((gv) => [String(gv), text[gv]])),
      dist: encodeDistances(b.dist),
    };
    write(join(COMMUNITY_OUT.ponteDir, `${b.n}.json`), json(file));
  }
  const built: PonteBuilt = {
    builtOn,
    builtThrough,
    bridges: bridges.slice(0, builtThrough).map((b) => ({
      n: b.n,
      date: b.date,
      start: b.start,
      target: b.target,
      min: b.min,
      texts: [text[b.start], text[b.target]],
    })),
  };
  write(COMMUNITY_OUT.ponteBuilt, json(built));
  const byMin = [3, 4, 5].map((m) => `${m}: ${bridges.filter((b) => b.min === m).length}`).join(", ");
  log(`ponte: ${bridges.length} bridges from ${PONTE_LAUNCH} (fewest hops ${byMin}); pages up to nº ${builtThrough} (${builtOn})`);
}
