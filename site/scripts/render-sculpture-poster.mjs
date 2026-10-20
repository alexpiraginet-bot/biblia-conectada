#!/usr/bin/env node
// Renders the poster images of the light sculpture (/arcos) (public/sculpture/*.avif|webp): the opening view, drawn
// from the real data with the same WebGL code the page runs (src/components/sculpture/renderer.ts) in headless
// Chromium, then encoded with ffmpeg. The sizes and paths come from src/components/sculpture/poster.ts.
// Phones get the most voted arcs (sky-head.bin), as their canvas draws; from 48rem every arc (arcs.bin).
// Not part of the build: run it by hand after `npm run data` when the arcs, the look (renderer.ts, shaders.ts, arcs.ts),
// the opening view (home.ts, space.ts), the ground (tokens.json) or the poster sizes change, and commit the outputs.
// Needs ffmpeg (libaom-av1 + libwebp) and a Chromium/Chrome binary:
//   CHROME=/path/to/chrome node scripts/render-sculpture-poster.mjs
// SCULPTURE_POSTER_ONLY=phone|wide and SCULPTURE_POSTER_THEME=noite|dia render a part; SCULPTURE_POSTER_PNG=<dir> also
// keeps the lossless renders there. Without a GPU, Chromium draws with SwiftShader (slow but exact).
import { build } from "esbuild";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(SITE, "public/data");
const TSCONFIG = join(SITE, "tsconfig.json");

// AVIF (libaom, still picture, 4:4:4, full range) and WebP quality. The glow is a slow gradient on a flat ground and
// no lossy setting keeps the shader's dither: at these the steps left are single levels, not visible at normal
// contrast (WebP below 90 shows its 8 x 8 blocks in the glow). Current browsers take the AVIF; the WebP is the fallback
// for older ones and runs about twice the size, so it has its own aim.
const QUALITY = { crf: 16, webp: 90 };
const BUDGET_KB = { avif: { phone: 60, wide: 180 }, webp: { phone: 60, wide: 300 } };
// the arc file each size shows: what the page draws there (Sculpture.tsx lightDevice: phones stay on the head set)
const SETS = { phone: "head", wide: "full" };

// 0. the declared posters (poster.ts) and the opening aspect (space.ts), read from the sources themselves
const decl = await build({
  stdin: {
    contents: `export { SCULPTURE_POSTER } from "./src/components/sculpture/poster"; export { HOME_ASPECT } from "./src/components/sculpture/space";`,
    resolveDir: SITE,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  write: false,
  logLevel: "warning",
});
const { SCULPTURE_POSTER, HOME_ASPECT } = await import(`data:text/javascript;base64,${Buffer.from(decl.outputFiles[0].text).toString("base64")}`);
const JOBS = ["phone", "wide"]
  .flatMap((size) => ["noite", "dia"].map((theme) => ({ size, theme, set: SETS[size], ...SCULPTURE_POSTER[size][theme] })))
  .filter((j) => !process.env.SCULPTURE_POSTER_ONLY || j.size === process.env.SCULPTURE_POSTER_ONLY)
  .filter((j) => !process.env.SCULPTURE_POSTER_THEME || j.theme === process.env.SCULPTURE_POSTER_THEME);
if (JOBS.length === 0) throw new Error("no poster to render: check SCULPTURE_POSTER_ONLY (phone|wide) and SCULPTURE_POSTER_THEME (noite|dia)");
for (const j of JOBS) {
  // the poster is the home box: anything but HOME_ASPECT would stretch the first frame
  if (!Number.isInteger(j.w) || !Number.isInteger(j.h) || j.w / j.h !== HOME_ASPECT) {
    throw new Error(`poster.ts ${j.size}.${j.theme}: ${j.w} x ${j.h} is not HOME_ASPECT (${HOME_ASPECT})`);
  }
  if (j.avif !== `/sculpture/${j.theme}-${j.w}.avif` || j.webp !== `/sculpture/${j.theme}-${j.w}.webp`) {
    throw new Error(`poster.ts ${j.size}.${j.theme}: unexpected paths ${j.avif}, ${j.webp}`);
  }
}
// the page's ground under the poster (tokens.json `ground`): the poster's own ground must be the same colour
const groundToken = JSON.parse(readFileSync(join(SITE, "src/styles/tokens.json"), "utf8")).color.tokens.find((t) => t.name === "ground")?.value;
if (!groundToken?.noite || !groundToken?.dia) throw new Error("tokens.json has no `ground` colour for both themes");
const KEEP_PNG = process.env.SCULPTURE_POSTER_PNG;
if (KEEP_PNG) mkdirSync(KEEP_PNG, { recursive: true });

const CHROME =
  process.env.CHROME ??
  ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/usr/bin/chromium", "/usr/bin/google-chrome"].find((p) => existsSync(p));
if (!CHROME) throw new Error("set CHROME to a Chromium or Chrome binary");
if (!existsSync(join(DATA, "sky.json"))) throw new Error("public/data/sky.json is missing: run `npm run data` first");
const sky = JSON.parse(readFileSync(join(DATA, "sky.json"), "utf8"));
for (const set of new Set(JOBS.map((j) => j.set))) {
  if (!existsSync(join(DATA, sky.files[set].file))) throw new Error(`public/data/${sky.files[set].file} is missing: run \`npm run data\` first`);
}
for (const enc of ["libaom-av1", "libwebp"]) {
  let list = "";
  try {
    list = execFileSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" });
  } catch {
    throw new Error("ffmpeg is missing (it needs libaom-av1 and libwebp)");
  }
  if (!new RegExp(`\\s${enc}\\s`).test(list)) throw new Error(`this ffmpeg has no ${enc} encoder`);
}

// 1. bundle the poster entry (tsconfig paths: home.ts imports "@/lib/community/books-client")
const bundle = await build({
  entryPoints: [join(SITE, "src/components/sculpture/poster-entry.ts")],
  absWorkingDir: SITE,
  tsconfig: TSCONFIG,
  bundle: true,
  format: "iife",
  target: "es2020",
  write: false,
  logLevel: "warning",
});
const js = bundle.outputFiles[0].text;
const html = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style><body><script>${js}</script>`;

// 2. serve the harness and public/data
const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(html);
  }
  const file = join(DATA, url.pathname.replace(/^\/data\//, ""));
  if (!url.pathname.startsWith("/data/") || !file.startsWith(DATA) || !existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { "content-type": extname(file) === ".json" ? "application/json" : "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

// 3. headless Chromium over the DevTools protocol (no extra dependency: Node 22 has WebSocket). WebGL2 without a GPU:
// ANGLE on SwiftShader.
const profile = mkdtempSync(join(tmpdir(), "sculpture-poster-"));
const args = [
  "--headless=new",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--use-gl=angle",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--window-size=2400,1600",
  "--no-first-run",
  "--no-default-browser-check",
  ...(process.getuid?.() === 0 ? ["--no-sandbox"] : []),
  "about:blank",
];
const chrome = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
chrome.stderr.on("data", (d) => (stderr += d));
const portFile = join(profile, "DevToolsActivePort");
for (let i = 0; i < 200 && !existsSync(portFile); i++) await new Promise((r) => setTimeout(r, 100));
if (!existsSync(portFile)) throw new Error(`Chromium did not start:\n${stderr.slice(-2000)}`);
const port = readFileSync(portFile, "utf8").split("\n")[0];
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((ok, ko) => {
  ws.onopen = ok;
  ws.onerror = ko;
});
let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { ok, ko } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) ko(new Error(m.error.message));
    else ok(m.result);
  } else if (m.method === "Runtime.exceptionThrown") console.error("[page]", m.params.exceptionDetails.exception?.description);
  else if (m.method === "Runtime.consoleAPICalled") console.log("[page]", ...m.params.args.map((a) => a.value ?? a.description));
};
const send = (method, params = {}) =>
  new Promise((ok, ko) => {
    const id = ++seq;
    pending.set(id, { ok, ko });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const tmp = mkdtempSync(join(tmpdir(), "sculpture-png-"));
const warnings = [];
try {
  await send("Runtime.enable");
  await send("Page.navigate", { url: origin + "/" });
  for (let i = 0; i < 100 && !(await evaluate("typeof window.renderSculpturePoster === 'function'")); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(await evaluate("typeof window.renderSculpturePoster === 'function'"))) throw new Error("the poster page did not load its script");

  for (const job of JOBS) {
    const t0 = Date.now();
    const name = `${job.theme}-${job.w}`;
    const r = await evaluate(`renderSculpturePoster(${JSON.stringify({ theme: job.theme, set: job.set, width: job.w, height: job.h })})`);
    const s = r.stats;
    // a blank, a stretched or a one-testament picture is a broken render, not a poster
    if (s.width !== job.w || s.height !== job.h) throw new Error(`${name}: the PNG is ${s.width} x ${s.height}`);
    if (s.lit < 0.05) throw new Error(`${name}: only ${(s.lit * 100).toFixed(2)}% of the pixels differ from the ground: blank render?`);
    if (s.warm < 0.01 || s.cool < 0.002) throw new Error(`${name}: warm ${(s.warm * 100).toFixed(2)}%, cool ${(s.cool * 100).toFixed(2)}%: a testament is missing`);
    // the poster sits on the stage's ground: any other colour would show the box as a seam
    const want = groundToken[job.theme];
    if (rgbOf(want).some((v, i) => v !== s.ground[i])) {
      throw new Error(`${name}: the poster's ground is ${hex(s.ground)}, the page's ground (tokens.json) is ${want}: renderer.ts GROUND must match it`);
    }

    const png = join(tmp, `${name}.png`);
    writeFileSync(png, Buffer.from(r.png.split(",")[1], "base64"));
    if (KEEP_PNG) writeFileSync(join(KEEP_PNG, `${name}.png`), readFileSync(png));
    const avif = join(SITE, "public", job.avif);
    const webp = join(SITE, "public", job.webp);
    mkdirSync(dirname(avif), { recursive: true });
    const color = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-color_range", "pc"];
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "scale=out_color_matrix=bt709:out_range=full,format=yuv444p",
      "-c:v", "libaom-av1", "-still-picture", "1", "-crf", String(QUALITY.crf), "-cpu-used", "2", ...color, avif]);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", String(QUALITY.webp), "-compression_level", "6",
      "-preset", "picture", webp]);
    const kb = (f) => statSync(f).size / 1000;
    for (const [f, rel, fmt] of [[avif, job.avif, "avif"], [webp, job.webp, "webp"]]) {
      const aim = BUDGET_KB[fmt][job.size];
      if (kb(f) > aim) warnings.push(`${rel}: ${kb(f).toFixed(1)} kB, over the ${aim} kB aim`);
    }
    console.log(
      `${name}: ${r.arcs.toLocaleString("en")} arcs (${sky.files[job.set].file}), ${r.renderer.replace(/\s+/g, " ").slice(0, 60)}, draw ${(r.ms / 1000).toFixed(1)} s, total ${((Date.now() - t0) / 1000).toFixed(1)} s` +
        ` | ground ${hex(s.ground)}, lit ${(s.lit * 100).toFixed(1)}%, warm ${(s.warm * 100).toFixed(1)}%, cool ${(s.cool * 100).toFixed(1)}%` +
        ` -> avif ${kb(avif).toFixed(1)} kB, webp ${kb(webp).toFixed(1)} kB`,
    );
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
  rmSync(tmp, { recursive: true, force: true });
  setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
}
for (const w of warnings) console.warn(`warning: ${w}`);
