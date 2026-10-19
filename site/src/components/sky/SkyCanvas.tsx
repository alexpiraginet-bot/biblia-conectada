"use client";

// The WebGL canvas of the sky, loaded after the first paint (next/dynamic, ssr: false, from Sky.tsx). It draws over
// the poster image and takes over from it: first the gold layer only (the page blends it with "screen", the same
// formula the shader uses), then, once its own arcs are baked, the whole sky.
//
// The <canvas> is created per mount and removed on cleanup. With Cache Components, Next hides a page it leaves
// (React <Activity>) instead of unmounting it: effects are cleaned up but the DOM stays. A canvas kept in the DOM
// would come back with the context this cleanup released, so every mount starts from a fresh element.
import { useEffect, useMemo, useRef } from "react";
import { highlightFor, type ArcSet, type ChapterIndex, type Geometry, type Selection } from "./model";
import { SkyRenderer, type Mode } from "./renderer";
import styles from "./sky.module.css";

export type SkyCanvasProps = {
  geo: Geometry;
  partners: readonly number[];
  /** what is lit: the preview while scrubbing or hovering, else the selection */
  shown: Selection;
  /** loaded arcs, for the chapter highlights */
  arcs: { set: ArcSet; idx: ChapterIndex } | null;
  /** arcs to draw as the canvas's own sky; null keeps the poster as the sky */
  dome: ArcSet | null;
  /** changes when a selection is fixed: one pulse along the newly lit arcs */
  pulseKey: number;
  /** play the opening (first visit of the session, motion allowed) */
  intro: boolean;
  label: string;
  active: boolean;
  /** a new canvas starts (nothing drawn yet) */
  onStart: () => void;
  onMode: (mode: Mode) => void;
  onFail: () => void;
};

const INPUTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export default function SkyCanvas(props: SkyCanvasProps) {
  const { geo, partners, shown, arcs, dome, pulseKey, intro, label, active } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<SkyRenderer | null>(null);
  const latest = useRef({ onStart: props.onStart, onMode: props.onMode, onFail: props.onFail, intro });
  const lastPulse = useRef(pulseKey);

  useEffect(() => {
    latest.current = { onStart: props.onStart, onMode: props.onMode, onFail: props.onFail, intro };
  });

  // one context per mount; released (and its canvas removed) on cleanup
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.className = styles.canvas;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    canvasRef.current = canvas;
    latest.current.onStart();
    const renderer = SkyRenderer.create(canvas);
    if (!renderer) {
      canvas.remove();
      canvasRef.current = null;
      latest.current.onFail();
      return;
    }
    rendererRef.current = renderer;
    renderer.onPresent = (mode) => latest.current.onMode(mode);
    renderer.onLost = () => latest.current.onFail();
    const size = () => {
      const box = canvas.getBoundingClientRect();
      if (box.width > 0) renderer.resize(box.width, box.height, Math.min(window.devicePixelRatio || 1, 2));
    };
    size();
    let timer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(size, 160);
    });
    ro.observe(canvas);

    let finish: (() => void) | null = null;
    if (latest.current.intro) {
      renderer.startIntro();
      // any input ends the opening at once
      finish = () => renderer.finishIntro();
      for (const ev of INPUTS) window.addEventListener(ev, finish, { once: true, passive: true });
    }
    return () => {
      ro.disconnect();
      window.clearTimeout(timer);
      if (finish) for (const ev of INPUTS) window.removeEventListener(ev, finish);
      renderer.destroy();
      rendererRef.current = null;
      canvas.remove();
      canvasRef.current = null;
    };
  }, []);

  // the page gave up waiting for the canvas (and showed the poster's gold): skip the opening if it has not started
  useEffect(() => {
    if (!intro && rendererRef.current?.introPending) rendererRef.current.finishIntro();
  }, [intro]);

  useEffect(() => {
    rendererRef.current?.setGeometry(geo);
  }, [geo]);

  useEffect(() => {
    if (dome) rendererRef.current?.setDome(dome);
  }, [dome, geo]);

  const highlight = useMemo(() => highlightFor(geo, shown, partners, arcs?.set ?? null, arcs?.idx ?? null), [geo, shown, partners, arcs]);
  useEffect(() => {
    rendererRef.current?.setHighlight(highlight);
  }, [highlight]);

  useEffect(() => {
    if (pulseKey === lastPulse.current) return;
    lastPulse.current = pulseKey;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    rendererRef.current?.pulse();
  }, [pulseKey]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.setAttribute("aria-label", label);
    if (active) c.removeAttribute("aria-hidden");
    else c.setAttribute("aria-hidden", "true");
  }, [label, active]);

  return <div ref={hostRef} className={styles.canvasHost} />;
}
