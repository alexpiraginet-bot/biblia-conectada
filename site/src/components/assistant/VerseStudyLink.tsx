import Link from "next/link";
import styles from "./VerseStudyLink.module.css";

/** A canonical verse path supplied by the reading data, never a chapter or an inferred verse. */
export function VerseStudyLink({ path, label }: { path: string; label: string }) {
  return <Link href={`/assistente?ref=${path.replace(/^\//, "")}`} prefetch={false}
    className={styles.link} aria-label={`Entender ${label} com IA`}>
    Entender com IA <span aria-hidden="true">↗</span>
  </Link>;
}
