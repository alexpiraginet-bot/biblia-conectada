"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { AssistantError } from "@/lib/assistant/types";
import type { CoracaoAvailability, CoracaoMode, CoracaoRequest, CoracaoResponse, CoracaoSuccess } from "@/lib/coracao/types";
import { StudyAnswer } from "@/components/assistant/StudyAnswer";
import { useStudyVoice } from "@/components/assistant/use-study-voice";
import { StudyVoiceControls } from "@/components/assistant/StudyVoiceControls";
import { Icon } from "@/components/icons";
import styles from "./HeartConversation.module.css";

type Turn = { request: CoracaoRequest; answer?: CoracaoSuccess };
const MODES = [{ id: "encontrar", label: "Encontrar uma passagem" }, { id: "jesus", label: "À luz de Jesus" }] as const;
const PROMPTS = {
  encontrar: [
    { label: "Estou precisando de paz", question: "Estou preocupado com o amanhã. Que passagens podem me ajudar a refletir e encontrar paz?" },
    { label: "Lembro só de um pedaço…", question: "Lembro de uma passagem sobre uma árvore plantada perto da água. Pode me ajudar a encontrá-la e entender o contexto?" },
    { label: "Quero recomeçar", question: "Quero recomeçar depois de um erro. Que passagens falam de perdão e de um novo caminho?" },
  ],
  jesus: [
    { label: "Responder sem ferir", question: "Recebi um comentário que me magoou. Como posso responder com firmeza e respeito à luz dos ensinamentos de Jesus?" },
    { label: "Perdoar e ter limites", question: "Como refletir sobre perdão e limites em uma relação, à luz dos ensinamentos de Jesus?" },
    { label: "Acolher alguém", question: "Uma pessoa próxima está passando por um momento difícil. Como posso acolhê-la com palavras e atitudes inspiradas nos ensinamentos de Jesus?" },
  ],
};

/** Retrying preserves the UUID; only completed turns become the bounded conversation context. */
export function buildHeartRequest(question: string, mode: CoracaoMode, turns: Turn[]): CoracaoRequest {
  const history = turns.filter((turn) => turn.answer && turn.request.mode === mode).slice(-2).map((turn) => {
    const answer = turn.answer!;
    const references = `\nPassagens consultadas: ${answer.citations.map((citation) => citation.reference).join("; ")}`.slice(0, 700);
    const text = [answer.title, ...answer.blocks.map((block) => block.text), answer.suggestedReply ?? ""].join("\n");
    return { question: turn.request.question, answer: text.slice(0, 2000 - references.length) + references };
  });
  const request: CoracaoRequest = { requestId: crypto.randomUUID(), question: question.trim(), mode, translation: "open-nbv" };
  if (history.length) request.history = history;
  while (request.history?.length && new TextEncoder().encode(JSON.stringify(request)).byteLength > 16384) request.history.shift();
  if (!request.history?.length) delete request.history;
  return request;
}

function PossibleReply({ text }: { text: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(text); setMessage("Copiado. Adapte com suas palavras antes de enviar."); }
    catch { setMessage("Não foi possível copiar. Você pode selecionar o texto abaixo."); }
  }
  return <section className={styles.reply} aria-label="Uma resposta possível">
    <div><h3>Uma resposta possível</h3><button type="button" onClick={() => void copy()}><Icon name="copy" /> Copiar</button></div>
    <p>{text}</p><small>Uma sugestão para você adaptar. Não é uma citação bíblica.</small>
    <span role="status">{message}</span>
  </section>;
}

export function HeartConversation() {
  const uid = useId();
  const voice = useStudyVoice();
  const setVoiceAvailable = voice.setAvailable;
  const [mode, setMode] = useState<CoracaoMode>("encontrar");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [available, setAvailable] = useState(true);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AssistantError | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const request = useRef<CoracaoRequest | null>(null);
  const log = useRef<HTMLDivElement>(null);
  const latest = useRef<HTMLElement>(null);
  const latestAnswer = useRef<HTMLDivElement>(null);
  const replyScroll = useRef({ requestId: "", follow: true, top: 0 });
  const input = useRef<HTMLTextAreaElement>(null);
  const disabled = loading || !available || cooldown > 0;
  const lastAnswer = turns.at(-1)?.answer;

  useEffect(() => {
    const availability = new AbortController();
    fetch("/api/coracao", { cache: "no-store", signal: availability.signal })
      .then(async (response) => response.ok ? await response.json() as CoracaoAvailability : null)
      .then((status) => { if (status && !availability.signal.aborted) { setAvailable(status.available === true); setAvailabilityMessage(status.message ?? ""); setVoiceAvailable(status.voice?.available === true); } }).catch(() => {});
    return () => { availability.abort(); controller.current?.abort("leave"); };
  }, [setVoiceAvailable]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    // Move only the log, then remember the resulting offset so this programmatic scroll is not reader intent.
    const box = log.current, turn = latest.current;
    if (box && turn) {
      box.scrollTop += turn.getBoundingClientRect().top - box.getBoundingClientRect().top - 16;
      replyScroll.current.top = box.scrollTop;
    }
  }, [turns.length]);

  useEffect(() => {
    const box = log.current, answer = latestAnswer.current, scroll = replyScroll.current;
    if (!lastAnswer || !box || !answer || !scroll.requestId) return;
    // Reveal the beginning, not the end, of the answer unless the reader went back up while waiting.
    if (scroll.follow) box.scrollTop += answer.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
    scroll.requestId = "";
    scroll.top = box.scrollTop;
  }, [lastAnswer]);

  async function send(body: CoracaoRequest) {
    if (pending.current || !available || cooldown > 0) return;
    pending.current = true;
    replyScroll.current = { requestId: body.requestId, follow: true, top: log.current?.scrollTop ?? 0 };
    if (voice.available) voice.prepare(body.requestId); else voice.stop();
    request.current = body;
    setTurns((current) => current.some((turn) => turn.request.requestId === body.requestId) ? current : [...current, { request: body }]);
    setMode(body.mode ?? "encontrar"); setQuestion(""); setError(null); setLoading(true);
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort("timeout"), 90000);
    try {
      const response = await fetch("/api/coracao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: abort.signal });
      const result = await response.json() as CoracaoResponse;
      if (abort.signal.aborted) return;
      if (!response.ok || !result.ok) {
        voice.stop();
        const failure: AssistantError = result.ok ? { ok: false, code: "provider", message: "Não foi possível concluir esta conversa agora." } : result;
        setError(failure); setCooldown(Math.max(0, Math.min(86400, Math.ceil(failure.retryAfterSeconds ?? 0))));
        if (failure.code === "unavailable") setAvailable(false);
        return;
      }
      setTurns((current) => current.map((turn) => turn.request.requestId === body.requestId ? { ...turn, answer: result } : turn));
      voice.receive(body.requestId, result.audio);
    } catch {
      voice.stop();
      if (abort.signal.reason === "leave") return;
      setError({ ok: false, code: "provider", message: abort.signal.reason === "cancel" ? "Você interrompeu a espera. A consulta pode já ter sido recebida; tente novamente para verificar a mesma consulta." : "A resposta não chegou. Verifique sua conexão e tente novamente a mesma consulta." });
    } finally {
      window.clearTimeout(timeout);
      pending.current = false;
      setLoading(false);
      if (controller.current === abort) controller.current = null;
    }
  }

  function ask(text: string, nextMode = mode) {
    if (text.trim().length < 3 || text.trim().length > 800 || disabled || pending.current) return;
    const previous = request.current;
    const same = previous && previous.question === text.trim() && previous.mode === nextMode;
    if (same && error?.code === "in_progress") return;
    void send(same && error?.code === "provider" ? previous : buildHeartRequest(text, nextMode, turns));
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); ask(question); }
  function restart() { voice.stop(); setTurns([]); setError(null); request.current = null; setQuestion(""); input.current?.focus({ preventScroll: true }); }

  return <section className={styles.room} aria-label="Conversa No seu coração">
    <div className={styles.roomHeader}>
      <fieldset className={styles.modes} disabled={loading}><legend className={styles.srOnly}>Como você quer conversar?</legend>
        {MODES.map((item) => <label key={item.id}><input type="radio" name={`${uid}-mode`} checked={mode === item.id} onChange={() => { voice.stop(); setMode(item.id); }} value={item.id} /><span>{item.label}</span></label>)}
      </fieldset>
      <div className={styles.roomMeta}><span><i aria-hidden="true" /> Busca bíblica com IA</span>{turns.length > 0 && <button type="button" disabled={loading} onClick={restart}>Nova conversa</button>}</div>
    </div>
    <div ref={log} className={styles.log} role="log" tabIndex={0} aria-label="Suas perguntas e as respostas" aria-live="polite" aria-relevant="additions text"
      onScroll={(event) => { const scroll = replyScroll.current, top = event.currentTarget.scrollTop; if (scroll.requestId && top < scroll.top - 1) scroll.follow = false; scroll.top = top; }}>
      {!turns.length && <div className={styles.welcome}>
        <div className={styles.welcomeMark} aria-hidden="true"><Icon name="heart" /></div>
        <h2>{mode === "encontrar" ? <>O que está<br /><em>no seu coração?</em></> : <>Como responder<br /><em>com amor e verdade?</em></>}</h2>
        <p>{mode === "encontrar" ? "Um sentimento, uma pergunta, um trecho que você quase lembra. Podemos começar por aí." : "Conte uma situação ou cole um comentário. Vamos refletir a partir dos ensinamentos de Jesus, com contexto e fontes."}</p>
        <div className={styles.prompts}>{PROMPTS[mode].map((prompt) => <button key={prompt.label} type="button" disabled={disabled} onClick={() => ask(prompt.question)}>{prompt.label}<span aria-hidden="true">↗</span></button>)}</div>
      </div>}
      {turns.map((turn, index) => <article key={turn.request.requestId} className={styles.turn} ref={index === turns.length - 1 ? latest : undefined}>
        <div className={styles.question}><span>Você · {turn.request.mode === "jesus" ? "À luz de Jesus" : "Encontrar uma passagem"}</span><p>{turn.request.question}</p></div>
        {turn.answer && <div className={styles.response} ref={index === turns.length - 1 ? latestAnswer : undefined}><StudyAnswer answer={{ ...turn.answer, mode: "entender" }} disabled={disabled} onQuestion={(text) => ask(text, turn.answer!.mode)} onListen={voice.replay} />
          {turn.answer.suggestedReply && <PossibleReply text={turn.answer.suggestedReply} />}
        </div>}
        {index === turns.length - 1 && loading && <div className={styles.typing} role="status"><span className={styles.dots} aria-hidden="true"><i /><i /><i /></span><p>Buscando caminhos no texto…<small>A resposta pode levar alguns instantes.</small></p></div>}
      </article>)}
      {error && <div className={styles.error} role="alert"><p>{error.message}</p>{cooldown > 0 && <p>Você pode tentar novamente em {cooldown}s.</p>}
        {error.code === "provider" && <button type="button" disabled={disabled} onClick={() => { if (request.current) void send(request.current); }}>Tentar novamente</button>}
        {error.code === "in_progress" && <><p>Essa consulta já foi recebida. Iniciar outra contará novamente no limite de uso.</p><button type="button" disabled={disabled} onClick={() => { if (request.current) void send({ ...request.current, requestId: crypto.randomUUID() }); }}>Iniciar nova consulta</button></>}
      </div>}
    </div>
    <form onSubmit={submit} className={styles.composer}>
      <StudyVoiceControls voice={voice} />
      {!available && <p className={styles.unavailable} role="status">{availabilityMessage || "A conversa está indisponível agora. Você pode continuar lendo e explorando a Bíblia."}</p>}
      <label className={styles.srOnly} htmlFor={`${uid}-question`}>{mode === "jesus" ? "Sua situação ou comentário para refletir à luz de Jesus" : "Seu sentimento, lembrança ou pergunta"}</label>
      <div className={styles.inputRow}><textarea id={`${uid}-question`} ref={input} rows={2} maxLength={800} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={turns.length ? "Continue de onde estamos…" : mode === "jesus" ? "Conte a situação ou cole um comentário…" : "Escreva do seu jeito…"} aria-describedby={`${uid}-privacy`} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(question); } }} />
        {loading ? <button type="button" onClick={() => { voice.stop(); controller.current?.abort("cancel"); }} aria-label="Interromper espera"><span aria-hidden="true">■</span></button> : <button type="submit" aria-label="Enviar mensagem" disabled={disabled || question.trim().length < 3}><Icon name="out" /></button>}
      </div>
      <details id={`${uid}-privacy`} className={styles.privacy}>
        <summary><span>Mensagens à Anthropic{voice.available && voice.enabled ? "; voz à OpenAI" : ""}. Sem histórico no aparelho.</span><strong>Privacidade e limites <span aria-hidden="true">⌄</span></strong></summary>
        <div><p>Ao enviar, sua mensagem e até duas trocas anteriores vão à IA da Anthropic. A conversa fica apenas na memória desta página, sem salvar histórico no aparelho. Evite nomes e dados pessoais.{voice.available && voice.enabled && " Com voz ligada, a resposta também vai à OpenAI para gerar áudio."}</p>
          <p>{mode === "jesus" ? "Reflexões sobre os ensinamentos de Jesus. Não fala em nome dele." : "A IA pode se enganar. As referências ajudam você a conferir o contexto."}</p>
        </div>
      </details>
    </form>
  </section>;
}
