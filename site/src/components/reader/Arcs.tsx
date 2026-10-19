// Links drawn as in video 1 (estudos/biblia-referencias/arcs.py, film.py): a baseline from Gênesis 1:1 to
// Apocalipse 22:21 with chapters equally spaced, each link a half ellipse over it, tinted by its span. Rendered on the
// server as SVG, with no client JavaScript. The night ground is kept in both themes (design §3).
import type { ReactNode } from "react";
import { arcStrength as strength, arcTone as tone } from "@/lib/arc-style";
import { formatInt } from "@/lib/canon/text";
import { books } from "@/lib/data";
import { type ChapterPartner, grid, type Link, verseX } from "@/lib/reading";
import styles from "./reader.module.css";

const W = 1000;
const BASE = 236; // baseline y; arcs rise above it
const TOP = 12;
// one vertical scale for every page, so heights compare: an arc over the whole Bible reaches TOP
const FLATTEN = (BASE - TOP) / (W / 2);

const r1 = (n: number) => Math.round(n * 10) / 10;

/** x of a verse on the baseline, in [0, W] */
const xOfVerse = (gv: number) => verseX(gv) * W;
/** x of the middle of a chapter */
function xOfChapter(ci: number): number {
  return ((ci + 0.5) / grid.chapterCount) * W;
}

const ntX = (books.find((b) => b.testament === "NT")!.firstChapter / grid.chapterCount) * W;
const bookTicks = books.map((b) => `M${r1((b.firstChapter / grid.chapterCount) * W)} ${BASE + 4}v8`).join("");

/** An arc to a point x of the baseline, with a strength in [0, 1] (votes for a verse, added light for a chapter). */
type Arc = { x: number; s: number };

const LEVELS = 4; // strength steps; each step is one stroke width and opacity
const TONES = 24; // colour steps over the span
const span = (x0: number, x: number) => Math.abs(x - x0) / W;

/**
 * Arcs of the same colour and strength go in one <path>, so a page with hundreds of links stays small (the markup is
 * sent twice, as HTML and as the React payload). Weak groups first, so the strongest links are drawn on top.
 */
function groups(x0: number, arcs: Arc[]) {
  const by = new Map<string, { level: number; tone: number; d: string[] }>();
  for (const a of arcs) {
    const level = Math.round(Math.min(Math.max(a.s, 0), 1) * LEVELS);
    const tone = Math.round(Math.pow(span(x0, a.x), 0.55) * TONES);
    const k = `${level}-${tone}`;
    const g = by.get(k) ?? { level, tone, d: [] };
    const [p, q] = x0 < a.x ? [x0, a.x] : [a.x, x0];
    const rx = (q - p) / 2;
    g.d.push(`M${Math.round(p)} ${BASE}A${Math.round(rx)} ${Math.round(rx * FLATTEN)} 0 0 1 ${Math.round(q)} ${BASE}`);
    by.set(k, g);
  }
  return [...by.values()]
    .sort((g, h) => g.level - h.level || g.tone - h.tone)
    .map((g) => ({
      key: `${g.level}-${g.tone}`,
      d: g.d.join(""),
      stroke: tone(Math.pow(g.tone / TONES, 1 / 0.55)),
      width: r1(0.5 + (1.3 * g.level) / LEVELS),
      opacity: r1(0.2 + (0.75 * g.level) / LEVELS),
    }));
}

function ArcStrip({ x0, arcs, id, caption }: { x0: number; arcs: Arc[]; id: string; caption: ReactNode }) {
  return (
    <figure className={styles.arcs}>
      <div className={styles.arcsSky}>
        <svg viewBox={`0 0 ${W} ${BASE + 26}`} role="img" aria-labelledby={id} className={styles.arcsSvg}>
          <g className={styles.arcsLinks} fill="none" strokeLinecap="round">
            {groups(x0, arcs).map((g) => (
              <path key={g.key} d={g.d} stroke={g.stroke} strokeWidth={g.width} strokeOpacity={g.opacity} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          <g className={styles.arcsTicks}>
            <path d={`M0 ${BASE}H${W}`} vectorEffect="non-scaling-stroke" />
            <path d={bookTicks} vectorEffect="non-scaling-stroke" />
            <path d={`M${r1(ntX)} ${BASE + 4}v18`} vectorEffect="non-scaling-stroke" />
          </g>
          <circle cx={r1(x0)} cy={BASE} r={22} className={styles.arcsGlow} />
          <circle cx={r1(x0)} cy={BASE} r={7} className={styles.arcsStar} />
        </svg>
        <div className={styles.arcsScale} aria-hidden="true">
          <span style={{ left: 0, width: `${r1((ntX / W) * 100)}%` }}>AT</span>
          <span style={{ left: `${r1((ntX / W) * 100)}%`, right: 0 }}>NT</span>
        </div>
      </div>
      <figcaption id={id} className={styles.arcsCaption}>
        {caption}
      </figcaption>
    </figure>
  );
}

/** The links of one verse: one arc per linked verse, stronger with more votes. */
export function VerseArcs({ gv, label, links }: { gv: number; label: string; links: Link[] }) {
  const arcs = links.map(([partner, votes]) => ({ x: xOfVerse(partner), s: strength(votes) }));
  return (
    <ArcStrip
      x0={xOfVerse(gv)}
      arcs={arcs}
      id={`arcos-${gv}`}
      caption={
        <>
          A linha vai de Gênesis a Apocalipse. Cada arco liga {label} a um dos {formatInt(links.length)}{" "}
          {links.length === 1 ? "versículo ligado" : "versículos ligados"}: a cor mostra a distância, e a espessura, os votos.
        </>
      }
    />
  );
}

/**
 * The links of a chapter, one arc per linked chapter. At this width the verses of a chapter share one point, so the
 * verse arcs to the same chapter are added up as light, as the video does: brightness 1 - exp(-sum of strengths).
 */
export function ChapterArcs({
  ci,
  label,
  partners,
  book,
}: {
  /** global chapter index; for a whole book, the middle of its chapters (may be fractional) */
  ci: number;
  label: string;
  partners: ChapterPartner[];
  /** true when the arcs start from a whole book and go to chapters of other books */
  book?: boolean;
}) {
  const arcs = partners.map((p) => ({ x: xOfChapter(p.ci), s: 1 - Math.exp(-0.45 * p.light) }));
  const noun = partners.length === 1 ? "capítulo" : "capítulos";
  return (
    <ArcStrip
      x0={xOfChapter(ci)}
      arcs={arcs}
      id={`arcos-${book ? "livro" : "cap"}-${ci}`}
      caption={
        <>
          A linha vai de Gênesis a Apocalipse. Cada arco liga {label} a um dos {formatInt(partners.length)} {noun}
          {book ? " de outros livros" : ""} {partners.length === 1 ? "ligado" : "ligados"}; quanto mais versículos e votos,
          mais luz.
        </>
      }
    />
  );
}

