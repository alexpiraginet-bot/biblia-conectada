import type { Metadata } from "next";
import Link from "next/link";
import { formatInt, stripAccents } from "@/lib/canon/text";
import { dateBR, themeRule, themes, themesMeta } from "@/lib/timeline";
import styles from "./tema.module.css";

export const metadata: Metadata = {
  title: "Temas",
  description: "Temas da OpenBible.info Topics com rótulo em português tirado do texto da Bíblia Livre.",
};

export const ensureStatic = "navigation";

const capital = (s: string) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);

export default function Temas() {
  const passages = themes.reduce((n, t) => n + t.passages.length, 0);
  // an index from A to Z: by the label as written, grouped by its first letter without the accent
  const sorted = [...themes].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const letters = new Map<string, typeof sorted>();
  for (const t of sorted) {
    const l = stripAccents(t.label.charAt(0)).toLocaleUpperCase("pt-BR");
    letters.set(l, [...(letters.get(l) ?? []), t]);
  }
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className="bc-display">Temas</h1>
        <p className={`bc-lede ${styles.lede}`}>
          {formatInt(themes.length)} temas, com {formatInt(passages)} passagens, escolhidos entre os {formatInt(themesMeta.topicsInSource)} tópicos
          da OpenBible.info Topics (instantâneo de {dateBR(themesMeta.generated)}). Cada um leva o nome da palavra da Bíblia Livre que está na
          maior parte das suas passagens.
        </p>
      </header>

      <nav className={styles.letters} aria-label="Letras do índice">
        <ul>
          {[...letters.keys()].map((l) => (
            <li key={l}>
              <a href={`#letra-${l.toLowerCase()}`} aria-label={`Temas com a letra ${l}`}>
                {l}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.index}>
        {[...letters].map(([l, list]) => (
          <section key={l} className={styles.letter} aria-labelledby={`letra-${l.toLowerCase()}`}>
            <h2 className={`bc-section-title ${styles.letterTitle}`} id={`letra-${l.toLowerCase()}`}>
              <span className={styles.letterName}>{l}</span> <small>{list.length === 1 ? "1 tema" : `${formatInt(list.length)} temas`}</small>
            </h2>
            <ul className={`bc-list ${styles.list}`}>
              {list.map((t) => (
                <li key={t.slug}>
                  <Link href={`/tema/${t.slug}`}>
                    <span className={styles.name}>
                      <span className="bc-list__name">{capital(t.label)}</span>
                      <span className={styles.topic} lang="en">
                        {t.topic}
                      </span>
                    </span>
                    <span className="bc-list__meta">{formatInt(t.passages.length)} passagens</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className={styles.rule} aria-labelledby="regra">
        <h2 id="regra" className="bc-title">
          De onde vem o nome de cada tema
        </h2>
        <p>
          A OpenBible.info dá os tópicos em inglês; embaixo de cada nome, o tópico como está na fonte. O nome em português é a palavra da Bíblia
          Livre que aparece em mais da metade das passagens do tópico; não é tradução. Só entram tópicos de uma lista revisada, com pelo menos{" "}
          {formatInt(themeRule.minPassages)} passagens, em que essa palavra existe.
        </p>
        <p className={styles.source}>
          {themesMeta.credit}. Texto: Bíblia Livre (BLIVRE). <Link href="/sobre">Créditos completos</Link>
        </p>
      </section>
    </main>
  );
}
