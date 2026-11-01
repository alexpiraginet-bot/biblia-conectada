import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { VerseActions } from "@/components/assistant/VerseActions";
import { ScriptureText } from "@/components/explore/ScriptureText";
import { FocusTitle } from "@/components/explore/FocusTitle";
import { ConnectionShare } from "@/components/sharing/ConnectionShare";
import { connectionOf } from "@/lib/explore/atlas-data";
import { resolveChapter } from "@/lib/explore/data";
import { illustratedAtlasData } from "@/lib/explore/living-graph";
import { openingNodes } from "@/lib/explore/opening";
import { conexaoPath, parseSide } from "@/lib/conexao";
import { grid, verseText } from "@/lib/reading";
import { formatInt } from "@/lib/canon/text";
import { shareMetadata } from "@/lib/share-metadata";
import styles from "./arrival.module.css";

export const ensureStatic = "navigation";

export async function generateStaticParams() {
  return openingNodes(await illustratedAtlasData()).slice(1).map((node) => {
    const [, , a, b] = node.href.split("/");
    return { a, b };
  });
}

async function resolve(params: Promise<{ a: string; b: string }>) {
  const { a, b } = await params;
  const x = parseSide(a), y = parseSide(b);
  if (!x || !y || x.verse || y.verse) return null;
  const left = resolveChapter(x.slug, String(x.chapter)), right = resolveChapter(y.slug, String(y.chapter));
  if (!left || !right) return null;
  return connectionOf(left.book, left.chapter, right.book.firstChapter + right.chapter - 1);
}

export async function generateMetadata({ params }: PageProps<"/encontro/[a]/[b]">): Promise<Metadata> {
  const c = await resolve(params);
  if (!c) return { title: "Passagem não encontrada" };
  const { a, b } = await params;
  return shareMetadata({ title: `${c.centre.label} e ${c.other.label}`, description: "Siga esta conexão e leia as duas passagens no seu contexto.", path: `/encontro/${a}/${b}` });
}

/** A calm arrival, with the real strongest verse pair immediately visible, never a generated quotation. */
export default async function EncounterPage({ params }: PageProps<"/encontro/[a]/[b]">) {
  const c = await resolve(params);
  if (!c) notFound();
  const { a: pathA, b: pathB } = await params;
  const chapters = [c.centre, c.other];
  const verses = [c.strongest.here, c.strongest.there];
  const texts = await Promise.all(chapters.map((chapter, i) => verseText(grid.verseIndex(chapter.book, chapter.chapter, verses[i]))));
  const side = (i: number) => ({ book: chapters[i].book.index, slug: chapters[i].book.slug, chapter: chapters[i].chapter });
  return <main id="conteudo" className={styles.arrival} data-connection-arrival="">
    <div className={styles.inner}>
      <Link href="/" className={styles.back}><Icon name="chev-l" /> Voltar ao início</Link>
      <header className={styles.head}>
        <FocusTitle />
        <p className={styles.eyebrow}>Siga a Palavra</p>
        <h1 tabIndex={-1}>{c.centre.label}<span aria-hidden="true"> ↔ </span><span className="visually-hidden"> e </span>{c.other.label}</h1>
        <div className={styles.bridge} aria-hidden="true"><span /><svg viewBox="0 0 400 100"><path d="M0 45 C130 -30 230 150 400 45" /></svg><span /></div>
        <p className={styles.intro}>Uma conexão. Um novo olhar.</p>
        <p className={styles.fact}>{formatInt(c.pairs)} {c.pairs === 1 ? "par de versículos conectado" : "pares de versículos conectados"} · OpenBible.info</p>
      </header>
      <div className={styles.passages}>
        {chapters.map((chapter, i) => <section className={styles.card} key={chapter.path} aria-label={`${chapter.label}:${verses[i]}`}>
          <Link href={`${chapter.path}/${verses[i]}`} className={styles.reference}><span className={styles.miniOrb} aria-hidden="true" /><h2>{chapter.label}:{verses[i]}</h2><Icon name="chev-r" /></Link>
          <blockquote><ScriptureText text={texts[i]} /></blockquote>
          <VerseActions path={`${chapter.path}/${verses[i]}`} label={`${chapter.label}:${verses[i]}`} />
        </section>)}
      </div>
      <Link href={conexaoPath(side(0), side(1))} className={styles.primary}><Icon name="side" /> Ler os capítulos lado a lado <Icon name="chev-r" /></Link>
      <ConnectionShare path={`/encontro/${pathA}/${pathB}`} label={`${c.centre.label} ↔ ${c.other.label}`} />
      <Link href={`/explorar${c.centre.path}${c.other.path}`} className={styles.allConnections}>Ver todas as ligações entre estas passagens <Icon name="out" /></Link>
      <p className={styles.source}>Texto: Bíblia Livre (BLIVRE). As conexões vêm das referências cruzadas da OpenBible.info. Paisagem e travessia são ilustrações simbólicas.</p>
    </div>
  </main>;
}
