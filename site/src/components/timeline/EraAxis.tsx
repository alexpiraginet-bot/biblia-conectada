import { ERAS, eraIndex, eraSpanLabel, eraX, type Axis } from "@/lib/eras";
import { formatInt } from "@/lib/canon/text";
import styles from "./timeline.module.css";

export type AxisMark = { key: string; year: number };
export type AxisLane = {
  id: string;
  label: string;
  /** how one mark of this lane is counted in the era columns ("evento", "eventos") */
  unit: [string, string];
  marks: AxisMark[];
  tone: "history" | "work" | "here";
  /** text instead of the count in the era columns ("29 d.C." for the event itself) */
  countText?: string;
  /** sentence shown across the lane when it has no source yet */
  empty?: string;
};

const count = (n: number, unit: [string, string]) => `${formatInt(n)} ${n === 1 ? unit[0] : unit[1]}`;

/**
 * The five eras of the site (src/lib/eras.ts) as columns. Each column states its span and, in text, how many marks of
 * each lane fall in it: that text is the accessible version and the whole view on phones. From 48rem the lanes are
 * drawn as rows of marks placed by eraX (decorative, hidden from assistive technology).
 */
export function EraAxis({ axis, lanes, caption }: { axis: Axis; lanes: AxisLane[]; caption: string }) {
  const perEra = (lane: AxisLane, i: number) => lane.marks.filter((m) => eraIndex(m.year) === i).length;
  return (
    <figure className={styles.axis}>
      <figcaption className={styles.axisCaption}>{caption}</figcaption>
      <ol className={styles.eras}>
        {ERAS.map((era, i) => (
          <li key={era.id} className={styles.era}>
            <p className={styles.eraName}>{era.label}</p>
            <p className={styles.eraSpan}>{eraSpanLabel(i, axis)}</p>
            <ul className={styles.eraCounts}>
              {lanes
                .filter((l) => !l.empty)
                .map((l) => {
                  const n = perEra(l, i);
                  return n ? (
                    <li key={l.id}>
                      <span className={`${styles.swatch} ${styles[l.tone]}`} aria-hidden="true" />
                      {l.label}: {l.countText ?? count(n, l.unit)}
                    </li>
                  ) : null;
                })}
            </ul>
          </li>
        ))}
      </ol>
      <div className={styles.lanes}>
        {lanes.map((l) => (
          <div key={l.id} className={styles.lane} data-empty={l.empty ? "" : undefined}>
            <p className={styles.laneLabel} aria-hidden={l.empty ? undefined : "true"}>
              {l.label}
            </p>
            <div className={styles.track}>
              {ERAS.slice(1).map((e, i) => (
                <span key={e.id} className={styles.boundary} style={{ left: `${((i + 1) * 100) / ERAS.length}%` }} aria-hidden="true" />
              ))}
              {l.empty ? (
                <p className={styles.trackEmpty}>{l.empty}</p>
              ) : (
                <span aria-hidden="true">
                  {/* marks that land on the same spot are drawn once */}
                  {[...new Set(l.marks.map((m) => (eraX(m.year, axis) * 100).toFixed(2)))].map((left) => (
                    <span key={left} className={`${styles.mark} ${styles[l.tone]}`} style={{ left: `${left}%` }} />
                  ))}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
