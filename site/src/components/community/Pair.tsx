// Two verses joined by a gold line, with what links them in between ("208 votos", "mínimo de 5 saltos"): the trail
// step, the bridge's start screen and a link brought to the table. Scripture at reading size, in Literata (design §4).
// No hooks and no server-only imports, so server pages and client islands share it.
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./community.module.css";

/** BLIVRE text unchanged, with the translators' [supplied words] in the secondary ink, as the reading pages show them */
export function Blivre({ text }: { text: string }) {
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

export type PairSide = {
  /** "Início", "Destino": said before the reference */
  label?: string;
  ref: string;
  href?: string;
  /** null while the text loads */
  text: string | null;
};

export function VersePair({ a, b, link }: { a: PairSide; b: PairSide; link: ReactNode }) {
  return (
    <div className={styles.pair}>
      <Side side={a} />
      <p className={styles.link}>
        <span className={styles.linkPill}>
          <span className="i i-arc" aria-hidden="true" />
          {link}
        </span>
      </p>
      <Side side={b} />
    </div>
  );
}

function Side({ side }: { side: PairSide }) {
  return (
    <blockquote className={styles.verse} cite={side.href}>
      <p className={styles.verseRef}>
        {side.label && <span className={styles.verseLabel}>{side.label}</span>}
        {side.href ? <Link href={side.href}>{side.ref}</Link> : <span>{side.ref}</span>}
      </p>
      <p className={styles.verseText}>{side.text === null ? "…" : <Blivre text={side.text} />}</p>
    </blockquote>
  );
}
