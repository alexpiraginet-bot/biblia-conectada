"use client";

import { useRef, useState } from "react";
import styles from "./explore.module.css";

/**
 * The map's lights can be stopped (WCAG 2.2.2), like the constellation's and the sculpture's: the light along the
 * links, the orbit, the dial and the legend's pulse; the entrance is left alone. The choice is kept on the atlas
 * (data-lights) and announced to AtlasNodes, which plays or pauses the loops of the map shown (design §7.1).
 */
export function AtlasLights() {
  const [paused, setPaused] = useState(false);
  const self = useRef<HTMLButtonElement>(null);
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    const atlas = self.current?.closest<HTMLElement>(`.${styles.atlas}`);
    if (!atlas) return;
    atlas.dataset.lights = next ? "paused" : "on";
    atlas.dispatchEvent(new Event("atlaslights"));
  };
  return (
    <button ref={self} type="button" className={`bc-button bc-button--ghost ${styles.lights}`} onClick={toggle}>
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d={paused ? "m8 5 11 7-11 7Z" : "M8 5v14M16 5v14"} />
      </svg>
      {paused ? "Ativar luzes" : "Pausar luzes"}
    </button>
  );
}
