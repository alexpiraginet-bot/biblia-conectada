import type { Metadata } from "next";
import Link from "next/link";
import { WordSearch } from "@/components/passage/WordSearch";
import { formatInt, stripAccents } from "@/lib/canon/text";
import { themes } from "@/lib/timeline";
import { wordPage, type WordPage } from "@/lib/word-index";
import styles from "../tema/tema.module.css";

export const metadata: Metadata = {
  title: "Palavras",
  description: "Versículos da Bíblia Livre que têm uma palavra, e as ligações entre eles.",
};

export const ensureStatic = "navigation";

const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;

export default async function Palavras() {
  const words = (await Promise.all(themes.map((t) => wordPage(t.key)))).filter((w) => w !== null);
  words.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  const letters = new Map<string, WordPage[]>();
  for (const w of words) {
    const l = stripAccents(w.label.charAt(0)).toLocaleUpperCase("pt-BR");
    letters.set(l, [...(letters.get(l) ?? []), w]);
  }
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <header className={styles.head}>
        <h1 className="bc-display">Palavras</h1>
        <p className={`bc-lede ${styles.lede}`}>
          Cada página de palavra reúne os versículos da Bíblia Livre que têm essa palavra exata e as ligações da OpenBible.info entre eles.
          Abaixo, as {formatInt(words.length)} palavras que dão nome aos <Link href="/tema">temas</Link>; qualquer outra palavra do texto se
          abre pela busca.
        </p>
        <p className={styles.actions}>
          <WordSearch />
        </p>
      </header>

      <nav className={styles.letters} aria-label="Letras do índice">
        <ul>
          {[...letters.keys()].map((l) => (
            <li key={l}>
              <a href={`#letra-${l.toLowerCase()}`} aria-label={`Palavras com a letra ${l}`}>
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
              <span className={styles.letterName}>{l}</span> <small>{plural(list.length, "palavra", "palavras")}</small>
            </h2>
            <ul className={`bc-list ${styles.list}`}>
              {list.map((w) => (
                <li key={w.key}>
                  <Link href={`/palavra/${w.key}`}>
                    <span className="bc-list__name">{w.label}</span>
                    <span className="bc-list__meta">
                      {plural(w.verses.length, "versículo", "versículos")} · {plural(w.linksAmong.length, "ligação", "ligações")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className={styles.rule} aria-labelledby="regra">
        <h2 id="regra" className="bc-title">
          Palavra não é tema
        </h2>
        <p>
          A palavra é contada em qualquer sentido em que aparece: a forma exata, sem plural nem outras formas, sem diferença de acento ou de
          maiúscula. Um tema vem de uma fonte que reúne passagens sobre um assunto (<Link href="/tema">Temas</Link>). Ligações: pares da
          OpenBible.info em que os dois versículos têm a palavra.
        </p>
        <p className={styles.source}>
          Texto: Bíblia Livre (BLIVRE). Ligações: OpenBible.info. <Link href="/sobre">Créditos completos</Link>
        </p>
      </section>
    </main>
  );
}
