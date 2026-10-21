"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { AssistantAvailability, AssistantError, AssistantMode, AssistantRequest, AssistantStyle, AssistantSuccess, AssistantTranslation } from "@/lib/assistant/types";
import { getTranslation } from "@/lib/translations";
import { StudyAnswer } from "./StudyAnswer";
import { useStudyVoice } from "./use-study-voice";
import { StudyVoiceControls } from "./StudyVoiceControls";
import styles from "./StudyChat.module.css";

export type StudyPassage = { book: string; chapter: number; verse: number; reference: string; text: string; translation?: AssistantTranslation };
type Turn = { request: AssistantRequest; answer?: AssistantSuccess };
const HISTORY_LIMIT = 2;
const STYLES: { id: AssistantStyle; label: string; description: string }[] = [
  { id: "simples", label: "Bem simples", description: "Palavras fáceis, também para crianças." },
  { id: "contexto", label: "Contexto bíblico", description: "O sentido do texto e suas conexões." },
  { id: "cotidiano", label: "No dia a dia", description: "Reflexões para a vida de hoje." },
];
const QUESTIONS: { label: string; question: string; mode: AssistantMode }[] = [
  { label: "O que este versículo quer dizer?", question: "O que este versículo quer dizer? Explique as palavras principais e seu sentido na passagem.", mode: "entender" },
  { label: "Como ele se conecta à Bíblia?", question: "Quais conexões bíblicas ajudam a compreender este versículo?", mode: "explorar" },
  { label: "Conte essa história para mim", question: "Conte o episódio desta passagem em cenas curtas, com referências ao texto bíblico.", mode: "narrar" },
];

/** The same request object is kept on retry; historical answers are context, never sources. */
export function buildStudyRequest(passage: StudyPassage, question: string, style: AssistantStyle, mode: AssistantMode, turns: Turn[]): AssistantRequest {
  const history = turns.filter((turn) => turn.answer && (turn.request.translation ?? "blivre") === (passage.translation ?? "blivre") &&
    turn.request.passage.book === passage.book && turn.request.passage.chapter === passage.chapter && turn.request.passage.verse === passage.verse).slice(-HISTORY_LIMIT).map((turn) => ({
    question: turn.request.question,
    answer: [turn.answer!.title, ...(turn.answer!.scenes ?? []).map((scene) => `${scene.title}. ${scene.text}`), ...turn.answer!.blocks.map((block) => block.text)].join("\n").slice(0, 2000),
  }));
  const body: AssistantRequest = { requestId: crypto.randomUUID(), mode, style, question: question.trim(), passage: { book: passage.book, chapter: passage.chapter, verse: passage.verse } };
  if (passage.translation === "open-nbv") body.translation = passage.translation;
  if (history.length) body.history = history;
  while (body.history?.length && new TextEncoder().encode(JSON.stringify(body)).byteLength > 8192) body.history.shift();
  if (!body.history?.length) delete body.history;
  return body;
}

export function StudyChat({ passage, enabled = true }: { passage: StudyPassage; enabled?: boolean }) {
  const uid = useId();
  const voice = useStudyVoice();
  const setVoiceAvailable = voice.setAvailable;
  const edition = getTranslation(passage.translation ?? "blivre")!;
  const openNbv = passage.translation === "open-nbv";
  const questions = openNbv ? QUESTIONS.map((item) => item.mode === "explorar" ? {
    ...item, label: "Como ele se conecta ao capítulo?", question: "Como este versículo se relaciona com o restante deste capítulo na Open Nova Bíblia Viva?",
  } : item) : QUESTIONS;
  const [style, setStyle] = useState<AssistantStyle>("contexto");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [available, setAvailable] = useState(enabled);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AssistantError | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const pending = useRef(false);
  const request = useRef<AssistantRequest | null>(null);
  const controller = useRef<AbortController | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const lastTurn = useRef<HTMLElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const availability = new AbortController();
    fetch("/api/assistente", { cache: "no-store", signal: availability.signal })
      .then(async (response) => response.ok ? await response.json() as AssistantAvailability : null)
      .then((status) => {
        if (!status || availability.signal.aborted) return;
        setAvailable(status.available === true);
        setAvailabilityMessage(typeof status.message === "string" ? status.message : "");
        setVoiceAvailable(status.voice?.available === true);
      }).catch(() => {});
    return () => { availability.abort(); controller.current?.abort(); };
  }, [setVoiceAvailable]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    // Scroll only the conversation. The reading underneath must never move.
    const box = log.current, latest = lastTurn.current;
    if (box && latest) box.scrollTop += latest.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
  }, [loading, turns.length]);

  async function send(body: AssistantRequest) {
    if (pending.current || !available || cooldown > 0) return;
    voice.prepare(body.requestId);
    pending.current = true;
    request.current = body;
    setTurns((current) => current.some((turn) => turn.request.requestId === body.requestId) ? current : [...current, { request: body }]);
    setLoading(true); setError(null); setQuestion("");
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 90000);
    try {
      const response = await fetch("/api/assistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: abort.signal });
      const result = await response.json() as AssistantSuccess | AssistantError;
      if (!response.ok || !result.ok) {
        voice.stop();
        const failure: AssistantError = result.ok ? { ok: false, code: "provider", message: "Não foi possível concluir a resposta agora." } : result;
        setError(failure);
        setCooldown(Math.max(0, Math.min(86400, Math.ceil(failure.retryAfterSeconds ?? 0))));
        if (failure.code === "unavailable") setAvailable(false);
        return;
      }
      setTurns((current) => current.map((turn) => turn.request.requestId === body.requestId ? { ...turn, answer: result } : turn));
      voice.receive(body.requestId, result.audio);
    } catch {
      voice.stop();
      setError({ ok: false, code: "provider", message: "A conexão foi interrompida. Verifique a mesma consulta em Tentar novamente." });
    } finally {
      window.clearTimeout(timeout);
      pending.current = false;
      setLoading(false);
      if (controller.current === abort) controller.current = null;
    }
  }

  function ask(text: string, mode: AssistantMode = "entender") {
    if (text.trim().length < 3 || text.length > 800 || pending.current) return;
    const previous = request.current;
    const sameQuestion = previous && previous.question === text.trim() && previous.style === style && previous.mode === mode;
    if (sameQuestion && error?.code === "in_progress") return;
    void send(sameQuestion && error?.code === "provider" ? previous : buildStudyRequest(passage, text, style, mode, turns));
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(question); }

  return <div className={styles.chat}>
    <details className={styles.passage}>
      <summary><span>{passage.text}</span><small>{openNbv ? "Open NBV · " : ""}Ver versículo completo</small></summary>
      <blockquote>{passage.text}</blockquote><span>{edition.name} · {passage.reference}</span>
      {openNbv && <small>{edition.credit} · <a href={edition.licenseUrl} target="_blank" rel="noopener noreferrer">{edition.license}</a><br />{edition.sourceNotice}<br />{edition.trademarkNotice}</small>}
      <a href={`/explorar/${passage.book}/${passage.chapter}`} target="_blank" rel="noopener noreferrer">{openNbv ? "Ver conexões do capítulo na BLIVRE" : "Ver conexões em outra aba"} ↗</a>
    </details>
    <fieldset className={styles.styles} disabled={loading}>
      <legend>Como você quer entender?</legend>
      <div>{STYLES.map((item) => <label key={item.id} title={item.description}>
        <input type="radio" name={`${uid}-style`} value={item.id} checked={style === item.id} onChange={() => setStyle(item.id)} />
        <span>{item.label}</span>
      </label>)}</div>
    </fieldset>
    <div className={styles.log} ref={log} role="log" tabIndex={0} aria-label="Conversa sobre a passagem" aria-live="polite" aria-relevant="additions text">
      {!turns.length && <div className={styles.welcome}>
        <span className={styles.eyebrow}>Seu companheiro de estudo</span>
        <h3>Vamos entender juntos.</h3><p>{openNbv ? "Estudo na Open Nova Bíblia Viva, com o contexto deste capítulo." : "Escolha uma pergunta ou escreva a sua."}</p>
        <div className={styles.prompts}>{questions.map((item) => <button type="button" key={item.mode} disabled={!available || cooldown > 0} onClick={() => ask(item.question, item.mode)}>{item.label}<span aria-hidden="true">↗</span></button>)}</div>
      </div>}
      {turns.map((turn, index) => <article className={styles.turn} key={turn.request.requestId} ref={index === turns.length - 1 ? lastTurn : undefined}>
        <div className={styles.question}><span>Você · {STYLES.find((item) => item.id === turn.request.style)?.label}</span><p>{turn.request.question}</p></div>
        {turn.answer && <StudyAnswer answer={turn.answer} onQuestion={(text) => ask(text)} disabled={loading || !available || cooldown > 0} onListen={voice.replay} />}
        {index === turns.length - 1 && loading && <div className={styles.typing} role="status"><span className={styles.dots} aria-hidden="true"><i /><i /><i /></span><span>Preparando resposta…<small>{openNbv ? "Lendo a Open Nova Bíblia Viva e o contexto do capítulo." : "Lendo a passagem e suas conexões."}</small></span></div>}
      </article>)}
      {error && <div className={styles.error} role="alert"><p>{error.message}</p>
        {cooldown > 0 && <p>Tente novamente em {cooldown}s.</p>}
        {error.code === "provider" && <button type="button" disabled={loading || cooldown > 0 || !available} onClick={() => { if (request.current) void send(request.current); }}>Tentar novamente</button>}
        {error.code === "in_progress" && <><p>Essa consulta já foi recebida. Uma nova tentativa contará novamente no limite de uso.</p><button type="button" disabled={loading || cooldown > 0 || !available} onClick={() => { const previous = request.current; if (previous) void send({ ...previous, requestId: crypto.randomUUID() }); }}>Iniciar nova consulta</button></>}
      </div>}
    </div>
    <form className={styles.composer} onSubmit={submit}>
      <StudyVoiceControls voice={voice} />
      {!available && <p className={styles.unavailable} role="status">{availabilityMessage || "A conversa está indisponível agora. O texto bíblico continua disponível."}</p>}
      <div className={styles.inputRow}>
        <label className={styles.srOnly} htmlFor={`${uid}-question`}>Sua pergunta sobre {passage.reference}</label>
        <textarea id={`${uid}-question`} ref={input} value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} maxLength={800} placeholder={turns.length ? "Continue a conversa…" : "Escreva sua pergunta…"} aria-describedby={`${uid}-privacy`} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(question); } }} />
        <button type="submit" aria-label="Enviar pergunta" disabled={!available || loading || question.trim().length < 3 || cooldown > 0}><span aria-hidden="true">↑</span></button>
      </div>
      <p id={`${uid}-privacy`} className={styles.privacy}>Conversa temporária · até {HISTORY_LIMIT} trocas enviadas à IA. Evite dados pessoais.</p>
    </form>
  </div>;
}
