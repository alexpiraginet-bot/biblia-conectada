import styles from "./StudyHost.module.css";

/** Render before page links. Only the bootstrap mutates these attributes. */
export function VerseIntentFeedback() {
  return <div id="verse-intent-feedback" className={styles.status} role="status" hidden suppressHydrationWarning>
    <span suppressHydrationWarning>Abrindo…</span>
    <span hidden suppressHydrationWarning>Não foi possível abrir agora. Tente novamente ou abra em outra página.</span>
    <a href="#" hidden suppressHydrationWarning>Abrir em outra página</a>
    <button type="button" aria-label="Cancelar abertura">×</button>
  </div>;
}
