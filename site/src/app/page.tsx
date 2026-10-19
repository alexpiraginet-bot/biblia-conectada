import localFont from "next/font/local";
import Link from "next/link";
import { SiteHeader } from "@/components/header/SiteHeader";
import { HeroCover } from "@/components/home/HeroCover";
import { arcStrength } from "@/lib/arc-style";
import { formatInt } from "@/lib/canon/text";
import { summary, verseText } from "@/lib/data";
import { bookBySlug, chapterVerses, grid, verseX } from "@/lib/reading";
import styles from "./page.module.css";

// Cormorant Italic: the serif of the videos, used only for quotation and the cover lines. Declared here, not in the
// root layout, so other routes do not load it.
const quoteFace = localFont({
  src: "../fonts/Cormorant-Italic-VF.woff2",
  variable: "--font-quote",
  style: "italic",
  weight: "300 700",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

// Every number on this page comes from src/data/generated (scripts/build-data.ts); scripts/check-dist.ts checks them.
export default async function Home() {
  const top = summary.topVerses[0];
  const [, slug, chapter, verse] = top.path.split("/");
  const book = bookBySlug(slug);
  if (!book) throw new Error(`home: no book ${slug}`);
  const text = await verseText(slug, Number(chapter), Number(verse));
  const links = (await chapterVerses(book, Number(chapter)))[Number(verse) - 1].links;
  if (links.length !== top.links) throw new Error(`home: ${top.ref} has ${links.length} links, summary says ${top.links}`);
  const gv = grid.verseIndex(book, Number(chapter), Number(verse));
  const c = summary.counts;

  return (
    <>
      <SiteHeader overlay />
      <main id="conteudo" className={quoteFace.variable}>
        <HeroCover
          titleTop="Toda passagem"
          titleBottom="abre um mundo"
          skyLabel={`Céu noturno sobre colinas. No horizonte, uma luz: ${top.ref}. Dela partem ${formatInt(top.links)} arcos dourados, um para cada versículo ligado a ela, de Gênesis a Apocalipse.`}
          captionTop="Céu de ligações"
          captionLeft={`${top.ref} · ${formatInt(top.links)} ligações`}
          captionRight="BLIVRE · OpenBible.info"
          notesLabel="O céu de ligações"
          paragraph={`São ${formatInt(c.verses)} versículos e ${formatInt(c.crossrefRows)} referências cruzadas. Cada arco liga dois versículos; o que tem mais ligações é ${top.ref}, com ${formatInt(top.links)}.`}
          sky={{ x0: r4(verseX(gv)), arcs: links.flatMap(([p, votes]) => [r4(verseX(p)), r4(arcStrength(votes))]) }}
        >
          <p className={styles.actions}>
            <Link href={top.path} className={styles.primary}>
              Abrir {top.ref}
            </Link>
            <Link href="/arcos" className={styles.secondary}>
              Ver o céu de ligações
            </Link>
            <Link href="/ler" className={styles.secondary}>
              Escolher um livro
            </Link>
          </p>
        </HeroCover>

        <section className={styles.main} aria-labelledby="comeco">
          <h2 id="comeco" className={styles.title}>
            Um mapa das ligações da Bíblia
          </h2>
          <p className={styles.lede}>
            Abra um versículo e siga aonde ele leva. Em português, feito só com fontes livres.
          </p>
          <p>
            São {formatInt(c.verses)} versículos e {formatInt(c.crossrefRows)} referências cruzadas entre eles, que ligam{" "}
            {formatInt(c.arcs)} pares de versículos diferentes. O versículo com mais ligações é {top.ref}, com{" "}
            {formatInt(top.links)}:
          </p>
          <blockquote className={`${styles.verse} ${quoteFace.className}`}>
            <p>{text}</p>
            <footer>{top.ref} · BLIVRE</footer>
          </blockquote>
          <p className={styles.note}>
            &ldquo;Ligações&rdquo; aqui são os outros versículos que a base OpenBible.info relaciona a este, contados uma vez
            cada, com qualquer número de votos. Quando a referência aponta um trecho (como Mt 5:3–12), conta o primeiro
            versículo, como nos vídeos.
          </p>
          <p>
            O site está em construção. A leitura já tem as ligações de cada versículo; o grafo para explorar vem a seguir.{" "}
            <Link href="/sobre">Veja as fontes e os créditos</Link>.
          </p>
        </section>
      </main>
    </>
  );
}
