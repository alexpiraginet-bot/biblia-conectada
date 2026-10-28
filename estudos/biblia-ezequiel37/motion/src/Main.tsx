import React from "react";
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F} from "./theme";

// "Cada osso a seu osso" (video 10, v3). One material: the letters of Ezekiel 37 (BLIVRE). They lie scattered like bones;
// when the word comes they fly together into the verse; sinews, flesh, skin are drawn on the letters; the four winds pass
// through them; the lines stand up as an army; ten chapters later the text turns to water, measured, until the camera is
// under the river. Every moment is driven by the narration word times (data.json from narr.json).
const FPS = data.fps;
const W = 1080;
const H = 1920;
type Line = (typeof data.lines)[number];
const LINE = (i: number): Line => data.lines.find((l) => l.i === i)!;
const fr = (t: number) => Math.round(t * FPS);
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const wordT = (i: number, w: string, nth = 0): number => {
  const hits = LINE(i).words.filter((x) => norm(x.w).startsWith(norm(w)));
  return (hits[nth] ?? hits[0] ?? {t0: LINE(i).t0}).t0;
};
const WF = (i: number, w: string, nth = 0) => fr(wordT(i, w, nth));
const T0 = (i: number) => fr(LINE(i).t0);
const T1 = (i: number) => fr(LINE(i).t1);
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const sm = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...clamp, easing: ease});
const lin = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], clamp);
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

// ------------------------------------------------------------------------------------------------ typesetting
// Canvas metrics of the same fonts the SVG uses, so each glyph can be placed on its own.
let ctx: CanvasRenderingContext2D | null = null;
const measure = (s: string, font: string) => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return s.length * 20;
  ctx.font = font;
  return ctx.measureText(s).width;
};
type G = {ch: string; x: number; y: number; li: number; wi: number};
type Word = {w: string; x: number; y: number; width: number; li: number};
const typeset = (text: string, size: number, weight: number, family: string, maxW: number, lh: number, cx: number, top: number) => {
  const font = `${weight} ${size}px ${family}`;
  const sp = measure(" ", font);
  const words = text.split(" ");
  const rows: string[][] = [[]];
  let wsum = 0;
  for (const w of words) {
    const ww = measure(w, font);
    if (rows[rows.length - 1].length && wsum + sp + ww > maxW) {
      rows.push([w]);
      wsum = ww;
    } else {
      wsum += (rows[rows.length - 1].length ? sp : 0) + ww;
      rows[rows.length - 1].push(w);
    }
  }
  const glyphs: G[] = [];
  const out: Word[] = [];
  let wi = 0;
  rows.forEach((row, li) => {
    const width = row.reduce((a, w) => a + measure(w, font), 0) + sp * (row.length - 1);
    let x = cx - width / 2;
    const y = top + li * lh;
    for (const w of row) {
      const ww = measure(w, font);
      out.push({w, x, y, width: ww, li});
      let gx = x;
      for (const ch of w) {
        glyphs.push({ch, x: gx, y, li, wi});
        gx += measure(ch, font);
      }
      x += ww + sp;
      wi++;
    }
  });
  return {glyphs, words: out, rows: rows.length};
};

// ------------------------------------------------------------------------------------------------ the field of bones
// the letters of the chapter, scattered on the valley floor, four depths of parallax
const CHAP = data.ch37.map((v) => v.text).join(" ");
const LETTERS = CHAP.replace(/[^A-Za-zÀ-ÿ]/g, "");
const NF = 760;
type Bone = {ch: string; x: number; y: number; r: number; d: number; s: number; k: number};
const FIELD: Bone[] = Array.from({length: NF}).map((_, k) => {
  const d = [0.55, 0.75, 1.0, 1.3][Math.floor(random(`fd${k}`) * 4)];
  return {
    ch: LETTERS[k % LETTERS.length],
    x: -160 + random(`fx${k}`) * (W + 320),
    y: -200 + random(`fy${k}`) * (H + 500),
    r: (random(`fr${k}`) - 0.5) * 120,
    d,
    s: 46 * d,
    k,
  };
});
const FORMED = "os ossos se aproximaram, cada osso a seu osso.";

// ------------------------------------------------------------------------------------------------ atmosphere
const Ground: React.FC<{tint?: string; a?: number}> = ({tint = C.ground2, a = 1}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse 90% 60% at 50% 35%, ${tint} 0%, ${C.ground} 70%)`, opacity: a}} />
);

const Grain: React.FC<{a?: number}> = ({a = 0.05}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: a, mixBlendMode: "overlay"}}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={f % 60} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#grain)" />
    </svg>
  );
};

// light from above: God is never a figure, only this
const Light: React.FC<{x?: number; a: number; spread?: number; color?: string}> = ({x = 540, a, spread = 1, color = "255,230,170"}) => {
  const f = useCurrentFrame();
  const pulse = 0.9 + 0.1 * Math.sin(f / 14);
  return (
    <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", mixBlendMode: "screen"}}>
      <defs>
        <radialGradient id="lg" cx="50%" cy="0%" r="75%">
          <stop offset="0%" stopColor={`rgba(${color},0.75)`} />
          <stop offset="50%" stopColor={`rgba(${color},0.18)`} />
          <stop offset="100%" stopColor={`rgba(${color},0)`} />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={-100} rx={700 * spread} ry={760} fill="url(#lg)" opacity={a * pulse} />
      {Array.from({length: 7}).map((_, i) => {
        const g = Math.PI / 2 + (i - 3) * 0.13 * spread + Math.sin(f / 90 + i * 1.7) * 0.025;
        const w = 0.03 + 0.025 * random(`lr${i}`);
        return (
          <path
            key={i}
            d={`M ${x} -120 L ${x + Math.cos(g - w) * 2400} ${-120 + Math.sin(g - w) * 2400} L ${x + Math.cos(g + w) * 2400} ${-120 + Math.sin(g + w) * 2400} Z`}
            fill={`rgba(${color},0.07)`}
            opacity={a * (0.5 + 0.5 * Math.sin(f / 17 + i * 2))}
          />
        );
      })}
    </svg>
  );
};

const Dust: React.FC<{n?: number; color?: string; seed?: string; a?: number; up?: boolean; speed?: number}> = ({n = 40, color = C.bone2, seed = "d", a = 1, up = true, speed = 1}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: a}}>
      {Array.from({length: n}).map((_, i) => {
        const x0 = random(`${seed}x${i}`) * W;
        const y0 = random(`${seed}y${i}`) * H;
        const sp = (0.2 + random(`${seed}s${i}`) * 0.6) * speed;
        const r = 1 + random(`${seed}r${i}`) * 2.2;
        const y = (((y0 + (up ? -1 : 1) * f * sp) % H) + H) % H;
        const x = x0 + Math.sin((f + i * 37) / 50) * 16;
        return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={0.25 + 0.4 * (0.5 + 0.5 * Math.sin(f / 11 + i))} />;
      })}
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ the voice on screen
// the narration line, word by word, set like a verse at the foot of the frame
const Voice: React.FC<{hide: number[]; until?: Record<number, number>; color?: string; y?: number}> = ({hide, until = {}, color = C.bone, y = 1430}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const lines = data.lines;
  const idx = lines.findIndex((l, k) => {
    const next = lines[k + 1];
    const end = next ? Math.min(next.t0 - 0.05, l.t1 + 0.9) : l.t1 + 1.5;
    return t >= l.t0 - 0.1 && t < end;
  });
  if (idx < 0) return null;
  const l = lines[idx];
  if (hide.includes(l.i)) return null;
  if (until[l.i] !== undefined && f >= until[l.i]) return null;
  const a = lin(f, fr(l.t0) - 3, fr(l.t0) + 3);
  const spoken = l.words.filter((w) => w.t0 <= t).length;
  const ws = l.text.split(" ");
  const litN = Math.round((l.words.length ? spoken / l.words.length : 1) * ws.length);
  return (
    <div style={{position: "absolute", left: 80, right: 80, top: y, textAlign: "center", opacity: a}}>
      <div style={{fontFamily: F.serif, fontWeight: 400, fontSize: 50, lineHeight: 1.3, color}}>
        {ws.map((w, k) => (
          <span key={k} style={{opacity: k < litN ? 1 : 0.3, transition: "none"}}>
            {w}{k < ws.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
      {l.ref ? (
        <div style={{marginTop: 16, fontFamily: F.mono, fontSize: 21, letterSpacing: "0.1em", color: C.bone2, opacity: 0.8}}>
          {l.ref} · Bíblia Livre
        </div>
      ) : null}
    </div>
  );
};

// a verse set large, words landing as they are spoken
const Spoken: React.FC<{i: number; size: number; top: number; color?: string; weight?: number; lh?: number; out?: number; maxW?: number; italic?: boolean}> = ({
  i,
  size,
  top,
  color = C.bone,
  weight = 400,
  lh = 1.18,
  out,
  maxW = 920,
  italic,
}) => {
  const f = useCurrentFrame();
  const L = LINE(i);
  const gone = out !== undefined ? 1 - lin(f, out, out + 12) : 1;
  const ws = L.text.split(" ");
  const n = L.words.length;
  return (
    <div style={{position: "absolute", left: (W - maxW) / 2, width: maxW, top, textAlign: "center", opacity: gone, fontFamily: F.serif, fontWeight: weight, fontStyle: italic ? "italic" : "normal", fontSize: size, lineHeight: lh, color}}>
      {ws.map((w, k) => {
        const wt = L.words[Math.min(n - 1, Math.round((k / ws.length) * n))];
        const at = fr(wt ? wt.t0 : L.t0);
        const p = sm(f, at - 2, at + 10);
        return (
          <span key={k} style={{display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 18}px)`, marginRight: k < ws.length - 1 ? "0.26em" : 0}}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------ the valley (lines 1-10)
const Valley: React.FC = () => {
  const f = useCurrentFrame();
  const tField = T0(2);
  const tDry = WF(3, "sequissimos");
  const tAsk = T0(4);
  const tAnswer = T0(5);
  const tWord = WF(6, "palavra");
  const tTremor = WF(7, "tremor");
  const tJoin = WF(7, "aproximaram");
  const tNerv = WF(8, "nervos");
  const tFlesh = WF(8, "carne");
  const tSkin = WF(8, "pele");
  const tNoSpirit = WF(8, "porem");
  const tWind = T0(9);
  const tWindEnd = WF(9, "vivam");
  const tIn = WF(10, "entrou");
  const tLived = WF(10, "viveram");
  const tStand = WF(10, "pe");
  const tArmy = WF(10, "exercito");
  const tEnd = T0(11) + 10;

  // camera: descends onto the field during line 2, then drifts; shake on "tremor"; pulls back for the army
  const descend = sm(f, tField, tField + 70);
  const drift = f * 0.12;
  const shake = interpolate(f, [tTremor, tTremor + 3, tTremor + 26], [0, 1, 0], clamp);
  const sx = shake * (random(`sx${f}`) - 0.5) * 22;
  const sy = shake * (random(`sy${f}`) - 0.5) * 22;
  const pull = sm(f, tArmy - 6, tEnd);
  const camScale = lerp(1, 0.8, pull);

  // field state
  const fieldA = sm(f, tField + 4, tField + 50) * (1 - 0.72 * sm(f, tAsk - 4, tAsk + 10) * (1 - sm(f, T0(6) - 4, T0(6) + 14)));
  const dry = sm(f, tDry - 2, tDry + 30);
  const joinP = sm(f, tJoin - 4, tJoin + 4); // when the bones start to move

  // the verse they form
  const formed = typeset(FORMED, 76, 500, F.serif, 900, 100, W / 2, 870);
  // assignment: each target glyph takes the nearest free bone with the same letter
  const used = new Set<number>();
  const assign: number[] = formed.glyphs.map((g) => {
    const want = norm(g.ch);
    let best = -1;
    let bd = 1e12;
    for (const b of FIELD) {
      if (used.has(b.k) || norm(b.ch) !== want) continue;
      const dx = b.x - g.x;
      const dy = b.y + 300 - g.y;
      const dd = dx * dx + dy * dy;
      if (dd < bd) {
        bd = dd;
        best = b.k;
      }
    }
    if (best < 0) {
      for (const b of FIELD) {
        if (!used.has(b.k)) {
          best = b.k;
          break;
        }
      }
    }
    used.add(best);
    return best;
  });
  const targetOf = new Map<number, number>();
  assign.forEach((k, gi) => targetOf.set(k, gi));

  // life of the formed text
  const sinew = sm(f, tNerv, tNerv + 16);
  const flesh = sm(f, tFlesh, tFlesh + 14);
  const skin = sm(f, tSkin, tSkin + 14);
  const grey = sm(f, tNoSpirit - 2, tNoSpirit + 16);
  const wind = lin(f, tWind, tWindEnd + 10);
  const ignite = sm(f, tIn - 2, tIn + 14);
  const lift = sm(f, tStand - 2, tStand + 18);
  const armyP = sm(f, tArmy - 4, tArmy + 60);
  const fieldFade = 1 - sm(f, tJoin + 10, tJoin + 50);

  // ring of the word (line 6): a wave that brightens the bones as it passes
  const ringR = f >= tWord ? (f - tWord) * 24 : -1;

  const bones = FIELD.map((b) => {
    const gi = targetOf.get(b.k);
    const px = b.x + sx * b.d;
    const py0 = b.y + 300 * (1 - descend) + drift * (b.d - 0.4) + sy * b.d;
    let x = px;
    let y = py0;
    let rot = b.r;
    let op = (0.42 + 0.5 * (b.d - 0.55)) * fieldA;
    let size = b.s;
    let fill = C.bone;
    // dry: a little dimmer and more tilted
    op *= 1 - 0.25 * dry;
    rot += dry * (random(`dr${b.k}`) - 0.5) * 30;
    // the word passes
    if (ringR > 0) {
      const dist = Math.hypot(x - W / 2, y - 760);
      const w = Math.exp(-((dist - ringR) * (dist - ringR)) / (2 * 90 * 90));
      op = Math.min(1, op + 0.7 * w);
      if (w > 0.5) fill = C.gold2;
    }
    if (gi !== undefined) {
      const g = formed.glyphs[gi];
      const stag = random(`st${b.k}`) * 14;
      const p = sm(f, tJoin + stag, tJoin + stag + 26);
      const arc = Math.sin(Math.PI * p) * (60 + 40 * random(`ar${b.k}`));
      x = lerp(x, g.x, p);
      y = lerp(y, g.y, p) - arc;
      rot = lerp(rot, 0, p);
      size = lerp(size, 76, p);
      op = lerp(op, 1, p);
      if (p > 0.999) return null; // drawn by the formed layer
      fill = p > 0.3 ? C.bone : fill;
    } else if (joinP > 0) {
      // the others scatter out as dust
      const ang = Math.atan2(y - 900, x - W / 2);
      const push = sm(f, tJoin + 6, tJoin + 50) * (260 + 500 * random(`pu${b.k}`));
      x += Math.cos(ang) * push;
      y += Math.sin(ang) * push;
      op *= fieldFade;
    }
    if (op <= 0.01) return null;
    return (
      <text key={b.k} x={x} y={y} fontFamily={F.serif} fontWeight={500} fontSize={size} fill={fill} opacity={op} transform={`rotate(${rot} ${x} ${y})`}>
        {b.ch}
      </text>
    );
  });

  // the formed verse, glyph by glyph (after each bone has landed)
  const formedGlyphs = formed.glyphs.map((g, gi) => {
    const k = assign[gi];
    const stag = random(`st${k}`) * 14;
    const p = sm(f, tJoin + stag, tJoin + stag + 26);
    if (p < 0.999) return null;
    const ripple = wind > 0 && wind < 1 ? Math.sin((g.x / 90 - (f - tWind) / 3.2) * 1.2) * 14 * Math.sin(Math.PI * wind) : 0;
    const settle = grey * (3 + 2 * random(`sg${gi}`));
    const y = g.y + ripple + settle - lift * 60;
    const fillC = ignite > 0.5 ? C.gold2 : grey > 0.5 ? C.ash : flesh > 0.5 ? C.flesh : C.bone;
    const glow = ignite * 18 + skin * (1 - grey) * 8;
    return (
      <text
        key={gi}
        x={g.x}
        y={y}
        fontFamily={F.serif}
        fontWeight={500}
        fontSize={76}
        fill={fillC}
        opacity={1 - grey * 0.35 + ignite * 0.35}
        style={{filter: glow > 0 ? `drop-shadow(0 0 ${glow}px ${ignite > 0.5 ? C.gold : C.flesh})` : undefined}}
      >
        {g.ch}
      </text>
    );
  });

  // sinews: threads drawn from letter to letter along each row, under the words
  const sinews = sinew > 0 && grey < 1 ? formed.words.map((w, k) => (
    <line
      key={k}
      x1={w.x}
      x2={w.x + w.width}
      y1={w.y + 16}
      y2={w.y + 16}
      pathLength={1}
      stroke={C.sinew}
      strokeWidth={3}
      strokeDasharray="1 1"
      strokeDashoffset={1 - sm(f, tNerv + k * 2, tNerv + k * 2 + 14)}
      opacity={(1 - 0.8 * grey) * (1 - ignite)}
    />
  )) : null;

  // the army: every line of the chapter stands up from the floor
  const rows = armyP > 0 ? (() => {
    const text = CHAP;
    const rowsOut: React.ReactNode[] = [];
    const per = 32;
    const n = Math.ceil(text.length / per);
    for (let r = 0; r < n; r++) {
      const s = text.slice(r * per, (r + 1) * per);
      const stag = (r % 7) * 2 + random(`rw${r}`) * 6;
      const p = sm(f, tArmy + stag, tArmy + stag + 30);
      const y = 1500 - r * 58 + (1 - p) * 520;
      if (p <= 0) continue;
      rowsOut.push(
        <text key={r} x={W / 2} y={y} textAnchor="middle" fontFamily={F.serif} fontWeight={500} fontSize={44} fill={C.gold2} opacity={p * (0.7 + 0.3 * random(`ro${r}`))}>
          {s}
        </text>,
      );
    }
    return rowsOut;
  })() : null;

  const titleOut = T0(2) + 20;
  const askA = sm(f, tAsk - 2, tAsk + 8) * (1 - sm(f, T0(6) - 6, T0(6) + 6));
  return (
    <AbsoluteFill>
      <Ground />
      <Light a={0.25 + 0.55 * sm(f, 0, 50) * (1 - 0.6 * sm(f, tField, tField + 40)) + 0.6 * ignite} spread={1.1} />
      <AbsoluteFill style={{transformOrigin: "50% 48%", transform: `scale(${camScale})`}}>
        <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0}}>
          <g>{bones}</g>
          {sinews}
          <g>{formedGlyphs}</g>
          {rows}
        </svg>
      </AbsoluteFill>
      {/* the four winds: streams of light from the corners through the text */}
      {wind > 0 && wind < 1
        ? [
            [-60, 300, 540, 900],
            [1140, 300, 540, 900],
            [-60, 1600, 540, 960],
            [1140, 1600, 540, 960],
          ].map(([x0, y0, x1, y1], k) => <Gust key={k} from={[x0, y0]} to={[x1, y1]} p={wind} seed={`w${k}`} delay={k * 0.08} />)
        : null}
      <Dust n={36} a={0.6 * fieldA} />
      <AbsoluteFill style={{background: "linear-gradient(180deg, rgba(6,9,15,0) 62%, rgba(6,9,15,0.75) 78%, rgba(6,9,15,0.85) 100%)", opacity: fieldA}} />
      <Spoken i={1} size={92} top={620} weight={500} out={titleOut} lh={1.1} />
      {askA > 0 ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 0, opacity: askA}}>
          <Rings start={tAsk} />
          <Spoken i={4} size={84} top={560} color={C.gold2} weight={500} lh={1.15} />
        </div>
      ) : null}
      {f >= tAnswer - 4 && f < T0(6) + 6 ? <Spoken i={5} size={52} top={1150} color={C.bone2} italic /> : null}
      {f >= T0(6) - 4 && f < tTremor ? <Spoken i={6} size={56} top={540} color={C.bone} /> : null}
      <Voice hide={[1, 4, 5, 6, 7]} />
      <Grain />
    </AbsoluteFill>
  );
};

// a stream of light with sparks, from -> to, alive while 0 < p < 1
const Gust: React.FC<{from: [number, number]; to: [number, number]; p: number; seed: string; delay?: number}> = ({from, to, p, seed, delay = 0}) => {
  const f = useCurrentFrame();
  const q = Math.min(1, Math.max(0, (p - delay) / (1 - delay)));
  if (q <= 0) return null;
  const a = Math.sin(Math.PI * q);
  const [x0, y0] = from;
  const [x1, y1] = to;
  const dx = x1 - x0,
    dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  const nx = -dy / L,
    ny = dx / L;
  return (
    <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: a}}>
      {Array.from({length: 2}).map((_, s) => {
        const c = (70 + 70 * random(`${seed}c${s}`)) * (s % 2 ? -1 : 1);
        const off = (s - 0.5) * 40;
        const d = `M ${x0 + nx * off} ${y0 + ny * off} C ${x0 + dx * 0.35 + nx * c} ${y0 + dy * 0.35 + ny * c}, ${x0 + dx * 0.7 - nx * c} ${y0 + dy * 0.7 - ny * c}, ${x1} ${y1}`;
        return (
          <g key={s}>
            <path d={d} pathLength={1} fill="none" stroke={C.gold2} strokeWidth={3.5} strokeLinecap="round" strokeDasharray="0.06 0.07" strokeDashoffset={-f * 0.06} opacity={0.55} style={{filter: `drop-shadow(0 0 10px ${C.gold})`}} />
            <path d={d} pathLength={1} fill="none" stroke={C.gold2} strokeWidth={2} strokeLinecap="round" strokeDasharray="0.02 0.05" strokeDashoffset={-f * 0.09} opacity={0.6} />
          </g>
        );
      })}
    </svg>
  );
};

// the voice from above: rings opening downwards
const Rings: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame() - start;
  if (f < 0) return null;
  return (
    <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none"}}>
      {Array.from({length: 4}).map((_, i) => {
        const t = ((f + i * 14) % 56) / 56;
        const r = 60 + t * 1100;
        return <ellipse key={i} cx={W / 2} cy={-80} rx={r} ry={r * 0.6} fill="none" stroke={C.gold2} strokeWidth={6 * (1 - t) + 1} opacity={(1 - t) * 0.5} />;
      })}
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ the river (lines 11-16)
const CH47 = data.ch47.map((v) => v.text);
const RIVER_ROWS = (() => {
  const text = CH47.join(" ");
  const per = 38;
  const out: string[] = [];
  for (let r = 0; r < Math.min(16, Math.ceil(text.length / per)); r++) out.push(text.slice(r * per, (r + 1) * per));
  return out;
})();

const River: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame();
  if (f < start) return null;
  const tBridge = T0(11);
  const tDoor = T0(12);
  const tWater = WF(12, "aguas");
  const tM1 = WF(13, "tornozelos");
  const tM2 = WF(13, "joelhos");
  const tM3 = WF(13, "cintura");
  const tRio = WF(14, "rio");
  const tSwim = WF(14, "nado");
  const tLife = T0(15);
  const tClose = T0(16);

  // chapter counter 37 -> 47
  const count = Math.round(interpolate(f, [tBridge + 6, tDoor - 8], [data.chFrom, data.chTo], {...clamp, easing: Easing.inOut(Easing.cubic)}));
  const bridgeA = sm(f, tBridge, tBridge + 8) * (1 - sm(f, tDoor - 6, tDoor + 6));

  // the water level (screen y of the surface)
  const FLOOR = 1900;
  const marks = {tornozelos: FLOOR - 110, joelhos: FLOOR - 330, cintura: FLOOR - 600};
  const level = interpolate(
    f,
    [tWater, tWater + 30, tM1 - 2, tM1 + 14, tM2 - 2, tM2 + 14, tM3 - 2, tM3 + 14, tRio - 6, tRio + 40],
    [H + 60, FLOOR, FLOOR, marks.tornozelos, marks.tornozelos, marks.joelhos, marks.joelhos, marks.cintura, marks.cintura, -200],
    {...clamp, easing: Easing.inOut(Easing.quad)},
  );
  const under = sm(f, tRio + 20, tRio + 44); // camera under the river
  const doorA = sm(f, tDoor, tDoor + 20) * (1 - under);
  const thread = sm(f, tWater, tWater + 24);
  const surf: string[] = [];
  for (let x = -20; x <= W + 20; x += 20) surf.push(`${x},${(level + 10 * Math.sin(x / 90 + f / 7) + 5 * Math.sin(x / 37 - f / 11)).toFixed(1)}`);
  const surfacePath = `M ${surf.join(" L ")}`;
  const belowClip = `polygon(${surf.map((q) => q.split(",").map((v) => v + "px").join(" ")).join(", ")}, ${W + 20}px ${H + 40}px, -20px ${H + 40}px)`;
  const aboveClip = `polygon(-20px -40px, ${W + 20}px -40px, ${surf
    .slice()
    .reverse()
    .map((q) => q.split(",").map((v) => v + "px").join(" "))
    .join(", ")})`;

  // the text of the chapter standing in the scene (bone above the water, river-cyan and refracted below)
  const rowsEl = (fill: string, op: number) => (
    <g>
      {RIVER_ROWS.map((s, r) => {
        const a = sm(f, tDoor + 10 + r * 3, tDoor + 30 + r * 3);
        const float = under * Math.sin(f / 13 + r) * 10;
        const gone = 1 - sm(f, tLife - 8, tLife + 8);
        return (
          <text key={r} x={W / 2} y={760 + r * 46 + float} textAnchor="middle" fontFamily={F.serif} fontWeight={500} fontSize={30} fill={fill} opacity={a * op * gone}>
            {s}
          </text>
        );
      })}
    </g>
  );
  // the ruler: a thousand cubits per mark
  const rulerA = sm(f, T0(13) - 6, T0(13) + 10) * (1 - under);
  const marksEl = (
    <g opacity={rulerA}>
      <line x1={990} x2={990} y1={FLOOR} y2={600} stroke={C.bone2} strokeWidth={2} opacity={0.6} />
      <text x={990} y={578} fontFamily={F.mono} fontSize={19} fill={C.bone2} opacity={0.85} textAnchor="middle">côvados</text>
      {[[FLOOR, "0"], [marks.tornozelos, "1.000"], [marks.joelhos, "2.000"], [marks.cintura, "3.000"], [620, "4.000"]].map(([y, lab], k) => (
        <g key={k}>
          <line x1={976} x2={1004} y1={y as number} y2={y as number} stroke={C.bone2} strokeWidth={2} opacity={0.8} />
          <text x={968} y={(y as number) - 10} fontFamily={F.mono} fontSize={19} fill={C.bone2} opacity={0.85} textAnchor="end">
            {lab}
          </text>
        </g>
      ))}
    </g>
  );
  const label = (text: string, y: number, at: number) => {
    const p = sm(f, at, at + 10) * (1 - sm(f, tRio - 10, tRio));
    if (p <= 0) return null;
    return (
      <div key={text} style={{position: "absolute", left: 70, top: y - 28, display: "flex", alignItems: "center", gap: 14, opacity: p}}>
        <div style={{fontFamily: F.serif, fontStyle: "italic", fontSize: 40, color: C.cyan2}}>{text}</div>
        <div style={{width: 70, height: 2, background: C.cyan2, opacity: 0.7}} />
      </div>
    );
  };
  const closeA = sm(f, tClose - 2, tClose + 10);
  return (
    <AbsoluteFill>
      <Ground tint={lerp(0, 1, under) > 0.5 ? C.deep : C.ground2} />
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.deep} 0%, ${C.ground} 100%)`, opacity: under}} />
      <Light a={0.35 * (1 - under) + 0.5 * under} color={under > 0.5 ? "140,230,255" : "255,230,170"} spread={1.2} />
      {/* caustics under the river */}
      {under > 0 ? <Caustics a={under} /> : null}
      <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0}}>
        <defs>
          <filter id="refr" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.028" numOctaves={2} seed={Math.floor(f / 2)} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={16 + 10 * under} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.cyan} stopOpacity={0.55} />
            <stop offset="100%" stopColor={C.deep} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        {/* the threshold: a doorway of light, and the thread of water that leaves it */}
        <g opacity={doorA}>
          <rect x={430} y={250} width={220} height={400} fill="none" stroke={C.gold2} strokeWidth={3} opacity={0.8} style={{filter: `drop-shadow(0 0 14px ${C.gold})`}} />
          <rect x={436} y={256} width={208} height={388} fill="rgba(255,230,170,0.06)" />
          <path d={`M 540 650 C 536 800, 560 1000, 530 1200 C 505 1400, 560 1600, 540 ${FLOOR}`} pathLength={1} fill="none" stroke={C.cyan2} strokeWidth={4} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - thread} opacity={0.9} style={{filter: `drop-shadow(0 0 8px ${C.cyan})`}} />
        </g>
        {marksEl}
        {/* above the surface */}
        <g style={{clipPath: aboveClip}}>{rowsEl(C.bone, 0.9)}</g>
        {/* the water, and the same text under it, refracted */}
        <path d={`${surfacePath} L ${W + 20} ${H + 40} L -20 ${H + 40} Z`} fill="url(#wg)" opacity={1 - 0.6 * under} />
        <g style={{clipPath: belowClip}} filter="url(#refr)">
          {rowsEl(C.cyan2, 0.9)}
        </g>
        <path d={surfacePath} fill="none" stroke={C.cyan2} strokeWidth={3} opacity={0.9 * (1 - under)} style={{filter: `drop-shadow(0 0 10px ${C.cyan})`}} />
      </svg>
      {under > 0 ? <Bubbles a={under} /> : null}
      {label("tornozelos", marks.tornozelos, tM1)}
      {label("joelhos", marks.joelhos, tM2)}
      {label("cintura", marks.cintura, tM3)}
      {/* bridge: the chapter counter */}
      {bridgeA > 0 ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", opacity: bridgeA}}>
          <div style={{fontFamily: F.mono, fontSize: 26, letterSpacing: "0.25em", color: C.bone2}}>EZEQUIEL · CAPÍTULO</div>
          <div style={{fontFamily: F.serif, fontWeight: 500, fontSize: 260, lineHeight: 1, color: C.bone, marginTop: 10}}>{count}</div>
          <div style={{fontFamily: F.mono, fontSize: 24, letterSpacing: "0.2em", color: C.gold2, marginTop: 18, opacity: sm(f, tDoor - 40, tDoor - 28)}}>
            +{data.between} CAPÍTULOS
          </div>
        </div>
      ) : null}
      {f >= tLife - 4 && f < tClose + 8 ? <Spoken i={15} size={74} top={640} color={C.white} weight={500} lh={1.2} out={tClose - 4} /> : null}
      {closeA > 0 ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 0}}>
          <Spoken i={16} size={78} top={700} color={C.gold2} weight={500} lh={1.2} />
          <div style={{position: "absolute", left: 0, right: 0, top: 1060, textAlign: "center", fontFamily: F.mono, fontSize: 24, letterSpacing: "0.2em", color: C.bone2, opacity: sm(f, tClose + 40, tClose + 60)}}>
            EZEQUIEL {data.chFrom} → {data.chTo}
          </div>
          <div style={{position: "absolute", left: 90, right: 90, top: 1620, textAlign: "center", fontFamily: F.mono, fontSize: 19, lineHeight: 1.6, color: C.bone2, opacity: 0.75 * sm(f, tClose + 50, tClose + 70)}}>
            Texto: Bíblia Livre (CC BY 4.0) · as letras na tela são as do próprio capítulo · narração gerada por IA · Bíblia Conectada
          </div>
        </div>
      ) : null}
      <Voice hide={[11, 15, 16]} color={under > 0.5 ? C.white : C.bone} y={1470} />
      <Grain a={0.045} />
    </AbsoluteFill>
  );
};

const Caustics: React.FC<{a: number}> = ({a}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: 0.16 * a, mixBlendMode: "screen"}}>
      <defs>
        <filter id="caus">
          <feTurbulence type="turbulence" baseFrequency="0.012 0.02" numOctaves={2} seed={Math.floor(f / 4)} />
          <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.85  0 0 0 0 1  0 0 0 1.6 -0.5" />
        </filter>
      </defs>
      <rect width={W} height={H} filter="url(#caus)" />
    </svg>
  );
};

const Bubbles: React.FC<{a: number}> = ({a}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: a}}>
      {Array.from({length: 26}).map((_, i) => {
        const x0 = random(`bx${i}`) * W;
        const sp = 1.2 + random(`bs${i}`) * 2;
        const r = 3 + random(`br${i}`) * 7;
        const y = ((random(`by${i}`) * H - f * sp) % H + H) % H;
        const x = x0 + Math.sin((f + i * 20) / 18) * 10;
        return <circle key={i} cx={x} cy={y} r={r} fill="none" stroke={C.cyan2} strokeWidth={1.5} opacity={0.5} />;
      })}
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ timeline
const XF = 10;
export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const riverStart = T0(11) - 6;
  return (
    <AbsoluteFill style={{backgroundColor: C.ground}}>
      {f < riverStart + XF ? (
        <AbsoluteFill style={{opacity: 1 - lin(f, riverStart, riverStart + XF)}}>
          <Valley />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{opacity: lin(f, riverStart, riverStart + XF)}}>
        <River start={riverStart} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
