import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F, RAINBOW} from "./theme";

// "Do vale ao rio" (video 10, version 2). Simple drawings in vivid colours, animated: the bones are drawn and assembled in
// code, the wind and the breath are strokes, the water rises with the words; God is only light from the sky. Every scene starts on the narration line it
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

// ------------------------------------------------------------------------------------------------ light and ruler
// God is never drawn as a character (Alex, 28/10): when He acts or speaks, light comes down from the sky.
const GodLight: React.FC<{x?: number; strength?: number; spread?: number}> = ({x = 540, strength = 1, spread = 1}) => {
  const f = useCurrentFrame();
  const pulse = 0.85 + 0.15 * Math.sin(f / 12);
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none", mixBlendMode: "screen"}}>
      <defs>
        <radialGradient id="glsun" cx="50%" cy="0%" r="70%">
          <stop offset="0%" stopColor="rgba(255,248,220,0.95)" />
          <stop offset="45%" stopColor="rgba(255,230,150,0.35)" />
          <stop offset="100%" stopColor="rgba(255,230,150,0)" />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={-60} rx={620 * spread} ry={520} fill="url(#glsun)" opacity={strength * pulse} />
      {Array.from({length: 9}).map((_, i) => {
        const a = Math.PI / 2 + (i - 4) * 0.16 * spread + Math.sin(f / 70 + i) * 0.03;
        const w = 0.035 + 0.02 * random(`gr${i}`);
        return (
          <path
            key={i}
            d={`M ${x} -80 L ${x + Math.cos(a - w) * 2200} ${-80 + Math.sin(a - w) * 2200} L ${x + Math.cos(a + w) * 2200} ${-80 + Math.sin(a + w) * 2200} Z`}
            fill="rgba(255,240,180,0.13)"
            opacity={strength * (0.6 + 0.4 * Math.sin(f / 15 + i))}
          />
        );
      })}
    </svg>
  );
};

// a column of light from the sky onto a point (the hand of the Lord), with sparks coming down
const Beam: React.FC<{x: number; y: number; start: number; w?: number}> = ({x, y, start, w = 260}) => {
  const f = useCurrentFrame() - start;
  if (f < 0) return null;
  const p = interpolate(f, [0, 16], [0, 1], {...clamp, easing: ease});
  const bottom = lerp(-40, y, p);
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none"}}>
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,250,225,0.9)" />
          <stop offset="100%" stopColor="rgba(255,226,140,0.45)" />
        </linearGradient>
        <filter id="bblur">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <path d={`M ${x - w * 0.35} -40 L ${x + w * 0.35} -40 L ${x + w / 2} ${bottom} L ${x - w / 2} ${bottom} Z`} fill="url(#beam)" filter="url(#bblur)" opacity={0.85} style={{mixBlendMode: "screen"}} />
      <ellipse cx={x} cy={bottom} rx={w * 0.7 * p} ry={40 * p} fill="rgba(255,236,160,0.55)" filter="url(#bblur)" />
      {Array.from({length: 12}).map((_, i) => {
        const t = ((f / 40 + random(`bm${i}`)) % 1) * p;
        const sx = x + (random(`bx${i}`) - 0.5) * w * 0.8;
        return <path key={i} d={star(9 + 6 * random(`bs${i}`))} transform={`translate(${sx} ${lerp(-20, bottom, t)}) rotate(${f * 5})`} fill={C.white} opacity={0.9} />;
      })}
    </svg>
  );
};

// the voice from the sky: rings of light opening downwards from above
const SkyRings: React.FC<{x?: number; start: number; y?: number}> = ({x = 540, start, y = -40}) => {
  const f = useCurrentFrame() - start;
  if (f < 0) return null;
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, pointerEvents: "none"}}>
      {Array.from({length: 4}).map((_, i) => {
        const t = ((f + i * 12) % 48) / 48;
        const r = 80 + t * 900;
        return <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.62} fill="none" stroke="rgba(255,236,160,1)" strokeWidth={12 * (1 - t) + 2} opacity={(1 - t) * 0.8} />;
      })}
    </svg>
  );
};

// words that land one at a time, stacked (sticker style)
const BigWords: React.FC<{items: {text: string; at: number; color?: string}[]; top?: number; size?: number}> = ({items, top = 300, size = 84}) => {
  const f = useCurrentFrame();
  return (
    <div style={{position: "absolute", left: 50, right: 50, top, display: "flex", flexDirection: "column", alignItems: "center", gap: 10}}>
      {items.map((it, k) => {
        const p = pop(f, it.at);
        return (
          <div
            key={k}
            style={{
              fontFamily: F.ui,
              fontWeight: 900,
              fontSize: size,
              lineHeight: 1.05,
              textAlign: "center",
              color: it.color ?? C.navy,
              WebkitTextStroke: `${Math.round(size * 0.17)}px ${C.white}`,
              paintOrder: "stroke fill",
              textShadow: `0 ${Math.round(size * 0.07)}px 0 ${C.navy}`,
              transform: `scale(${Math.max(0.001, p)})`,
              opacity: p > 0 ? 1 : 0,
            }}
          >
            {it.text}
          </div>
        );
      })}
    </div>
  );
};

const AX0 = 80,
  AX1 = 1000;
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

// the Bible as a bar of 66 books, and Ezekiel 1-48 zoomed below it; a pin on the chapter
const RY1 = 760,
  RY2 = 1010;
const Ruler: React.FC<{from: number; to: number; moveAt: number; moveLen?: number}> = ({from, to, moveAt, moveLen = 26}) => {
  const f = useCurrentFrame();
  const ez = data.books.find((b) => b.pt === "Ezequiel")!;
  const n = data.ezChapters;
  const cw = (AX1 - AX0) / n;
  const p = interpolate(f, [moveAt, moveAt + moveLen], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const ch = lerp(from, to, p);
  const cur = Math.round(ch);
  const zoom = interpolate(f, [0, 10], [0, 1], {...clamp, easing: ease});
  const pinX = AX0 + (ch - 0.5) * cw;
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
          <g transform={`translate(${pinX} ${RY2 - 30})`}>
            <line x1={0} y1={0} x2={0} y2={34} stroke={C.white} strokeWidth={5} />
            <circle cx={0} cy={-58} r={58} fill={C.yellow} stroke={C.navy} strokeWidth={6} />
            <text x={0} y={-40} textAnchor="middle" fontFamily={F.ui} fontWeight={900} fontSize={54} fill={C.navy}>
              {cur}
            </text>
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------------ scenes
// scenes get their own duration d and global start frame s; L(t) = local frame of a narration time
type SceneP = {d: number; s: number};
const L = (s: number, t: number) => fr(t) - s;

// lines 1-2: the hook. A valley of bones, light from the sky, the prophet looking up; then "Ezequiel 37"
const S_Hook: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const ez = L(s, LINE(2).t0);
  const hookOut = interpolate(f, [ez - 4, ez + 4], [1, 0], clamp);
  const ref = pop(f, ez + 2);
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.0, 1.07]} origin="50% 70%">
        <Plate src="bg-vale" />
        <Bones />
      </Cam>
      <GodLight x={700} strength={0.9} />
      <Sprite src="ezequiel-olha" x={190} feet={1440} h={580} seed={4} />
      <Title top={250} size={92} a={hookOut}>
        E se foi <span style={{color: C.orange}}>Deus</span> quem escolheu o seu <span style={{color: C.orange}}>vale</span>?
      </Title>
      <Title top={300} size={130} a={ref > 0 ? 1 : 0} style={{transform: `scale(${Math.max(0.001, ref)})`}}>
        Ezequiel 37
      </Title>
      <Tag />
    </AbsoluteFill>
  );
};

// line 3: the hand of the Lord (a column of light) sets the prophet in the valley; the camera opens on the bones
const S_Hand: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const mao = L(s, wordT(3, "mao"));
  const vale = L(s, wordT(3, "vale"));
  const z = interpolate(f, [0, vale, vale + 30], [1.32, 1.3, 1.0], {...clamp, easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transformOrigin: "40% 72%", transform: `scale(${z})`}}>
        <Plate src="bg-vale" />
        <Bones />
        <Sprite src="ezequiel-olha" x={380} feet={1430} h={760} seed={8} />
        <Beam x={400} y={1430} start={mao} w={340} />
      </AbsoluteFill>
      <GodLight x={420} strength={0.7} />
      <Chip top={190}>Ezequiel 37:1</Chip>
      <Tag />
    </AbsoluteFill>
  );
};

// line 4: not punishment, not chance: the hand of God
const S_NotPunishment: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.05, 1.12]} origin="40% 70%">
        <Plate src="bg-vale" />
        <Bones />
        <Sprite src="ezequiel-olha" x={380} feet={1430} h={760} seed={8} />
        <Beam x={400} y={1430} start={-40} w={340} />
      </Cam>
      <GodLight x={420} strength={0.6 + 0.4 * interpolate(f, [L(s, wordT(4, "mao")), L(s, wordT(4, "mao")) + 10], [0, 1], clamp)} />
      <BigWords
        top={250}
        size={80}
        items={[
          {text: "Não foi castigo.", at: L(s, wordT(4, "castigo")) - 4},
          {text: "Não foi acaso.", at: L(s, wordT(4, "acaso")) - 4},
          {text: "Foi a mão de Deus.", at: L(s, wordT(4, "mao")) - 6, color: C.orange},
        ]}
      />
      <Tag />
    </AbsoluteFill>
  );
};

// line 5: Jesus led by the Spirit into the desert
const S_Desert: React.FC<SceneP> = ({d}) => (
  <AbsoluteFill>
    <Cam dur={d} z={[1.06, 1.16]} x={[30, -30]} origin="30% 55%">
      <Plate src="jesus-deserto" />
      <Twinkles box={[560, 120, 980, 900]} n={14} seed="ds" size={14} />
    </Cam>
    <Chip top={190}>Lucas 4:1</Chip>
    <Tag />
  </AbsoluteFill>
);

// line 6: the path from the valley through the desert to the river: not a destination, a passage
const S_Path: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, d], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const y = lerp(-330, 330, p);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `translate(0px, ${y}px) scale(1.35)`, transformOrigin: "50% 50%"}}>
        <Plate src="caminho" />
        <Twinkles box={[300, 250, 800, 700]} n={12} seed="cm" size={14} />
      </AbsoluteFill>
      <BigWords
        top={300}
        size={84}
        items={[
          {text: "Não são destino.", at: L(s, wordT(6, "destino")) - 6},
          {text: "São passagem.", at: L(s, wordT(6, "passagem")) - 6, color: C.orange},
        ]}
      />
      <Tag />
    </AbsoluteFill>
  );
};

// lines 7-8 in one valley: God asks from the light; the bones fly together, the breath, colour, life
const S_Life: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const ask = L(s, wordT(7, "pergunta"));
  const ossos = L(s, wordT(7, "ossos"));
  const assemble = L(s, LINE(8).t0) - 14;
  const sopro = L(s, wordT(8, "sopro"));
  const devolve = L(s, wordT(8, "devolve"));
  const vida = L(s, wordT(8, "vida"));
  const skin = interpolate(f, [sopro - 4, sopro + 8], [0, 1], {...clamp, easing: ease});
  const life = interpolate(f, [devolve, devolve + 16], [0, 1], {...clamp, easing: ease});
  const jump = interpolate(f, [vida, vida + 6, vida + 13, vida + 18, vida + 23], [0, -60, 0, -24, 0], clamp);
  const words = ["Por", "acaso", "viverão", "estes", "ossos?"];
  const keys = ["por", "acaso", "viverao", "estes", "ossos"];
  const askA = interpolate(f, [ask - 6, ask + 4, assemble + 6, assemble + 14], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.0, 1.08]} origin="58% 68%" shake={interpolate(f, [ossos, ossos + 3, ossos + 20], [0, 8, 0], clamp)}>
        <Plate src="bg-vale" />
        <Bones assembleAt={assemble} shakeAt={ossos} fadeAt={sopro - 2} />
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
        <Gust from={[-40, 900]} to={[560, 1150]} start={sopro - 6} dur={devolve - sopro + 16} seed="w1" />
        <Gust from={[1120, 900]} to={[700, 1150]} start={sopro - 3} dur={devolve - sopro + 14} seed="w2" />
        <Gust from={[-40, 1700]} to={[540, 1250]} start={sopro} dur={devolve - sopro + 12} seed="w3" />
        <Gust from={[1120, 1700]} to={[720, 1250]} start={sopro + 2} dur={devolve - sopro + 10} seed="w4" />
        <Burst x={626} y={1150} start={vida - 2} n={22} spread={420} seed="liv" />
      </Cam>
      <GodLight x={600} strength={0.5 + 0.5 * life} />
      <SkyRings x={600} start={ask - 2} />
      <Sprite src="ezequiel-olha" x={140} feet={1460} h={500} seed={50} dy={jump * 0.4} />
      <Title top={260} size={96} a={askA}>
        {words.map((w, i) => {
          const t = L(s, wordT(7, keys[i]));
          return (
            <span key={i} style={{color: f >= t ? C.orange : C.navy}}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </Title>
      <Chip top={190} a={askA}>
        Ezequiel 37:3
      </Chip>
      <Title top={300} size={110} a={interpolate(f, [vida - 2, vida + 6, d - 12, d - 4], [0, 1, 1, 0], clamp)}>
        <span style={{color: C.green}}>VIDA!</span>
      </Title>
      <Tag />
    </AbsoluteFill>
  );
};

// line 9: chapter 47
const S_Ch47: React.FC<SceneP> = ({d}) => {
  const f = useCurrentFrame();
  const len = Math.max(10, d - 22);
  return (
    <AbsoluteFill>
      <NightSky />
      <Title dark top={300} size={110} a={inn(f, 0, 8)}>
        Ezequiel {Math.round(interpolate(f, [4, 4 + len], [data.chFrom, data.chTo], {...clamp, easing: Easing.inOut(Easing.cubic)}))}
      </Title>
      <Ruler from={data.chFrom} to={data.chTo} moveAt={4} moveLen={len} />
      <Chip top={1210} a={interpolate(f, [len - 6, len + 2], [0, 1], clamp)} color={C.yellow} ink={C.navy}>
        +{data.between} capítulos
      </Chip>
    </AbsoluteFill>
  );
};

// river paths of the temple plate (frame pixels, measured on bg-templo.jpg)
const TEMPLE_FLOW = [
  "M 470 780 C 470 880, 520 960, 530 1040 C 540 1140, 420 1200, 410 1320 C 400 1440, 520 1560, 560 1700 C 590 1800, 600 1880, 610 1960",
  "M 520 780 C 520 880, 580 960, 600 1040 C 620 1140, 520 1220, 520 1330 C 520 1450, 680 1560, 720 1700 C 760 1800, 780 1880, 800 1960",
  "M 440 800 C 430 900, 470 980, 470 1060 C 470 1160, 340 1220, 330 1330 C 320 1450, 380 1570, 400 1700 C 410 1800, 400 1880, 400 1960",
];

// lines 10-11: water leaves the temple; then it rises (ankles, knees, waist) until he swims
const S_Water: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const cut = L(s, wordT(10, "tornozelos")) - 10;
  if (f < cut) {
    return (
      <AbsoluteFill>
        <Cam dur={cut + 10} z={[1.0, 1.12]} origin="47% 40%">
          <Plate src="bg-templo" />
          <Flow paths={TEMPLE_FLOW} />
          <Twinkles box={[300, 1000, 800, 1800]} n={14} seed="tp" />
        </Cam>
        <Chip top={190}>Ezequiel 47:1</Chip>
        <Title top={300} size={70} a={inn(f, 4, 10)}>
          Águas saindo do <span style={{color: C.turquoise}}>templo</span>
        </Title>
        <Tag />
      </AbsoluteFill>
    );
  }
  const FT = 1560,
    H = 880,
    X = 600;
  const t1 = L(s, wordT(10, "tornozelos"));
  const t2 = L(s, wordT(10, "joelhos"));
  const t3 = L(s, wordT(10, "cintura"));
  const t4 = L(s, wordT(11, "rio"));
  const marks: [string, number, number][] = [
    ["tornozelos", FT - 55, t1],
    ["joelhos", FT - 240, t2],
    ["cintura", FT - 480, t3],
  ];
  const lvl = interpolate(
    f,
    [cut, t1, t1 + 10, t2, t2 + 10, t3, t3 + 10, t4, t4 + 26],
    [FT + 30, FT + 30, marks[0][1], marks[0][1], marks[1][1], marks[1][1], marks[2][1], marks[2][1], FT - 720],
    {...clamp, easing: Easing.inOut(Easing.quad)},
  );
  const float = interpolate(f, [t4, t4 + 26], [0, 1], {...clamp, easing: ease});
  const bob = float * (Math.sin(f / 9) * 14);
  const lift = -float * 230;
  const nado = pop(f, L(s, wordT(11, "nado")) - 4);
  return (
    <AbsoluteFill>
      <Cam dur={d - cut} z={[1.0, 1.04]} origin="50% 60%">
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

// line 12: the same God who led you to the valley is leading you to the river (the water climbs over the valley)
const S_ValleyToRiver: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const rio = L(s, wordT(12, "rio"));
  const p = interpolate(f, [rio - 8, rio + 22], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
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
      <GodLight x={560} strength={0.8} />
      <Tag />
    </AbsoluteFill>
  );
};

// line 13: the valley is a way; the river is a promise
const RIVER_FLOW = [
  "M 600 700 C 640 900, 520 1100, 560 1300 C 600 1500, 520 1700, 540 1960",
  "M 650 760 C 720 950, 640 1150, 700 1350 C 760 1550, 700 1750, 760 1960",
  "M 560 760 C 520 950, 430 1150, 440 1350 C 450 1550, 380 1750, 360 1960",
];
const Rays: React.FC<{x?: number; y?: number; a?: number}> = ({x = 560, y = 640, a = 1}) => {
  const f = useCurrentFrame();
  return (
    <svg width={W} height={1920} style={{position: "absolute", left: 0, top: 0, mixBlendMode: "screen"}}>
      {Array.from({length: 12}).map((_, i) => {
        const g = (i / 12) * Math.PI - Math.PI + (f / 300) * (i % 2 ? 1 : -1);
        return <path key={i} d={`M ${x} ${y} L ${x + Math.cos(g - 0.06) * 1400} ${y + Math.sin(g - 0.06) * 1400} L ${x + Math.cos(g + 0.06) * 1400} ${y + Math.sin(g + 0.06) * 1400} Z`} fill="rgba(255,236,150,0.16)" opacity={a} />;
      })}
    </svg>
  );
};

const S_Promise: React.FC<SceneP> = ({d, s}) => (
  <AbsoluteFill>
    <Cam dur={d} z={[1.0, 1.1]} origin="52% 40%">
      <Plate src="bg-rio-vida" />
      <Rays />
      <Flow paths={RIVER_FLOW} speed={0.016} width={6} />
      <Twinkles box={[300, 900, 900, 1800]} n={18} seed="rv" />
    </Cam>
    <BigWords
      top={300}
      size={84}
      items={[
        {text: "O vale é caminho.", at: L(s, wordT(13, "vale")) - 6},
        {text: "O rio é promessa.", at: L(s, wordT(13, "rio")) - 6, color: C.turquoise},
      ]}
    />
    <Tag />
  </AbsoluteFill>
);

// line 14 + tail: the call to comment
const S_End: React.FC<SceneP> = ({d, s}) => {
  const f = useCurrentFrame();
  const eu = L(s, wordT(14, "eu"));
  const p = pop(f, eu - 4);
  return (
    <AbsoluteFill>
      <Cam dur={d} z={[1.1, 1.16]} origin="52% 40%">
        <Plate src="bg-rio-vida" />
        <Rays a={0.8} />
        <Flow paths={RIVER_FLOW} speed={0.016} width={6} />
      </Cam>
      <AbsoluteFill style={{background: "rgba(20,33,61,0.28)"}} />
      <Title dark top={360} size={70} a={inn(f, 2, 10)}>
        Se você está num vale hoje, escreve aqui:
      </Title>
      <div style={{position: "absolute", left: 0, right: 0, top: 640, display: "flex", justifyContent: "center"}}>
        <div
          style={{
            transform: `scale(${Math.max(0.001, p)}) rotate(-3deg)`,
            opacity: p > 0 ? 1 : 0,
            padding: "26px 44px",
            borderRadius: 40,
            background: C.white,
            border: `7px solid ${C.navy}`,
            boxShadow: `0 12px 0 ${C.navy}`,
            fontFamily: F.ui,
            fontWeight: 900,
            fontSize: 96,
            color: C.navy,
            textAlign: "center",
            lineHeight: 1.0,
          }}
        >
          eu vou <span style={{color: C.orange}}>atravessar</span>
          <svg width={64} height={64} viewBox="0 0 64 64" style={{position: "absolute", right: -28, bottom: -44}}>
            <path d="M8 8 h48 a6 6 0 0 1 6 6 v26 a6 6 0 0 1 -6 6 h-26 l-14 12 v-12 h-8 a6 6 0 0 1 -6 -6 v-26 a6 6 0 0 1 6 -6 z" fill={C.yellow} stroke={C.navy} strokeWidth={4} />
          </svg>
        </div>
      </div>
      <div style={{position: "absolute", left: 90, right: 90, top: 1600, textAlign: "center", fontFamily: F.mono, fontSize: 20, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", opacity: interpolate(f, [20, 30], [0, 1], clamp)}}>
        Texto bíblico: Bíblia Livre (CC BY 4.0) · Ilustrações e narração geradas por IA · Bíblia Conectada
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
    [1, S_Hook],
    [3, S_Hand],
    [4, S_NotPunishment],
    [5, S_Desert],
    [6, S_Path],
    [7, S_Life],
    [9, S_Ch47],
    [10, S_Water],
    [12, S_ValleyToRiver],
    [13, S_Promise],
    [14, S_End],
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
      <Captions hide={[1, 2, 4, 6, 7, 10, 13, 14]} />
    </AbsoluteFill>
  );
};
