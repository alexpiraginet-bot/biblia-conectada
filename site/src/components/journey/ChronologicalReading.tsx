"use client";

import Image from "next/image";
import Link from "next/link";
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
        fill sizes="(max-width: 55rem) 100vw, 70vw" unoptimized
        onError={() => setFailed(true)}
      />
      <figcaption>Recriação artística por IA</figcaption>
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
        <p key={verse.number}><sup>{verse.number}</sup>{verse.text}</p>
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const chapterRef = useRef<HTMLElement>(null);
  const moment = moments[active];
  if (!moment) return null;
  const chosen = moment.passages.find((passage) => passage.gospel === gospel);

  function selectMoment(index: number) {
    if (!moments[index]) return;
    setActive(index);
    setGospel(moments[index].defaultGospel);
    setCompare(false);
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
      <nav className={styles.moments} aria-label="Momentos da vida de Jesus">
        <span className={styles.railLabel}>Siga o fio da história</span>
        <ol>{moments.map((item, index) => (
          <li key={item.id}>
            <button type="button" onClick={() => selectMoment(index)} aria-current={active === index ? "step" : undefined}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span><small>{item.phase}</small><strong>{item.title}</strong></span>
            </button>
          </li>
        ))}</ol>
        <Link className={styles.mapLink} href="/caminhos"><span aria-hidden="true">↗</span> Encontre estes lugares no mapa</Link>
      </nav>
      <article ref={chapterRef} className={styles.chapter} aria-labelledby="moment-title">
        <Scene key={moment.image} moment={moment} />
        <div className={styles.chapterBody}>
          <div className={styles.kicker}><span>{moment.place}</span><span>Momento {String(active + 1).padStart(2, "0")} / {moments.length}</span></div>
          <h2 ref={headingRef} tabIndex={-1} id="moment-title">{moment.title}</h2>
          <p className={styles.intro}>{moment.intro}</p>
          <div className={styles.readingHead}><h3>Um momento. Diferentes olhares.</h3><span>Texto BLIVRE</span></div>
          <div className={styles.controls} aria-label="Escolha um evangelho ou compare os relatos">
            <div className={styles.gospels}>{GOSPELS.map((item) => {
              const available = moment.passages.some((passage) => passage.gospel === item.id);
              return (
                <button key={item.id} type="button" aria-pressed={!compare && gospel === item.id}
                  onClick={() => { setGospel(item.id); setCompare(false); }}
                  data-available={available}>
                  <span aria-hidden="true" />{item.label}
                </button>
              );
            })}</div>
            <button className={styles.compare} type="button" aria-pressed={compare} onClick={() => setCompare(!compare)}>Comparar olhares <span aria-hidden="true">⇄</span></button>
          </div>
          <div className={styles.readings} aria-live="polite">
            {compare ? (
              <div className={styles.comparison}>{moment.passages.map((passage) => <Passage key={passage.gospel} passage={passage} />)}</div>
            ) : chosen ? <Passage passage={chosen} /> : (
              <div className={styles.absent}>
                <span aria-hidden="true">○</span>
                <h4>Uma história também tem silêncios.</h4>
                <p>Este episódio não aparece como relato paralelo em {GOSPELS.find((item) => item.id === gospel)?.label}. Escolha um dos outros olhares para ler as passagens selecionadas.</p>
                <Link href={`/${gospel}`}>Conhecer este evangelho <span aria-hidden="true">↗</span></Link>
              </div>
            )}
          </div>
          <ListenPassage key={`${moment.id}-${compare ? "compare" : gospel}`} passages={compare ? moment.passages : chosen ? [chosen] : []} />
          <details className={styles.note}>
            <summary>O que aproxima — e o que distingue — estes relatos <span aria-hidden="true">+</span></summary>
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
