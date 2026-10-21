"use client";

import { useId, useState } from "react";
import { StudyChat } from "./StudyChat";
import type { AssistantTranslation } from "@/lib/assistant/types";
import styles from "./StudyCompanion.module.css";

export type StudyMoment = {
  id: string; title: string; place?: string; image?: string; imageAlt?: string;
  reference: string; href: string; book: string; chapter: number; verse: number;
  verses: { number: number; text: string }[];
  translation?: AssistantTranslation;
};

export function StudyCompanion({ moments, enabled, initialPassage, referenceError = false }: {
  moments: StudyMoment[]; enabled: boolean; initialPassage?: StudyMoment; referenceError?: boolean;
}) {
  const uid = useId();
  const passages = initialPassage ? [initialPassage, ...moments] : moments;
  const [momentId, setMomentId] = useState(initialPassage?.id ?? moments.find((item) => item.id === "cana")?.id ?? moments[0]?.id ?? "");
  const moment = passages.find((item) => item.id === momentId) ?? passages[0];
  if (!moment) return null;
  return <div className={styles.companion}>
    <details className={styles.picker} open={referenceError || undefined}>
      <summary><span>{moment.reference}</span><span>Trocar passagem <span aria-hidden="true">⌄</span></span></summary>
      <form action="/assistente" method="get" className={styles.referencePicker}>
        {moment.translation === "open-nbv" && <input type="hidden" name="translation" value="open-nbv" />}
        <label htmlFor={`${uid}-reference`}>Livro, capítulo e versículo</label>
        <div><input id={`${uid}-reference`} name="ref" type="text" defaultValue={initialPassage?.reference ?? ""} placeholder="Jeremias 17:8" maxLength={120} required /><button type="submit">Escolher</button></div>
      </form>
      {referenceError && <p className={styles.referenceError} role="alert">Não encontramos esse versículo. Informe uma referência válida, como Jeremias 17:8, ou escolha um episódio abaixo.</p>}
      <label className={styles.selectLabel} htmlFor={`${uid}-moment`}>Ou escolha um episódio</label>
      <select id={`${uid}-moment`} value={momentId} onChange={(event) => setMomentId(event.target.value)}>
        {passages.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.reference}{initialPassage?.translation === "open-nbv" ? ` · ${item.translation === "open-nbv" ? "Open NBV" : "BLIVRE"}` : ""}</option>)}
      </select>
    </details>
    <div className={styles.chatFrame}><StudyChat key={moment.id} enabled={enabled} passage={{ book: moment.book, chapter: moment.chapter, verse: moment.verse, reference: moment.reference, text: moment.verses.map((verse) => verse.text).join(" "), ...(moment.translation ? { translation: moment.translation } : {}) }} /></div>
  </div>;
}
