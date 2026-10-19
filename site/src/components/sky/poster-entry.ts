// Entry bundled by scripts/render-sky-poster.mjs into a headless Chromium page: draws one poster layer with the same
// renderer the /arcos page uses and returns it as a PNG data URL. Not part of the site bundle.
import { buildGeometry, decodeArcs, highlightFor, type SkyMeta } from "./model";
import { SkyRenderer, type Layer } from "./renderer";

type Job = { set: "head" | "full"; layer: Exclude<Layer, "both">; width: number; height: number };

async function bin(file: string) {
  const res = await fetch(`/data/${file}`);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return res.arrayBuffer();
}

async function renderPoster(job: Job): Promise<{ png: string; partners: number; arcs: number; float: boolean }> {
  const meta = (await (await fetch("/data/sky.json")).json()) as SkyMeta;
  const geo = buildGeometry(meta);
  const full = decodeArcs(await bin(meta.files.full.file), true);
  const set = job.set === "full" ? full : decodeArcs(await bin(meta.files.head.file), false);
  // the opening verse's partners, from the full file (the page gets the same list from the server)
  const gv = meta.topVerses[0].gv;
  const partners: number[] = [];
  for (let k = 0; k < full.n; k++) {
    if (full.a[k] === gv) partners.push(full.b[k]);
    else if (full.b[k] === gv) partners.push(full.a[k]);
  }
  if (partners.length !== meta.topVerses[0].links) throw new Error(`partners ${partners.length} != ${meta.topVerses[0].links}`);

  document.body.replaceChildren();
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `display:block;width:${job.width}px;height:${job.height}px`;
  document.body.append(canvas);
  const r = SkyRenderer.create(canvas);
  if (!r) throw new Error("no WebGL2");
  r.resize(job.width, job.height, 1);
  r.setGeometry(geo);
  if (job.layer === "sky") {
    if (!r.canDrawSky) throw new Error("no float render targets: the sky layer needs them");
    r.setDome(set);
  }
  r.setHighlight(highlightFor(geo, { kind: "verse", gv }, partners, null, null));
  r.setLayer(job.layer);
  r.drawNow();
  const png = canvas.toDataURL("image/png");
  const float = r.canDrawSky;
  r.destroy();
  return { png, partners: partners.length, arcs: set.n, float };
}

(window as unknown as { renderPoster: typeof renderPoster }).renderPoster = renderPoster;
