import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F, RAINBOW} from "./theme";

// "Ossos secos, rio da vida" (video 10). Simple drawings in vivid colours, animated: the bones are drawn and assembled in
// code, the wind and the breath are strokes, the water rises with the words. Every scene starts on the narration line it
// illustrates (data.json from narr.json); every number and quote on screen comes from data.json (tools/analyze.py + BLIVRE).
const FPS = data.fps;
const W = 1080;
const XF = 8; // cross-fade frames between scenes
type Line = (typeof data.lines)[number];
const LINE = (i: number): Line => data.lines.find((l) => l.i === i)!;
const fr = (t: number) => Math.round(t * FPS);
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
// time (s) of the n-th spoken word of line i that starts with w
const wordT = (i: number, w: string, nth = 0): number => {
  const hits = LINE(i).words.filter((x) => norm(x.w).startsWith(norm(w)));
  return (hits[nth] ?? hits[0] ?? {t0: LINE(i).t0}).t0;
};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const IMG = data.img as Record<string, {w: number; h: number}>;
const LK = data.links;

// ------------------------------------------------------------------------------------------------ building blocks
// camera over a 1080x1920 plate: everything inside moves together (background + bones)
const Cam: React.FC<{
  dur: number;
  z?: [number, number];
  x?: [number, number];
  y?: [number, number];
  origin?: string;
  shake?: number;
  children: React.ReactNode;
}> = ({dur, z = [1, 1.05], x = [0, 0], y = [0, 0], origin = "50% 60%", shake = 0, children}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
  const sx = shake ? (random(`sx${f}`) - 0.5) * 2 * shake : 0;
  const sy = shake ? (random(`sy${f}`) - 0.5) * 2 * shake : 0;
  return (
    <AbsoluteFill style={{overflow: "hidden"}}>
      <AbsoluteFill
        style={{
          transformOrigin: origin,
          transform: `translate(${lerp(x[0], x[1], p) + sx}px, ${lerp(y[0], y[1], p) + sy}px) scale(${lerp(z[0], z[1], p)})`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Plate: React.FC<{src: string}> = ({src}) => (
  <Img src={staticFile(`img/${src}.jpg`)} style={{position: "absolute", left: 0, top: 0, width: 1080, height: 1920}} />
);

// a character, alive: breathing and a slow sway around the feet
const Sprite: React.FC<{
  src: string;
  x: number;
  feet: number;
  h: number;
  flip?: boolean;
  breathe?: number;
  sway?: number;
  seed?: number;
  dy?: number;
  filter?: string;
  opacity?: number;
}> = ({src, x, feet, h, flip = false, breathe = 1, sway = 1, seed = 0, dy = 0, filter, opacity = 1}) => {
  const f = useCurrentFrame();
  const d = IMG[src];
  const w = (h * d.w) / d.h;
  const sy = 1 + 0.012 * breathe * Math.sin((f + seed) / 11);
  const rot = 0.8 * sway * Math.sin((f + seed) / 23);
  return (
    <Img
      src={staticFile(`img/${src}.png`)}
      style={{
        position: "absolute",
        left: x - w / 2,
        top: feet - h + dy,
        width: w,
        height: h,
        transformOrigin: "50% 100%",
        transform: `scaleX(${flip ? -1 : 1}) scaleY(${sy}) rotate(${rot}deg)`,
        filter,
        opacity,
      }}
    />
  );
};

const Tag: React.FC<{dark?: boolean}> = ({dark}) => (
  <div
    style={{
      position: "absolute",
      right: 60,
      top: 96,
      padding: "6px 14px",
      borderRadius: 999,
      background: dark ? "rgba(255,255,255,0.14)" : "rgba(20,33,61,0.72)",
      fontFamily: F.mono,
      fontWeight: 700,
      fontSize: 20,
      letterSpacing: "0.12em",
      color: C.white,
    }}
  >
    ILUSTRAÇÃO
  </div>
);

// big sticker title: navy ink, white outline, navy drop (or white ink on the night sky)
const Title: React.FC<{
  children: React.ReactNode;
  top?: number;
  size?: number;
  dark?: boolean;
  a?: number;
  style?: React.CSSProperties;
}> = ({children, top = 230, size = 92, dark = false, a = 1, style}) => (
  <div
    style={{
      position: "absolute",
      left: 60,
      right: 60,
      top,
      textAlign: "center",
      fontFamily: F.ui,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.04,
      letterSpacing: "-0.01em",
      color: dark ? C.white : C.navy,
      WebkitTextStroke: dark ? "0px" : `${Math.round(size * 0.17)}px ${C.white}`,
      paintOrder: "stroke fill",
      textShadow: dark ? "0 6px 24px rgba(0,0,0,0.35)" : `0 ${Math.round(size * 0.07)}px 0 ${C.navy}`,
      opacity: a,
      translate: `0px ${(1 - a) * 24}px`,
      ...style,
    }}
  >
    {children}
  </div>
);

const Chip: React.FC<{children: React.ReactNode; top: number; a?: number; color?: string; ink?: string}> = ({
  children,
  top,
  a = 1,
  color = C.navy,
  ink = C.yellow,
}) => (
  <div style={{position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", opacity: a}}>
    <div
      style={{
        padding: "10px 24px",
        borderRadius: 999,
        background: color,
        color: ink,
        fontFamily: F.mono,
        fontWeight: 700,
        fontSize: 30,
        letterSpacing: "0.04em",
        boxShadow: `0 6px 0 rgba(20,33,61,0.35)`,
        transform: `scale(${0.85 + 0.15 * a})`,
      }}
    >
      {children}
    </div>
  </div>
);

// fade-in helper (pure: scenes call it with their own frame, never inside a branch as a hook)
const inn = (f: number, delay = 0, len = 12) => interpolate(f, [delay, delay + len], [0, 1], {...clamp, easing: ease});
// pop: 0 -> 1.12 -> 1 (for words that land)
const pop = (f: number, at: number) =>
  interpolate(f, [at, at + 5, at + 10], [0, 1.12, 1], {...clamp, easing: Easing.out(Easing.quad)});

// 4-point star
const star = (r: number) =>
  `M0,${-r} L${r * 0.28},${-r * 0.28} L${r},0 L${r * 0.28},${r * 0.28} L0,${r} L${-r * 0.28},${r * 0.28} L${-r},0 L${-r * 0.28},${-r * 0.28} Z`;

const Burst: React.FC<{x: number; y: number; start: number; n?: number; spread?: number; seed?: string; size?: number}> = ({
  x,
  y,
  start,
  n = 14,
  spread = 260,
  seed = "b",
  size = 22,
}) => {
  const f = useCurrentFrame() - start;
  if (f < 0 || f > 40) return null;
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none"}}>
      {Array.from({length: n}).map((_, i) => {
        const ang = random(`${seed}a${i}`) * Math.PI * 2;
        const dist = spread * (0.3 + 0.7 * random(`${seed}d${i}`));
        const d0 = Math.min(1, f / 18);
        const px = x + Math.cos(ang) * dist * Easing.out(Easing.cubic)(d0);
        const py = y + Math.sin(ang) * dist * Easing.out(Easing.cubic)(d0) * 0.8;
        const s = interpolate(f, [0, 6, 26, 40], [0, 1, 0.8, 0], clamp) * (0.6 + 0.6 * random(`${seed}s${i}`));
        const col = i % 3 === 0 ? C.white : C.yellow;
        return (
          <path key={i} d={star(size)} transform={`translate(${px} ${py}) scale(${s}) rotate(${f * 4})`} fill={col} stroke={C.navy} strokeWidth={2.5} />
        );
      })}
    </svg>
  );
};

// ambient twinkles in a box
const Twinkles: React.FC<{box: [number, number, number, number]; n?: number; seed?: string; size?: number}> = ({
  box,
  n = 16,
  seed = "t",
  size = 16,
}) => {
  const f = useCurrentFrame();
  const [x0, y0, x1, y1] = box;
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none"}}>
      {Array.from({length: n}).map((_, i) => {
        const x = lerp(x0, x1, random(`${seed}x${i}`));
        const y = lerp(y0, y1, random(`${seed}y${i}`));
        const ph = random(`${seed}p${i}`) * 60;
        const s = Math.max(0, Math.sin((f + ph) / 9)) * (0.5 + 0.6 * random(`${seed}s${i}`));
        return <path key={i} d={star(size)} transform={`translate(${x} ${y}) scale(${s})`} fill={C.white} opacity={0.95} />;
      })}
    </svg>
  );
};

// wind / breath: curled strands with dashes travelling from -> to, and sparks riding them
const Gust: React.FC<{
  from: [number, number];
  to: [number, number];
  start: number;
  dur: number;
  color?: string;
  width?: number;
  strands?: number;
  curl?: number;
  seed?: string;
  speed?: number;
}> = ({from, to, start, dur, color = C.white, width = 9, strands = 3, curl = 160, seed = "g", speed = 0.045}) => {
  const f = useCurrentFrame() - start;
  if (f < 0 || f > dur + 18) return null;
  const a = interpolate(f, [0, 8, dur, dur + 18], [0, 1, 1, 0], clamp);
  const [x0, y0] = from;
  const [x1, y1] = to;
  const dx = x1 - x0,
    dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  const nx = -dy / L,
    ny = dx / L;
  const bez = (p: number[], t: number) =>
    (1 - t) ** 3 * p[0] + 3 * (1 - t) ** 2 * t * p[1] + 3 * (1 - t) * t ** 2 * p[2] + t ** 3 * p[3];
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", opacity: a}}>
      <defs>
        <filter id={`gl${seed}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {Array.from({length: strands}).map((_, s) => {
        const off = (s - (strands - 1) / 2) * 26;
        const c = curl * (0.6 + 0.6 * random(`${seed}c${s}`)) * (s % 2 ? -1 : 1);
        const X = [x0 + nx * off, x0 + dx * 0.33 + nx * c, x0 + dx * 0.66 - nx * c, x1 + nx * off * 0.25];
        const Y = [y0 + ny * off, y0 + dy * 0.33 + ny * c, y0 + dy * 0.66 - ny * c, y1 + ny * off * 0.25];
        const d = `M ${X[0]} ${Y[0]} C ${X[1]} ${Y[1]}, ${X[2]} ${Y[2]}, ${X[3]} ${Y[3]}`;
        const sp = speed * (0.85 + 0.3 * random(`${seed}v${s}`));
        return (
          <g key={s}>
            <path d={d} pathLength={1} fill="none" stroke={C.navy} strokeOpacity={0.25} strokeWidth={width + 5} strokeLinecap="round" strokeDasharray="0.24 0.76" strokeDashoffset={-f * sp} />
            <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray="0.24 0.76" strokeDashoffset={-f * sp} filter={`url(#gl${seed})`} />
            {Array.from({length: 3}).map((__, k) => {
              const t = (f * sp + k / 3 + 0.12) % 1;
              return <path key={k} d={star(11)} transform={`translate(${bez(X, t)} ${bez(Y, t)}) rotate(${f * 6})`} fill={C.yellow} stroke={C.navy} strokeWidth={2} />;
            })}
          </g>
        );
      })}
    </svg>
  );
};

// water in front of a character: wavy top edge at `level`, white edge and ripples
const Water: React.FC<{level: number; amp?: number; opacity?: number}> = ({level, amp = 10, opacity = 0.9}) => {
  const f = useCurrentFrame();
  const pts: string[] = [];
  for (let x = -20; x <= W + 20; x += 20) {
    const y = level + amp * Math.sin(x / 70 + f / 6) + amp * 0.5 * Math.sin(x / 31 - f / 9);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  const top = `M ${pts.join(" L ")}`;
  const body = `${top} L ${W + 20},1940 L -20,1940 Z`;
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
      <path d={body} fill={C.water} opacity={opacity} />
      <path d={top} fill="none" stroke={C.navy} strokeWidth={5} opacity={0.85} />
      <path d={top} fill="none" stroke={C.white} strokeWidth={7} opacity={0.9} transform="translate(0 9)" />
      {Array.from({length: 9}).map((_, i) => {
        const yy = level + 60 + i * 52;
        if (yy > 1900) return null;
        const xx = ((random(`wr${i}`) * W + f * (1.2 + random(`ws${i}`))) % (W + 200)) - 100;
        return <path key={i} d={`M ${xx} ${yy} q 30 -12 60 0`} fill="none" stroke={C.white} strokeWidth={5} strokeLinecap="round" opacity={0.75} />;
      })}
    </svg>
  );
};

// flowing water along a river path (dashes moving downstream)
const Flow: React.FC<{paths: string[]; speed?: number; width?: number}> = ({paths, speed = 0.02, width = 7}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          fill="none"
          stroke={C.white}
          strokeWidth={width}
          strokeLinecap="round"
          strokeDasharray="0.05 0.11"
          strokeDashoffset={-(f * speed * (0.8 + 0.4 * random(`fl${i}`)) + random(`fo${i}`))}
          opacity={0.85}
        />
      ))}
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ the bones
type Bn = [number, number, number, number, number]; // x1 y1 x2 y2 width (skeleton units, feet at 0, up negative)
const SK: Bn[] = [
  [0, -78, 0, -40, 5],
  [-11, -71, 11, -71, 3.6],
  [-12, -63, 12, -63, 3.6],
  [-10, -55, 10, -55, 3.6],
  [-10, -38, 10, -38, 5],
  [-13, -77, 13, -77, 3.6],
  [-14, -76, -17, -55, 4],
  [14, -76, 17, -55, 4],
  [-17, -55, -19, -36, 3.6],
  [17, -55, 19, -36, 3.6],
  [-7, -37, -8, -19, 4.6],
  [7, -37, 8, -19, 4.6],
  [-8, -18, -8, -1, 4.2],
  [8, -18, 8, -1, 4.2],
];
const SKX = [330, 478, 626, 774, 922];
const FEET = 1395;
const SKS = 4.1;
const BONE = "#FFFDF4";

type Pose = {x: number; y: number; a: number; L: number; w: number};
const target = (k: number, b: Bn): Pose => {
  const [x1, y1, x2, y2, w] = b;
  return {
    x: SKX[k] + (SKS * (x1 + x2)) / 2,
    y: FEET + (SKS * (y1 + y2)) / 2,
    a: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
    L: SKS * Math.hypot(x2 - x1, y2 - y1),
    w: SKS * w * 0.95,
  };
};
const scatter = (k: number, j: number): Pose => {
  const t = target(k, SK[j]);
  const flip = random(`bf${k}-${j}`) > 0.5 ? 180 : 0;
  return {
    x: 250 + random(`bx${k}-${j}`) * 780,
    y: 1080 + random(`by${k}-${j}`) * 330,
    a: (random(`ba${k}-${j}`) - 0.5) * 110 + flip,
    L: t.L,
    w: t.w,
  };
};
const skullScatter = (k: number) => ({x: 290 + random(`sx${k}`) * 720, y: 1110 + random(`sy${k}`) * 280, a: (random(`sa${k}`) - 0.5) * 80});

const BoneShape: React.FC<{p: Pose}> = ({p}) => {
  const {x, y, a, L, w} = p;
  const k = w * 0.62;
  const ends: [number, number][] = [
    [-L / 2, -w * 0.45],
    [-L / 2, w * 0.45],
    [L / 2, -w * 0.45],
    [L / 2, w * 0.45],
  ];
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <line x1={-L / 2} y1={0} x2={L / 2} y2={0} stroke={C.navy} strokeWidth={w + 6} strokeLinecap="round" />
      {ends.map(([ex, ey], i) => (
        <circle key={i} cx={ex} cy={ey} r={k + 3} fill={C.navy} />
      ))}
      <line x1={-L / 2} y1={0} x2={L / 2} y2={0} stroke={BONE} strokeWidth={w} strokeLinecap="round" />
      {ends.map(([ex, ey], i) => (
        <circle key={i} cx={ex} cy={ey} r={k} fill={BONE} />
      ))}
    </g>
  );
};

const Skull: React.FC<{x: number; y: number; a: number; r: number}> = ({x, y, a, r}) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`}>
    <rect x={-r * 0.55} y={r * 0.45} width={r * 1.1} height={r * 0.62} rx={r * 0.18} fill={BONE} stroke={C.navy} strokeWidth={3} />
    <line x1={-r * 0.18} y1={r * 0.6} x2={-r * 0.18} y2={r * 1.0} stroke={C.navy} strokeWidth={2} />
    <line x1={r * 0.18} y1={r * 0.6} x2={r * 0.18} y2={r * 1.0} stroke={C.navy} strokeWidth={2} />
    <ellipse cx={0} cy={0} rx={r} ry={r * 0.95} fill={BONE} stroke={C.navy} strokeWidth={3.5} />
    <ellipse cx={-r * 0.38} cy={r * 0.08} rx={r * 0.25} ry={r * 0.3} fill={C.navy} />
    <ellipse cx={r * 0.38} cy={r * 0.08} rx={r * 0.25} ry={r * 0.3} fill={C.navy} />
    <path d={`M 0 ${r * 0.38} l ${-r * 0.1} ${r * 0.2} l ${r * 0.2} 0 Z`} fill={C.navy} />
  </g>
);

const angLerp = (a0: number, a1: number, p: number) => a0 + ((((a1 - a0 + 540) % 360) + 360) % 360 - 180) * p;

// the whole valley of bones: scattered -> assembled -> sinews -> flesh (frames are local to the calling scene)
const Bones: React.FC<{
  assembleAt?: number;
  shakeAt?: number;
  sinewAt?: number;
  fleshAt?: number;
  fadeAt?: number;
}> = ({assembleAt = 1e9, shakeAt = 1e9, sinewAt = 1e9, fleshAt = 1e9, fadeAt = 1e9}) => {
  const f = useCurrentFrame();
  const shake = interpolate(f, [shakeAt, shakeAt + 4, assembleAt + 6], [0, 1, 0.15], clamp) * (f < assembleAt + 40 ? 1 : 0);
  const fade = interpolate(f, [fadeAt, fadeAt + 10], [1, 0], clamp);
  if (fade <= 0) return null;
  const sinew = interpolate(f, [sinewAt, sinewAt + 10], [0, 1], {...clamp, easing: ease});
  const flesh = interpolate(f, [fleshAt, fleshAt + 9], [0, 1], {...clamp, easing: ease});
  const bones: React.ReactNode[] = [];
  const skulls: React.ReactNode[] = [];
  const sinews: React.ReactNode[] = [];
  SKX.forEach((_, k) => {
    SK.forEach((b, j) => {
      const t = target(k, b);
      const s = scatter(k, j);
      const delay = assembleAt + random(`bd${k}-${j}`) * 26;
      const p = interpolate(f, [delay, delay + 16], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
      const jx = shake * Math.sin(f * 1.7 + j * 2.1 + k) * 4;
      const jy = shake * Math.cos(f * 2.3 + j) * 3;
      bones.push(
        <BoneShape
          key={`b${k}-${j}`}
          p={{x: lerp(s.x, t.x, p) + jx, y: lerp(s.y, t.y, p) - Math.sin(Math.PI * p) * 150 + jy, a: angLerp(s.a, t.a, p), L: t.L, w: t.w}}
        />,
      );
      if (sinew > 0) {
        const [x1, y1, x2, y2] = b;
        sinews.push(
          <line
            key={`s${k}-${j}`}
            x1={SKX[k] + SKS * x1}
            y1={FEET + SKS * y1}
            x2={SKX[k] + SKS * x2}
            y2={FEET + SKS * y2}
            pathLength={1}
            stroke={C.sinew}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray="1 1"
            strokeDashoffset={1 - sinew}
          />,
        );
      }
    });
    const sc = skullScatter(k);
    const delay = assembleAt + 22 + random(`sd${k}`) * 8;
    const p = interpolate(f, [delay, delay + 16], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
    skulls.push(
      <Skull
        key={`k${k}`}
        x={lerp(sc.x, SKX[k], p) + shake * Math.sin(f * 1.9 + k) * 4}
        y={lerp(sc.y, FEET - SKS * 89, p) - Math.sin(Math.PI * p) * 160}
        a={angLerp(sc.a, 0, p)}
        r={SKS * 9.5}
      />,
    );
  });
  const limb = (pts: number[][], k: number, wd: number, key: string) => (
    <g key={key}>
      <polyline points={pts.map(([x, y]) => `${SKX[k] + SKS * x},${FEET + SKS * y}`).join(" ")} fill="none" stroke={C.navy} strokeWidth={SKS * wd + 6} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={pts.map(([x, y]) => `${SKX[k] + SKS * x},${FEET + SKS * y}`).join(" ")} fill="none" stroke={C.flesh} strokeWidth={SKS * wd} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, opacity: fade}}>
      {bones}
      {skulls}
      <g>{sinews}</g>
      {flesh > 0 ? (
        <g opacity={flesh}>
          {SKX.map((X, k) => (
            <g key={k}>
              {limb([[-14, -76], [-17, -55], [-19, -35]], k, 8, "la")}
              {limb([[14, -76], [17, -55], [19, -35]], k, 8, "ra")}
              {limb([[-7, -38], [-8, -19], [-8, 0]], k, 9, "ll")}
              {limb([[7, -38], [8, -19], [8, 0]], k, 9, "rl")}
              <rect x={X - SKS * 15} y={FEET - SKS * 80} width={SKS * 30} height={SKS * 44} rx={SKS * 9} fill={C.flesh} stroke={C.navy} strokeWidth={4} />
              <circle cx={X} cy={FEET - SKS * 89} r={SKS * 11} fill={C.flesh} stroke={C.navy} strokeWidth={4} />
            </g>
          ))}
        </g>
      ) : null}
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ arcs and rulers
const AX0 = 80,
  AX1 = 1000,
  AY = 1190,
  KH = 560 / ((AX1 - AX0) / 2);
const ax = (x: number) => AX0 + x * (AX1 - AX0);

const NightSky: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.night} 0%, ${C.night2} 100%)`}}>
      <svg width={W} height={1920}>
        {Array.from({length: 70}).map((_, i) => {
          const x = random(`nx${i}`) * W;
          const y = random(`ny${i}`) * 1920;
          const o = 0.25 + 0.5 * Math.max(0, Math.sin((f + random(`np${i}`) * 80) / 13));
          return <circle key={i} cx={x} cy={y} r={1 + random(`nr${i}`) * 2.2} fill={C.white} opacity={o} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

type Hl = {a: number; b: number; start: number; dur?: number; fromA?: boolean};
// arc path above the baseline, from u to v (any order), drawn in that direction
const arcPath = (u: number, v: number) => {
  const X1 = ax(u),
    X2 = ax(v);
  const rx = Math.max(2, Math.abs(X2 - X1) / 2);
  const ry = rx * KH;
  return `M ${X1} ${AY} A ${rx} ${ry} 0 0 ${X2 > X1 ? 1 : 0} ${X2} ${AY}`;
};
const arcPoint = (u: number, v: number, t: number): [number, number] => {
  const X1 = ax(u),
    X2 = ax(v);
  const cx = (X1 + X2) / 2,
    rx = Math.abs(X2 - X1) / 2;
  const th = X2 > X1 ? Math.PI * (1 - t) : Math.PI * t;
  return [cx + rx * Math.cos(th), AY - rx * KH * Math.sin(th)];
};

const ArcMap: React.FC<{
  arcs: number[][];
  drawAt?: number;
  drawLen?: number;
  hl?: Hl[];
  labels?: {x: number; text: string; at: number; color?: string; anchor?: "start" | "middle" | "end"; row?: number}[];
  dimOthers?: boolean;
  axisY?: number;
}> = ({arcs, drawAt = 0, drawLen = 26, hl = [], labels = [], dimOthers = true, axisY = 150}) => {
  const f = useCurrentFrame();
  const sorted = [...arcs].sort((p, q) => Math.abs(p[1] - p[0]) - Math.abs(q[1] - q[0]));
  const vmax = Math.max(...arcs.map((a) => a[2]));
  const anyHl = hl.some((h) => f >= h.start);
  const dim = dimOthers && anyHl ? interpolate(f, [Math.min(...hl.map((h) => h.start)), Math.min(...hl.map((h) => h.start)) + 10], [1, 0.3], clamp) : 1;
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
      <defs>
        <filter id="aglow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {data.books.map((b, i) => (
        <rect
          key={i}
          x={ax(b.x0) + 0.6}
          y={AY + 10}
          width={Math.max(1, ax(b.x1) - ax(b.x0) - 1.2)}
          height={12}
          rx={3}
          fill={b.pt === "Ezequiel" ? C.yellow : i < 39 ? (i % 2 ? "#3B4C8F" : "#2F3E7A") : i % 2 ? "#5A3F95" : "#4B347F"}
        />
      ))}
      <line x1={AX0} x2={AX1} y1={AY} y2={AY} stroke="rgba(255,255,255,0.55)" strokeWidth={3} />
      <g opacity={dim}>
        {sorted.map((a, k) => {
          const at = drawAt + (k / sorted.length) * drawLen;
          const p = interpolate(f, [at, at + 8], [0, 1], clamp);
          if (p <= 0) return null;
          const span = Math.abs(a[1] - a[0]);
          const col = RAINBOW[Math.min(5, Math.floor(span * 7))];
          const w = 1.4 + 3.4 * (Math.log(a[2] + 1) / Math.log(vmax + 1));
          return <path key={k} d={arcPath(a[0], a[1])} pathLength={1} fill="none" stroke={col} strokeWidth={w} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p} opacity={0.85} />;
        })}
      </g>
      {hl.map((h, k) => {
        const len = h.dur ?? 22;
        const p = interpolate(f, [h.start, h.start + len], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
        if (p <= 0) return null;
        const [u, v] = h.fromA === false ? [h.b, h.a] : [h.a, h.b];
        const [px, py] = arcPoint(u, v, p);
        const glow = 0.8 + 0.2 * Math.sin(f / 5);
        return (
          <g key={k}>
            <path d={arcPath(u, v)} pathLength={1} fill="none" stroke={C.gold} strokeWidth={9} strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset={1 - p} filter="url(#aglow)" opacity={glow} />
            <circle cx={ax(u)} cy={AY} r={11} fill={C.gold} stroke={C.navy} strokeWidth={3} />
            {p < 1 ? <path d={star(22)} transform={`translate(${px} ${py}) rotate(${f * 8})`} fill={C.white} stroke={C.gold} strokeWidth={3} /> : null}
            {p >= 1 ? <circle cx={ax(v)} cy={AY} r={11 + 3 * Math.sin(f / 4)} fill={C.gold} stroke={C.navy} strokeWidth={3} /> : null}
          </g>
        );
      })}
      {labels.map((l, k) => {
        const a = interpolate(f, [l.at, l.at + 8], [0, 1], clamp);
        const anchor = l.anchor ?? (ax(l.x) < 200 ? "start" : ax(l.x) > 880 ? "end" : "middle");
        const X = anchor === "start" ? ax(l.x) - 10 : anchor === "end" ? ax(l.x) + 10 : ax(l.x);
        return (
          <g key={k} opacity={a}>
            <line x1={ax(l.x)} x2={ax(l.x)} y1={AY + 24} y2={AY + 58 + 52 * (l.row ?? 0)} stroke={l.color ?? C.gold} strokeWidth={3} />
            <text x={X} y={AY + 100 + 52 * (l.row ?? 0)} textAnchor={anchor} fontFamily={F.ui} fontWeight={800} fontSize={40} fill={l.color ?? C.gold}>
              {l.text}
            </text>
          </g>
        );
      })}
      <text x={AX0} y={AY + axisY} fontFamily={F.ui} fontWeight={600} fontSize={24} fill="rgba(255,255,255,0.55)">
        Gênesis
      </text>
      <text x={AX1} y={AY + axisY} textAnchor="end" fontFamily={F.ui} fontWeight={600} fontSize={24} fill="rgba(255,255,255,0.55)">
        Apocalipse
      </text>
    </svg>
  );
};

const LinkTitle: React.FC<{a: string; b: string; at: number}> = ({a, b, at}) => {
  const f = useCurrentFrame();
  const p = inn(f, at, 10);
  const q = inn(f, at + 6, 10);
  return (
    <div style={{position: "absolute", left: 60, right: 60, top: 250, textAlign: "center", fontFamily: F.ui, fontWeight: 900, fontSize: 74, lineHeight: 1.1}}>
      <div style={{color: C.white, opacity: p, translate: `0px ${(1 - p) * 20}px`}}>{a}</div>
      <div style={{color: C.gold, opacity: q, translate: `0px ${(1 - q) * 20}px`}}>↔ {b}</div>
    </div>
  );
};

const Votes: React.FC<{n: number; at: number; top?: number}> = ({n, at, top = 440}) => {
  const f = useCurrentFrame();
  const v = interpolate(f, [at, at + 22], [0, n], {...clamp, easing: Easing.out(Easing.cubic)});
  const a = interpolate(f, [at, at + 6], [0, 1], clamp);
  return (
    <div style={{position: "absolute", left: 0, right: 0, top, textAlign: "center", opacity: a}}>
      <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 72, color: C.gold}}>{fmt(v)}</span>
      <span style={{fontFamily: F.ui, fontWeight: 700, fontSize: 38, color: C.white}}> votos</span>
    </div>
  );
};

// the Bible as a bar of 66 books, and Ezekiel 1-48 zoomed below it; a pin on the chapter
const RY1 = 760,
  RY2 = 1010;
const Ruler: React.FC<{from: number; to: number; moveAt: number; moveLen?: number; count?: boolean}> = ({from, to, moveAt, moveLen = 26, count = false}) => {
  const f = useCurrentFrame();
  const ez = data.books.find((b) => b.pt === "Ezequiel")!;
  const n = data.ezChapters;
  const cw = (AX1 - AX0) / n;
  const p = interpolate(f, [moveAt, moveAt + moveLen], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const ch = lerp(from, to, p);
  const cur = Math.round(ch);
  const zoom = interpolate(f, [2, 16], [0, 1], {...clamp, easing: ease});
  const pinX = AX0 + (ch - 0.5) * cw;
  const drop = interpolate(f, [8, 20], [-120, 0], {...clamp, easing: Easing.out(Easing.back(2))});
  const global = interpolate(f, [6, 30], [1, data.ch37], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill>
      <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        {data.books.map((b, i) => (
          <rect
            key={i}
            x={ax(b.x0) + 0.8}
            y={RY1}
            width={Math.max(1.5, ax(b.x1) - ax(b.x0) - 1.6)}
            height={44}
            rx={4}
            fill={`hsl(${(i / 66) * 300}, 88%, ${b.pt === "Ezequiel" ? 62 : 52}%)`}
            opacity={b.pt === "Ezequiel" ? 1 : 0.55}
            stroke={b.pt === "Ezequiel" ? C.white : "none"}
            strokeWidth={4}
          />
        ))}
        <text x={AX0} y={RY1 - 18} fontFamily={F.ui} fontWeight={700} fontSize={26} fill="rgba(255,255,255,0.7)">
          Gênesis
        </text>
        <text x={AX1} y={RY1 - 18} textAnchor="end" fontFamily={F.ui} fontWeight={700} fontSize={26} fill="rgba(255,255,255,0.7)">
          Apocalipse
        </text>
        <g opacity={zoom}>
          <path
            d={`M ${ax(ez.x0)} ${RY1 + 46} L ${AX0} ${RY2 - 6} L ${AX1} ${RY2 - 6} L ${ax(ez.x1)} ${RY1 + 46} Z`}
            fill="rgba(255,210,63,0.12)"
            stroke="rgba(255,210,63,0.6)"
            strokeWidth={2}
          />
          {Array.from({length: n}).map((_, c) => {
            const on = c + 1 === cur;
            return <rect key={c} x={AX0 + c * cw + 1.5} y={RY2} width={cw - 3} height={96} rx={4} fill={on ? C.yellow : c + 1 === from || c + 1 === to ? "#4A5BA0" : "#2F3E7A"} />;
          })}
          {[1, 10, 20, 30, 40, 48].map((c) => (
            <text key={c} x={AX0 + (c - 0.5) * cw} y={RY2 + 140} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={24} fill="rgba(255,255,255,0.6)">
              {c}
            </text>
          ))}
          <g transform={`translate(${pinX} ${RY2 - 30 + drop})`}>
            <line x1={0} y1={0} x2={0} y2={34} stroke={C.white} strokeWidth={5} />
            <circle cx={0} cy={-58} r={58} fill={C.yellow} stroke={C.navy} strokeWidth={6} />
            <text x={0} y={-40} textAnchor="middle" fontFamily={F.ui} fontWeight={900} fontSize={54} fill={C.navy}>
              {cur}
            </text>
          </g>
        </g>
      </svg>
      {count ? (
        <div style={{position: "absolute", left: 0, right: 0, top: 1210, textAlign: "center", fontFamily: F.ui, fontWeight: 700, fontSize: 40, color: C.white, opacity: zoom}}>
          capítulo <span style={{fontFamily: F.mono, color: C.yellow}}>{fmt(global)}</span> de {fmt(data.nch)} da Bíblia
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------------ scenes
// scenes get their own duration d and global start frame s; L(t) = local frame of a narration time
type SceneP = {d: number; s: number};
const L = (s: number, t: number) => fr(t) - s;

const S_Valley: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const enter = interpolate(f, [L(s, LINE(2).t0) - 4, L(s, LINE(2).t0) + 14], [-420, 0], {...clamp, easing: ease});
  // the hook title lights word by word while line 2 asks it
  const words = ["Por", "acaso", "viverão", "estes", "ossos?"];
  const keys = ["por", "acaso", "viverao", "estes", "ossos"];
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.0, 1.06]} origin="50% 70%">
        <Plate src="bg-vale" />
        <Bones />
      </Cam>
      <Sprite src="ezequiel" x={175 + enter} feet={1440} h={560} />
      <Title top={230} size={100}>
        {words.map((w, i) => {
          const t = L(s, wordT(2, keys[i]));
          const lit = interpolate(f, [t, t + 4], [0, 1], clamp);
          return (
            <span key={i} style={{color: lit > 0.5 ? C.orange : C.navy}}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </Title>
      <Chip top={175}>Ezequiel 37</Chip>
      <Tag />
    </AbsoluteFill>
  );
};

const S_Ruler37: React.FC<SceneP> = () => {
  const f = useCurrentFrame();
  const a = inn(f, 0, 10);
  return (
    <AbsoluteFill>
      <NightSky />
      <Title dark top={300} size={110} a={a}>
        Ezequiel 37
      </Title>
      <Ruler from={37} to={37} moveAt={0} count />
    </AbsoluteFill>
  );
};

const S_Answer: React.FC<SceneP> = ({d}) => (
  <AbsoluteFill>
    <Cam dur={d} z={[1.22, 1.28]} origin="70% 72%">
      <Plate src="bg-vale" />
      <Bones />
    </Cam>
    <Sprite src="ezequiel" x={400} feet={1560} h={1180} seed={10} />
    <Chip top={200}>Ezequiel 37:3</Chip>
    <Tag />
  </AbsoluteFill>
);

const Rings: React.FC<{x: number; y: number; start: number}> = ({x, y, start}) => {
  const f = useCurrentFrame() - start;
  if (f < 0) return null;
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
      {Array.from({length: 5}).map((_, i) => {
        const t = ((f + i * 9) % 45) / 45;
        const r = 40 + t * 520;
        return <path key={i} d={`M ${x + r * Math.cos(-0.7)} ${y + r * Math.sin(-0.7)} A ${r} ${r} 0 0 1 ${x + r * Math.cos(0.7)} ${y + r * Math.sin(0.7)}`} fill="none" stroke={C.yellow} strokeWidth={10 * (1 - t) + 3} strokeLinecap="round" opacity={1 - t} />;
      })}
    </svg>
  );
};

const S_Prophesy: React.FC<SceneP> = ({d, s}) => {
  const t = L(s, wordT(5, "profetiza"));
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.12, 1.16]} origin="60% 72%">
        <Plate src="bg-vale" />
        <Bones shakeAt={t + 10} />
      </Cam>
      <Sprite src="ezequiel-profetiza" x={330} feet={1560} h={1100} seed={30} />
      <Rings x={470} y={560} start={t} />
      <Chip top={200}>Ezequiel 37:4</Chip>
      <Tag />
    </AbsoluteFill>
  );
};

// lines 6-8 in one continuous valley: tremor, bones fly together, sinews, flesh, skin, then the breath
const S_Life: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const tremor = L(s, wordT(6, "tremor"));
  const assemble = L(s, wordT(6, "ossos")) - 4;
  const nerv = L(s, wordT(7, "nervos"));
  const carne = L(s, wordT(7, "carne"));
  const pele = L(s, wordT(7, "pele"));
  const sopro = L(s, wordT(8, "sopro"));
  const entrou = L(s, wordT(8, "entrou"));
  const viveram = L(s, wordT(8, "viveram"));
  const skin = interpolate(f, [pele, pele + 10], [0, 1], {...clamp, easing: ease});
  const life = interpolate(f, [entrou, entrou + 18], [0, 1], {...clamp, easing: ease});
  const jump = interpolate(f, [viveram, viveram + 6, viveram + 13, viveram + 18, viveram + 23], [0, -60, 0, -24, 0], clamp);
  const shakeAmp = interpolate(f, [tremor, tremor + 3, tremor + 22], [0, 14, 0], clamp);
  const word = (text: string, at: number, color: string, i: number) => {
    const p = pop(f, at);
    return p > 0 ? (
      <span key={text} style={{display: "inline-block", transform: `scale(${p})`, color, margin: "0 14px"}}>
        {text}
      </span>
    ) : (
      <span key={text} style={{display: "inline-block", opacity: 0, margin: "0 14px"}}>
        {text}
      </span>
    );
  };
  const chipA = interpolate(f, [0, 8], [0, 1], clamp);
  const breathChip = interpolate(f, [sopro - 4, sopro + 6], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.0, 1.08]} origin="58% 68%" shake={shakeAmp}>
        <Plate src="bg-vale" />
        <Bones assembleAt={assemble} shakeAt={tremor} sinewAt={nerv} fleshAt={carne} fadeAt={pele} />
        <Sprite
          src="povo"
          x={626}
          feet={FEET + 14}
          h={570}
          breathe={life}
          sway={life}
          dy={jump}
          opacity={skin}
          filter={`grayscale(${1 - life}) brightness(${0.9 + 0.12 * life}) contrast(${0.85 + 0.15 * life})`}
        />
        <Gust from={[-40, 900]} to={[560, 1150]} start={sopro} dur={entrou - sopro + 16} seed="w1" />
        <Gust from={[1120, 900]} to={[700, 1150]} start={sopro + 3} dur={entrou - sopro + 14} seed="w2" />
        <Gust from={[-40, 1700]} to={[540, 1250]} start={sopro + 5} dur={entrou - sopro + 12} seed="w3" />
        <Gust from={[1120, 1700]} to={[720, 1250]} start={sopro + 7} dur={entrou - sopro + 10} seed="w4" />
        <Burst x={626} y={1150} start={viveram - 2} n={22} spread={420} seed="liv" />
      </Cam>
      <Sprite src="ezequiel-profetiza" x={140} feet={1460} h={500} seed={50} dy={jump * 0.4} />
      <div style={{position: "absolute", left: 0, right: 0, top: 270, textAlign: "center", fontFamily: F.ui, fontWeight: 900, fontSize: 70, WebkitTextStroke: `12px ${C.white}`, paintOrder: "stroke fill", textShadow: `0 6px 0 ${C.navy}`, opacity: f < sopro ? 1 : interpolate(f, [sopro, sopro + 8], [1, 0], clamp)}}>
        {word("NERVOS", nerv, C.sinew, 0)}
        {word("CARNE", carne, C.orange, 1)}
        {word("PELE", pele, C.navy, 2)}
      </div>
      <Chip top={190} a={f < sopro ? chipA : Math.max(0.6, breathChip)}>
        {f < sopro ? "Ezequiel 37:7–8" : "Ezequiel 37:9–10"}
      </Chip>
      <Title top={300} size={104} a={interpolate(f, [viveram, viveram + 8], [0, 1], clamp)}>
        <span style={{color: C.green}}>VIVERAM!</span>
      </Title>
      <Tag />
    </AbsoluteFill>
  );
};

// line 9: the arc to Genesis 2:7, then Eden: the breath enters the clay
const S_Gen: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const cut = L(s, wordT(9, "deus")) - 3;
  const sopro = L(s, wordT(9, "sopro", 1));
  const g = LK.breath_gen;
  const a = inn(f, 0, 10);
  if (f < cut) {
    return (
      <AbsoluteFill>
        <NightSky />
        <ArcMap arcs={data.arcs37} drawAt={2} drawLen={16} hl={[{a: g.xa, b: g.xb, start: 18, dur: 26}]} labels={[{x: g.xa, text: "Ezequiel 37", at: 4, color: C.yellow, anchor: "middle"}, {x: g.xb, text: "Gênesis 2:7", at: 40, anchor: "start"}]} />
        <div style={{position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", opacity: a, fontFamily: F.ui, fontWeight: 700, fontSize: 36, color: "rgba(255,255,255,0.85)"}}>
          Ezequiel 37 se liga a <span style={{fontFamily: F.mono, color: C.yellow}}>{fmt(data.ez37.verses_outside)}</span> versículos
        </div>
        <LinkTitle a={g.a_pt} b={g.b_pt} at={18} />
        <Votes n={g.votes} at={40} />
      </AbsoluteFill>
    );
  }
  const k = f - cut;
  const glow = interpolate(f, [sopro, sopro + 20], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Cam dur={d - cut} z={[1.0, 1.08]} origin="55% 62%">
        <Plate src="bg-eden" />
        <Sprite src="adao" x={540} feet={1330} h={200} breathe={glow * 2} sway={0} filter={`drop-shadow(0 0 ${30 * glow}px rgba(255,210,63,${0.9 * glow})) brightness(${1 + 0.15 * glow})`} />
        <Gust from={[860, 470]} to={[868, 1200]} start={cut + 2} dur={d - cut} color={C.yellow} width={11} strands={3} curl={120} seed="ad" speed={0.04} />
        <Burst x={868} y={1210} start={sopro} n={16} spread={240} seed="adb" />
      </Cam>
      <Chip top={200} a={interpolate(k, [0, 8], [0, 1], clamp)}>
        Gênesis 2:7
      </Chip>
      <Tag />
    </AbsoluteFill>
  );
};

// line 10: the arc to John 20:22, then the room: Jesus breathes on them
const S_John: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const cut = L(s, wordT(10, "jesus")) - 3;
  const soprou = L(s, wordT(10, "soprou"));
  const santo = L(s, wordT(10, "santo"));
  const g = LK.breath_john;
  if (f < cut) {
    return (
      <AbsoluteFill>
        <NightSky />
        <ArcMap arcs={data.arcs37} drawAt={-40} drawLen={1} hl={[{a: g.xa, b: g.xb, start: 4, dur: 18}]} labels={[{x: g.xa, text: "Ezequiel 37", at: 0, color: C.yellow, anchor: "end"}, {x: g.xb, text: "João 20:22", at: 22, anchor: "start"}]} />
        <LinkTitle a={g.a_pt} b={g.b_pt} at={2} />
        <Votes n={g.votes} at={22} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Cam dur={d - cut} z={[1.0, 1.07]} origin="40% 45%">
        <Plate src="sala-jo20" />
        <Gust from={[315, 800]} to={[640, 880]} start={soprou} dur={d} color={C.yellow} width={9} strands={3} curl={70} seed="jo" speed={0.035} />
        <Burst x={700} y={900} start={santo} n={18} spread={300} seed="jb" />
      </Cam>
      <Chip top={200} a={interpolate(f - cut, [0, 8], [0, 1], clamp)}>
        João 20:22
      </Chip>
      <Tag />
    </AbsoluteFill>
  );
};

// river paths of the temple plate (frame pixels, measured on bg-templo.jpg)
const TEMPLE_FLOW = [
  "M 470 780 C 470 880, 520 960, 530 1040 C 540 1140, 420 1200, 410 1320 C 400 1440, 520 1560, 560 1700 C 590 1800, 600 1880, 610 1960",
  "M 520 780 C 520 880, 580 960, 600 1040 C 620 1140, 520 1220, 520 1330 C 520 1450, 680 1560, 720 1700 C 760 1800, 780 1880, 800 1960",
  "M 440 800 C 430 900, 470 980, 470 1060 C 470 1160, 340 1220, 330 1330 C 320 1450, 380 1570, 400 1700 C 410 1800, 400 1880, 400 1960",
];

// line 11: the ruler slides 37 -> 47, then the water leaves the temple
const S_Ch47: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const cut = L(s, wordT(11, "ezequiel")) - 2;
  if (f < cut) {
    return (
      <AbsoluteFill>
        <NightSky />
        <Title dark top={300} size={110} a={inn(f, 0, 8)}>
          Ezequiel {Math.round(interpolate(f, [4, 4 + Math.max(10, cut - 10)], [37, 47], {...clamp, easing: Easing.inOut(Easing.cubic)}))}
        </Title>
        <Ruler from={37} to={47} moveAt={4} moveLen={Math.max(10, cut - 10)} />
        <Chip top={1210} a={interpolate(f, [cut - 14, cut - 6], [0, 1], clamp)} color={C.yellow} ink={C.navy}>
          +{data.between} capítulos
        </Chip>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <Cam dur={d - cut} z={[1.0, 1.1]} origin="47% 40%">
        <Plate src="bg-templo" />
        <Flow paths={TEMPLE_FLOW} />
        <Twinkles box={[300, 1000, 800, 1800]} n={14} seed="tp" />
      </Cam>
      <Chip top={200} a={interpolate(f - cut, [0, 8], [0, 1], clamp)}>
        Ezequiel 47:1
      </Chip>
      <Tag />
    </AbsoluteFill>
  );
};

// lines 12-13: the water rises (ankles, knees, waist) until he swims
const S_Wade: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const FT = 1560,
    H = 880,
    X = 600;
  const t1 = L(s, wordT(12, "tornozelos"));
  const t2 = L(s, wordT(12, "joelhos"));
  const t3 = L(s, wordT(12, "cintura"));
  const t4 = L(s, wordT(13, "rio"));
  const marks: [string, number, number][] = [
    ["tornozelos", FT - 55, t1],
    ["joelhos", FT - 240, t2],
    ["cintura", FT - 480, t3],
  ];
  const lvl = interpolate(
    f,
    [0, t1, t1 + 10, t2, t2 + 10, t3, t3 + 10, t4, t4 + 26],
    [FT + 30, FT + 30, marks[0][1], marks[0][1], marks[1][1], marks[1][1], marks[2][1], marks[2][1], FT - 720],
    {...clamp, easing: Easing.inOut(Easing.quad)},
  );
  const float = interpolate(f, [t4, t4 + 26], [0, 1], {...clamp, easing: ease});
  const bob = float * (Math.sin(f / 9) * 14);
  const lift = -float * 230;
  const nado = pop(f, t4 + 8);
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.0, 1.04]} origin="50% 60%">
        <Plate src="bg-rio" />
        <Sprite src="ezequiel-frente" x={X} feet={FT} h={H} dy={lift + bob} seed={70} />
        <Water level={lvl + bob * 0.4} amp={10 + 6 * float} />
        <Twinkles box={[80, 1100, 1000, 1700]} n={10} seed="wd" size={13} />
        {marks.map(([text, y, at], k) => {
          const p = pop(f, at);
          if (p <= 0) return null;
          const gone = interpolate(f, [t4, t4 + 12], [1, 0], clamp);
          return (
            <div key={k} style={{position: "absolute", left: 70, top: y - 32, display: "flex", alignItems: "center", gap: 10, opacity: gone, transform: `scale(${p})`, transformOrigin: "0% 50%"}}>
              <div style={{padding: "8px 18px", borderRadius: 999, background: C.white, border: `4px solid ${C.navy}`, fontFamily: F.ui, fontWeight: 900, fontSize: 38, color: C.navy}}>{text}</div>
              <div style={{width: 60, height: 5, background: C.navy, borderRadius: 3}} />
            </div>
          );
        })}
      </Cam>
      <Title top={330} size={84} a={nado > 0 ? 1 : 0} style={{transform: `scale(${Math.max(0.001, nado)})`}}>
        só <span style={{color: C.turquoise}}>a nado</span>
      </Title>
      <Chip top={190} a={1}>
        {f < t4 ? "Ezequiel 47:3–4" : "Ezequiel 47:5"}
      </Chip>
      <Tag />
    </AbsoluteFill>
  );
};

// line 14: Ezekiel 47:1 and its links; gold to John 7:38 with water drops riding the arc
const S_River738: React.FC<SceneP> = () => {
  const f = useCurrentFrame();
  const g = LK.river_john;
  return (
    <AbsoluteFill>
      <NightSky />
      <ArcMap arcs={data.arcs471} drawAt={2} drawLen={12} hl={[{a: g.xa, b: g.xb, start: 16, dur: 22}]} labels={[{x: g.xa, text: "Ezequiel 47", at: 4, color: C.yellow, anchor: "end"}, {x: g.xb, text: "João 7:38", at: 36, anchor: "start"}]} />
      <div style={{position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", opacity: inn(f, 0, 10), fontFamily: F.ui, fontWeight: 700, fontSize: 36, color: "rgba(255,255,255,0.85)"}}>
        Ezequiel 47:1 se liga a <span style={{fontFamily: F.mono, color: C.yellow}}>{fmt(data.ez471.links)}</span> versículos
      </div>
      <LinkTitle a={g.a_pt} b={g.b_pt} at={14} />
      <Votes n={g.votes} at={36} />
      <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        {f > 40
          ? Array.from({length: 6}).map((_, i) => {
              const t = ((f - 40) / 40 + i / 6) % 1;
              const [x, y] = arcPoint(g.xa, g.xb, t);
              return <circle key={i} cx={x} cy={y} r={10} fill={C.water} stroke={C.white} strokeWidth={3} />;
            })
          : null}
      </svg>
    </AbsoluteFill>
  );
};

// line 15: the last chapter of the Bible, then the river of life
const S_Rev: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const cut = L(s, wordT(15, "rio")) - 3;
  const g = LK.river_rev;
  if (f < cut) {
    return (
      <AbsoluteFill>
        <NightSky />
        <ArcMap arcs={data.arcs471} drawAt={-40} drawLen={1} hl={[{a: g.xa, b: g.xb, start: 2, dur: 22}]} labels={[{x: g.xa, text: "Ezequiel 47", at: 0, color: C.yellow, anchor: "end"}, {x: g.xb, text: "Apocalipse 22:1", at: 22, anchor: "end", row: 1}]} axisY={215} />
        <LinkTitle a={g.a_pt} b={g.b_pt} at={0} />
        <Votes n={g.votes} at={22} />
        <Chip top={560} a={interpolate(f, [22, 30], [0, 1], clamp)} color={C.yellow} ink={C.navy}>
          o último capítulo da Bíblia
        </Chip>
      </AbsoluteFill>
    );
  }
  const k = f - cut;
  const rays = interpolate(k, [0, 20], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Cam dur={d - cut} z={[1.0, 1.1]} origin="52% 40%">
        <Plate src="bg-rio-vida" />
        <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, mixBlendMode: "screen"}}>
          {Array.from({length: 12}).map((_, i) => {
            const a = (i / 12) * Math.PI - Math.PI + (f / 300) * (i % 2 ? 1 : -1);
            return <path key={i} d={`M 560 640 L ${560 + Math.cos(a - 0.06) * 1400} ${640 + Math.sin(a - 0.06) * 1400} L ${560 + Math.cos(a + 0.06) * 1400} ${640 + Math.sin(a + 0.06) * 1400} Z`} fill="rgba(255,236,150,0.16)" opacity={rays} />;
          })}
        </svg>
        <Flow paths={["M 600 700 C 640 900, 520 1100, 560 1300 C 600 1500, 520 1700, 540 1960", "M 650 760 C 720 950, 640 1150, 700 1350 C 760 1550, 700 1750, 760 1960", "M 560 760 C 520 950, 430 1150, 440 1350 C 450 1550, 380 1750, 360 1960"]} speed={0.016} width={6} />
        <Twinkles box={[300, 900, 900, 1800]} n={18} seed="rv" />
      </Cam>
      <Chip top={200} a={interpolate(k, [0, 8], [0, 1], clamp)}>
        Apocalipse 22:1
      </Chip>
      <Tag />
    </AbsoluteFill>
  );
};

// line 16: from the valley of dry bones to the river of life (the water climbs over the valley)
const S_ValleyToRiver: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const rio = L(s, wordT(16, "rio"));
  const p = interpolate(f, [rio - 6, rio + 22], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const lvl = lerp(1960, -60, p);
  const pts: string[] = [];
  for (let x = -20; x <= W + 20; x += 20) pts.push(`${x},${(lvl + 22 * Math.sin(x / 80 + f / 5)).toFixed(1)}`);
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.06, 1.0]} origin="50% 60%">
        <Plate src="bg-vale" />
        <Bones />
      </Cam>
      <AbsoluteFill style={{clipPath: `polygon(${pts.map((q) => q.split(",").map((v) => v + "px").join(" ")).join(", ")}, ${W + 20}px 1960px, -20px 1960px)`}}>
        <Cam dur={d} z={[1.12, 1.0]} origin="52% 45%">
          <Plate src="bg-rio-vida" />
          <Twinkles box={[300, 900, 900, 1800]} n={18} seed="vr" />
        </Cam>
      </AbsoluteFill>
      <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        {p > 0 && p < 1 ? <polyline points={pts.join(" ")} fill="none" stroke={C.white} strokeWidth={10} /> : null}
      </svg>
      <Tag />
    </AbsoluteFill>
  );
};

const S_End: React.FC = () => {
  const f = useCurrentFrame();
  const L4 = [LK.breath_gen, LK.breath_john, LK.river_john, LK.river_rev];
  return (
    <AbsoluteFill>
      <NightSky />
      <ArcMap arcs={[...data.arcs37, ...data.arcs471]} drawAt={0} drawLen={14} hl={L4.map((g, i) => ({a: g.xa, b: g.xb, start: 12 + i * 5, dur: 16}))} dimOthers />
      <Title dark top={260} size={70} a={inn(f, 4, 12)}>
        Qual versículo a gente liga no próximo vídeo?
      </Title>
      <div style={{position: "absolute", left: 0, right: 0, top: 1385, display: "flex", justifyContent: "center", opacity: inn(f, 16, 10)}}>
        <div style={{display: "flex", flexDirection: "column", gap: 6, alignItems: "center"}}>
          {L4.map((g) => (
            <div key={g.b} style={{fontFamily: F.ui, fontWeight: 700, fontSize: 32, color: C.white}}>
              {g.a_pt} ↔ {g.b_pt} <span style={{fontFamily: F.mono, color: C.gold}}>· {fmt(g.votes)} votos</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{position: "absolute", left: 90, right: 90, top: 1622, textAlign: "center", fontFamily: F.mono, fontSize: 20, lineHeight: 1.5, color: "rgba(255,255,255,0.7)", opacity: interpolate(f, [20, 30], [0, 1], clamp)}}>
        Ligações e votos: OpenBible.info (CC BY) · Texto: Bíblia Livre (CC BY 4.0) · Ilustrações geradas por IA · Bíblia Conectada
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
    const end = next ? Math.min(next.t0 - 0.05, l.t1 + 0.6) : l.t1 + 1.2;
    return t >= l.t0 - 0.12 && t < end;
  });
  if (idx < 0) return null;
  const l = lines[idx];
  if (hide.includes(l.i)) return null;
  const a = interpolate(t, [l.t0 - 0.12, l.t0 + 0.04], [0, 1], clamp);
  const q = l.quote;
  const words = l.display.split(" ");
  const qs = q ? q.word ?? 0 : words.length;
  const spoken = l.words.filter((w) => w.t0 <= t).length;
  const litN = Math.round((l.words.length ? spoken / l.words.length : 1) * words.length);
  const Wd = (w: string, i: number) => (
    <span key={i} style={{opacity: i < litN ? 1 : 0.32}}>
      {w}
      {i < words.length - 1 ? " " : ""}
    </span>
  );
  return (
    <div style={{position: "absolute", left: 60, right: 60, top: 1440, display: "flex", justifyContent: "center", opacity: a, transform: `scale(${0.96 + 0.04 * a})`}}>
      <div
        style={{
          maxWidth: 960,
          padding: q ? "20px 32px 16px" : "16px 30px",
          borderRadius: 28,
          background: C.white,
          border: `5px solid ${C.navy}`,
          boxShadow: `0 8px 0 ${C.navy}`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{lineHeight: 1.18, color: C.navy}}>
          {qs > 0 ? <span style={{fontFamily: F.ui, fontWeight: 800, fontSize: 44}}>{words.slice(0, qs).map((w, i) => Wd(w, i))}</span> : null}
          {q ? (
            <span style={{fontFamily: F.quote, fontWeight: 500, fontSize: 50}}>
              {" "}“{words.slice(qs).map((w, i) => Wd(w, i + qs))}”
            </span>
          ) : null}
        </div>
        {q ? (
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 24, color: C.orange}}>
            {q.ref} · Bíblia Livre
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------------------------------ timeline
const Fade: React.FC<{children: React.ReactNode; first?: boolean}> = ({children, first}) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, XF], [0, 1], clamp);
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Main: React.FC = () => {
  const total = Math.ceil(data.duration * FPS);
  const at = (i: number) => (i === 1 ? 0 : fr(LINE(i).t0 - 0.18));
  const plan: [number, React.FC<SceneP>][] = [
    [1, S_Valley],
    [3, S_Ruler37],
    [4, S_Answer],
    [5, S_Prophesy],
    [6, S_Life],
    [9, S_Gen],
    [10, S_John],
    [11, S_Ch47],
    [12, S_Wade],
    [14, S_River738],
    [15, S_Rev],
    [16, S_ValleyToRiver],
    [17, S_End],
  ];
  const starts = plan.map(([i]) => at(i));
  return (
    <AbsoluteFill style={{backgroundColor: C.navy}}>
      {plan.map(([i, Scene], k) => {
        const from = starts[k];
        const to = k + 1 < plan.length ? starts[k + 1] + XF : total;
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <Fade first={k === 0}>
              <Scene d={to - from} s={from} />
            </Fade>
          </Sequence>
        );
      })}
      <Captions hide={[2, 12, 17]} />
    </AbsoluteFill>
  );
};
