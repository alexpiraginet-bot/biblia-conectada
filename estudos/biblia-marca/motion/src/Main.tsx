import React from "react";
import {AbsoluteFill, Easing, interpolate, random, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F} from "./theme";

// "A outra marca" (video 8). Kinetic typography cut on the voice: every line is one or more SHOTS that start on a
// spoken word (narr.json), with a hard cut, a punch-in, shake and a flash on the impacts, and white "inverted" shots
// on the beats. Nothing here names or pictures a party or candidate, and the palette has no party colour (no red, no
// green): night, paper, gold. Every verse, reference, chapter number and vote count comes from data.json.
const FPS = data.fps;
const W = 1080;
type Line = (typeof data.lines)[number];
const LINE = (i: number): Line => data.lines.find((l) => l.i === i)!;
const T = (i: number) => LINE(i).t0;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
// time of the nth word of line i that starts with w
const wt = (i: number, w: string, nth = 0): number => {
  const hits = LINE(i).words.filter((x) => norm(x.w).startsWith(norm(w)));
  return (hits[nth] ?? hits[0] ?? {t0: LINE(i).t0}).t0;
};
// a displayed phrase, word by word, with the time each word is spoken (searched in order from `from`)
type KW = {w: string; at: number};
const kin = (i: number, phrase: string, from = 0): KW[] => {
  const ws = LINE(i).words;
  let k = ws.findIndex((x) => x.t0 >= from - 1e-6);
  if (k < 0) k = 0;
  return phrase.split(" ").map((w) => {
    const n = norm(w);
    let j = k;
    while (j < ws.length && n && !norm(ws[j].w).startsWith(n.slice(0, Math.max(2, Math.min(n.length, 5))))) j++;
    if (j < ws.length && n) { k = j + 1; return {w, at: ws[j].t0}; }
    return {w, at: ws[Math.min(k, ws.length - 1)]?.t0 ?? LINE(i).t0};
  });
};
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const ramp = (t: number, a: number, b: number, e = easeOut) => interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

const NIGHT = "#05060A";
const PAPER = "#F2EEE6";
const GOLD = C.gold;
const INK = "#F6F0E4";
const DIM = "rgba(246,240,228,0.55)";
const UP = (s: string) => s.toLocaleUpperCase("pt-BR");

// --------------------------------------------------------------------------------------------- text fitting
let ctx: CanvasRenderingContext2D | null = null;
const fit = (text: string, family: string, weight: number, maxW: number, maxSize: number, track = -0.02): number => {
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  ctx!.font = `${weight} 100px "${family}"`;
  const w = ctx!.measureText(text).width + text.length * track * 100;
  return Math.min(maxSize, Math.floor((maxW / w) * 100));
};

// --------------------------------------------------------------------------------------------- pieces
// a block of big words; each word slams in when it is spoken
const Slam: React.FC<{t: number; rows: {words: KW[]; color?: string; size?: number}[]; ink: string; maxSize?: number; gap?: number; align?: "center" | "left"}> = ({
  t, rows, ink, maxSize = 190, gap = 6, align = "center",
}) => (
  <div style={{display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap}}>
    {rows.map((r, ri) => {
      const txt = r.words.map((w) => w.w).join(" ");
      const size = r.size ?? fit(UP(txt), F.ui, 700, W - 140, maxSize);
      return (
        <div key={ri} style={{fontFamily: F.ui, fontWeight: 700, fontSize: size, lineHeight: 0.98, letterSpacing: "-0.02em", color: r.color ?? ink, whiteSpace: "nowrap"}}>
          {r.words.map((w, i) => {
            // not yet spoken: a ghost of the word (the line reads ahead); spoken: it slams in
            const ghost = t < w.at - 0.03;
            const a = ramp(t, w.at - 0.03, w.at + 0.07, Easing.out(Easing.cubic));
            return (
              <span key={i} style={{display: "inline-block", opacity: ghost ? 0.13 : Math.max(0.13, a), transform: ghost ? undefined : `scale(${1 + 0.45 * (1 - a)})`,
                filter: ghost || a > 0.98 ? undefined : `blur(${(1 - a) * 8}px)`, marginRight: i < r.words.length - 1 ? "0.24em" : 0}}>
                {UP(w.w)}
              </span>
            );
          })}
        </div>
      );
    })}
  </div>
);

const Mono: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = GOLD, size = 28, style}) => (
  <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: size, letterSpacing: "0.16em", color, whiteSpace: "nowrap", ...style}}>{children}</div>
);

// the mark: a ring that slams onto the screen, with a shock ring
const Stamp: React.FC<{lt: number; color: string; children: React.ReactNode; size?: number}> = ({lt, color, children, size = 560}) => {
  const a = ramp(lt, 0, 0.13, Easing.out(Easing.back(1.6)));
  const shock = ramp(lt, 0.08, 0.6, Easing.out(Easing.quad));
  return (
    <div style={{position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center"}}>
      <div style={{position: "absolute", inset: 0, borderRadius: "50%", border: `6px solid ${color}`, opacity: 0.6 * (1 - shock), transform: `scale(${1 + 0.7 * shock})`}} />
      <div style={{position: "absolute", inset: 0, borderRadius: "50%", border: `14px solid ${color}`, opacity: Math.min(1, a * 1.4), transform: `scale(${2.3 - 1.3 * a}) rotate(${-14 + 6 * a}deg)`}} />
      <div style={{position: "absolute", inset: 34, borderRadius: "50%", border: `3px solid ${color}`, opacity: a * 0.7, transform: `scale(${2.3 - 1.3 * a})`}} />
      <div style={{opacity: a, transform: `scale(${2.3 - 1.3 * a}) rotate(${-8 * (1 - a)}deg)`, textAlign: "center"}}>{children}</div>
    </div>
  );
};

// a bar that strikes through a word
const Strike: React.FC<{t: number; at: number; color: string; top?: number}> = ({t, at, color, top = 50}) => {
  const p = ramp(t, at, at + 0.11, Easing.out(Easing.cubic));
  return <div style={{position: "absolute", left: -20, top: `${top}%`, height: 22, width: `calc(${p * 100}% + ${40 * p}px)`, background: color, transform: "translateY(-50%) rotate(-3deg)", transformOrigin: "left"}} />;
};

// a verse with some fragments lit progressively between a and b
const Verse: React.FC<{t: number; v: {ref: string; text: string; lit: string[]}; a: number; b: number; size?: number; ink?: string}> = ({t, v, a, b, size = 54, ink = INK}) => {
  const lower = v.text.toLowerCase();
  const spans = v.lit.map((f) => ({s: lower.indexOf(f.toLowerCase()), e: lower.indexOf(f.toLowerCase()) + f.length})).filter((x) => x.s >= 0).sort((x, y) => x.s - y.s);
  const parts: React.ReactNode[] = [];
  let k = 0;
  spans.forEach((sp, n) => {
    if (sp.s > k) parts.push(<span key={`d${n}`}>{v.text.slice(k, sp.s)}</span>);
    const on = ramp(t, a + ((b - a) * n) / spans.length, a + ((b - a) * n) / spans.length + 0.15);
    parts.push(<span key={`l${n}`} style={{color: on > 0.5 ? GOLD : ink, textShadow: on > 0.5 ? `0 0 28px ${GOLD}88` : undefined, background: `linear-gradient(90deg, ${GOLD}2a ${on * 100}%, transparent ${on * 100}%)`}}>{v.text.slice(sp.s, sp.e)}</span>);
    k = sp.e;
  });
  if (k < v.text.length) parts.push(<span key="tail">{v.text.slice(k)}</span>);
  return (
    <div style={{display: "flex", flexDirection: "column", gap: 26, width: W - 140}}>
      <Mono size={32}>{UP(v.ref)}</Mono>
      <div style={{fontFamily: F.title, fontWeight: 500, fontSize: size, lineHeight: 1.18, color: ink}}>{parts}</div>
    </div>
  );
};

// a link of the base: reference, a line that draws itself, the votes, the other reference
const Link: React.FC<{lt: number; a: string; b: string; votes: number; ink?: string}> = ({lt, a, b, votes, ink = INK}) => {
  const p1 = ramp(lt, 0, 0.12), p2 = ramp(lt, 0.1, 0.38, Easing.inOut(Easing.cubic)), p3 = ramp(lt, 0.3, 0.45), n = ramp(lt, 0.3, 0.62, Easing.out(Easing.cubic));
  return (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 0}}>
      <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: fit(UP(a), F.ui, 700, W - 160, 96), color: ink, opacity: p1, transform: `translateY(${(1 - p1) * -40}px)`, whiteSpace: "nowrap"}}>{UP(a)}</div>
      <div style={{position: "relative", width: 6, height: 360, margin: "26px 0"}}>
        <div style={{position: "absolute", left: 0, top: 0, width: 6, height: `${p2 * 100}%`, background: GOLD, boxShadow: `0 0 30px ${GOLD}, 0 0 8px ${GOLD}`}} />
        <div style={{position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * p3})`, opacity: p3, background: NIGHT, border: `3px solid ${GOLD}`, borderRadius: 999, padding: "16px 34px", display: "flex", gap: 14, alignItems: "baseline", whiteSpace: "nowrap", boxShadow: `0 0 50px ${GOLD}55`}}>
          <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 58, color: GOLD}}>{fmt(votes * n)}</span>
          <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 26, letterSpacing: "0.16em", color: DIM}}>VOTOS</span>
        </div>
      </div>
      <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: fit(UP(b), F.ui, 700, W - 160, 96), color: p2 > 0.98 ? GOLD : ink, opacity: ramp(lt, 0.3, 0.42), transform: `translateY(${(1 - ramp(lt, 0.3, 0.42)) * 40}px)`, whiteSpace: "nowrap"}}>{UP(b)}</div>
    </div>
  );
};

// an arrow, drawn in SVG; dir 1 points right, -1 points left
const Arrow: React.FC<{dir: 1 | -1; len: number; color: string; p: number}> = ({dir, len, color, p}) => (
  <svg width={len} height={80} viewBox={`0 0 ${len} 80`} style={{overflow: "visible", transform: dir < 0 ? "scaleX(-1)" : undefined}}>
    <line x1={0} y1={40} x2={(len - 10) * p} y2={40} stroke={color} strokeWidth={14} strokeLinecap="square" />
    {p > 0.95 ? <polyline points={`${len - 46},6 ${len - 6},40 ${len - 46},74`} fill="none" stroke={color} strokeWidth={14} strokeLinejoin="miter" /> : null}
  </svg>
);

// the screen split in two halves; each half points at the other
const Split: React.FC<{lt: number; ink: string; label: string; inward: boolean; dy?: number}> = ({lt, ink, label, inward, dy = 0}) => {
  const p = ramp(lt, 0.02, 0.22, Easing.out(Easing.cubic));
  const slide = (1 - p) * 540;
  return (
    <AbsoluteFill>
      <div style={{position: "absolute", left: W / 2 - 2, top: 260, bottom: 260, width: 4, background: ink, opacity: 0.35, transform: `scaleY(${ramp(lt, 0, 0.18)})`}} />
      {[0, 1].map((s) => (
        <div key={s} style={{position: "absolute", left: s === 0 ? 0 : W / 2, width: W / 2, top: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 44,
          transform: `translate(${(s === 0 ? -1 : 1) * slide}px, ${dy}px)`}}>
          <Arrow dir={(s === 0) === inward ? 1 : -1} len={360} color={ink} p={p} />
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 80, lineHeight: 0.98, color: ink, textAlign: "center", whiteSpace: "pre-line"}}>{label}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// the chapter counter: the book name over a number that rolls like a slot
const Roll: React.FC<{t: number; a: number; b: number; from: number; to: number; ink: string}> = ({t, a, b, from, to, ink}) => {
  const p = interpolate(t, [a, b], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const x = from + (to - from) * p, n = Math.floor(x), frac = x - n;
  const land = ramp(t, b, b + 0.12);
  const num = (k: number, y: number, o: number) => (
    <div style={{position: "absolute", left: 0, right: 0, top: 0, textAlign: "center", transform: `translateY(${y}px)`, opacity: o, filter: `blur(${p < 1 ? 6 : 0}px)`}}>{Math.min(to, k)}</div>
  );
  return (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 10}}>
      <Mono color={ink} size={44}>{UP(data.book)}</Mono>
      <div style={{position: "relative", width: W, height: 470, overflow: "hidden", fontFamily: F.ui, fontWeight: 700, fontSize: 460, lineHeight: 1, letterSpacing: "-0.04em", color: land > 0.5 ? GOLD : ink, textShadow: land > 0.5 ? `0 0 80px ${GOLD}99` : undefined}}>
        {p < 1 ? <>{num(n, -frac * 470, 1)}{num(n + 1, (1 - frac) * 470, 1)}</> : num(to, 0, 1)}
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------------------------- shots
type Shot = {t: number; kind: "hit" | "cut" | "whip"; invert?: boolean; flash?: number; rumble?: number; el: (lt: number, t: number, ink: string) => React.ReactNode};
const V = data.verses;
const P = data.pairs;
const center = (node: React.ReactNode, top = 0) => (
  <AbsoluteFill style={{alignItems: "center", justifyContent: "center", padding: "0 70px", transform: `translateY(${top}px)`}}>{node}</AbsoluteFill>
);

const buildShots = (): Shot[] => {
  const s: Shot[] = [];
  const at = (x: number) => x - 0.04;           // cut a hair before the word, so the picture lands with the consonant
  // L1 hook
  // frame 0 is the hook: the whole first phrase is already on screen, no flash
  const now = (ws: KW[]) => ws.map((w) => ({...w, at: -1}));
  s.push({t: 0, kind: "cut", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: now(kin(1, "Todo ano"))}, {words: now(kin(1, "de eleição", wt(1, "de")))}]} />)});
  s.push({t: at(wt(1, "alguem")), kind: "cut", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(1, "alguém", wt(1, "alguem"))}, {words: kin(1, "descobre", wt(1, "descobre"))}]} />)});
  s.push({t: at(wt(1, "quem")), kind: "cut", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(1, "quem é a", wt(1, "quem")), size: 120}, {words: kin(1, "besta", wt(1, "besta")), size: 300}]} />)});
  s.push({t: at(wt(1, "besta")), kind: "hit", invert: true, flash: 0.9, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 30}}>
      <Slam t={t} ink={ink} rows={[{words: kin(1, "quem é a", wt(1, "quem")), size: 120}, {words: kin(1, "besta", wt(1, "besta")), size: 300}]} />
      <Mono color={ink} size={34} style={{opacity: ramp(t, wt(1, "apocalipse") - 0.05, wt(1, "apocalipse") + 0.1)}}>{UP(`do ${data.book}`)}</Mono>
    </div>)});
  // L2 "E é sempre o outro lado."
  s.push({t: at(T(2)), kind: "whip", el: (lt, t, ink) => <Split lt={lt} ink={ink} label={UP("o outro\nlado")} inward />});
  s.push({t: at(wt(2, "lado")), kind: "hit", flash: 0.35, el: (lt, t, ink) => <Split lt={1} ink={ink} label={UP("o outro\nlado")} inward />});
  // L3
  s.push({t: at(T(3)), kind: "cut", el: (lt, t, ink) => center(<Slam t={t} ink={ink} maxSize={110} rows={[{words: kin(3, "Mas quase ninguém")}, {words: kin(3, "lê", wt(3, "le"))}]} />)});
  s.push({t: at(wt(3, "onde")), kind: "hit", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(3, "onde fica", wt(3, "onde"))}, {words: kin(3, "a marca?", wt(3, "a", 1)), color: GOLD, size: 230}]} />)});
  // L4 the mark: right hand, forehead
  s.push({t: at(T(4)), kind: "hit", flash: 0.6, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 70}}>
      <Stamp lt={lt} color={ink}><div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 104, lineHeight: 0.95, color: ink}}>{UP("mão")}<br />{UP("direita")}</div></Stamp>
      <Mono color={GOLD} size={30} style={{opacity: ramp(lt, 0.2, 0.4)}}>{UP(V.Rev_13_16.ref)}</Mono>
    </div>)});
  s.push({t: at(wt(4, "ou")), kind: "hit", invert: true, flash: 0.8, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 70}}>
      <Stamp lt={lt} color={ink}><div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 92, lineHeight: 0.95, color: ink}}>{UP("ou na")}<br /><span style={{fontSize: 150}}>{UP("testa")}</span></div></Stamp>
      <Mono color={ink} size={30} style={{opacity: ramp(lt, 0.2, 0.4)}}>{UP(V.Rev_13_16.ref)}</Mono>
    </div>)});
  // L5 the question
  s.push({t: at(T(5)), kind: "whip", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(5, "Sabe onde mais")}, {words: kin(5, "a Bíblia manda", wt(5, "a")), size: 104}]} />)});
  s.push({t: at(wt(5, "por")), kind: "cut", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(5, "pôr um sinal", wt(5, "por"))}, {words: kin(5, "na mão", wt(5, "na")), color: GOLD}, {words: kin(5, "e na testa?", wt(5, "e")), color: GOLD}]} />)});
  // L6 Deuteronomy 6
  s.push({t: at(T(6)), kind: "hit", invert: true, flash: 0.9, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 0}}>
      <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: fit(UP(V.Deut_6_8.chapter), F.ui, 700, W - 120, 190), color: ink, letterSpacing: "-0.03em", whiteSpace: "nowrap", transform: `scale(${1 + 0.3 * (1 - ramp(lt, 0, 0.12))})`}}>{UP(V.Deut_6_8.chapter)}</div>
    </div>)});
  s.push({t: at(wt(6, "as")), kind: "whip", el: (lt, t, ink) => center(<Verse t={t} v={V.Deut_6_8} a={wt(6, "por") - 0.05} b={wt(6, "entre") + 0.05} size={80} ink={ink} />)});
  s.push({t: at(LINE(6).t1 + 0.12), kind: "hit", flash: 0.4, el: (lt, t, ink) => center(<Link lt={lt} a={P[0].a} b={P[0].b} votes={P[0].votes} ink={ink} />)});
  // L7 not a chip
  s.push({t: at(T(7)), kind: "cut", el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
      <Slam t={t} ink={ink} maxSize={120} rows={[{words: kin(7, "A marca não é")}]} />
      <div style={{position: "relative", marginTop: 10}}>
        <Slam t={t} ink={ink} rows={[{words: kin(7, "um chip.", wt(7, "um")), size: 260}]} />
        <Strike t={t} at={wt(7, "chip") + 0.18} color={GOLD} />
      </div>
    </div>)});
  s.push({t: at(wt(7, "quem")), kind: "hit", flash: 0.3, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "stretch", gap: 60, width: W - 140}}>
      <Slam t={t} ink={ink} maxSize={130} rows={[{words: kin(7, "É quem manda", wt(7, "e", 1))}]} />
      {[["no que você faz", "faz", "mão"], ["no que você pensa", "pensa", "testa"]].map(([ph, key, tag], k) => {
        const tw = wt(7, key);
        return (
          <div key={k} style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, opacity: ramp(t, tw - 0.25, tw - 0.1)}}>
            <Slam t={t} ink={ink} align="left" rows={[{words: kin(7, ph, wt(7, "no", k)), size: 74}]} />
            <div style={{border: `4px solid ${GOLD}`, borderRadius: 999, padding: "10px 26px", transform: `scale(${1 + 0.5 * (1 - ramp(t, tw, tw + 0.12))})`, opacity: ramp(t, tw - 0.02, tw + 0.08)}}>
              <Mono color={GOLD} size={34}>{UP(tag)}</Mono>
            </div>
          </div>
        );
      })}
    </div>)});
  // L8 worship
  s.push({t: at(T(8)), kind: "whip", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(8, "E o que")}, {words: kin(8, "a besta", wt(8, "a"))}, {words: kin(8, "quer?", wt(8, "quer"))}]} />)});
  s.push({t: at(wt(8, "adoracao")), kind: "hit", invert: true, flash: 1, el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(8, "Adoração.", wt(8, "adoracao"))}]} maxSize={240} />)});
  // L9 Ap 13:4, said by the crowd: rumble
  s.push({t: at(T(9)), kind: "hit", rumble: 5, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", gap: 34, width: W - 140}}>
      <Mono>{UP(V.Rev_13_4.ref)}</Mono>
      <div style={{fontFamily: F.title, fontWeight: 500, fontStyle: "italic", fontSize: 128, lineHeight: 1.0, color: ink}}>
        {kin(9, "“Quem é semelhante à besta?”").map((w, i) => <span key={i} style={{opacity: Math.max(0.13, ramp(t, w.at - 0.03, w.at + 0.06)), marginRight: "0.22em", display: "inline-block"}}>{w.w}</span>)}
      </div>
    </div>)});
  s.push({t: at(wt(9, "quem", 1)), kind: "hit", rumble: 9, flash: 0.35, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", gap: 34, width: W - 140}}>
      <Mono>{UP(V.Rev_13_4.ref)}</Mono>
      <div style={{fontFamily: F.title, fontWeight: 500, fontStyle: "italic", fontSize: 128, lineHeight: 1.0, color: GOLD}}>
        {kin(9, "“Quem pode batalhar contra ela?”", wt(9, "quem", 1)).map((w, i) => <span key={i} style={{opacity: Math.max(0.13, ramp(t, w.at - 0.03, w.at + 0.06)), marginRight: "0.22em", display: "inline-block"}}>{w.w}</span>)}
      </div>
    </div>)});
  // L10 worship of power, from any side
  s.push({t: at(T(10)), kind: "cut", el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(10, "É o grito de quem"), size: 84}, {words: kin(10, "idolatra", wt(10, "idolatra")), size: 210}, {words: kin(10, "o poder.", wt(10, "o", 1)), color: GOLD, size: 210}]} />)});
  s.push({t: at(wt(10, "de", 1)), kind: "hit", invert: true, flash: 0.7, el: (lt, t, ink) => (
    <AbsoluteFill>
      <Split lt={lt} ink={ink} label={""} inward={false} dy={-430} />
      {center(<div><Slam t={t} ink={ink} rows={[{words: kin(10, "de qualquer", wt(10, "de", 1)), size: 128}, {words: kin(10, "lado.", wt(10, "lado")), size: 200}]} /></div>)}
    </AbsoluteFill>)});
  // L11 the chapter counter rolls from 13 to 22
  s.push({t: at(T(11)), kind: "whip", el: (lt, t, ink) => center(<Roll t={t} a={T(11) + 0.1} b={LINE(11).t1 - 0.05} from={data.roll[0]} to={data.roll[1]} ink={ink} />)});
  s.push({t: at(LINE(11).t1 - 0.05), kind: "hit", flash: 0.7, el: (lt, t, ink) => center(<Roll t={t} a={T(11) + 0.1} b={LINE(11).t1 - 0.05} from={data.roll[0]} to={data.roll[1]} ink={ink} />)});
  // L12 Ap 22:4
  s.push({t: at(T(12)), kind: "cut", el: (lt, t, ink) => center(<Verse t={t} v={V.Rev_22_4} a={wt(12, "nome") - 0.2} b={wt(12, "testas")} size={84} ink={ink} />)});
  s.push({t: at(LINE(12).t1 + 0.1), kind: "hit", flash: 0.4, el: (lt, t, ink) => center(<Link lt={lt} a={P[1].a} b={P[1].b} votes={P[1].votes} ink={ink} />)});
  // L13 the mark comes back; only the name changes
  s.push({t: at(T(13)), kind: "hit", flash: 0.5, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 60}}>
      <Slam t={t} ink={ink} maxSize={120} rows={[{words: kin(13, "A marca volta no fim.")}]} />
      <Stamp lt={lt} color={ink} size={480}><div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 70, lineHeight: 1.0, color: ink}}>{UP("marca da")}<br /><span style={{fontSize: 110}}>{UP("besta")}</span></div></Stamp>
    </div>)});
  s.push({t: at(wt(13, "so")), kind: "hit", flash: 0.9, el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 60}}>
      <Slam t={t} ink={ink} maxSize={120} rows={[{words: kin(13, "Só muda o nome.", wt(13, "so"))}]} />
      <Stamp lt={lt} color={GOLD} size={480}><div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 70, lineHeight: 1.0, color: GOLD, textShadow: `0 0 40px ${GOLD}88`}}>{UP("o nome")}<br /><span style={{fontSize: 110}}>{UP("dele")}</span></div></Stamp>
    </div>)});
  // L14 the point
  s.push({t: at(T(14)), kind: "cut", el: (lt, t, ink) => center(
    <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 20}}>
      <Slam t={t} ink={ink} maxSize={110} rows={[{words: kin(14, "A pergunta não é")}]} />
      <div style={{position: "relative"}}>
        <Slam t={t} ink={ink} rows={[{words: kin(14, "em quem", wt(14, "em")), size: 150}, {words: kin(14, "você votou.", wt(14, "voce")), size: 150}]} />
        <Strike t={t} at={wt(14, "votou") + 0.3} color={GOLD} top={27} /><Strike t={t} at={wt(14, "votou") + 0.38} color={GOLD} top={76} />
      </div>
    </div>)});
  s.push({t: at(wt(14, "qual")), kind: "hit", flash: 0.8, el: (lt, t, ink) => center(<Slam t={t} ink={ink} rows={[{words: kin(14, "É qual nome", wt(14, "votou") + 0.05)}, {words: kin(14, "está na", wt(14, "esta"))}, {words: kin(14, "sua testa?", wt(14, "sua")), color: GOLD}]} maxSize={170} />)});
  // L15 CTA + credits
  s.push({t: at(T(15)), kind: "hit", invert: true, flash: 0.6, el: (lt, t, ink) => (
    <AbsoluteFill>
      {center(
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: 46}}>
          <Slam t={t} ink={ink} rows={[{words: kin(15, "Manda pra quem"), size: 112}, {words: kin(15, "chamou o outro lado", wt(15, "chamou")), size: 88}, {words: kin(15, "de besta.", wt(15, "de")), size: 200}]} />
          <div style={{fontFamily: F.ui, fontWeight: 600, fontSize: 36, lineHeight: 1.3, color: ink, textAlign: "center", opacity: ramp(t, LINE(15).t1 + 0.2, LINE(15).t1 + 0.5)}}>
            Comenta tua passagem favorita:<br />ela pode virar o próximo vídeo.
          </div>
        </div>, -40)}
      <div style={{position: "absolute", left: 70, right: 70, bottom: 90, fontFamily: F.mono, fontSize: 19, lineHeight: 1.5, color: ink, opacity: 0.7 * ramp(t, LINE(15).t1, LINE(15).t1 + 0.4), textAlign: "center"}}>{data.credits}</div>
    </AbsoluteFill>)});
  return s.sort((x, y) => x.t - y.t);
};

// --------------------------------------------------------------------------------------------- stage
const Grain: React.FC<{dark: boolean}> = ({dark}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{backgroundImage: `url(${staticFile("img/grain.png")})`, backgroundSize: "512px 512px",
      backgroundPosition: `${Math.floor(random(`gx${k}`) * 512)}px ${Math.floor(random(`gy${k}`) * 512)}px`,
      mixBlendMode: dark ? "screen" : "multiply", opacity: dark ? 0.06 : 0.12, pointerEvents: "none"}} />
  );
};

export const Main: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const shots = React.useMemo(buildShots, []);
  let k = 0;
  for (let i = 0; i < shots.length; i++) if (shots[i].t <= t) k = i;
  const sh = shots[k];
  const lt = Math.max(0, t - sh.t);
  const ink = sh.invert ? NIGHT : INK;
  const bg = sh.invert ? PAPER : NIGHT;
  // camera: punch-in on the cut, slow push, shake on hits, whip from the right
  const punch = sh.kind === "hit" ? 0.16 * Math.exp(-lt * 11) : sh.kind === "cut" ? 0.07 * Math.exp(-lt * 13) : 0;
  const push = 0.018 * Math.min(lt, 3);
  const shakeA = (sh.kind === "hit" ? 22 * Math.exp(-lt * 9) : 0) + (sh.rumble ?? 0);
  const sx = (random(`sx${f}`) - 0.5) * 2 * shakeA, sy = (random(`sy${f}`) - 0.5) * 2 * shakeA, rot = (random(`sr${f}`) - 0.5) * shakeA * 0.04;
  const whip = sh.kind === "whip" ? interpolate(lt, [0, 0.14], [1, 0], {...clamp, easing: Easing.out(Easing.cubic)}) : 0;
  const flash = (sh.flash ?? 0) * Math.exp(-lt * 20);
  // a light that drifts behind the type (gold on night, a soft shadow on paper)
  const lx = 50 + 18 * Math.sin(t * 0.7), ly = 45 + 10 * Math.cos(t * 0.53);
  return (
    <AbsoluteFill style={{backgroundColor: bg, overflow: "hidden"}}>
      <AbsoluteFill style={{background: sh.invert
        ? `radial-gradient(ellipse 80% 60% at ${lx}% ${ly}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)`
        : `radial-gradient(ellipse 75% 50% at ${lx}% ${ly}%, rgba(255,204,107,0.10) 0%, rgba(255,204,107,0) 70%)`}} />
      <AbsoluteFill style={{transform: `translate(${sx + whip * 420}px, ${sy}px) scale(${1 + punch + push}) rotate(${rot}deg)`, filter: whip > 0.02 ? `blur(${whip * 22}px)` : undefined}}>
        {sh.el(lt, t, ink)}
      </AbsoluteFill>
      {/* a thin scan line sweeping down on every shot */}
      <div style={{position: "absolute", left: 0, right: 0, height: 2, top: `${(lt * 140) % 120 - 10}%`, background: sh.invert ? "rgba(5,6,10,0.08)" : "rgba(255,204,107,0.12)"}} />
      <AbsoluteFill style={{background: "radial-gradient(ellipse 95% 75% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.5) 100%)", opacity: sh.invert ? 0.35 : 1, pointerEvents: "none"}} />
      <Grain dark={!sh.invert} />
      <AbsoluteFill style={{background: "#FFFFFF", opacity: flash, pointerEvents: "none"}} />
    </AbsoluteFill>
  );
};
