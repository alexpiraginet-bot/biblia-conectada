"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { JOURNEY_BONUS_DAYS, JOURNEY_BONUS_POINTS, JOURNEY_DAILY_POINTS, JOURNEY_REQUIRED_AREAS, JOURNEY_TARGET_ACTIVE_DAYS, JOURNEY_TARGET_POINTS, JOURNEY_TASK_SECONDS, JOURNEY_TTL_SECONDS } from "@/lib/rewards/rules";
import type { JourneyResponse, JourneyTask } from "@/lib/rewards/types";
import { clearJourney, confirmJourney, getJourneyState, getServerJourneyState, isJourneySnapshot, setJourneyPreference, subscribeJourney } from "./storage";
import styles from "./journey.module.css";

const number = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const percent = (n: number, total: number) => Math.min(100, Math.max(0, Math.floor(n / total * 100)));
const TASKS: { id: JourneyTask; icon: IconName; title: string; detail: string; href: string; link: string }[] = [
  { id: "reading", icon: "book", title: "Dê tempo à Palavra", detail: "Leia um trecho com os versículos visíveis na tela.", href: "/ler", link: "Escolher uma leitura" },
  { id: "liturgy", icon: "calendar", title: "Encontre a leitura de hoje", detail: "Acompanhe as leituras da liturgia de hoje. Esse tempo também vale para a leitura.", href: "/liturgia", link: "Abrir a liturgia" },
  { id: "explore", icon: "explore", title: "Siga uma nova conexão", detail: "Visite áreas diferentes: céu, constelação, mapa, cronologia, linha do tempo ou interlinear.", href: "/arcos", link: "Explorar o céu" },
];

function useCountedPoints(value: number) {
  const [shown, setShown] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const elapsed = reduce ? 1 : Math.min(1, (now - started) / 650);
      setShown(Math.round(from + (value - from) * (1 - (1 - elapsed) ** 3)));
      if (elapsed < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

function GiftMark() {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={styles.giftMark}><path d="M12 29h40v24H12zM8 20h48v9H8zM32 20v33M32 20c-16 0-19-8-13-11 6-3 13 11 13 11Zm0 0c16 0 19-8 13-11-6-3-13 11-13 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M6 6v6m-3-3h6m45 4v6m-3-3h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

export function JourneyDashboard({ children }: { children?: ReactNode }) {
  const state = useSyncExternalStore(subscribeJourney, getJourneyState, getServerJourneyState);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const snapshot = state.snapshot;
  const points = snapshot?.points ?? 0;
  const days = snapshot?.activeDays ?? 0;
  const targetPoints = snapshot?.targetPoints ?? JOURNEY_TARGET_POINTS;
  const targetDays = snapshot?.targetActiveDays ?? JOURNEY_TARGET_ACTIVE_DAYS;
  const pointsProgress = percent(points, targetPoints);
  const daysProgress = percent(days, targetDays);
  const countedPoints = useCountedPoints(points);
  const cached = state.optedIn && state.status !== "ready" && !!snapshot;
  const dayLabel = snapshot ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${snapshot.today}T12:00:00Z`)) : "Hoje";
  const completed = snapshot ? Object.values(snapshot.tasks).filter((task) => task.complete).length : 0;

  async function start() {
    if (starting || deleting) return;
    setStarting(true);
    setError("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      // Do not promise automatic tracking where the preference cannot survive navigation.
      const check = "bc:rewards:storage-check";
      localStorage.setItem(check, "yes");
      localStorage.removeItem(check);
      if (!navigator.onLine) throw new Error("offline");
      const response = await fetch("/api/jornada", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "start" }), signal: controller.signal });
      const data = await response.json() as JourneyResponse;
      if (!response.ok || !data.ok || !data.started || !data.snapshot || !isJourneySnapshot(data.snapshot)) {
        setError(data.code === "limit" ? "Aguarde um instante antes de tentar novamente. Sua jornada ainda não foi iniciada." : "O acompanhamento está temporariamente indisponível. Você pode continuar lendo e tentar novamente depois.");
        return;
      }
      confirmJourney(data.snapshot);
      setJourneyPreference(true);
    } catch (cause) {
      const storageBlocked = cause instanceof DOMException && ["SecurityError", "QuotaExceededError"].includes(cause.name);
      setError(storageBlocked ? "Este navegador não permitiu salvar o progresso. Libere o armazenamento do site para iniciar sua jornada." : "Não foi possível conectar agora. Confira sua conexão e tente novamente.");
    } finally { clearTimeout(timeout); setStarting(false); }
  }

  async function erase() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    const wasPaused = state.paused;
    // Stop and abort an in-flight pulse before deleting the server identity.
    setJourneyPreference(false, true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch("/api/jornada", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "reset" }), signal: controller.signal });
      const data = await response.json() as JourneyResponse;
      if (!response.ok || !data.ok || data.started) throw new Error("Reset failed");
      clearJourney();
      setConfirmDelete(false);
      requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-journey-start]")?.focus());
    } catch {
      setJourneyPreference(true, wasPaused);
      setDeleteError("Não foi possível confirmar a exclusão. Seu progresso continua aqui; tente novamente quando houver conexão.");
    } finally { clearTimeout(timeout); setDeleting(false); }
  }

  return <div className={styles.dashboard} data-journey-dashboard>
    <header className={styles.intro}>
      <p className={styles.eyebrow}><span aria-hidden="true">✦</span> Minha jornada</p>
      <h1>Um pouco por dia.<br /><em>Um caminho inteiro.</em></h1>
      <p className={styles.lede}>Leia com calma. Descubra conexões. Veja seu caminho crescer, sem pressa e sem perder o que já conquistou.</p>
      <p><a href="#leitura">Minha leitura da Bíblia</a> · <a href="#pontos">Constância e pontos</a></p>
    </header>
    {children}
    <section id="pontos" className={styles.intro} aria-labelledby="journey-points-heading">
      <h2 id="journey-points-heading" className="bc-title">Constância e pontos.</h2>
      <p>O histórico acima acompanha suas marcações pessoais. Os pontos abaixo seguem as atividades e o tempo de leitura da Jornada.</p>
      {!deleting && (!state.optedIn || state.status === "expired") && <div className={styles.start}>
        <button type="button" className={styles.primaryButton} onClick={() => void start()} disabled={starting} data-journey-start>{starting ? <><span className={styles.spinner} aria-hidden="true" /> Iniciando…</> : <>{state.status === "expired" ? "Iniciar uma nova jornada" : "Começar minha jornada"}<span aria-hidden="true">↗</span></>}</button>
        <p>Sem cadastro. O progresso fica ligado a este navegador. <a href="#como-a-jornada-funciona">Entenda como funciona.</a></p>
      </div>}
      {error && <p className={styles.notice} role="status">{error}</p>}
      {deleting && <p className={styles.notice} role="status">Apagando sua jornada…</p>}
    </section>

    <section className={styles.overview} aria-label="Seu progresso">
      <div className={styles.pointsPanel}>
        <div className={styles.pointsRing} style={{ "--journey-progress": `${pointsProgress}%` } as CSSProperties}>
          <div><span className={styles.pointsLabel}>{cached ? "Último saldo salvo" : "Seu caminho até aqui"}</span><strong aria-label={`${number(points)} pontos`} data-journey-points>{number(countedPoints)}</strong><span>pontos de leitura e descoberta</span></div>
        </div>
        <p className={styles.pointsCaption}>Pequenos encontros. Conquistas que ficam.</p>
      </div>
      <div className={styles.rhythmPanel}>
        <div className={styles.rhythmHeader}><span className={styles.eyebrow}>No seu ritmo</span><Icon name="calendar" /></div>
        <div className={styles.dayStats}><div><strong data-journey-active-days>{number(days)}</strong><span>dias ativos acumulados</span></div><div><strong>{number(snapshot?.streak ?? 0)}</strong><span>dias seguidos agora</span></div></div>
        <p>Uma pausa faz parte. Os pontos e os dias ativos que você já conquistou continuam com você.</p>
        {state.optedIn && state.status !== "expired" && <div className={styles.tracking}>
          <div className={styles.trackingStatus} data-journey-status={state.status}><span className={styles.statusDot} data-paused={state.paused || state.status !== "ready"} aria-hidden="true" /><span>{state.paused ? "Acompanhamento pausado" : state.status === "ready" ? "Sua jornada está sendo acompanhada" : state.status === "syncing" ? "Sincronizando sua jornada…" : "Aguardando sincronização"}</span></div>
          <button className={styles.pauseButton} type="button" onClick={() => setJourneyPreference(true, !state.paused)} aria-pressed={state.paused}>{state.paused ? "Retomar acompanhamento" : "Pausar acompanhamento"}</button>
          <button className={styles.pauseButton} type="button" onClick={() => window.dispatchEvent(new Event("bc:rewards-refresh"))}>Atualizar saldo</button>
        </div>}
        {state.message && <p className={styles.notice} role="status">{state.message}</p>}
      </div>
    </section>

    <section className={styles.daily} aria-labelledby="journey-today">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{dayLabel}</p><h2 id="journey-today">Seu próximo encontro.</h2></div><span className={styles.dailyScore}>{number(completed)} de {TASKS.length} concluídos</span></div>
      {!state.optedIn && <p className={styles.sectionNote}>Comece sua jornada para registrar estas atividades automaticamente enquanto usa o app.</p>}
      <div className={styles.tasks}>{TASKS.map((task) => {
        const progress = snapshot?.tasks[task.id];
        const target = progress?.targetSeconds ?? JOURNEY_TASK_SECONDS[task.id];
        const seconds = Math.min(target, progress?.seconds ?? 0);
        const done = progress?.complete ?? false;
        const requiredAreas = snapshot?.requiredAreas ?? JOURNEY_REQUIRED_AREAS;
        return <article key={task.id} className={styles.task} data-complete={done} data-journey-task={task.id}>
          <div className={styles.taskHeading}><span className={styles.taskIcon}><Icon name={done ? "check" : task.icon} /></span><span className={styles.taskPoints}>{done ? "Concluído" : `+${number(JOURNEY_DAILY_POINTS)} pontos`}</span></div>
          <h3>{task.title}</h3><p>{task.detail}</p>
          <div className={styles.taskProgress}><span>{number(Math.floor(seconds))} de {number(target)} segundos</span>{task.id === "explore" && <span>{Math.min(requiredAreas, snapshot?.exploredAreas ?? 0)} de {requiredAreas} áreas</span>}</div>
          <progress value={seconds} max={target} aria-label={`Tempo em ${task.title}`} />
          <Link href={task.href} prefetch={false}>{task.link}<span aria-hidden="true">↗</span></Link>
        </article>;
      })}</div>
      <div className={styles.bonus}><span className={styles.bonusMark} aria-hidden="true">✦</span><div><strong>Mais um motivo para voltar.</strong><p>A cada {number(JOURNEY_BONUS_DAYS)} dias ativos acumulados, você recebe {number(JOURNEY_BONUS_POINTS)} pontos extras. Não precisam ser seguidos.</p></div><span className={styles.bonusCountdown}>{number(snapshot?.nextBonusInActiveDays ?? JOURNEY_BONUS_DAYS)} dias ativos<br /><small>para o próximo bônus</small></span></div>
    </section>

    <section className={styles.goal} aria-labelledby="journey-goal">
      <div className={styles.gift}><div className={styles.giftOrbit}><GiftMark /></div><span>Um símbolo para este caminho</span></div>
      <div className={styles.goalContent}><p className={styles.eyebrow}>Meta futura · Bentô 3D Labs</p><h2 id="journey-goal">Um pequeno Jesus.<br /><em>Uma grande lembrança.</em></h2><p>Estamos planejando o Mini Jesus como uma lembrança desse hábito de se encontrar com a Palavra.</p>
        <div className={styles.goalProgress}><div><span>{number(Math.min(points, targetPoints))} / {number(targetPoints)} pontos</span><strong>{pointsProgress}%</strong></div><progress value={Math.min(points, targetPoints)} max={targetPoints} aria-label="Pontos para a meta" /><div><span>{number(Math.min(days, targetDays))} / {number(targetDays)} dias ativos</span><strong>{daysProgress}%</strong></div><progress value={Math.min(days, targetDays)} max={targetDays} aria-label="Dias ativos para a meta" /></div>
        {snapshot?.milestoneReached && state.status === "ready" && <p className={styles.milestone}><Icon name="check" />Você alcançou o marco de participação. A etapa de presentes ainda está sendo preparada.</p>}
        <p className={styles.planned}><strong>Presente em planejamento.</strong> Atingir a meta registra seu progresso; não garante entrega nem reserva de produto. Resgate, validação, estoque e condições serão informados antes do lançamento.</p>
      </div>
    </section>

    <section className={styles.rules} id="como-a-jornada-funciona" aria-labelledby="journey-rules"><p className={styles.eyebrow}>Tudo às claras</p><h2 id="journey-rules">O que conta é o caminho.</h2><p>A pontuação acompanha hábitos de leitura e descoberta. Ela não mede sua fé.</p>
      <details><summary>Como os pontos são registrados?</summary><div><p>Cada atividade concluída vale {number(JOURNEY_DAILY_POINTS)} pontos, uma vez por dia: {number(JOURNEY_TASK_SECONDS.reading)} segundos de leitura, {number(JOURNEY_TASK_SECONDS.liturgy)} segundos na liturgia de hoje e {number(JOURNEY_TASK_SECONDS.explore)} segundos de exploração em pelo menos {number(JOURNEY_REQUIRED_AREAS)} áreas diferentes. Em cada área, permaneça tempo suficiente para que sua visita seja registrada.</p><p>O tempo só conta com a página visível e em uso. Para leitura e liturgia, os versículos precisam estar na tela. Abrir o menu, mudar de aplicativo ou deixar o aparelho sem interação pausa esse acompanhamento. Atividades de liturgia também contam como leitura.</p><p>Um dia se torna ativo quando você conclui ao menos uma atividade. A contagem diária usa o horário de Brasília. Você não perde seu total se faltar um dia.</p></div></details>
      <details><summary>Onde fica salvo? E se eu trocar de aparelho?</summary><div><p>Depois que você escolhe começar, uma identificação anônima neste navegador permite salvar o progresso no servidor. Uma cópia do último saldo confirmado fica no aparelho para consulta. Não pedimos nome nem e-mail nesta etapa.</p><p>A jornada está ligada a este navegador. Limpar os cookies ou os dados do site pode fazer você perder o acesso ao progresso. Ainda não há recuperação entre aparelhos. O registro pode expirar depois de {number(Math.floor(JOURNEY_TTL_SECONDS / 86_400))} dias sem atividade.</p><p>Sem conexão ou durante uma pausa de sincronização, novos pontos não são confirmados. O app avisa quando isso acontece; seu saldo já confirmado permanece.</p></div></details>
      <details><summary>Posso pausar? Quando o presente estará disponível?</summary><div><p>Você pode pausar e retomar o acompanhamento pelo botão desta página. Pausar interrompe o registro de novas atividades e preserva o que já foi conquistado.</p><p>A meta exige {number(JOURNEY_TARGET_POINTS)} pontos e {number(JOURNEY_TARGET_ACTIVE_DAYS)} dias ativos. O Mini Jesus está em planejamento. Não há resgate ou entrega disponível agora; as condições serão apresentadas antes dessa etapa.</p></div></details>
      {(state.optedIn || confirmDelete) && <div className={styles.erase}>
        {!confirmDelete ? <button className={styles.pauseButton} type="button" onClick={() => setConfirmDelete(true)}>Apagar minha jornada</button> : <div role="group" aria-labelledby="journey-delete-heading" className={styles.eraseConfirm}>
          <h3 id="journey-delete-heading">Apagar este caminho?</h3><p>Isso apaga os pontos e dias ativos deste navegador e do servidor. A ação não pode ser desfeita.</p>
          <div><button type="button" className={styles.pauseButton} onClick={() => setConfirmDelete(false)} disabled={deleting}>Manter minha jornada</button><button type="button" className={styles.eraseButton} onClick={() => void erase()} disabled={deleting}>{deleting ? "Apagando…" : "Sim, apagar minha jornada"}</button></div>
          {deleteError && <p role="status">{deleteError}</p>}
        </div>}
      </div>}
    </section>
  </div>;
}
