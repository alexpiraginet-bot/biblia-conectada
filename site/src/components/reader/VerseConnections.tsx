"use client";

import { useEffect, useState } from "react";
import { VerseActions } from "@/components/assistant/VerseActions";
import { formatInt } from "@/lib/canon/text";
import { votesLabel } from "@/lib/from-here";
import { Scripture } from "./Scripture";
import { loadVerseConnections, type VerseConnectionsData } from "./verse-connections-data";
import styles from "./verse-connections.module.css";

/** Loaded only by an explicit verse action; the shared native dialog owns scroll, focus and return to the reading. */
export function VerseConnections({ path }: { path: string }) {
  const [data, setData] = useState<VerseConnectionsData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadVerseConnections(path).then((value) => { if (active) setData(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [path, attempt]);
  return <div className={styles.panel} data-verse-connections>
    {failed ? <div role="alert"><p>Não foi possível carregar as conexões desta passagem.</p>
      <button type="button" className="bc-button bc-button--secondary" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Tentar novamente</button>
      <p><a href={`/${path}`}>Abrir a passagem no leitor</a></p></div>
      : !data ? <p role="status">Carregando as conexões e os textos…</p> : <>
        <p className={styles.count} role="status">{formatInt(data.links.length)} {data.links.length === 1 ? "conexão" : "conexões"}<small>na base OpenBible.info · todos os votos</small></p>
        <blockquote className={styles.scripture}><Scripture text={data.text} /><cite>{data.label} · Bíblia Livre</cite></blockquote>
        <VerseActions path={data.path} label={data.label} connections={false} />
        {data.links.length === 0 ? <p>A base não registra conexões deste versículo com outros. Você pode <a href={data.chapterPath}>ler o capítulo e suas ligações</a>.</p> : <>
          <p className={styles.note}>Das mais votadas às menos votadas. Cada passagem pode abrir outras conexões.</p>
          <ol className={styles.list} aria-label={`Conexões de ${data.label}`}>{data.links.map((link) => <li key={link.path}>
            <div className={styles.reference}><a href={link.path} data-connections-ref={link.path.slice(1)} data-connections-label={link.label} aria-haspopup="dialog" aria-label={`Conexões de ${link.label}`}>{link.label}</a><span>{votesLabel(link.votes)}</span></div>
            <p className={styles.scripture}><Scripture text={link.text} /></p>
            <VerseActions path={link.path} label={link.label} />
          </li>)}</ol>
        </>}
        <p className={styles.note}>Referências cruzadas: OpenBible.info. Textos: Bíblia Livre (BLIVRE). Os votos somam as duas direções; trechos contam pelo primeiro versículo.</p>
        <a className={styles.fullReader} href={data.path}>Abrir no leitor completo <span aria-hidden="true">↗</span></a>
      </>}
  </div>;
}
