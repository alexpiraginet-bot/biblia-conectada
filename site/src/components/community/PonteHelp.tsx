"use client";

import { useCallback, useLayoutEffect, useId, useRef, useState } from "react";
import { ArcIcon, Close, ChevronRight } from "@/components/icons";
import { readRaw, writeRaw } from "@/lib/community/store";
import type { PontePracticeVerse } from "@/lib/community/ponte-tutorial";
import styles from "./PonteHelp.module.css";

const GUIDE_KEY = "bc:ponte-guide:v1";
// Also remember dismissal when a private browser does not allow storage.
let dismissedThisSession = false;

/** A first-visit explanation, independent of the challenge and its saved progress. */
export function PonteHelp({ example }: { example: PontePracticeVerse[] }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const sceneHeading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const release = useRef<(() => void) | null>(null);

  const open = useCallback(() => {
    const box = dialog.current;
    if (!box || box.open) return;
    const body = document.body, root = document.documentElement;
    const href = window.location.href;
    const x = window.scrollX, y = window.scrollY;
    const keys = ["position", "top", "left", "width"] as const;
    const previous = keys.map((key) => body.style[key]);
    const overflow = root.style.overflow;
    const opener = trigger.current;
    Object.assign(body.style, { position: "fixed", top: `${-y}px`, left: `${-x}px`, width: `${root.clientWidth}px` });
    root.style.overflow = "hidden";
    release.current = () => {
      release.current = null;
      if (box.open) box.close();
      keys.forEach((key, index) => { body.style[key] = previous[index]; });
      root.style.overflow = overflow;
      if (window.location.href === href) {
        window.scrollTo({ left: x, top: y, behavior: "instant" });
        if (opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
      }
    };
    box.showModal();
    box.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, []);

  const dismiss = () => {
    dismissedThisSession = true;
    writeRaw(GUIDE_KEY, "seen");
    release.current?.();
    setStep(0);
  };

  useLayoutEffect(() => {
    if (!dismissedThisSession && readRaw(GUIDE_KEY) !== "seen") open();
    // Next can hide a route without unmounting it. Never leave the page locked.
    return () => { release.current?.(); };
  }, [open]);

  useLayoutEffect(() => {
    if (dialog.current?.open) {
      if (body.current) body.current.scrollTop = 0;
      sceneHeading.current?.focus({ preventScroll: true });
    }
  }, [step]);

  const arrived = step === example.length;
  const current = Math.max(0, step - 1);
  const verse = example[current];
  const next = example[current + 1];
  const target = example[example.length - 1];
  const advance = () => setStep((value) => Math.min(value + 1, example.length));
  const title = step === 0 ? "Uma missão: ligar duas passagens." : arrived ? "Você chegou. Essa é a Ponte!" : step === 1 ? "Toque numa passagem ligada." : "Leia. E siga mais uma ligação.";
  const caption = step === 0 ? "Você recebe um início e um destino. Vamos experimentar?" : arrived ? "No desafio real, escolha seu caminho. A faixa de progresso mostra se você está mais perto." : "Cada ligação percorrida vale um salto. Toque na referência destacada abaixo.";

  return (
    <>
      <button ref={trigger} type="button" className={`bc-button bc-button--secondary ${styles.trigger}`} onClick={open} aria-haspopup="dialog">
        <ArcIcon size={20} /> Como jogar
      </button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
        onCancel={(event) => { event.preventDefault(); dismiss(); }}>
        <header className={styles.header}>
          <div>
            <span className="bc-label">Aprenda experimentando</span>
            <h2 ref={heading} tabIndex={-1} id={titleId} className="bc-title">Como jogar a Ponte</h2>
          </div>
          <button type="button" className={styles.close} aria-label="Fechar explicação da Ponte" onClick={dismiss}><Close /></button>
        </header>
        <div ref={body} className={styles.body} data-paused={paused}>
          <div className={styles.explanation}>
            <h3 ref={sceneHeading} tabIndex={-1} aria-describedby={descriptionId}>{title}</h3>
            <p id={descriptionId} className={styles.intro}>{caption}</p>
          </div>
          <div className={styles.scene} key={step}>
            <div className={styles.stageLabel}><span>Treino · ligações reais</span><span className={styles.counter} key={current}>{current} {current === 1 ? "salto" : "saltos"}</span></div>
            <div className={styles.route} aria-hidden="true">
              <svg viewBox="0 0 300 74" fill="none">
                <path d="M20 55Q85 -25 150 55Q215 -25 280 55" stroke="currentColor" strokeOpacity=".2" strokeWidth="2" />
                <path className={styles.thread} d={current > 1 ? "M20 55Q85 -25 150 55Q215 -25 280 55" : "M20 55Q85 -25 150 55"} pathLength="1" stroke="currentColor" strokeWidth="2" />
                {[20, 150, 280].map((x, index) => <g key={x}><circle cx={x} cy="55" r="11" fill="currentColor" opacity={index <= current ? ".15" : "0"} /><circle cx={x} cy="55" r="4" fill="currentColor" opacity={index <= current ? "1" : ".35"} /></g>)}
              </svg>
              <div><span>Início</span><span>Ligação</span><span>Destino</span></div>
            </div>
            {step === 0 ? (
              <div className={styles.mission}>
                <span>Você começa em</span><strong>{verse.ref}</strong>
                <ArcIcon size={32} />
                <span>Seu destino é</span><strong>{target.ref}</strong>
              </div>
            ) : (
              <>
                <div className={styles.verse}>
                  <span>{arrived ? "Destino alcançado" : "Você está lendo"}</span>
                  <strong>{verse.ref}</strong>
                  <p>{verse.excerpt}</p>
                </div>
                {next && <button type="button" className={styles.connection} onClick={advance}>
                  <span>Seguir esta ligação<strong>{next.ref}</strong></span><span className={styles.tap} aria-hidden="true"><ChevronRight /></span>
                </button>}
                {arrived && <p className={styles.success}>Você conectou as passagens em {current} saltos.</p>}
              </>
            )}
          </div>
          <div className={styles.controls}>
            <span>Treino separado do desafio diário</span>
            <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? "Animar" : "Pausar animação"}</button>
          </div>
          <p className={styles.source}>Trechos: Bíblia Livre · Conexões: OpenBible.info</p>
        </div>
        <footer className={styles.footer}>
          <div className={styles.progress} aria-label={`Etapa ${step + 1} de ${example.length + 1}`}>
            {Array.from({ length: example.length + 1 }, (_, index) => <span key={index} data-current={index === step} />)}
          </div>
          <div className={styles.actions}>
            {step > 0 && <button type="button" className="bc-button bc-button--secondary" onClick={() => setStep((value) => value - 1)}>Voltar</button>}
            <button type="button" className="bc-button bc-button--primary" onClick={arrived ? dismiss : advance}>{arrived ? "Ver meu desafio" : step === 0 ? "Começar treino" : "Próximo salto"}</button>
          </div>
          {arrived ? <span>Sem tempo nem placar. Jogue no seu ritmo.</span> : <button type="button" className={styles.skip} onClick={dismiss}>Pular tutorial e ver o desafio</button>}
        </footer>
      </dialog>
    </>
  );
}
