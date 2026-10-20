import styles from "./explore.module.css";

// BLIVRE text, unchanged: the words the translators supplied stay in [brackets] and are set in the secondary ink, as
// the reading pages show them.
export function ScriptureText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]*\])/).map((p, i) =>
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
