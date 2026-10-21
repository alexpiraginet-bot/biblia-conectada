import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import { books } from "@/lib/data";
import { linksLabel, testamentName } from "@/lib/from-here";
import { type Medalhao, medalhaoForBook } from "@/lib/medalhoes";
import { bookPairs, bookVerseCount } from "@/lib/reading";
import styles from "./ler.module.css";

export const metadata: Metadata = shareMetadata({
    title: "Ler",
    description: "Os 66 livros da Bíblia, no texto da Bíblia Livre (BLIVRE), com as ligações de cada versículo.",
    path: "/ler",
  });

type Group = { medal: Medalhao; books: { book: Book; pairs: number }[] };

/** The books of a testament by book group (src/data/medalhoes.json, from the Theographic divisions), in the order the
 *  groups first appear; each group lists its books in canonical order (Lamentações sits with the poetry books). */
async function groupsOf(testament: "AT" | "NT"): Promise<Group[]> {
  const groups = new Map<string, Group>();
  for (const book of books.filter((b) => b.testament === testament)) {
    const medal = medalhaoForBook(book.osis);
    if (!medal) throw new Error(`no book group for ${book.osis}`);
    const g = groups.get(medal.id) ?? { medal, books: [] };
    g.books.push({ book, pairs: await bookPairs(book) });
    groups.set(medal.id, g);
  }
  return [...groups.values()];
}

// The book index: the 66 books as ruled lists, by testament and by the eight book groups, each with its chapters and
// links (design/README.md §10: lists, not a grid of cards). The group medallions are the generated illustrations.
export default async function Ler() {
  const chapters = books.reduce((s, b) => s + b.verses.length, 0);
  const verses = books.reduce((s, b) => s + bookVerseCount(b), 0);
  const testaments = await Promise.all(
    (["AT", "NT"] as const).map(async (t) => ({ t, list: books.filter((b) => b.testament === t), groups: await groupsOf(t) })),
  );
  const groupCount = testaments.reduce((s, t) => s + t.groups.length, 0);

  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <h1 className="bc-display">Livros</h1>
      <p className="bc-lede">
        Os {formatInt(books.length)} livros da Bíblia Livre em {formatInt(groupCount)} grupos: {formatInt(chapters)} capítulos e{" "}
        {formatInt(verses)} versículos. Ao lado de cada livro, os capítulos e as ligações que tocam nele.
      </p>
      <div className={styles.testaments}>
        {testaments.map(({ t, list, groups }) => (
          <section key={t} aria-labelledby={`t-${t}`} className={styles.testament}>
            <div className={styles.testamentHead}>
              <h2 id={`t-${t}`} className="bc-title">
                {testamentName(t)}
              </h2>
              <p className="bc-meta">
                {formatInt(list.length)} livros · {formatInt(list.reduce((s, b) => s + b.verses.length, 0))} capítulos
              </p>
            </div>
            {groups.map((g) => (
              <section key={g.medal.id} id={g.medal.id} aria-labelledby={`g-${g.medal.id}`} className={styles.group}>
                <div className={styles.groupHead}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a 96 px illustration, already sized; next/image adds JS */}
                  <img className={`bc-medallion__img ${styles.medal}`} src={g.medal.src96} width={96} height={96} alt={g.medal.alt} loading="lazy" decoding="async" />
                  <h3 id={`g-${g.medal.id}`} className={`bc-section-title ${styles.groupTitle}`}>
                    {g.medal.category}
                    <small>
                      {formatInt(g.books.length)} {g.books.length === 1 ? "livro" : "livros"}
                    </small>
                  </h3>
                </div>
                <ul className={`bc-list ${styles.list}`}>
                  {g.books.map(({ book, pairs }) => (
                    <li key={book.osis}>
                      <Link href={`/${book.slug}`}>
                        <span className="bc-list__name">{book.name}</span>
                        <span className="bc-list__meta">
                          {formatInt(book.verses.length)} {book.verses.length === 1 ? "capítulo" : "capítulos"} · {linksLabel(pairs)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        ))}
      </div>
      <p className={styles.note}>
        Ligações de um livro: os pares de versículos da OpenBible.info com ao menos um versículo nele; um par dentro do livro
        conta uma vez. Os medalhões são ilustrações geradas, uma por grupo de livros.
      </p>
    </main>
  );
}
