import localFont from "next/font/local";
import Link from "next/link";
import { ConnectionPanel } from "@/components/explore/ConnectionPanel";
import { Explorer } from "@/components/explore/Explorer";
import { scripture } from "@/components/explore/fonts";
import { NeighbourList } from "@/components/explore/NeighbourList";
import explore from "@/components/explore/explore.module.css";
import { SiteHeader } from "@/components/header/SiteHeader";
import { HeroCover } from "@/components/home/HeroCover";
import { arcStrength } from "@/lib/arc-style";
import { formatInt } from "@/lib/canon/text";
import { summary } from "@/lib/data";
import { chapterKey, explore as exploreData, resolveChapter } from "@/lib/explore/data";
import { EXPLORE_HOME, EXPLORE_HOME_PATH } from "@/lib/explore/home";
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

// Every number on this page comes from src/data/generated (scripts/build-data.ts); scripts/check-dist.ts and
// scripts/checks/explore.ts check them.
export default async function Home() {
  const top = summary.topVerses[0];
  const [, slug, chapter, verse] = top.path.split("/");
  const book = bookBySlug(slug);
  if (!book) throw new Error(`home: no book ${slug}`);
  const links = (await chapterVerses(book, Number(chapter)))[Number(verse) - 1].links;
  if (links.length !== top.links) throw new Error(`home: ${top.ref} has ${links.length} links, summary says ${top.links}`);
  const gv = grid.verseIndex(book, Number(chapter), Number(verse));
  const c = summary.counts;
  // the Explorar below the cover opens on the chapter of the cover's verse (src/lib/explore/home.ts)
  const home = resolveChapter(EXPLORE_HOME.slug, String(EXPLORE_HOME.chapter));
  if (!home) throw new Error("home: no Explorar centre");
  const ex = await exploreData(home.book, home.chapter);
  const centre = ex.centre;
  const first = ex.neighbours[0];
  const topInCentre = book.index === home.book.index && Number(chapter) === home.chapter;

  return (
    <>
      <SiteHeader overlay />
      <main id="conteudo" className={`${quoteFace.variable} ${scripture.variable}`}>
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

        <section className={explore.homeSection} aria-labelledby="explorar">
          <div className={explore.homeHead}>
            <p className="kicker">Explorar</p>
            <h2 id="explorar" className={explore.homeTitle}>
              {centre.label}
            </h2>
            <p className={explore.homeLede}>
              As {formatInt(c.crossrefRows)} referências cruzadas ligam {formatInt(c.arcs)} pares de versículos diferentes.{" "}
              {centre.label}
              {topInCentre ? `, o capítulo de ${top.ref},` : ""} está ligado a {formatInt(ex.partners)} capítulos; o grafo
              mostra os {formatInt(ex.neighbours.length)} com mais votos. Escolha um para ver a conexão.
            </p>
            <p className={styles.note}>
              &ldquo;Ligações&rdquo; de um versículo são os outros versículos que a base OpenBible.info relaciona a ele,
              contados uma vez cada, com qualquer número de votos: as {formatInt(top.links)} de {top.ref} na capa. Quando a
              referência aponta um trecho (como Mt 5:3–12), conta o primeiro versículo, como nos vídeos.
            </p>
            <p className={explore.homeLinks}>
              <Link href={EXPLORE_HOME_PATH}>Abrir {centre.label} no Explorar</Link>
              <Link href="/sobre">Fontes e créditos</Link>
            </p>
          </div>
          <Explorer data={ex} fixed={chapterKey(first.ref)} panel={<ConnectionPanel data={ex} n={first} level={3} />} />
          <NeighbourList data={ex} level={3} />
        </section>
      </main>
    </>
  );
}
