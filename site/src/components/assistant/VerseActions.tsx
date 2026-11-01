import { VerseStudyLink } from "./VerseStudyLink";
import styles from "./VerseStudyLink.module.css";

/** Ordinary links remain useful without JS; the shared host enhances them on click. */
export function VerseActions({ path, label, connections = true }: { path: string; label: string; connections?: boolean }) {
  const reference = path.replace(/^\//, "");
  return <span className={styles.actions}>
    {connections && /^[a-z0-9-]+\/[1-9]\d{0,2}\/[1-9]\d{0,2}$/.test(reference) && <a href={`/${reference}`}
      data-connections-ref={reference} data-connections-label={label} aria-haspopup="dialog" className={styles.link}
      aria-label={`Conexões de ${label}`}><span className="i i-arc" aria-hidden="true" />Conexões</a>}
    <VerseStudyLink path={path} label={label} />
    <a href={`/og?path=/${reference}`} data-share-ref={reference} data-share-label={label}
      aria-haspopup="dialog" className={styles.link} aria-label={`Compartilhar ${label}`}>Compartilhar <span aria-hidden="true">↗</span></a>
  </span>;
}
