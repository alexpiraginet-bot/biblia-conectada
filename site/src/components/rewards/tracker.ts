import type { JourneyAction, JourneyArea, JourneyPulse, JourneyResponse } from "@/lib/rewards/types";
import { canAdvanceJourney, journeyToday, visibleJourneyArea } from "./eligibility";
import { confirmJourney, getJourneyState, hydrateJourney, isJourneySnapshot, JOURNEY_PREFERENCE_EVENT, setJourneyStatus, syncJourneyPreferences } from "./storage";

const INTERVAL = 15_000;
const RECENT_ACTIVITY = 120_000;

/** Nonces stay only in this closure. There is no elapsed time, score or date in a request. */
export function startJourneyTracker(): () => void {
  hydrateJourney();
  let disposed = false;
  let busy = false;
  let pulse: JourneyPulse | undefined;
  let recentActivity = Date.now();
  let nextAttempt = 0;
  let wasActive = false;
  let interrupted = false;
  let pauseAfterRequest = false;
  let lastArea: JourneyArea = "reading";
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const send = async (action?: JourneyAction): Promise<JourneyResponse | null> => {
    controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 10_000);
    try {
      const response = await fetch("/api/jornada", {
        method: action ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
        headers: action ? { "Content-Type": "application/json" } : undefined,
        body: action ? JSON.stringify(action) : undefined, signal: controller.signal,
      });
      const data = await response.json() as JourneyResponse;
      if (disposed) return null;
      if (response.status === 429 || data.code === "limit") {
        nextAttempt = Date.now() + Math.max(INTERVAL, (data.retryAfterSeconds ?? 60) * 1000);
        setJourneyStatus("limited", "O acompanhamento está em pausa por alguns instantes. Vamos tentar novamente automaticamente.");
        return null;
      }
      if (data.code === "expired") {
        pulse = undefined;
        setJourneyStatus("expired", "Não encontramos a identificação desta jornada neste navegador. Inicie novamente para continuar.");
        nextAttempt = Number.POSITIVE_INFINITY;
        return null;
      }
      if (!response.ok || !data.ok || !data.available) {
        nextAttempt = Date.now() + 60_000;
        setJourneyStatus("unavailable", "Não foi possível sincronizar agora. Seu último progresso confirmado continua aqui.");
        return null;
      }
      if (!data.started) {
        pulse = undefined;
        setJourneyStatus("expired", "Não encontramos a identificação desta jornada neste navegador. Inicie novamente para continuar.");
        nextAttempt = Number.POSITIVE_INFINITY;
        return null;
      }
      if (!data.snapshot || !isJourneySnapshot(data.snapshot) || !data.pulse?.token) throw new Error("Invalid journey response");
      pulse = data.pulse;
      confirmJourney(data.snapshot);
      return data;
    } catch {
      // Resolve an uncertain request with a fresh nonce, then pause the old interval.
      pulse = undefined;
      interrupted = true;
      if (!disposed) setJourneyStatus(navigator.onLine ? "unavailable" : "offline", "Sem sincronização. Este tempo não está sendo contado; vamos retomar quando a conexão voltar.");
      return null;
    } finally { clearTimeout(timeout); }
  };

  const tick = async () => {
    if (disposed || busy || Date.now() < nextAttempt || !getJourneyState().optedIn) return;
    if (!navigator.onLine) { setJourneyStatus("offline", "Você está offline. Os pontos já confirmados estão salvos; o acompanhamento retoma quando a conexão voltar."); return; }
    busy = true;
    try {
      if (!pulse) { await send(); return; }
      const state = getJourneyState();
      if (state.snapshot?.today !== journeyToday() && document.visibilityState === "visible") { await send(); return; }
      const area = visibleJourneyArea();
      const active = !interrupted && !state.paused && document.visibilityState === "visible" && document.hasFocus()
        && Date.now() - recentActivity <= RECENT_ACTIVITY && area !== null && !!state.snapshot && canAdvanceJourney(state.snapshot, area);
      if (!active && !wasActive && !interrupted) return;
      lastArea = area ?? lastArea;
      const result = await send({ op: "pulse", token: pulse.token, area: lastArea, active });
      if (result) { wasActive = active; if (!active) interrupted = false; }
      // On a failed request the same nonce is kept: a retry cannot award the interval twice.
    } finally {
      busy = false;
      if (pauseAfterRequest && !disposed) { pauseAfterRequest = false; void tick(); }
    }
  };
  const schedule = () => {
    timer = setTimeout(() => { void tick().finally(() => { if (!disposed) schedule(); }); }, INTERVAL);
  };
  const activity = () => { recentActivity = Date.now(); };
  const interrupt = () => { interrupted = true; if (busy) pauseAfterRequest = true; else void tick(); };
  const visibility = () => { if (document.visibilityState !== "visible") interrupt(); else activity(); };
  const blur = () => { interrupt(); };
  const preference = () => {
    syncJourneyPreferences();
    recentActivity = Date.now();
    nextAttempt = 0;
    if (getJourneyState().paused) interrupt(); else void tick();
  };
  const storage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== "bc:rewards:opt-in" && event.key !== "bc:rewards:paused") return;
    syncJourneyPreferences();
    // Another tab's snapshot is not human activity and must not reset a rate-limit wait.
    if (getJourneyState().paused) interrupt();
  };
  const online = () => { nextAttempt = 0; pulse = undefined; void tick(); };
  const offline = () => { interrupted = true; setJourneyStatus("offline", "Você está offline. O tempo de leitura volta a contar depois da reconexão."); };
  const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
  // Opening a menu or leaving the actual text between pulses invalidates that interval.
  const observation = setInterval(() => { if (wasActive && (visibleJourneyArea() !== lastArea || Date.now() - recentActivity > RECENT_ACTIVITY)) interrupt(); }, 1000);
  for (const name of events) window.addEventListener(name, activity, { passive: true, capture: true });
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", blur);
  window.addEventListener("focus", activity);
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  window.addEventListener(JOURNEY_PREFERENCE_EVENT, preference);
  window.addEventListener("storage", storage);
  window.addEventListener("bc:rewards-refresh", online);
  setJourneyStatus("syncing");
  void tick();
  schedule();
  return () => {
    disposed = true;
    controller?.abort();
    clearTimeout(timer);
    clearInterval(observation);
    for (const name of events) window.removeEventListener(name, activity, true);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", blur);
    window.removeEventListener("focus", activity);
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
    window.removeEventListener(JOURNEY_PREFERENCE_EVENT, preference);
    window.removeEventListener("storage", storage);
    window.removeEventListener("bc:rewards-refresh", online);
  };
}
