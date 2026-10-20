"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BASE } from "@/lib/community/books-client";
import { loadChapterText, loadVerseLinks } from "@/lib/community/fetchers";
import { longRef } from "@/lib/community/geometry";
import { barShare, keepBookNumber, votesLabel } from "@/lib/from-here";
import { FEED_PER_HUB, nextSection, partnersFromFlat, startFeed, type FeedCard, type FeedLoader, type FeedSection, type FeedState } from "@/lib/links-feed";
import type { Link as VerseLink } from "@/lib/reading";
import { Scripture } from "./Scripture";
import styles from "./reader.module.css";

// the chapter files of public/data, each fetched once per page load (lib/community/fetchers.ts)
const loader: FeedLoader = {
  async links(gv) {
    const { book, chapter, verse } = BASE.locate(gv);
    return partnersFromFlat((await loadVerseLinks(book.slug, chapter))[verse - 1] ?? []);
  },
  async text(gv) {
    const { book, chapter, verse } = BASE.locate(gv);
    return (await loadChapterText(book.slug, chapter))[verse - 1] ?? "";
  },
};

const pathOf = (gv: number) => {
  const { book, chapter, verse } = BASE.locate(gv);
  return `/${book.slug}/${chapter}/${verse}`;
};

/** The element that scrolls the list: the sheet on phones, the panel's column on wider screens. */
function scroller(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === "auto" || o === "scroll") return p;
  }
  return null;
}

const saveData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
const subscribe = () => () => {};

type Status = "idle" | "loading" | "error" | "end";

function Card({ card, max }: { card: FeedCard; max: number }) {
  return (
    <li className="bc-conn">
      <Link className="bc-conn__ref" href={pathOf(card.gv)} prefetch={false}>
        {longRef(BASE, card.gv)}
      </Link>
      <span className="bc-conn__votes">
        <span className="bc-conn__bar" style={{ "--w": barShare(card.votes, max) } as React.CSSProperties} aria-hidden="true" />
        {votesLabel(card.votes)}
      </span>
      <p className="bc-conn__text">
        <Scripture text={card.text} />
      </p>
    </li>
  );
}

/** One verse of the list and its strongest links that have not appeared yet. */
function Hub({ section, titleId }: { section: FeedSection; titleId: string }) {
  const label = longRef(BASE, section.hub);
  return (
    <section className={styles.hub} aria-labelledby={titleId} data-hub={section.hub}>
      <h4 id={titleId} className={styles.hubTitle} tabIndex={-1}>
        <Link href={pathOf(section.hub)} prefetch={false}>
          {keepBookNumber(label)}
        </Link>
      </h4>
      <p className={styles.hubWhy}>
        {section.from === null ? "O próximo versículo da Bíblia que ainda não apareceu" : `Ligado a ${longRef(BASE, section.from)} · ${votesLabel(section.votes)}`}
      </p>
      <p className={styles.hubText}>
        <Scripture text={section.text} />
      </p>
      <ol className="bc-conns" aria-label={`Ligações de ${label} que ainda não apareceram`}>
        {section.cards.map((c) => (
          <Card key={c.gv} card={c} max={section.cards[0].votes} />
        ))}
      </ol>
    </section>
  );
}

/**
 * The endless list under a verse's links (design §6.2, lib/links-feed.ts). When the verse's own list nears its end,
 * the links of each of its links come in, a section at a time and with their whole BLIVRE text, then the links of
 * those, without end. It fetches the chapter files of public/data (links and text), each once; with Save-Data on, a
 * section comes only when asked for. Without JavaScript nothing shows here: the verse's own list above is complete.
 */
export function LinksFeed({ origin, links }: { origin: number; links: readonly VerseLink[] }) {
  const client = useSyncExternalStore(subscribe, () => true, () => false);
  // the router keeps the verse left behind in the page, hidden: ids are this list's own, never another page's
  const uid = useId();
  const titleOf = (hub: number) => `${uid}seguir-${hub}`;
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const state = useRef<FeedState | null>(null);
  const busy = useRef(false);
  const asked = useRef(false);
  const end = useRef<HTMLDivElement>(null);

  const more = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setStatus("loading");
    try {
      const r = await nextSection(state.current ?? startFeed(origin, links.map(([gv, votes]) => ({ gv, votes })), BASE.verseCount), loader);
      if (!r) {
        setStatus("end");
        return;
      }
      state.current = r.state;
      const s = r.section;
      if (s) setSections((list) => [...list, s]);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, [origin, links]);

  // a section comes in when the end of the list is within one and a half screens; the observer is made again after
  // each load, so a short section that leaves the end in reach brings the next one
  useEffect(() => {
    const el = end.current;
    if (!client || !el || status !== "idle" || saveData()) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void more();
      },
      { root: scroller(el), rootMargin: "0px 0px 150% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [client, status, more]);

  // asked for with the button (keyboard, Save-Data): the new section's title takes the focus
  const count = sections.length;
  useEffect(() => {
    if (!asked.current || count === 0) return;
    asked.current = false;
    document.getElementById(`${uid}seguir-${sections[count - 1].hub}`)?.focus();
  }, [count, sections, uid]);

  return (
    <div className={styles.feed} aria-busy={status === "loading" || undefined}>
      {client && (
        <div className={styles.feedHead}>
          <h3 className="bc-section-title">
            Continue lendo
            <small>as ligações das ligações</small>
          </h3>
          <p className={styles.feedRule}>
            Agora vêm as ligações de cada versículo acima, na mesma ordem, e depois as dos que forem aparecendo, sem fim. Até{" "}
            {FEED_PER_HUB} por versículo, das mais votadas às menos votadas, sem repetir nenhum.
          </p>
        </div>
      )}
      {sections.map((s) => (
        <Hub key={s.hub} section={s} titleId={titleOf(s.hub)} />
      ))}
      <div ref={end} className={styles.feedEnd}>
        {client && status === "idle" && (
          <button
            type="button"
            className="bc-button bc-button--secondary"
            onClick={() => {
              asked.current = true;
              void more();
            }}
          >
            Continuar lendo
          </button>
        )}
        {status === "loading" && <p className={styles.feedNote}>Carregando mais ligações…</p>}
        {status === "error" && (
          <button
            type="button"
            className="bc-button bc-button--secondary"
            onClick={() => {
              asked.current = true;
              void more();
            }}
          >
            Tentar de novo
          </button>
        )}
        <p className={styles.feedNote} role="status">
          {status === "error" ? "Não deu para carregar as ligações." : status === "end" ? "Todos os versículos da Bíblia já apareceram nesta lista." : ""}
        </p>
      </div>
    </div>
  );
}
