"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useId, useRef, useState } from "react";
import type { HubView, NodeView, VariantView } from "./atlas-view";
import styles from "./explore.module.css";

type Selection = { key: string; group: string };

const unit = (n: number) => ({ "--s": n }) as React.CSSProperties;
const at = (x: number, y: number, W: number, H: number) => ({ "--x": x / W, "--y": y / H });
const plate = (l: [number, number, number, number]) => ({ "--lx": l[0], "--ly": l[1], "--lw": l[2], "--lh": l[3] });

// The links of the map: the eight medallions and the chapters around them, plus the gold line of the selected
// connection, drawn from the seal to the chapter (the one orchestrated moment of the site). The selection lives in the
// URL: on /explorar/<livro>/<cap>/<livro2>/<cap2> it is the last two segments; elsewhere the `fallback` (the most voted
// linked chapter). Rendered on the server too, so the static HTML already marks it.
// Keyboard: one Tab stop for the whole map; the side arrows move between medallions, down and up go through the
// chapters of a medallion's group, Home and End jump to the first and last medallion.
export function AtlasNodes({
  v,
  fallback,
  fixed = false,
  groupOfSlug,
  label,
  hint,
}: {
  v: VariantView;
  fallback: Selection;
  /** the home: the selection never follows the URL */
  fixed?: boolean;
  /** book slug -> group, for a selected chapter that is not drawn */
  groupOfSlug: Record<string, string>;
  label: string;
  hint: string;
}) {
  const segments = useSelectedLayoutSegments().filter((s) => !s.startsWith("__") && !s.startsWith("("));
  const sel: Selection =
    !fixed && segments.length >= 2
      ? { key: `${segments[0]}-${segments[1]}`, group: groupOfSlug[segments[0]] ?? fallback.group }
      : fallback;
  const node = v.nodes.find((n) => n.key === sel.key);
  const hub = v.hubs.find((h) => h.id === sel.group);
  const lit = hub ? (node ? `${hub.trunk}L${node.tx} ${node.ty}L${node.cx} ${node.cy}` : hub.trunk) : "";

  // roving Tab stop: the selected chapter (or its medallion), until the arrows move it
  const home = node ? `n:${node.key}` : hub?.href ? `h:${hub.id}` : `h:${v.hubs.find((h) => h.href)?.id}`;
  const [moved, setMoved] = useState<{ sel: string; id: string } | null>(null);
  const stop = moved?.sel === sel.key ? moved.id : home;
  const box = useRef<HTMLDivElement>(null);
  const hintId = useId();

  const hubs = v.hubs.filter((h) => h.href);
  const nodesOf = (id: string) => v.nodes.filter((n) => n.group === id).sort((a, b) => a.j - b.j);
  const go = (id: string) => {
    setMoved({ sel: sel.key, id });
    box.current?.querySelector<HTMLElement>(`[data-k="${id}"]`)?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = (e.target as HTMLElement).dataset.k;
    if (!k) return;
    const [kind, id] = [k.slice(0, 1), k.slice(2)];
    const n = kind === "n" ? v.nodes.find((x) => x.key === id) : undefined;
    const g = kind === "h" ? id : n?.group;
    const i = hubs.findIndex((h) => h.id === g);
    let to: string | undefined;
    if (e.key === "ArrowRight") to = `h:${hubs[(i + 1) % hubs.length].id}`;
    else if (e.key === "ArrowLeft") to = `h:${hubs[(i - 1 + hubs.length) % hubs.length].id}`;
    else if (e.key === "Home") to = `h:${hubs[0].id}`;
    else if (e.key === "End") to = `h:${hubs[hubs.length - 1].id}`;
    else if (e.key === "ArrowDown" && g) {
      const list = nodesOf(g);
      const next = n ? list[list.indexOf(n) + 1] : list[0];
      if (next) to = `n:${next.key}`;
    } else if (e.key === "ArrowUp" && n) {
      const list = nodesOf(n.group);
      const prev = list[list.indexOf(n) - 1];
      to = prev ? `n:${prev.key}` : `h:${n.group}`;
    } else return;
    e.preventDefault();
    if (to) go(to);
  };

  const hubEl = (h: HubView) => {
    const isLit = h.id === sel.group;
    const style = { ...at(h.x, h.y, v.W, v.H), ...unit(h.s), ...plate(h.label) } as React.CSSProperties;
    const inner = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- a 96/192 px illustration, already sized; next/image adds JS */}
        <img className="bc-medallion__img" src={h.img.src} srcSet={`${h.img.src} 1x, ${h.img.src2} 2x`} width={96} height={96} alt="" />
        <span className={styles.plate} data-align={h.align}>
          <span className={styles.plateName}>{h.name}</span>
          {h.meta && <span className={styles.plateSub}>{h.meta}</span>}
        </span>
      </>
    );
    if (!h.href) {
      return (
        <span key={h.id} className={`bc-medallion ${styles.hub} ${styles.empty}`} data-hub={h.id} style={style}>
          {inner}
        </span>
      );
    }
    return (
      <Link
        key={h.id}
        href={h.href}
        aria-label={h.aria}
        aria-current={isLit && !node ? "true" : undefined}
        className={`bc-medallion ${styles.hub}${isLit ? " is-lit" : ""}`}
        data-hub={h.id}
        data-k={`h:${h.id}`}
        tabIndex={stop === `h:${h.id}` ? 0 : -1}
        style={style}
      >
        {inner}
      </Link>
    );
  };

  const nodeEl = (n: NodeView) => {
    const current = n.key === sel.key;
    const style = { ...at(n.cx, n.cy, v.W, v.H), ...unit(n.s), ...plate(n.label) } as React.CSSProperties;
    return (
      <Link
        key={n.key}
        href={n.href}
        prefetch={false}
        aria-current={current ? "true" : undefined}
        className={styles.node}
        data-node={n.key}
        data-k={`n:${n.key}`}
        tabIndex={stop === `n:${n.key}` ? 0 : -1}
        style={style}
      >
        <span className={styles.disc} aria-hidden="true">
          {n.num}
        </span>
        <span className={styles.plate} data-align={n.align}>
          <span className={styles.plateName}>{n.title}</span>
          <span className="visually-hidden">, </span>
          <span className={styles.plateSub}>{n.sub}</span>
        </span>
      </Link>
    );
  };

  return (
    <>
      {lit && (
        <svg key={`lit-${sel.key}`} className={styles.litLayer} viewBox={`0 0 ${v.W} ${v.H}`} aria-hidden="true">
          <path className={styles.lit} pathLength={1} d={lit} />
        </svg>
      )}
      <div ref={box} className={styles.links} role="group" aria-label={label} aria-describedby={hintId} onKeyDown={onKey}>
        <p id={hintId} className="visually-hidden">
          {hint}
        </p>
        {v.hubs.map(hubEl)}
        {v.nodes.map(nodeEl)}
      </div>
    </>
  );
}
