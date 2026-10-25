"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
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
  const [preview, setPreview] = useState<Selection | null>(null);
  const visual = preview ?? sel;
  const node = v.nodes.find((n) => n.key === sel.key);
  const hub = v.hubs.find((h) => h.id === sel.group);
  const visualNode = v.nodes.find((n) => n.key === visual.key);
  const visualHub = v.hubs.find((h) => h.id === visual.group);
  const lit = visualHub ? (visualNode ? `${visualHub.trunk}L${visualNode.tx} ${visualNode.ty}L${visualNode.cx} ${visualNode.cy}` : visualHub.trunk) : "";

  // roving Tab stop: the selected chapter (or its medallion), until the arrows move it
  const home = node ? `n:${node.key}` : hub?.href ? `h:${hub.id}` : `h:${v.hubs.find((h) => h.href)?.id}`;
  const [moved, setMoved] = useState<{ sel: string; id: string } | null>(null);
  const stop = moved?.sel === sel.key ? moved.id : home;
  const box = useRef<HTMLDivElement>(null);
  const hintId = useId();
  // when each group's trunk starts growing on the entrance (AtlasMap): while the map arrives, the lit stroke waits for
  // its own trunk; once the entrance is over, a stroke lit by pointing or choosing is traced at once
  const tOf: Record<string, number> = Object.fromEntries(v.hubs.map((h) => [h.id, h.t]));
  const litAt = { "--lit-at": `${((tOf[visual.group] ?? 0) + 0.45).toFixed(2)}s` } as React.CSSProperties;
  const [entering, setEntering] = useState(true);

  // The map's motion (design §7.1) plays where it is seen: a map that arrives off screen waits at its first frame and
  // plays when it comes into view; the loops (light along the links, the orbit and the dial turning, the legend's
  // pulse) run only on screen and while the lights are on (AtlasLights). Only the variant drawn at this width acts,
  // and only CSS animations are touched.
  useEffect(() => {
    const stage = box.current?.parentElement;
    const scope = stage?.parentElement;
    if (!stage || !scope || typeof IntersectionObserver === "undefined" || typeof CSSAnimation === "undefined") {
      const raf = requestAnimationFrame(() => setEntering(false));
      return () => cancelAnimationFrame(raf);
    }
    const motion = () => scope.getAnimations({ subtree: true }).filter((a) => a instanceof CSSAnimation);
    const r = stage.getBoundingClientRect();
    if (r.height > 0 && (r.top >= innerHeight || r.bottom <= 0)) {
      for (const a of motion()) {
        a.pause();
        a.currentTime = 0;
      }
    }
    let seen = false;
    const sync = () => {
      if (!stage.getClientRects().length) return;
      const off = scope.dataset.lights === "paused";
      for (const a of motion()) {
        const loop = a.effect?.getComputedTiming().iterations === Infinity;
        if (seen && !(loop && off)) {
          if (a.playState === "paused") a.play();
        } else if (loop && a.playState === "running") a.pause();
      }
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.boundingClientRect.height) return;
        seen = e.isIntersecting;
        sync();
      },
      // the entrance starts once the map is a fifth of a screen above the bottom edge
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(stage);
    scope.addEventListener("atlaslights", sync);
    // the entrance is over when the stage's clock ends. A stage that is drawn with no clock (reduced motion, or a clock
    // over before this ran) is over now; one not drawn yet (the capa's closed <details>, the variant hidden at this
    // width) gets its clock, and its entrance, when it is drawn
    const clock = (name: string) => name.includes("enterClock");
    const over = (e: AnimationEvent) => {
      if (e.target === stage && clock(e.animationName)) setEntering(false);
    };
    stage.addEventListener("animationend", over);
    const drawn = stage.getClientRects().length > 0;
    const running = stage.getAnimations().some((a) => a instanceof CSSAnimation && clock(a.animationName));
    const raf = drawn && !running ? requestAnimationFrame(() => setEntering(false)) : 0;
    return () => {
      io.disconnect();
      scope.removeEventListener("atlaslights", sync);
      stage.removeEventListener("animationend", over);
      cancelAnimationFrame(raf);
    };
  }, []);

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
    const isLit = h.id === visual.group;
    const style = { ...at(h.x, h.y, v.W, v.H), ...unit(h.s), ...plate(h.label), "--t": h.t } as React.CSSProperties;
    const inner = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- a 96/192 px illustration, already sized; next/image adds JS */}
        <img className="bc-medallion__img" src={h.img.src} srcSet={`${h.img.src} 1x, ${h.img.src2} 2x`} width={96} height={96} alt="" />
        <span className={styles.plate} data-align={h.align}>
          <span className={styles.plateName}>{h.name}</span>{" "}
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
        aria-current={h.id === sel.group && !node ? "true" : undefined}
        className={`bc-medallion ${styles.hub}${isLit ? " is-lit" : ""}${preview && !isLit ? ` ${styles.hoverDim}` : ""}`}
        data-hub={h.id}
        data-k={`h:${h.id}`}
        tabIndex={stop === `h:${h.id}` ? 0 : -1}
        style={style}
        onPointerEnter={(e) => { if (e.pointerType !== "touch") setPreview({ key: h.lead ?? "", group: h.id }); }}
        onPointerLeave={() => setPreview(null)}
        onFocus={() => setPreview({ key: h.lead ?? "", group: h.id })}
        onBlur={() => setPreview(null)}
      >
        {inner}
      </Link>
    );
  };

  const nodeEl = (n: NodeView) => {
    const current = n.key === sel.key;
    const style = { ...at(n.cx, n.cy, v.W, v.H), ...unit(n.s), ...plate(n.label), "--t": tOf[n.group] ?? 0 } as React.CSSProperties;
    return (
      <Link
        key={n.key}
        href={n.href}
        prefetch={false}
        aria-current={current ? "true" : undefined}
        className={`${styles.node}${preview && n.group !== preview.group ? ` ${styles.hoverDim}` : ""}`}
        data-node={n.key}
        data-k={`n:${n.key}`}
        tabIndex={stop === `n:${n.key}` ? 0 : -1}
        style={style}
        onPointerEnter={(e) => { if (e.pointerType !== "touch") setPreview({ key: n.key, group: n.group }); }}
        onPointerLeave={() => setPreview(null)}
        onFocus={() => setPreview({ key: n.key, group: n.group })}
        onBlur={() => setPreview(null)}
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
        <svg key={`lit-${visual.key}`} className={styles.litLayer} viewBox={`0 0 ${v.W} ${v.H}`} style={litAt} data-entering={entering ? "" : undefined} aria-hidden="true">
          <path className={styles.lit} pathLength={1} d={lit} />
          {/* once traced, light keeps running along the lit connection */}
          <path className={styles.litFlow} pathLength={1} d={lit} />
        </svg>
      )}
      <div ref={box} className={styles.links} style={litAt} data-entering={entering ? "" : undefined} role="group" aria-label={label} aria-describedby={hintId} onKeyDown={onKey}>
        <p id={hintId} className="visually-hidden">
          {hint}
        </p>
        {v.hubs.map(hubEl)}
        {v.nodes.map(nodeEl)}
      </div>
    </>
  );
}
