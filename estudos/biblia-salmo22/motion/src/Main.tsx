import React from "react";
import {AbsoluteFill, Easing, interpolate, random, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F} from "./theme";

// "Não foi um grito. Foi uma citação." (video 7), v3: an editorial, typographic piece with no raster at all.
// The sentence everyone knows; its label flips from Mateus to Salmo; then a ledger: one pair at a time, the psalm
// verse above a hairline, the gospel verse below it, a votes chip on the line, and the pairs already shown stacked
// as a list of references at the top. The whole psalm scrolls to its last word; "Está consumado" answers it.
// Every text and number is BLIVRE / OpenBible from data.json (tools/check.py).
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
const lin = (t: number, a: number, b: number) => interpolate(t, [a, b], [0, 1], clamp);
const win = (t: number, a: number, b: number, fi = 0.25, fo = 0.3) =>
  Math.min(interpolate(t, [a, a + fi], [0, 1], {...clamp, easing: ease}), interpolate(t, [b - fo, b], [1, 0], clamp));
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

const BG = "#04070C";
const GOLD = C.gold;
const INK = "#F6F0E4";
const DIM = "rgba(246,240,228,0.62)";
const FAINT = "rgba(246,240,228,0.34)";
const RULE = "rgba(246,240,228,0.16)";
const M = 80;                                    // side margin
const W = 1080;

// ------------------------------------------------------------------------------------------------------ pieces
const Grain: React.FC<{opacity?: number}> = ({opacity = 0.045}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  return (
    <AbsoluteFill style={{backgroundImage: `url(${staticFile("img/grain.png")})`, backgroundSize: "512px 512px",
      backgroundPosition: `${Math.floor(random(`gx${k}`) * 512)}px ${Math.floor(random(`gy${k}`) * 512)}px`,
      mixBlendMode: "screen", opacity, pointerEvents: "none"}} />
  );
};

// the stage light: a slow, faint warm pool that drifts; vignette at the edges
const Atmosphere: React.FC<{t: number; warm: number}> = ({t, warm}) => (
  <>
    <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 45% at ${50 + 6 * Math.sin(t * 0.21)}% ${46 + 4 * Math.cos(t * 0.17)}%, rgba(255,204,107,${0.05 + 0.07 * warm}) 0%, rgba(255,204,107,0) 70%)`}} />
    <AbsoluteFill style={{background: "radial-gradient(ellipse 90% 70% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)"}} />
  </>
);

// enter: rise + unblur; `a` 0..1
const rise = (a: number, px = 22): React.CSSProperties => ({opacity: a, translate: `0px ${(1 - a) * px}px`, filter: `blur(${(1 - a) * 6}px)`});

// a verse with some of its words lit, progressively (p 0..1 over the lit fragments)
const Lit: React.FC<{text: string; lit: string[]; p: number; color?: string; size?: number; dim?: string; align?: "left" | "center" | "right"; weight?: number}> = ({
  text, lit, p, color = GOLD, size = 40, dim = DIM, align = "left", weight = 440,
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
    if (sp.s > k) parts.push(<span key={`d${n}`}>{text.slice(k, sp.s)}</span>);
    const on = p > n / Math.max(1, spans.length);
    parts.push(<span key={`l${n}`} style={{color: on ? color : undefined, textShadow: on ? `0 0 26px ${color}80` : undefined, transition: "none"}}>{text.slice(sp.s, sp.e)}</span>);
    k = sp.e;
  });
  if (k < text.length) parts.push(<span key="tail">{text.slice(k)}</span>);
  return <div style={{fontFamily: F.title, fontWeight: weight, fontSize: size, lineHeight: 1.24, color: dim, textAlign: align, textWrap: "pretty" as never}}>{parts}</div>;
};

const Ref: React.FC<{children: React.ReactNode; color?: string; align?: "left" | "right" | "center"; size?: number}> = ({children, color = FAINT, align = "left", size = 21}) => (
  <div style={{fontFamily: F.mono, fontSize: size, letterSpacing: "0.14em", color, textAlign: align, whiteSpace: "nowrap"}}>{children}</div>
);

// a hairline that draws itself from the left; the lit part glows
const Rule: React.FC<{y: number; draw: number; a: number}> = ({y, draw, a}) => (
  <div style={{position: "absolute", left: M, right: M, top: y, height: 1, opacity: a}}>
    <div style={{position: "absolute", inset: 0, background: RULE}} />
    <div style={{position: "absolute", left: 0, top: 0, height: 1, width: `${draw * 100}%`, background: GOLD, boxShadow: `0 0 12px ${GOLD}aa, 0 0 2px ${GOLD}`}} />
  </div>
);

// the votes chip, centred on the rule
const Chip: React.FC<{y: number; votes: number; a: number; count: number}> = ({y, votes, a, count}) => (
  <div style={{position: "absolute", left: 0, right: 0, top: y, display: "flex", justifyContent: "center", opacity: a, pointerEvents: "none"}}>
    <div style={{translate: `0px -50%`, background: BG, border: `1px solid ${GOLD}66`, borderRadius: 999, padding: "8px 18px", display: "flex", gap: 10, alignItems: "baseline", boxShadow: `0 0 24px rgba(255,204,107,${0.25 * a})`}}>
      <span style={{fontFamily: F.mono, fontSize: 24, color: GOLD, fontVariantNumeric: "tabular-nums"}}>{fmt(votes * count)}</span>
      <span style={{fontFamily: F.mono, fontSize: 18, letterSpacing: "0.14em", color: FAINT}}>VOTOS</span>
    </div>
  </div>
);

// one pair on the stage: psalm verse above the rule, gospel verse below it
const RULE_Y = 1070;
const Pair: React.FC<{a: number; psRef: React.ReactNode; ps: string; psLit: string[]; ntRef: string; nt: string; ntLit: string[]; pL: number; pR: number; ntIn: number; votes: number; size?: number; extra?: React.ReactNode}> = ({
  a, psRef, ps, psLit, ntRef, nt, ntLit, pL, pR, ntIn, votes, size = 40, extra,
}) =>
  a <= 0 ? null : (
    <>
      <div style={{position: "absolute", left: M, width: W - 2 * M - 120, top: 700, display: "flex", flexDirection: "column", gap: 14, ...rise(a)}}>
        <Ref color={GOLD}>{psRef}</Ref>
        <Lit text={ps} lit={psLit} p={pL} size={size} />
        {extra}
      </div>
      <Rule y={RULE_Y} draw={a * ntIn} a={a} />
      <Chip y={RULE_Y} votes={votes} a={a * ramp(ntIn, 0.5, 1)} count={ramp(ntIn, 0.5, 1)} />
      <div style={{position: "absolute", right: M, width: W - 2 * M - 120, top: RULE_Y + 70, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end", ...rise(a * ntIn)}}>
        <Lit text={nt} lit={ntLit} p={pR} size={size} align="right" />
        <Ref align="right">{ntRef}</Ref>
      </div>
    </>
  );

// the pairs already shown, as a list of references at the top (the ledger)
const Ledger: React.FC<{t: number; a: number; active: number; items: {ps: string; nt: string; votes: number; at: number}[]}> = ({t, a, active, items}) => (
  <div style={{position: "absolute", left: M, right: M, top: 330, opacity: a, display: "flex", flexDirection: "column", gap: 6}}>
    {items.map((it, i) => {
      const ia = ramp(t, it.at, it.at + 0.5);
      if (ia <= 0) return null;
      const on = i === active;
      return (
        <div key={i} style={{display: "flex", alignItems: "baseline", gap: 16, height: 44, ...rise(ia, 14)}}>
          <Ref color={on ? GOLD : FAINT} size={24}>{it.ps}</Ref>
          <div style={{flex: 1, height: 1, background: on ? `${GOLD}66` : RULE, translate: "0px -6px"}} />
          <Ref color={on ? INK : FAINT} size={24}>{it.nt}</Ref>
          <Ref color={on ? GOLD : FAINT} size={20}>{fmt(it.votes)}</Ref>
        </div>
      );
    })}
  </div>
);

// ------------------------------------------------------------------------------------------------------ stage
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const tCit = wordT(2, "citacao"), tSalmo = wordT(3, "salmo"), tMil = wordT(3, "mil"), tCruz = wordT(3, "cruz");
  const tFez = wordT(10, "fez"), tCons = T(11), tOlhem = wordT(12, "olhem"), tTudo = wordT(12, "tudo"), tTermina = wordT(9, "termina");

  // L1: the sentence, word by word with the voice; L2: the turn, and the label flips
  const sentA = win(t, T(1) - 0.1, T(3) - 0.2, 0.3, 0.35);
  const L1 = LINE(1);
  const turnA = win(t, T(2) - 0.05, T(3) - 0.2, 0.2, 0.3);
  const citP = ramp(t, tCit - 0.05, tCit + 0.35);
  const flip = ramp(t, tCit + 0.05, tCit + 0.55);          // MATEUS 27:46 -> SALMO 22:1

  // L3: the first pair
  const first = {a: win(t, T(3) - 0.05, T(5) - 0.35, 0.35, 0.3), pL: ramp(t, tSalmo, tSalmo + 0.5), pR: ramp(t, tCruz + 0.3, tCruz + 0.8), ntIn: ramp(t, tCruz - 0.2, tCruz + 0.5)};
  // L4-8: the ledger and the pairs
  const ledgerA = win(t, T(4) - 0.1, T(9) - 0.2, 0.3, 0.3);
  const ledgerItems = [{ps: "SALMO 22:1", nt: "MATEUS 27:46", votes: data.first.votes, at: T(4) - 0.1},
    ...data.pairs.map((p) => ({ps: p.ps_pt.toUpperCase(), nt: p.nt_pt.toUpperCase(), votes: p.votes, at: T(p.line) - 0.05}))];
  const active = data.pairs.reduce((acc, p, k) => (t >= T(p.line) - 0.05 ? k + 1 : acc), 0);
  // L9-10: the scroll and the last line
  const scrollA = win(t, T(9) + 0.05, T(10) - 0.05, 0.3, 0.3);
  const scrollP = interpolate(t, [T(9) + 0.3, tTermina + 0.5], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const lastA = win(t, T(10) - 0.05, tCons - 0.02, 0.3, 0.2);
  const hebA = ramp(t, tFez - 0.05, tFez + 0.45);
  // L11-13
  const consA = win(t, tCons - 0.02, T(12) - 0.1, 0.15, 0.3);
  const goldOn = ramp(t, tCons + 0.2, tCons + 0.9);
  const pointA = win(t, T(12) - 0.05, T(13) - 0.1, 0.25, 0.3);
  const endA = ramp(t, T(13) - 0.1, T(13) + 0.45);
  const flash = interpolate(t, [tCons - 0.02, tCons + 0.05, tCons + 0.6], [0, 0.22, 0], clamp);
  const warm = Math.max(citP * 0.4, first.ntIn * 0.5, hebA, consA, pointA * 0.5, endA * 0.4);

  return (
    <AbsoluteFill style={{backgroundColor: BG, overflow: "hidden"}}>
      <Atmosphere t={t} warm={warm} />

      {/* L1-2 */}
      {sentA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, top: 560, opacity: sentA, display: "flex", flexDirection: "column", gap: 26, alignItems: "center", textAlign: "center"}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 84, lineHeight: 1.14, color: INK, textWrap: "balance" as never}}>
            <span style={{opacity: citP, color: GOLD}}>“</span>
            {L1.words.map((w, i) => {
              const wa = ramp(t, w.t0 - 0.08, w.t0 + 0.28);
              return <span key={i} style={{display: "inline-block", ...rise(wa, 18), marginRight: i < L1.words.length - 1 ? "0.26em" : 0}}>{w.w}</span>;
            })}
            <span style={{opacity: citP, color: GOLD}}>”</span>
          </div>
          <div style={{position: "relative", height: 30, width: 420, overflow: "hidden"}}>
            <div style={{position: "absolute", left: 0, right: 0, top: 0, translate: `0px ${-flip * 30}px`}}>
              <Ref align="center" color={FAINT}>MATEUS 27:46</Ref>
            </div>
            <div style={{position: "absolute", left: 0, right: 0, top: 30, translate: `0px ${-flip * 30}px`}}>
              <Ref align="center" color={GOLD}>SALMO 22:1</Ref>
            </div>
          </div>
          <div style={{width: 420, height: 1, background: RULE, transformOrigin: "left", transform: `scaleX(${ramp(t, L1.t1 - 0.2, L1.t1 + 0.4)})`}}>
            <div style={{height: 1, width: `${flip * 100}%`, background: GOLD, boxShadow: `0 0 10px ${GOLD}aa`}} />
          </div>
        </div>
      ) : null}
      {turnA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, top: 1010, opacity: turnA, display: "flex", flexDirection: "column", gap: 12, alignItems: "center"}}>
          <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 50, color: DIM, ...rise(ramp(t, T(2) - 0.05, T(2) + 0.35))}}>Isso não foi um grito.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 76, color: GOLD, textShadow: `0 0 ${44 * citP}px rgba(255,204,107,0.55)`, ...rise(citP)}}>Foi uma citação.</div>
        </div>
      ) : null}

      {/* L3: Ps 22:1 -> Mt 27:46, the first pair, with the Hebrew */}
      <Pair a={first.a} psRef={<span>SALMO 22:1<span style={{opacity: ramp(t, tMil - 0.05, tMil + 0.3), color: FAINT}}> · MIL ANOS ANTES DA CRUZ</span></span>}
        ps={data.first.ps.replace(/^Salmo de Davi[^:]*: /, "")} psLit={[data.first.lit]}
        ntRef="MATEUS 27:46 · NA CRUZ" nt={data.first.mt.replace(/^E perto da hora nona, /, "…")} ntLit={[data.first.litMt]} pL={first.pL} pR={first.pR} ntIn={first.ntIn} votes={data.first.votes} size={42}
        extra={<div style={{fontFamily: F.hebrew, fontSize: 34, color: FAINT, direction: "rtl", textAlign: "left", marginTop: 4, ...rise(ramp(t, tSalmo + 0.4, tSalmo + 0.9), 10)}}>{data.first.hebrew}</div>} />

      {/* L4-8: the ledger, one pair at a time */}
      <Ledger t={t} a={ledgerA} active={active} items={ledgerItems} />
      {data.pairs.map((p, k) => {
        const t0 = T(p.line), t1 = T(p.line + 1);
        const a = win(t, t0 - 0.05, t1 - 0.3, 0.3, 0.3);
        return (
          <Pair key={k} a={a} psRef={p.ps_pt.toUpperCase()} ps={p.psText} psLit={p.psLit} ntRef={p.nt_pt.toUpperCase()} nt={p.ntText} ntLit={p.ntLit}
            pL={ramp(t, t0 + 0.05, t0 + 0.55)} pR={ramp(t, t0 + 1.15, t0 + 1.6)} ntIn={ramp(t, t0 + 0.8, t0 + 1.4)} votes={p.votes} />
        );
      })}

      {/* L9: the whole psalm scrolls, from the abandonment to the last line */}
      {scrollA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, top: 0, height: 1920, opacity: scrollA, overflow: "hidden",
          maskImage: "linear-gradient(to bottom, transparent 16%, black 30%, black 70%, transparent 92%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 16%, black 30%, black 70%, transparent 92%)"}}>
          {(() => {
            const rowH = 132, n = data.psalm.length, total = n * rowH;
            const y = 900 - scrollP * (total - rowH);
            return data.psalm.map((v, i) => {
              const yy = y + i * rowH, firstV = i === 0, lastV = i === n - 1;
              if (yy < -200 || yy > 2100) return null;
              return (
                <div key={i} style={{position: "absolute", left: 0, right: 0, top: yy, display: "flex", gap: 22, alignItems: "baseline"}}>
                  <span style={{fontFamily: F.mono, fontSize: 18, color: firstV || lastV ? GOLD : FAINT, width: 44, flexShrink: 0, textAlign: "right"}}>{i + 1}</span>
                  <div style={{fontFamily: F.title, fontSize: 27, lineHeight: 1.24, color: firstV || lastV ? INK : "rgba(246,240,228,0.5)"}}>{v}</div>
                </div>
              );
            });
          })()}
        </div>
      ) : null}

      {/* L10: the last line, and its last word */}
      {lastA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, top: 640, opacity: lastA, display: "flex", flexDirection: "column", gap: 28, alignItems: "center", textAlign: "center"}}>
          <Ref align="center" color={GOLD}>SALMO 22:31 · A ÚLTIMA LINHA</Ref>
          <Lit text={data.last.text} lit={[data.last.lit]} p={ramp(t, tFez - 0.15, tFez + 0.3)} size={54} dim={INK} align="center" />
          <div style={{width: 420, height: 1, background: RULE, marginTop: 10}}><div style={{height: 1, width: `${hebA * 100}%`, background: GOLD, boxShadow: `0 0 10px ${GOLD}aa`}} /></div>
          <div style={{fontFamily: F.hebrew, fontSize: 150, lineHeight: 1.1, color: GOLD, direction: "rtl", textShadow: `0 0 ${70 * hebA}px rgba(255,204,107,0.55)`, ...rise(hebA, 30)}}>{data.last.hebrew}</div>
          <Ref align="center" color={FAINT}><span style={{opacity: hebA}}>“ELE FEZ”, EM HEBRAICO</span></Ref>
        </div>
      ) : null}

      <AbsoluteFill style={{background: "#FFF6E0", opacity: flash, pointerEvents: "none"}} />

      {/* L11: Está consumado. */}
      {consA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, top: 640, opacity: consA, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, textAlign: "center"}}>
          <div style={{fontFamily: F.hebrew, fontSize: 150, lineHeight: 1.1, color: GOLD, direction: "rtl", textShadow: "0 0 70px rgba(255,204,107,0.5)"}}>{data.last.hebrew}</div>
          <div style={{width: 420, height: 1, background: `${GOLD}99`, boxShadow: `0 0 10px ${GOLD}aa`}} />
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 112, lineHeight: 1.05, color: goldOn > 0.5 ? GOLD : INK, textShadow: `0 0 ${64 * goldOn}px rgba(255,204,107,0.7)`, ...rise(ramp(t, tCons - 0.02, tCons + 0.4), 26)}}>
            “Está consumado.”
          </div>
          <Ref align="center" color={goldOn > 0.5 ? GOLD : FAINT}>JOÃO 19:30</Ref>
        </div>
      ) : null}

      {/* L12: the point */}
      {pointA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, top: 660, opacity: pointA, display: "flex", flexDirection: "column", alignItems: "center", gap: 30, textAlign: "center"}}>
          <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 48, color: DIM, lineHeight: 1.2, ...rise(ramp(t, T(12) - 0.05, T(12) + 0.4))}}>Jesus não estava perguntando por quê.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 62, color: INK, lineHeight: 1.1, ...rise(ramp(t, tOlhem - 0.35, tOlhem + 0.1))}}>Estava dizendo: olhem o salmo.</div>
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 80, color: GOLD, lineHeight: 1.1, textShadow: "0 0 44px rgba(255,204,107,0.6)", ...rise(ramp(t, tTudo - 0.1, tTudo + 0.35))}}>Está tudo aqui.</div>
        </div>
      ) : null}

      {/* L13: the end */}
      {endA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, top: 540, opacity: endA, display: "flex", flexDirection: "column", alignItems: "center", gap: 30, textAlign: "center"}}>
          <div style={{fontFamily: F.title, fontWeight: 440, fontSize: 42, color: DIM, lineHeight: 1.25}}>“Deus meu, Deus meu, por que me desamparaste?”</div>
          <div style={{width: 420, height: 1, background: RULE}} />
          <div style={{fontFamily: F.ui, fontWeight: 700, fontSize: 64, color: INK, lineHeight: 1.1, ...rise(endA, 20)}}>Manda pra quem só conhece<br />a primeira frase.</div>
          <div style={{fontFamily: F.ui, fontWeight: 500, fontSize: 32, color: GOLD, marginTop: 8, lineHeight: 1.3, ...rise(ramp(t, T(13) + 0.5, T(13) + 1.0), 14)}}>Comenta tua passagem favorita:<br />ela pode virar o próximo vídeo.</div>
        </div>
      ) : null}
      {endA > 0 ? (
        <div style={{position: "absolute", left: M, right: M, bottom: 70, opacity: endA, fontFamily: F.mono, fontSize: 18, lineHeight: 1.5, color: FAINT, textAlign: "center"}}>
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
    <div style={{position: "absolute", left: M, right: M, top: 180, display: "flex", justifyContent: "center", opacity: a}}>
      <div style={{fontFamily: F.ui, fontWeight: 600, fontSize: 40, lineHeight: 1.25, color: INK, textAlign: "center", maxWidth: 900}}>
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
