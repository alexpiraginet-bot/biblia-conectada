"use client";

// What the sculpture's panel says (beside the canvas from 48rem, a sheet on phones): one verse with its BLIVRE text and
// every link it has, most votes first, or one chapter with its verses ranked by links. Presentational: the page
// (Sculpture.tsx) owns the selection, the focus and the fetching of the verses' text.
import Link from "next/link";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { BASE } from "@/lib/community/books-client";
import { loadChapterText } from "@/lib/community/fetchers";
import { longRef } from "@/lib/community/geometry";
import type { ChapterLink, Partner } from "./arcs";
import { chapterLabel, hashOf, ligacoes, votos, type Filter } from "./state";
import styles from "./sculpture.module.css";

export const PAGE = 20;

type Listed = Partner & { i: number };

export function VersePanel({
  gv,
  nt,
  partners,
  text,
  snippets,
  filter,
  onFilter,
  listed,
  counts,
  shown,
  onMore,
  focus,
  onFocus,
  onChapter,
  copied,
  onCopy,
  headingId,
  headingRef,
}: {
  gv: number;
  nt: boolean | null;
  partners: Partner[] | null;
  text: string | null;
  snippets: ReadonlyMap<number, string>;
  filter: Filter;
  onFilter: (f: Filter) => void;
  listed: Listed[];
  counts: Record<Filter, number>;
  shown: number;
  onMore: () => void;
  focus: number;
  onFocus: (i: number) => void;
  onChapter: () => void;
  copied: boolean;
  onCopy: () => void;
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const { book, chapter } = BASE.locate(gv);
  const chap = `${book.name} ${chapter}`;
  return (
    <>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.ref}>
        {longRef(BASE, gv)}
      </h2>
      <p className={styles.meta}>
        {nt === null ? "" : nt ? "Novo Testamento" : "Antigo Testamento"}
        {partners ? ` · ${ligacoes(partners.length)}` : ""}
      </p>
      <blockquote className={styles.scripture}>{text ?? "…"}</blockquote>
      <p className={styles.actions}>
        <Link href={`/${book.slug}/${chapter}`} className={styles.act}>
          Ler {chap}
        </Link>
        <button type="button" className={styles.act} onClick={onCopy}>
          {copied ? "Link copiado" : "Copiar link"}
        </button>
      </p>
      {partners && partners.length > 0 && (
        <>
          <div className={styles.filters} role="group" aria-label="Filtrar ligações">
            {(["todas", "antigo", "novo"] as const).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} disabled={counts[f] === 0} onClick={() => onFilter(f)}>
                {f === "todas" ? "Todas" : f === "antigo" ? "Antigo" : "Novo"} <span>{formatInt(counts[f])}</span>
              </button>
            ))}
          </div>
          <ol className={styles.list}>
            {listed.slice(0, shown).map((p) => (
              <li key={p.gv}>
                <button type="button" className={styles.item} aria-pressed={focus === p.i} onClick={() => onFocus(focus === p.i ? -1 : p.i)}>
                  <span className={styles.itemRef}>{longRef(BASE, p.gv)}</span>
                  <span className={styles.itemVotes}>{votos(p.votes)}</span>
                  <span className={styles.itemText}>{snippets.get(p.gv) ?? "…"}</span>
                </button>
              </li>
            ))}
          </ol>
          {listed.length > shown && (
            <button type="button" className={styles.more} onClick={onMore}>
              Mostrar mais {formatInt(Math.min(PAGE, listed.length - shown))} de {formatInt(listed.length - shown)}
            </button>
          )}
        </>
      )}
      {partners && partners.length === 0 && <p className={styles.meta}>Este versículo não tem ligações na OpenBible.info.</p>}
      <button type="button" className={styles.chapterLink} onClick={onChapter}>
        Ver as ligações de {chap} inteiro
      </button>
    </>
  );
}

export function ChapterPanel({
  ci,
  nch,
  first,
  verses,
  links,
  full,
  onVerse,
  onChapter,
  headingId,
  headingRef,
}: {
  ci: number;
  /** how many chapters the Bible has (the last one has no next) */
  nch: number;
  /** global index of the chapter's verse 1, and how many verses it has */
  first: number;
  verses: number;
  links: ChapterLink[] | null;
  /** false while only the most voted arcs are loaded */
  full: boolean;
  onVerse: (gv: number) => void;
  /** open another chapter (the previous or the next: a tap on the axis lands near, these make it exact) */
  onChapter: (ci: number) => void;
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const c = chapterLabel(ci);
  const [text, setText] = useState<{ ci: number; verses: string[] } | null>(null);
  useEffect(() => {
    let live = true;
    loadChapterText(c.book.slug, c.chapter)
      .then((t) => live && setText({ ci, verses: t }))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [ci, c.book.slug, c.chapter]);
  const ranked = useMemo(() => {
    if (!links) return [];
    const count = new Array<number>(verses).fill(0);
    for (const l of links) count[l.here - first]++;
    return count
      .map((k, v) => ({ gv: first + v, v: v + 1, k }))
      .filter((x) => x.k > 0)
      .sort((p, q) => q.k - p.k || p.v - q.v);
  }, [links, first, verses]);
  const lines = text?.ci === ci ? text.verses : null;
  return (
    <>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.ref}>
        {c.label}
      </h2>
      <p className={styles.meta}>
        {formatInt(verses)} versículos
        {links ? ` · ${ligacoes(links.length)}${full ? "" : " entre as mais votadas"}` : ""}
      </p>
      <p className={styles.actions}>
        <Link href={c.path} className={styles.act}>
          Ler {c.label}
        </Link>
      </p>
      <nav className={`bc-pager ${styles.pager}`} aria-label="Capítulo anterior e seguinte">
        {ci > 0 ? <PagerLink ci={ci - 1} rel="prev" onChapter={onChapter} /> : <span />}
        {ci < nch - 1 ? <PagerLink ci={ci + 1} rel="next" onChapter={onChapter} /> : <span />}
      </nav>
      <ol className={styles.list}>
        {ranked.map((x) => (
          <li key={x.gv}>
            <button type="button" className={styles.item} onClick={() => onVerse(x.gv)}>
              <span className={styles.itemRef}>
                {c.label}:{x.v}
              </span>
              <span className={styles.itemVotes}>{ligacoes(x.k)}</span>
              <span className={styles.itemText}>{lines?.[x.v - 1] ?? "…"}</span>
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

/** A neighbouring chapter: its address in the sculpture, opened in place (no history entry, like every selection). */
function PagerLink({ ci, rel, onChapter }: { ci: number; rel: "prev" | "next"; onChapter: (ci: number) => void }) {
  return (
    <a
      href={hashOf({ kind: "chapter", ci })}
      rel={rel}
      onClick={(e) => {
        e.preventDefault();
        onChapter(ci);
      }}
    >
      <small className={styles.pagerWay}>
        {rel === "prev" && <Icon name="chev-l" className={`bc-icon ${styles.pagerIcon}`} />}
        {rel === "prev" ? "Anterior" : "Seguinte"}
        {rel === "next" && <Icon name="chev-r" className={`bc-icon ${styles.pagerIcon}`} />}
      </small>
      <strong>{chapterLabel(ci).label}</strong>
    </a>
  );
}
