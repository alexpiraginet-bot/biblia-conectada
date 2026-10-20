"use client";

// The panel of a path between two verses (/arcos, "#caminho/…"): its steps in order, each verse with its BLIVRE text,
// and between two steps the link that joins them, with its votes and the way to read both side by side. Loaded when a
// path is opened; the page (Sculpture.tsx) finds the path (path.ts) and lights it.
import Link from "next/link";
import { VerseStudyLink } from "@/components/assistant/VerseStudyLink";
import { useEffect, useState, type Ref } from "react";
import { BASE } from "@/lib/community/books-client";
import { longRef, versePath } from "@/lib/community/geometry";
import { conexaoPath } from "@/lib/conexao";
import type { Hop } from "./arcs";
import { SaveButton, type Save } from "./Panel";
import { PATH_MIN_VOTES } from "./path";
import { ligacoes, verseText, votos } from "./state";
import styles from "./sculpture.module.css";

const side = (gv: number) => {
  const { book, chapter, verse } = BASE.locate(gv);
  return { book: book.index, slug: book.slug, chapter, verse };
};

export function PathPanel({
  from,
  to,
  hops,
  error,
  onRetry,
  loadingAll,
  focus,
  onFocus,
  onVerse,
  onSwap,
  copied,
  onCopy,
  save,
  headingId,
  headingRef,
}: {
  from: number;
  to: number;
  /** the hops, null when no path joins the two verses, undefined while it is being found */
  hops: Hop[] | null | undefined;
  error: boolean;
  onRetry: () => void;
  /** the device has only the most voted arcs: every pair is fetched first */
  loadingAll: boolean;
  focus: number;
  onFocus: (i: number) => void;
  onVerse: (gv: number) => void;
  onSwap: () => void;
  copied: boolean;
  onCopy: () => void;
  save: Save;
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const steps = hops?.length ? [hops[0].from, ...hops.map((h) => h.to)] : [];
  const key = steps.join(",");
  const [texts, setTexts] = useState<{ key: string; list: string[] } | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    Promise.all(key.split(",").map((gv) => verseText(Number(gv))))
      .then((list) => alive && setTexts({ key, list }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]);
  const lines = texts?.key === key ? texts.list : null;
  const weakest = hops?.length ? Math.min(...hops.map((h) => h.votes)) : 0;

  return (
    <>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.ref}>
        De {longRef(BASE, from)} a {longRef(BASE, to)}
      </h2>
      <p className={styles.meta}>
        {hops === undefined
          ? error
            ? "Não deu para carregar as ligações para achar o caminho."
            : loadingAll
              ? "Carregando todas as ligações para achar o caminho…"
              : "Procurando o caminho…"
          : hops
            ? `${ligacoes(hops.length)} · a mais fraca tem ${votos(weakest)}`
            : "Nenhum caminho liga esses dois versículos."}
      </p>
      {hops === undefined && error && (
        <p className={styles.actions}>
          <button type="button" className={styles.act} onClick={onRetry}>
            Tentar de novo
          </button>
        </p>
      )}
      <p className={styles.actions}>
        <button type="button" className={styles.act} onClick={onSwap}>
          Inverter
        </button>
        <button type="button" className={styles.act} onClick={onCopy}>
          {copied ? "Link copiado" : "Copiar link"}
        </button>
        <SaveButton save={save} />
      </p>
      {steps.length > 0 && (
        <ol className={styles.steps}>
          {steps.map((gv, k) => (
            <li key={`${gv}-${k}`}>
              <button type="button" className={styles.item} onClick={() => onVerse(gv)}>
                <span className={styles.itemRef}>
                  <span className={styles.stepNo}>{k + 1}</span> {longRef(BASE, gv)}
                </span>
                <span className={styles.itemText}>{lines?.[k] ?? "…"}</span>
              </button>
              <VerseStudyLink path={versePath(BASE, gv)} label={longRef(BASE, gv)} />
              {hops && k < hops.length && (
                <div className={styles.hop}>
                  <button type="button" className={styles.hopVotes} aria-pressed={focus === k} onClick={() => onFocus(focus === k ? -1 : k)}>
                    Ligação de {votos(hops[k].votes)}
                  </button>
                  <Link className={styles.act} href={conexaoPath(side(hops[k].from), side(hops[k].to))}>
                    Ler lado a lado
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className={styles.meta}>
        O caminho com menos ligações; entre os mais curtos, o de ligações mais votadas. Só entram ligações com {PATH_MIN_VOTES === 1 ? "pelo menos 1 voto" : `${PATH_MIN_VOTES} votos ou mais`}.
      </p>
    </>
  );
}
