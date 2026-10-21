"use client";

import Image from "next/image";
import { useState } from "react";
import type { AssistantAudio, AssistantSuccess } from "@/lib/assistant/types";
import styles from "./StudyChat.module.css";

export function StudyAnswer({ answer, onQuestion, disabled, onListen }: { answer: AssistantSuccess; onQuestion: (question: string) => void; disabled: boolean; onListen?: (audio: AssistantAudio) => void }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const scene = answer.scenes?.[sceneIndex];
  return <div className={styles.answer}>
    <span className={styles.eyebrow}>Companheiro · IA</span>
    <h3>{answer.title}</h3>
    {answer.audio && onListen && <div className={styles.listen}><button type="button" onClick={() => onListen(answer.audio!)}>Ouvir resposta <span aria-hidden="true">▷</span></button><small>{answer.audio.partial ? "Trecho inicial em áudio · " : ""}Voz gerada por IA</small></div>}
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
    <details className={styles.sources}><summary>Conferir fontes bíblicas · {answer.citations.length}</summary><div>{answer.source && <><p>{answer.source.name} · {answer.source.credit} · <a href={answer.source.licenseUrl} target="_blank" rel="noopener noreferrer">{answer.source.license}</a></p>{answer.source.sourceNotice && <p>{answer.source.sourceNotice}</p>}{answer.source.trademarkNotice && <p>{answer.source.trademarkNotice}</p>}</>}{answer.citations.map((citation) => <details key={citation.id}><summary>{citation.reference}{citation.source ? ` · ${citation.source}` : ""}</summary><blockquote>{citation.text}</blockquote><a href={citation.href} target="_blank" rel="noopener noreferrer">Abrir passagem em outra aba ↗</a></details>)}</div></details>
    {!!answer.suggestions.length && <div className={styles.followups}><span>Continue por aqui</span>{answer.suggestions.map((question, index) => <button type="button" key={index} disabled={disabled} onClick={() => onQuestion(question.slice(0, 800))}>{question}<span aria-hidden="true">↗</span></button>)}</div>}
    <p className={styles.notice}>{answer.notice}</p>
  </div>;
}
