import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icons";
import { AtlasMap } from "@/components/explore/AtlasMap";
import { ConnectionPanel, connectionFact } from "@/components/explore/ConnectionPanel";
import { MapList } from "@/components/explore/MapList";
import { ScriptureText } from "@/components/explore/ScriptureText";
import explore from "@/components/explore/explore.module.css";
import { HeroSearch } from "@/components/home/HeroSearch";
import { Peek } from "@/components/home/Peek";
import peek from "@/components/home/Peek.module.css";
import { formatInt } from "@/lib/canon/text";
import { summary } from "@/lib/data";
import { atlasOf, defaultConnection, medals } from "@/lib/explore/atlas-data";
import { chapterKey, resolveChapter } from "@/lib/explore/data";
import { EXPLORE_HOME, EXPLORE_HOME_PATH } from "@/lib/explore/home";
import { partnersText } from "@/lib/explore/text";
import { verseText } from "@/lib/reading";
import styles from "./page.module.css";

const links = (n: number) => `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`;

// The capa (design §5): the title, a sentence of facts and the big search field; the map of Isaías 9 (the chapter of
// the verse with the most links) with its selected connection beside it, peeking from the bottom on phones; below, in
// Read mode, the list of the map and the most linked verses. Every number comes from src/data/generated
// (scripts/build-data.ts); scripts/check-dist.ts and scripts/checks/explore.ts check them in the built page.
export default async function Home() {
  const home = resolveChapter(EXPLORE_HOME.slug, String(EXPLORE_HOME.chapter));
  if (!home) notFound();
  const atlas = await atlasOf(home.book, home.chapter);
  const top = await defaultConnection(home.book, home.chapter);
  if (!top) throw new Error("home: the map centre has no linked chapter");
  const c = summary.counts;
  const first = summary.topVerses[0];
  const verses = await Promise.all(summary.topVerses.map(async (t) => ({ ...t, text: await verseText(t.gv) })));
  const lead = medals()[top.group];

  return (
    <main id="conteudo" className={styles.home}>
      <div className={styles.cover}>
        <div className={styles.head}>
          <h1 className={`bc-display ${styles.title}`}>Toda passagem abre um mundo.</h1>
          <p className={`bc-lede ${styles.lede}`}>
            {atlas.centre.label} e os {partnersText(atlas.partners)} a ele, entre as {formatInt(c.crossrefRows)} referências cruzadas
            dos {formatInt(c.verses)} versículos da Bíblia Livre.
          </p>
          <HeroSearch text="Buscar versículo, palavra ou livro" />
        </div>
        <div className={`${styles.map} ${explore.mapCol}`}>
          <AtlasMap atlas={atlas} selected={{ key: chapterKey(top.other), group: top.group }} fixed />
        </div>
        <div className={styles.panel}>
          <ConnectionPanel c={top} />
        </div>
      </div>

      <Peek target="conexao">
        <span className={peek.marks} aria-hidden="true">
          <span className={peek.seal}>{atlas.centre.chapter}</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- a 96 px illustration, already sized */}
          <img className="bc-medallion__img" src={lead.src96} width={96} height={96} alt="" />
        </span>
        <span className={peek.text}>
          <span className={peek.title}>
            {top.centre.label} e {top.other.label}
          </span>
          <span className={peek.sub}>{connectionFact(top)}</span>
        </span>
        <Icon name="chev-r" className={`bc-icon ${peek.chev}`} />
      </Peek>

      <div className={styles.read}>
        <MapList atlas={atlas} />

        <section className={styles.verses} aria-labelledby="mais-ligados">
          <h2 id="mais-ligados" className="bc-section-title">
            Os versículos mais ligados
            <small>ligações de cada versículo, das mais às menos</small>
          </h2>
          <p className={styles.facts} data-definition="">
            As {formatInt(c.crossrefRows)} referências cruzadas da OpenBible.info ligam {formatInt(c.arcs)} pares de versículos
            diferentes. O versículo com mais ligações é {first.ref}, com {formatInt(first.links)}: &ldquo;ligações&rdquo; de um
            versículo são os outros versículos que a base relaciona a ele, contados uma vez cada, com qualquer número de votos.
            Quando a referência aponta um trecho (como Mateus 5:3–12), conta o primeiro versículo, como nos vídeos.
          </p>
          <ol className={styles.verseList}>
            {verses.map((v) => (
              <li key={v.gv} data-top-verse={v.path}>
                <p className={styles.verseHead}>
                  <Link href={v.path} className={styles.verseRef}>
                    {v.ref}
                  </Link>
                  <span className={styles.verseCount}>{links(v.links)}</span>
                </p>
                <p className={styles.verseText}>
                  <ScriptureText text={v.text} />
                </p>
              </li>
            ))}
          </ol>
          <p className={styles.onward}>
            <Link href={EXPLORE_HOME_PATH} className={styles.more}>
              Abrir o mapa de {atlas.centre.label} no Explorar
              <Icon name="chev-r" />
            </Link>
            <Link href="/arcos" className={styles.more}>
              Ver o céu de ligações
              <Icon name="chev-r" />
            </Link>
            <Link href="/sobre" className={styles.more}>
              Fontes e créditos
              <Icon name="chev-r" />
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
