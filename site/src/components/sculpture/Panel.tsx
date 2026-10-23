"use client";

// What the sculpture's panel says (beside the canvas from 48rem, a sheet on phones): one verse with its BLIVRE text and
// every link it has, most votes first, or one chapter with its verses ranked by links. Presentational: the page
// (Sculpture.tsx) owns the selection, the focus and the fetching of the verses' text. The panels of a path and of a
// word (PathPanel.tsx, WordPanel.tsx) load on their own.
import Link from "next/link";
import { useEffect, useId, useMemo, useState, type ReactNode, type Ref } from "react";
import { VerseActions } from "@/components/assistant/VerseActions";
import { Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { BASE } from "@/lib/community/books-client";
import { loadChapterText, loadVerseLinks } from "@/lib/community/fetchers";
import { longRef, versePath } from "@/lib/community/geometry";
import type { ChapterLink, Partner } from "./arcs";
import { chapterConnectionCounts } from "./connection-counts";
import { chapterLabel, hashOf, ligacoes, PAGE, votos, type Filter } from "./state";
import styles from "./sculpture.module.css";

export { PAGE } from "./state";

type Listed = Partner & { i: number };

/** Kept beside the selected reference, above the text, even while its reading sheet scrolls. */
export function ConnectionCount({ total, failed = false, onRetry, children }: {
  total: number | null;
  failed?: boolean;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return <div className={styles.connectionCount} aria-live="polite" data-connection-total={total ?? undefined}>
    {total !== null ? <>
      <p><strong>{formatInt(total)} {total === 1 ? "conexão" : "conexões"}</strong> <span>na base</span></p>
      {children}
    </> : failed ? <p role="status">Contagem indisponível. <button type="button" className={styles.retryText} onClick={onRetry}>Tentar de novo</button></p>
      : <p role="status">Contando conexões…</p>}
  </div>;
}

/** "Salvar imagem" (snapshot.ts): its words now, whether it is at work, and what it does; null without a live canvas */
export type Save = { label: string; busy: boolean; onSave: () => void } | null;

export function SaveButton({ save }: { save: Save }) {
  if (!save) return null;
  return (
    <button type="button" className={styles.act} onClick={save.onSave} disabled={save.busy}>
      {save.label}
    </button>
  );
}

/** "Caminho até…": a field for the other end of a path from the verse open (the page parses it and opens the path). */
function PathForm({ onPath }: { onPath: (input: string) => Promise<string | null> }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  if (!open) {
    return (
      <button type="button" className={styles.act} aria-expanded={false} onClick={() => setOpen(true)}>
        Caminho até outro versículo
      </button>
    );
  }
  return (
    <form
      className={styles.pathForm}
      onSubmit={(e) => {
        e.preventDefault();
        void onPath(value).then((err) => setError(err ?? ""));
      }}
    >
      <label htmlFor={`${id}-to`}>Até qual versículo?</label>
      <div className={styles.pathRow}>
        <input
          id={`${id}-to`}
          className={styles.field}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
          placeholder="Ap 12:9"
          autoComplete="off"
          enterKeyHint="go"
          // the person asked for this field: it takes the focus (the panel's heading had it)
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        <button type="submit" className={styles.go}>
          Traçar
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} className={styles.formError} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function VersePanel({
  gv,
  nt,
  partners,
  linksFailed,
  onLinksRetry,
  text,
  textFailed,
  onTextRetry,
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
  save,
  onPath,
  headingId,
  headingRef,
}: {
  gv: number;
  nt: boolean | null;
  partners: Partner[] | null;
  linksFailed?: boolean;
  onLinksRetry?: () => void;
  text: string | null;
  textFailed: boolean;
  onTextRetry: () => void;
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
  save: Save;
  /** a path from this verse to the one typed: what is wrong with it, or null when it opens */
  onPath: (input: string) => Promise<string | null>;
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const { book, chapter } = BASE.locate(gv);
  const chap = `${book.name} ${chapter}`;
  return (
    <>
      <header className={styles.selectionHeader}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.ref}>
        {longRef(BASE, gv)}
      </h2>
      <ConnectionCount total={partners?.length ?? null} failed={linksFailed} onRetry={onLinksRetry}>
        <p>{filter === "todas" ? "Versículos conectados · todos os votos" : `${formatInt(listed.length)} no filtro ${filter === "antigo" ? "Antigo" : "Novo"} Testamento`}</p>
      </ConnectionCount>
      </header>
      {nt !== null && <p className={styles.meta}>{nt ? "Novo Testamento" : "Antigo Testamento"}</p>}
      {text !== null ? <blockquote className={styles.scripture}>{text}</blockquote> : textFailed ? (
        <p role="status" className={styles.meta}>
          Não foi possível carregar o texto. <button type="button" className={styles.retryText} onClick={onTextRetry}>Tentar novamente</button>
        </p>
      ) : <p role="status" className={styles.meta}>Carregando texto de {longRef(BASE, gv)}…</p>}
      <p className={styles.actions}>
        <VerseActions path={versePath(BASE, gv)} label={longRef(BASE, gv)} />
        <Link href={`/${book.slug}/${chapter}`} className={styles.act}>
          Ler {chap}
        </Link>
        <button type="button" className={styles.act} onClick={onCopy}>
          {copied ? "Link copiado" : "Copiar link"}
        </button>
        <SaveButton save={save} />
      </p>
      <PathForm key={gv} onPath={onPath} />
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
                <VerseActions path={versePath(BASE, p.gv)} label={longRef(BASE, p.gv)} />
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
  total,
  highlights,
  snippets,
  sceneControl,
  onVerse,
  onChapter,
  save,
  headingId,
  headingRef,
}: {
  ci: number;
  /** how many chapters the Bible has (the last one has no next) */
  nch: number;
  /** global index of the chapter's verse 1, and how many verses it has */
  first: number;
  verses: number;
  /** Complete pair count from sky.json, independent of the canvas's loaded sample. */
  total: number;
  highlights: readonly ChapterLink[];
  snippets: ReadonlyMap<number, string>;
  sceneControl: ReactNode;
  onVerse: (gv: number) => void;
  /** open another chapter (the previous or the next: a tap on the axis lands near, these make it exact) */
  onChapter: (ci: number) => void;
  save: Save;
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const c = chapterLabel(ci);
  const [text, setText] = useState<{ ci: number; verses: string[] } | null>(null);
  const [failed, setFailed] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [connections, setConnections] = useState<{ ci: number; counts: ReturnType<typeof chapterConnectionCounts> | null } | null>(null);
  const [countsRetry, setCountsRetry] = useState(0);
  const [showVerses, setShowVerses] = useState(false);
  useEffect(() => {
    let live = true;
    loadChapterText(c.book.slug, c.chapter)
      .then((t) => live && setText({ ci, verses: t }))
      .catch(() => { if (live) setFailed(ci); });
    return () => {
      live = false;
    };
  }, [ci, c.book.slug, c.chapter, retry]);
  useEffect(() => {
    if (!showVerses) return;
    let live = true;
    loadVerseLinks(c.book.slug, c.chapter)
      .then((rows) => { if (live) setConnections({ ci, counts: chapterConnectionCounts(first, rows) }); })
      .catch(() => { if (live) setConnections({ ci, counts: null }); });
    return () => { live = false; };
  }, [ci, c.book.slug, c.chapter, first, countsRetry, showVerses]);
  const complete = connections?.ci === ci ? connections.counts : null;
  const countsFailed = connections?.ci === ci && connections.counts === null;
  const ranked = useMemo(() => {
    if (!complete) return [];
    return complete.byVerse
      .map((k, v) => ({ gv: first + v, v: v + 1, k }))
      .filter((x) => x.k > 0)
      .sort((p, q) => q.k - p.k || p.v - q.v);
  }, [complete, first]);
  const lines = text?.ci === ci ? text.verses : null;
  return (
    <>
      <header className={styles.selectionHeader}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.ref}>
        {c.label}
      </h2>
      <ConnectionCount total={total}>
        <p>Pares de versículos · todos os votos</p>
      </ConnectionCount>
      </header>
      {sceneControl}
      <section className={styles.chapterReading} aria-labelledby={`${headingId}-text`}>
        <div className={styles.chapterReadingHead}>
          <h3 id={`${headingId}-text`}>Texto de {c.label}</h3><span>Bíblia Livre</span>
        </div>
        {lines ? <div className={styles.chapterScroll} role="region" aria-label={`Texto de ${c.label}`} tabIndex={0}>
          <ol>{lines.map((line, index) => <li key={index}>
            <button type="button" className={styles.readingNumber} onClick={() => onVerse(first + index)}
              aria-label={`Ver conexões de ${c.label}:${index + 1}`}>{index + 1}</button>
            <p>{line}</p>
            <VerseActions path={`/${c.book.slug}/${c.chapter}/${index + 1}`} label={`${c.label}:${index + 1}`} />
          </li>)}</ol>
        </div> : failed === ci ? <p role="status" className={styles.meta}>
          Não foi possível carregar o texto. <button type="button" className={styles.retryText}
            onClick={() => { setFailed(null); setRetry((value) => value + 1); }}>Tentar novamente</button>
        </p> : <p role="status" className={styles.meta}>Carregando texto de {c.label}…</p>}
      </section>
      <p className={styles.actions}>
        <Link href={c.path} className={styles.act}>
          Ler {c.label}
        </Link>
        <SaveButton save={save} />
      </p>
      <nav className={`bc-pager ${styles.pager}`} aria-label="Capítulo anterior e seguinte">
        {ci > 0 ? <PagerLink ci={ci - 1} rel="prev" onChapter={onChapter} /> : <span />}
        {ci < nch - 1 ? <PagerLink ci={ci + 1} rel="next" onChapter={onChapter} /> : <span />}
      </nav>
      <p className={styles.connectionsHeading}>CONEXÕES EM DESTAQUE</p>
      <ol className={styles.list} aria-label={`Versículos ligados a ${c.label}`}>
        {highlights.map((link) => (
          <li key={link.there}>
            <button type="button" className={styles.item} onClick={() => onVerse(link.there)}>
              <span className={styles.itemRef}>{longRef(BASE, link.there)}</span>
              <span className={styles.itemVotes}>{votos(link.votes)}</span>
              <span className={styles.itemText}>{snippets.get(link.there) ?? "Carregando passagem…"}</span>
              <span className={styles.linkOrigin}>A partir de {longRef(BASE, link.here)} <span aria-hidden="true">↗</span></span>
            </button>
            <VerseActions path={versePath(BASE, link.there)} label={longRef(BASE, link.there)} />
          </li>
        ))}
      </ol>
      <details className={styles.chapterVerses} onToggle={(event) => setShowVerses(event.currentTarget.open)}>
      <summary>Versículos de {c.label}</summary>
      {!complete && <p className={styles.meta} role="status">{countsFailed ? <>As contagens por versículo estão indisponíveis. <button type="button" className={styles.retryText} onClick={() => { setConnections(null); setCountsRetry((value) => value + 1); }}>Tentar de novo</button></> : "Carregando conexões por versículo…"}</p>}
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
            <VerseActions path={versePath(BASE, x.gv)} label={longRef(BASE, x.gv)} />
          </li>
        ))}
      </ol>
      </details>
      <p className={styles.meta}>{formatInt(verses)} versículos · O total inclui ligações dentro deste capítulo, contadas uma vez. Trechos contam pelo primeiro versículo.</p>
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
