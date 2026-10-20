// The links panel of a chapter or a verse (design §6, "A partir deste trecho / deste capítulo"): the title, a data
// headline, a mini map of the most voted partners and the strongest connection with its two ways onward. Server
// components. The mini map is a sky window (gold on navy in both themes, design §3) with the book-group medallions;
// it is hidden from assistive technology, because the list below it holds the same links (design §8).
import Link from "next/link";
import { Icon } from "@/components/icons";
import { keepBookNumber, satellitePositions } from "@/lib/from-here";
import styles from "./reader.module.css";

export function PanelHead({ title, titleId }: { title: string; titleId: string }) {
  return (
    <h2 id={titleId} className={`bc-title ${styles.panelTitle}`} tabIndex={-1}>
      {keepBookNumber(title)}
    </h2>
  );
}

/** A partner on the mini map: its short label ("Lc 2:11"), votes and its book group's medallion (96 px WebP). */
export type MapNode = { key: number; label: string; votes: number; medal: { src: string } | null };

/**
 * The passage in the centre and up to six partners on a ring, in canonical order; each edge is a shallow arc (the
 * site's one motif) as thick as its share of the strongest one, which is drawn whole.
 */
export function MiniMap({
  centre,
  nodes,
  topKey,
  legend,
  topLegend,
  note,
  groups,
}: {
  centre: string;
  nodes: MapNode[];
  topKey: number;
  /** what an edge is and what its thickness says */
  legend: string;
  /** what the highlighted partner is */
  topLegend: string;
  note: string | null;
  /** the medallions drawn, named: "Evangelhos (pães e peixes)" */
  groups: string[];
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
    <figure className={`bc-window ${styles.map}`}>
      <div className={styles.mapBox} aria-hidden="true">
        <svg className={styles.mapSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
          {edges.map((e) => (
            <path
              key={e.key}
              d={e.d}
              className={styles.mapEdge}
              strokeWidth={e.top ? 4 : (1.25 + 2.25 * e.s).toFixed(1)}
              strokeOpacity={e.top ? 1 : (0.4 + 0.45 * e.s).toFixed(2)}
            />
          ))}
        </svg>
        <span className={styles.mapCentre}>{centre}</span>
        {ring.map((n, i) => (
          <span
            key={n.key}
            className={styles.mapNode}
            data-top={n.key === topKey || undefined}
            style={{ left: `${pos[i].x}%`, top: `${pos[i].y}%` }}
          >
            {n.medal ? (
              // eslint-disable-next-line @next/next/no-img-element -- a 96 px illustration, already sized; next/image adds JS
              <img className={styles.mapMedal} src={n.medal.src} width={96} height={96} loading="lazy" decoding="async" alt="" />
            ) : (
              <span className={styles.mapMedal} />
            )}
            <span className={styles.mapLabel}>{n.label}</span>
          </span>
        ))}
      </div>
      <figcaption className={`bc-window__caption ${styles.mapCaption}`}>
        <span className={styles.legendItem}>
          <span className={styles.legendLine} aria-hidden="true" />
          {legend}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendTop} aria-hidden="true" />
          {topLegend}
        </span>
        {note && <span>{note}</span>}
        {groups.length > 0 && <span>Ilustração por grupo de livros: {groups.join(", ")}.</span>}
      </figcaption>
    </figure>
  );
}

/** The strongest connection, "Gênesis 1:3 ⇄ 2 Coríntios 4:6", with its pair page and the Explorar view. */
export function Featured({ a, b, conexao, explorar }: { a: string; b: string; conexao: string; explorar: string }) {
  return (
    <div className={styles.featured}>
      <p className={styles.featuredPair}>
        <span>{keepBookNumber(a)}</span>
        <Icon name="both" className={`bc-icon ${styles.featuredIcon}`} />
        <span className="visually-hidden"> ligado a </span>
        <span>{keepBookNumber(b)}</span>
      </p>
      <div className={styles.actions}>
        <Link href={conexao} className="bc-button bc-button--primary">
          Abrir conexão
        </Link>
        <Link href={explorar} className="bc-button bc-button--secondary">
          Ver no Explorar
        </Link>
      </div>
    </div>
  );
}
