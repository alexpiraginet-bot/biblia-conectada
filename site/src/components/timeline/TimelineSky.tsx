import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { yearLabel, yearSpanShort } from "@/lib/eras";
import { Icon } from "@/components/icons";
import { verseRef } from "@/lib/reading";
import type { TimelineEvent } from "@/lib/timeline";
import type { CrossArc } from "@/lib/timeline-graph";
import type { Period } from "@/lib/timeline-periods";
import styles from "./timeline.module.css";

// The Linha do tempo as a strip of sky (design "ArcWindow": navy in both themes, gold arcs over a baseline). The
// baseline is the sequence of events, every period an equal share of it; a tick per event, taller the more links touch
// it; a gold arc for each of the most voted links between verses of different events. Drawn on the server as SVG; the
// period labels are text under it, and the arcs are listed in text right after the figure.

const W = 1000;
const BASE = 214;
const TOP = 10;
const LEVELS = 4;
const r1 = (n: number) => Math.round(n * 10) / 10;
const strength = (n: number, max: number) => (max > 0 ? Math.log1p(Math.max(n, 0)) / Math.log1p(max) : 0);

type Item = { e: TimelineEvent; index: number };

export function TimelineSky({ periods, events, arcs }: { periods: Period<TimelineEvent>[]; events: readonly TimelineEvent[]; arcs: CrossArc[] }) {
  // x of each event: its period's tenth of the line, the events evenly spaced inside it
  const x = new Map<number, number>();
  periods.forEach((p, k) => p.events.forEach((_, j) => x.set(p.start + j, ((k + (j + 0.5) / p.events.length) / periods.length) * W)));
  const maxPairs = Math.max(...events.map((e) => e.links.pairs));
  const ticks = events.map((e, i) => `M${r1(x.get(i)!)} ${BASE}v-${r1(3 + 15 * strength(e.links.pairs, maxPairs))}`).join("");
  const bounds = periods
    .slice(1)
    .map((_, k) => `M${r1(((k + 1) / periods.length) * W)} ${BASE - 4}v14`)
    .join("");
  const maxVotes = Math.max(...arcs.map((a) => a.votes));
  const ends = arcs.map((a) => [x.get(a.ea)!, x.get(a.eb)!].sort((m, n) => m - n));
  // one vertical scale for all arcs, so that the widest reaches the top of the strip
  const flatten = (BASE - TOP) / Math.max(1, ...ends.map(([p, q]) => (q - p) / 2));
  const levels = Array.from({ length: LEVELS }, () => [] as string[]);
  arcs.forEach((a, k) => {
    const [p, q] = ends[k];
    const rx = Math.max((q - p) / 2, 0.5);
    const level = Math.min(LEVELS - 1, Math.floor(strength(a.votes, maxVotes) ** 2 * LEVELS));
    levels[level].push(`M${r1(p)} ${BASE}A${r1(rx)} ${r1(rx * flatten)} 0 0 1 ${r1(q)} ${BASE}`);
  });
  const span = `${yearLabel(events[0].year)} a ${yearLabel(events[events.length - 1].year)}`;
  return (
    <figure className={`bc-window ${styles.sky}`}>
      <svg className={styles.skySvg} viewBox={`0 0 ${W} ${BASE + 12}`} preserveAspectRatio="none" role="img" aria-labelledby="ceu-legenda">
        <path d={`M0 ${BASE}H${W}`} className={styles.skyBase} vectorEffect="non-scaling-stroke" />
        <path d={bounds} className={styles.skyBounds} vectorEffect="non-scaling-stroke" />
        <path d={ticks} className={styles.skyTicks} vectorEffect="non-scaling-stroke" />
        <g fill="none" strokeLinecap="round">
          {levels.map((d, l) =>
            d.length ? (
              <path
                key={l}
                d={d.join("")}
                className={styles.skyArc}
                strokeWidth={r1(0.9 + (1.4 * l) / (LEVELS - 1))}
                strokeOpacity={r1(0.4 + (0.55 * l) / (LEVELS - 1))}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </g>
      </svg>
      <ol className={styles.skyPeriods} aria-label="Períodos">
        {periods.map((p) => (
          <li key={p.id}>
            <span className={styles.skyName}>{p.label}</span>
            <span className={styles.skyYears}>{yearSpanShort(p.first, p.last)}</span>
          </li>
        ))}
      </ol>
      <figcaption id="ceu-legenda" className={`bc-window__caption ${styles.skyCaption}`}>
        <span>
          Os {formatInt(events.length)} eventos de {span}, em {formatInt(periods.length)} períodos de largura igual: um traço por evento, mais alto
          quanto mais ligações tocam o trecho. Em ouro, as {formatInt(arcs.length)} ligações mais votadas entre versículos de eventos diferentes.
        </span>
      </figcaption>
    </figure>
  );
}

/** The arcs of the sky, in text: the accessible version of the drawing (design §8). */
export function ArcList({ arcs, events }: { arcs: CrossArc[]; events: readonly TimelineEvent[] }) {
  const max = Math.max(...arcs.map((a) => a.votes));
  const side = (gv: number) => {
    const r = verseRef(gv);
    return { book: r.book.index, slug: r.book.slug, chapter: r.chapter, verse: r.verse };
  };
  return (
    <details className={styles.arcList}>
      <summary className={styles.arcSummary}>
        <Icon name="chev-r" className={`bc-icon ${styles.arcChevron}`} />
        <span>As {formatInt(arcs.length)} ligações do céu em lista</span>
      </summary>
      <p className={styles.arcRule}>
        Das mais votadas às menos votadas. Votos: os leitores da OpenBible.info, somadas as duas direções. Cada versículo fica no menor
        evento que o contém.
      </p>
      <ol className="bc-conns">
        {arcs.map((a) => {
          const ra = verseRef(a.a);
          const rb = verseRef(a.b);
          const ea = events[a.ea];
          const eb = events[a.eb];
          return (
            <li key={`${a.a}-${a.b}`} className="bc-conn">
              <Link href={conexaoPath(side(a.a), side(a.b))} className="bc-conn__ref">
                {ra.label} e {rb.label}
              </Link>
              <span className="bc-conn__votes">
                <span className="bc-conn__bar" style={{ "--w": (a.votes / max).toFixed(3) } as React.CSSProperties} aria-hidden="true" />
                {formatInt(a.votes)} votos
              </span>
              <p className={styles.arcEvents}>
                <Link href={`/linha-do-tempo/${ea.slug}`}>{ea.ref}</Link> ({yearLabel(ea.year)}) e{" "}
                <Link href={`/linha-do-tempo/${eb.slug}`}>{eb.ref}</Link> ({yearLabel(eb.year)})
              </p>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
