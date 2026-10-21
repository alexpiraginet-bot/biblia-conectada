// Entry bundled by scripts/render-sculpture-poster.mjs into a headless Chromium page: draws the light sculpture's
// opening view with the renderer the /arcos page runs and returns it as a PNG data URL. Not part of the site bundle.
//
// The poster is the home box with a margin: the canvas has the box's aspect (HOME_ASPECT), and the box's own projection
// is shrunk into its middle `box` share (poster.ts), so the glow runs on past the box's edges as on the page. It is
// shown at 2 device px per CSS px, so it is drawn as the page draws a box (H x box) / 2 CSS px tall at a device pixel
// ratio of 2: the renderer widens the arcs and the bloom with the ratio, and the exposure follows the box's height.
// `set` is the arc file the page draws there: the 20,000 most voted pairs on phones (sky-head.bin), every pair from
// 48rem (arcs.bin).
import booksJson from "@/data/generated/books.json";
import medalhoes from "@/data/medalhoes.json";
import type { Book } from "@/lib/canon/types";
import { buildGeometry, decodeArcs, type SkyMeta } from "../sky/model";
import { arcBuffers, axisLines, newTestament } from "./arcs";
import { axisGroups } from "./groups";
import { HOME_ORBIT } from "./home";
import { SCULPTURE_POSTER } from "./poster";
import { SculptureRenderer, type Theme } from "./renderer";
import { boxProjection, exposureZoom, HOME_ASPECT, multiply, pixelsPerUnit } from "./space";

type Job = { theme: Theme; set: "head" | "full"; width: number; height: number };

/** device px per CSS px the posters are drawn for (poster.ts) */
const DPR = 2;

async function bin(file: string) {
  const res = await fetch(`/data/${file}`);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return res.arrayBuffer();
}

/** What the PNG holds, so the script can refuse a blank or a wrong picture: the ground (the commonest colour of the
 *  four 8 x 8 corners, the farthest from the sculpture: its glow reaches the middle of the edges), the share of pixels
 *  away from it, and the shares that move from the ground toward red and toward blue across the canonical spectrum:
 *  light adds colour in Noite, ink takes the other colour away in Dia. */
async function measure(png: string) {
  const bmp = await createImageBitmap(await (await fetch(png)).blob());
  const ctx = new OffscreenCanvas(bmp.width, bmp.height).getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  const { data, width: w, height: h } = ctx.getImageData(0, 0, bmp.width, bmp.height);
  const ring = new Map<number, number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if ((x > 7 && x < w - 8) || (y > 7 && y < h - 8)) continue;
      const i = (y * w + x) * 4;
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      ring.set(key, (ring.get(key) ?? 0) + 1);
    }
  }
  const g = [...ring].sort((a, b) => b[1] - a[1])[0][0];
  const ground = [g >> 16, (g >> 8) & 255, g & 255];
  let lit = 0, warm = 0, cool = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - ground[0], dg = data[i + 1] - ground[1], db = data[i + 2] - ground[2];
    if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) <= 12) continue;
    lit++;
    if (dr - db > 12) warm++;
    else if (db - dr > 12) cool++;
  }
  const n = w * h;
  return { width: w, height: h, ground, lit: lit / n, warm: warm / n, cool: cool / n };
}

async function renderSculpturePoster(job: Job) {
  const { theme, width: W, height: H } = job;
  if (W / H !== HOME_ASPECT) throw new Error(`${W} x ${H} is not HOME_ASPECT (${HOME_ASPECT})`);
  const meta = (await (await fetch("/data/sky.json")).json()) as SkyMeta;
  const geo = buildGeometry(meta);
  const nt = newTestament(meta, geo);
  const file = meta.files[job.set];
  const set = decodeArcs(await bin(file.file), job.set === "full");
  if (set.n !== file.count) throw new Error(`${file.file}: ${set.n} arcs, sky.json says ${file.count}`);

  const canvas = document.createElement("canvas");
  canvas.style.cssText = `display:block;width:${W / DPR}px;height:${H / DPR}px`;
  document.body.replaceChildren(canvas);
  // headless Chromium draws with SwiftShader on purpose: `software` is expected here and ignored
  const made = SculptureRenderer.create(canvas);
  if (!made) throw new Error("no WebGL2 context with float render targets (EXT_color_buffer_float)");
  const { r } = made;
  const gl = canvas.getContext("webgl2")!;
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));

  r.resize(W / DPR, H / DPR, DPR);
  r.theme = theme;
  r.setArcs(arcBuffers(geo, set, nt, theme, "distancia"));
  // the book groups' bands under the axis, from the medallions' groups as on the page (groups.ts)
  const bookGroup = (medalhoes as unknown as { bookGroup: Record<string, string> }).bookGroup;
  r.setLines(axisLines(meta, geo, axisGroups(booksJson as Book[], (osis) => bookGroup[osis] ?? null, (id) => id)));
  r.setLit(null);
  r.recede = 1;
  // the page's settled frame of the home view (engine.ts drawNow), for a box (H x box) / DPR CSS px tall in the middle
  // of the canvas: a lens that shrinks clip space by `box`, as space.ts viewMatrix places a box on the stage
  const k = SCULPTURE_POSTER.box;
  const boxH = (H * k) / DPR;
  const shrink = new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const t0 = performance.now();
  r.draw(multiply(shrink, boxProjection(HOME_ORBIT, W / H)), pixelsPerUnit(boxH, HOME_ORBIT.dist, DPR), exposureZoom(boxH, HOME_ORBIT.dist), HOME_ORBIT.dist, "settled", null);
  // read in the same task: the context does not preserve its drawing buffer once the frame is composited
  const png = canvas.toDataURL("image/png");
  const ms = performance.now() - t0;
  if (gl.isContextLost()) throw new Error("the WebGL context was lost while drawing");
  r.destroy();
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { png, arcs: set.n, renderer, ms, stats: await measure(png) };
}

(window as unknown as { renderSculpturePoster: typeof renderSculpturePoster }).renderSculpturePoster = renderSculpturePoster;
