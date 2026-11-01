import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { VerseActions } from "@/components/assistant/VerseActions";
import { bookBySlug, chapterNeighbours, chapterRef } from "@/lib/reading";
import { translationBooks, translatedChapter } from "@/lib/translation-reading";
import { getTranslation, translationPath } from "@/lib/translations";
import { shareMetadata } from "@/lib/share-metadata";
import { formatInt } from "@/lib/canon/text";
import { EditionChoice } from "./EditionChoice";
import { TranslationNavigator } from "./TranslationNavigator";
import { TranslationVerseFocus } from "./TranslationVerseFocus";
import { ChapterReadingControls } from "@/components/reading-progress/ReadingControls";
import styles from "./translations.module.css";

export type TranslationParams = { livro: string; cap: string; vers?: string };
const edition = getTranslation("open-nbv")!;

function resolve({ livro, cap, vers }: TranslationParams) {
  const books = translationBooks("open-nbv")!;
  const book = books.find((item) => item.slug === livro);
  if (!book || !/^[1-9]\d{0,2}$/.test(cap)) return null;
  const chapter = Number(cap);
  if (chapter > book.verses.length || (vers !== undefined && !/^[1-9]\d{0,2}$/.test(vers))) return null;
  const verse = vers === undefined ? undefined : Number(vers);
  if (verse !== undefined && verse > book.verses[chapter - 1]) return null;
  return { books, book, chapter, verse };
}

export function translationMetadata(params: TranslationParams): Metadata {
  const selected = resolve(params);
  if (!selected) return { title: "Passagem não encontrada", robots: { index: false } };
  const { book, chapter, verse } = selected;
  return shareMetadata({ title: `${book.name} ${chapter}${verse ? `:${verse}` : ""} · Open Nova Bíblia Viva`,
    description: `Leia ${book.name} ${chapter} na ${edition.name}. Texto completo, ajuda de IA e imagens para compartilhar.`,
    path: translationPath("open-nbv", book.slug, chapter, verse) });
}

export async function TranslationReader({ params }: { params: TranslationParams }) {
  const selected = resolve(params);
  if (!selected) notFound();
  const { books, book, chapter, verse } = selected;
  const text = await translatedChapter("open-nbv", book.slug, chapter);
  if (!text) notFound();
  const canonical = bookBySlug(book.slug)!;
  const partners = await chapterNeighbours(canonical, chapter);
  const index = books.findIndex((item) => item.slug === book.slug);
  const prev = chapter > 1 ? { book, chapter: chapter - 1 }
    : index > 0 ? { book: books[index - 1], chapter: books[index - 1].verses.length } : null;
  const next = chapter < book.verses.length ? { book, chapter: chapter + 1 }
    : index + 1 < books.length ? { book: books[index + 1], chapter: 1 } : null;
  const pager = <nav className={styles.pager} aria-label="Capítulo anterior e seguinte">
    {prev ? <Link rel="prev" prefetch={false} href={translationPath("open-nbv", prev.book.slug, prev.chapter)}>
      <small>← Anterior</small><strong>{prev.book.name} {prev.chapter}</strong></Link> : <span />}
    {next ? <Link rel="next" prefetch={false} href={translationPath("open-nbv", next.book.slug, next.chapter)}>
      <small>Seguinte →</small><strong>{next.book.name} {next.chapter}</strong></Link> : <span />}
  </nav>;
  return <main id="conteudo" className={`site-page ${styles.page}`}>
    <div className={styles.topline}><Link href="/ler/open-nbv">← Todos os livros</Link><a href="#edition-credit">Fonte e licença</a></div>
    <EditionChoice current="open-nbv" slug={book.slug} chapter={chapter} />
    <header className={styles.heading}>
      <p className={styles.kicker}>Open Nova Bíblia Viva · leitura completa</p>
      <h1 className="bc-display">{book.name} {chapter}</h1>
      <p className="bc-meta">{formatInt(text.length)} versículos · ajuda de IA em cada passagem</p>
    </header>
    <details className={styles.jump}><summary>Ir para outro capítulo ou versículo</summary>
      <TranslationNavigator key={`${book.slug}/${chapter}`} books={books.map(({ slug, name, verses }) => ({ slug, name, verses }))}
        slug={book.slug} chapter={chapter} />
    </details>
    <div className={styles.readingGrid}>
      <article className={styles.scripture} aria-label={`${book.name} ${chapter}, Open Nova Bíblia Viva`}>
        <ChapterReadingControls path={translationPath("open-nbv", book.slug, chapter)} label={`${book.name} ${chapter}`} />
        <ol className="bc-scripture" data-translation="open-nbv">
          {text.map((line, i) => <li key={i + 1} id={`v${i + 1}`} className={styles.verse}
            aria-current={verse === i + 1 ? "true" : undefined} data-verse={i + 1}>
            <Link className={styles.verseNumber} prefetch={false} href={`${translationPath("open-nbv", book.slug, chapter, i + 1)}#v${i + 1}`}
              aria-label={`${book.name} ${chapter}:${i + 1}, abrir passagem`}>{i + 1}</Link>
            <div><span data-scripture="" data-reading-ref={translationPath("open-nbv", book.slug, chapter, i + 1)}>{line}</span>
              <div className={styles.verseActions}><VerseActions path={translationPath("open-nbv", book.slug, chapter, i + 1)} label={`${book.name} ${chapter}:${i + 1}`} /></div>
            </div>
          </li>)}
        </ol>
        {pager}
        <footer id="edition-credit" className={styles.credit}>
          <p><strong>{edition.name}</strong></p><p>{edition.credit}</p>
          <p>The original Work by its copyright holders is available for free at www.biblica.com and open.bible.</p>
          <p>Texto reproduzido sem alterações. Biblica é marca registrada da Biblica, Inc. <a href={edition.licenseUrl}>CC BY-SA 4.0</a> · <Link href="/sobre">Todos os créditos</Link></p>
        </footer>
      </article>
      <aside className={styles.connections} aria-labelledby="chapter-connections">
        <p className={styles.kicker}>Continue a descoberta</p>
        <h2 id="chapter-connections" className="bc-title">Conexões do capítulo</h2>
        <p>Explore capítulos relacionados a {book.name} {chapter}, sem sair desta tradução.</p>
        {partners.length ? <ul>{partners.slice(0, 6).map((partner) => {
          const ref = chapterRef(partner.ci);
          return <li key={partner.ci}><Link prefetch={false} href={translationPath("open-nbv", ref.book.slug, ref.chapter)}>
            <span>{ref.label}</span><span aria-hidden="true">↗</span></Link></li>;
        })}</ul> : <p>Não há outro capítulo ligado a este na base de referências.</p>}
        <details><summary>Como estas conexões funcionam</summary>
          <p>São relações entre capítulos da base OpenBible.info. A numeração de alguns versículos difere entre edições. O alinhamento da Open NBV ainda está em revisão, por isso não atribuímos estas ligações a um versículo específico.</p>
          <p><Link href={`/${book.slug}/${chapter}`}>Ver as ligações por versículo na Bíblia Livre</Link></p>
        </details>
      </aside>
    </div>
    <TranslationVerseFocus key={`${book.slug}/${chapter}/${verse ?? ""}`} verse={verse} />
  </main>;
}
