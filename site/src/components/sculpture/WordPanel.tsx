"use client";

// The panel of a word (/arcos, "#palavra/…"): how many verses of the BLIVRE have it, where in the Bible they are (the
// eight book groups of the axis), how many links join them, and the verses themselves, most linked first, with the
// word marked. Loaded when a word is opened; the page (Sculpture.tsx) finds the verses (word.ts) and lights them.
import Link from "next/link";
import { VerseActions } from "@/components/assistant/VerseActions";
import { useEffect, useMemo, useState, type Ref } from "react";
import { formatInt } from "@/lib/canon/text";
import { BASE } from "@/lib/community/books-client";
import { longRef, versePath } from "@/lib/community/geometry";
import { groupNames, type AxisGroup } from "./groups";
import { PAGE, SaveButton, type Save } from "./Panel";
import { ligacoes, verseText, versiculos } from "./state";
import { marked, type WordResult } from "./word";
import styles from "./sculpture.module.css";

export function WordPanel({
  q,
  result,
  error,
  onRetry,
  links,
  full,
  lit,
  groups,
  chapterOf,
  onVerse,
  copied,
  onCopy,
  save,
  headingId,
  headingRef,
}: {
  q: string;
  /** the verses, null when the query has no word, undefined while they are being found */
  result: WordResult | null | undefined;
  error: boolean;
  onRetry: () => void;
  /** links between two verses with the word, among the arcs loaded (null before they are) */
  links: number | null;
  /** false while only the most voted arcs are loaded */
  full: boolean;
  /** how many of those links the sculpture lights (the most voted) */
  lit: number;
  groups: AxisGroup[];
  chapterOf: ((gv: number) => number) | null;
  onVerse: (gv: number) => void;
  copied: boolean;
  onCopy: () => void;
  save: Save;
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const verses = result?.verses;
  const n = verses?.length ?? 0;
  const [shown, setShown] = useState(PAGE);
  const [texts, setTexts] = useState<ReadonlyMap<number, string>>(new Map());

  // where the verses are: per book group of the axis (a group may run in two stretches), and how many books
  const named = useMemo(() => groupNames(groups), [groups]);
  const where = useMemo(() => {
    if (!verses || !chapterOf) return null;
    const perGroup = named.map(() => 0);
    const books = new Set<number>();
    for (const gv of verses) {
      const ci = chapterOf(gv);
      const id = groups.find((x) => ci >= x.first && ci < x.end)?.id;
      const g = named.findIndex((x) => x.id === id);
      if (g >= 0) perGroup[g]++;
      books.add(BASE.locate(gv).book.index);
    }
    return { perGroup, books: books.size, max: Math.max(1, ...perGroup) };
  }, [verses, chapterOf, groups, named]);

  const page = useMemo(() => (verses ? Array.from(verses.subarray(0, shown)) : []), [verses, shown]);
  useEffect(() => {
    const want = page.filter((gv) => !texts.has(gv));
    if (want.length === 0) return;
    let alive = true;
    Promise.all(want.map(async (gv) => [gv, await verseText(gv)] as const))
      .then((pairs) => {
        if (!alive) return;
        setTexts((m) => {
          const next = new Map(m);
          for (const [gv, t] of pairs) next.set(gv, t);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [page, texts]);

  return (
    <>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.ref}>
        “{q}”
      </h2>
      <p className={styles.meta}>
        {result === undefined
          ? error
            ? "Não deu para procurar a palavra agora."
            : "Procurando a palavra…"
          : result === null
            ? "Escreva uma palavra do texto, sem números."
            : n === 0
              ? "Nenhum versículo da Bíblia Livre tem essa palavra."
              : `${versiculos(n)}${where ? ` em ${formatInt(where.books)} ${where.books === 1 ? "livro" : "livros"}` : ""}${links !== null ? ` · ${ligacoes(links)} entre eles${full ? "" : " (entre as mais votadas)"}` : ""}`}
      </p>
      <p className={styles.actions}>
        {result === undefined && error && (
          <button type="button" className={styles.act} onClick={onRetry}>
            Tentar de novo
          </button>
        )}
        <Link href={`/buscar?q=${encodeURIComponent(q)}`} className={styles.act}>
          Buscar no site
        </Link>
        <button type="button" className={styles.act} onClick={onCopy}>
          {copied ? "Link copiado" : "Copiar link"}
        </button>
        <SaveButton save={save} />
      </p>
      {where && n > 0 && (
        <section className={styles.where} aria-label="Onde a palavra aparece">
          <ol>
            {named.map((g, k) =>
              where.perGroup[k] > 0 ? (
                <li key={g.id}>
                  <span className={styles.whereName}>{g.name}</span>
                  <span className={styles.whereBar} aria-hidden="true">
                    <i style={{ width: `${(where.perGroup[k] / where.max) * 100}%` }} />
                  </span>
                  <span className={styles.whereCount}>{formatInt(where.perGroup[k])}</span>
                </li>
              ) : null,
            )}
          </ol>
        </section>
      )}
      {result && n > 0 && (
        <>
          <ol className={styles.list}>
            {page.map((gv) => {
              const t = texts.get(gv);
              return (
                <li key={gv}>
                  <button type="button" className={styles.item} onClick={() => onVerse(gv)}>
                    <span className={styles.itemRef}>{longRef(BASE, gv)}</span>
                    <span className={styles.itemText}>
                      {t === undefined ? "…" : marked(t, result.query).map((s, i) => (s.mark ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
                    </span>
                  </button>
                  <VerseActions path={versePath(BASE, gv)} label={longRef(BASE, gv)} />
                </li>
              );
            })}
          </ol>
          {n > shown && (
            <button type="button" className={styles.more} onClick={() => setShown((s) => s + PAGE)}>
              Mostrar mais {formatInt(Math.min(PAGE, n - shown))} de {formatInt(n - shown)}
            </button>
          )}
        </>
      )}
      <p className={styles.meta}>
        Palavras do texto da Bíblia Livre (BLIVRE), sem diferença de acento e de maiúsculas, dos versículos mais ligados para os menos.
        {links !== null && lit < links ? ` A escultura acende as ${formatInt(lit)} ligações mais votadas entre eles.` : ""}
      </p>
    </>
  );
}
