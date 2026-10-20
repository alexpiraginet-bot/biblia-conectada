// Draws a "Cartão de ligação" on this device (canvas, 1080 × 1350): always a pair or a route, never a lone verse,
// with the arcs on the Gênesis→Apocalipse line and the credits. Loaded only when someone asks for a card.
// The card is night sky in both themes, like the videos; glow lives inside the canvas only (design §3). Its inks are
// the --sky* tokens, read from the page when the card is made.
import { ARC_FLATTEN } from "@/lib/community/geometry";

export type CardSpec = {
  title: string;
  /** where the pair comes from, said under the title ("Antes do Natal, passo 1"): no caps, no kicker (design §4) */
  context: string;
  /** arcs in gold, positions 0–1 on the baseline */
  arcs: { x0: number; x1: number }[];
  /** stars on the baseline, positions 0–1 */
  stars: number[];
  bookStarts: number[];
  ntStart: number;
  /** the two texts of a pair (absent on the spoiler-free bridge card) */
  texts?: { ref: string; text: string }[];
  /** statements under the arcs, e.g. "333 votos de leitores na OpenBible.info" */
  lines: string[];
  credit: string;
};
export type CardFonts = { title: string; ui: string; scripture: string };
/** the sky's inks (tokens sky, sky-ink, sky-ink-2, sky-gold); an empty value keeps the token's value below */
export type CardInks = { sky: string; ink: string; ink2: string; gold: string };

const W = 1080;
const H = 1350;
const PAD = 80;
// src/styles/tokens.json, the same in both themes: used only when the page gave no value
const INKS: CardInks = { sky: "#060d1a", ink: "#f2ebdd", ink2: "#aeb9cc", gold: "#ffcc6b" };

type Ctx = CanvasRenderingContext2D;

function wrap(ctx: Ctx, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function drawCard(spec: CardSpec, fonts: CardFonts, inks: Partial<CardInks> = {}): Promise<Blob> {
  const SKY = inks.sky || INKS.sky;
  const TEXT = inks.ink || INKS.ink;
  const TEXT2 = inks.ink2 || INKS.ink2;
  const GOLD = inks.gold || INKS.gold;
  await Promise.all([
    document.fonts.load(`440 64px ${fonts.title}`),
    document.fonts.load(`500 28px ${fonts.ui}`),
    document.fonts.load(`600 28px ${fonts.ui}`),
    document.fonts.load(`400 36px ${fonts.scripture}`),
  ]).catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d unavailable");
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";

  // the title (two lines at most), then where the pair comes from, in the secondary ink
  let y = PAD;
  let size = 68;
  let titleLines: string[] = [];
  for (; size >= 40; size -= 4) {
    ctx.font = `440 ${size}px ${fonts.title}`;
    titleLines = wrap(ctx, spec.title, W - 2 * PAD);
    if (titleLines.length <= 2) break;
  }
  ctx.fillStyle = TEXT;
  for (const l of titleLines) {
    y += size * 1.1;
    ctx.fillText(l, PAD, y);
  }
  ctx.font = `500 28px ${fonts.ui}`;
  ctx.fillStyle = TEXT2;
  for (const l of wrap(ctx, spec.context, W - 2 * PAD)) {
    y += 40;
    ctx.fillText(l, PAD, y);
  }

  // footer, measured first: credit lines at the bottom, the statements right above them
  ctx.font = `400 22px ${fonts.ui}`;
  const credit = spec.credit.split("\n").flatMap((p) => wrap(ctx, p, W - 2 * PAD));
  const creditTop = H - PAD + 6 - (credit.length - 1) * 30;
  const footerTop = creditTop - 48 - spec.lines.length * 44;

  // the sky band: baseline, book ticks, gold arcs with glow, stars. Without texts it takes the free height.
  const bandTop = y + 40;
  const bandH = spec.texts ? 250 : footerTop - 150 - bandTop;
  const X = (x: number) => PAD + x * (W - 2 * PAD);
  const maxRx = Math.max(1, ...spec.arcs.map((a) => (Math.abs(a.x1 - a.x0) * (W - 2 * PAD)) / 2));
  const k = Math.min(spec.texts ? 2.2 : 3, (bandH - 20) / (maxRx * ARC_FLATTEN));
  // with the free height, the arcs sit in the middle of it
  const baseY = spec.texts ? bandTop + bandH : bandTop + Math.round((bandH + maxRx * ARC_FLATTEN * k) / 2);
  ctx.strokeStyle = TEXT2;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, baseY);
  ctx.lineTo(W - PAD, baseY);
  for (const x of spec.bookStarts) {
    ctx.moveTo(X(x), baseY + 6);
    ctx.lineTo(X(x), baseY + 16);
  }
  ctx.moveTo(X(spec.ntStart), baseY + 6);
  ctx.lineTo(X(spec.ntStart), baseY + 30);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = `500 22px ${fonts.ui}`;
  ctx.fillStyle = TEXT2;
  ctx.textAlign = "center";
  ctx.fillText("AT", (X(0) + X(spec.ntStart)) / 2, baseY + 52);
  ctx.fillText("NT", (X(spec.ntStart) + X(1)) / 2, baseY + 52);
  ctx.textAlign = "left";
  ctx.lineCap = "round";
  for (const pass of [0, 1]) {
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = pass === 0 ? 10 : 3.5;
    ctx.globalAlpha = pass === 0 ? 0.18 : 1;
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = pass === 0 ? 24 : 8;
    for (const a of spec.arcs) {
      const p = Math.min(X(a.x0), X(a.x1));
      const q = Math.max(X(a.x0), X(a.x1));
      const rx = Math.max((q - p) / 2, 1);
      ctx.beginPath();
      ctx.ellipse(p + rx, baseY, rx, rx * ARC_FLATTEN * k, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 14;
  ctx.fillStyle = GOLD;
  for (const s of spec.stars) {
    ctx.beginPath();
    ctx.arc(X(s), baseY, 9, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  y = baseY + 100;

  // the two texts, shrunk together until they fit above the statements
  if (spec.texts?.length) {
    const room = footerTop - y - 30;
    let fs = 38;
    let blocks: string[][] = [];
    const height = () => blocks.reduce((h, lines) => h + 44 + lines.length * fs * 1.42 + 44, 0);
    for (; fs >= 22; fs -= 2) {
      ctx.font = `400 ${fs}px ${fonts.scripture}`;
      blocks = spec.texts.map((t) => wrap(ctx, t.text, W - 2 * PAD));
      if (height() <= room) break;
    }
    fs = Math.max(fs, 22);
    // the text is never cut: it only gets smaller (ATTRIBUTION.md: a changed text must say so)
    spec.texts.forEach((t, i) => {
      ctx.font = `600 28px ${fonts.ui}`;
      ctx.fillStyle = GOLD;
      y += 30;
      ctx.fillText(t.ref, PAD, y);
      y += 14;
      ctx.font = `400 ${fs}px ${fonts.scripture}`;
      ctx.fillStyle = TEXT;
      for (const l of blocks[i]) {
        y += fs * 1.42;
        ctx.fillText(l, PAD, y);
      }
      y += 44;
    });
  }

  // statements and credits
  y = footerTop;
  ctx.font = `500 30px ${fonts.ui}`;
  ctx.fillStyle = TEXT;
  for (const l of spec.lines) {
    y += 44;
    ctx.fillText(l, PAD, y);
  }
  ctx.font = `400 22px ${fonts.ui}`;
  ctx.fillStyle = TEXT2;
  let cy = creditTop;
  for (const l of credit) {
    ctx.fillText(l, PAD, cy);
    cy += 30;
  }

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}
