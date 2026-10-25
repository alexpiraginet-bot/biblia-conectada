import React from "react";
import {AbsoluteFill, Easing, interpolate, random, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F} from "./theme";

// "Não foi um grito. Foi uma citação." (video 7). Text and silence: a near-black screen, the sentence everyone knows,
// then two columns (Psalm 22 on the left, the cross on the right) joined by four threads, the whole psalm scrolling to
// its last line, and "Está consumado" alone. Every text on screen is BLIVRE from data.json; every pair is a real one.
const FPS = data.fps;
type Line = (typeof data.lines)[number];
const LINE = (i: number): Line => data.lines.find((l) => l.i === i)!;
const T = (i: number) => LINE(i).t0;
const TE = (i: number) => LINE(i).t1;
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
const INK = "#F2EBDD";
const DIM = "rgba(242,235,221,0.55)";

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

// a heartbeat in the dark: a faint warm vignette that pulses, slower each time, and stops before "ele assim fez"
const heartbeat = (t: number, until: number) => {
  if (t > until) return 0;
  const period = 0.95 + 0.5 * Math.min(1, t / until);          // 0.95 s -> 1.45 s
  const ph = (t % period) / period;
  const beat = (x: number, c: number, w: number) => Math.exp(-((x - c) ** 2) / (2 * w * w));
  return 0.8 * beat(ph, 0.08, 0.05) + 0.5 * beat(ph, 0.3, 0.06);
};

// a verse with some of its words lit
const Lit: React.FC<{text: string; lit: string[]; p: number; color?: string; size?: number; dim?: string; align?: "left" | "center" | "right"}> = ({
  text, lit, p, color = GOLD, size = 34, dim = DIM, align = "left",
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
    parts.push(<span key={`l${n}`} style={{color: on ? color : undefined, textShadow: on ? `0 0 22px ${color}88` : undefined, transition: "none"}}>{text.slice(sp.s, sp.e)}</span>);
    k = sp.e;
  });
  if (k < text.length) parts.push(<span key="tail">{text.slice(k)}</span>);
  return <div style={{fontFamily: F.title, fontWeight: 440, fontSize: size, lineHeight: 1.3, color: dim, textAlign: align}}>{parts}</div>;
};

const Ref: React.FC<{children: React.ReactNode; color?: string; align?: "left" | "right" | "center"}> = ({children, color = "rgba(242,235,221,0.5)", align = "left"}) => (
  <div style={{fontFamily: F.mono, fontSize: 21, letterSpacing: "0.1em", color, textAlign: align}}>{children}</div>
);

// a thread between the two columns, drawn left to right, with a small vote chip at its middle
const Thread: React.FC<{y: number; p: number; votes: number; a: number}> = ({y, p, votes, a}) => {
  if (a <= 0 || p <= 0) return null;
  const x0 = 506, x1 = 574;
  return (
    <div style={{position: "absolute", left: 0, top: 0, opacity: a}}>
      <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        <line x1={x0} y1={y} x2={x0 + (x1 - x0) * p} y2={y} stroke={GOLD} strokeWidth={10} strokeOpacity={0.18} strokeLinecap="round" />
        <line x1={x0} y1={y} x2={x0 + (x1 - x0) * p} y2={y} stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
        <circle cx={x0} cy={y} r={5} fill={GOLD} />
        {p >= 1 ? <circle cx={x1} cy={y} r={5} fill={GOLD} /> : null}
      </svg>
      {p >= 1 ? (
        <div style={{position: "absolute", left: 540, top: y + 12, translate: "-50% 0", fontFamily: F.mono, fontSize: 14, color: GOLD, opacity: 0.85, whiteSpace: "nowrap"}}>
          {fmt(votes)} votos
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------------------------------------------------ scenes
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const tCit = wordT(2, "citacao"), tSalmo = wordT(3, "salmo"), tMil = wordT(3, "mil");
  const tFez = wordT(10, "fez"), tCons = T(11), tOlhem = wordT(12, "olhem"), tTudo = wordT(12, "tudo");
  const hb = heartbeat(t, T(10) - 0.2);

  // ---- phase A: the sentence (L1-2), then it travels up-left to become the head of the left column (L3)
  const toColumn = ramp(t, T(3) - 0.1, T(3) + 0.7);
  const sentenceA = 1 * (t < T(9) ? 1 : interpolate(t, [T(9), T(9) + 0.4], [1, 0], clamp));
  const cx = 540 + (280 - 540) * toColumn;                      // centre -> left column
  const cy = 820 + (430 - 820) * toColumn;
  const fs = 74 + (36 - 74) * toColumn;
  const w = 900 + (440 - 900) * toColumn;
  // ---- phase B: columns
  const colsA = ramp(t, T(3) + 0.3, T(3) + 1.0) * (t < T(9) ? 1 : interpolate(t, [T(9), T(9) + 0.4], [1, 0], clamp));
  const mtA = ramp(t, tSalmo + 0.2, tSalmo + 0.9);
  const pFirst = interpolate(t, [tSalmo + 0.3, tSalmo + 1.1], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const rowsY = [790, 1030, 1270, 1510];
  // ---- phase C: the psalm scrolls down to its last verse (L9), which stays (L10)
  const scrollA = win(t, T(9) + 0.3, tFez + 1.6, 0.3, 0.3) * (t < tCons - 0.15 ? 1 : 0);
  const scrollP = interpolate(t, [T(9) + 0.4, T(10) - 0.1], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const lastA = ramp(t, T(10) - 0.15, T(10) + 0.3) * (t < tCons - 0.1 ? 1 : interpolate(t, [tCons - 0.1, tCons], [1, 0], clamp));
  // ---- phase D: "Está consumado." alone (L11), then the point (L12) and the end (L13)
  const consA = win(t, tCons - 0.05, T(12) - 0.1, 0.12, 0.3);
  const goldOn = ramp(t, tCons + 0.15, tCons + 0.9);
  const pointA = win(t, T(12) - 0.05, T(13) - 0.1, 0.25, 0.3);
  const endA = ramp(t, T(13) - 0.1, T(13) + 0.4);

  return (
    <AbsoluteFill style={{backgroundColor: BG, overflow: "hidden"}}>
      {/* heartbeat vignette */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 55% at 50% 50%, rgba(140,60,40,${0.10 * hb}) 0%, rgba(4,7,12,0) 70%)`}} />
      <AbsoluteFill style={{boxShadow: `inset 0 0 ${260 + 60 * hb}px rgba(0,0,0,0.9)`}} />

      {/* the sentence */}
      {sentenceA > 0 ? (
        <div style={{position: "absolute", left: cx - w / 2, top: cy, width: w, opacity: sentenceA, display: "flex", flexDirection: "column", gap: 10 + (6 - 10) * toColumn,
          alignItems: toColumn < 0.5 ? "center" : "flex-start"}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: fs, lineHeight: 1.18, color: INK, textAlign: toColumn < 0.5 ? "center" : "left",
            textShadow: `0 0 ${30 * (1 - toColumn)}px rgba(255,255,255,0.25)`}}>
            {toColumn < 0.5 ? "“Deus meu, Deus meu, por que me desamparaste?”" : <Lit text={data.first.ps.replace(/^Salmo de Davi[^:]*: /, "")} lit={[data.first.lit]} p={1} size={fs} dim={DIM} />}
          </div>
          {toColumn < 0.5 ? (
            <Ref align="center">{t < T(3) - 0.1 ? "MATEUS 27:46" : ""}</Ref>
          ) : (
            <div style={{display: "flex", flexDirection: "column", gap: 4, opacity: toColumn}}>
              <Ref>SALMO 22:1</Ref>
              <div style={{fontFamily: F.hebrew, fontSize: 30, color: "rgba(242,235,221,0.5)", direction: "rtl", textAlign: "left"}}>{data.first.hebrew}</div>
            </div>
          )}
        </div>
      ) : null}

      {/* L2: the turn */}
      {(() => {
        const a = win(t, T(2) - 0.05, T(3) - 0.1, 0.2, 0.25);
        const b = ramp(t, tCit - 0.05, tCit + 0.3);
        return a <= 0 ? null : (
          <div style={{position: "absolute", left: 90, right: 90, top: 1060, opacity: a, display: "flex", flexDirection: "column", gap: 8, alignItems: "center"}}>
            <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 52, color: INK, letterSpacing: "-0.01em"}}>Isso não foi um grito.</div>
            <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 64, color: GOLD, opacity: b, translate: `0px ${(1 - b) * 16}px`, textShadow: `0 0 ${34 * b}px rgba(255,204,107,0.7)`}}>Foi uma citação.</div>
          </div>
        );
      })()}

      {/* L3+: the two columns */}
      {colsA > 0 ? (
        <>
          <div style={{position: "absolute", left: 85, top: 300, width: 430, opacity: colsA, display: "flex", flexDirection: "column", gap: 4}}>
            <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 26, letterSpacing: "0.16em", color: GOLD}}>SALMO 22</div>
            <div style={{fontFamily: F.ui, fontSize: 22, color: DIM, opacity: ramp(t, tMil - 0.05, tMil + 0.3)}}>mil anos antes da cruz</div>
          </div>
          <div style={{position: "absolute", left: 565, top: 300, width: 430, opacity: colsA, display: "flex", flexDirection: "column", gap: 4}}>
            <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 26, letterSpacing: "0.16em", color: INK}}>A CRUZ</div>
            <div style={{fontFamily: F.ui, fontSize: 22, color: DIM}}>Mateus 27 · João 19</div>
          </div>
          {/* the first pair: Mt 27:46 on the right */}
          <div style={{position: "absolute", left: 580, top: 430, width: 440, opacity: colsA * mtA, display: "flex", flexDirection: "column", gap: 6}}>
            <Lit text={data.first.mt.replace(/^E perto da hora nona, /, "…")} lit={[data.first.litMt]} p={pFirst >= 1 ? 1 : 0} size={32} />
            <Ref>MATEUS 27:46</Ref>
          </div>
          <Thread y={470} p={pFirst} votes={data.first.votes} a={colsA} />
          {/* L5-8: the four pairs, one per line */}
          {data.pairs.map((p, k) => {
            const t0 = T(p.line), lit0 = t0 + 0.05, tNt = t0 + 0.9;
            const a = colsA * ramp(t, t0 - 0.1, t0 + 0.25);
            const old = t > T(p.line + 1) ? 0.55 : 1;
            const pth = interpolate(t, [t0 + 0.5, t0 + 1.2], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
            return a <= 0 ? null : (
              <React.Fragment key={k}>
                <div style={{position: "absolute", left: 60, top: rowsY[k], width: 440, opacity: a * old, display: "flex", flexDirection: "column", gap: 6}}>
                  <Lit text={p.psText} lit={p.psLit} p={ramp(t, lit0, lit0 + 0.4)} size={32} />
                  <Ref>{p.ps_pt.toUpperCase()}</Ref>
                </div>
                <div style={{position: "absolute", left: 580, top: rowsY[k], width: 440, opacity: a * old * ramp(t, tNt - 0.1, tNt + 0.3), display: "flex", flexDirection: "column", gap: 6}}>
                  <Lit text={p.ntText} lit={p.ntLit} p={ramp(t, tNt + 0.1, tNt + 0.5)} size={32} />
                  <Ref>{p.nt_pt.toUpperCase()}</Ref>
                </div>
                <Thread y={rowsY[k] + 40} p={pth} votes={p.votes} a={a * old} />
              </React.Fragment>
            );
          })}
        </>
      ) : null}

      {/* L9-10: the whole psalm scrolls by, dim, until the last verse stops */}
      {scrollA > 0 ? (
        <div style={{position: "absolute", left: 120, right: 120, top: 0, height: 1920, opacity: scrollA, overflow: "hidden",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 70%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 70%, transparent 100%)"}}>
          {(() => {
            const rowH = 150;
            const total = data.psalm.length * rowH;
            const y = 1000 - scrollP * (total - rowH);         // verse 1 at y=1000 -> verse 31 at y=1000
            return data.psalm.map((v, i) => {
              const last = i === data.psalm.length - 1;
              const yy = y + i * rowH;
              if (yy < -200 || yy > 2100) return null;
              return (
                <div key={i} style={{position: "absolute", left: 0, right: 0, top: yy, display: "flex", gap: 18, alignItems: "baseline", opacity: last ? 1 : 0.55}}>
                  <span style={{fontFamily: F.mono, fontSize: 18, color: last ? GOLD : "rgba(242,235,221,0.35)", width: 36, flexShrink: 0}}>{i + 1}</span>
                  <div style={{fontFamily: F.title, fontSize: last ? 40 : 26, lineHeight: 1.25, color: last ? INK : "rgba(242,235,221,0.5)"}}>
                    {last ? <Lit text={v} lit={[data.last.lit]} p={ramp(t, tFez - 0.1, tFez + 0.3)} size={40} dim={INK} /> : v}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : null}
      {lastA > 0 ? (
        <div style={{position: "absolute", left: 120, right: 120, top: 1230, opacity: lastA, display: "flex", flexDirection: "column", gap: 10}}>
          <Ref color={GOLD}>SALMO 22:31 · A ÚLTIMA LINHA</Ref>
          <div style={{fontFamily: F.hebrew, fontSize: 44, color: GOLD, direction: "rtl", textAlign: "left", opacity: ramp(t, tFez, tFez + 0.4)}}>{data.last.hebrew}</div>
        </div>
      ) : null}

      {/* L11: Está consumado. */}
      {consA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 0, height: 1920, opacity: consA, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 22}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 112, lineHeight: 1.05, color: goldOn > 0.5 ? GOLD : INK, textAlign: "center",
            textShadow: `0 0 ${60 * goldOn}px rgba(255,204,107,0.75)`}}>“Está consumado.”</div>
          <Ref align="center" color={goldOn > 0.5 ? GOLD : "rgba(242,235,221,0.5)"}>JOÃO 19:30</Ref>
        </div>
      ) : null}

      {/* L12: the point */}
      {pointA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 0, height: 1920, opacity: pointA, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 26, textAlign: "center"}}>
          <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 48, color: DIM, lineHeight: 1.2}}>Jesus não estava perguntando por quê.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 62, color: INK, lineHeight: 1.1, opacity: ramp(t, tOlhem - 0.3, tOlhem + 0.1)}}>Estava dizendo: olhem o salmo.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 76, color: GOLD, lineHeight: 1.1, opacity: ramp(t, tTudo - 0.1, tTudo + 0.3), textShadow: "0 0 40px rgba(255,204,107,0.6)"}}>Está tudo aqui.</div>
        </div>
      ) : null}

      {/* L13: the end */}
      {endA > 0 ? (
        <div style={{position: "absolute", left: 80, right: 80, top: 0, height: 1920, opacity: endA, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 28, textAlign: "center"}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 44, color: DIM, lineHeight: 1.25}}>“Deus meu, Deus meu, por que me desamparaste?”</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 60, color: INK, lineHeight: 1.1}}>Manda pra quem só conhece<br />a primeira frase.</div>
          <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 32, color: GOLD, marginTop: 10}}>Comenta tua passagem favorita: ela pode virar o próximo vídeo.</div>
          <div style={{position: "absolute", left: 0, right: 0, bottom: 150, fontFamily: F.mono, fontSize: 19, lineHeight: 1.5, color: "rgba(242,235,221,0.6)"}}>
            Ligações e votos: OpenBible.info (CC BY), em Bíblia Conectada · Texto: Bíblia Livre (CC BY 4.0) · Hebraico: OSHB · Narração com voz sintética
          </div>
        </div>
      ) : null}
      <Grain />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------------ captions
// only for the lines whose words are not already on screen as a verse
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
    <div style={{position: "absolute", left: 80, right: 80, top: 1560, display: "flex", justifyContent: "center", opacity: a}}>
      <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 38, lineHeight: 1.25, color: INK, textAlign: "center", maxWidth: 900,
        background: "rgba(4,7,12,0.85)", borderRadius: 22, padding: "16px 28px"}}>
        {words.map((w, i) => <span key={i} style={{opacity: i < litN ? 1 : 0.35}}>{w}{i < words.length - 1 ? " " : ""}</span>)}
      </div>
    </div>
  );
};

export const Main: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: BG}}>
    <Stage />
    <Captions show={[3, 4, 9]} />
  </AbsoluteFill>
);
