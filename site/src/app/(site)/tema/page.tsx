import type { Metadata } from "next";
import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import { dateBR, themeRule, themes, themesMeta } from "@/lib/timeline";
import styles from "./tema.module.css";

export const metadata: Metadata = {
  title: "Temas",
  description: "Temas da OpenBible.info Topics com rótulo em português tirado do texto da Bíblia Livre.",
};

export const ensureStatic = "navigation";

export default function Temas() {
  const passages = themes.reduce((n, t) => n + t.passages.length, 0);
  return (
    <main id="conteudo" className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>Temas</h1>
        <p className={styles.lede}>
          {formatInt(themes.length)} temas, com {formatInt(passages)} passagens, escolhidos entre os {formatInt(themesMeta.topicsInSource)} tópicos
          da OpenBible.info Topics (instantâneo de {dateBR(themesMeta.generated)}). Em cada tema, as passagens vêm na ordem da nota dada pelos
          leitores da OpenBible.info.
        </p>
      </header>

      <section className={styles.rule} aria-labelledby="regra">
        <h2 id="regra" className={styles.ruleTitle}>
          De onde vem o nome de cada tema
        </h2>
        <p>
          A OpenBible.info dá os tópicos em inglês. O nome em português é a palavra da Bíblia Livre que aparece em mais da metade das passagens
          do tópico; não é tradução. Só entram tópicos de uma lista revisada, com pelo menos {formatInt(themeRule.minPassages)} passagens, em
          que essa palavra existe. O nome do tópico em inglês fica ao lado, como está na fonte.
        </p>
      </section>

      <ol className={styles.list} aria-label="Temas">
        {themes.map((t) => (
          <li key={t.slug}>
            <Link href={`/tema/${t.slug}`} className={styles.item}>
              <span className={styles.label}>
                <span className={styles.themeDisc} aria-hidden="true" />
                {t.label.charAt(0).toLocaleUpperCase("pt-BR") + t.label.slice(1)}
              </span>
              <span className={styles.meta}>
                {formatInt(t.passages.length)} passagens · <span lang="en">{t.topic}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className={styles.source}>
        {themesMeta.credit}. Texto: Bíblia Livre (BLIVRE). <Link href="/sobre">Créditos completos</Link>
      </p>
    </main>
  );
}
