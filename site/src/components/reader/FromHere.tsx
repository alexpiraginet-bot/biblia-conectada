// "A partir deste trecho" (verse panel) and "A partir deste capítulo" (chapter panel), after Alex's reading reference:
// kicker, a headline computed from the data, a mini graph of the most voted partners and the strongest connection
// with its two ways onward. Server components; the mini graph is drawn in SVG + HTML with no JavaScript and is hidden
// from assistive technology, because the list below it holds the same links (design §8).
import Link from "next/link";
import { satellitePositions } from "@/lib/from-here";
import styles from "./reader.module.css";

export function PanelHead({ kicker, title, titleId }: { kicker: string; title: string; titleId: string }) {
  return (
    <>
      <p className="kicker">{kicker}</p>
      <h2 id={titleId} className={styles.panelTitle} tabIndex={-1}>
        {title}
      </h2>
    </>
  );
}

export type GraphNode = { key: number; label: string; votes: number };

/**
 * Centre and up to six partners on a ring, in canonical order; each edge is a shallow arc (the site's one motif) as
 * thick as its share of the strongest one. The strongest partner is drawn in the accent, the rest recede.
 */
export function MiniGraph({
  centre,
  nodes,
  topKey,
  legend,
  topLegend,
  note,
}: {
  centre: string;
  nodes: GraphNode[];
  topKey: number;
  /** what an edge is and what its thickness says */
  legend: string;
  /** what the highlighted partner is */
  topLegend: string;
  note: string | null;
}) {
  const ring = [...nodes].sort((a, b) => a.key - b.key);
  const pos = satellitePositions(ring.length);
  const max = Math.max(1, ...nodes.map((n) => n.votes));
  const edges = ring
    .map((n, i) => {
      const { x, y } = pos[i];
      // control point pushed sideways, so every edge bends the same way around the centre
      const mx = (50 + x) / 2 + (y - 50) * 0.18;
      const my = (50 + y) / 2 - (x - 50) * 0.18;
      const s = Math.max(0, n.votes) / max;
      return { key: n.key, d: `M50 50Q${mx.toFixed(1)} ${my.toFixed(1)} ${x} ${y}`, s, top: n.key === topKey };
    })
    .sort((a, b) => Number(a.top) - Number(b.top) || a.s - b.s);

  return (
    <figure className={styles.mini}>
      <div className={styles.miniBox} aria-hidden="true">
        <svg className={styles.miniSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
          {edges.map((e) => (
            <path
              key={e.key}
              d={e.d}
              className={e.top ? styles.miniTopEdge : styles.miniEdge}
              strokeWidth={(1.25 + 2.75 * e.s).toFixed(1)}
              strokeOpacity={e.top ? 1 : (0.35 + 0.5 * e.s).toFixed(2)}
            />
          ))}
        </svg>
        <span className={styles.miniCentre}>
          {centre}
        </span>
        {ring.map((n, i) => (
          <span
            key={n.key}
            className={n.key === topKey ? styles.miniTop : styles.miniNode}
            style={{ left: `${pos[i].x}%`, top: `${pos[i].y}%` }}
          >
            {n.label}
          </span>
        ))}
      </div>
      <figcaption className={styles.miniLegend}>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} aria-hidden="true" />
          {legend}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendTop} aria-hidden="true" />
          {topLegend}
        </span>
        {note && <span className={styles.legendNote}>{note}</span>}
      </figcaption>
    </figure>
  );
}

/** The strongest connection, "Gênesis 1:3 ↔ 2 Coríntios 4:6", with its pair page and the Explorar view. */
export function Featured({ a, b, conexao, explorar }: { a: string; b: string; conexao: string; explorar: string }) {
  return (
    <div className={styles.featured}>
      <p className={styles.featuredPair}>
        <span>{a}</span>
        <span className={styles.featuredArrow} aria-hidden="true">
          ↔
        </span>
        <span className="visually-hidden"> ligado a </span>
        <span>{b}</span>
      </p>
      <div className={styles.featuredActions}>
        <Link href={conexao} className={styles.btnPrimary}>
          Abrir conexão
        </Link>
        <Link href={explorar} className={styles.btn}>
          Ver no Explorar
        </Link>
      </div>
    </div>
  );
}
