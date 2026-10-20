"use client";

import Link from "next/link";
import Image from "next/image";
import { useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { LivingGraphData, LivingNode } from "@/lib/explore/living-graph";
import styles from "./LivingGraph.module.css";

const W = 850, H = 650;
const int = (n: number) => n.toLocaleString("pt-BR");
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function Arrow() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/** A finite window of real chapters, drawn as a constellation with an equivalent, native keyboard control. */
export function LivingGraph({ data, compact = false, immersive = false, className = "" }: { data: LivingGraphData; compact?: boolean; immersive?: boolean; className?: string }) {
  const [selected, setSelected] = useState(data.centre);
  const [hovered, setHovered] = useState<number | null>(null);
  const [exploring, setExploring] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const field = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const help = useId(), panel = useId();
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data]);
  const current = byId.get(selected) ?? data.nodes[0];
  const active = hovered ?? (exploring ? selected : null);
  const neighbours = useMemo(() => {
    const set = new Set<number>();
    if (active === null) return set;
    set.add(active);
    for (const edge of data.edges) {
      if (edge.source === active) set.add(edge.target);
      if (edge.target === active) set.add(edge.source);
    }
    return set;
  }, [active, data.edges]);
  const maxVotes = Math.max(1, ...data.edges.map((e) => e.votes));
  const connections = data.edges.filter((e) => e.source === selected || e.target === selected).toSorted((a, b) => b.votes - a.votes);
  const curve = (a: LivingNode, b: LivingNode) => {
    // The control point must stay on the same side when the pulse traverses an edge backwards.
    const bend = ((a.id + b.id) % 2 ? 1 : -1) * (a.id < b.id ? 1 : -1) * 0.14;
    return `M${a.x} ${a.y}Q${(a.x + b.x) / 2 - (b.y - a.y) * bend} ${(a.y + b.y) / 2 + (b.x - a.x) * bend} ${b.x} ${b.y}`;
  };

  const choose = (id: number) => { setSelected(id); setExploring(true); };
  const reset = () => { setSelected(data.centre); setHovered(null); setExploring(false); setZoom(1); setPan({ x: 0, y: 0 }); };
  // Mobile touch targets can overlap in a dense graph. Resolve by the visible centre, not DOM stacking order.
  const nearestNode = (clientX: number, clientY: number) => {
    const box = field.current?.getBoundingClientRect();
    if (!box) return null;
    const x = clientX - box.left, y = clientY - box.top;
    if (x < 0 || x > box.width || y < 0 || y > box.height) return null;
    let nearest: LivingNode | null = null, distance = Infinity;
    for (const node of data.nodes) {
      const nx = box.width / 2 + (node.x / W * box.width - box.width / 2) * zoom + pan.x;
      const ny = box.height / 2 + (node.y / H * box.height - box.height / 2) * zoom + pan.y;
      const d = Math.hypot(nx - x, ny - y);
      const radius = immersive && node.prominent ? (node.id === data.centre ? 53 : 37) : 23;
      if (d < radius * Math.max(1, zoom) && d < distance) { nearest = node; distance = d; }
    }
    return nearest;
  };
  const onKey = (event: KeyboardEvent<HTMLButtonElement>, node: LivingNode) => {
    if (event.key === "Escape") { reset(); return; }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
    event.preventDefault();
    const axis = event.key === "ArrowLeft" ? [-1, 0] : event.key === "ArrowRight" ? [1, 0] : event.key === "ArrowUp" ? [0, -1] : [0, 1];
    const next = event.key === "Home" ? byId.get(data.centre) : data.nodes
      .filter((n) => n.id !== node.id && (n.x - node.x) * axis[0] + (n.y - node.y) * axis[1] > 1)
      .toSorted((a, b) => {
        const distance = (n: LivingNode) => Math.hypot(n.x - node.x, n.y - node.y) + Math.abs((n.x - node.x) * axis[1] - (n.y - node.y) * axis[0]) * 1.4;
        return distance(a) - distance(b);
      })[0];
    if (next) field.current?.querySelector<HTMLButtonElement>(`[data-graph-node="${next.id}"]`)?.focus();
  };
  const startPan = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" || event.button !== 0 || (event.target as Element).closest("button, a")) return;
    drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) setPan({ x: clamp(d.px + event.clientX - d.x, -150, 150), y: clamp(d.py + event.clientY - d.y, -120, 120) });
    else if (event.pointerType !== "touch") setHovered(nearestNode(event.clientX, event.clientY)?.id ?? null);
  };
  const stopPan = () => { drag.current = null; };

  return (
    <section className={`${styles.root} ${compact ? styles.compact : ""} ${immersive ? styles.immersive : ""} ${className}`} aria-label={`Constelação de ligações de ${data.centreLabel}`} data-living-graph="">
      <div className={styles.graphTop}>
        <span className={styles.liveDot} aria-hidden="true" />
        <span>{immersive ? "ATLAS DE CONEXÕES" : "Uma história. Muitas conexões."}</span>
        <span className={styles.windowCount}>{int(data.nodes.length)} capítulos neste mapa</span>
      </div>
      <div ref={field} className={styles.field} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={stopPan} onPointerCancel={stopPan} onPointerLeave={() => { setHovered(null); stopPan(); }} aria-describedby={help}>
        <div className={styles.space} aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 61.8034) % 100}%`, top: `${(i * 37.7131) % 100}%`, opacity: 0.16 + (i % 5) * 0.08 }} />)}
        </div>
        <div className={styles.plane} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className={styles.lines} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <g className={styles.referenceRings}>
              <ellipse cx="420" cy="315" rx="290" ry="230" />
              <ellipse cx="420" cy="315" rx="390" ry="290" />
            </g>
            {data.edges.map((edge) => {
              const a = byId.get(edge.source)!, b = byId.get(edge.target)!;
              const lit = active !== null ? (edge.source === active || edge.target === active) : immersive && a.prominent && b.prominent && (a.id === data.centre || b.id === data.centre);
              return <path key={`${edge.source}:${edge.target}`} d={curve(a, b)} fill="none"
                className={`${styles.edge}${lit ? ` ${styles.litEdge}` : ""}${active !== null && !lit ? ` ${styles.dimEdge}` : ""}`}
                style={{ "--edge-strength": 0.2 + 0.42 * Math.sqrt(Math.max(0, edge.votes) / maxVotes), strokeWidth: lit ? 1.7 : 0.65 + Math.sqrt(Math.max(0, edge.votes) / maxVotes) * 0.8 } as CSSProperties} />;
            })}
            {active !== null && data.edges.filter((e) => e.source === active || e.target === active).slice(0, 7).map((edge) => {
              const a = byId.get(edge.source === active ? edge.source : edge.target)!, b = byId.get(edge.source === active ? edge.target : edge.source)!;
              return <path key={`pulse:${edge.source}:${edge.target}`} className={styles.signal} pathLength="100" d={curve(a, b)} />;
            })}
          </svg>
          <div className={styles.nodes} role="group" aria-label="Capítulos conectados. Use as setas para percorrer o mapa.">
            {data.nodes.map((node) => {
              const isCentre = node.id === data.centre, isCurrent = node.id === selected, isActive = node.id === active;
              const related = active !== null && neighbours.has(node.id);
              const dim = active !== null && !related;
              const label = isCentre || isCurrent || isActive || (node.prominent && (immersive || active === null));
              return (
                <button key={node.id} type="button" data-graph-node={node.id} data-graph-group={node.group}
                  className={`${styles.node} ${immersive && node.prominent ? styles.medallion : ""} ${isCentre ? styles.centre : ""} ${isCurrent ? styles.selected : ""} ${isActive ? styles.active : ""} ${related ? styles.related : ""} ${dim ? styles.dim : ""}`}
                  style={{ left: `${node.x / W * 100}%`, top: `${node.y / H * 100}%`, "--node-size": `${node.size}px` } as CSSProperties}
                  tabIndex={isCurrent ? 0 : -1} aria-label={`${node.label}. ${int(node.links)} capítulos ligados. Mostrar passagem.`} aria-pressed={isCurrent} aria-controls={panel}
                  onFocus={() => setHovered(node.id)} onBlur={() => setHovered(null)}
                  onKeyDown={(event) => onKey(event, node)} onClick={(event) => {
                    const target = event.detail > 0 ? nearestNode(event.clientX, event.clientY) ?? node : node;
                    choose(target.id);
                    setHovered(target.id);
                    if (target.id !== node.id) field.current?.querySelector<HTMLButtonElement>(`[data-graph-node="${target.id}"]`)?.focus();
                  }}>
                  <span className={styles.core}>{immersive && node.illustration && <Image src={node.illustration} alt="" width={192} height={192} sizes="100px" loading="eager" unoptimized />}</span>
                  <span className={`${styles.nodeLabel} ${label ? styles.labelVisible : ""}`}>{node.label}{immersive && node.prominent && <small>{node.groupLabel}</small>}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.controls} aria-label="Controles do mapa">
          <button type="button" onClick={() => setZoom((z) => Math.min(1.7, z + 0.2))} disabled={zoom >= 1.7} aria-label="Aproximar mapa">+</button>
          <button type="button" onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))} disabled={zoom <= 0.8} aria-label="Afastar mapa">−</button>
          <button type="button" onClick={reset} aria-label="Voltar à visão inicial" title="Voltar à visão inicial">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M5 8a8 8 0 1 1-1 7M5 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <p className={styles.hint} id={help}>Passe o mouse. Toque. Siga a luz.<span className="visually-hidden"> Use as setas do teclado para percorrer capítulos, Enter para selecionar e Escape para recomeçar. Arraste o fundo com o mouse para mover o mapa.</span></p>
        {immersive && <div className={styles.legend}><span /> Referências cruzadas <i /> Ilustrações por categoria</div>}
      </div>
      <div className={styles.preview} id={panel}>
        {immersive && <div className={styles.panelEyebrow}>SEU PRÓXIMO ENCONTRO</div>}
        <div className={styles.previewHead}>
          <span className={styles.chapterTag}>{current.groupLabel}</span>
          <span className={styles.selectionNote}>Passagem selecionada</span>
        </div>
        <h2 className={styles.previewTitle} aria-live="polite" aria-atomic="true">{current.verseLabel}</h2>
        <p className={styles.scripture}>{current.text}</p>
        {immersive && <div className={styles.relatedPreview}><p>ESTE CAPÍTULO SE CONECTA A</p>{connections.slice(0, 3).map((edge) => {
          const partner = byId.get(edge.source === selected ? edge.target : edge.source)!;
          return <button key={partner.id} type="button" onClick={() => choose(partner.id)}><span>{partner.label}<small>{int(edge.pairs)} {edge.pairs === 1 ? "referência cruzada" : "referências cruzadas"}</small></span><Arrow /></button>;
        })}</div>}
        <div className={styles.previewFoot}>
          <Link href={current.versePath} prefetch={false} className={styles.primaryLink}>Ler passagem <Arrow /></Link>
          <Link href={immersive && selected !== data.centre ? `${byId.get(data.centre)!.explorePath}${current.path}` : current.explorePath} prefetch={false} className={styles.secondaryLink}>{immersive && selected !== data.centre ? "Ler lado a lado" : "Explorar conexões"} <Arrow /></Link>
        </div>
        {immersive && <button className={styles.surprise} type="button" onClick={() => {
          const choices = data.nodes.filter((n) => n.prominent && n.id !== selected);
          choose(choices[Math.floor(Math.random() * choices.length)].id);
        }}>Me leve a uma descoberta <span aria-hidden="true">✧</span></button>}
        <details className={styles.connectionList}>
          <summary>Ver as conexões do mapa em lista</summary>
          <ul>
            {data.edges.filter((e) => e.source === selected || e.target === selected).toSorted((a, b) => b.votes - a.votes).map((edge) => {
              const partner = byId.get(edge.source === selected ? edge.target : edge.source)!;
              return <li key={partner.id}><button type="button" onClick={() => { choose(partner.id); field.current?.querySelector<HTMLButtonElement>(`[data-graph-node="${partner.id}"]`)?.focus(); }}>
                <span>{partner.label}</span><span>{int(edge.pairs)} {edge.pairs === 1 ? "ligação" : "ligações"} · {int(edge.votes)} votos</span>
              </button></li>;
            })}
          </ul>
        </details>
        <small className={styles.credit}>Texto: Bíblia Livre (BLIVRE), CC BY 4.0 · Ligações: OpenBible.info</small>
      </div>
    </section>
  );
}
