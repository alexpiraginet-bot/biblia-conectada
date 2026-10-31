import { connection } from "next/server";
import { journeyConfig } from "@/lib/rewards/config";
import { isRecord } from "@/lib/rewards/input";
import { parseJourneyState } from "@/lib/rewards/snapshot";

// Temporary protected-preview diagnostic. Remove before merging this branch.
export const maxDuration = 15;
const headers = { "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" };
const script = `return {'ok', cjson.encode({version=1,points=0,activeDays=0,streak=0,longestStreak=0,lastActiveDate='',createdAt=1000,updatedAt=1000,day={date='2026-10-31',readingMs=0,liturgyMs=0,exploreMs=0,areas={},completed={},points=0,active=false},pulse={at=0,nonce='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',area='',active=false}})}`;

function errorClass(value: unknown) {
  const text = typeof value === "string" ? value.toLowerCase() : "";
  if (/noperm|permission|not permitted|readonly|read.only/.test(text)) return "permission";
  if (/noauth|wrongpass|unauthorized|invalid token/.test(text)) return "authentication";
  if (/cjson/.test(text)) return "cjson-runtime";
  if (/unknown command|unsupported/.test(text)) return "unsupported-command";
  if (/quota|limit|capacity/.test(text)) return "quota";
  return "unclassified";
}

export async function GET() {
  await connection();
  if (process.env.VERCEL_ENV !== "preview") return new Response(null, { status: 404, headers });
  const config = journeyConfig();
  if (!config || config.environment !== "preview") return Response.json({ configured: false }, { headers });
  async function probe(command: (string | number)[]) {
    try {
      const response = await fetch(config!.redisUrl, {
        method: "POST", headers: { authorization: `Bearer ${config!.redisToken}`, "content-type": "application/json" },
        body: JSON.stringify(command), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6000),
      });
      const body: unknown = await response.json();
      if (!response.ok || !isRecord(body) || body.error || !("result" in body)) {
        return { ok: false as const, httpStatus: response.status, error: errorClass(isRecord(body) ? body.error : null) };
      }
      return { ok: true as const, httpStatus: response.status, value: body.result };
    } catch { return { ok: false as const, httpStatus: null, error: "transport" }; }
  }
  const ping = await probe(["PING"]);
  const evalResult = await probe(["EVAL_RO", script, 0]);
  const value = evalResult.ok ? evalResult.value : null;
  const payload = Array.isArray(value) ? value[1] : null;
  let parserAccepted = false;
  let areas = "unavailable", completed = "unavailable";
  try {
    const decoded: unknown = typeof payload === "string" ? JSON.parse(payload) : null;
    if (isRecord(decoded) && isRecord(decoded.day)) {
      areas = Array.isArray(decoded.day.areas) ? "array" : typeof decoded.day.areas;
      completed = Array.isArray(decoded.day.completed) ? "array" : typeof decoded.day.completed;
    }
    parseJourneyState(payload);
    parserAccepted = true;
  } catch { /* Only sanitized enums leave this endpoint. */ }
  return Response.json({
    configured: true,
    ping: { ok: ping.ok && ping.value === "PONG", httpStatus: ping.httpStatus, ...(!ping.ok ? { error: ping.error } : {}) },
    evalReadOnly: { ok: evalResult.ok, httpStatus: evalResult.httpStatus, ...(!evalResult.ok ? { error: evalResult.error } : {}) },
    shape: { array: Array.isArray(value), tagOk: Array.isArray(value) && value[0] === "ok", stringPayload: typeof payload === "string", areas, completed, parserAccepted },
  }, { headers });
}
