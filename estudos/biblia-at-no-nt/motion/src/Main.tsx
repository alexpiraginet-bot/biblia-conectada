import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F} from "./theme";

// "O Antigo dentro do Novo" (video 6). One chart lives under the whole film: 67.293 real OT -> NT pairs drawn as light
// (tools/layers.py), with a camera that zooms, scrolls and whips between books on the words of the narration.
// Every number and quote on screen comes from data.json (tools/analyze.py + BLIVRE); positions from data.layout.
const FPS = data.fps;
const LAY = data.layout;
type Line = (typeof data.lines)[number];
const LINE = (i: number): Line => data.lines.find((l) => l.i === i)!;
const T = (i: number) => LINE(i).t0;
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const wordT = (i: number, w: string, nth = 0): number => {
  const hits = LINE(i).words.filter((x) => norm(x.w).startsWith(norm(w)));
  return (hits[nth] ?? hits[0] ?? {t0: LINE(i).t0}).t0;
};
const afterT = (i: number, w: string): number => {
  const ws = LINE(i).words;
  const k = ws.findIndex((x) => norm(x.w).startsWith(norm(w)));
  return k >= 0 && k + 1 < ws.length ? ws[k + 1].t0 : LINE(i).t0;
};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const ramp = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], {...clamp, easing: ease});
const win = (t: number, a: number, b: number, fade = 0.35) =>
  Math.min(interpolate(t, [a - fade, a], [0, 1], clamp), interpolate(t, [b, b + fade], [1, 0], clamp));

const BG = "#051219";
const BLUE = "#7FB6FF";
const ORANGE = "#FF9A3D";
const GOLD = C.gold;
const INK = C.skyInk;

// ------------------------------------------------------------------------------------------------------ geometry
const OTX = LAY.otX, NTX = LAY.ntX, KK = LAY.k;
const bez = (y0: number, y1: number, u: number): [number, number] => {
  const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u ** 2, d = u ** 3;
  const dx = NTX - OTX;
  return [a * OTX + b * (OTX + KK * dx) + c * (NTX - KK * dx) + d * NTX, (a + b) * y0 + (c + d) * y1];
};
const OTY = LAY.ot.map((b) => b.y);
const NTY = LAY.nt.map((b) => b.y);
const iPs = LAY.ot.findIndex((b) => b.pt === "Salmos");
const iIs = LAY.ot.findIndex((b) => b.pt === "Isaías");
const iMal = LAY.ot.length - 1;
const iMt = 0;
const curve = (key: string) => (LAY.curves as Record<string, number[][]>)[key];
const pathOf = (pts: number[][]) => "M" + pts.map(([x, y]) => `${x},${y}`).join(" L");

// ------------------------------------------------------------------------------------------------------ the camera
type KF = [number, number, number, number]; // time, centre x, centre y (chart units), scale
const FULL: [number, number, number] = [540, 782, 0.92]; // the chart under a headline (frame 0 framing)
const buildCam = (): KF[] => {
  const k: KF[] = [];
  const add = (t: number, c: [number, number, number]) => k.push([t, c[0], c[1], c[2]]);
  const tPs = wordT(9, "salmos"), tOnze = afterT(9, "salmos"), tMal = wordT(11, "malaquias"), tMt = wordT(12, "mateus");
  const isa61 = curve("Isa.61.1~Luke.4.18")[0];
  add(0, [540, 1000, 1.3]);                   // the cover: the weave fills the frame under the hook
  add(T(2) - 0.15, [540, 960, 1.22]);
  add(T(3) - 0.1, FULL);
  add(T(3) + 1.3, [540, 410, 1.5]);
  add(T(6) - 0.05, [540, 400, 1.56]);
  add(T(6) + 0.9, FULL);
  add(T(7), FULL);
  add(T(7) + 0.8, [600, 760, 1.0]);
  add(T(8), [600, 760, 1.0]);
  add(T(8) + 0.75, [330, OTY[0], 2.3]);
  add(tPs, [330, OTY[iPs], 2.3]);
  add(tPs + 0.18, [330, OTY[iPs], 2.8]);
  add(tPs + 0.55, [330, OTY[iPs], 2.6]);
  add(tOnze, [340, OTY[iPs], 2.5]);
  add(tOnze + 1.0, [560, OTY[iPs] + 40, 1.3]);
  add(T(10), [560, OTY[iPs] + 40, 1.3]);
  add(T(10) + 0.6, [560, OTY[iIs], 1.3]);
  add(Math.max(T(11) + 0.8, tMal - 0.9), [560, OTY[iIs] + 60, 1.3]);
  add(tMal, [470, 1500, 1.45]);
  add(T(12), [470, 1500, 1.45]);
  add(T(12) + 0.75, [760, 430, 1.55]);
  add(Math.max(T(12) + 0.8, tMt + 0.5), [760, 440, 1.6]);
  add(T(13), [760, 440, 1.6]);
  add(T(13) + 0.9, FULL);
  add(T(14), FULL);
  add(T(15), [540, 760, 0.98]);
  add(wordT(18, "hoje") - 0.05, [isa61[0] + 60, isa61[1], 2.2]);
  add(wordT(18, "hoje") + 3.2, FULL);
  add(data.duration, [540, 770, 0.95]);
  k.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < k.length; i++) if (k[i][0] <= k[i - 1][0]) k[i][0] = k[i - 1][0] + 0.02;
  return k;
};
const CAM = buildCam();
const camAt = (t: number): [number, number, number] => {
  if (t <= CAM[0][0]) return [CAM[0][1], CAM[0][2], CAM[0][3]];
  for (let i = 0; i < CAM.length - 1; i++) {
    const a = CAM[i], b = CAM[i + 1];
    if (t <= b[0]) {
      const p = inOut((t - a[0]) / (b[0] - a[0]));
      const s = Math.exp(Math.log(a[3]) + (Math.log(b[3]) - Math.log(a[3])) * p);
      return [a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p, s];
    }
  }
  const z = CAM[CAM.length - 1];
  return [z[1], z[2], z[3]];
};
const camera = (t: number): [number, number, number] => {
  const [cx, cy, s] = camAt(t);
  // the camera never stops: a slow float and breath on top of the moves
  return [cx + Math.sin(t * 0.55) * 5 / s, cy + Math.cos(t * 0.43) * 7 / s, s * (1 + 0.012 * Math.sin(t * 0.7))];
};

// ------------------------------------------------------------------------------------------------------ the chart
const Layer: React.FC<{name: string; opacity: number; sweep?: number; blend?: boolean}> = ({name, opacity, sweep, blend}) => {
  if (opacity <= 0.001) return null;
  const right = sweep === undefined ? 0 : Math.max(0, (1080 - (OTX - 8 + sweep * (NTX - OTX + 24))) / 1080) * 100;
  return (
    <Img
      src={staticFile(`layers/${name}.png`)}
      style={{
        position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity,
        clipPath: sweep === undefined ? undefined : `inset(0 ${right}% 0 0)`,
        mixBlendMode: blend ? "screen" : undefined,
      }}
    />
  );
};

const Pulses: React.FC<{t: number; set: number[][]; color: string; amount: number; speed?: number; r?: number}> = ({
  t, set, color, amount, speed = 0.32, r = 2.4,
}) => {
  if (amount <= 0.01) return null;
  return (
    <g opacity={amount}>
      {set.map(([y0, y1], i) => {
        const sp = speed * (0.7 + random(`ps${i}`) * 0.8);
        const u = (t * sp + random(`pp${i}`)) % 1;
        const [x, y] = bez(y0, y1, u);
        const fade = Math.min(1, u * 8, (1 - u) * 8);
        return (
          <g key={i} opacity={fade}>
            <circle cx={x} cy={y} r={r * 3.2} fill={color} opacity={0.18} />
            <circle cx={x} cy={y} r={r} fill="#FFFFFF" />
          </g>
        );
      })}
    </g>
  );
};

const Thread: React.FC<{d: string; p: number; color: string; width?: number; glow?: number}> = ({d, p, color, width = 3, glow = 1}) =>
  p <= 0 ? null : (
    <g>
      <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} stroke={color} strokeWidth={width * 5}
        strokeOpacity={0.16 * glow} fill="none" strokeLinecap="round" />
      <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} stroke={color} strokeWidth={width * 2.2}
        strokeOpacity={0.35 * glow} fill="none" strokeLinecap="round" />
      <path d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} stroke="#FFF8EA" strokeWidth={width}
        fill="none" strokeLinecap="round" />
    </g>
  );

const Chip: React.FC<{x: number; y: number; text: string; a: number; side: "l" | "r"; color?: string; size?: number}> = ({
  x, y, text, a, side, color = GOLD, size = 22,
}) =>
  a <= 0 ? null : (
    <div
      style={{
        position: "absolute", top: y - size * 0.95, ...(side === "l" ? {right: 1080 - x + 14} : {left: x + 14}),
        opacity: a, translate: `${(1 - a) * (side === "l" ? -14 : 14)}px 0px`,
        fontFamily: F.ui, fontWeight: 700, fontSize: size, color: BG, background: color, borderRadius: size,
        padding: `${size * 0.22}px ${size * 0.55}px`, whiteSpace: "nowrap", boxShadow: `0 0 ${size}px ${color}`,
      }}
    >
      {text}
    </div>
  );

const Labels: React.FC<{t: number; focus: number | null; hot: Record<string, number>; show: number}> = ({t, focus, hot, show}) => (
  <>
    {LAY.ot.map((b, i) => {
      const a = show * interpolate(t, [T(2) + i * 0.018, T(2) + 0.25 + i * 0.018], [0, 1], clamp);
      const h = hot[`ot${i}`] ?? 0;
      const f = focus === null ? 0 : Math.max(0, 1 - Math.abs(focus - i) * 0.9);
      const em = Math.max(h, f);
      return a <= 0 ? null : (
        <div key={`o${i}`} style={{position: "absolute", right: 1080 - OTX + 12, top: b.y - 13, opacity: a * (0.62 + 0.38 * em),
          display: "flex", alignItems: "baseline", gap: 7, whiteSpace: "nowrap", transformOrigin: "100% 50%", scale: String(1 + 0.25 * em)}}>
          <span style={{fontFamily: F.mono, fontSize: 13, color: em > 0.5 ? GOLD : "rgba(231,197,136,0.75)"}}>{fmt(b.links)}</span>
          <span style={{fontFamily: F.ui, fontWeight: 600, fontSize: 19, color: em > 0.5 ? "#FFFFFF" : INK}}>{b.pt}</span>
        </div>
      );
    })}
    {LAY.nt.map((b, j) => {
      const a = show * interpolate(t, [T(2) + 0.1 + j * 0.022, T(2) + 0.35 + j * 0.022], [0, 1], clamp);
      const em = hot[`nt${j}`] ?? 0;
      return a <= 0 ? null : (
        <div key={`n${j}`} style={{position: "absolute", left: NTX + 12, top: b.y - 13, opacity: a * (0.62 + 0.38 * em),
          display: "flex", alignItems: "baseline", gap: 7, whiteSpace: "nowrap", transformOrigin: "0% 50%", scale: String(1 + 0.25 * em)}}>
          <span style={{fontFamily: F.ui, fontWeight: 600, fontSize: 19, color: em > 0.5 ? "#FFFFFF" : INK}}>{b.pt}</span>
          <span style={{fontFamily: F.mono, fontSize: 13, color: em > 0.5 ? GOLD : "rgba(231,197,136,0.75)"}}>{fmt(b.links)}</span>
        </div>
      );
    })}
    {/* column heads */}
    {[0, 1].map((k) => {
      const a = show * interpolate(t, [T(2) - 0.05, T(2) + 0.35], [0, 1], {...clamp, easing: ease});
      return (
        <div key={`h${k}`} style={{position: "absolute", top: LAY.y0 - 62, ...(k === 0 ? {right: 1080 - OTX - 4} : {left: NTX - 4}),
          opacity: a, translate: `0px ${(1 - a) * 18}px`, fontFamily: F.ui, fontWeight: 700, fontSize: 24,
          letterSpacing: "0.18em", color: k === 0 ? BLUE : GOLD, textAlign: k === 0 ? "right" : "left"}}>
          {k === 0 ? "ANTIGO" : "NOVO"}
        </div>
      );
    })}
  </>
);

const Nodes: React.FC<{show: number}> = ({show}) => (
  <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0, opacity: show}}>
    {OTY.map((y, i) => <circle key={`a${i}`} cx={OTX} cy={y} r={3.2} fill={INK} opacity={0.8} />)}
    {NTY.map((y, j) => <circle key={`b${j}`} cx={NTX} cy={y} r={3.2} fill={INK} opacity={0.8} />)}
  </svg>
);

// ------------------------------------------------------------------------------------------------------ overlays
const Scrim: React.FC<{h?: number; a?: number}> = ({h = 640, a = 1}) => (
  <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: h, opacity: a, pointerEvents: "none",
    background: `linear-gradient(to bottom, ${BG} 0%, rgba(5,18,25,0.88) 45%, rgba(5,18,25,0) 100%)`}} />
);

const Kicker: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = GOLD}) => (
  <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 30, letterSpacing: "0.18em", textTransform: "uppercase", color}}>{children}</div>
);

// a headline that pops in (scale + rise) and leaves
const Head: React.FC<{t: number; a: number; b: number; children: React.ReactNode; top?: number}> = ({t, a, b, children, top = 150}) => {
  const k = win(t, a, b, 0.22);
  if (k <= 0) return null;
  const p = a <= 0 ? 1 : ramp(t, a - 0.22, a + 0.25);
  return (
    <div style={{position: "absolute", left: 70, right: 70, top, opacity: k, translate: `0px ${(1 - p) * 34}px`,
      scale: String(0.94 + 0.06 * p), transformOrigin: "50% 0%", display: "flex", flexDirection: "column", gap: 10, alignItems: "center", textAlign: "center"}}>
      {children}
    </div>
  );
};

const Big: React.FC<{children: React.ReactNode; size?: number; color?: string; font?: string}> = ({children, size = 120, color = INK, font = F.ui}) => (
  <div style={{fontFamily: font, fontWeight: 700, fontSize: size, lineHeight: 0.98, color, letterSpacing: "-0.02em",
    textShadow: `0 0 ${size * 0.35}px rgba(5,18,25,0.9)`}}>{children}</div>
);
const Sub: React.FC<{children: React.ReactNode; size?: number; color?: string}> = ({children, size = 36, color = INK}) => (
  <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: size, lineHeight: 1.2, color, maxWidth: 920}}>{children}</div>
);

const Count: React.FC<{t: number; a: number; b: number; to: number; size?: number; color?: string; suffix?: string}> = ({
  t, a, b, to, size = 150, color = GOLD, suffix = "",
}) => {
  const n = interpolate(t, [a, b], [0, to], {...clamp, easing: Easing.out(Easing.cubic)});
  const show = interpolate(t, [a - 0.06, a + 0.04], [0, 1], clamp);       // no "0" waiting on screen
  return <div style={{opacity: show, fontFamily: F.mono, fontWeight: 700, fontSize: size, lineHeight: 1, color, textShadow: `0 0 ${size * 0.3}px rgba(255,204,107,0.45)`}}>{fmt(n)}{suffix}</div>;
};

// scroll rail: where we are in the 39 books
const Rail: React.FC<{t: number; focus: number; a: number}> = ({focus, a}) =>
  a <= 0 ? null : (
    <div style={{position: "absolute", right: 34, top: 520, height: 820, width: 8, opacity: a}}>
      {LAY.ot.map((_, i) => (
        <div key={i} style={{position: "absolute", top: (i / (LAY.ot.length - 1)) * 820 - 1, right: 0, width: Math.abs(i - focus) < 0.5 ? 26 : 10,
          height: 3, borderRadius: 2, background: Math.abs(i - focus) < 0.5 ? GOLD : "rgba(242,235,221,0.35)"}} />
      ))}
      <div style={{position: "absolute", right: -6, top: (focus / (LAY.ot.length - 1)) * 820 - 9, width: 18, height: 18, borderRadius: 9,
        background: GOLD, boxShadow: `0 0 18px ${GOLD}`}} />
    </div>
  );

const GreekRow: React.FC<{label: string; words: {w: string; lit: boolean}[]; p: number; size?: number}> = ({label, words, p, size = 40}) => {
  let k = 0;
  const nl = words.filter((w) => w.lit).length;
  return (
    <div style={{display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start", textAlign: "left"}}>
      <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: "0.08em", color: "rgba(242,235,221,0.7)"}}>{label}</div>
      <div style={{fontFamily: F.greek, fontSize: size, lineHeight: 1.3, color: "rgba(242,235,221,0.55)"}}>
        {words.map((w, i) => {
          const on = w.lit && k++ < p * nl;
          return (
            <span key={i} style={{color: on ? ORANGE : undefined, textShadow: on ? `0 0 16px rgba(255,154,61,0.75)` : undefined}}>
              {w.w}{i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const Panel: React.FC<{children: React.ReactNode; a: number; top?: number}> = ({children, a, top = 120}) =>
  a <= 0 ? null : (
    <div style={{position: "absolute", left: 60, right: 60, top, opacity: a, translate: `0px ${(1 - a) * 24}px`,
      background: "rgba(5,18,25,0.86)", border: "1px solid rgba(255,154,61,0.35)", borderRadius: 28, padding: "26px 34px",
      display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 18px 60px rgba(0,0,0,0.45)"}}>
      {children}
    </div>
  );

// ------------------------------------------------------------------------------------------------------ the stage
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const [cx, cy, s] = camera(t);
  const [px, py, ps] = camera(t - 1 / FPS);
  const speed = Math.hypot((cx - px) * s, (cy - py) * s) + Math.abs(Math.log(s / ps)) * 900;
  const blur = Math.min(2.2, Math.max(0, speed - 30) * 0.04);

  const tPs = wordT(9, "salmos"), tMal = wordT(11, "malaquias"), tMt = wordT(12, "mateus"), tLar = wordT(13, "laranja");
  const tHoje = wordT(18, "hoje");
  // layers
  const dimA = interpolate(t, [T(3) + 0.1, T(3) + 0.8], [1, 0.16], clamp);
  const sweep6 = interpolate(t, [T(6) - 0.1, T(6) + 1.5], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  let blue = t < T(6) ? dimA : 0.16;
  const blueSweep = t < T(8) ? sweep6 : 0;
  if (t >= T(8)) blue = interpolate(t, [T(8), T(8) + 0.5], [1, 0.5], clamp);
  if (t >= T(13)) blue = interpolate(t, [T(13), T(13) + 0.6], [0.5, 0.22], clamp);
  if (t >= tHoje) blue = interpolate(t, [tHoje, tHoje + 1.5], [0.22, 0.1], clamp);
  const orange0 = interpolate(t, [T(3) - 0.2, T(3) + 0.4], [0.85, 0], clamp);
  const orangeSweep = t >= T(13) - 0.2 ? interpolate(t, [tLar - 0.15, tLar + 1.4], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) : 0;
  const orangeA = t < T(14) ? 1 : t < tHoje ? interpolate(t, [T(14), T(14) + 0.6], [1, 0.4], clamp) : interpolate(t, [tHoje, tHoje + 1.5], [0.4, 0.55], clamp);
  const goldSweep = interpolate(t, [tHoje - 0.05, tHoje + 1.8], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const hl = {
    psalms: win(t, tPs - 0.05, T(10) + 0.2, 0.25),
    isaiah: win(t, T(10) + 0.05, tMal - 0.6, 0.3),
    malachi: win(t, tMal - 0.15, T(12) + 0.35, 0.25),
    matthew: win(t, tMt - 0.1, T(13) + 0.5, 0.3),
  };
  // labels
  const scrollOn = t > T(8) + 0.3 && t < T(10);
  const focus = scrollOn ? (cy - LAY.y0) / ((LAY.y1 - LAY.y0) / LAY.ot.length) - 0.5 : null;
  const hot: Record<string, number> = {
    [`ot${iPs}`]: hl.psalms, [`ot${iIs}`]: hl.isaiah, [`ot${iMal}`]: hl.malachi, [`nt${iMt}`]: hl.matthew,
  };
  const labelsShow = t < T(15) ? 1 : interpolate(t, [tHoje, tHoje + 1], [0, 0.85], clamp);
  // threads
  const gj = curve("Gen.1.1~John.1.1"), im = curve("Isa.7.14~Matt.1.23"), il = curve("Isa.61.1~Luke.4.18");
  const pGJ = interpolate(t, [wordT(3, "fio") - 0.1, T(5) + 0.2], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) * win(t, T(3), T(6) + 0.4, 0.3);
  const pIM = interpolate(t, [wordT(14, "mateus") - 0.2, wordT(14, "mateus") + 1.2], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}) * win(t, T(14), T(15) + 0.5, 0.3);
  const pIL = interpolate(t, [tHoje - 0.6, tHoje + 0.6], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  // lights
  const pulseBlue = Math.max(win(t, 0, T(3) + 0.1, 0.4), win(t, T(6) + 1.2, T(8) + 0.2, 0.4) * 0.8, interpolate(t, [tHoje + 1.2, tHoje + 2.2], [0, 0.5], clamp));
  const pulseOr = Math.max(win(t, 0, T(3) + 0.1, 0.4) * 0.7, win(t, tLar + 1.2, T(15) + 0.3, 0.4));
  const pulseGold = interpolate(t, [tHoje + 0.8, tHoje + 2], [0, 1], clamp);
  // flash on the punch-in words
  const flash = Math.max(...[tPs, tMal, tMt, tHoje].map((x) => interpolate(t, [x - 0.02, x + 0.03, x + 0.25], [0, 0.22, 0], clamp)));

  return (
    <AbsoluteFill style={{backgroundColor: BG, overflow: "hidden"}}>
      <AbsoluteFill style={{background: "radial-gradient(circle 900px at 50% 45%, rgba(41,128,255,0.10), rgba(5,18,25,0) 70%)"}} />
      <div style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0",
        transform: `translate(${540 - cx * s}px, ${960 - cy * s}px) scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
        <Layer name="blue" opacity={blue} />
        <Layer name="blue" opacity={blueSweep} sweep={sweep6} />
        <Layer name="orange" opacity={orange0} />
        <Layer name="orange" opacity={orangeSweep > 0 ? orangeA : 0} sweep={orangeSweep} />
        <Layer name="gold" opacity={goldSweep > 0 ? interpolate(t, [T(19) - 0.2, T(19) + 0.6], [0.95, 0.5], clamp) : 0} sweep={goldSweep} blend />
        <Layer name="psalms" opacity={hl.psalms} blend />
        <Layer name="isaiah" opacity={hl.isaiah} blend />
        <Layer name="malachi" opacity={hl.malachi} blend />
        <Layer name="matthew" opacity={hl.matthew} blend />
        <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0, overflow: "visible"}}>
          <Pulses t={t} set={LAY.pulses} color={BLUE} amount={pulseBlue} />
          <Pulses t={t} set={LAY.litPulses} color={ORANGE} amount={pulseOr} speed={0.26} r={2.8} />
          <Pulses t={t} set={LAY.pulses} color={GOLD} amount={pulseGold} speed={0.22} />
          <Thread d={pathOf(gj)} p={pGJ} color={GOLD} width={2.6} />
          <Thread d={pathOf(im)} p={pIM} color={ORANGE} width={2.8} />
          <Thread d={pathOf(il)} p={pIL} color="#FFFFFF" width={2.6} glow={1.3} />
        </svg>
        <Nodes show={labelsShow * interpolate(t, [T(2) - 0.2, T(2) + 0.2], [0.5, 1], clamp)} />
        <Labels t={t} focus={focus} hot={hot} show={labelsShow} />
        <Chip x={gj[0][0]} y={gj[0][1] + 34} text="Gênesis 1:1" side="r" a={win(t, wordT(4, "principio") - 0.1, T(6) + 0.2, 0.25)} />
        <Chip x={gj[gj.length - 1][0]} y={gj[gj.length - 1][1] + 34} text="João 1:1" side="l" a={win(t, wordT(5, "principio") - 0.1, T(6) + 0.2, 0.25)} />
        <Chip x={im[0][0]} y={im[0][1]} text="Isaías 7:14" side="l" color={ORANGE} size={26} a={win(t, T(14), T(15) + 0.2, 0.25)} />
        <Chip x={im[im.length - 1][0]} y={im[im.length - 1][1]} text="Mateus 1:23" side="r" color={ORANGE} size={26} a={win(t, wordT(14, "mateus") + 0.8, T(15) + 0.2, 0.25)} />
        <Chip x={il[0][0]} y={il[0][1]} text="Isaías 61:1" side="l" color="#FFFFFF" size={24} a={win(t, tHoje - 0.3, data.duration, 0.25)} />
        <Chip x={il[il.length - 1][0]} y={il[il.length - 1][1]} text="Lucas 4:18" side="r" color="#FFFFFF" size={24} a={win(t, tHoje + 0.5, data.duration, 0.25)} />
      </div>
      <AbsoluteFill style={{background: "#FFFFFF", opacity: flash, pointerEvents: "none"}} />
      <Overlays t={t} focus={focus} />
    </AbsoluteFill>
  );
};

const Overlays: React.FC<{t: number; focus: number | null}> = ({t, focus}) => {
  const tPs = wordT(9, "salmos"), tMal = wordT(11, "malaquias"), tMt = wordT(12, "mateus"), tLar = wordT(13, "laranja");
  const scrimA = Math.max(win(t, -1, T(3) + 0.1, 0.3), win(t, T(5) - 0.2, T(15), 0.3), win(t, wordT(18, "hoje") + 2.2, data.duration + 1, 0.4));
  const hookP = ramp(t, -0.2, 0.15);
  const pct = data.ntShare * 100;
  const bookNow = focus === null ? 0 : Math.max(0, Math.min(LAY.ot.length - 1, Math.round(focus)));
  return (
    <>
      <Scrim h={700} a={scrimA} />
      {/* L1-2: the hook (frame 0 is the cover) */}
      <Head t={t} a={0} b={T(2) - 0.12} top={150}>
        <Big size={128}>PARECE</Big>
        <Big size={118} color={BLUE}>
          <span style={{textShadow: `0 0 ${40 * hookP}px rgba(127,182,255,0.95)`}}>FIBRA ÓPTICA.</span>
        </Big>
      </Head>
      <Head t={t} a={T(2) - 0.1} b={T(3) + 0.1} top={170}>
        <Big size={66}>MAS É O ANTIGO TESTAMENTO</Big>
        <Big size={104} color={GOLD}>DENTRO DO NOVO.</Big>
      </Head>
      {/* L3-5: one thread */}
      <Head t={t} a={T(3) + 0.3} b={T(5) - 0.25} top={190}>
        <Kicker>1 fio = 1 ligação</Kicker>
        <Sub size={40}>um versículo do Antigo → um do Novo</Sub>
      </Head>
      <Head t={t} a={T(5)} b={T(6) - 0.1} top={170}>
        <Kicker>Gênesis 1:1 → João 1:1</Kicker>
        <Count t={t} a={T(5)} b={T(5) + 0.9} to={data.famous["Gen.1.1~John.1.1"]} size={120} suffix=" votos" />
        <Sub size={32}>{`o ${data.rankGen1John1}º par mais votado entre o Antigo e o Novo`}</Sub>
      </Head>
      {/* L6: the count */}
      <Head t={t} a={T(6)} b={T(7) - 0.05} top={150}>
        <Count t={t} a={T(6) - 0.05} b={T(6) + 1.5} to={data.otNt} size={168} />
        <Sub size={40}>ligações entre o Antigo e o Novo</Sub>
      </Head>
      {/* L7: share of the NT */}
      <Head t={t} a={T(7)} b={T(8) - 0.05} top={140}>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 150, color: GOLD, lineHeight: 1}}>
          {interpolate(t, [T(7), T(7) + 1.2], [0, pct], {...clamp, easing: Easing.out(Easing.cubic)}).toFixed(1).replace(".", ",")}%
        </div>
        <div style={{width: 760, height: 16, borderRadius: 8, background: "rgba(242,235,221,0.16)", overflow: "hidden"}}>
          <div style={{width: `${interpolate(t, [T(7), T(7) + 1.2], [0, pct], {...clamp, easing: Easing.out(Easing.cubic)})}%`, height: "100%", background: GOLD}} />
        </div>
        <Sub size={32}>{`${fmt(data.ntLinked)} dos ${fmt(data.ntVerses)} versículos do Novo apontam pro Antigo`}</Sub>
      </Head>
      {/* L8: the scroll */}
      <Head t={t} a={T(8)} b={wordT(9, "salmos") - 0.1} top={140}>
        <Kicker>{`desce · livro ${bookNow + 1} de ${LAY.ot.length}`}</Kicker>
        <Big size={96}>{LAY.ot[bookNow].pt}</Big>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 52, color: GOLD}}>{fmt(LAY.ot[bookNow].links)}</div>
      </Head>
      <Rail t={t} focus={focus ?? 0} a={win(t, T(8) + 0.4, T(10), 0.3)} />
      {/* L9-12: the champions */}
      <Head t={t} a={tPs} b={T(10) - 0.05} top={140}>
        <Kicker>{`nº ${data.psalms.rank} do Antigo`}</Kicker>
        <Big size={132}>SALMOS</Big>
        <Count t={t} a={afterT(9, "salmos") - 0.05} b={afterT(9, "salmos") + 1.3} to={data.psalms.links} size={88} suffix=" ligações" />
      </Head>
      <Head t={t} a={T(10)} b={T(11) + 0.6} top={140}>
        <Kicker>{`nº ${data.isaiah.rank}`}</Kicker>
        <Big size={132}>ISAÍAS</Big>
        <Count t={t} a={T(10)} b={T(10) + 1.0} to={data.isaiah.links} size={88} suffix=" ligações" />
      </Head>
      <Head t={t} a={tMal - 0.05} b={T(12) - 0.05} top={140}>
        <Kicker>o último livro do Antigo</Kicker>
        <Big size={120}>MALAQUIAS</Big>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 64, color: GOLD}}>
          {data.malachi.per_verse.toFixed(1).replace(".", ",")} <span style={{fontFamily: F.ui, fontSize: 36, fontWeight: 500, color: INK}}>ligações por versículo</span>
        </div>
        <Sub size={30}>{`o mais denso do Antigo · ${data.malachi.next}: ${data.malachi.next_per_verse.toFixed(1).replace(".", ",")}`}</Sub>
      </Head>
      <Head t={t} a={tMt - 0.05} b={T(13) - 0.05} top={140}>
        <Kicker color={BLUE}>do outro lado</Kicker>
        <Big size={132}>MATEUS</Big>
        <Count t={t} a={tMt} b={tMt + 1.0} to={data.matthew.links} size={88} suffix=" ligações" />
      </Head>
      {/* L13: orange */}
      <Head t={t} a={tLar - 0.1} b={T(14) + 0.1} top={130}>
        <Kicker color={ORANGE}>em laranja</Kicker>
        <Big size={60}>palavra por palavra, no grego</Big>
        <Count t={t} a={tLar + 0.1} b={tLar + 1.4} to={data.literal.pairs} size={84} color={ORANGE} suffix=" pares" />
        <Sub size={21} color="rgba(242,235,221,0.75)">{`${data.literal.nGram}+ palavras iguais em sequência · Septuaginta × Novo Testamento grego (SBLGNT) · ligação confirmada na OpenBible`}</Sub>
      </Head>
      {/* L14: Is 7:14 -> Mt 1:23 in Greek */}
      <Panel a={win(t, T(14) + 0.1, T(15) - 0.05, 0.25)} top={110}>
        <GreekRow label="ISAÍAS 7:14 · SEPTUAGINTA" words={data.greek714.lxx} p={ramp(t, T(14) + 0.3, wordT(14, "mateus"))} size={38} />
        <GreekRow label="MATEUS 1:23 · NOVO TESTAMENTO GREGO" words={data.greek714.nt} p={ramp(t, wordT(14, "mateus"), wordT(14, "eis") + 0.8)} size={38} />
        <div style={{fontFamily: F.ui, fontSize: 28, color: ORANGE, fontWeight: 600}}>{`${data.greek714.nLit} palavras iguais, na mesma ordem`}</div>
      </Panel>
    </>
  );
};

// ------------------------------------------------------------------------------------------------------ Luke 4
const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{backgroundImage: `url(${staticFile("img/grain.png")})`, backgroundSize: "512px 512px",
      backgroundPosition: `${Math.floor(random(`gx${k}`) * 512)}px ${Math.floor(random(`gy${k}`) * 512)}px`,
      mixBlendMode: "multiply", opacity, pointerEvents: "none"}} />
  );
};

const Illus: React.FC<{src: string; dur: number; z?: [number, number]; x?: [number, number]; y?: [number, number]; origin?: string}> = ({
  src, dur, z = [1.0, 1.1], x = [0, 0], y = [0, 0], origin = "50% 50%",
}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
  const k = Math.floor(f / 3);
  return (
    <AbsoluteFill style={{overflow: "hidden", backgroundColor: C.paper}}>
      <Img src={staticFile(`img/${src}`)} style={{width: "100%", height: "100%", objectFit: "cover", transformOrigin: origin,
        scale: String(z[0] + (z[1] - z[0]) * p),
        translate: `${x[0] + (x[1] - x[0]) * p + (random(`jx${src}${k}`) - 0.5) * 2.4}px ${y[0] + (y[1] - y[0]) * p + (random(`jy${src}${k}`) - 0.5) * 2.4}px`,
        rotate: `${(random(`jr${src}${k}`) - 0.5) * 0.22}deg`}} />
    </AbsoluteFill>
  );
};

const Tag: React.FC = () => (
  <div style={{position: "absolute", right: 60, top: 70, fontFamily: F.mono, fontSize: 22, letterSpacing: "0.12em", color: "rgba(14,30,26,0.6)"}}>
    ILUSTRAÇÃO
  </div>
);

const S_Scroll: React.FC<{dur: number; start: number}> = ({dur, start}) => {
  const f = useCurrentFrame();
  const t = start / FPS + f / FPS;
  const leu = wordT(16, "leu");
  return (
    <AbsoluteFill>
      <Illus src="scroll.jpg" dur={dur} z={[1.0, 1.32]} origin="58% 40%" />
      <AbsoluteFill style={{background: "radial-gradient(circle 520px at 58% 40%, rgba(255,204,107,0.22), rgba(255,204,107,0) 70%)", mixBlendMode: "screen"}} />
      <Grain />
      <Tag />
      <div style={{position: "absolute", left: 70, top: 120, opacity: win(t, T(15), leu - 0.1, 0.25)}}>
        <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 30, letterSpacing: "0.18em", color: C.bronze}}>LUCAS 4 · NAZARÉ</div>
      </div>
      <Panel a={win(t, leu, T(17) - 0.05, 0.25)} top={110}>
        <GreekRow label="LUCAS 4:18 · NOVO TESTAMENTO GREGO" words={data.greek611.nt} p={ramp(t, leu + 0.2, T(17) - 0.6)} size={36} />
        <div style={{fontFamily: F.ui, fontSize: 28, color: ORANGE, fontWeight: 600}}>
          {`${data.greek611.nLit} das ${data.greek611.nNt} palavras gregas estão em Isaías 61:1 (Septuaginta)`}
        </div>
      </Panel>
    </AbsoluteFill>
  );
};

const S_Eyes: React.FC<{dur: number}> = ({dur}) => (
  <AbsoluteFill>
    <Illus src="eyes.jpg" dur={dur} z={[1.0, 1.22]} y={[0, 40]} origin="42% 28%" />
    <AbsoluteFill style={{background: "radial-gradient(circle 600px at 42% 26%, rgba(255,204,107,0.25), rgba(255,204,107,0) 70%)", mixBlendMode: "screen"}} />
    <Grain />
    <Tag />
  </AbsoluteFill>
);

// ------------------------------------------------------------------------------------------------------ the end
const End: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame();
  const t = start / FPS + f / FPS;
  const a = ramp(t, T(19) - 0.1, T(19) + 0.4);
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      <div style={{position: "absolute", left: 70, right: 70, top: 150, opacity: a, translate: `0px ${(1 - a) * 30}px`, textAlign: "center",
        display: "flex", flexDirection: "column", gap: 18, alignItems: "center"}}>
        <Kicker>{`${fmt(data.otNt)} ligações · ${data.otBooks} + ${data.ntBooks} livros`}</Kicker>
        <Big size={84}>Qual livro do Antigo você ainda não leu?</Big>
        <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 56, color: GOLD}}>Comenta.</div>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1500, height: 420, opacity: a,
        background: `linear-gradient(to bottom, rgba(5,18,25,0) 0%, ${BG} 32%)`}} />
      <div style={{position: "absolute", left: 80, right: 80, top: 1640, opacity: a, fontFamily: F.mono, fontSize: 20, lineHeight: 1.5,
        color: "rgba(242,235,221,0.8)", textAlign: "center"}}>
        Ligações e votos: OpenBible.info (CC BY), em Bíblia Conectada · Grego: SBLGNT/MorphGNT e Septuaginta (domínio público) ·
        Texto: Bíblia Livre (CC BY 4.0) · Ilustrações geradas por IA · Gráfico inspirado no de Ben Gladd (Carson Center)
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------------ captions
const Captions: React.FC<{hide: number[]}> = ({hide}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const lines = data.lines;
  const idx = lines.findIndex((l, k) => {
    const next = lines[k + 1];
    const end = next ? Math.min(next.t0 - 0.05, l.t1 + 1.0) : l.t1 + 1.6;
    return t >= l.t0 - 0.12 && t < end;
  });
  if (idx < 0) return null;
  const l = lines[idx];
  if (hide.includes(l.i)) return null;
  const a = interpolate(t, [l.t0 - 0.12, l.t0 + 0.05], [0, 1], clamp);
  const q = l.quote;
  const words = l.display.split(" ");
  const qs = q ? q.word ?? 0 : words.length;
  const spoken = l.words.filter((w) => w.t0 <= t).length;
  const litN = Math.round((l.words.length ? spoken / l.words.length : 1) * words.length);
  const W_ = (w: string, i: number) => (
    <span key={i} style={{opacity: i < litN ? 1 : 0.4}}>{w}{i < words.length - 1 ? " " : ""}</span>
  );
  return (
    <div style={{position: "absolute", left: 60, right: 60, top: 1430, display: "flex", justifyContent: "center", opacity: a}}>
      <div style={{maxWidth: 960, padding: q ? "22px 34px 18px" : "18px 30px", borderRadius: 26, background: "rgba(5,18,25,0.86)",
        border: "1px solid rgba(242,235,221,0.14)", boxShadow: "0 10px 40px rgba(0,0,0,0.35)", textAlign: "center",
        display: "flex", flexDirection: "column", gap: 8}}>
        <div style={{lineHeight: 1.22, color: INK}}>
          {qs > 0 ? <span style={{fontFamily: F.ui, fontWeight: 600, fontSize: 44}}>{words.slice(0, qs).map((w, i) => W_(w, i))}</span> : null}
          {q ? (
            <span style={{fontFamily: F.title, fontWeight: 440, fontSize: 52, color: "#FFF4DD"}}>
              {"“"}{words.slice(qs).map((w, i) => W_(w, i + qs))}{"”"}
            </span>
          ) : null}
        </div>
        {q ? <div style={{fontFamily: F.mono, fontSize: 24, color: GOLD}}>{q.ref} · Bíblia Livre</div> : null}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------------ timeline
const FadeIn: React.FC<{children: React.ReactNode; len?: number; out?: number; dur: number}> = ({children, len = 6, out = 0, dur}) => {
  const f = useCurrentFrame();
  const o = Math.min(interpolate(f, [0, len], [0, 1], clamp), out ? interpolate(f, [dur - out, dur], [1, 0], clamp) : 1);
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Main: React.FC = () => {
  const total = Math.ceil(data.duration * FPS);
  const fr = (x: number) => Math.round(x * FPS);
  const s15 = fr(T(15) - 0.15), s17 = fr(T(17) - 0.12), sEnd = fr(wordT(18, "hoje") - 0.08);
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <Stage />
      <Sequence from={s15} durationInFrames={s17 - s15 + 6}>
        <FadeIn dur={s17 - s15 + 6}><S_Scroll dur={s17 - s15 + 6} start={s15} /></FadeIn>
      </Sequence>
      <Sequence from={s17} durationInFrames={sEnd - s17}>
        <FadeIn dur={sEnd - s17} out={3}><S_Eyes dur={sEnd - s17} /></FadeIn>
      </Sequence>
      <Sequence from={fr(T(19) - 0.3)} durationInFrames={total - fr(T(19) - 0.3)}>
        <End start={fr(T(19) - 0.3)} />
      </Sequence>
      <Captions hide={[1, 2, 19]} />
    </AbsoluteFill>
  );
};
