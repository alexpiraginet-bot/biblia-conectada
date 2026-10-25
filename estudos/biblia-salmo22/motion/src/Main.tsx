import React from "react";
import {AbsoluteFill, Easing, interpolate, random, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F} from "./theme";
import {Filaments, Keys} from "./Filaments";

// "Não foi um grito. Foi uma citação." (video 7). An open book of light at the bottom and filaments rising from it
// (Filaments.tsx, Three.js); over them, the sentence everyone knows, then one pair at a time: the psalm verse top-left,
// the gospel verse bottom-right, and a bundle of light arching from one to the other. The psalm scrolls beside a column
// of light to its last line; "Está consumado" opens the network. Every text is BLIVRE from data.json.
const FPS = data.fps;
type Line = (typeof data.lines)[number];
const LINE = (i: number): Line => data.lines.find((l) => l.i === i)!;
const T = (i: number) => LINE(i).t0;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
const wordT = (i: number, w: string, nth = 0): number => {
  const hits = LINE(i).words.filter((x) => norm(x.w).startsWith(norm(w)));
  return (hits[nth] ?? hits[0] ?? {t0: LINE(i).t0}).t0;
};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const ramp = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], {...clamp, easing: ease});
const win = (t: number, a: number, b: number, fi = 0.25, fo = 0.3) =>
  Math.min(interpolate(t, [a, a + fi], [0, 1], clamp), interpolate(t, [b - fo, b], [1, 0], clamp));
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

const BG = "#04070C";
const GOLD = C.gold;
const INK = "#F6F0E4";
const DIM = "rgba(246,240,228,0.62)";
const PAIR_Y = 1000;                                   // screen height of the bundle's two ends

// ------------------------------------------------------------------------------------------------------ pieces
const Grain: React.FC<{opacity?: number}> = ({opacity = 0.05}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{backgroundImage: `url(${staticFile("img/grain.png")})`, backgroundSize: "512px 512px",
      backgroundPosition: `${Math.floor(random(`gx${k}`) * 512)}px ${Math.floor(random(`gy${k}`) * 512)}px`,
      mixBlendMode: "screen", opacity, pointerEvents: "none"}} />
  );
};

// a verse with some of its words lit
const Lit: React.FC<{text: string; lit: string[]; p: number; color?: string; size?: number; dim?: string; align?: "left" | "center" | "right"}> = ({
  text, lit, p, color = GOLD, size = 36, dim = DIM, align = "left",
}) => {
  const lower = text.toLowerCase();
  const spans: {s: number; e: number}[] = [];
  for (const frag of lit) {
    const i = lower.indexOf(frag.toLowerCase());
    if (i >= 0) spans.push({s: i, e: i + frag.length});
  }
  spans.sort((x, y) => x.s - y.s);
  const parts: React.ReactNode[] = [];
  let k = 0;
  spans.forEach((sp, n) => {
    if (sp.s > k) parts.push(<span key={`p${n}`}>{text.slice(k, sp.s)}</span>);
    const on = p > n / Math.max(1, spans.length);
    parts.push(<span key={`l${n}`} style={{color: on ? color : undefined, textShadow: on ? `0 0 22px ${color}99` : undefined}}>{text.slice(sp.s, sp.e)}</span>);
    k = sp.e;
  });
  if (k < text.length) parts.push(<span key="tail">{text.slice(k)}</span>);
  return <div style={{fontFamily: F.title, fontWeight: 440, fontSize: size, lineHeight: 1.28, color: dim, textAlign: align, textShadow: "0 2px 18px rgba(0,0,0,0.9)"}}>{parts}</div>;
};

const Ref: React.FC<{children: React.ReactNode; color?: string; align?: "left" | "right" | "center"}> = ({children, color = "rgba(246,240,228,0.55)", align = "left"}) => (
  <div style={{fontFamily: F.mono, fontSize: 22, letterSpacing: "0.1em", color, textAlign: align, textShadow: "0 2px 12px rgba(0,0,0,0.9)"}}>{children}</div>
);

// a pair: psalm verse top-left, gospel verse bottom-right; the bundle of light arches between them (Filaments)
const Pair: React.FC<{a: number; psRef: string; ps: string; psLit: string[]; ntRef: string; nt: string; ntLit: string[]; pL: number; pR: number; ntIn: number; votes?: number; size?: number}> = ({
  a, psRef, ps, psLit, ntRef, nt, ntLit, pL, pR, ntIn, votes, size = 36,
}) =>
  a <= 0 ? null : (
    <>
      <div style={{position: "absolute", left: 70, width: 600, top: PAIR_Y - 330, opacity: a, translate: `0px ${(1 - a) * 16}px`, display: "flex", flexDirection: "column", gap: 8}}>
        <Ref color={GOLD}>{psRef}</Ref>
        <Lit text={ps} lit={psLit} p={pL} size={size} />
      </div>
      <div style={{position: "absolute", right: 70, width: 600, top: PAIR_Y + 70, opacity: a * ntIn, translate: `0px ${(1 - ntIn) * 16}px`, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end"}}>
        <Lit text={nt} lit={ntLit} p={pR} size={size} align="right" />
        <Ref align="right">{ntRef}</Ref>
      </div>
      {votes !== undefined && ntIn > 0.9 ? (
        <div style={{position: "absolute", left: 0, right: 0, top: PAIR_Y - 20, textAlign: "center", opacity: a * ramp(ntIn, 0.9, 1), fontFamily: F.mono, fontSize: 20, color: GOLD, letterSpacing: "0.1em", textShadow: "0 2px 12px rgba(0,0,0,0.9)"}}>
          {fmt(votes)} VOTOS
        </div>
      ) : null}
    </>
  );

// ------------------------------------------------------------------------------------------------------ stage
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const tCit = wordT(2, "citacao"), tSalmo = wordT(3, "salmo"), tMil = wordT(3, "mil");
  const tFez = wordT(10, "fez"), tCons = T(11), tOlhem = wordT(12, "olhem"), tTudo = wordT(12, "tudo");
  const keys: Keys = {
    pairs: [{t0: tSalmo - 0.2, t1: T(5) - 0.25, yPx: PAIR_Y}, ...data.pairs.map((p) => ({t0: T(p.line) - 0.15, t1: T(p.line + 1) - 0.25, yPx: PAIR_Y}))],
    column: [T(9) + 0.2, tCons - 0.3],
    burst: tCons - 0.1,
    end: data.duration,
  };
  // the hook sentence
  const sentA = Math.min(1, t < T(3) - 0.3 ? 1 : interpolate(t, [T(3) - 0.3, T(3)], [1, 0], clamp));
  const turnA = win(t, T(2) - 0.05, T(3) - 0.15, 0.2, 0.2);
  const citP = ramp(t, tCit - 0.05, tCit + 0.3);
  // pairs
  const first = {a: win(t, tSalmo - 0.1, T(5) - 0.3, 0.3, 0.3), pL: ramp(t, tSalmo, tSalmo + 0.4), pR: ramp(t, tSalmo + 1.0, tSalmo + 1.4), ntIn: ramp(t, tSalmo + 0.8, tSalmo + 1.3)};
  // the psalm scroll
  const scrollA = win(t, T(9) + 0.3, tCons - 0.15, 0.3, 0.25);
  const scrollP = interpolate(t, [T(9) + 0.4, T(10) - 0.1], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const lastA = ramp(t, T(10) - 0.15, T(10) + 0.3) * (t < tCons - 0.1 ? 1 : interpolate(t, [tCons - 0.1, tCons], [1, 0], clamp));
  // the end
  const consA = win(t, tCons - 0.05, T(12) - 0.1, 0.12, 0.3);
  const goldOn = ramp(t, tCons + 0.15, tCons + 0.9);
  const pointA = win(t, T(12) - 0.05, T(13) - 0.1, 0.25, 0.3);
  const endA = ramp(t, T(13) - 0.1, T(13) + 0.4);
  const flash = Math.max(interpolate(t, [tCons - 0.02, tCons + 0.04, tCons + 0.5], [0, 0.35, 0], clamp), interpolate(t, [tCit - 0.02, tCit + 0.03, tCit + 0.25], [0, 0.12, 0], clamp));

  return (
    <AbsoluteFill style={{backgroundColor: BG, overflow: "hidden"}}>
      <Filaments keys={keys} />
      {/* soft scrim where text sits, so the light never eats the words */}
      <AbsoluteFill style={{background: "linear-gradient(to bottom, rgba(4,7,12,0.55) 0%, rgba(4,7,12,0.25) 30%, rgba(4,7,12,0) 60%)", pointerEvents: "none"}} />

      {/* L1-2: the sentence everyone knows, then the turn */}
      {sentA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 520, opacity: sentA, display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center"}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 78, lineHeight: 1.16, color: INK, textShadow: "0 0 34px rgba(255,255,255,0.25), 0 4px 30px rgba(0,0,0,0.9)"}}>
            “Deus meu, Deus meu, por que me desamparaste?”
          </div>
          <Ref align="center">MATEUS 27:46</Ref>
        </div>
      ) : null}
      {turnA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 880, opacity: turnA, display: "flex", flexDirection: "column", gap: 10, alignItems: "center"}}>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 54, color: INK, textShadow: "0 4px 30px rgba(0,0,0,0.9)"}}>Isso não foi um grito.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 70, color: GOLD, opacity: citP, translate: `0px ${(1 - citP) * 16}px`, textShadow: `0 0 ${40 * citP}px rgba(255,204,107,0.8), 0 4px 30px rgba(0,0,0,0.9)`}}>Foi uma citação.</div>
        </div>
      ) : null}

      {/* L3-4: the first pair, Ps 22:1 -> Mt 27:46 */}
      <Pair a={first.a} psRef={t > tMil - 0.05 ? "SALMO 22:1 · MIL ANOS ANTES DA CRUZ" : "SALMO 22:1"} ps={data.first.ps.replace(/^Salmo de Davi[^:]*: /, "")} psLit={[data.first.lit]}
        ntRef="MATEUS 27:46 · NA CRUZ" nt={data.first.mt.replace(/^E perto da hora nona, /, "…")} ntLit={[data.first.litMt]} pL={first.pL} pR={first.pR} ntIn={first.ntIn} votes={data.first.votes} size={38} />
      {first.a > 0 ? (
        <div style={{position: "absolute", left: 70, top: PAIR_Y - 56, opacity: first.a * ramp(t, tSalmo + 0.3, tSalmo + 0.7), fontFamily: F.hebrew, fontSize: 30, color: "rgba(246,240,228,0.55)", direction: "rtl", textShadow: "0 2px 12px rgba(0,0,0,0.9)"}}>{data.first.hebrew}</div>
      ) : null}

      {/* L5-8: one pair at a time */}
      {data.pairs.map((p, k) => {
        const t0 = T(p.line), t1 = T(p.line + 1);
        const a = win(t, t0 - 0.1, t1 - 0.3, 0.25, 0.3);
        return (
          <Pair key={k} a={a} psRef={p.ps_pt.toUpperCase()} ps={p.psText} psLit={p.psLit} ntRef={p.nt_pt.toUpperCase()} nt={p.ntText} ntLit={p.ntLit}
            pL={ramp(t, t0 + 0.05, t0 + 0.45)} pR={ramp(t, t0 + 1.1, t0 + 1.5)} ntIn={ramp(t, t0 + 0.85, t0 + 1.3)} votes={p.votes} />
        );
      })}

      {/* L9-10: the whole psalm scrolls beside the column of light, until the last verse stops */}
      {scrollA > 0 ? (
        <div style={{position: "absolute", left: 70, width: 600, top: 0, height: 1920, opacity: scrollA, overflow: "hidden",
          maskImage: "linear-gradient(to bottom, transparent 8%, black 24%, black 66%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 8%, black 24%, black 66%, transparent 100%)"}}>
          {(() => {
            const rowH = 150, total = data.psalm.length * rowH;
            const y = 980 - scrollP * (total - rowH);
            return data.psalm.map((v, i) => {
              const last = i === data.psalm.length - 1, yy = y + i * rowH;
              if (yy < -200 || yy > 2100) return null;
              return (
                <div key={i} style={{position: "absolute", left: 0, right: 0, top: yy, display: "flex", gap: 16, alignItems: "baseline", opacity: last ? 1 : 0.6}}>
                  <span style={{fontFamily: F.mono, fontSize: 18, color: last ? GOLD : "rgba(246,240,228,0.4)", width: 34, flexShrink: 0}}>{i + 1}</span>
                  <div style={{fontFamily: F.title, fontSize: last ? 40 : 25, lineHeight: 1.25, color: last ? INK : "rgba(246,240,228,0.55)", textShadow: "0 2px 14px rgba(0,0,0,0.95)"}}>
                    {last ? <Lit text={v} lit={[data.last.lit]} p={ramp(t, tFez - 0.1, tFez + 0.3)} size={40} dim={INK} /> : v}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : null}
      {lastA > 0 ? (
        <div style={{position: "absolute", left: 70, width: 600, top: 1200, opacity: lastA, display: "flex", flexDirection: "column", gap: 10}}>
          <Ref color={GOLD}>SALMO 22:31 · A ÚLTIMA LINHA</Ref>
          <div style={{fontFamily: F.hebrew, fontSize: 46, color: GOLD, direction: "rtl", textAlign: "left", opacity: ramp(t, tFez, tFez + 0.4), textShadow: "0 0 24px rgba(255,204,107,0.6)"}}>{data.last.hebrew}</div>
        </div>
      ) : null}

      <AbsoluteFill style={{background: "#FFF6E0", opacity: flash, pointerEvents: "none"}} />

      {/* L11: Está consumado. */}
      {consA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 560, opacity: consA, display: "flex", flexDirection: "column", alignItems: "center", gap: 22}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 116, lineHeight: 1.05, color: goldOn > 0.5 ? GOLD : INK, textAlign: "center",
            textShadow: `0 0 ${64 * goldOn}px rgba(255,204,107,0.8), 0 4px 30px rgba(0,0,0,0.9)`}}>“Está consumado.”</div>
          <Ref align="center" color={goldOn > 0.5 ? GOLD : "rgba(246,240,228,0.55)"}>JOÃO 19:30</Ref>
        </div>
      ) : null}

      {/* L12: the point */}
      {pointA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 520, opacity: pointA, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, textAlign: "center"}}>
          <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 48, color: DIM, lineHeight: 1.2, textShadow: "0 4px 30px rgba(0,0,0,0.9)"}}>Jesus não estava perguntando por quê.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 62, color: INK, lineHeight: 1.1, opacity: ramp(t, tOlhem - 0.3, tOlhem + 0.1), textShadow: "0 4px 30px rgba(0,0,0,0.9)"}}>Estava dizendo: olhem o salmo.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 78, color: GOLD, lineHeight: 1.1, opacity: ramp(t, tTudo - 0.1, tTudo + 0.3), textShadow: "0 0 40px rgba(255,204,107,0.7), 0 4px 30px rgba(0,0,0,0.9)"}}>Está tudo aqui.</div>
        </div>
      ) : null}

      {/* L13: the end */}
      {endA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 480, opacity: endA, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, textAlign: "center"}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 42, color: DIM, lineHeight: 1.25, textShadow: "0 4px 30px rgba(0,0,0,0.9)"}}>“Deus meu, Deus meu, por que me desamparaste?”</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 62, color: INK, lineHeight: 1.1, textShadow: "0 4px 30px rgba(0,0,0,0.9)"}}>Manda pra quem só conhece<br />a primeira frase.</div>
          <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 32, color: GOLD, marginTop: 6, textShadow: "0 4px 30px rgba(0,0,0,0.9)"}}>Comenta tua passagem favorita: ela pode virar o próximo vídeo.</div>
        </div>
      ) : null}
      {endA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, bottom: 70, opacity: endA, fontFamily: F.mono, fontSize: 18, lineHeight: 1.5, color: "rgba(246,240,228,0.65)", textAlign: "center", textShadow: "0 2px 12px rgba(0,0,0,0.9)"}}>
          Ligações e votos: OpenBible.info (CC BY), em Bíblia Conectada · Texto: Bíblia Livre (CC BY 4.0) · Hebraico: OSHB · Narração com voz sintética
        </div>
      ) : null}
      <Grain />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------------ captions
const Captions: React.FC<{show: number[]}> = ({show}) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const lines = data.lines;
  const idx = lines.findIndex((l, k) => {
    const next = lines[k + 1];
    const end = next ? Math.min(next.t0 - 0.05, l.t1 + 0.8) : l.t1 + 1.2;
    return t >= l.t0 - 0.1 && t < end;
  });
  if (idx < 0) return null;
  const l = lines[idx];
  if (!show.includes(l.i)) return null;
  const a = interpolate(t, [l.t0 - 0.1, l.t0 + 0.05], [0, 1], clamp);
  const words = l.display.split(" ");
  const spoken = l.words.filter((w) => w.t0 <= t).length;
  const litN = Math.round((l.words.length ? spoken / l.words.length : 1) * words.length);
  return (
    <div style={{position: "absolute", left: 80, right: 80, top: 300, display: "flex", justifyContent: "center", opacity: a}}>
      <div style={{fontFamily: F.ui, fontWeight: 600, fontSize: 40, lineHeight: 1.25, color: INK, textAlign: "center", maxWidth: 900, textShadow: "0 4px 30px rgba(0,0,0,0.95)"}}>
        {words.map((w, i) => <span key={i} style={{opacity: i < litN ? 1 : 0.4}}>{w}{i < words.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG}}>
    <Stage />
    <Captions show={[4, 9]} />
  </AbsoluteFill>
);
