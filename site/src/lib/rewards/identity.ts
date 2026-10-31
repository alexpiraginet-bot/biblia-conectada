import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import type { JourneyConfig } from "./config";
import { JourneyFault, JOURNEY_UNAVAILABLE } from "./input";

export const newJourneyCookie = () => randomBytes(32).toString("hex");
export const newJourneyNonce = () => randomBytes(16).toString("hex");

export function journeyProfileId(cookie: string | undefined, config: JourneyConfig): string | null {
  if (!cookie || !/^[a-f0-9]{64}$/.test(cookie)) return null;
  return createHmac("sha256", config.secret).update(`journey:profile:v1:${config.environment}:`).update(cookie).digest("hex");
}

/** Vercel overwrites x-forwarded-for. Never trust caller-supplied chains or an unverified host. */
export function journeyVisitor(request: Request, config: JourneyConfig): string {
  const address = request.headers.get("x-forwarded-for")?.trim() ?? "";
  if (!isIP(address)) throw new JourneyFault("unavailable", 503, JOURNEY_UNAVAILABLE);
  return createHmac("sha256", config.secret).update(`journey:rate:v1:${config.environment}:`).update(address).digest("hex");
}
