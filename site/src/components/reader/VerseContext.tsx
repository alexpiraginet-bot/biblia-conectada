"use client";

// The context of a verse, inside the shared verse dialog: the chosen verse among the ones before and after it, with
// more on request. Loaded only by an explicit "Contexto" action; the texts are the Bíblia Livre's chapter files the
// reader's other panels already read (public/data/text). Rules: lib/verse-context.ts and docs/CONTEXTO.md.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BASE, verseFromPath } from "@/lib/community/books-client";
import { loadChapterText } from "@/lib/community/fetchers";
import { contextBlocks, contextChapters, firstContext, growContext, hasMore, locateInBook, type ContextBlock, type ContextWindow } from "@/lib/verse-context";
import { Scripture } from "./Scripture";
import styles from "./verse-context.module.css";

type Side = "before" | "after";

export function VerseContext({ path }: { path: string }) {
  const origin = verseFromPath(`/${path}`);
  const place = origin === null ? null : BASE.locate(origin);
  const book = place?.book ?? null;
  const [view, setView] = useState<{ window: ContextWindow; blocks: ContextBlock[] } | null>(null);
  const [failed, setFailed] = useState(origin === null);
  const [busy, setBusy] = useState<Side | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [said, setSaid] = useState("");
  const texts = useRef(new Map<number, string[]>());
  const root = useRef<HTMLDivElement>(null);
  // the verse that was first on screen before verses were added above it, and where it was
  const anchor = useRef<{ gv: number; top: number } | null>(null);
  const centred = useRef(false);

  // every chapter the window touches, read once and kept for the life of the dialog
  async function read(window: ContextWindow) {
    if (!book) throw new Error("no book");
    await Promise.all(
      contextChapters(book, window)
        .filter((chapter) => !texts.current.has(chapter))
        .map(async (chapter) => {
          const rows = await loadChapterText(book.slug, chapter);
          if (!Array.isArray(rows) || rows.length !== book.verses[chapter - 1]) throw new Error("invalid chapter text");
          texts.current.set(chapter, rows);
        }),
    );
    return { window, blocks: contextBlocks(book, window, texts.current) };
  }

  useEffect(() => {
    if (!book || origin === null) return;
    let active = true;
    read(firstContext(book, origin))
      .then((next) => {
        if (active) setView(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
    // `read` only reads refs and the book
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, origin, attempt]);

  // the chosen verse opens in the middle; verses added above keep what was being read where it was
  useLayoutEffect(() => {
    const box = root.current;
    if (!box || !view) return;
    if (!centred.current) {
      centred.current = true;
      const chosen = box.querySelector<HTMLElement>('[aria-current="true"]');
      if (chosen) box.scrollTop += chosen.getBoundingClientRect().top - box.getBoundingClientRect().top - (box.clientHeight - chosen.offsetHeight) / 2;
      return;
    }
    const kept = anchor.current;
    anchor.current = null;
    const node = kept ? box.querySelector<HTMLElement>(`[data-context-gv="${kept.gv}"]`) : null;
    if (kept && node) box.scrollTop += node.getBoundingClientRect().top - kept.top;
  }, [view]);

  async function more(side: Side) {
    if (!book || !view || busy) return;
    const next = growContext(book, view.window, side);
    const first = root.current?.querySelector<HTMLElement>("[data-context-gv]");
    if (side === "before" && first) anchor.current = { gv: Number(first.dataset.contextGv), top: first.getBoundingClientRect().top };
    setBusy(side);
    setSaid("");
    try {
      const grown = await read(next);
      setView(grown);
      const a = locateInBook(book, next.from);
      const b = locateInBook(book, next.to);
      setSaid(`Mostrando de ${book.name} ${a.chapter}:${a.verse} a ${b.chapter}:${b.verse}.`);
      // the button that was pressed goes away at the book's edge: the list takes the focus then
      if (!hasMore(book, next, side)) root.current?.focus({ preventScroll: true });
    } catch {
      anchor.current = null;
      setSaid("Não foi possível carregar mais versículos. Tente de novo.");
    } finally {
      setBusy(null);
    }
  }

  if (failed || !book || !place) {
    return (
      <div className={styles.panel} data-verse-context="" role="alert">
        <p>Não foi possível carregar o contexto desta passagem.</p>
        {book && (
          <button
            type="button"
            className="bc-button bc-button--secondary"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            Tentar novamente
          </button>
        )}
        <p>
          <a href={`/${path}`}>Abrir a passagem no leitor</a>
        </p>
      </div>
    );
  }
  const several = (view?.blocks.length ?? 0) > 1;
  return (
    <div ref={root} className={styles.panel} data-verse-context="" tabIndex={-1} aria-busy={!view || busy !== null}>
      {!view ? (
        <p role="status">Carregando os versículos…</p>
      ) : (
        <>
          {hasMore(book, view.window, "before") ? (
            <button type="button" className={`bc-button bc-button--secondary ${styles.more}`} onClick={() => more("before")} disabled={busy !== null} data-context-more="before">
              {busy === "before" ? "Carregando…" : "Mostrar versículos anteriores"}
            </button>
          ) : (
            <p className={styles.edge}>Começo de {book.name}.</p>
          )}
          {view.blocks.map((block) => (
            <section key={block.chapter} aria-label={`${book.name} ${block.chapter}`}>
              {several && (
                <h3 className={styles.chapter}>
                  {book.name} {block.chapter}
                </h3>
              )}
              <ol className={styles.verses}>
                {block.verses.map((v) => (
                  <li key={v.gv} value={v.verse} className={styles.verse} aria-current={v.gv === origin ? "true" : undefined} data-context-gv={v.gv}>
                    <span className={styles.number}>{v.verse}</span>
                    <span className={styles.text}>
                      <Scripture text={v.text} />
                      {v.gv === origin && <span className="visually-hidden"> (versículo escolhido)</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {hasMore(book, view.window, "after") ? (
            <button type="button" className={`bc-button bc-button--secondary ${styles.more}`} onClick={() => more("after")} disabled={busy !== null} data-context-more="after">
              {busy === "after" ? "Carregando…" : "Mostrar versículos seguintes"}
            </button>
          ) : (
            <p className={styles.edge}>Fim de {book.name}.</p>
          )}
          <p className={styles.note}>Texto da Bíblia Livre (BLIVRE). O versículo escolhido está em destaque.</p>
          <a className={styles.reader} href={`/${book.slug}/${place.chapter}#v${place.verse}`}>
            Abrir {book.name} {place.chapter} no leitor <span aria-hidden="true">↗</span>
          </a>
        </>
      )}
      <p className="visually-hidden" role="status" aria-live="polite">
        {said}
      </p>
    </div>
  );
}
