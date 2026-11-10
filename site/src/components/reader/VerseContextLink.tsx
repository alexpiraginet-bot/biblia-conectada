import styles from "@/components/assistant/VerseStudyLink.module.css";

/**
 * "Contexto": opens the verses before and after a Bíblia Livre verse in the shared verse dialog (VerseContext.tsx).
 * An ordinary link to the verse inside its chapter, which is where it leads without JavaScript. A component of its
 * own, not a part of VerseActions, so the pages that never show it do not carry it.
 */
export function VerseContextLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const m = /^\/([a-z0-9-]+)\/([1-9]\d{0,2})\/([1-9]\d{0,2})$/.exec(path);
  if (!m) return null;
  return (
    <a
      href={`/${m[1]}/${m[2]}#v${m[3]}`}
      data-context-ref={path.slice(1)}
      data-context-label={label}
      aria-haspopup="dialog"
      className={className ?? styles.link}
      aria-label={`Contexto de ${label}: os versículos antes e depois`}
    >
      Contexto
    </a>
  );
}
