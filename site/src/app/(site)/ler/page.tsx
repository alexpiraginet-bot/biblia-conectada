import type { Metadata } from "next";
import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import styles from "./ler.module.css";

export const metadata: Metadata = {
  title: "Ler",
  description: "Os 66 livros da Bíblia, no texto da Bíblia Livre (BLIVRE), com as ligações de cada versículo.",
};

export default function Ler() {
  const groups = [
    { id: "at", title: "Antigo Testamento", list: books.filter((b) => b.testament === "AT") },
    { id: "nt", title: "Novo Testamento", list: books.filter((b) => b.testament === "NT") },
  ];
  return (
    <main id="conteudo" className={styles.main}>
      <h1 className={styles.title}>Livros</h1>
      <p className={styles.lede}>
        {formatInt(books.length)} livros no texto da Bíblia Livre. Escolha um livro e depois um capítulo; em cada versículo,
        o número ao lado mostra quantos outros estão ligados a ele.
      </p>
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={g.id} className={styles.group}>
          <h2 id={g.id} className={styles.groupTitle}>
            {g.title} <span className={styles.count}>{formatInt(g.list.length)} livros</span>
          </h2>
          <ol className={styles.list}>
            {g.list.map((b) => (
              <li key={b.osis}>
                <Link href={`/${b.slug}`} className={styles.book}>
                  <span className={styles.name}>{b.name}</span>
                  <span className={styles.meta}>
                    {formatInt(b.verses.length)} {b.verses.length === 1 ? "capítulo" : "capítulos"}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
