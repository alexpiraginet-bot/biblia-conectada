"use client";

import Image from "next/image";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import type { AssistantSuccess } from "@/lib/assistant/types";
import { speakStudyText, speechSnapshot, speechServerSnapshot, speechSupport, stopStudySpeech, subscribeSpeech } from "./study-speech";
import styles from "./StudyChat.module.css";

const unsupported = () => false;
export function StudyListen({ text, label = "Ouvir resposta" }: { text: string; label?: string }) {
  const owner = useId();
  const supported = useSyncExternalStore(subscribeSpeech, speechSupport, unsupported);
  const speech = useSyncExternalStore(subscribeSpeech, speechSnapshot, speechServerSnapshot);
  const speaking = speech.owner === owner;
  useEffect(() => () => stopStudySpeech(owner), [owner]);
  return <div className={styles.listen}>
    <button type="button" disabled={!supported} aria-pressed={speaking} onClick={() => speaking ? stopStudySpeech(owner) : speakStudyText(owner, text)}>{speaking ? "Parar leitura" : label}<span aria-hidden="true">{speaking ? "Ⅱ" : "▷"}</span></button>
    <small role="status">{!supported ? "Leitura em voz alta indisponível neste navegador." : speech.failedOwner === owner ? "A voz do aparelho não está disponível agora." : "Voz do aparelho"}</small>
  </div>;
}

export function StudyAnswer({ answer, onQuestion, disabled }: { answer: AssistantSuccess; onQuestion: (question: string) => void; disabled: boolean }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = answer.scenes?.[sceneIndex];
  return <div className={styles.answer}>
    <span className={styles.eyebrow}>Companheiro · IA</span>
    <h3>{answer.title}</h3>
    <StudyListen text={[answer.title, ...(answer.scenes ?? []).map((item) => `${item.title}. ${item.text}`), ...answer.blocks.map((block) => block.text)].join("\n\n")} />
    {scene && <section className={styles.story} aria-label="A história em cenas ilustradas">
      <figure><Image src={scene.art.src} alt={scene.art.alt} width={640} height={360} unoptimized /><figcaption>{scene.art.caption}</figcaption></figure>
      <h4>{scene.title}</h4><p>{scene.text}</p>
      <div className={styles.citations}>{scene.citationIds.map((id) => answer.citations.find((item) => item.id === id)).filter((citation) => !!citation).map((citation) => <details key={citation.id}><summary>{citation.reference}</summary><blockquote>{citation.text}</blockquote></details>)}</div>
      <a className={styles.sceneLink} href={scene.action.href} target="_blank" rel="noopener noreferrer">{scene.action.label} ↗</a>
      <div className={styles.pager}><button type="button" disabled={sceneIndex === 0} onClick={() => setSceneIndex((value) => value - 1)}>Anterior</button><span>Cena {sceneIndex + 1} de {answer.scenes!.length}</span><button type="button" disabled={sceneIndex === answer.scenes!.length - 1} onClick={() => setSceneIndex((value) => value + 1)}>Próxima</button></div>
    </section>}
    {answer.blocks.map((block, index) => <div className={styles.block} key={index}><p>{block.text}</p>
      <div className={styles.citations}>{block.citationIds.map((id) => answer.citations.find((item) => item.id === id)).filter((citation) => !!citation).map((citation) => <details key={citation.id}><summary>{citation.reference}</summary><blockquote>{citation.text}</blockquote></details>)}</div>
    </div>)}
    <details className={styles.sources}><summary>Conferir fontes bíblicas · {answer.citations.length}</summary><div>{answer.citations.map((citation) => <details key={citation.id}><summary>{citation.reference}</summary><blockquote>{citation.text}</blockquote><a href={citation.href} target="_blank" rel="noopener noreferrer">Abrir capítulo em outra aba ↗</a></details>)}</div></details>
    {!!answer.suggestions.length && <div className={styles.followups}><span>Continue por aqui</span>{answer.suggestions.map((question, index) => <button type="button" key={index} disabled={disabled} onClick={() => onQuestion(question.slice(0, 800))}>{question}<span aria-hidden="true">↗</span></button>)}</div>}
    <p className={styles.notice}>{answer.notice}</p>
  </div>;
}
