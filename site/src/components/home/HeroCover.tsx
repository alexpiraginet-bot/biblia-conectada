"use client";

// Home cover, after the "Aurelia" hero Alex sent as reference (21st.dev), rebuilt without GSAP or Tailwind:
// GSAP + ScrollTrigger alone are 45 KiB gzip, over the site's own-JS budget (HANDOFF §5.6). A sticky stage and one
// scroll handler that writes a few CSS variables do the same choreography: the title halves part, the window onto the
// night sky grows to fill the screen, the caption fades. Without JavaScript, or with reduced motion, the cover is a
// still, complete page.
import { useEffect, useRef } from "react";
import { drawSky, type SkyData } from "./sky-canvas";
import styles from "./HeroCover.module.css";

type Props = {
  titleTop: string;
  titleBottom: string;
  /** describes the night sky for screen readers */
  skyLabel: string;
  captionTop: string;
  captionLeft: string;
  captionRight: string;
  notesLabel: string;
  paragraph: string;
  sky: SkyData;
  children?: React.ReactNode;
};

const clamp = (x: number) => Math.min(Math.max(x, 0), 1);
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const easeIn = (x: number) => x * x; // power1.in
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2); // power2.inOut
const easeOut = (x: number) => 1 - (1 - x) * (1 - x); // power1.out

export function HeroCover({ titleTop, titleBottom, skyLabel, captionTop, captionLeft, captionRight, notesLabel, paragraph, sky, children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const midRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const notesRef = useRef<HTMLElement>(null);
  const words = paragraph.split(" ");

  useEffect(() => {
    const [back, mid, front] = [backRef.current, midRef.current, frontRef.current];
    return back && mid && front ? drawSky({ back, mid, front }, sky) : undefined;
  }, [sky]);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const notes = notesRef.current;
    if (!root || !track || !notes || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.dataset.motion = "on";

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = track.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      // the GSAP timeline of the reference lasts 0.98 units; its segments are kept as they were
      const p = total > 0 ? clamp(-r.top / total) * 0.98 : 0;
      const s = root.style;
      s.setProperty("--k-hint", String(span(p, 0, 0.1)));
      s.setProperty("--k-title", String(easeIn(span(p, 0.04, 0.54))));
      s.setProperty("--k-caption", String(span(p, 0.38, 0.58)));
      s.setProperty("--k-panel", String(easeInOut(span(p, 0.08, 0.98))));
      s.setProperty("--k-frame", String(easeInOut(span(p, 0.48, 0.88))));
      s.setProperty("--k-zoom", String(easeOut(span(p, 0, 0.98))));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    // the paragraph rises word by word the first time it comes into view
    notes.dataset.armed = "";
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        notes.dataset.shown = "";
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(notes);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root}>
      <div ref={trackRef} className={styles.track}>
        <section className={styles.stage} aria-labelledby="capa-titulo">
          <h1 id="capa-titulo" className={styles.title}>
            <span className={styles.top}>{titleTop}</span> <span className={styles.bottom}>{titleBottom}</span>
          </h1>

          <div className={styles.panel}>
            <div className={styles.frame}>
              <figure className={styles.media}>
                <div
                  className={styles.zoom}
                  role="img"
                  aria-label={skyLabel}
                  style={{ "--sx": `${Math.round(sky.x0 * 1000) / 10}%` } as React.CSSProperties}
                >
                  <canvas ref={backRef} className={styles.canvas} />
                  <canvas ref={midRef} className={`${styles.canvas} ${styles.lights}`} />
                  <canvas ref={frontRef} className={styles.canvas} />
                </div>
                <div className={styles.shade} aria-hidden="true" />
                <figcaption className={styles.caption} aria-hidden="true">
                  <span className={styles.captionTop}>
                    <span className={styles.dot} />
                    {captionTop}
                  </span>
                  <span className={styles.captionRow}>
                    <span>{captionLeft}</span>
                    <span>{captionRight}</span>
                  </span>
                </figcaption>
              </figure>
            </div>
          </div>

          <div className={styles.hint} aria-hidden="true">
            <span>Role</span>
            <span className={styles.hintLine}>
              <span className={styles.hintDot} />
            </span>
          </div>
        </section>
      </div>

      <section ref={notesRef} className={styles.notes} aria-label={notesLabel}>
        <p className={styles.notesLabel} aria-hidden="true">
          {notesLabel}
        </p>
        <p className={styles.paragraph}>
          {words.map((word, i) => (
            <span key={i}>
              <span className={styles.mask}>
                <span className={styles.word} style={{ "--i": i } as React.CSSProperties}>
                  {word}
                </span>
              </span>
              {i < words.length - 1 ? " " : null}
            </span>
          ))}
        </p>
        {children}
      </section>
    </div>
  );
}
