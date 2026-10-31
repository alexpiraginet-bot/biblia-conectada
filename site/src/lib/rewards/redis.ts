import type { JourneyConfig } from "./config";
import { isRecord, JourneyFault, JOURNEY_UNAVAILABLE } from "./input";

export type JourneyRedis = (command: (string | number)[]) => Promise<unknown>;
export function journeyRedis(config: JourneyConfig, fetcher: typeof fetch = fetch): JourneyRedis {
  return async (command) => {
    try {
      const response = await fetcher(config.redisUrl, {
        method: "POST", headers: { authorization: `Bearer ${config.redisToken}`, "content-type": "application/json" },
        body: JSON.stringify(command), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) throw new Error("journey store");
      const body: unknown = await response.json();
      if (!isRecord(body) || body.error || !("result" in body)) throw new Error("journey store");
      return body.result;
    } catch { throw new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE); }
  };
}
