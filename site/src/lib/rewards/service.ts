import "server-only";
import { journeyConfig, type JourneyConfig } from "./config";
import { journeyProfileId, journeyVisitor, newJourneyCookie, newJourneyNonce } from "./identity";
import { JourneyFault, JOURNEY_UNAVAILABLE, readJourneyAction, requireJourneyOrigin } from "./input";
import { JOURNEY_LUA } from "./ledger";
import { journeyRedis, type JourneyRedis } from "./redis";
import { JOURNEY_INTERVAL_MS, journeyDay } from "./rules";
import { journeySnapshot, parseJourneyState, previousJourneyDay } from "./snapshot";
import type { JourneyAction, JourneyResponse } from "./types";

export type JourneyHttpResult = { body: JourneyResponse; status: number; cookie?: { name: string; value: string } | { name: string; clear: true } };
type Dependencies = { config?: JourneyConfig | null; command?: JourneyRedis; now?: () => Date; newCookie?: () => string; newNonce?: () => string };

/** No client-supplied time, XP, completion, date or balance enters the ledger. */
export async function handleJourney(request: Request, cookie: string | undefined, dependencies: Dependencies = {}): Promise<JourneyHttpResult> {
  const config = dependencies.config === undefined ? journeyConfig() : dependencies.config;
  let started = false;
  try {
    if (!config) throw new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE);
    const command = dependencies.command ?? journeyRedis(config);
    const visitor = journeyVisitor(request, config);
    const now = (dependencies.now ?? (() => new Date()))();
    const date = journeyDay(now);
    let identity = journeyProfileId(cookie, config);
    started = !!identity;
    let operation: JourneyAction | { op: "status" };
    if (request.method === "GET") operation = { op: "status" };
    else if (request.method === "POST") {
      requireJourneyOrigin(request);
      operation = await readJourneyAction(request);
    } else throw new JourneyFault("invalid", 405, "Esta ação não está disponível.");

    if (!identity && operation.op === "status") {
      if (await command(["PING"]) !== "PONG") throw new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE);
      return { status: 200, body: { ok: true, available: true, started: false }, ...(cookie ? { cookie: { name: config.cookieName, clear: true as const } } : {}) };
    }
    let cookieValue = cookie;
    if (!identity && operation.op === "start") {
      cookieValue = (dependencies.newCookie ?? newJourneyCookie)();
      identity = journeyProfileId(cookieValue, config);
    }
    if (!identity) {
      if (operation.op === "reset") return { status: 200, body: { ok: true, available: true, started: false }, cookie: { name: config.cookieName, clear: true } };
      throw new JourneyFault("expired", 409, "Comece sua jornada para registrar o progresso deste navegador.");
    }
    const result = await command([
      "EVAL", JOURNEY_LUA, 5,
      `${config.prefix}profile:${identity}`, `${config.prefix}profiles`, `${config.prefix}eligible`,
      `${config.prefix}rate:${visitor}:${Math.floor(now.getTime() / 60_000)}`, `${config.prefix}starts:${visitor}:${date}`,
      operation.op, identity, now.getTime(), date, previousJourneyDay(date), (dependencies.newNonce ?? newJourneyNonce)(),
      operation.op === "pulse" ? operation.token : "", operation.op === "pulse" ? operation.area : "", operation.op === "pulse" && operation.active ? "1" : "0",
    ]);
    if (!Array.isArray(result)) throw new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE);
    if (result[0] === "limit" || result[0] === "start-limit") {
      throw new JourneyFault("limit", 429,
        result[0] === "start-limit" ? "Você já iniciou algumas jornadas hoje. Tente novamente amanhã." : "Aguarde um momento para continuar sua jornada.",
        result[0] === "start-limit" ? 86_400 : 60);
    }
    if (result[0] === "reset" || (result[0] === "expired" && operation.op === "status")) {
      return { status: 200, body: { ok: true, available: true, started: false }, cookie: { name: config.cookieName, clear: true } };
    }
    if (result[0] === "expired") throw new JourneyFault("expired", 409, "Esta jornada expirou ou foi apagada. Você pode começar uma nova.");
    if (result[0] !== "ok") throw new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE);
    const state = parseJourneyState(result[1]);
    return {
      status: 200,
      body: { ok: true, available: true, started: true, snapshot: journeySnapshot(state, now), pulse: { token: state.pulse.nonce, intervalMs: JOURNEY_INTERVAL_MS } },
      cookie: { name: config.cookieName, value: cookieValue! },
    };
  } catch (error) {
    const fault = error instanceof JourneyFault ? error : new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE);
    const body: JourneyResponse = {
      ok: false, available: fault.code !== "unavailable", started: fault.code === "expired" ? false : started,
      code: fault.code, message: fault.message, ...(fault.retryAfterSeconds ? { retryAfterSeconds: fault.retryAfterSeconds } : {}),
    };
    // Do not log request bodies, cookies, Redis failures, identifiers or credentials.
    return {
      status: fault.status, body,
      ...(fault.code === "expired" && config ? { cookie: { name: config.cookieName, clear: true as const } } : {}),
    };
  }
}
