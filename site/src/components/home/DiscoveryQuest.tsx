"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  answerQuestion,
  FIRST_ATTEMPT_POINTS,
  journeyLevel,
  journeyPoints,
  journeyServerSnapshot,
  parseJourney,
  readJourneyRaw,
  subscribeJourney,
  writeJourney,
  type DiscoveryQuestion,
} from "@/lib/journey";
import styles from "./DiscoveryQuest.module.css";

function BranchMark({ complete = false }: { complete?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 50V25M32 37 18 27M32 32l15-14M32 25l-6-12" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="32" cy="50" r="3" fill="currentColor" />
      <circle cx="18" cy="27" r="4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="47" cy="18" r="5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="26" cy="13" r="3" fill="currentColor" />
      {complete && <path d="m43 43 4 4 8-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export function DiscoveryQuest({ questions }: { questions: DiscoveryQuestion[] }) {
  const raw = useSyncExternalStore(subscribeJourney, readJourneyRaw, journeyServerSnapshot);
  const progress = parseJourney(raw);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState<{ index: number; correct: boolean; gained: number } | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const question = questions[activeIndex];
  if (!question || !questions.length) return null;

  const points = journeyPoints(progress);
  const currentEntry = progress.entries.find((entry) => entry.id === question.id);
  const isComplete = currentEntry?.completed ?? false;
  const completedCount = new Set(
    questions.filter((item) => progress.entries.some((entry) => entry.id === item.id && entry.completed)).map((item) => item.id),
  ).size;
  const questionCount = new Set(questions.map((item) => item.id)).size;
  const allComplete = completedCount === questionCount;
  const showExplanation = Boolean(answer) || isComplete;
  const nextIndex = questions.findIndex(
    (item, index) => index > activeIndex && !progress.entries.some((entry) => entry.id === item.id && entry.completed),
  );
  const firstOpen = questions.findIndex(
    (item) => !progress.entries.some((entry) => entry.id === item.id && entry.completed),
  );
  const next = nextIndex >= 0 ? nextIndex : firstOpen;

  function choose(index: number) {
    if (answer || isComplete) return;
    // Read at the moment of the event, including updates from another tab.
    const result = answerQuestion(parseJourney(readJourneyRaw()), question, index);
    if (result.changed) setStorageFailed(!writeJourney(result.progress));
    setAnswer({ index, correct: result.correct, gained: result.gained });
  }

  function goTo(index: number) {
    setActiveIndex(index);
    setAnswer(null);
    requestAnimationFrame(() => promptRef.current?.focus());
  }

  return (
    <section className={styles.quest} id="sua-jornada" aria-labelledby="journey-title">
      <div className={styles.intro}>
        <span className={styles.eyebrow}><span /> Sua jornada</span>
        <h2 id="journey-title">Toda descoberta<br />começa com <em>atenção.</em></h2>
        <p>Leia um trecho, encontre a resposta e faça a próxima conexão. Um pequeno percurso para olhar de novo.</p>

        <div className={styles.scoreCard}>
          <div className={styles.mark}><BranchMark complete={allComplete} /></div>
          <div>
            <span className={styles.level}>{journeyLevel(points)}</span>
            <div className={styles.score}><strong>{points}</strong><span>pontos de descoberta</span></div>
          </div>
        </div>
        <div className={styles.thresholds} aria-label="Níveis da jornada">
          <span data-reached={points >= 0}>Semente <b>0</b></span>
          <span data-reached={points >= 20}>Explorador <b>20</b></span>
          <span data-reached={points >= 40}>Conector <b>40</b></span>
        </div>
        <p className={styles.rules}>{FIRST_ATTEMPT_POINTS} pontos por acerto na primeira tentativa. Cada descoberta conta uma vez.</p>
        <p className={styles.storage} role="status">
          <span aria-hidden="true">{storageFailed ? "◌" : "↳"}</span>
          {storageFailed ? "Progresso só nesta visita: o navegador não permitiu salvar." : "Salvo neste navegador"}
        </p>
      </div>

      <div className={styles.challenge}>
        <div className={styles.challengeTop}>
          <span>Percurso de descobertas</span>
          <span>{completedCount} de {questionCount}</span>
        </div>
        <progress className={styles.progress} max={questionCount} value={completedCount} aria-label="Descobertas concluídas" />
        <div className={styles.steps} aria-label="Perguntas do percurso">
          {questions.map((item, index) => {
            const done = progress.entries.some((entry) => entry.id === item.id && entry.completed);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Pergunta ${index + 1}${done ? ", concluída" : ""}`}
                aria-current={activeIndex === index ? "step" : undefined}
                data-done={done}
              >{done ? "✓" : String(index + 1).padStart(2, "0")}</button>
            );
          })}
          <span>Leia. Perceba. Conecte.</span>
        </div>

        <div className={styles.passage}>
          <span className={styles.reference}>{question.reference} <span>BLIVRE</span></span>
          <blockquote>{question.passage}</blockquote>
        </div>
        <h3 ref={promptRef} tabIndex={-1} className={styles.prompt}>{question.prompt}</h3>
        <div className={styles.answers} role="group" aria-label={question.prompt}>
          {question.answers.map((text, index) => {
            const chosen = answer?.index === index;
            const correct = showExplanation && index === question.correctIndex;
            return (
              <button
                type="button"
                key={`${question.id}-${index}`}
                className={styles.answer}
                onClick={() => choose(index)}
                disabled={Boolean(answer) || isComplete}
                data-correct={correct}
                data-wrong={chosen && !answer.correct}
              >
                <span className={styles.answerLetter}>{correct ? "✓" : String.fromCharCode(65 + index)}</span>
                <span>{text}</span>
                <span className={styles.answerArrow} aria-hidden="true">↗</span>
              </button>
            );
          })}
        </div>
        {showExplanation && (
          <div className={styles.feedback} aria-live="polite" key={`${question.id}-${answer?.index ?? "saved"}`}>
            <div className={styles.feedbackTitle}>
              <strong>{answer && !answer.correct ? "Volte ao trecho. A pista está lá." : "Conexão descoberta."}</strong>
              {Boolean(answer?.gained) && <span>+{answer?.gained} pontos</span>}
              {isComplete && !answer && <span>Já concluída</span>}
            </div>
            <p>{question.explanation}</p>
            <div className={styles.feedbackActions}>
              {answer && !answer.correct && <button type="button" onClick={() => setAnswer(null)}>Tentar novamente <span aria-hidden="true">↺</span></button>}
              {isComplete && next >= 0 && <button type="button" onClick={() => goTo(next)}>Próxima descoberta <span aria-hidden="true">→</span></button>}
              <a href={question.href}>Ler no contexto <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        )}
        {allComplete && (
          <div className={styles.badge} role="status">
            <div><BranchMark complete /></div>
            <p><span>Distintivo conquistado</span><strong>Primeiras conexões</strong><small>Você concluiu este percurso. Continue seguindo os fios da história.</small></p>
          </div>
        )}
      </div>
    </section>
  );
}
