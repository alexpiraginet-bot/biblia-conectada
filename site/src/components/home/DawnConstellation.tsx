"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import type { OpeningNode } from "@/lib/explore/opening";
import styles from "./DawnOpening.module.css";

/** A tiny, bounded interactive lens. SVG particles travel along the actual displayed edge geometry. */
export function DawnConstellation({ nodes }: { nodes: OpeningNode[] }) {
  const centre = nodes[0];
  const [selected, setSelected] = useState(centre.id);
  const [pulse, setPulse] = useState(0);
  const [paused, setPaused] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = nodes.find((node) => node.id === selected) ?? centre;
  const moving = canAnimate && !paused;

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => setCanAnimate(visible && !document.hidden && !media.matches);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(element);
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); media.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  function illuminate(id: number) {
    setSelected(id);
    setPulse((value) => value + 1);
  }

  useEffect(() => {
    if (!moving) return;
    // SMIL's default clock starts with the SVG document. Explicit starts make every touch restart at João 1.
    root.current?.querySelectorAll<SVGAnimationElement>("animateMotion").forEach((animation) => {
      animation.beginElementAt(Number(animation.getAttribute("data-delay") ?? 0));
    });
  }, [moving, pulse, selected]);

  return (
    <div ref={root} className={styles.constellation} data-dawn-constellation="" data-moving={moving} data-selected={active.id}>
      <div className={styles.stage}>
        <svg className={styles.threads} viewBox="0 0 800 440" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="dawn-light" x="-500%" y="-500%" width="1100%" height="1100%"><feGaussianBlur stdDeviation="4" /></filter>
          </defs>
          {nodes.filter((node) => node.thread).map((node) => (
            <g key={node.id} data-thread={node.id} data-active={selected === node.id || selected === centre.id}>
              <path className={styles.threadHalo} d={node.thread} />
              <path className={styles.threadLine} d={node.thread} />
              {moving && (selected === centre.id || selected === node.id) && (
                <g key={pulse} className={styles.traveller} data-pulse={node.id}>
                  {/* A real moving head and tail, following the exact same cubic path as the thread. */}
                  {[0, 1, 2, 3, 4].map((tail) => (
                    <circle key={tail} r={tail === 0 ? 10 : 4 - tail * .55} fill={tail === 0 ? "#ffb62e" : "#fff4c5"} opacity={tail === 0 ? .85 : 1 - tail * .16} filter={tail === 0 ? "url(#dawn-light)" : undefined}>
                      <animateMotion path={node.thread} dur="2.8s" begin="indefinite" data-delay={tail * .045} repeatCount="indefinite" />
                    </circle>
                  ))}
                  <circle r="3.6" fill="#fffdf0"><animateMotion path={node.thread} dur="2.8s" begin="indefinite" repeatCount="indefinite" /></circle>
                </g>
              )}
            </g>
          ))}
        </svg>
        {nodes.map((node) => (
          <button key={node.id} type="button" className={`${styles.node} ${node.id === centre.id ? styles.centreNode : ""}`}
            style={{ "--node-x": `${node.x / 8}%`, "--node-y": `${node.y / 4.4}%` } as CSSProperties}
            aria-pressed={active.id === node.id} aria-label={node.id === centre.id ? `Explorar ${node.label}` : `Acender a conexão com ${node.label}`}
            onClick={() => illuminate(node.id)} onPointerEnter={(event) => { if (event.pointerType === "mouse") illuminate(node.id); }}>
            <span className={styles.orb} aria-hidden="true">{node.id === centre.id && <Icon name="book" />}</span>
            <span className={styles.nodeLabel}>{node.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.sceneActions}>
        <p className={styles.hint} role="status" aria-live="polite">
          {active.id === centre.id ? "Toque numa passagem. Siga a luz." : `${centre.label} ↔ ${active.label}`}
        </p>
          <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
            <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span> {paused ? "Retomar luzes" : "Pausar luzes"}
          </button>
      </div>
      <div className={styles.ctas}>
        <Link href={active.href} prefetch={false} className={styles.primary} data-dawn-explore="">
          {active.id === centre.id ? "Explorar esta passagem" : "Explorar esta conexão"}<Icon name="out" />
        </Link>
        <div className={styles.secondaryLinks}><Link href="/ler">Começar a ler <Icon name="out" /></Link><Link href="#como-funciona">Como funciona <Icon name="out" /></Link></div>
      </div>
      <noscript><p className={styles.noScript}>Explore as conexões: {nodes.slice(1).map((node) => <a key={node.id} href={node.href}>{node.label}</a>)}</p></noscript>
    </div>
  );
}
