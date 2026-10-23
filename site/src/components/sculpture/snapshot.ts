// An image of the sculpture to save or share (/arcos, "Salvar imagem"): the picture drawn again by the page's own
// renderer at a fixed size (engine.capture), the labels of the lit verses on its axis, and under it what is lit, in the
// page's fonts and colours, with the exact credit lines of the text and of the links (ATTRIBUTION.md). 1080 x 1350 CSS
// px, the 4:5 shape the social apps show whole, drawn at 2 device px per CSS px (1.5 on a light device). Loaded only
// when asked for.
import { formatInt } from "@/lib/canon/text";
import { BASE } from "@/lib/community/books-client";
import { longRef, shortRef } from "@/lib/community/geometry";
import { verseAxis, type Hop } from "./arcs";
import type { SculptureEngine } from "./engine";
import { groupNames, type AxisGroup } from "./groups";
import { HOME_ASPECT, project, type Mat4 } from "./space";
import { chapterLabel, ligacoes, versiculos, votos, type Data, type Sel } from "./state";

/** What the page knows of the view now, for the image's words (every number is the page's). */
export type SnapshotFacts = {
  sel: Sel;
  labels: { gv: number; main: boolean; step?: number }[];
  data: Data | null;
  /** Complete counts of the selected verse and chapter, independent of the drawing sample. */
  partners: number | null;
  chapterLinks: number | null;
  chapterDrawn?: number | null;
  verseText: string | null;
  /** every pair is loaded (else only the most voted) */
  full: boolean;
  hops: Hop[] | null | undefined;
  wordVerses: Int32Array | null;
  wordLinks: number | null;
  groups: AxisGroup[];
  strength: { min: number; arcs: number } | null;
  counts: { verses: number; crossrefRows: number; arcs: number };
  credits: string[];
};

/** The image's words for the view now: what is lit, its numbers and its text, as the page says them. */
export function contentOf(f: SnapshotFacts): SnapshotContent {
  const { sel, data } = f;
  const labels = f.labels.map((l) => ({ x: data ? verseAxis(data.geo, l.gv) : 0, text: `${l.step ? `${l.step} · ` : ""}${shortRef(BASE, l.gv)}`, main: l.main }));
  const base = { labels, credits: f.credits, address: `${window.location.host}${window.location.pathname}${window.location.hash}` };
  if (sel?.kind === "verse") {
    const testament = data ? (data.nt[sel.gv] === 1 ? "Novo Testamento" : "Antigo Testamento") : "";
    return { ...base, title: longRef(BASE, sel.gv), subtitle: [testament, f.partners !== null ? ligacoes(f.partners) : ""].filter(Boolean).join(" · "), body: f.verseText };
  }
  if (sel?.kind === "chapter") {
    const n = f.chapterLinks;
    return { ...base, title: chapterLabel(sel.ci).label, subtitle: n === null ? "" : `${ligacoes(n)} na base`,
      body: f.chapterDrawn == null ? null : `${formatInt(f.chapterDrawn)} arcos em destaque${f.full ? "" : ", da amostra mais votada"}. O total conta pares distintos de versículos, com qualquer voto.` };
  }
  if (sel?.kind === "path") {
    const steps = f.hops?.length ? [f.hops[0].from, ...f.hops.map((h) => h.to)] : [];
    return {
      ...base,
      title: `De ${longRef(BASE, sel.from)} a ${longRef(BASE, sel.to)}`,
      subtitle: f.hops ? `${ligacoes(f.hops.length)} · a mais fraca tem ${votos(Math.min(...f.hops.map((h) => h.votes)))}` : "Nenhum caminho liga esses dois versículos",
      body: steps.map((gv, k) => `${k + 1} ${shortRef(BASE, gv)}`).join("  ·  ") || null,
    };
  }
  if (sel?.kind === "word") {
    const n = f.wordVerses?.length ?? 0;
    // where the word is, by book group (a group may run in two stretches), as the panel shows it
    const names = groupNames(f.groups);
    const perGroup = names.map(() => 0);
    if (f.wordVerses && data) {
      for (const gv of f.wordVerses) {
        const ci = data.geo.chapOfGv[gv];
        const k = names.findIndex((g) => g.id === f.groups.find((x) => ci >= x.first && ci < x.end)?.id);
        if (k >= 0) perGroup[k]++;
      }
    }
    const bars = names.map((g, k) => ({ label: g.name, value: perGroup[k] })).filter((b) => b.value > 0);
    return { ...base, title: `“${sel.q}”`, subtitle: `${versiculos(n)}${f.wordLinks !== null ? ` · ${ligacoes(f.wordLinks)} entre eles` : ""}`, body: null, bars };
  }
  const s = f.strength;
  return {
    ...base,
    title: "Céu de ligações",
    subtitle: s ? `${ligacoes(s.arcs)} com ${formatInt(s.min)} votos ou mais` : `${formatInt(f.counts.arcs)} pares de versículos ligados`,
    body: `Cada fio de luz liga dois versículos que leitores da OpenBible.info apontaram como ligados: ${formatInt(f.counts.crossrefRows)} referências cruzadas sobre os ${formatInt(f.counts.verses)} versículos da Bíblia.`,
  };
}

export type SnapshotContent = {
  /** what is lit: "Isaías 53:5", "De Gênesis 3:15 a Apocalipse 12:9", "“cordeiro”", "Céu de ligações" */
  title: string;
  /** its numbers, from the page: "Antigo Testamento · 37 ligações" */
  subtitle: string;
  /** the verse's BLIVRE text, a path's steps, or nothing */
  body: string | null;
  /** rows of a count with a bar against the largest (where a word is, by book group), or none */
  bars?: { label: string; value: number }[];
  /** labels on the axis: axis x in [-1, 1], text; the first one (the lit verse) stands out */
  labels: { x: number; text: string; main?: boolean }[];
  /** credit lines, exactly as the site shows them */
  credits: string[];
  /** where the view lives on the site */
  address: string;
};

export const SNAPSHOT = { width: 1080, height: 1350, pad: 64 } as const;
const PICTURE_H = Math.round(SNAPSHOT.width / HOME_ASPECT);

/** The page's value of a colour token, and the font stack of a font token, read through an element so the theme the
 *  page shows is the one drawn. */
function tokens() {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden";
  document.body.appendChild(probe);
  const color = (name: string) => {
    probe.style.color = `var(${name})`;
    return getComputedStyle(probe).color;
  };
  const font = (name: string) => {
    probe.style.fontFamily = `var(${name})`;
    return getComputedStyle(probe).fontFamily;
  };
  const t = {
    ground: color("--ground"),
    ink: color("--ink"),
    ink2: color("--ink-2"),
    reading: color("--ink-reading"),
    accent: color("--accent"),
    overlay: color("--overlay"),
    line: color("--line-strong"),
    lit: color("--lit"),
    raised: color("--raised"),
    pillMain: color("--accent-fill"),
    onPillMain: color("--on-accent"),
    display: font("--font-display"),
    readingFont: font("--font-reading"),
    ui: font("--font-ui"),
  };
  probe.remove();
  return t;
}

/** Lines of `text` that fit `width` at the context's font; the last one ends in "…" when more would follow. */
export function wrap(measure: (s: string) => number, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (measure(next) <= width || !line) line = next;
    else {
      lines.push(line);
      line = words[i];
      if (lines.length === maxLines) {
        let last = lines[maxLines - 1];
        while (last && measure(`${last}…`) > width) last = last.replace(/\s*\S+$/, "");
        lines[maxLines - 1] = `${last}…`;
        return lines;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The labels as pills on the picture's axis, the lit verse first; a pill that would cover another tries the other
 *  side of the axis before it is left out (as the page's labels do). */
function drawLabels(ctx: CanvasRenderingContext2D, m: Mat4, labels: SnapshotContent["labels"], t: ReturnType<typeof tokens>) {
  const placed: [number, number, number, number][] = [];
  const fontPx = 22;
  for (const l of labels) {
    ctx.font = `600 ${fontPx}px ${t.ui}`;
    const s = project(m, [l.x, 0, 0], SNAPSHOT.width, PICTURE_H);
    if (!s.front) continue;
    const w = ctx.measureText(l.text).width + 28;
    const h = fontPx + 16;
    const x = Math.min(Math.max(s.x - w / 2, 12), SNAPSHOT.width - w - 12);
    for (const dy of [16, -16 - h, 16 + h + 8, -24 - 2 * h]) {
      const y = s.y + dy;
      const box: [number, number, number, number] = [x - 6, y - 3, x + w + 6, y + h + 3];
      if (y < 12 || y + h > PICTURE_H - 12) continue;
      if (placed.some((p) => p[0] < box[2] && box[0] < p[2] && p[1] < box[3] && box[1] < p[3])) continue;
      placed.push(box);
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = l.main ? t.pillMain : t.overlay;
      ctx.fill();
      if (!l.main) {
        ctx.strokeStyle = t.line;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillStyle = l.main ? t.onPillMain : t.ink;
      ctx.textBaseline = "middle";
      ctx.fillText(l.text, x + 14, y + h / 2 + 1);
      break;
    }
  }
}

/** The PNG of the view now on the stage, with `content` under the picture. */
export async function snapshot(engine: SculptureEngine, content: SnapshotContent, dpr: number): Promise<Blob> {
  const t = tokens();
  await Promise.all([
    document.fonts.load(`440 64px ${t.display}`, content.title),
    document.fonts.load(`400 30px ${t.readingFont}`, content.body ?? "a"),
    document.fonts.load(`500 26px ${t.ui}`, content.subtitle),
    document.fonts.load(`600 22px ${t.ui}`, "Is 53:5"),
  ]).catch(() => undefined);
  const { image, m } = engine.capture(SNAPSHOT.width, PICTURE_H, dpr);

  const { width: W, height: H, pad } = SNAPSHOT;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d", { alpha: false })!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = t.ground;
  ctx.fillRect(0, 0, W, H);

  // the picture, fading into the ground over its last pixels so its edge is never a seam (as the poster on the page)
  const pic = document.createElement("canvas");
  pic.width = image.width;
  pic.height = image.height;
  const pc = pic.getContext("2d")!;
  pc.drawImage(image, 0, 0);
  pc.globalCompositeOperation = "destination-in";
  const fade = 0.05;
  const gx = pc.createLinearGradient(0, 0, pic.width, 0);
  gx.addColorStop(0, "rgba(0,0,0,0)");
  gx.addColorStop(fade, "#000");
  gx.addColorStop(1 - fade, "#000");
  gx.addColorStop(1, "rgba(0,0,0,0)");
  pc.fillStyle = gx;
  pc.fillRect(0, 0, pic.width, pic.height);
  const gy = pc.createLinearGradient(0, 0, 0, pic.height);
  gy.addColorStop(0, "rgba(0,0,0,0)");
  gy.addColorStop(fade, "#000");
  gy.addColorStop(1 - fade * 1.6, "#000");
  gy.addColorStop(1, "rgba(0,0,0,0)");
  pc.fillStyle = gy;
  pc.fillRect(0, 0, pic.width, pic.height);
  ctx.drawImage(pic, 0, 0, W, PICTURE_H);
  drawLabels(ctx, m, content.labels, t);

  // under the picture: what is lit, its numbers, its text
  const width = W - 2 * pad;
  let y = PICTURE_H + 40;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = t.ink;
  ctx.font = `440 60px ${t.display}`;
  for (const line of wrap((s) => ctx.measureText(s).width, content.title, width, 2)) {
    y += 64;
    ctx.fillText(line, pad, y);
  }
  ctx.fillStyle = t.ink2;
  ctx.font = `500 26px ${t.ui}`;
  y += 44;
  ctx.fillText(content.subtitle, pad, y);

  // the credits and the address sit at the bottom; the bars and the text take the room left between
  ctx.font = `400 16px ${t.ui}`;
  const credit = content.credits.flatMap((c) => wrap((s) => ctx.measureText(s).width, c, width, 4));
  const bottom = H - 44;
  const creditTop = bottom - credit.length * 22;
  if (content.bars?.length) {
    const max = Math.max(1, ...content.bars.map((b) => b.value));
    const rows = content.bars.slice(0, Math.max(1, Math.floor((creditTop - 64 - (y + 28)) / 40)));
    ctx.font = `500 24px ${t.ui}`;
    const labelW = Math.max(...rows.map((b) => ctx.measureText(b.label).width)) + 24;
    const countW = 80;
    y += 20;
    for (const b of rows) {
      y += 40;
      ctx.fillStyle = t.ink;
      ctx.fillText(b.label, pad, y);
      const x0 = pad + labelW, x1 = pad + width - countW;
      roundRect(ctx, x0, y - 13, x1 - x0, 8, 4);
      ctx.fillStyle = t.raised;
      ctx.fill();
      roundRect(ctx, x0, y - 13, Math.max(8, ((x1 - x0) * b.value) / max), 8, 4);
      ctx.fillStyle = t.lit;
      ctx.fill();
      ctx.fillStyle = t.ink2;
      ctx.textAlign = "right";
      ctx.fillText(b.value.toLocaleString("pt-BR"), pad + width, y);
      ctx.textAlign = "left";
    }
  }
  if (content.body) {
    ctx.fillStyle = t.reading;
    ctx.font = `400 30px ${t.readingFont}`;
    const room = Math.max(1, Math.floor((creditTop - 64 - (y + 20)) / 45));
    for (const line of wrap((s) => ctx.measureText(s).width, content.body, width, Math.min(room, 7))) {
      y += 45;
      ctx.fillText(line, pad, y + 12);
    }
  }
  ctx.fillStyle = t.accent;
  ctx.font = `600 20px ${t.ui}`;
  ctx.fillText(content.address, pad, creditTop - 22);
  ctx.fillStyle = t.ink2;
  ctx.font = `400 16px ${t.ui}`;
  credit.forEach((line, i) => ctx.fillText(line, pad, creditTop + 16 + i * 22));

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}

/** Shares the image where the device can share files (phones), else downloads it. Returns what was done. */
export async function deliver(blob: Blob, fileName: string, title: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && window.matchMedia("(pointer: coarse)").matches) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "saved";
}
