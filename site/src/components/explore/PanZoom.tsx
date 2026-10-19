"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import styles from "./explore.module.css";

const MIN = 1;
const MAX = 4;
const STEP = 1.5;
const never = () => () => {};

// Pan and zoom over the server-rendered graph, without a library. The buttons (− fit +) are always on screen and work
// once the page is interactive; with the graph box focused, + and − zoom, 0 fits and the arrows move. Dragging pans
// when zoomed in, two fingers pinch, Ctrl/⌘ + wheel zooms (a plain wheel keeps scrolling the page). Choosing a node
// stays a plain link, so the graph works without JavaScript.
export function PanZoom({
  label,
  hint,
  footer,
  children,
}: {
  label: string;
  hint: string;
  /** shown on the left of the zoom buttons, under the graph (the legend) */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const view = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const t = useRef({ k: 1, x: 0, y: 0 });
  const [k, setK] = useState(1);
  // false in the server HTML and until hydration, so the buttons only enable once they can act
  const live = useSyncExternalStore(never, () => true, () => false);
  const hintId = useId();

  const apply = (k: number, x: number, y: number, animate = false) => {
    const v = view.current, s = stage.current;
    if (!v || !s) return;
    k = Math.min(MAX, Math.max(MIN, k));
    const w = v.clientWidth, h = v.clientHeight;
    x = Math.min(0, Math.max(w - w * k, x));
    y = Math.min(0, Math.max(h - h * k, y));
    t.current = { k, x, y };
    s.style.transition = animate ? "" : "none";
    s.style.transform = k === 1 ? "" : `translate(${x}px,${y}px) scale(${k})`;
    setK(k);
  };
  /** zoom by `f` keeping the point (px, relative to the box) where it is; the middle of the box by default */
  const zoom = (f: number, px?: number, py?: number, animate = true) => {
    const v = view.current;
    if (!v) return;
    const { k, x, y } = t.current;
    const cx = px ?? v.clientWidth / 2, cy = py ?? v.clientHeight / 2;
    const nk = Math.min(MAX, Math.max(MIN, k * f));
    apply(nk, cx - ((cx - x) * nk) / k, cy - ((cy - y) * nk) / k, animate);
  };

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const pts = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; moved: boolean } | null = null;
    let pinch = 0;
    let swallow = false;
    const rel = (e: PointerEvent | WheelEvent) => {
      const r = v.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        drag = { x: e.clientX, y: e.clientY, moved: false };
        swallow = false;
      }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const move = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 2) {
        p.x = e.clientX;
        p.y = e.clientY;
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) {
          const r = v.getBoundingClientRect();
          zoom(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, false);
        }
        pinch = d;
        swallow = true;
        return;
      }
      if (!drag || t.current.k === 1) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      if (!drag.moved) v.setPointerCapture(e.pointerId);
      drag.moved = swallow = true;
      p.x = e.clientX;
      p.y = e.clientY;
      apply(t.current.k, t.current.x + dx, t.current.y + dy);
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (pts.size === 0) drag = null;
    };
    // a drag or a pinch that ends over a node must not also follow its link
    const click = (e: MouseEvent) => {
      if (swallow) {
        e.preventDefault();
        e.stopPropagation();
      }
      swallow = false;
    };
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const [px, py] = rel(e);
      zoom(Math.exp(-e.deltaY * 0.002), px, py, false);
    };
    // a node reached with Tab while zoomed in may be outside the view: bring it to the middle
    const focusin = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el === v || t.current.k === 1) return;
      const r = el.getBoundingClientRect(), vr = v.getBoundingClientRect();
      let { x, y } = t.current;
      if (r.left < vr.left || r.right > vr.right) x += vr.left + vr.width / 2 - (r.left + r.width / 2);
      if (r.top < vr.top || r.bottom > vr.bottom) y += vr.top + vr.height / 2 - (r.top + r.height / 2);
      apply(t.current.k, x, y, true);
    };
    const resize = () => apply(t.current.k, t.current.x, t.current.y);
    v.addEventListener("pointerdown", down);
    v.addEventListener("pointermove", move);
    v.addEventListener("pointerup", up);
    v.addEventListener("pointercancel", up);
    v.addEventListener("click", click, true);
    v.addEventListener("wheel", wheel, { passive: false });
    v.addEventListener("focusin", focusin);
    window.addEventListener("resize", resize);
    return () => {
      v.removeEventListener("pointerdown", down);
      v.removeEventListener("pointermove", move);
      v.removeEventListener("pointerup", up);
      v.removeEventListener("pointercancel", up);
      v.removeEventListener("click", click, true);
      v.removeEventListener("wheel", wheel);
      v.removeEventListener("focusin", focusin);
      window.removeEventListener("resize", resize);
    };
    // apply and zoom only touch refs and a state setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const key = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
    const { k, x, y } = t.current;
    const moves: Record<string, [number, number]> = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] };
    if (e.key === "+" || e.key === "=") zoom(STEP);
    else if (e.key === "-" || e.key === "_") zoom(1 / STEP);
    else if (e.key === "0") apply(1, 0, 0, true);
    else if (moves[e.key] && k > 1) apply(k, x + moves[e.key][0], y + moves[e.key][1], true);
    else return;
    e.preventDefault();
  };

  return (
    <div className={styles.pz}>
      <div
        ref={view}
        className={styles.viewport}
        data-zoomed={k > 1 ? "" : undefined}
        tabIndex={0}
        role="group"
        aria-label={label}
        aria-describedby={hintId}
        onKeyDown={key}
      >
        <div ref={stage} className={styles.stage}>
          {children}
        </div>
      </div>
      <p id={hintId} className="visually-hidden">
        {hint}
      </p>
      <div className={styles.foot}>
        {footer}
        <div className={styles.zoom} role="group" aria-label="Zoom do grafo">
          <button type="button" aria-label="Afastar" disabled={!live || k <= MIN} onClick={() => zoom(1 / STEP)}>
            <span className={`i ${styles.iMinus}`} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Ajustar ao quadro" disabled={!live || k === 1} onClick={() => apply(1, 0, 0, true)}>
            <span className={`i ${styles.iFit}`} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Aproximar" disabled={!live || k >= MAX} onClick={() => zoom(STEP)}>
            <span className={`i ${styles.iPlus}`} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
