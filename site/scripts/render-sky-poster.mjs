#!/usr/bin/env node
// Renders the poster images of the sky of links (/arcos) (public/sky/*.avif|webp) from the real data, with the same WebGL code
// the page runs (src/components/sky/renderer.ts), in headless Chromium, then encodes them with ffmpeg.
// Not part of the build: run it by hand after `npm run data` when the arcs, the look or the poster sizes change, and
// commit the outputs. Needs ffmpeg (libaom-av1 + libwebp) and a Chromium/Chrome binary:
//   CHROME=/path/to/chrome node scripts/render-sky-poster.mjs
// Without a GPU, Chromium draws with SwiftShader (slow but exact): the full sky at 2304 px takes a while.
import { build } from "esbuild";
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(SITE, "public/sky");
const DATA = join(SITE, "public/data");

// Must match src/components/sky/poster.ts (tests/sky.test.ts checks the files against it).
const JOBS = [
  { set: "head", width: 864 },
  { set: "full", width: 2304 },
]
  .flatMap((j) => ["sky", "gold"].map((layer) => ({ ...j, layer, height: (j.width * 5) / 8 })))
  // SKY_POSTER_ONLY=head renders one size; SKY_POSTER_PNG=<dir> also keeps the lossless renders there
  .filter((j) => !process.env.SKY_POSTER_ONLY || j.set === process.env.SKY_POSTER_ONLY)
  .filter((j) => !process.env.SKY_POSTER_LAYER || j.layer === process.env.SKY_POSTER_LAYER);
const KEEP_PNG = process.env.SKY_POSTER_PNG;
// AVIF (libaom, 4:4:4, full range) and WebP quality per layer; the gold layer is mostly black and keeps more detail.
const QUALITY = { sky: { crf: 30, webp: 82 }, gold: { crf: 26, webp: 88 } };

const CHROME =
  process.env.CHROME ??
  ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/usr/bin/chromium", "/usr/bin/google-chrome"].find((p) => existsSync(p));
if (!CHROME) throw new Error("set CHROME to a Chromium or Chrome binary");
if (!existsSync(join(DATA, "sky.json"))) throw new Error("public/data/sky.json is missing: run `npm run data` first");

// 1. bundle the poster entry
const bundle = await build({
  entryPoints: [join(SITE, "src/components/sky/poster-entry.ts")],
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

// 3. headless Chromium over the DevTools protocol (no extra dependency: Node 22 has WebSocket)
const profile = mkdtempSync(join(tmpdir(), "sky-poster-"));
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

const tmp = mkdtempSync(join(tmpdir(), "sky-png-"));
mkdirSync(OUT, { recursive: true });
try {
  await send("Runtime.enable");
  await send("Page.navigate", { url: origin + "/" });
  for (let i = 0; i < 100 && !(await evaluate("typeof window.renderPoster === 'function'")); i++) await new Promise((r) => setTimeout(r, 100));

  for (const job of JOBS) {
    const t0 = Date.now();
    const r = await evaluate(`renderPoster(${JSON.stringify(job)})`);
    const name = `${job.layer}-${job.set}-${job.width}`;
    const png = join(tmp, `${name}.png`);
    writeFileSync(png, Buffer.from(r.png.split(",")[1], "base64"));
    if (KEEP_PNG) writeFileSync(join(KEEP_PNG, `${name}.png`), readFileSync(png));
    const q = QUALITY[job.layer];
    const color = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "iec61966-2-1", "-color_range", "pc"];
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "scale=out_color_matrix=bt709:out_range=full,format=yuv444p",
      "-c:v", "libaom-av1", "-still-picture", "1", "-crf", String(q.crf), "-cpu-used", "2", ...color, join(OUT, `${name}.avif`)]);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-c:v", "libwebp", "-quality", String(q.webp), "-compression_level", "6",
      "-preset", "picture", join(OUT, `${name}.webp`)]);
    const kb = (f) => (statSync(join(OUT, f)).size / 1024).toFixed(1);
    console.log(`${name}: ${r.arcs} arcs, ${r.partners} gold arcs, ${((Date.now() - t0) / 1000).toFixed(1)} s -> avif ${kb(`${name}.avif`)} KiB, webp ${kb(`${name}.webp`)} KiB`);
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
  rmSync(tmp, { recursive: true, force: true });
  setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
}
