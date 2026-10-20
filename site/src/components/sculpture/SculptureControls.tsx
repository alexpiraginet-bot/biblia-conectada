"use client";

import styles from "./sculpture.module.css";

/** Camera and light controls load once the 3D engine is available. */
export function SculptureControls({ onView, onZoom, onPause, lightsPaused }: {
  onView: (view: "orbital" | "front" | "top") => void;
  onZoom: (factor: number) => void;
  onPause: () => void;
  lightsPaused: boolean;
}) {
  return (
    <div className={styles.cameraTools} role="group" aria-label="Ponto de vista do céu em 3D">
      <button type="button" onClick={() => onView("orbital")} aria-label="Reenquadrar em vista orbital" title="Vista orbital">◈<span>Orbital</span></button>
      <button type="button" onClick={() => onView("front")} aria-label="Vista frontal" title="Vista frontal">◡<span>Frontal</span></button>
      <button type="button" onClick={() => onView("top")} aria-label="Vista de cima" title="Vista de cima">⊙<span>Do alto</span></button>
      <span className={styles.cameraDivider} />
      <button type="button" aria-label="Aproximar céu" onClick={() => onZoom(0.8)}>+</button>
      <button type="button" aria-label="Afastar céu" onClick={() => onZoom(1.25)}>−</button>
      <button type="button" className={styles.motionToggle} aria-label={lightsPaused ? "Ativar pulsos de luz" : "Pausar pulsos de luz"} onClick={onPause}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d={lightsPaused ? "m8 5 11 7-11 7Z" : "M8 5v14M16 5v14"} />
        </svg><span>Luzes</span>
      </button>
    </div>
  );
}
