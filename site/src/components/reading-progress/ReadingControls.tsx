"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./controls.module.css";

// Progressive enhancement starts only after this boundary has hydrated.
// A persisted host may mount before a streamed reader has finished hydrating.
function useReadingReady<T extends HTMLElement>(path: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    node?.setAttribute("data-reading-ready", "");
    return () => { node?.removeAttribute("data-reading-ready"); };
  }, [path]);
  return ref;
}

/** Small controls. The shared host loads persistence only on use. */
export function VerseReadButton({ path, label }: { path: string; label: string }) {
  const ref = useReadingReady<HTMLButtonElement>(path);
  return <button ref={ref} type="button" className={styles.verseButton} data-reading-toggle={path}
    data-reading-label={label} aria-label={`Marcar ${label} como lido`} aria-pressed="false">
    <span className={styles.check} aria-hidden="true">✓</span><span data-reading-caption>Marcar lido</span>
  </button>;
}

export function ChapterReadingControls({ path, label }: { path: string; label: string }) {
  const ref = useReadingReady<HTMLElement>(path);
  return <section ref={ref} className={styles.chapter} aria-label={`Progresso de leitura de ${label}`} data-reading-chapter={path}>
    <div className={styles.chapterLine}>
      <span data-reading-count>Seu progresso neste capítulo</span>
      <Link href="/jornada#leitura" prefetch={false}>Minha leitura <span aria-hidden="true">↗</span></Link>
    </div>
    <div className={styles.chapterActions}>
      <button type="button" data-reading-complete={path} data-reading-label={label} aria-pressed="false">Marcar capítulo lido</button>
      <details className={styles.settings}><summary>Marcação automática</summary>
        <p>Marque os versículos enquanto lê. Usa o tempo com o texto visível como estimativa; você pode revisar e desmarcar.</p>
        <button type="button" data-reading-automatic aria-pressed="false">Ativar marcação automática</button>
        <p>Fica salvo neste navegador, por tradução. <Link href="/jornada#leitura" prefetch={false}>Ver evolução e fazer backup</Link>.</p>
      </details>
    </div>
    <noscript>Ative o JavaScript para guardar suas marcações de leitura.</noscript>
  </section>;
}
