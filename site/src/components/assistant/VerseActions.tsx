import { VerseStudyLink } from "./VerseStudyLink";
import styles from "./VerseStudyLink.module.css";

/** Ordinary links remain useful without JS; the shared host enhances them on click. */
export function VerseActions({ path, label }: { path: string; label: string }) {
  const reference = path.replace(/^\//, "");
  return <span className={styles.actions}><VerseStudyLink path={path} label={label} />
    <a href={`/og?path=/${reference}`} data-share-ref={reference} data-share-label={label}
      aria-haspopup="dialog" className={styles.link} aria-label={`Compartilhar ${label}`}>Compartilhar <span aria-hidden="true">↗</span></a>
  </span>;
}
