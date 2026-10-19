"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { curve } from "@/lib/explore/curve";
import styles from "./explore.module.css";

/** One partner chapter on the canvas. `d` is its desktop slot [x, y, anchor], `p` its phone slot [x, y] (shares). */
export type GraphNode = {
  k: string;
  href: string;
  kind: "label" | "medal" | "dot";
  title: string;
  sub: string;
  abbr: string;
  d: [number, number, "start" | "middle" | "end"];
  p: [number, number] | null;
  img: { src: string; src2: string } | null;
};

/** viewBox sizes of the two edge layers (desktop and phone), and where the centre sits in each */
export type EdgeBoxes = { desk: [number, number, number]; phone: [number, number, number] };

// The nodes of the graph and the gold line of the selected connection. The selection lives in the URL: on
// /explorar/<livro>/<cap>/<livro2>/<cap2> it is the last two segments, on /explorar/<livro>/<cap> the strongest
// partner (first node). Rendered on the server too, so the static HTML already marks it.
export function GraphNodes({ nodes, boxes, fixed }: { nodes: GraphNode[]; boxes: EdgeBoxes; fixed?: string }) {
  const segments = useSelectedLayoutSegments().filter((s) => !s.startsWith("__") && !s.startsWith("("));
  const key = fixed ?? (segments.length >= 2 ? `${segments[0]}-${segments[1]}` : nodes[0]?.k);
  const sel = nodes.find((n) => n.k === key);
  const [dw, dh, dcy] = boxes.desk;
  const [pw, ph, pcy] = boxes.phone;

  return (
    <>
      {sel && (
        <>
          <svg key={`d-${sel.k}`} className={`${styles.edges} ${styles.desk}`} viewBox={`0 0 ${dw} ${dh}`} preserveAspectRatio="none" aria-hidden="true">
            <path className={styles.edgeSel} pathLength={1} d={curve(dw / 2, dh * dcy, sel.d[0] * dw, sel.d[1] * dh)} />
          </svg>
          {sel.p && (
            <svg key={`p-${sel.k}`} className={`${styles.edges} ${styles.phone}`} viewBox={`0 0 ${pw} ${ph}`} preserveAspectRatio="none" aria-hidden="true">
              <path className={styles.edgeSel} pathLength={1} d={curve(pw / 2, ph * pcy, sel.p[0] * pw, sel.p[1] * ph)} />
            </svg>
          )}
        </>
      )}
      {nodes.map((n) => {
        const current = n.k === key;
        const style = { "--x": n.d[0], "--y": n.d[1], "--xp": n.p?.[0] ?? 0, "--yp": n.p?.[1] ?? 0 } as React.CSSProperties;
        const ring = (
          <span className={styles.ring} aria-hidden="true">
            {n.img ? (
              // eslint-disable-next-line @next/next/no-img-element -- a 96 px illustration, already sized; next/image adds JS
              <img className={styles.medalImg} src={n.img.src} srcSet={`${n.img.src} 1x, ${n.img.src2} 2x`} width={96} height={96} loading="lazy" alt="" />
            ) : (
              <span className={styles.abbr}>{n.abbr}</span>
            )}
          </span>
        );
        if (n.kind === "dot") {
          return (
            <Link key={n.k} href={n.href} prefetch={false} tabIndex={-1} aria-hidden="true" className={`${styles.node} ${styles.dot}`} data-sel={current || undefined} data-node={n.k} style={style}>
              <span className={styles.tip}>
                {n.title} · {n.sub}
              </span>
            </Link>
          );
        }
        return (
          <Link
            key={n.k}
            href={n.href}
            aria-current={current ? "true" : undefined}
            className={`${styles.node} ${n.kind === "label" ? styles.labelled : styles.medal}`}
            data-anchor={n.d[2]}
            data-phone={n.p ? "" : undefined}
            data-node={n.k}
            style={style}
          >
            {ring}
            <span className={n.kind === "label" ? styles.plate : styles.tip}>
              <span className={styles.plateTitle}>{n.title}</span>
              <span className="visually-hidden">, </span>
              <span className={styles.plateSub}>{n.sub}</span>
            </span>
          </Link>
        );
      })}
    </>
  );
}
