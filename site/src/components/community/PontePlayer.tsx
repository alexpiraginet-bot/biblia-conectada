"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInt } from "@/lib/canon/text";
import { BASE, chapterOfVerse } from "@/lib/community/books-client";
import { loadBridge } from "@/lib/community/fetchers";
import { longRef, shortRef, versePath } from "@/lib/community/geometry";
import {
  PONTE_DAYS,
  PONTE_LAUNCH,
  bridgeHome,
  bridgeNumber,
  decodeDistances,
  distanceAt,
  formatDateBR,
  saoPauloDate,
  type PonteFile,
} from "@/lib/community/ponte";
import { KEYS, readPonte, readRaw, subscribeStore, writeJSON, writeRaw, type BridgeProgress, type PonteStore } from "@/lib/community/store";
import { ArcSky, type SkyArc } from "./ArcSky";
import { CardMaker } from "./CardMaker";
import styles from "./community.module.css";

/** What the page knows before any fetch (the prerendered /ponte/<n> pages). */
export type BridgeIntro = { n: number; date: string; start: number; target: number; min: number; texts: [string, string] };

const hops = (d: number) => `${formatInt(d)} ${d === 1 ? "salto" : "saltos"}`;
const noop = () => () => {};
const parseStore = (raw: string | null): PonteStore => {
  try {
    const s = raw ? (JSON.parse(raw) as PonteStore) : null;
    return s?.bridges ? s : { bridges: {} };
  } catch {
    return { bridges: {} };
  }
};
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/**
 * Ponte nº N: the start screen, the bridge in progress and the end screen, for a fixed bridge (/ponte/<n>) or for
 * today's (/ponte, picked from the São Paulo date on this device; /ponte#<n> opens an earlier one).
 */
export function PontePlayer({ intro, builtThrough }: { intro?: BridgeIntro; builtThrough: number }) {
  const router = useRouter();
  const today = useSyncExternalStore(noop, () => saoPauloDate(new Date()), () => null);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const raw = useSyncExternalStore(subscribeStore, () => readRaw(KEYS.ponte), () => null);
  const store = parseStore(raw);

  const todayN = today ? bridgeNumber(today) : null;
  const asked = /^#([1-9]\d{0,2})$/.exec(hash);
  const n = intro
    ? intro.n
    : todayN === null
      ? null
      : asked && Number(asked[1]) <= Math.min(todayN, PONTE_DAYS)
        ? Number(asked[1])
        : todayN;

  const [files, setFiles] = useState<Record<number, PonteFile | "error">>({});
  const valid = n !== null && n >= 1 && n <= PONTE_DAYS;
  useEffect(() => {
    if (n === null || n < 1 || n > PONTE_DAYS) return;
    let live = true;
    loadBridge(n)
      .then((f) => live && setFiles((m) => ({ ...m, [n]: f })))
      .catch(() => live && setFiles((m) => ({ ...m, [n]: "error" })));
    return () => {
      live = false;
    };
  }, [n]);

  const progress = n !== null ? store.bridges[String(n)] : undefined;
  const done = progress?.state === "arrived" || progress?.state === "gaveUp";
  // the end screen has been seen: the strip on the reading pages has nothing more to say about this bridge
  useEffect(() => {
    if (done && readPonte().current === n && readRaw(KEYS.ponteStrip) === "1") writeRaw(KEYS.ponteStrip, null);
  }, [done, n]);

  if (n === null) return <p className={styles.meta}>Procurando a ponte de hoje…</p>;
  if (!valid) {
    return n < 1 ? (
      <p className={styles.meta}>A Ponte nº 1 sai em {formatDateBR(PONTE_LAUNCH)}.</p>
    ) : (
      <p className={styles.meta}>As pontes deste calendário terminaram. As anteriores estão no arquivo abaixo.</p>
    );
  }
  const file = files[n];
  const info: BridgeIntro | null =
    intro ?? (file && file !== "error" ? { n, date: file.date, start: file.start, target: file.target, min: file.min, texts: [file.texts[file.start], file.texts[file.target]] } : null);
  if (file === "error" && !info) return <p className={styles.meta}>Não deu para carregar a ponte. Tente de novo mais tarde.</p>;
  if (!info) return <p className={styles.meta}>Carregando a Ponte nº {n}…</p>;

  const home = bridgeHome(n, builtThrough);
  function save(next: BridgeProgress, strip: boolean) {
    const s = readPonte();
    s.bridges[String(next.n)] = next;
    s.current = next.n;
    writeJSON(KEYS.ponte, s);
    writeRaw(KEYS.ponteStrip, strip ? "1" : null);
  }
  const start = () => {
    save({ n, start: info.start, target: info.target, min: info.min, path: [info.start], votes: [], state: "playing", home }, true);
    router.push(versePath(BASE, info.start));
  };
  const resume = (p: BridgeProgress) => {
    save(p, true);
    router.push(versePath(BASE, p.path[p.path.length - 1]));
  };
  const giveUp = (p: BridgeProgress) => save({ ...p, state: "gaveUp" }, false);

  const heading = (
    <>
      <p className="kicker">{intro ? formatDateBR(info.date) : `Ponte nº ${n} · ${formatDateBR(info.date)}`}</p>
      <h2 className={styles.title}>
        {longRef(BASE, info.start)} → {longRef(BASE, info.target)}
      </h2>
      <p className={styles.meta}>
        Mínimo: <strong>{hops(info.min)}</strong>, pelas ligações entre versículos (qualquer voto, as mesmas do painel de leitura).
      </p>
    </>
  );

  if (progress && done) {
    return (
      <div>
        {heading}
        {file && file !== "error" ? <EndScreen file={file} progress={progress} /> : <p className={styles.meta}>Carregando a resposta…</p>}
      </div>
    );
  }

  const endpoints = (
    <ArcSky
      captionId={`ponte-${n}-pontos`}
      arcs={[]}
      stars={[
        { x: BASE.verseX(info.start), gold: true },
        { x: BASE.verseX(info.target), gold: true },
      ]}
      labels={[
        { x: BASE.verseX(info.start), text: shortRef(BASE, info.start), gold: true },
        { x: BASE.verseX(info.target), text: shortRef(BASE, info.target), gold: true },
      ]}
      caption={<>A linha vai de Gênesis a Apocalipse. Os arcos aparecem quando a ponte termina.</>}
    />
  );

  if (progress?.state === "playing") {
    const packed = file && file !== "error" ? decodeDistances(file.dist) : null;
    const last = progress.path[progress.path.length - 1];
    const d = packed ? distanceAt(packed, last) : null;
    return (
      <div>
        {heading}
        <p className={styles.lede}>
          Em andamento neste aparelho: você está em {longRef(BASE, last)}
          {d !== null && <>, a {hops(d)} do destino</>}, depois de {hops(progress.path.length - 1)}.
        </p>
        <PathList path={progress.path} votes={progress.votes} />
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={() => resume(progress)}>
            Continuar em {shortRef(BASE, last)}
          </button>
          <button type="button" className={styles.buttonQuiet} onClick={() => giveUp(progress)}>
            Desistir e ver a resposta
          </button>
        </div>
        {endpoints}
      </div>
    );
  }

  return (
    <div>
      {heading}
      <div className={styles.pair}>
        <blockquote className={styles.verse}>
          <p className={styles.verseLabel}>Início</p>
          <p className={styles.verseRef}>{longRef(BASE, info.start)}</p>
          <p className={styles.verseText}>{info.texts[0]}</p>
        </blockquote>
        <blockquote className={styles.verse}>
          <p className={styles.verseLabel}>Destino</p>
          <p className={styles.verseRef}>{longRef(BASE, info.target)}</p>
          <p className={styles.verseText}>{info.texts[1]}</p>
        </blockquote>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={start}>
          Começar em {shortRef(BASE, info.start)}
        </button>
      </div>
      <p className={styles.lede}>
        Cada salto é uma ligação real entre dois versículos, das referências cruzadas da OpenBible.info: abra o início, escolha
        uma das ligações dele e siga até o destino. Uma faixa nas páginas de leitura diz a quantos saltos você está e se ficou
        mais perto ou mais longe. Não há tempo nem placar; quem desiste vê a resposta.
      </p>
      {endpoints}
    </div>
  );
}

function PathList({ path, votes, gold }: { path: number[]; votes: number[]; gold?: boolean }) {
  return (
    <ol className={styles.list}>
      {path.map((gv, i) => (
        <li key={`${gv}-${i}`}>
          <Link href={versePath(BASE, gv)} className={styles.rowLink}>
            <span className={styles.rowLead}>{i === 0 ? "início" : `${i}º salto`}</span>
            <span className={styles.rowMain} style={gold && i > 0 ? { color: "var(--accent)" } : undefined}>
              {longRef(BASE, gv)}
            </span>
            {i > 0 && <span className={styles.rowCount}>{formatInt(votes[i - 1])} votos</span>}
          </Link>
        </li>
      ))}
    </ol>
  );
}

function routeArcs(path: number[], look: SkyArc["look"], votes: number[]): SkyArc[] {
  return path.slice(1).map((gv, i) => ({ x0: BASE.verseX(path[i]), x1: BASE.verseX(gv), look, votes: votes[i] }));
}

function EndScreen({ file, progress }: { file: PonteFile; progress: BridgeProgress }) {
  const arrived = progress.state === "arrived";
  const own = progress.path;
  const ownHops = own.length - 1;
  const weakest = Math.min(...file.strongestVotes);
  const target = chapterOfVerse(file.target);
  const stars = (path: number[], gold: boolean) => path.map((gv) => ({ x: BASE.verseX(gv), gold }));
  const ends = [
    { x: BASE.verseX(file.start), text: shortRef(BASE, file.start) },
    { x: BASE.verseX(file.target), text: shortRef(BASE, file.target) },
  ];
  return (
    <>
      <p className={styles.lede} role="status">
        {arrived ? (
          <>
            Você chegou a {longRef(BASE, file.target)} em {hops(ownHops)}. O mínimo é {hops(file.min)}.
          </>
        ) : (
          <>Esta é a rota mais forte de {longRef(BASE, file.start)} a {longRef(BASE, file.target)}.</>
        )}{" "}
        Há {formatInt(file.routes)} {file.routes === 1 ? "rota" : "rotas"} com {hops(file.min)}; a mais forte é a de elo mais
        fraco mais votado (o salto mais fraco dela tem {formatInt(weakest)} votos).
      </p>
      <div className={styles.actions}>
        <Link href={target.path} className={styles.button}>
          Ler {target.label}
        </Link>
      </div>

      {ownHops > 0 && (
        <section className={styles.section} aria-labelledby="titulo-seu-caminho">
          <h3 id="titulo-seu-caminho" className={styles.h2}>
            Seu caminho
          </h3>
          <ArcSky
            captionId="legenda-seu-caminho"
            arcs={routeArcs(own, "gold", progress.votes)}
            stars={stars(own, true)}
            labels={ends}
            caption={<>Cada arco em ouro é um salto seu, de Gênesis a Apocalipse. A lista abaixo traz os mesmos saltos com os votos.</>}
          />
          <PathList path={own} votes={progress.votes} gold />
        </section>
      )}

      <section className={styles.section} aria-labelledby="titulo-rota-forte">
        <h3 id="titulo-rota-forte" className={styles.h2}>
          Rota mais forte
        </h3>
        <ArcSky
          captionId="legenda-rota-forte"
          arcs={routeArcs(file.strongest, "tone", file.strongestVotes)}
          stars={stars(file.strongest, false)}
          labels={ends}
          caption={<>A cor de cada arco mostra a distância do salto, e a espessura, os votos (soma das duas direções).</>}
        />
        <ol className={styles.list}>
          {file.strongest.map((gv, i) => (
            <li key={gv}>
              <div className={styles.row}>
                <span className={styles.rowLead}>{i === 0 ? "início" : `${i}º salto`}</span>
                <span className={styles.rowMain}>
                  <Link href={versePath(BASE, gv)}>{longRef(BASE, gv)}</Link>
                  <span className={styles.verseText} style={{ display: "block", fontSize: "1rem" }}>
                    {file.texts[String(gv)]}
                  </span>
                </span>
                {i > 0 && <span className={styles.rowCount}>{formatInt(file.strongestVotes[i - 1])} votos</span>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {arrived && (
        <CardMaker
          title="Cartão sem resposta"
          intro="Uma imagem com os seus arcos e o mínimo, sem os versículos do caminho: quem receber pode fazer a mesma ponte. Ela é desenhada neste aparelho; nada é enviado."
          fileName={`biblia-conectada-ponte-${file.n}.png`}
          shareText={`Ponte nº ${file.n}: ${shortRef(BASE, file.start)} → ${shortRef(BASE, file.target)}, mínimo ${hops(file.min)}.`}
          alt={`Cartão da Ponte nº ${file.n}: de ${longRef(BASE, file.start)} a ${longRef(BASE, file.target)}, mínimo ${hops(file.min)}, com os arcos do caminho e sem os versículos dele.`}
          spec={{
            kicker: `Ponte nº ${file.n}`,
            title: `${longRef(BASE, file.start)} → ${longRef(BASE, file.target)}`,
            arcs: own.slice(1).map((gv, i) => ({ x0: BASE.verseX(own[i]), x1: BASE.verseX(gv) })),
            stars: [BASE.verseX(file.start), BASE.verseX(file.target)],
            bookStarts: BASE.bookStarts,
            ntStart: BASE.ntStart,
            lines: [`Mínimo: ${hops(file.min)}`],
            credit: "Referências cruzadas: OpenBible.info (CC BY)\nBíblia Conectada",
          }}
        />
      )}
    </>
  );
}
