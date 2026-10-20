import React from "react";
import {AbsoluteFill, Easing, Img, interpolate, random, Sequence, staticFile, useCurrentFrame} from "remotion";
import "./fonts";
import data from "./data.json";
import {C, F, VITRAL} from "./theme";

// "João 3:16, por dentro": every scene starts on the narration line it illustrates (data.json from narr.json);
// every number and quote on screen comes from data.json (tools/analyze.py + BLIVRE).
const FPS = data.fps;
const XF = 8; // cross-fade frames between scenes
type Line = (typeof data.lines)[number];
const LINE = (i: number): Line => data.lines.find((l) => l.i === i)!;
const fr = (t: number) => Math.round(t * FPS);
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
// time (s) of the n-th occurrence of a word in a narration line
const wordT = (i: number, w: string, nth = 0): number => {
  const hits = LINE(i).words.filter((x) => norm(x.w).startsWith(norm(w)));
  return (hits[nth] ?? hits[0] ?? {t0: LINE(i).t0}).t0;
};
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
const V = data.votes as Record<string, number>;

// ------------------------------------------------------------------------------------------------ building blocks
const Paper: React.FC<{color?: string}> = ({color = C.paper}) => <AbsoluteFill style={{backgroundColor: color}} />;

const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${staticFile("img/grain.png")})`,
        backgroundSize: "512px 512px",
        backgroundPosition: `${Math.floor(random(`gx${k}`) * 512)}px ${Math.floor(random(`gy${k}`) * 512)}px`,
        mixBlendMode: "multiply",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

// An illustration, alive: slow camera move + a hand-drawn "boil" (tiny jitter every 3 frames) + light + dust
const Illus: React.FC<{
  src: string;
  dur: number;
  z?: [number, number];
  x?: [number, number];
  y?: [number, number];
  origin?: string;
}> = ({src, dur, z = [1.0, 1.08], x = [0, 0], y = [0, 0], origin = "50% 50%"}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
  const k = Math.floor(f / 3);
  const jx = (random(`jx${src}${k}`) - 0.5) * 2.4;
  const jy = (random(`jy${src}${k}`) - 0.5) * 2.4;
  const jr = (random(`jr${src}${k}`) - 0.5) * 0.22;
  return (
    <AbsoluteFill style={{overflow: "hidden"}}>
      <Img
        src={staticFile(`img/${src}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: origin,
          scale: String(z[0] + (z[1] - z[0]) * p),
          translate: `${x[0] + (x[1] - x[0]) * p + jx}px ${y[0] + (y[1] - y[0]) * p + jy}px`,
          rotate: `${jr}deg`,
        }}
      />
    </AbsoluteFill>
  );
};

const Dust: React.FC<{n?: number; color?: string; seed?: string}> = ({n = 34, color = C.gold, seed = "d"}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      {Array.from({length: n}).map((_, i) => {
        const x0 = random(`${seed}x${i}`) * 1080;
        const y0 = random(`${seed}y${i}`) * 1920;
        const sp = 0.25 + random(`${seed}s${i}`) * 0.6;
        const s = 2 + random(`${seed}r${i}`) * 4;
        const y = (((y0 - f * sp) % 1920) + 1920) % 1920;
        const x = x0 + Math.sin((f + i * 37) / 40) * 12;
        const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(f / 9 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: s,
              height: s,
              borderRadius: s,
              background: color,
              opacity: tw,
              boxShadow: `0 0 ${s * 3}px ${color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Warm light breathing from a point (beam of the altar, lamp, horizon)
const Glow: React.FC<{x: string; y: string; r?: number; color?: string; strength?: number}> = ({
  x,
  y,
  r = 700,
  color = "255,204,107",
  strength = 0.45,
}) => {
  const f = useCurrentFrame();
  const a = strength * (0.8 + 0.2 * Math.sin(f / 14));
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle ${r}px at ${x} ${y}, rgba(${color},${a}) 0%, rgba(${color},0) 70%)`,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

// top scrim so the card reads over any illustration
const Scrim: React.FC<{dark?: boolean; h?: number}> = ({dark = false, h = 720}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: 1080,
      height: h,
      background: dark
        ? "linear-gradient(to bottom, rgba(6,13,26,0.92) 0%, rgba(6,13,26,0.75) 55%, rgba(6,13,26,0) 100%)"
        : "linear-gradient(to bottom, rgba(247,239,227,0.97) 0%, rgba(247,239,227,0.86) 55%, rgba(247,239,227,0) 100%)",
    }}
  />
);

const Kicker: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.bronze}) => (
  <div
    style={{
      fontFamily: F.ui,
      fontWeight: 600,
      fontSize: 32,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color,
    }}
  >
    {children}
  </div>
);

const useIn = (delay = 0, len = 14) => {
  const f = useCurrentFrame();
  return interpolate(f, [delay, delay + len], [0, 1], {...clamp, easing: ease});
};

// The card of a link: "LIGAÇÃO n DE 5", reference, votes counting up, how the link is made
const Card: React.FC<{
  kicker: string;
  title: string;
  votes?: number;
  how?: string;
  dark?: boolean;
  delay?: number;
  small?: boolean;
}> = ({kicker, title, votes, how, dark = false, delay = 0, small = false}) => {
  const f = useCurrentFrame();
  const a = useIn(delay);
  const n = votes ? interpolate(f, [delay + 4, delay + 30], [0, votes], {...clamp, easing: Easing.out(Easing.cubic)}) : 0;
  const ink = dark ? C.skyInk : C.ink;
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: 150,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        opacity: a,
        translate: `0px ${(1 - a) * 30}px`,
      }}
    >
      <Kicker color={dark ? C.goldText : C.bronze}>{kicker}</Kicker>
      <div style={{fontFamily: F.title, fontSize: small ? 84 : 112, lineHeight: 1.0, color: ink, fontWeight: 440}}>
        {title}
      </div>
      {votes ? (
        <div style={{display: "flex", alignItems: "baseline", gap: 16}}>
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 64, color: dark ? C.gold : C.bronze}}>{fmt(n)}</div>
          <div style={{fontFamily: F.ui, fontSize: 36, color: dark ? C.skyInk : C.ink2}}>votos</div>
        </div>
      ) : null}
      {how ? (
        <div style={{fontFamily: F.ui, fontSize: 38, lineHeight: 1.22, color: dark ? C.skyInk : C.ink2, maxWidth: 900}}>
          {how}
        </div>
      ) : null}
    </div>
  );
};

const Tag: React.FC<{children: React.ReactNode; dark?: boolean}> = ({children, dark}) => (
  <div
    style={{
      position: "absolute",
      right: 70,
      top: 92,
      fontFamily: F.mono,
      fontSize: 22,
      letterSpacing: "0.12em",
      color: dark ? "rgba(242,235,221,0.7)" : "rgba(14,30,26,0.55)",
    }}
  >
    {children}
  </div>
);

// --------------------------------------------------------------------------------------------- the arcs of 3:16
const NCH = data.arcs.n_chapters;
const FROM = data.arcs.from.chapter;
const AX0 = 80,
  AX1 = 1000;
const ax = (ch: number) => AX0 + (ch / (NCH - 1)) * (AX1 - AX0);
const NT0 = data.arcs.books[39].first; // Mateus 1

const Arcs: React.FC<{y: number; maxH: number; start: number; mode: "draw" | "gold"; hl?: string[]; dim?: number}> = ({
  y,
  maxH,
  start,
  mode,
  hl = [],
  dim = 1,
}) => {
  const f = useCurrentFrame() - start;
  const links = data.arcs.links;
  const x2 = ax(FROM);
  const maxSpan = Math.max(...links.map((l) => Math.abs(ax(l.chapter) - x2)));
  return (
    <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0}}>
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <line x1={AX0} x2={AX1} y1={y} y2={y} stroke="rgba(242,235,221,0.35)" strokeWidth={2} />
      <line x1={ax(NT0)} x2={ax(NT0)} y1={y - 10} y2={y + 10} stroke="rgba(242,235,221,0.5)" strokeWidth={2} />
      {links.map((l, r) => {
        const x1 = ax(l.chapter);
        const a = Math.min(x1, x2),
          b = Math.max(x1, x2);
        const rx = Math.max(5, (b - a) / 2);
        const ry = Math.max(8, (Math.abs(x1 - x2) / maxSpan) * maxH);
        const d = `M ${a} ${y} A ${rx} ${ry} 0 0 1 ${b} ${y}`;
        const p = mode === "draw" ? interpolate(f, [r * 0.55, r * 0.55 + 16], [0, 1], {...clamp, easing: ease}) : interpolate(f, [r * 0.45, r * 0.45 + 24], [0, 1], {...clamp, easing: ease});
        const isHl = hl.includes(l.osis);
        const dist = Math.abs(l.chapter - FROM) / NCH;
        const col = mode === "gold" || isHl ? C.gold : VITRAL[Math.min(5, Math.floor(dist * 7))];
        const w = 1.2 + 4.2 * (Math.log(l.votes + 1) / Math.log(1147));
        const op = (isHl || mode === "gold" ? 1 : hl.length ? 0.28 : 0.8) * dim;
        return (
          <path
            key={l.osis}
            d={d}
            pathLength={1}
            fill="none"
            stroke={col}
            strokeWidth={isHl ? w + 2.5 : w}
            strokeLinecap="round"
            strokeDasharray="1 1"
            strokeDashoffset={1 - p}
            opacity={op}
            filter={isHl || mode === "gold" ? "url(#glow)" : undefined}
          />
        );
      })}
      <circle cx={x2} cy={y} r={14} fill={C.gold} filter="url(#glow)" />
    </svg>
  );
};

const AxisLabels: React.FC<{y: number}> = ({y}) => (
  <>
    <div style={{position: "absolute", left: AX0 - 10, top: y + 22, fontFamily: F.ui, fontSize: 28, color: "rgba(242,235,221,0.75)"}}>
      Gênesis
    </div>
    <div style={{position: "absolute", left: ax(NT0) - 160, top: y - 44, width: 150, textAlign: "right", fontFamily: F.ui, fontSize: 22, color: "rgba(242,235,221,0.5)"}}>
      Antigo ←
    </div>
    <div style={{position: "absolute", left: ax(NT0) + 10, top: y - 44, width: 150, fontFamily: F.ui, fontSize: 22, color: "rgba(242,235,221,0.5)"}}>
      → Novo
    </div>
    <div style={{position: "absolute", right: 1080 - AX1 - 10, top: y + 22, fontFamily: F.ui, fontSize: 28, color: "rgba(242,235,221,0.75)"}}>
      Apocalipse
    </div>
    <div
      style={{
        position: "absolute",
        left: ax(FROM) - 150,
        top: y + 62,
        width: 300,
        textAlign: "center",
        fontFamily: F.title,
        fontSize: 44,
        color: C.gold,
      }}
    >
      João 3:16
    </div>
  </>
);

// ------------------------------------------------------------------------------------------------------ scenes
const S_Hook: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const amar = interpolate(f, [0, 20], [0.6, 1], clamp);
  return (
    <AbsoluteFill>
      <Illus src="walk.jpg" dur={dur} z={[1.12, 1.0]} y={[40, 0]} origin="50% 70%" />
      <Glow x="50%" y="16%" r={520} strength={0.35} />
      <Dust n={22} />
      <Scrim h={760} />
      <div style={{position: "absolute", left: 80, right: 80, top: 170, display: "flex", flexDirection: "column", gap: 18}}>
        <Kicker>Gênesis 22 · João 3:16</Kicker>
        <div style={{fontFamily: F.title, fontSize: 104, lineHeight: 1.02, color: C.ink}}>
          A primeira vez que a Bíblia diz{" "}
          <span style={{color: C.wine, textShadow: `0 0 ${24 * amar}px rgba(255,204,107,0.9)`}}>“amar”</span>…
        </div>
      </div>
      <Tag>ILUSTRAÇÃO</Tag>
    </AbsoluteFill>
  );
};

const S_ToJohn: React.FC = () => {
  const a = useIn(2, 18);
  const b = useIn(14, 18);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 90, right: 90, top: 330, display: "flex", flexDirection: "column", gap: 30, opacity: a}}>
        <Kicker>João 3:16 · Bíblia Livre</Kicker>
        <div style={{fontFamily: F.title, fontSize: 70, lineHeight: 1.18, color: C.ink, translate: `0px ${(1 - a) * 24}px`}}>
          “Porque Deus <span style={{color: C.wine}}>amou</span> ao mundo de tal maneira, que deu o seu Filho unigênito;{" "}
          <span style={{opacity: 0.55}}>para que todo aquele que nele crê não pereça, mas tenha a vida eterna.”</span>
        </div>
        <div style={{height: 4, width: 760 * b, background: C.gold, borderRadius: 4}} />
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_Arcs: React.FC<{start: number}> = ({start}) => {
  const f = useCurrentFrame();
  const shown = Math.min(data.links, Math.max(0, Math.floor((f - start) / 0.55) + 1));
  const a = useIn(0, 12);
  return (
    <AbsoluteFill>
      <Paper color={C.sky} />
      <Dust n={40} color="#F2EBDD" seed="st" />
      <Arcs y={1240} maxH={620} start={start} mode="draw" />
      <AxisLabels y={1240} />
      <div style={{position: "absolute", left: 90, right: 90, top: 170, opacity: a, display: "flex", flexDirection: "column", gap: 10}}>
        <Kicker color={C.goldText}>Referências cruzadas</Kicker>
        <div style={{display: "flex", alignItems: "baseline", gap: 22}}>
          <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 150, color: C.gold, lineHeight: 1}}>{shown}</div>
          <div style={{fontFamily: F.title, fontSize: 64, color: C.skyInk}}>ligações</div>
        </div>
        <div style={{fontFamily: F.ui, fontSize: 36, color: "rgba(242,235,221,0.8)"}}>cada arco: um versículo que aponta pra outro</div>
      </div>
    </AbsoluteFill>
  );
};

const S_Method: React.FC<{split: number}> = ({split}) => {
  const f = useCurrentFrame();
  const a = useIn(0, 16);
  const second = interpolate(f, [split, split + 12], [0, 1], {...clamp, easing: ease});
  const box = useIn(split + 6, 14);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 90, right: 90, top: 140, display: "flex", flexDirection: "column", gap: 12}}>
        <div style={{opacity: 1 - second, position: "absolute", top: 0, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 12}}>
          <Kicker>De onde vêm · OpenBible.info</Kicker>
          <div style={{fontFamily: F.title, fontSize: 70, lineHeight: 1.05, color: C.ink}}>Tesouro do Conhecimento das Escrituras</div>
          <div style={{fontFamily: F.ui, fontSize: 34, color: C.ink2, lineHeight: 1.25}}>
            índice clássico em domínio público: a maior parte das ~340 mil referências
          </div>
        </div>
        <div style={{opacity: second, position: "absolute", top: 0, left: 0, right: 0, display: "flex", flexDirection: "column", gap: 12}}>
          <Kicker>E os leitores votam</Kicker>
          <div style={{fontFamily: F.title, fontSize: 70, lineHeight: 1.05, color: C.ink}}>
            ▲ nas que mais ajudam
          </div>
          <div style={{fontFamily: F.ui, fontSize: 34, color: C.ink2, lineHeight: 1.25}}>
            nosso site mostra cada ligação com os votos
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 200,
          top: 560,
          width: 680,
          height: 820,
          borderRadius: 54,
          border: `12px solid ${C.ink}`,
          overflow: "hidden",
          background: "#F8F4ED",
          opacity: a,
          translate: `0px ${(1 - a) * 120}px`,
          boxShadow: "0 30px 80px rgba(14,30,26,0.25)",
        }}
      >
        <Img src={staticFile("img/site-joao316.png")} style={{width: 656, display: "block", translate: `0px ${-interpolate(f, [split - 10, split + 30], [0, 300], {...clamp, easing: ease})}px`}} />
        <div
          style={{
            position: "absolute",
            left: 22,
            width: 612,
            top: 678 - interpolate(f, [split - 10, split + 30], [0, 300], {...clamp, easing: ease}),
            height: 82,
            borderRadius: 14,
            border: `5px solid ${C.gold}`,
            boxShadow: `0 0 24px ${C.gold}`,
            opacity: box,
          }}
        />
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1392, textAlign: "center", fontFamily: F.mono, fontSize: 24, color: C.ink3, opacity: a}}>
        Bíblia Conectada · /joao/3/16
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_Five: React.FC = () => {
  const f = useCurrentFrame();
  const a = useIn(0, 16);
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 0, right: 0, top: 520, textAlign: "center", fontFamily: F.greek, fontSize: 210, color: "rgba(138,94,44,0.13)"}}>
        ἀγαπάω
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 820, textAlign: "center", fontFamily: F.hebrew, fontSize: 210, color: "rgba(106,51,53,0.12)", direction: "rtl"}}>
        אָהַב
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 26, opacity: a}}>
        <div style={{fontFamily: F.mono, fontWeight: 700, fontSize: 220, color: C.ink, lineHeight: 1}}>5</div>
        <div style={{fontFamily: F.title, fontSize: 84, color: C.ink}}>ligações</div>
        <div style={{display: "flex", gap: 22}}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{width: 26, height: 26, borderRadius: 26, background: C.gold, opacity: interpolate(f, [8 + i * 4, 14 + i * 4], [0, 1], clamp), boxShadow: `0 0 18px ${C.gold}`}} />
          ))}
        </div>
        <div style={{fontFamily: F.ui, fontSize: 40, color: C.ink2}}>conferidas no grego e no hebraico</div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_Rank: React.FC = () => {
  const f = useCurrentFrame();
  const rows = data.top5;
  const max = rows[0].votes;
  return (
    <AbsoluteFill>
      <Paper />
      <Card kicker="Ligação 1 de 5" title="Romanos 5:8" votes={V["Rom.5.8"]} how={`5ª mais votada entre ${fmt(data.nPairs)} pares da Bíblia`} />
      <div style={{position: "absolute", left: 90, right: 90, top: 700, display: "flex", flexDirection: "column", gap: 30}}>
        {rows.map((r, i) => {
          const ours = r.a === "João 3:16" || r.b === "João 3:16";
          const p = interpolate(f, [18 + i * 5, 40 + i * 5], [0, 1], {...clamp, easing: ease});
          return (
            <div key={i} style={{display: "flex", flexDirection: "column", gap: 8, opacity: ours ? 1 : 0.62}}>
              <div style={{display: "flex", justifyContent: "space-between", fontFamily: F.ui, fontSize: ours ? 36 : 31, color: ours ? C.ink : C.ink2, fontWeight: ours ? 600 : 400}}>
                <span>
                  {i + 1}º · {r.a} ↔ {r.b}
                </span>
                <span style={{fontFamily: F.mono}}>{fmt(r.votes)}</span>
              </div>
              <div style={{height: ours ? 22 : 14, width: `${(r.votes / max) * 100 * p}%`, borderRadius: 12, background: ours ? C.gold : "rgba(138,94,44,0.45)", boxShadow: ours ? `0 0 22px ${C.gold}` : undefined}} />
            </div>
          );
        })}
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_IllusCard: React.FC<{
  src: string;
  dur: number;
  card?: React.ComponentProps<typeof Card>;
  tag?: string;
  dark?: boolean;
  z?: [number, number];
  y?: [number, number];
  x?: [number, number];
  origin?: string;
  glow?: [string, string, number];
}> = ({src, dur, card, tag, dark, z, y, x, origin, glow}) => (
  <AbsoluteFill>
    <Illus src={src} dur={dur} z={z} y={y} x={x} origin={origin} />
    {glow ? <Glow x={glow[0]} y={glow[1]} r={glow[2]} strength={0.4} /> : null}
    <Dust n={18} seed={src} />
    {card ? <Scrim dark={dark} h={card.small ? 640 : 760} /> : null}
    {card ? <Card {...card} dark={dark} /> : null}
    {tag ? (
      <div style={{position: "absolute", left: 90, top: 160}}>
        <div style={{padding: "10px 20px", borderRadius: 14, background: dark ? "rgba(6,13,26,0.7)" : "rgba(247,239,227,0.88)"}}>
          <Kicker color={dark ? C.goldText : C.bronze}>{tag}</Kicker>
        </div>
      </div>
    ) : null}
    <Tag dark={dark}>ILUSTRAÇÃO</Tag>
  </AbsoluteFill>
);

const HL = ["#FFCC6B", "#B9D3A5", "#E8B7AE", "#E2C9A0", "#C9D8E8"];
const Verse: React.FC<{text: string; keys: Record<string, number>; on: number; size?: number}> = ({text, keys, on, size = 52}) => (
  <div style={{fontFamily: F.title, fontSize: size, lineHeight: 1.3, color: C.ink}}>
    {text.split(" ").map((w, i) => {
      const k = keys[norm(w)];
      const lit = k !== undefined && on > k;
      return (
        <span key={i}>
          <span
            style={{
              background: lit ? HL[k] : "transparent",
              borderRadius: 10,
              padding: lit ? "0 6px" : 0,
              boxDecorationBreak: "clone",
            }}
          >
            {w}
          </span>{" "}
        </span>
      );
    })}
  </div>
);

const S_Words: React.FC = () => {
  const f = useCurrentFrame();
  const on = interpolate(f, [24, 70], [0, 5], clamp);
  const a = useIn(10, 16);
  const ka = {amou: 0, deus: 1, mundo: 2, filho: 3, unigenito: 4};
  const kb = {amor: 0, deus: 1, mundo: 2, filho: 3, unigenito: 4};
  const chips: [string, string, number][] = [
    ["θεός", "Deus", 1],
    ["κόσμος", "mundo", 2],
    ["υἱός", "Filho", 3],
    ["μονογενής", "unigênito", 4],
  ];
  return (
    <AbsoluteFill>
      <Paper />
      <Card kicker="Ligação 2 de 5" title="1 João 4:9" votes={V["1John.4.9"]} how="as mesmas palavras, no grego" small />
      <div style={{position: "absolute", left: 90, right: 90, top: 610, display: "flex", flexDirection: "column", gap: 26, opacity: a}}>
        <Kicker>João 3:16</Kicker>
        <Verse text="Porque Deus amou ao mundo de tal maneira, que deu o seu Filho unigênito;" keys={ka} on={on} size={48} />
        <div style={{display: "flex", gap: 14, flexWrap: "wrap"}}>
          {chips.map(([g, p, k]) => (
            <div key={g} style={{padding: "8px 16px", borderRadius: 14, background: on > k ? HL[k] : "rgba(14,30,26,0.06)", display: "flex", gap: 10, alignItems: "baseline"}}>
              <span style={{fontFamily: F.greek, fontSize: 40, color: C.ink}}>{g}</span>
              <span style={{fontFamily: F.ui, fontSize: 24, color: C.ink2}}>{p}</span>
            </div>
          ))}
        </div>
        <Kicker>1 João 4:9</Kicker>
        <Verse text="Nisto se manifestou o amor de Deus por nós: que Deus enviou o seu Filho unigênito ao mundo, para que por meio dele vivamos." keys={kb} on={on} size={48} />
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_Mono: React.FC = () => {
  const f = useCurrentFrame();
  const word = "μονογενής";
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 0, right: 0, top: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 20}}>
        <Kicker>Uma palavra rara</Kicker>
        <div style={{fontFamily: F.greek, fontSize: 168, color: C.ink, letterSpacing: "0.01em"}}>
          {word.split("").map((ch, i) => (
            <span key={i} style={{opacity: interpolate(f, [i * 2.4, i * 2.4 + 8], [0, 1], clamp), color: i >= 4 ? C.wine : C.ink}}>
              {ch}
            </span>
          ))}
        </div>
        <div style={{fontFamily: F.mono, fontSize: 44, color: C.bronze, opacity: interpolate(f, [18, 30], [0, 1], clamp)}}>monogenḗs</div>
        <div style={{fontFamily: F.title, fontSize: 76, color: C.ink, opacity: interpolate(f, [26, 40], [0, 1], clamp)}}>“unigênito”, “único”</div>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 1300, textAlign: "center", fontFamily: F.mono, fontSize: 24, color: C.ink3}}>
        grego do NT: SBLGNT · MorphGNT
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_Nine: React.FC<{isaac: number}> = ({isaac}) => {
  const f = useCurrentFrame();
  const lit = interpolate(f, [isaac, isaac + 10], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Paper />
      <Card kicker="A palavra no Novo Testamento" title={`${data.monoCount} vezes`} small />
      <div style={{position: "absolute", left: 90, right: 90, top: 520, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18}}>
        {data.mono.map((r, i) => {
          const isI = r === "Hebreus 11:17";
          const ours = r === "João 3:16" || r === "1 João 4:9";
          const a = interpolate(f, [4 + i * 3, 14 + i * 3], [0, 1], clamp);
          return (
            <div
              key={r}
              style={{
                height: 120,
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: F.ui,
                fontSize: 32,
                fontWeight: ours || isI ? 600 : 400,
                color: C.ink,
                background: isI ? `rgba(255,204,107,${0.25 + 0.75 * lit})` : ours ? "rgba(138,94,44,0.18)" : "rgba(14,30,26,0.06)",
                boxShadow: isI ? `0 0 ${30 * lit}px ${C.gold}` : undefined,
                opacity: a,
                scale: String(isI ? 1 + 0.06 * lit : 1),
              }}
            >
              {r}
            </div>
          );
        })}
      </div>
      <div style={{position: "absolute", left: 90, right: 90, top: 990, display: "flex", flexDirection: "column", gap: 12, opacity: lit}}>
        <Kicker>Hebreus 11:17 · sobre Isaque</Kicker>
        <div style={{fontFamily: F.title, fontSize: 54, lineHeight: 1.25, color: C.ink}}>
          “…Abraão (…) ofereceu Isaque; (…) ofereceu o [seu] <span style={{background: C.gold, borderRadius: 10, padding: "0 8px"}}>único</span> filho”
        </div>
        <div style={{fontFamily: F.greek, fontSize: 40, color: C.bronze}}>τὸν μονογενῆ προσέφερεν</div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_FirstTime: React.FC<{greekAt: number}> = ({greekAt}) => {
  const f = useCurrentFrame();
  const y = 1330;
  const gx = ax(data.chapterIndex["Gênesis 22"] - 1);
  const jx = ax(FROM);
  const a = useIn(0, 14);
  const g = interpolate(f, [greekAt, greekAt + 26], [0, 1], {...clamp, easing: ease});
  const rx = (jx - gx) / 2;
  return (
    <AbsoluteFill>
      <Paper />
      <Card kicker="Gênesis 22:2 · a primeira vez" title="“a quem amas”" how="1ª ocorrência de “amar”: no hebraico (OSHB), no grego antigo (Septuaginta) e na Bíblia Livre" small />
      <svg width={1080} height={1920} style={{position: "absolute", left: 0, top: 0}}>
        {data.arcs.books.map((b, i) => (
          <rect key={i} x={ax(b.first)} y={y - 9} width={Math.max(1, ax(b.first + b.chapters) - ax(b.first) - 1.5)} height={18} fill={i < 39 ? "rgba(138,94,44,0.45)" : "rgba(43,69,58,0.45)"} />
        ))}
        <path d={`M ${gx} ${y - 12} A ${rx} ${rx * 0.5} 0 0 1 ${jx} ${y - 12}`} fill="none" stroke={C.gold} strokeWidth={7} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - g} strokeLinecap="round" />
        <circle cx={gx} cy={y} r={16} fill={C.wine} />
        <circle cx={jx} cy={y} r={16 * g} fill={C.gold} />
      </svg>
      <div style={{position: "absolute", left: gx - 60, top: y + 30, fontFamily: F.ui, fontSize: 28, color: C.wine, fontWeight: 600, opacity: a}}>Gênesis 22</div>
      <div style={{position: "absolute", left: jx - 120, top: y + 30, width: 240, textAlign: "center", fontFamily: F.ui, fontSize: 28, color: C.bronze, fontWeight: 600, opacity: g}}>João 3:16</div>
      <div style={{position: "absolute", left: 90, top: 600, display: "flex", flexDirection: "column", gap: 4, opacity: a}}>
        <div style={{fontFamily: F.hebrew, fontSize: 120, color: C.wine, direction: "rtl", lineHeight: 1.1}}>אָהַבְתָּ</div>
        <div style={{fontFamily: F.mono, fontSize: 30, color: C.ink2}}>ahavtá · “amas” · hebraico</div>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 850, display: "flex", justifyContent: "space-between", padding: "0 90px", opacity: g}}>
        <div style={{display: "flex", flexDirection: "column"}}>
          <div style={{fontFamily: F.greek, fontSize: 70, color: C.ink}}>ἠγάπησας</div>
          <div style={{fontFamily: F.mono, fontSize: 24, color: C.ink2}}>Gn 22:2 · Septuaginta</div>
        </div>
        <div style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
          <div style={{fontFamily: F.greek, fontSize: 70, color: C.bronze}}>ἠγάπησεν</div>
          <div style={{fontFamily: F.mono, fontSize: 24, color: C.ink2}}>Jo 3:16 · NT grego</div>
        </div>
      </div>
      <div style={{position: "absolute", left: 0, right: 0, top: 990, textAlign: "center", fontFamily: F.ui, fontSize: 36, color: C.ink, opacity: g}}>
        o mesmo verbo: <span style={{fontFamily: F.greek, fontSize: 44}}>ἀγαπάω</span> · amar
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_Verb: React.FC = () => {
  const f = useCurrentFrame();
  const a = useIn(6, 14);
  const b = useIn(20, 14);
  const G: React.FC<{pre: string; hit: string; post: string; on: number}> = ({pre, hit, post, on}) => (
    <div style={{fontFamily: F.greek, fontSize: 60, color: C.ink, lineHeight: 1.25}}>
      {pre}
      <span style={{background: `rgba(255,204,107,${on})`, borderRadius: 10, padding: "0 6px"}}>{hit}</span>
      {post}
    </div>
  );
  return (
    <AbsoluteFill>
      <Paper />
      <Card kicker="No grego" title="“poupar”" how={`φείδομαι · e Gênesis 22:12 ↔ Romanos 8:32 também é ligação (${data.chain["Gen.22.12~Rom.8.32"]} votos)`} small />
      <div style={{position: "absolute", left: 90, right: 90, top: 640, display: "flex", flexDirection: "column", gap: 18}}>
        <div style={{opacity: a}}>
          <Kicker>Gênesis 22:12 · Septuaginta</Kicker>
          <G pre="οὐκ " hit="ἐφείσω" post=" τοῦ υἱοῦ σου" on={a} />
          <div style={{fontFamily: F.title, fontSize: 40, color: C.ink2}}>“não me recusaste o teu filho”</div>
        </div>
        <div style={{height: 2, background: "rgba(14,30,26,0.15)", margin: "14px 0"}} />
        <div style={{opacity: b}}>
          <Kicker>Romanos 8:32</Kicker>
          <G pre="τοῦ ἰδίου υἱοῦ οὐκ " hit="ἐφείσατο" post="" on={b} />
          <div style={{fontFamily: F.title, fontSize: 40, color: C.ink2}}>“nem mesmo ao seu próprio Filho poupou”</div>
        </div>
      </div>
      <Grain />
    </AbsoluteFill>
  );
};

const S_Climax: React.FC<{cut: number; dur: number}> = ({cut, dur}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      {f < cut ? (
        <AbsoluteFill>
          <Illus src="altar.jpg" dur={cut} z={[1.06, 1.12]} origin="40% 55%" />
          <Glow x="45%" y="30%" r={700} strength={0.5} />
          <Dust n={26} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill>
          <Sequence from={cut} layout="none">
            <AbsoluteFill>
              <Illus src="cross.jpg" dur={dur - cut} z={[1.18, 1.04]} origin="50% 78%" />
            </AbsoluteFill>
          </Sequence>
        </AbsoluteFill>
      )}
      <Tag dark={f >= cut}>ILUSTRAÇÃO</Tag>
    </AbsoluteFill>
  );
};

const S_Bloom: React.FC<{dur: number}> = ({dur}) => {
  const f = useCurrentFrame();
  const sky = interpolate(f, [26, 52], [0, 1], {...clamp, easing: ease});
  const dawn = interpolate(f, [0, 40], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Illus src="cross.jpg" dur={dur} z={[1.04, 1.0]} origin="50% 78%" />
      <AbsoluteFill style={{background: `radial-gradient(circle 900px at 50% 64%, rgba(255,204,107,${0.55 * dawn}) 0%, rgba(255,204,107,0) 70%)`, mixBlendMode: "screen"}} />
      <AbsoluteFill style={{opacity: sky}}>
        <Paper color={C.sky} />
        <Dust n={46} color="#F2EBDD" seed="b" />
        <Arcs y={1240} maxH={640} start={26} mode="gold" />
        <AxisLabels y={1240} />
        <div style={{position: "absolute", left: 90, right: 90, top: 170, display: "flex", flexDirection: "column", gap: 10}}>
          <Kicker color={C.goldText}>João 3:16</Kicker>
          <div style={{fontFamily: F.title, fontSize: 96, color: C.skyInk, lineHeight: 1.02}}>
            as {data.links} ligações acesas
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const S_End: React.FC = () => {
  const f = useCurrentFrame();
  const rows: [string, number, string][] = [
    ["Romanos 5:8", V["Rom.5.8"], "5ª mais votada da Bíblia"],
    ["1 João 4:9", V["1John.4.9"], "as mesmas palavras · μονογενής"],
    ["Gênesis 22:2 / 22:12", V["Gen.22.2"] + 0, `1ª vez de “amar” · e 22:12: ${fmt(V["Gen.22.12"])}`],
    ["João 1:29", V["John.1.29"], "“onde está o cordeiro?” → “Eis o Cordeiro”"],
    ["Romanos 8:32", V["Rom.8.32"], "o mesmo verbo: poupar"],
    ["1 João 4:19", V["1John.4.19"], "ἠγάπησεν = ἠγάπησεν"],
  ];
  return (
    <AbsoluteFill>
      <Paper />
      <div style={{position: "absolute", left: 90, right: 90, top: 140, display: "flex", flexDirection: "column", gap: 10}}>
        <Kicker>João 3:16 · {data.links} ligações</Kicker>
        <div style={{fontFamily: F.title, fontSize: 84, color: C.ink, lineHeight: 1}}>Qual você não conhecia?</div>
      </div>
      <div style={{position: "absolute", left: 90, right: 90, top: 420, display: "flex", flexDirection: "column", gap: 22}}>
        {rows.map(([r, v, h], i) => {
          const a = interpolate(f, [4 + i * 4, 16 + i * 4], [0, 1], clamp);
          return (
            <div key={r} style={{opacity: a, translate: `${(1 - a) * 30}px 0px`, display: "flex", flexDirection: "column", gap: 4, borderBottom: "2px solid rgba(14,30,26,0.12)", paddingBottom: 14}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
                <span style={{fontFamily: F.title, fontSize: 52, color: C.ink}}>{r}</span>
                <span style={{fontFamily: F.mono, fontWeight: 700, fontSize: 36, color: C.bronze}}>{fmt(v)} votos</span>
              </div>
              <span style={{fontFamily: F.ui, fontSize: 30, color: C.ink2}}>{h}</span>
            </div>
          );
        })}
      </div>
      <div style={{position: "absolute", left: 90, right: 90, top: 1330, fontFamily: F.mono, fontSize: 21, lineHeight: 1.5, color: C.ink3}}>
        Ligações e votos: OpenBible.info (CC BY), em Bíblia Conectada /joao/3/16 · Texto: Bíblia Livre (CC BY 4.0) · Grego: SBLGNT/MorphGNT · Hebraico: OSHB · Septuaginta (domínio público) · Ilustrações geradas por IA
      </div>
      <Grain />
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
  // spoken progress (word times) mapped onto the displayed words by proportion
  const spoken = l.words.filter((w) => w.t0 <= t).length;
  const ratio = l.words.length ? spoken / l.words.length : 1;
  const litN = Math.round(ratio * words.length);
  const W_ = (w: string, i: number) => (
    <span key={i} style={{opacity: i < litN ? 1 : 0.38}}>
      {w}
      {i < words.length - 1 ? " " : ""}
    </span>
  );
  return (
    <div style={{position: "absolute", left: 70, right: 70, top: 1440, display: "flex", justifyContent: "center", opacity: a}}>
      <div
        style={{
          maxWidth: 940,
          padding: q ? "22px 34px 18px" : "18px 30px",
          borderRadius: 26,
          background: "rgba(247,239,227,0.93)",
          boxShadow: "0 10px 40px rgba(14,30,26,0.18)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{lineHeight: 1.22, color: C.ink}}>
          {qs > 0 ? (
            <span style={{fontFamily: F.ui, fontWeight: 600, fontSize: 44}}>{words.slice(0, qs).map((w, i) => W_(w, i))}</span>
          ) : null}
          {q ? (
            <span style={{fontFamily: F.title, fontWeight: 440, fontSize: 52}}>
              “{words.slice(qs).map((w, i) => W_(w, i + qs))}”
            </span>
          ) : null}
        </div>
        {q ? <div style={{fontFamily: F.mono, fontSize: 24, color: C.bronze}}>{q.ref} · Bíblia Livre</div> : null}
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
  // scene k starts at its first line; ends when the next starts (+XF of overlap)
  const plan: [number, (dur: number, start: number) => React.ReactNode][] = [
    [1, (d) => <S_Hook dur={d} />],
    [3, () => <S_ToJohn />],
    [4, () => <S_Arcs start={10} />],
    [5, (d, s) => <S_Method split={fr(wordT(5, "leitores")) - s - 6} />],
    [6, () => <S_Five />],
    [7, () => <S_Rank />],
    [8, (d) => <S_IllusCard src="paul.jpg" dur={d} tag="Romanos 5:8" z={[1.0, 1.1]} origin="55% 60%" glow={["70%", "55%", 380]} />],
    [9, () => <S_Words />],
    [10, () => <S_Mono />],
    [11, (d, s) => <S_Nine isaac={fr(wordT(11, "isaque")) - s - 4} />],
    [12, (d) => <S_IllusCard src="call.jpg" dur={d} dark card={{kicker: "Ligação 3 de 5", title: "Gênesis 22:2", votes: V["Gen.22.2"], how: `e Gênesis 22:12: ${fmt(V["Gen.22.12"])} votos`}} z={[1.0, 1.1]} origin="40% 70%" glow={["58%", "6%", 600]} />],
    [14, (d, s) => <S_FirstTime greekAt={fr(wordT(14, "grego")) - s} />],
    [15, (d) => <S_IllusCard src="question.jpg" dur={d} tag="Gênesis 22:7–8" z={[1.0, 1.12]} origin="60% 45%" />],
    [17, (d) => <S_IllusCard src="baptist.jpg" dur={d} card={{kicker: "Ligação 4 de 5", title: "João 1:29", votes: V["John.1.29"], how: `e Gênesis 22:7 ↔ João 1:29: ${data.chain["Gen.22.7~John.1.29"]} votos`, small: true}} z={[1.0, 1.08]} x={[0, -30]} origin="70% 40%" />],
    [18, (d) => <S_IllusCard src="altar.jpg" dur={d} tag="Gênesis 22:11–12" z={[1.0, 1.08]} origin="40% 50%" glow={["40%", "20%", 620]} />],
    [19, (d) => <S_IllusCard src="ram.jpg" dur={d} tag="Gênesis 22:13" z={[1.0, 1.1]} origin="45% 60%" glow={["58%", "42%", 420]} />],
    [20, (d) => <S_IllusCard src="paul.jpg" dur={d} card={{kicker: "Ligação 5 de 5", title: "Romanos 8:32", votes: V["Rom.8.32"], how: "Paulo usa o verbo de Gênesis 22", small: true}} z={[1.1, 1.22]} origin="70% 62%" glow={["70%", "57%", 360]} />],
    [21, () => <S_Verb />],
    [22, (d, s) => <S_Climax cut={fr(wordT(22, "o", 1)) - s - 2} dur={d} />],
    [23, (d) => <S_Bloom dur={d} />],
    [24, (d) => <S_IllusCard src="people.jpg" dur={d} card={{kicker: "E mais uma", title: "1 João 4:19", votes: V["1John.4.19"], how: "ἠγάπησεν: a mesma palavra de João 3:16", small: true}} z={[1.0, 1.08]} origin="50% 55%" glow={["50%", "45%", 520]} />],
    [25, () => <S_End />],
  ];
  const starts = plan.map(([i]) => at(i));
  return (
    <AbsoluteFill style={{backgroundColor: C.paper}}>
      {plan.map(([i, render], k) => {
        const from = starts[k];
        const to = k + 1 < plan.length ? starts[k + 1] + XF : total;
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <Fade first={k === 0}>{render(to - from, from)}</Fade>
          </Sequence>
        );
      })}
      <Captions hide={[1, 25]} />
    </AbsoluteFill>
  );
};
