import Link from "next/link";
import { notFound } from "next/navigation";
import { EditionChoice } from "@/components/reader/EditionChoice";
import styles from "@/components/reader/translations.module.css";
import { translationBooks } from "@/lib/translation-reading";
import { translationPath, getTranslation } from "@/lib/translations";
import { shareMetadata } from "@/lib/share-metadata";

type Props = { params: Promise<{ livro: string }> };
export const ensureStatic = "navigation";
export function generateStaticParams() { return translationBooks("open-nbv")!.map((book) => ({ livro: book.slug })); }
export async function generateMetadata({ params }: Props) {
  const { livro } = await params;
  const book = translationBooks("open-nbv")!.find((item) => item.slug === livro);
  if (!book) return { title: "Livro não encontrado", robots: { index: false } };
  return shareMetadata({ title: `${book.name} · Open Nova Bíblia Viva`, path: translationPath("open-nbv", book.slug), description: `Leia todos os capítulos de ${book.name} na Open Nova Bíblia Viva.` });
}
export default async function BookPage({ params }: Props) {
  const { livro } = await params;
  const book = translationBooks("open-nbv")!.find((item) => item.slug === livro);
  if (!book) notFound();
  const edition = getTranslation("open-nbv")!;
  return <main id="conteudo" className={`site-page ${styles.page}`}>
    <Link href="/ler/open-nbv">← Todos os livros</Link>
    <EditionChoice current="open-nbv" slug={book.slug} />
    <p className={styles.kicker}>Open Nova Bíblia Viva</p><h1 className="bc-display">{book.name}</h1>
    <p className="bc-lede">Escolha um capítulo para começar.</p>
    <nav aria-label={`Capítulos de ${book.name}`} className={styles.chapterLinks}>{book.verses.map((_, i) =>
      <Link key={i} prefetch={false} href={translationPath("open-nbv", book.slug, i + 1)} aria-label={`${book.name} ${i + 1}`}>{i + 1}</Link>)}</nav>
    <footer className={styles.credit}><p>{edition.credit}</p><p>The original Work by its copyright holders is available for free at www.biblica.com and open.bible.</p><p><a href={edition.licenseUrl}>CC BY-SA 4.0</a> · <Link href="/sobre">Créditos completos</Link></p></footer>
  </main>;
}
