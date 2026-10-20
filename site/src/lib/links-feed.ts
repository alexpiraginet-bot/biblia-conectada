// The endless list under a verse's links (/livro/cap/vers, design §6.2). After the verse's own links come the links of
// each of them, in the panel's order (most votes first), then the links of those, and so on: breadth-first through the
// OpenBible.info graph. Each section is one verse already shown (the hub) with its strongest links that have not
// appeared yet, so no verse is ever shown twice. When every verse reachable from the start has appeared (one of the
// graph's small islands), the list goes on from the next verse of the Bible, wrapping from Apocalipse 22:21 to
// Gênesis 1:1. Pure: components/reader/LinksFeed.tsx supplies the loaders, tests/links-feed.test.ts the real data.

/** cards in a section at most: the hub's strongest links that have not appeared yet */
export const FEED_PER_HUB = 8;
/** links without a positive vote stay out of the endless list (the verse's own list keeps every link) */
export const FEED_MIN_VOTES = 1;
/** verses tried by one call before it hands back without a section (each try may fetch a chapter) */
export const FEED_TRIES = 12;

export type FeedPartner = { gv: number; votes: number };

/** a verse whose links make a section; `from` is the verse it appeared under (null: taken as the next verse) */
export type FeedHub = { gv: number; from: number | null; votes: number };

export type FeedCard = { gv: number; votes: number; text: string };

export type FeedSection = {
  hub: number;
  /** the verse the hub appeared under, and the votes of that link; null when the list jumped to the next verse */
  from: number | null;
  votes: number;
  text: string;
  cards: FeedCard[];
};

export type FeedState = {
  /** the verses shown, and those that had nothing new once the queue ran out (they never will) */
  readonly seen: ReadonlySet<number>;
  /** hubs still to open, in the order their verses appeared */
  readonly queue: readonly FeedHub[];
  /** where the next verse is looked for when the queue runs out */
  readonly next: number;
  readonly verseCount: number;
};

export type FeedLoader = {
  /** every link of a verse, in any order */
  links(gv: number): Promise<readonly FeedPartner[]>;
  text(gv: number): Promise<string>;
};

/** The links of one verse in a chapter's verse-links file (public/data/verse-links/<slug>/<cap>.json): [gv, votes, …]. */
export function partnersFromFlat(flat: readonly number[]): FeedPartner[] {
  const out: FeedPartner[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ gv: flat[i], votes: flat[i + 1] });
  return out;
}

/** The state after the verse's own list: the verse and its partners have appeared, and the partners open next. */
export function startFeed(origin: number, partners: readonly FeedPartner[], verseCount: number): FeedState {
  return {
    seen: new Set([origin, ...partners.map((p) => p.gv)]),
    queue: partners.map((p) => ({ gv: p.gv, from: origin, votes: p.votes })),
    next: (origin + 1) % verseCount,
    verseCount,
  };
}

/** The partners a hub shows: positive votes, not seen yet, most votes first (then canonical order), at most `max`. */
export function newPartners(links: readonly FeedPartner[], seen: (gv: number) => boolean, max = FEED_PER_HUB): FeedPartner[] {
  return links
    .filter((p) => p.votes >= FEED_MIN_VOTES && !seen(p.gv))
    .sort((a, b) => b.votes - a.votes || a.gv - b.gv)
    .slice(0, max);
}

/**
 * The next section of the list and the state after it. `section` is null when the verses tried in this call had
 * nothing new to show (call again); the result is null when no verse is left that could show anything new (the whole
 * Bible has gone by). A loader that fails rejects the call and leaves `state` as it was, so it can be tried again.
 */
export async function nextSection(state: FeedState, load: FeedLoader, tries = FEED_TRIES): Promise<{ state: FeedState; section: FeedSection | null } | null> {
  const { verseCount } = state;
  // copied on the first change, so a call that fails leaves the state it was given as it was
  let seen = state.seen;
  let own: Set<number> | null = null;
  const mark = (gv: number) => {
    own ??= new Set(seen);
    own.add(gv);
    seen = own;
  };
  let queue = state.queue;
  let at = 0;
  let next = state.next;
  for (let t = 0; t < tries; t++) {
    let hub: FeedHub;
    if (at < queue.length) {
      hub = queue[at++];
    } else {
      // the queue ran out: the next verse that has not appeared, in the Bible's order
      let gv = next;
      let steps = 0;
      while (seen.has(gv) && steps < verseCount) {
        gv = (gv + 1) % verseCount;
        steps++;
      }
      if (seen.has(gv)) return null;
      next = (gv + 1) % verseCount;
      hub = { gv, from: null, votes: 0 };
    }
    const fresh = newPartners(await load.links(hub.gv), (gv) => gv === hub.gv || seen.has(gv));
    if (fresh.length === 0) {
      // the queue is empty, so every verse shown has been opened: a verse with nothing new now never gets anything
      // new, and is not tried again (this is how the list can end)
      if (hub.from === null) mark(hub.gv);
      continue;
    }
    const [text, ...texts] = await Promise.all([load.text(hub.gv), ...fresh.map((p) => load.text(p.gv))]);
    mark(hub.gv);
    for (const p of fresh) mark(p.gv);
    queue = [...queue.slice(at), ...fresh.map((p) => ({ gv: p.gv, from: hub.gv, votes: p.votes }))];
    return {
      state: { seen, queue, next, verseCount },
      section: { hub: hub.gv, from: hub.from, votes: hub.votes, text, cards: fresh.map((p, i) => ({ gv: p.gv, votes: p.votes, text: texts[i] })) },
    };
  }
  return { state: { seen, queue: queue.slice(at), next, verseCount }, section: null };
}
