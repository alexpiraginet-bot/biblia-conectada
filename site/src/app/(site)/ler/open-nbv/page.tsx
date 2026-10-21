import Link from "next/link";
import { EditionChoice } from "@/components/reader/EditionChoice";
import { TranslationNavigator } from "@/components/reader/TranslationNavigator";
import styles from "@/components/reader/translations.module.css";
import { translationBooks } from "@/lib/translation-reading";
import { getTranslation, translationPath } from "@/lib/translations";
import { formatInt } from "@/lib/canon/text";
import { shareMetadata } from "@/lib/share-metadata";

export const metadata = shareMetadata({ title: "Open Nova Bíblia Viva", path: "/ler/open-nbv",
  description: "Leia a Open Nova Bíblia Viva completa, com ajuda de IA e imagens para compartilhar cada versículo." });

export default function OpenNbvIndex() {
  const books = translationBooks("open-nbv")!;
  const edition = getTranslation("open-nbv")!;
  const count = books.reduce((sum, book) => sum + book.verses.reduce((a, b) => a + b, 0), 0);
  return <main id="conteudo" className={`site-page ${styles.page}`}>
    <p className={styles.kicker}>Uma nova forma de acompanhar a história</p>
    <h1 className="bc-display">Open Nova Bíblia Viva</h1>
    <p className={`bc-lede ${styles.intro}`}>Escolha uma passagem. Leia com calma, converse com a IA e compartilhe o que tocou você.</p>
    <p className="bc-meta">{formatInt(books.length)} livros · {formatInt(count)} versículos · texto integral</p>
    <EditionChoice current="open-nbv" />
    <TranslationNavigator books={books.map(({ slug, name, verses }) => ({ slug, name, verses }))} slug="joao" chapter={3} />
    <div className={styles.bookIndex}>{(["AT", "NT"] as const).map((testament) => <section key={testament} aria-labelledby={`testament-${testament}`}>
      <h2 id={`testament-${testament}`} className="bc-title">{testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}</h2>
      {books.filter((book) => book.testament === testament).map((book) => <details key={book.slug}>
        <summary>{book.name}</summary><nav aria-label={`Capítulos de ${book.name}`} className={styles.chapterLinks}>
          {book.verses.map((_, i) => <Link key={i} prefetch={false} href={translationPath("open-nbv", book.slug, i + 1)} aria-label={`${book.name} ${i + 1}`}>{i + 1}</Link>)}
        </nav>
      </details>)}
    </section>)}</div>
    <footer className={styles.credit}><p>{edition.credit}</p>
      <p>The original Work by its copyright holders is available for free at www.biblica.com and open.bible.</p>
      <p>Texto sem alterações, sob <a href={edition.licenseUrl}>CC BY-SA 4.0</a>. Biblica é marca registrada da Biblica, Inc. <Link href="/sobre">Créditos completos</Link>.</p>
    </footer>
  </main>;
}
