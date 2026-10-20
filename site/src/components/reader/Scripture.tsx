import styles from "./scripture.module.css";

// BLIVRE marks words supplied by the translators with [brackets]. The text is shown unchanged (brackets kept);
// the supplied words are only set in the secondary ink, as study Bibles do with italics.
export function Scripture({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]*\])/);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <span key={i} className={styles.supplied}>
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}
