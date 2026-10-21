"use client";

import Image from "next/image";
import Link from "next/link";
import { VerseActions } from "@/components/assistant/VerseActions";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { JourneyData, JourneyPassage, JourneyStop } from "@/lib/caminhos";
import styles from "./AncientJourneyMap.module.css";

const W = 800, H = 850;
const count = (n: number) => n.toLocaleString("pt-BR");
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const hashSnapshot = () => window.location.hash.slice(1);
const serverSnapshot = () => "";
function subscribeHash(callback: () => void) { window.addEventListener("hashchange", callback); return () => window.removeEventListener("hashchange", callback); }

function Arrow({ backwards = false }: { backwards?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={backwards ? { rotate: "180deg" } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function pathBetween(a: JourneyStop, b: JourneyStop, index: number) {
  const bend = [ -110, 95, 125, -22, 18, 40, -12 ][index] ?? 0;
  return `M${a.x} ${a.y}C${a.x + bend} ${a.y + (b.y - a.y) * 0.35} ${b.x + bend} ${a.y + (b.y - a.y) * 0.7} ${b.x} ${b.y}`;
}

function Passage({ passage }: { passage: JourneyPassage }) {
  return <div className={styles.passage}>
    <h3>{passage.label}</h3>
    {passage.verses.map((v) => <p key={v.gv}><span className={styles.verseNumber}>{v.n}</span>{v.text}<br />
      <VerseActions path={`/${passage.slug}/${passage.chapter}/${v.n}`} label={`${passage.label.split(" ").slice(0, -1).join(" ")} ${passage.chapter}:${v.n}`} />
    </p>)}
  </div>;
}

function illustration(stop: JourneyStop) {
  if (stop.id === "belem") return { src: "/journey/nativity.webp", alt: "Recriação artística da cena do nascimento de Jesus em Belém.", caption: "Recriação artística do nascimento" };
  if (stop.id === "jordao") return { src: "/journey/jordan-baptism.webp", alt: "Recriação artística do batismo de Jesus nas águas rasas do Jordão.", caption: "Recriação artística do batismo" };
  if (stop.id === "cana") return { src: "/journey/cana-wedding.webp", alt: "Recriação artística das bodas de Caná, com Jesus e jarros de pedra.", caption: "Recriação artística das bodas de Caná" };
  if (stop.id === "jerusalem") return { src: "/journey/jerusalem.webp", alt: "Recriação artística de Jerusalém na paisagem antiga.", caption: "Recriação artística de Jerusalém" };
  if (stop.id === "galileia") return { src: "/journey/galilee-dawn.webp", alt: "Recriação artística do mar da Galileia ao amanhecer, com um barco.", caption: "Recriação artística da Galileia" };
  if (stop.id === "cafarnaum") return { src: "/journey/galilee-teaching.webp", alt: "Recriação artística de uma cena de ensino na Galileia.", caption: "Recriação artística da Galileia" };
  return null;
}

export function AncientJourneyMap({ data }: { data: JourneyData }) {
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot, serverSnapshot);
  const selected = Math.max(0, data.stops.findIndex((s) => s.id === hash));
  const stop = data.stops[selected];
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const map = useRef<HTMLDivElement>(null);
  const stopsNav = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panel = useRef<HTMLElement>(null);
  const instance = useId();
  const figure = illustration(stop);
  useEffect(() => {
    const nav = stopsNav.current;
    const active = nav?.querySelector<HTMLButtonElement>("[aria-current]");
    if (nav && active) nav.scrollTo({ left: active.offsetLeft - nav.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2, behavior: "auto" });
  }, [selected]);
  const choose = (index: number, focusPanel = true) => {
    if (index < 0 || index >= data.stops.length) return;
    window.history.replaceState(null, "", `#${data.stops[index].id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    if (focusPanel) requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 900px)").matches) panel.current?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  };
  const keyStop = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const destination = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index + 1) % data.stops.length
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index - 1 + data.stops.length) % data.stops.length
      : event.key === "Home" ? 0 : event.key === "End" ? data.stops.length - 1 : null;
    if (destination === null) return;
    event.preventDefault();
    choose(destination, false);
    map.current?.querySelector<HTMLButtonElement>(`[data-stop="${data.stops[destination].id}"]`)?.focus();
  };
  const returnToMap = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    map.current?.scrollIntoView({ behavior: "auto", block: "center" });
    map.current?.querySelector<HTMLButtonElement>(`[data-stop="${stop.id}"]`)?.focus({ preventScroll: true });
  };
  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button") || event.button !== 0 || (event.pointerType === "touch" && zoom === 1)) return;
    drag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const d = drag.current;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (Math.hypot(dx, dy) > 3) d.moved = true;
    setPan({ x: clamp(d.px + dx, -240, 240), y: clamp(d.py + dy, -250, 250) });
  };

  return <div className={styles.journey} data-ancient-journey="">
    <nav ref={stopsNav} className={styles.stopsNav} aria-label="Paradas da jornada">
      <ol>{data.stops.map((s, i) => <li key={s.id}><button type="button" aria-current={i === selected ? "step" : undefined} onClick={() => choose(i)}>
        <span>{s.number.toString().padStart(2, "0")}</span>{s.place}
      </button></li>)}</ol>
    </nav>

    <div className={styles.columns}>
      <div className={styles.mapColumn}>
        <div className={styles.mapFrame}>
          <div className={styles.mapTitle}><span>Os lugares dos evangelhos</span><span>Norte ↑</span></div>
          <div ref={map} className={styles.map} style={{ touchAction: zoom > 1 ? "none" : "pan-y" }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} aria-label="Mapa ilustrado das paradas de Jesus" aria-describedby={`${instance}-map-help`}>
            <div className={styles.mapPlane} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={styles.terrain} aria-hidden="true">
                <defs>
                  <pattern id={`${instance}-water`} x="0" y="0" width="28" height="30" patternUnits="userSpaceOnUse"><path d="M2 20q6-5 12 0t12 0" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.2" /></pattern>
                </defs>
                <path className={styles.sea} d="M0 0H378L366 62 353 100 344 145 319 167 318 185 299 216 294 257 280 303 268 346 252 405 239 455 219 506 210 558 194 610 176 665 158 720 142 785 125 850H0Z" />
                <path className={styles.waterLines} fill={`url(#${instance}-water)`} d="M0 0H378L366 62 353 100 344 145 319 167 318 185 299 216 294 257 280 303 268 346 252 405 239 455 219 506 210 558 194 610 176 665 158 720 142 785 125 850H0Z" />
                <path className={styles.coast} d="M378 0 366 62 353 100 344 145 319 167 318 185 299 216 294 257 280 303 268 346 252 405 239 455 219 506 210 558 194 610 176 665 158 720 142 785 125 850" />
                <path className={styles.lake} d="M514 170C527 163 542 174 547 191C553 212 535 237 517 235C503 224 500 206 501 192C502 181 507 174 514 170Z" />
                <path className={styles.river} d="M520 235C509 267 521 283 511 302S503 331 507 350 497 382 506 410 495 442 507 465 513 495 506 515 513 545 501 566 506 588 512 620" />
                <path className={styles.lake} d="M512 620C525 624 543 642 549 675C554 705 549 732 541 752C538 771 548 791 545 818L536 850H503C499 823 490 796 491 774C485 753 487 735 493 713C496 686 501 650 512 620Z" />
                <g className={styles.mountains}>
                  {Array.from({ length: 27 }, (_, i) => {
                    const x = 340 + (i % 3) * 42 + Math.sin(i * 2.1) * 14, y = 55 + Math.floor(i / 3) * 82;
                    return <path key={i} d={`M${x - 12} ${y + 22}l12-22 13 22m-18-12 5-10 6 11`} />;
                  })}
                  {Array.from({ length: 16 }, (_, i) => {
                    const x = 600 + (i % 2) * 47 + Math.sin(i * 3) * 15, y = 160 + Math.floor(i / 2) * 79;
                    return <path key={`e${i}`} d={`M${x - 13} ${y + 23}l13-23 16 23m-22-12 6-11 6 12`} />;
                  })}
                </g>
                <g className={styles.regionNames}><text x="423" y="86">Galileia</text><text x="360" y="415">Samaria</text><text x="343" y="540">Judeia</text><text x="650" y="408">Pereia</text></g>
                <g className={styles.waterNames}><text x="110" y="390" transform="rotate(-70 110 390)">Mar Mediterrâneo</text><text x="480" y="395" transform="rotate(90 480 395)">Rio Jordão</text><text x="520" y="746" transform="rotate(90 520 746)">Mar Morto</text></g>
                <g className={styles.itinerary}>
                  {data.stops.slice(1).map((s, i) => <path key={s.id} d={pathBetween(data.stops[i], s, i)} className={i < selected ? styles.walked : styles.ahead} />)}
                  {selected > 0 && <path key={`current-${selected}`} d={pathBetween(data.stops[selected - 1], stop, selected - 1)} className={styles.routeLight} pathLength="100" />}
                </g>
                <g className={styles.leaders}>{data.stops.map((s, i) => <path key={s.id} d={`M${s.x} ${s.y}L${s.labelX} ${s.labelY}`} className={i === selected ? styles.activeLeader : undefined} />)}</g>
                <g>{data.stops.map((s, i) => <g key={s.id} className={i === selected ? styles.selectedPoint : styles.point}>
                  <circle cx={s.x} cy={s.y} r={i === selected ? 9 : 4} />
                  {i === selected && <circle cx={s.x} cy={s.y} r="17" className={styles.pointRing} />}
                </g>)}</g>
                <g className={styles.compass} transform="translate(700 725)"><circle r="31" /><path d="M0-46 7-9 0-15-7-9ZM0 46 7 9 0 15-7 9ZM-46 0-9 7-15 0-9-7ZM46 0 9 7 15 0 9-7Z" /><text y="-55">N</text></g>
              </svg>
              {data.stops.map((s, i) => <button type="button" key={s.id} data-stop={s.id} className={`${styles.mapStop} ${i === selected ? styles.selectedStop : ""}`} tabIndex={i === selected ? 0 : -1}
                style={{ left: `${s.labelX / W * 100}%`, top: `${s.labelY / H * 100}%` } as CSSProperties}
                aria-label={`${s.number}. ${s.place}: ${s.title}`} aria-pressed={i === selected} aria-controls={`${instance}-detail`}
                onClick={() => choose(i)} onKeyDown={(event) => keyStop(event, i)}>
                <span>{s.number.toString().padStart(2, "0")}</span><strong>{s.place}</strong>{(s.id === "cana" || s.id === "jordao") && <small>aproximado</small>}
              </button>)}
            </div>
            <div className={styles.mapTools} aria-label="Ajustar o mapa">
              <button type="button" aria-label="Aproximar mapa" onClick={() => setZoom((z) => Math.min(2.2, z + 0.25))} disabled={zoom >= 2.2}>+</button>
              <button type="button" aria-label="Afastar mapa" onClick={() => setZoom((z) => Math.max(0.85, z - 0.25))} disabled={zoom <= 0.85}>−</button>
              <button type="button" aria-label="Enquadrar mapa inteiro" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <span className={styles.mapStamp}>Mapa ilustrado · sem escala</span>
          </div>
          <p className={styles.mapHelp} id={`${instance}-map-help`}>Escolha um lugar para entrar no relato. Use as setas do teclado entre as paradas; amplie e arraste para olhar de perto.</p>
        </div>
        <p className={styles.mapCaution}>A linha tracejada conecta esta seleção de episódios. É um caminho de leitura, não um itinerário historicamente comprovado.</p>
      </div>

      <article ref={panel} className={styles.detail} id={`${instance}-detail`}>
        <button type="button" className={styles.returnToMap} onClick={returnToMap}><Arrow backwards />Voltar ao mapa</button>
        <div className={styles.detailTop}><span>Parada {stop.number.toString().padStart(2, "0")} de {data.stops.length.toString().padStart(2, "0")}</span><span>{stop.date} · data aproximada</span></div>
        <div className={styles.detailHeading}>
          <p className={styles.place}>{stop.place}</p>
          <h2 ref={heading} tabIndex={-1} aria-live="polite">{stop.title}</h2>
          <p className={styles.context}>{stop.context}</p>
        </div>
        {figure && <figure className={styles.illustration}>
          <Image src={figure.src} alt={figure.alt} width={800} height={450} sizes="(max-width: 900px) 100vw, 38vw" />
          <figcaption>{figure.caption}</figcaption>
        </figure>}
        <div className={styles.reading}>
          <Passage passage={stop.passage} />
          <Link className={styles.readLink} href={`/${stop.passage.slug}/${stop.passage.chapter}`} prefetch={false}>Ler o capítulo inteiro <Arrow /></Link>
          <p className={styles.textCredit}>Texto: Bíblia Livre (BLIVRE), CC BY 4.0</p>
        </div>
        <div className={styles.moreReadings}>
          <h3>Olhe também por aqui.</h3>
          {stop.parallelNote && <p className={styles.parallelNote}>{stop.parallelNote}</p>}
          {stop.parallels.map((p) => <details key={p.path} className={styles.parallel}>
            <summary>{p.label}<span>+</span></summary>
            <p className={styles.parallelDescription}>{p.note}</p>
            <Passage passage={p} />
            <Link href={p.path} prefetch={false}>Abrir na Bíblia <Arrow /></Link>
          </details>)}
        </div>
        <div className={styles.connections}>
          <h3>O relato continua em outras páginas.</h3>
          <p>Ligações da OpenBible.info, ordenadas pelos votos dos leitores.</p>
          <ul>{stop.connections.map((connection) => <li key={`${connection.from}-${connection.to}`}>
            <Link href={connection.href} prefetch={false}><span>{connection.label}</span><Arrow /></Link>
            <blockquote>{connection.text}</blockquote>
            <VerseActions path={connection.versePath} label={connection.label.split(" · ").at(-1)!} />
            <small>{count(connection.votes)} votos · Ler lado a lado</small>
          </li>)}</ul>
        </div>
        <div className={styles.locationNote}>
          {stop.locationNote && <p>{stop.locationNote}</p>}
          <a href={stop.sourceUrl} target="_blank" rel="noreferrer">Ver a fonte da localização</a><span aria-hidden="true"> · </span><Link href={stop.eventPath} prefetch={false}>Ver o evento e a data</Link>
        </div>
        <div className={styles.nextStop}>
          <button type="button" disabled={selected === 0} onClick={() => choose(selected - 1)}><Arrow backwards />Anterior</button>
          <button type="button" onClick={() => choose(selected === data.stops.length - 1 ? 0 : selected + 1)}>{selected === data.stops.length - 1 ? "Recomeçar a jornada" : `Seguir para ${data.stops[selected + 1].place}`}<Arrow /></button>
        </div>
      </article>
    </div>
  </div>;
}
