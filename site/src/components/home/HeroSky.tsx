import Link from "next/link";
import chapterLinksJson from "@/data/generated/chapter-links.json";
import { Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { books, summary } from "@/lib/data";
import { HERO_ARC_HEIGHT, heroArcGroups, heroArcs, type ChapterLinks } from "@/lib/home/hero-arcs";
import dawn from "./DawnOpening.module.css";
import styles from "./HeroSky.module.css";

const LAYERS = [3, 2, 1, 0] as const;

/**
 * The cover's first scene: the whole Bible on one horizon and, over it, one arc from each chapter to the chapter
 * most linked to it, rising from the horizon when the page opens (CSS only; still with reduced motion). The drawing
 * is data (lib/home/hero-arcs.ts) and every number in the sentence under it is counted, never typed. Rendered inside
 * the opening (DawnOpening), whose colours it follows.
 */
export function HeroSky() {
  const links = chapterLinksJson as unknown as ChapterLinks;
  const chapters = links.length;
  const arcs = heroArcs(links);
  const groups = heroArcGroups(arcs, chapters);
  const first = books[0];
  const last = books[books.length - 1];
  const gospel = books.find((b) => b.testament === "NT")!;
  return (
    <div className={styles.sky} data-hero-sky="">
      <div className={styles.backdrop} aria-hidden="true" />
      {/* the first screen: the sky, the title and the way in; what the sky is made of comes right under it */}
      <div className={styles.fold}>
        <div className={styles.dome} aria-hidden="true">
          {LAYERS.map((layer) => (
            <svg key={layer} className={styles.layer} data-layer={layer} viewBox={`0 0 ${chapters} ${HERO_ARC_HEIGHT}`} preserveAspectRatio="none" focusable="false">
              {groups
                .filter((g) => g.layer === layer)
                .map((g) => (
                  <path key={g.tone} d={g.d} stroke={g.tone} />
                ))}
            </svg>
          ))}
          <span className={styles.horizon} />
          <p className={styles.books} style={{ "--nt": `${(100 * gospel.firstChapter) / chapters}%` } as React.CSSProperties}>
            <span>{first.name}</span>
            <span className={styles.testament}>{gospel.name}</span>
            <span>{last.name}</span>
          </p>
        </div>
        <div className={styles.copy}>
          <p className={dawn.eyebrow}>
            <span aria-hidden="true" /> Um encontro com a Palavra
          </p>
          <h1 id="home-title" className={styles.title}>
            Uma Palavra.
            <br />
            <em>Novos caminhos.</em>
          </h1>
          <p className={styles.lead}>Descubra como cada passagem se conecta à sua vida.</p>
          <div className={`${dawn.ctas} ${styles.ctas}`}>
            <Link href="/ler" className={dawn.primary} data-hero-read="">
              Começar a ler
              <Icon name="chev-r" />
            </Link>
            <div className={dawn.secondaryLinks}>
              <Link href="/liturgia" prefetch={false}>
                Leituras de hoje <Icon name="out" />
              </Link>
              <Link href="/arcos" prefetch={false}>
                Céu em 3D <Icon name="out" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.copy}>
        <p className={styles.legend} data-hero-legend="">
          O céu acima é feito de dados: {formatInt(arcs.length)} arcos, um de cada capítulo ao capítulo com mais versículos ligados a ele. São{" "}
          {formatInt(summary.counts.books)} livros, {formatInt(chapters)} capítulos e {formatInt(summary.counts.arcs)} pares de versículos diferentes nas
          referências cruzadas da OpenBible.info.
        </p>
      </div>
    </div>
  );
}
