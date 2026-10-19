import { chapterKey, type Explore, votesText } from "@/lib/explore/data";
import { curve } from "@/lib/explore/curve";
import { connectionPath } from "@/lib/explore/home";
import { partnersText } from "@/lib/explore/text";
import { canvasHeight, DESKTOP, LABEL_PAD, layoutChapter, PHONE, type LayoutSpec } from "@/lib/explore/layout";
import { medalhaoForBook } from "@/lib/medalhoes";
import { formatInt } from "@/lib/canon/text";
import { GraphNodes, type EdgeBoxes, type GraphNode } from "./GraphNodes";
import { PanZoom } from "./PanZoom";
import styles from "./explore.module.css";

// edge layers are drawn in these viewBoxes; the canvas keeps the desktop aspect, the phone one stretches a little
const DW = 1000;
const DH = canvasHeight(DESKTOP, DW);
const PW = 400;
const PH = canvasHeight(PHONE, PW);

/** sizes of a layout spec as CSS custom properties, so the page draws exactly what the layout test measures */
function vars(prefix: string, s: LayoutSpec): Record<string, string | number> {
  return {
    [`--${prefix}-dc`]: `${s.centre.d}px`,
    [`--${prefix}-fc`]: `${s.centre.font}px`,
    [`--${prefix}-dl`]: `${s.label.d}px`,
    [`--${prefix}-fl`]: `${s.label.font}px`,
    [`--${prefix}-fs`]: `${s.label.sub}px`,
    [`--${prefix}-dm`]: `${s.medal.d}px`,
    [`--${prefix}-dd`]: `${s.dot.d}px`,
    [`--${prefix}-gap`]: `${s.gap}px`,
    [`--${prefix}-cy`]: s.centreY,
  };
}

// The local graph of a chapter (server-rendered SVG edges + HTML nodes). The nodes and the gold selected line come
// from a small client component that reads the selection from the URL; pan and zoom are a separate island.
export function ExploreGraph({ data, fixed, footer }: { data: Explore; fixed?: string; footer?: React.ReactNode }) {
  const { centre, neighbours } = data;
  const ranked = neighbours.map((n) => ({ ci: n.ref.ci }));
  const desk = layoutChapter(DESKTOP, ranked);
  const phone = layoutChapter(PHONE, ranked);
  const phoneByRank = new Map(phone.map((p) => [p.rank, p]));
  const img = (osis: string) => {
    const m = medalhaoForBook(osis);
    return m ? { src: m.src96, src2: m.src192 } : null;
  };

  const nodes: GraphNode[] = neighbours.map((n, i) => {
    const d = desk[i];
    const p = phoneByRank.get(i);
    return {
      k: chapterKey(n.ref),
      href: connectionPath({ slug: centre.book.slug, chapter: centre.chapter }, { slug: n.ref.book.slug, chapter: n.ref.chapter }),
      kind: d.kind,
      title: n.ref.label,
      sub: votesText(n.votes),
      abbr: n.ref.book.abbr,
      d: [d.x, d.y, d.anchor],
      p: p ? [p.x, p.y] : null,
      img: d.kind === "dot" ? null : img(n.ref.book.osis),
    };
  });

  const dcx = DW / 2, dcy = DH * DESKTOP.centreY;
  const pcx = PW / 2, pcy = PH * PHONE.centreY;
  const spokes = (kinds: string[]) =>
    desk.filter((d) => kinds.includes(d.kind)).map((d) => curve(dcx, dcy, d.x * DW, d.y * DH)).join("");
  const faint = data.edges.map(([p, q]) => curve(desk[p].x * DW, desk[p].y * DH, desk[q].x * DW, desk[q].y * DH)).join("");
  const phoneSpokes = phone.map((p) => curve(pcx, pcy, p.x * PW, p.y * PH)).join("");
  const phoneFaint = data.edges
    .filter(([p, q]) => phoneByRank.has(p) && phoneByRank.has(q))
    .map(([p, q]) => {
      const a = phoneByRank.get(p)!, b = phoneByRank.get(q)!;
      return curve(a.x * PW, a.y * PH, b.x * PW, b.y * PH);
    })
    .join("");
  const boxes: EdgeBoxes = { desk: [DW, DH, DESKTOP.centreY], phone: [PW, PH, PHONE.centreY] };
  const centreImg = img(centre.book.osis);
  const shown = neighbours.length;
  const style = { ...vars("D", DESKTOP), ...vars("P", PHONE), "--pad": `${LABEL_PAD}px`, "--ph": `${PH}px`, "--ar": `${DW} / ${DH}`, "--arn": DH / DW } as React.CSSProperties;

  return (
    <div className={styles.graphBox}>
      <PanZoom
        label={`Grafo de ${centre.label}: os ${formatInt(shown)} capítulos com mais votos entre ${formatInt(data.partners)} ligados. A lista vem a seguir.`}
        hint="Com o grafo em foco, + e − aproximam e afastam, 0 ajusta e as setas movem. Cada capítulo é um link."
        footer={footer}
      >
        <div className={styles.canvas} style={style}>
          <svg className={`${styles.edges} ${styles.desk}`} viewBox={`0 0 ${DW} ${DH}`} preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.edgeFaint} d={faint} />
            <path className={styles.edgeFar} d={spokes(["medal", "dot"])} />
            <path className={styles.edgeSpoke} d={spokes(["label"])} />
          </svg>
          <svg className={`${styles.edges} ${styles.phone}`} viewBox={`0 0 ${PW} ${PH}`} preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.edgeFaint} d={phoneFaint} />
            <path className={styles.edgeSpoke} d={phoneSpokes} />
          </svg>
          <GraphNodes nodes={nodes} boxes={boxes} fixed={fixed} />
          <div className={`${styles.node} ${styles.centre}`} data-node={chapterKey(centre)}>
            <span className={styles.ring} aria-hidden="true">
              {centreImg ? (
                // eslint-disable-next-line @next/next/no-img-element -- a 192 px illustration, already sized; next/image adds JS
                <img className={styles.medalImg} src={centreImg.src2} width={192} height={192} loading="lazy" alt="" />
              ) : (
                <span className={styles.abbr}>{centre.book.abbr}</span>
              )}
            </span>
            <span className={styles.plate}>
              <span className={styles.plateTitle}>{centre.label}</span>
              <span className={styles.plateSub}>{partnersText(data.partners)}</span>
            </span>
          </div>
        </div>
      </PanZoom>
    </div>
  );
}

/** "Ilustração" labels for the legend when a shown medallion is an illustration (none until the set exists). */
export function illustrationsShown(data: Explore): string[] {
  const books = [data.centre.book, ...data.neighbours.slice(0, 11).map((n) => n.ref.book)];
  return [...new Set(books.map((b) => medalhaoForBook(b.osis)?.label).filter((l): l is string => Boolean(l)))];
}
