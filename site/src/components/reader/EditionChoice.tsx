import Link from "next/link";
import { translationPath, type TranslationId } from "@/lib/translations";
import styles from "./translations.module.css";

/** Switching editions opens the chapter: matching verse numbers do not establish an alignment. */
export function EditionChoice({ current, slug, chapter }: { current: TranslationId; slug?: string; chapter?: number }) {
  return <nav className={styles.editions} aria-label="Tradução da Bíblia">
    <span className={styles.label}>Tradução</span>
    <Link href={translationPath("open-nbv", slug, chapter)} prefetch={false}
      aria-current={current === "open-nbv" ? "page" : undefined}>Open Nova Bíblia Viva</Link>
    <Link href={translationPath("blivre", slug, chapter)} prefetch={false}
      aria-current={current === "blivre" ? "page" : undefined}>Bíblia Livre</Link>
  </nav>;
}
