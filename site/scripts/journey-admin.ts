/** Read-only journey administration. Supply credentials only through the existing environment, never CLI arguments. */
import { journeyConfig } from "../src/lib/rewards/config";
import { journeyRedis } from "../src/lib/rewards/redis";
import { JOURNEY_TARGET_ACTIVE_DAYS, JOURNEY_TARGET_POINTS, JOURNEY_TTL_SECONDS } from "../src/lib/rewards/rules";
import { parseJourneyState } from "../src/lib/rewards/snapshot";

async function main() {
  const [operation, environment, ...rest] = process.argv.slice(2);
  if (!["summary", "eligible"].includes(operation) || !["production", "preview"].includes(environment)
    || rest.length > 1 || (rest[0] !== undefined && !/^\d{1,5}$/.test(rest[0]))) {
    throw new Error("Usage: npx tsx scripts/journey-admin.ts summary|eligible production|preview [offset]");
  }
  const config = journeyConfig({ ...process.env, VERCEL: "1", VERCEL_ENV: environment });
  if (!config) throw new Error("Existing KV URL/token and rate secret are required in the environment.");
  const command = journeyRedis(config);
  const now = Date.now();
  const cutoff = now - JOURNEY_TTL_SECONDS * 1000;
  if (operation === "summary") {
    const [activeProfiles, milestoneProfiles] = await Promise.all([
      command(["ZCOUNT", `${config.prefix}profiles`, cutoff, "+inf"]),
      command(["ZCOUNT", `${config.prefix}eligible`, cutoff, "+inf"]),
    ]);
    console.log(JSON.stringify({ environment, generatedAt: new Date(now).toISOString(), activeProfiles, milestoneProfiles,
      targetPoints: JOURNEY_TARGET_POINTS, targetActiveDays: JOURNEY_TARGET_ACTIVE_DAYS, rewardStatus: "planned",
      notice: "Profiles are anonymous. A milestone is not a prize entitlement; validate eligibility and stock before enabling redemption." }, null, 2));
    return;
  }
  const offset = Number(rest[0] ?? 0);
  const ids = await command(["ZRANGEBYSCORE", `${config.prefix}eligible`, cutoff, "+inf", "LIMIT", offset, 50]);
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id))) throw new Error("Invalid journey index.");
  const raw = ids.length ? await command(["MGET", ...ids.map((id) => `${config.prefix}profile:${id}`)]) : [];
  if (!Array.isArray(raw)) throw new Error("Invalid journey profiles.");
  const profiles = raw.flatMap((value, index) => {
    if (!value) return [];
    const state = parseJourneyState(value);
    if (state.points < JOURNEY_TARGET_POINTS || state.activeDays < JOURNEY_TARGET_ACTIVE_DAYS || state.updatedAt < cutoff) return [];
    return [{ profileId: ids[index], points: state.points, activeDays: state.activeDays,
      lastActiveDate: state.lastActiveDate, updatedAt: new Date(state.updatedAt).toISOString(), rewardStatus: "planned" }];
  });
  console.log(JSON.stringify({ environment, generatedAt: new Date(now).toISOString(), profiles,
    nextOffset: ids.length === 50 ? offset + 50 : null,
    notice: "Read-only snapshot. No names, addresses, identity cookies, browsing text or prize dispatch data are stored." }, null, 2));
}

main().catch((error) => {
  // All network failures are sanitized by journeyRedis; never print provider responses or env values.
  console.error(error instanceof Error ? error.message : "Journey administration failed.");
  process.exitCode = 1;
});
