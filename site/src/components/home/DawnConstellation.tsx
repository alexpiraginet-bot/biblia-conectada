"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import type { OpeningNode } from "@/lib/explore/opening";
import styles from "./DawnOpening.module.css";

/** Speculative downloads are optional; a deliberate navigation remains unchanged. */
function canPrewarm() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType ?? "")
    && !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A tiny, bounded interactive lens. SVG particles travel along the actual displayed edge geometry. */
export function DawnConstellation({ nodes }: { nodes: OpeningNode[] }) {
  const centre = nodes[0];
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(nodes[1]?.id ?? centre.id);
  const [pulse, setPulse] = useState(0);
  const [paused, setPaused] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const journey = useRef<typeof import("./connection-journey") | null>(null);
  const active = nodes.find((node) => node.id === selected) ?? centre;
  const moving = canAnimate && !paused;
  const destination = active.id === centre.id ? nodes[1] ?? centre : active;

  function prepare(node: OpeningNode) {
    if (!canPrewarm()) return;
    router.prefetch(node.href);
    void import("./connection-journey").then((module) => { journey.current = module; module.prewarmConnectionJourney(); }).catch(() => {});
  }

  function travel(node: OpeningNode) {
    illuminate(node.id);
    const navigate = () => startTransition(() => router.push(node.href));
    // A cold/failed visual download never delays access to the passage or opens a late overlay.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !journey.current) { navigate(); return; }
    journey.current.travelThroughConnection(node.label, navigate);
  }

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
    if (canPrewarm()) void import("./connection-journey").then((module) => { journey.current = module; }).catch(() => {});
    // SMIL's default clock starts with the SVG document. Explicit starts make every touch restart at João 1.
    root.current?.querySelectorAll<SVGAnimationElement>("animateMotion").forEach((animation) => {
      animation.beginElementAt(Number(animation.getAttribute("data-delay") ?? 0));
    });
  }, [moving, pulse, selected]);

  return (
    <div ref={root} className={styles.constellation} data-dawn-constellation="" data-moving={moving} data-selected={active.id}>
      <div className={styles.stage}>
        <svg className={styles.threads} viewBox="0 0 800 600" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="dawn-light" x="-500%" y="-500%" width="1100%" height="1100%"><feGaussianBlur stdDeviation="4" /></filter>
            <linearGradient id="dawn-gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a46719"/><stop offset=".3" stopColor="#f8ce64"/><stop offset=".5" stopColor="#b37a26"/><stop offset=".8" stopColor="#fbe59a"/><stop offset="1" stopColor="#cd8a25"/></linearGradient>
          </defs>
          {nodes.filter((node) => node.thread).map((node) => (
            <g key={node.id} data-thread={node.id} data-active={selected === node.id || selected === centre.id}>
              <path className={styles.threadHalo} d={node.thread} />
              <path className={styles.threadLine} d={node.thread} />
              <path className={styles.threadShine} d={node.thread} />
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
          <Link key={node.id} href={node.href} prefetch={false} className={`${styles.node} ${node.id === centre.id ? styles.centreNode : ""}`}
            style={{ "--node-x": `${node.x / 8}%`, "--node-y": `${node.y / 6}%` } as CSSProperties}
            data-active={active.id === node.id} data-long-label={node.label.length > 12 || undefined} aria-label={node.id === centre.id ? `Explorar ${node.label}` : `Viajar de ${centre.label} para ${node.label}`}
            onNavigate={(event) => { event.preventDefault(); travel(node); }}
            onPointerDown={() => { illuminate(node.id); prepare(node); }}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") { illuminate(node.id); prepare(node); } }}
            onFocus={() => { illuminate(node.id); prepare(node); }}>
            <span className={styles.orb} aria-hidden="true" />
            <span className={styles.nodeLabel}>{node.label}</span>
          </Link>
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
        <Link href={destination.href} prefetch={false} className={styles.primary} data-dawn-explore="" aria-busy={pending || undefined}
          onPointerEnter={() => prepare(destination)} onFocus={() => prepare(destination)}
          onNavigate={(event) => { event.preventDefault(); travel(destination); }}>
          {pending ? "Abrindo a conexão…" : "Explorar esta conexão"}<Icon name="chev-r" />
        </Link>
        <div className={styles.secondaryLinks}><Link href="/ler">Começar a ler <Icon name="out" /></Link><Link href="#como-funciona">Como funciona <Icon name="out" /></Link></div>
      </div>
      <noscript><p className={styles.noScript}>Explore as conexões: {nodes.slice(1).map((node) => <a key={node.id} href={node.href}>{node.label}</a>)}</p></noscript>
    </div>
  );
}
