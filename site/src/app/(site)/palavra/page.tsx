import type { Metadata } from "next";
import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import { themes } from "@/lib/timeline";
import { wordPage } from "@/lib/word-index";
import styles from "../tema/tema.module.css";

export const metadata: Metadata = {
  title: "Palavras",
  description: "Versículos da Bíblia Livre que têm uma palavra, e as ligações entre eles.",
};

export const ensureStatic = "navigation";

export default async function Palavras() {
  const words = (await Promise.all(themes.map((t) => wordPage(t.key)))).filter((w) => w !== null);
  words.sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  return (
    <main id="conteudo" className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>Palavras</h1>
        <p className={styles.lede}>
          Cada página de palavra reúne os versículos da Bíblia Livre que têm essa palavra exata e as ligações da OpenBible.info entre eles. O
          endereço é /palavra/ seguido da palavra sem acento: <Link href="/palavra/luz">/palavra/luz</Link>.
        </p>
      </header>
      <section className={styles.rule} aria-labelledby="regra">
        <h2 id="regra" className={styles.ruleTitle}>
          Palavra não é tema
        </h2>
        <p>
          A palavra é contada em qualquer sentido em que aparece. Um tema vem de uma fonte que reúne passagens sobre um assunto (
          <Link href="/tema">Temas</Link>). Abaixo, as {formatInt(words.length)} palavras que dão nome aos temas.
        </p>
      </section>
      <ol className={styles.list} aria-label="Palavras dos temas">
        {words.map((w) => (
          <li key={w.key}>
            <Link href={`/palavra/${w.key}`} className={styles.item}>
              <span className={styles.label}>{w.label}</span>
              <span className={styles.meta}>
                {formatInt(w.verses.length)} versículos · {formatInt(w.linksAmong.length)} ligações
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className={styles.source}>
        Texto: Bíblia Livre (BLIVRE). Ligações: OpenBible.info. <Link href="/sobre">Créditos completos</Link>
      </p>
    </main>
  );
}
