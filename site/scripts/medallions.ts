// Medallion pipeline (see scripts/data/medallions.ts for the groups, the prompts and the rules).
//
//   NODE_USE_ENV_PROXY=1 npx tsx scripts/medallions.ts generate --masters <dir> <id>...
//       one OpenAI Images call per id (1024², PNG master written to <dir>, never to the repo); every call is logged in
//       scripts/data/medallions-review.json as "pending". The key is read from OPENAI_API_KEY and never written anywhere.
//   npx tsx scripts/medallions.ts review <id> <attempt> accept|reject "<reason>"
//       records the verdict after looking at the master (no faces, figures, hands, children, text, rays, dove, Bible,
//       weapons, eagle, fasces, religious emblems; reads at 96 px).
//   npx tsx scripts/medallions.ts encode --masters <dir>
//       accepted masters -> public/medalhoes/<id>-96.webp and <id>-192.webp, within the byte caps.
//   npx tsx scripts/medallions.ts manifest
//       writes src/data/medalhoes.json (groups, provenance, sha256, bookGroup from Theographic).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  CAPS, GROUPS, MANIFEST, MAX_ATTEMPTS, MAX_CALLS, MEDALLION_DIR, MODEL, REVIEW_LOG, SIZES, buildManifest, fileName,
  promptFor, readReviewLog, type ReviewEntry, type ReviewLog,
} from "./data/medallions";

const QUALITY = "medium";
const SIZE = "1024x1024";
/** WebP quality: start here and step down until the file fits its cap (q70 keeps 20 groups near 150 KB) */
const WEBP_Q = { start: 70, step: 4, floor: 40 };
/** Noite --ground #051219 (design/README.md §3) */
const GROUND = [0x05, 0x12, 0x19];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function positional(): string[] {
  const out: string[] = [];
  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i].startsWith("--")) i++;
    else out.push(process.argv[i]);
  }
  return out;
}

function saveLog(log: ReviewLog) {
  writeFileSync(REVIEW_LOG, JSON.stringify(log, null, 2) + "\n");
}

async function generateOne(id: string, attempt: number, masters: string, log: ReviewLog): Promise<void> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const prompt = promptFor(id);
  const master = `${id}-a${attempt}.png`;
  // reserve the call in the log before sending it, so the call cap also counts failures
  const entry: ReviewEntry = { id, attempt, master, model: MODEL, createdAt: "", prompt, quality: QUALITY, size: SIZE, status: "pending", reason: "" };
  log.calls.push(entry);
  saveLog(log);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, size: SIZE, quality: QUALITY, n: 1, output_format: "png" }),
    });
  } catch (e) {
    entry.status = "rejected";
    entry.reason = `network error: ${(e as Error).message}`;
    log.errors.push({ id, at: new Date().toISOString(), error: entry.reason });
    saveLog(log);
    throw e;
  }
  const body = (await res.json()) as { created?: number; data?: { b64_json?: string; revised_prompt?: string }[]; usage?: Record<string, unknown>; error?: unknown };
  if (!res.ok || !body.data?.[0]?.b64_json) {
    entry.status = "rejected";
    entry.reason = `API error ${res.status}: ${JSON.stringify(body.error ?? body).slice(0, 500)}`;
    log.errors.push({ id, at: new Date().toISOString(), error: entry.reason });
    saveLog(log);
    throw new Error(entry.reason);
  }
  writeFileSync(join(masters, master), Buffer.from(body.data[0].b64_json, "base64"));
  entry.createdAt = new Date((body.created ?? Date.now() / 1000) * 1000).toISOString();
  if (body.usage) entry.usage = body.usage;
  if (body.data[0].revised_prompt) entry.reason = `revised_prompt: ${body.data[0].revised_prompt}`;
  saveLog(log);
  console.log(`[medallions] ${id} attempt ${attempt}: ${master}${body.usage ? " usage " + JSON.stringify(body.usage) : ""}`);
}

async function generate() {
  const masters = arg("--masters");
  if (!masters) throw new Error("--masters <dir> is required (outside the repo)");
  mkdirSync(masters, { recursive: true });
  const ids = positional();
  const known = new Set(GROUPS.map((g) => g.id));
  for (const id of ids) if (!known.has(id)) throw new Error(`unknown group ${id}`);
  const log = readReviewLog();
  if (log.calls.length + ids.length > MAX_CALLS) throw new Error(`call cap: ${log.calls.length} used, ${ids.length} asked, cap ${MAX_CALLS}`);
  const jobs = ids.map((id) => {
    const tries = log.calls.filter((c) => c.id === id);
    if (tries.some((c) => c.status === "accepted")) throw new Error(`${id} already has an accepted image`);
    if (tries.length >= MAX_ATTEMPTS) throw new Error(`${id} used its ${MAX_ATTEMPTS} attempts`);
    return { id, attempt: tries.length + 1 };
  });
  const concurrency = Number(arg("--concurrency") ?? 4);
  let next = 0;
  const failures: string[] = [];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        try {
          await generateOne(j.id, j.attempt, masters, log);
        } catch (e) {
          failures.push(`${j.id}: ${(e as Error).message}`);
        }
      }
    }),
  );
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
}

function review() {
  const [id, attemptS, verdict, ...why] = positional();
  const reason = why.join(" ");
  if (!id || !attemptS || !["accept", "reject"].includes(verdict) || !reason) throw new Error('usage: review <id> <attempt> accept|reject "<reason>"');
  const log = readReviewLog();
  const e = log.calls.find((c) => c.id === id && c.attempt === Number(attemptS));
  if (!e) throw new Error(`no call ${id} attempt ${attemptS}`);
  if (verdict === "accept" && log.calls.some((c) => c.id === id && c !== e && c.status === "accepted")) throw new Error(`${id} already has an accepted image`);
  e.status = verdict === "accept" ? "accepted" : "rejected";
  e.reason = reason;
  saveLog(log);
  console.log(`[medallions] ${id} attempt ${attemptS}: ${e.status} (${reason})`);
}

/**
 * The masters come back on slightly different navies (#04111a to #07151f). Map each one so its ground is exactly the
 * Noite ground (per channel: ground -> GROUND, 255 stays 255) and paint the corners outside the inscribed circle flat,
 * since the round crop hides them anyway and flat corners cost almost no bytes.
 */
async function normalize(master: Buffer): Promise<{ raw: Buffer; width: number; height: number; ground: number[] }> {
  const { data, info } = await sharp(master).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const patch = 16;
  const ground = [0, 1, 2].map((c) => {
    const vals: number[] = [];
    for (const [x0, y0] of [[0, 0], [w - patch, 0], [0, h - patch], [w - patch, h - patch]])
      for (let y = y0; y < y0 + patch; y++) for (let x = x0; x < x0 + patch; x++) vals.push(data[(y * w + x) * 3 + c]);
    vals.sort((a, b) => a - b);
    return vals[vals.length >> 1];
  });
  const out = Buffer.alloc(data.length);
  const cx = (w - 1) / 2, cy = (h - 1) / 2, r2 = (w / 2) ** 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const outside = (x - cx) ** 2 + (y - cy) ** 2 > r2;
      for (let c = 0; c < 3; c++) {
        const g = ground[c], t = GROUND[c];
        out[i + c] = outside ? t : Math.max(0, Math.min(255, Math.round(t + (data[i + c] - g) * ((255 - t) / (255 - g)))));
      }
    }
  }
  return { raw: out, width: w, height: h, ground };
}

async function encodeOne(src: { raw: Buffer; width: number; height: number }, size: number, cap: number): Promise<{ buf: Buffer; q: number }> {
  for (let q = WEBP_Q.start; q >= WEBP_Q.floor; q -= WEBP_Q.step) {
    const buf = await sharp(src.raw, { raw: { width: src.width, height: src.height, channels: 3 } })
      .resize(size, size, { kernel: "lanczos3" })
      .webp({ quality: q, effort: 6, smartSubsample: true })
      .toBuffer();
    if (buf.length <= cap) return { buf, q };
  }
  throw new Error(`does not fit ${cap} B at ${size} px even at q${WEBP_Q.floor}`);
}

async function encode() {
  const masters = arg("--masters");
  if (!masters) throw new Error("--masters <dir> is required");
  mkdirSync(MEDALLION_DIR, { recursive: true });
  const log = readReviewLog();
  let total = 0;
  for (const g of GROUPS) {
    const a = log.calls.find((c) => c.id === g.id && c.status === "accepted");
    if (!a) {
      console.log(`[medallions] ${g.id}: no accepted image, skipped`);
      continue;
    }
    const src = await normalize(readFileSync(join(masters, a.master)));
    const parts: string[] = [`ground #${src.ground.map((v) => v.toString(16).padStart(2, "0")).join("")}`];
    for (const s of SIZES) {
      const { buf, q } = await encodeOne(src, s, CAPS[s]);
      writeFileSync(join(MEDALLION_DIR, fileName(g.id, s)), buf);
      total += buf.length;
      parts.push(`${s}px ${buf.length} B q${q}`);
    }
    console.log(`[medallions] ${g.id}: ${parts.join(", ")}`);
  }
  console.log(`[medallions] total ${total} B (cap ${CAPS.total})`);
  if (total > CAPS.total) throw new Error("total cap exceeded");
}

function manifest() {
  const m = buildManifest();
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + "\n");
  console.log(`[medallions] wrote ${MANIFEST}: ${Object.keys(m.groups).length} groups, ${Object.keys(m.bookGroup).length} books`);
}

const cmd = process.argv[2];
const run = { generate, review, encode, manifest }[cmd ?? ""];
if (!run) {
  console.error("usage: medallions.ts generate|review|encode|manifest …");
  process.exit(2);
}
Promise.resolve(run()).catch((e: Error) => {
  console.error(`[medallions] ${e.message}`);
  process.exit(1);
});
