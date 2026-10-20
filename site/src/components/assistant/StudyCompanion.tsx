"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Icon, type IconName } from "@/components/icons";
import type { AssistantMode as Mode, AssistantStyle as ExplanationStyle, AssistantCitation as Citation, AssistantScene as Scene, AssistantSuccess as Answer, AssistantError as ApiError, AssistantRequest as Request } from "@/lib/assistant/types";
import { speakStudyText, speechSnapshot, speechServerSnapshot, speechSupport, stopStudySpeech, subscribeSpeech } from "./study-speech";
import styles from "./StudyCompanion.module.css";

export type StudyMoment = {
  id: string;
  title: string;
  place?: string;
  image?: string;
  imageAlt?: string;
  reference: string;
  href: string;
  book: string;
  chapter: number;
  verse: number;
  verses: { number: number; text: string }[];
};

const MODES: { id: Mode; label: string; description: string; icon: IconName; question: string }[] = [
  { id: "entender", label: "Entenda a passagem", description: "Contexto e palavras, com clareza.", icon: "book", question: "O que esta passagem nos ajuda a compreender? Explique o contexto e as palavras principais." },
  { id: "explorar", label: "Explore comigo", description: "Siga perguntas e novas conexões.", icon: "explore", question: "Que conexões ajudam a ler esta passagem? Faça uma pergunta para eu refletir sobre o texto." },
  { id: "narrar", label: "Conte a história", description: "Acompanhe a leitura em cenas.", icon: "time", question: "Conte este episódio em cenas curtas, com linguagem acolhedora e referências ao texto bíblico." },
];

const STYLES: { id: ExplanationStyle; label: string; description: string }[] = [
  { id: "simples", label: "Bem simples", description: "Palavras fáceis, também para crianças." },
  { id: "contexto", label: "Contexto bíblico", description: "O sentido da passagem e suas conexões." },
  { id: "cotidiano", label: "No dia a dia", description: "Reflexões para a vida de hoje." },
];

const noSupport = () => false;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const subscribeMotion = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};

function Listen({ text, label = "Ouvir texto" }: { text: string; label?: string }) {
  const owner = useId();
  const supported = useSyncExternalStore(subscribeSpeech, speechSupport, noSupport);
  const speech = useSyncExternalStore(subscribeSpeech, speechSnapshot, speechServerSnapshot);
  const speaking = speech.owner === owner;
  const failed = speech.failedOwner === owner;

  useEffect(() => () => stopStudySpeech(owner), [owner]);

  function toggle() {
    if (speaking) stopStudySpeech(owner);
    else speakStudyText(owner, text);
  }

  return <div className={styles.listen}>
    <button type="button" onClick={toggle} aria-pressed={speaking} disabled={!supported} aria-describedby={`${owner}-voice-status`}><Icon name={speaking ? "close" : "text"} />{speaking ? "Parar leitura" : label}</button>
    <span id={`${owner}-voice-status`} role="status">{!supported ? "Este navegador não oferece leitura em voz alta." : failed ? "A voz do aparelho não está disponível agora. O texto continua abaixo." : "Voz do aparelho · português"}</span>
  </div>;
}

function CitationLinks({ ids, citations }: { ids: string[]; citations: Citation[] }) {
  const linked = ids.map((id) => citations.find((citation) => citation.id === id)).filter((item): item is Citation => !!item);
  return <span className={styles.citationLinks}>{linked.map((citation) => <Link key={citation.id} href={citation.href} prefetch={false}>{citation.reference}<Icon name="out" /></Link>)}</span>;
}

function StoryScenes({ scenes, citations }: { scenes: Scene[]; citations: Citation[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, reducedMotion, noSupport);
  const title = useRef<HTMLHeadingElement>(null);
  const scene = scenes[active];
  if (!scene) return null;

  function select(index: number) {
    setActive(index);
    requestAnimationFrame(() => title.current?.focus({ preventScroll: true }));
  }

  return <section className={styles.story} aria-label="A história em cenas ilustradas">
    <div className={styles.storyTop}><span>Cena {active + 1} de {scenes.length}</span>
      <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused || reduced} disabled={reduced}>{reduced ? "Movimento reduzido" : paused ? "Retomar movimento" : "Pausar movimento"}</button>
    </div>
    <figure className={styles.storyArt} data-moving={!paused && !reduced}>
      <Image key={scene.id} src={scene.art.src} alt={scene.art.alt} fill sizes="(max-width: 50rem) 100vw, 760px" unoptimized />
      <figcaption>{scene.art.caption}</figcaption>
    </figure>
    <div className={styles.sceneBody}>
      <h3 ref={title} tabIndex={-1}>{scene.title}</h3>
      <p>{scene.text}</p>
      <CitationLinks ids={scene.citationIds} citations={citations} />
      <Listen key={scene.id} text={`${scene.title}. ${scene.text}`} />
      <div className={styles.sceneFoot}><Link href={scene.action.href} prefetch={false}>{scene.action.label}<Icon name="out" /></Link>
        <div className={styles.scenePager}>
          <button type="button" aria-label="Cena anterior" disabled={active === 0} onClick={() => select(active - 1)}><Icon name="chev-l" /></button>
          {scenes.map((item, index) => <button key={item.id} type="button" aria-label={`Cena ${index + 1}: ${item.title}`} aria-current={index === active ? "step" : undefined} onClick={() => select(index)}>{String(index + 1).padStart(2, "0")}</button>)}
          <button type="button" aria-label="Próxima cena" disabled={active === scenes.length - 1} onClick={() => select(active + 1)}><Icon name="chev-r" /></button>
        </div>
      </div>
    </div>
    <p className={styles.sceneNote}>Cenas ilustradas do acervo, com texto e movimento suave. A leitura em voz alta usa a voz do aparelho.</p>
  </section>;
}

export function StudyCompanion({ moments, enabled, initialPassage, referenceError = false }: {
  moments: StudyMoment[];
  enabled: boolean;
  initialPassage?: StudyMoment;
  referenceError?: boolean;
}) {
  const uid = useId();
  const passages = initialPassage ? [initialPassage, ...moments] : moments;
  const [mode, setMode] = useState<Mode>("entender");
  const [style, setStyle] = useState<ExplanationStyle>("contexto");
  const [momentId, setMomentId] = useState(initialPassage?.id ?? moments.find((item) => item.id === "cana")?.id ?? moments[0]?.id ?? "");
  const [question, setQuestion] = useState(MODES[0].question);
  const [available, setAvailable] = useState(enabled);
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [answerId, setAnswerId] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const pending = useRef(false);
  const request = useRef<Request | null>(null);
  const controller = useRef<AbortController | null>(null);
  const answerHeading = useRef<HTMLHeadingElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const moment = passages.find((item) => item.id === momentId) ?? passages[0];
  const selectedMode = MODES.find((item) => item.id === mode)!;

  useEffect(() => {
    const availability = new AbortController();
    fetch("/api/assistente", { cache: "no-store", signal: availability.signal })
      .then(async (response) => response.ok ? await response.json() as { available: boolean; message: string } : null)
      .then((status) => {
        if (!status || availability.signal.aborted) return;
        setAvailable(status.available === true);
        setAvailabilityMessage(typeof status.message === "string" ? status.message : "");
      }).catch(() => {});
    return () => {
      availability.abort();
      const active = controller.current;
      controller.current = null;
      active?.abort();
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  function chooseMode(next: Mode) {
    setMode(next);
    setQuestion(MODES.find((item) => item.id === next)!.question);
    setAnswer(null);
    setError(null);
    setRetryable(false);
  }

  async function send(body: Request) {
    if (pending.current) return;
    pending.current = true;
    request.current = body;
    setLoading(true);
    setAnswer(null);
    setError(null);
    setRetryable(false);
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 90000);
    try {
      const response = await fetch("/api/assistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: abort.signal });
      const result = await response.json() as Answer | ApiError;
      if (!response.ok || !result.ok) {
        const failure: ApiError = result.ok ? { ok: false, code: "provider", message: "Não foi possível concluir esta leitura agora." } : result;
        setError(failure);
        setRetryable(failure.code === "provider");
        setCooldown(Math.max(0, Math.min(86400, Math.ceil(failure.retryAfterSeconds ?? 0))));
        if (failure.code === "unavailable") setAvailable(false);
        return;
      }
      setAnswerId(body.requestId);
      setAnswer(result);
      requestAnimationFrame(() => {
        answerHeading.current?.focus({ preventScroll: true });
        answerHeading.current?.scrollIntoView({ behavior: reducedMotion() ? "instant" : "smooth", block: "start" });
      });
    } catch {
      // Activity hides routes and aborts their effects while keeping this state.
      // Preserve the request id on return: the server may already have reserved it.
      setError({ ok: false, code: "provider", message: "A conexão foi interrompida antes da resposta. Tente novamente para verificar esta mesma consulta, sem repeti-la." });
      setRetryable(true);
    } finally {
      window.clearTimeout(timeout);
      pending.current = false;
      setLoading(false);
      if (controller.current === abort) controller.current = null;
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available || !moment || pending.current || error?.code === "in_progress" || question.trim().length < 3 || question.length > 800 || cooldown > 0) return;
    const previous = request.current;
    // The main submit control is also a retry when the failed question is unchanged.
    const sameRetry = retryable && previous && previous.mode === mode && (previous.style ?? "contexto") === style && previous.question === question.trim() &&
      previous.passage.book === moment.book && previous.passage.chapter === moment.chapter && previous.passage.verse === moment.verse;
    void send(sameRetry ? previous : { requestId: crypto.randomUUID(), mode, style, question: question.trim(), passage: { book: moment.book, chapter: moment.chapter, verse: moment.verse } });
  }

  if (!moment) return null;
  return <div className={styles.companion}>
    <form action="/assistente" method="get" className={styles.referencePicker}>
      <div><label htmlFor={`${uid}-reference`}>Outro versículo</label><p id={`${uid}-reference-help`}>Digite a referência, como Jeremias 17:8. Os episódios abaixo também servem de atalho.</p></div>
      <div className={styles.referenceInput}><input id={`${uid}-reference`} name="ref" type="text" defaultValue={initialPassage?.reference ?? ""} placeholder="Jeremias 17:8" maxLength={120} required disabled={loading} aria-describedby={`${uid}-reference-help`} /><button type="submit" disabled={loading}>Escolher<Icon name="out" /></button></div>
    </form>
    {referenceError && <p className={styles.referenceError} role="alert">Não encontramos esse versículo. Informe livro, capítulo e versículo válidos, como Jeremias 17:8, ou escolha um dos atalhos de leitura abaixo.</p>}
    <div className={styles.modePicker} role="group" aria-label="Como você quer estudar?">{MODES.map((item, index) => (
      <button key={item.id} type="button" aria-pressed={mode === item.id} disabled={loading} onClick={() => chooseMode(item.id)}>
        <span className={styles.modeNumber}>0{index + 1}</span><Icon name={item.icon} />
        <span><strong>{item.label}</strong><small>{item.description}</small></span><Icon name="chev-r" />
      </button>
    ))}</div>
    <div className={styles.desk}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.formHeading}><Icon name={selectedMode.icon} /><h2>{selectedMode.label}</h2></div>
        <label htmlFor={`${uid}-moment`}>Passagem para estudar</label>
        <select id={`${uid}-moment`} value={momentId} disabled={loading} onChange={(event) => { setMomentId(event.target.value); setAnswer(null); setError(null); setRetryable(false); }}>
          {initialPassage && <optgroup label="Seu versículo"><option value={initialPassage.id}>{initialPassage.reference}</option></optgroup>}
          <optgroup label="Atalhos de leitura">{moments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.reference}</option>)}</optgroup>
        </select>
        <fieldset className={styles.stylePicker} disabled={loading}><legend>Jeito de explicar</legend><div>{STYLES.map((item) => <label key={item.id}>
          <input type="radio" name={`${uid}-style`} value={item.id} checked={style === item.id} onChange={() => { setStyle(item.id); setAnswer(null); setError(null); setRetryable(false); }} />
          <span><strong>{item.label}</strong><small>{item.description}</small></span>
        </label>)}</div></fieldset>
        <div className={styles.questionLabel}><label htmlFor={`${uid}-question`}>O que você gostaria de descobrir?</label><span id={`${uid}-count`}>{question.length}/800</span></div>
        <textarea id={`${uid}-question`} ref={textarea} value={question} onChange={(event) => { setQuestion(event.target.value); setError(null); setRetryable(false); }} minLength={3} maxLength={800} rows={5} disabled={loading} aria-describedby={`${uid}-count ${uid}-privacy`} required />
        <p id={`${uid}-privacy`} className={styles.privacy}>Sua pergunta será enviada à IA para responder sobre esta passagem. Cada envio é uma consulta independente, sem histórico de conversa. Evite incluir informações pessoais.</p>
        <div className={styles.availability} id={`${uid}-availability`} data-available={available} role="status"><i aria-hidden="true" /><p>{available ? "Pronto para explorar com você." : availabilityMessage || "A conversa com IA ainda não está disponível. Você já pode ler as passagens e explorar suas fontes."}</p></div>
        <button className={styles.submit} type="submit" disabled={!available || loading || question.trim().length < 3 || cooldown > 0 || error?.code === "in_progress"} aria-describedby={`${uid}-availability`}>{loading ? "Preparando sua leitura…" : error?.code === "in_progress" ? "Consulta já enviada" : "Enviar pergunta"}<Icon name="out" /></button>
        {error && <div className={styles.error} role="alert"><p>{error.message}</p>
          {cooldown > 0 && <span>Tente novamente em {cooldown}s.</span>}
          {retryable && <button type="button" disabled={loading || cooldown > 0} onClick={() => { if (request.current) void send(request.current); }}>Tentar novamente<Icon name="out" /></button>}
          {error.code === "in_progress" && <><p>A resposta anterior não pode ser recuperada. Você pode mudar sua pergunta ou iniciar uma nova consulta, que contará novamente no limite de uso.</p><button type="button" disabled={!available || loading || cooldown > 0} onClick={() => void send({ requestId: crypto.randomUUID(), mode, style, question: question.trim(), passage: { book: moment.book, chapter: moment.chapter, verse: moment.verse } })}>Nova consulta<Icon name="out" /></button></>}
        </div>}
        <p className={styles.formFoot}>A pergunta abre o caminho. O texto bíblico continua sendo a referência.</p>
      </form>
      <aside className={styles.passage} aria-label="Passagem escolhida">
        {moment.image && moment.imageAlt ? <figure className={styles.cover}><Image key={moment.id} src={moment.image} alt={moment.imageAlt} fill sizes="(max-width: 50rem) 100vw, 600px" loading="eager" unoptimized /><figcaption>{moment.place} · Recriação artística por IA</figcaption></figure>
          : <div className={styles.verseHeading}><Icon name="book" /><span>Uma passagem. Tempo para compreender.</span><h2>{moment.reference}</h2><p>Leia com calma e leve suas perguntas ao texto.</p></div>}
        <div className={styles.passageBody}>
          <div className={styles.reference}><span>Leia primeiro</span><Link href={moment.href} prefetch={false}>{moment.reference}<Icon name="out" /></Link></div>
          <blockquote>{moment.verses.map((verse) => <p key={verse.number}><sup>{verse.number}</sup>{verse.text}</p>)}</blockquote>
          <div className={styles.passageFoot}><span>Bíblia Livre · texto original</span><Link href={`/explorar/${moment.book}/${moment.chapter}`} prefetch={false}>Ver conexões<Icon name="explore" /></Link></div>
          <Listen key={moment.id} text={`${moment.reference}. ${moment.verses.map((verse) => verse.text).join(" ")}`} />
        </div>
      </aside>
    </div>
    {loading && <section className={styles.loading} aria-busy="true" aria-live="polite"><span>Consultando a passagem e suas conexões…</span><i /><i /><i /></section>}
    {answer && <section className={styles.answer} aria-labelledby={`${uid}-answer-title`}>
      <div className={styles.answerHeading}><span>Uma leitura para acompanhar você</span><h2 id={`${uid}-answer-title`} ref={answerHeading} tabIndex={-1}>{answer.title}</h2><p>Resposta de IA · confira as passagens indicadas.</p><Listen key={`answer-${answerId}`} label="Ouvir resposta" text={[answer.title, ...(answer.scenes ?? []).map((scene) => `${scene.title}. ${scene.text}`), ...answer.blocks.map((block) => block.text)].join("\n\n")} /></div>
      {answer.scenes?.length ? <StoryScenes key={answerId} scenes={answer.scenes} citations={answer.citations} /> : null}
      <div className={styles.answerColumns}>
        <div className={styles.blocks}>{answer.blocks.map((block, index) => <div key={index}><p>{block.text}</p><CitationLinks ids={block.citationIds} citations={answer.citations} /></div>)}
          {answer.suggestions.length > 0 && <div className={styles.suggestions}><h3>Por onde seguimos?</h3>{answer.suggestions.map((suggestion, index) => <button key={index} type="button" onClick={() => { setQuestion(suggestion.slice(0, 800)); setError(null); setRetryable(false); textarea.current?.focus(); }}><span>{suggestion}</span><Icon name="out" /></button>)}</div>}
          <p className={styles.notice}>{answer.notice}</p>
        </div>
        <aside className={styles.sources} aria-label="Passagens usadas na resposta"><h3>O texto, por perto.</h3><p>Referências para conferir e continuar a leitura.</p>{answer.citations.map((citation) => <details key={citation.id}><summary>{citation.reference}<Icon name="book" /></summary><blockquote>{citation.text}</blockquote><Link href={citation.href} prefetch={false}>Ler no contexto<Icon name="out" /></Link></details>)}</aside>
      </div>
    </section>}
  </div>;
}
