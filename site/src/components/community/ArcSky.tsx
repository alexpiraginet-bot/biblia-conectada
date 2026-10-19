// A window of night sky with arcs on the Gênesis→Apocalipse line, in the style of the reading pages (video 1).
// No hooks and no server-only imports: server pages and client islands draw the same figure.
import type { CSSProperties, ReactNode } from "react";
import { arcStrength, arcTone } from "@/lib/arc-style";
import { BASE } from "@/lib/community/books-client";
import { ARC_BASE, ARC_W, arcPath, baselineTicks } from "@/lib/community/geometry";
import styles from "./community.module.css";

const TICKS = baselineTicks(BASE);
/** with no arcs to show, only a band over the line is drawn */
const COMPACT_TOP = ARC_BASE - 64;

export type SkyArc = {
  x0: number;
  x1: number;
  /** "gold": lit; "tone": the stained-glass colour by span (video 1); "faint": context only */
  look: "gold" | "tone" | "faint";
  /** votes, for the stroke width of "tone" arcs */
  votes?: number;
  /** recedes (not opened yet on this device) */
  dim?: boolean;
  id?: string;
};
export type SkyStar = { x: number; gold?: boolean };
export type SkyLabel = { x: number; text: string; gold?: boolean };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function ArcSky({
  arcs,
  stars = [],
  labels = [],
  caption,
  captionId,
  className,
}: {
  arcs: SkyArc[];
  stars?: SkyStar[];
  labels?: SkyLabel[];
  caption: ReactNode;
  captionId: string;
  className?: string;
}) {
  const nt = BASE.ntStart * 100;
  const top = arcs.length ? 0 : COMPACT_TOP;
  const height = ARC_BASE + 26 - top;
  // labels sit just above their star; a label close to the previous one goes one row up
  const sorted = [...labels].sort((a, b) => a.x - b.x);
  const placed: (SkyLabel & { row: number })[] = [];
  for (const [i, l] of sorted.entries()) {
    const prev = placed[i - 1];
    placed.push({ ...l, row: prev && l.x - prev.x < 0.1 ? prev.row + 1 : 0 });
  }
  const many = stars.length > 8;
  // the short band has no room above the line for labels: the window grows by one row per stacked label
  const rows = placed.reduce((m, l) => Math.max(m, l.row + 1), 0);
  const padTop = !arcs.length && rows ? ({ "--sky-pad-top": `${r1(0.75 + 1.25 * rows)}rem` } as CSSProperties) : undefined;
  return (
    <figure className={`${styles.sky} ${className ?? ""}`}>
      <div className={styles.skyWindow} style={padTop}>
        <svg viewBox={`0 ${top} ${ARC_W} ${height}`} role="img" aria-labelledby={captionId} className={styles.skySvg}>
          <g fill="none" strokeLinecap="round">
            {arcs.map((a, i) => {
              const span = Math.abs(a.x1 - a.x0);
              const s = arcStrength(a.votes ?? 0);
              const stroke = a.look === "gold" ? "var(--sky-gold)" : a.look === "tone" ? arcTone(span) : "rgb(169 180 200 / 0.5)";
              return (
                <path
                  key={a.id ?? i}
                  d={arcPath(a.x0, a.x1)}
                  stroke={stroke}
                  strokeWidth={a.look === "gold" ? (arcs.length > 8 ? 1.6 : 2.4) : a.look === "tone" ? r1(0.9 + 1.2 * s) : 1}
                  strokeOpacity={a.dim ? 0.3 : a.look === "faint" ? 0.55 : a.look === "tone" ? Math.round((0.45 + 0.5 * s) * 100) / 100 : 1}
                  vectorEffect="non-scaling-stroke"
                  className={a.look === "gold" ? styles.skyGold : undefined}
                />
              );
            })}
          </g>
          <g className={styles.skyTicks}>
            <path d={`M0 ${ARC_BASE}H${ARC_W}`} vectorEffect="non-scaling-stroke" />
            <path d={TICKS.books} vectorEffect="non-scaling-stroke" />
            <path d={TICKS.nt} vectorEffect="non-scaling-stroke" />
          </g>
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={r1(s.x * ARC_W)}
              cy={ARC_BASE}
              r={many ? 3 : s.gold ? 5.5 : 4}
              className={s.gold ? styles.skyStarGold : styles.skyStar}
            />
          ))}
        </svg>
        <div className={styles.skyScale} aria-hidden="true">
          <span style={{ left: 0, width: `${nt}%` }}>AT</span>
          <span style={{ left: `${nt}%`, right: 0 }}>NT</span>
        </div>
        {placed.length > 0 && (
          <div className={styles.skyLabels} aria-hidden="true">
            {placed.map((l, i) => (
              <span
                key={i}
                className={l.gold ? styles.skyLabelGold : undefined}
                style={{
                  left: `${r1(l.x * 100)}%`,
                  bottom: `calc(${r1(((ARC_BASE + 26 - ARC_BASE) / height) * 100)}% + ${r1(0.55 + 1.2 * l.row)}rem)`,
                  transform: l.x < 0.06 ? "none" : l.x > 0.94 ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {l.text}
              </span>
            ))}
          </div>
        )}
      </div>
      <figcaption id={captionId} className={styles.skyCaption}>
        {caption}
      </figcaption>
    </figure>
  );
}
