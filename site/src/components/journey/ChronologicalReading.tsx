"use client";

import Image from "next/image";
import Link from "next/link";
import { VerseStudyLink } from "@/components/assistant/VerseStudyLink";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CHRONOLOGY_FALLBACK_IMAGE,
  GOSPELS,
  type GospelId,
  type LoadedChronologicalMoment,
  type LoadedGospelPassage,
} from "@/lib/chronological-reading";
import styles from "./ChronologicalReading.module.css";

const subscribeSpeechSupport = () => () => {};
const speechSupport = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
const noServerSpeech = () => false;

function ListenPassage({ passages }: { passages: LoadedGospelPassage[] }) {
  const supported = useSyncExternalStore(subscribeSpeechSupport, speechSupport, noServerSpeech);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  }, []);

  function toggleReading() {
    if (speaking) {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeaking(false);
      return;
    }
    try {
      const text = passages.map((passage) => `${passage.reference}. ${passage.verses.map((verse) => verse.text).join(" ")}`).join("\n\n");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 0.92;
      const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase() === "pt-br");
      if (voice) utterance.voice = voice;
      utterance.onend = () => { setSpeaking(false); utteranceRef.current = null; };
      utterance.onerror = () => { setSpeaking(false); setError(true); utteranceRef.current = null; };
      utteranceRef.current = utterance;
      setError(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeaking(false);
      setError(true);
    }
  }

  if (!supported || !passages.length) return null;
  return (
    <div className={styles.audio}>
      <button type="button" onClick={toggleReading} aria-pressed={speaking}>
        <span aria-hidden="true">{speaking ? "■" : "▷"}</span>{speaking ? "Parar leitura" : "Ouvir passagem"}
      </button>
      <span role="status">{error ? "A voz do aparelho não está disponível agora." : "Voz do aparelho · português"}</span>
    </div>
  );
}

function Scene({ moment }: { moment: LoadedChronologicalMoment }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={styles.scene}>
      <Image
        src={failed ? CHRONOLOGY_FALLBACK_IMAGE : moment.image}
        alt={failed ? "Recriação de uma paisagem da Galileia ao amanhecer." : moment.imageAlt}
        fill sizes="(max-width: 40rem) 42vw, 300px" unoptimized
        onError={() => setFailed(true)}
      />
    </figure>
  );
}

function Passage({ passage }: { passage: LoadedGospelPassage }) {
  return (
    <div className={styles.passage}>
      <div className={styles.passageHead}>
        <h4>{passage.reference}</h4>
        <span>{passage.relation === "relato" ? "Relato" : "Passagem relacionada"}</span>
      </div>
      <blockquote>{passage.verses.map((verse) => (
        <p key={verse.number}><sup>{verse.number}</sup>{verse.text}<br />
          <VerseStudyLink path={`/${passage.gospel}/${passage.chapter}/${verse.number}`}
            label={`${GOSPELS.find((item) => item.id === passage.gospel)!.label} ${passage.chapter}:${verse.number}`} />
        </p>
      ))}</blockquote>
      <p className={styles.perspective}>{passage.note}</p>
      <Link className={styles.readLink} href={passage.href}>Continuar no texto bíblico <span aria-hidden="true">↗</span></Link>
    </div>
  );
}

export function ChronologicalReading({ moments }: { moments: LoadedChronologicalMoment[] }) {
  const [active, setActive] = useState(0);
  const [gospel, setGospel] = useState<GospelId>(moments[0]?.defaultGospel ?? "lucas");
  const [compare, setCompare] = useState(false);
  const [hoveredGospel, setHoveredGospel] = useState<GospelId | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const readingHeadingRef = useRef<HTMLHeadingElement>(null);
  const chapterRef = useRef<HTMLElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const timeline = timelineRef.current;
    const current = timeline?.querySelector<HTMLButtonElement>("[aria-current]");
    if (timeline && current) timeline.scrollTo({
      left: current.offsetLeft - timeline.offsetLeft - (timeline.clientWidth - current.offsetWidth) / 2,
      behavior: "auto",
    });
  }, [active]);
  const moment = moments[active];
  if (!moment) return null;
  const chosen = moment.passages.find((passage) => passage.gospel === gospel);

  function revealReading() {
    if (!window.matchMedia("(max-width: 58rem)").matches) return;
    requestAnimationFrame(() => {
      readingHeadingRef.current?.focus({ preventScroll: true });
      readingHeadingRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    });
  }

  function selectMoment(index: number) {
    if (!moments[index]) return;
    setActive(index);
    setGospel(moments[index].defaultGospel);
    setCompare(false);
    setHoveredGospel(null);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      chapterRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className={styles.reader} id="percurso">
      <div className={styles.itineraryHead}>
        <div><span className={styles.eyebrow}>O fio dos acontecimentos</span><h2>Entre em um momento.</h2></div>
        <p>Escolha uma cena.<br />Siga os olhares que se encontram nela.</p>
      </div>
      <nav className={styles.moments} aria-label="Momentos da vida de Jesus">
        <ol ref={timelineRef}>{moments.map((item, index) => (
          <li key={item.id}>
            <button type="button" onClick={() => selectMoment(index)} aria-current={active === index ? "step" : undefined}>
              <span className={styles.miniature}><Image src={item.image} alt="" fill sizes="72px" unoptimized /></span>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.momentLabel}><strong>{item.title}</strong><small>{item.place}</small></span>
            </button>
          </li>
        ))}</ol>
        <div className={styles.trailFoot}><span>Do nascimento aos relatos da ressurreição</span><span>Deslize para percorrer <span aria-hidden="true">↔</span></span></div>
      </nav>
      <article ref={chapterRef} className={styles.chapter} aria-labelledby="moment-title">
        <div className={styles.atlas}>
          <div className={styles.kicker}><span>{moment.place} <span aria-hidden="true">·</span> {moment.phase}</span><span>{String(active + 1).padStart(2, "0")} / {String(moments.length).padStart(2, "0")}</span></div>
          <h2 ref={headingRef} tabIndex={-1} id="moment-title">{moment.title}</h2>
          <p className={styles.intro}>{moment.intro}</p>
          <div ref={branchRef} className={styles.branchMap} aria-label="Escolha o olhar de um evangelho">
            <svg className={styles.branches} viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
              {GOSPELS.map((item, index) => {
                const passage = moment.passages.find((entry) => entry.gospel === item.id);
                const y = 62.5 + index * 125;
                const lit = hoveredGospel ? hoveredGospel === item.id : compare || gospel === item.id;
                return passage ? <g key={item.id} data-lit={lit} data-related={passage.relation === "relacionado"}>
                  <path d={`M310 250 C480 250 470 ${y} 680 ${y}`} />
                  <circle cx="680" cy={y} r="4" />
                  <circle cx={480 + index * 18} cy={250 + (y - 250) * 0.5} r="3" className={styles.branchStar} />
                </g> : null;
              })}
            </svg>
            <div className={styles.origin}>
              <Scene key={moment.image} moment={moment} />
              <span className={styles.originCaption}>A cena <span aria-hidden="true">↗</span></span>
            </div>
            {GOSPELS.map((item, index) => {
              const passage = moment.passages.find((entry) => entry.gospel === item.id);
              const marks = ["Mt", "Mc", "Lc", "Jo"];
              return <button key={item.id} type="button" className={styles.gospelNode}
                style={{ top: `${12.5 + index * 25}%` }} aria-pressed={!compare && gospel === item.id}
                aria-controls="chronology-readings"
                onClick={() => { setGospel(item.id); setCompare(false); revealReading(); }}
                onPointerEnter={() => setHoveredGospel(item.id)} onPointerLeave={() => setHoveredGospel(null)}
                onFocus={() => setHoveredGospel(item.id)} onBlur={() => setHoveredGospel(null)}
                data-available={Boolean(passage)} data-comparing={compare && Boolean(passage)}>
                <span className={styles.gospelSeal} aria-hidden="true">{marks[index]}</span>
                <span><strong>{item.label}</strong><small>{passage ? passage.reference : "Sem relato paralelo"}</small></span>
                <span className={styles.nodeArrow} aria-hidden="true">↗</span>
              </button>;
            })}
          </div>
          <div className={styles.mapLegend}><span><i /> Relato</span><span><i /> Passagem relacionada</span><small>Imagens: recriações por IA</small></div>
          <div className={styles.atlasActions}>
            <button className={styles.compare} type="button" aria-pressed={compare} onClick={() => { setCompare(!compare); revealReading(); }}><span aria-hidden="true">⇄</span> {compare ? "Voltar a um olhar" : "Comparar os olhares"}</button>
            <Link className={styles.mapLink} href="/caminhos">Ver os lugares no mapa <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <div className={styles.chapterBody}>
          <button type="button" className={styles.returnToAtlas} onClick={() => {
            const selectedNode = branchRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? branchRef.current?.querySelector<HTMLButtonElement>("button");
            selectedNode?.focus({ preventScroll: true });
            branchRef.current?.scrollIntoView({ behavior: "auto", block: "center" });
          }}>↑ Voltar aos olhares</button>
          <div className={styles.readingHead}><span className={styles.eyebrow}>{compare ? "Olhares em comparação" : "Conexão em foco"}</span><span>Bíblia Livre</span></div>
          <h3 ref={readingHeadingRef} tabIndex={-1} className={styles.readingTitle}>{compare ? "Cada voz,\num caminho." : `O olhar de\n${GOSPELS.find((item) => item.id === gospel)?.label}.`}</h3>
          <div className={styles.readings} aria-live="polite" id="chronology-readings">
            {compare ? (
              <div className={styles.comparison}>{moment.passages.map((passage) => <Passage key={passage.gospel} passage={passage} />)}</div>
            ) : chosen ? <Passage passage={chosen} /> : (
              <div className={styles.absent}>
                <span aria-hidden="true">○</span>
                <h4>Nem todo olhar traz a mesma cena.</h4>
                <p>Este episódio não aparece como relato paralelo em {GOSPELS.find((item) => item.id === gospel)?.label}. Escolha um dos outros olhares para ler as passagens selecionadas.</p>
                <Link href={`/${gospel}`}>Conhecer este evangelho <span aria-hidden="true">↗</span></Link>
              </div>
            )}
          </div>
          <ListenPassage key={`${moment.id}-${compare ? "compare" : gospel}`} passages={compare ? moment.passages : chosen ? [chosen] : []} />
          <details className={styles.note}>
            <summary>O que aproxima e distingue os relatos <span aria-hidden="true">+</span></summary>
            <p>{moment.note}</p>
            <a href="#criterios">Como este percurso foi organizado</a>
          </details>
          <div className={styles.pager}>
            <button type="button" onClick={() => selectMoment(active - 1)} disabled={active === 0}><span aria-hidden="true">←</span> Momento anterior</button>
            {active < moments.length - 1
              ? <button type="button" onClick={() => selectMoment(active + 1)}>Próximo momento <span aria-hidden="true">→</span></button>
              : <Link href="/ler">Continue sua leitura <span aria-hidden="true">↗</span></Link>}
          </div>
        </div>
      </article>
    </div>
  );
}
