"use client";

// The sky of links at /arcos (design/README.md §1, §1.2, §6, §7, §8). The poster image is the sky in the
// first paint; the WebGL canvas (SkyCanvas, loaded after paint) takes over from it. The selection lives in the URL
// fragment ("#isaias/9"); the readout and the list below are the accessible source of truth.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import type { SkyInitial } from "./initial";
import {
  buildGeometry,
  chapterAt,
  chapterName,
  chapterPath,
  decodeArcs,
  indexByChapter,
  linkedChapters,
  locateChapter,
  parseSelectionHash,
  selectionHash,
  stepChapter,
  type ArcSet,
  type BookRow,
  type ChapterIndex,
  type Geometry,
  type Selection,
  type SkyMeta,
  type TopList,
} from "./model";
import type { Mode } from "./renderer";
import { POSTER } from "./poster";
import styles from "./sky.module.css";

const SkyCanvas = dynamic(() => import("./SkyCanvas"), { ssr: false });

// ---------------------------------------------------------------- external stores (URL fragment, media, <html> flag)

const hashListeners = new Set<() => void>();
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  hashListeners.add(cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    hashListeners.delete(cb);
  };
}
const readHash = () => window.location.hash;
function writeHash(h: string) {
  window.history.replaceState(null, "", h || window.location.pathname + window.location.search);
  hashListeners.forEach((f) => f());
}

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const INTRO_ATTR = "data-sky-intro";
function subscribeIntro(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: [INTRO_ATTR] });
  return () => mo.disconnect();
}
const readIntro = () => document.documentElement.hasAttribute(INTRO_ATTR);
function endIntro() {
  document.documentElement.removeAttribute(INTRO_ATTR);
  try {
    sessionStorage.setItem("sky-intro", "1");
  } catch {}
}

// ---------------------------------------------------------------- data

type Arcs = { set: ArcSet; idx: ChapterIndex };
// background: desktop, after idle; offer/loading/error: the button on phones and with Save-Data
type FullState = "idle" | "background" | "offer" | "loading" | "error" | "done";

async function fetchBin(file: string) {
  const res = await fetch(`/data/${file}`);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return res.arrayBuffer();
}

// ---------------------------------------------------------------- component

type Props = { initial: SkyInitial; title: string; lede: ReactNode };

export function Sky({ initial, title, lede }: Props) {
  const router = useRouter();
  const ids = useId();
  const { books, nch, verse } = initial;

  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const hashCi = useMemo(() => parseSelectionHash(books, hash), [books, hash]);
  const sel: Selection = useMemo(() => (hashCi === null ? { kind: "verse", gv: verse.gv } : { kind: "chapter", ci: hashCi }), [hashCi, verse.gv]);
  const selCi = sel.kind === "verse" ? verse.ci : sel.ci;

  const [preview, setPreview] = useState<{ ci: number; x: number; y: number; frac: number; touch: boolean } | null>(null);
  const previewCi = preview?.ci ?? null;
  const shown: Selection = useMemo(() => (previewCi === null ? sel : { kind: "chapter", ci: previewCi }), [previewCi, sel]);

  const [geo, setGeo] = useState<Geometry | null>(null);
  const [arcs, setArcs] = useState<Arcs | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [full, setFull] = useState<FullState>("idle");
  // "software": no GPU to draw the sky (the poster stays on purpose); "failed": no WebGL2, or the context was lost
  const [mode, setMode] = useState<Mode | "none" | "failed" | "software">("none");
  const [pulseKey, setPulseKey] = useState(0);
  const posterFull = useMedia(POSTER.desktopMedia);
  const intro = useSyncExternalStore(subscribeIntro, readIntro, () => false);
  const geoRef = useRef<Geometry | null>(null);
  const fullFile = useRef("");

  const loadFull = useCallback(async (manual: boolean) => {
    const g = geoRef.current;
    if (!g || !fullFile.current) return;
    setFull(manual ? "loading" : "background");
    try {
      const set = decodeArcs(await fetchBin(fullFile.current), true);
      setArcs({ set, idx: indexByChapter(g, set) });
      setFull("done");
    } catch {
      setFull("error");
    }
  }, []);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch("/data/sky.json");
      if (!res.ok) throw new Error(`sky.json: ${res.status}`);
      const meta = (await res.json()) as SkyMeta;
      const g = buildGeometry(meta);
      geoRef.current = g;
      fullFile.current = meta.files.full.file;
      setGeo(g);
      const head = decodeArcs(await fetchBin(meta.files.head.file), false);
      setArcs((cur) => cur ?? { set: head, idx: indexByChapter(g, head) });
      // phones and Save-Data get the head only, with a button for the rest (design §8)
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const lite = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768 || !!conn?.saveData;
      if (lite) setFull("offer");
      else {
        const go = () => void loadFull(false);
        if ("requestIdleCallback" in window) window.requestIdleCallback(go, { timeout: 2500 });
        else setTimeout(go, 1200);
      }
    } catch {
      setLoadError(true);
    }
  }, [loadFull]);

  useEffect(() => {
    // fetched after the first paint; the poster and the server-rendered list cover the wait
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // The opening plays only from the initial verse, and only if the canvas shows up soon; otherwise the poster's gold
  // layer comes back without animation. Once the canvas is up (it has read the flag and covers the poster), the flag
  // ends, so the opening never plays twice in a session, even when the page comes back from history.
  useEffect(() => {
    if (!intro) return;
    if (hashCi !== null || mode !== "none") {
      endIntro();
      return;
    }
    const t = window.setTimeout(endIntro, 2500);
    return () => window.clearTimeout(t);
  }, [intro, hashCi, mode]);

  const onMode = useCallback((m: Mode) => setMode(m), []);
  const onStart = useCallback(() => setMode((m) => (m === "failed" || m === "software" ? m : "none")), []);
  const onFail = useCallback((why: "software" | "unsupported") => setMode(why === "software" ? "software" : "failed"), []);

  // ------------------------------------------------------------ selection

  const select = useCallback(
    (ci: number | null) => {
      writeHash(ci === null ? "" : selectionHash(books, { kind: "chapter", ci }));
      setPulseKey((k) => k + 1);
    },
    [books],
  );

  const pairsOf = (ci: number) => (geo ? geo.chapterPairs[ci] : null);
  const describe = (s: Selection) => {
    if (s.kind === "verse") return { name: verse.ref, links: verse.links, path: verse.path };
    return { name: chapterName(books, s.ci), links: pairsOf(s.ci), path: chapterPath(books, s.ci) };
  };
  const cur = describe(sel);
  const linksText = (n: number | null) => (n === null ? "" : `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`);
  const curText = `${cur.name}${cur.links === null ? "" : ` · ${linksText(cur.links)}`}`;
  const canvasLabel = `Céu de ligações: ${cur.name} selecionado${cur.links === null ? "" : `, ${linksText(cur.links)}`}; lista abaixo.`;

  // ------------------------------------------------------------ gestures

  const dragging = useRef(false);
  const pointToPreview = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - box.left) / box.width, 0), 0.999999);
    return { ci: chapterAt(nch, x), x: e.clientX - box.left, y: e.clientY - box.top, frac: x, touch: e.pointerType !== "mouse" };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setPreview(pointToPreview(e));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current || e.pointerType === "mouse") setPreview(pointToPreview(e));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    const p = pointToPreview(e);
    select(p.ci);
    setPreview(e.pointerType === "mouse" ? p : null);
  };
  const onPointerCancel = () => {
    dragging.current = false;
    setPreview(null);
  };
  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current && e.pointerType === "mouse") setPreview(null);
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = (d: number, byBook: boolean) => select(stepChapter(books, nch, selCi, d, byBook));
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        step(-1, e.shiftKey);
        break;
      case "ArrowRight":
      case "ArrowUp":
        step(1, e.shiftKey);
        break;
      case "PageUp":
        step(-1, true);
        break;
      case "PageDown":
        step(1, true);
        break;
      case "Home":
        select(0);
        break;
      case "End":
        select(nch - 1);
        break;
      case "Enter":
        router.push(cur.path);
        break;
      case "Escape":
        if (sel.kind === "verse") return;
        select(null);
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  // ------------------------------------------------------------ list

  const list: TopList | null = useMemo(
    () => (sel.kind === "verse" ? initial.verseList : geo && arcs ? linkedChapters(geo, arcs.set, arcs.idx, sel.ci) : null),
    [sel, initial.verseList, geo, arcs],
  );
  const headOnly = sel.kind === "chapter" && !!arcs && !arcs.set.full;

  // ------------------------------------------------------------ render

  const canvasOn = mode === "overlay" || mode === "opaque";
  const goldPoster = sel.kind === "verse" && preview === null;
  // the canvas draws its own sky only from an arc set at least as complete as the poster on screen
  const dome = arcs && (arcs.set.full || !posterFull) ? arcs.set : null;
  const label = preview ? describe({ kind: "chapter", ci: preview.ci }) : null;

  return (
    <div className={styles.root}>
      <section className={styles.hero} aria-labelledby={`${ids}-h`}>
        <div className={styles.heading}>
          <h1 id={`${ids}-h`} className="bc-display">
            {title}
          </h1>
          <p className="bc-lede">{lede}</p>
        </div>

        <div className={styles.stage}>
          {/* the one window of full night colour (design §1.2): framed in the page column, the same in both themes */}
          <div className={`bc-window ${styles.band}`} data-canvas={canvasOn ? mode : "none"} data-gold={goldPoster ? "on" : "off"}>
            <picture className={styles.poster}>
              <source type="image/avif" media={POSTER.desktopMedia} srcSet={POSTER.full.avif} width={POSTER.full.w} height={POSTER.full.h} />
              <source type="image/webp" media={POSTER.desktopMedia} srcSet={POSTER.full.webp} width={POSTER.full.w} height={POSTER.full.h} />
              <source type="image/avif" srcSet={POSTER.head.avif} width={POSTER.head.w} height={POSTER.head.h} />
              <img
                src={POSTER.head.webp}
                width={POSTER.head.w}
                height={POSTER.head.h}
                alt={canvasOn ? "" : canvasLabel}
                fetchPriority="high"
                decoding="async"
              />
            </picture>
            <picture className={styles.posterGold}>
              <source type="image/avif" media={POSTER.desktopMedia} srcSet={POSTER.fullGold.avif} />
              <source type="image/webp" media={POSTER.desktopMedia} srcSet={POSTER.fullGold.webp} />
              <source type="image/avif" srcSet={POSTER.headGold.avif} />
              <img src={POSTER.headGold.webp} width={POSTER.head.w} height={POSTER.head.h} alt="" decoding="async" />
            </picture>
            {geo && mode !== "failed" && mode !== "software" ? (
              <SkyCanvas
                geo={geo}
                partners={initial.partners}
                shown={shown}
                arcs={arcs}
                dome={dome}
                pulseKey={pulseKey}
                intro={intro && hashCi === null}
                label={canvasLabel}
                active={canvasOn}
                onStart={onStart}
                onMode={onMode}
                onFail={onFail}
              />
            ) : null}
            <div
              className={styles.scrub}
              role="slider"
              tabIndex={0}
              aria-label="Capítulo no céu de ligações"
              aria-valuemin={1}
              aria-valuemax={nch}
              aria-valuenow={selCi + 1}
              aria-valuetext={curText}
              aria-describedby={`${ids}-kbd`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onPointerLeave={onPointerLeave}
              onKeyDown={onKeyDown}
            />
            {preview && label ? (
              <p
                className={styles.scrubLabel}
                aria-hidden="true"
                style={{
                  left: `${preview.x}px`,
                  top: `${Math.max(0, preview.y - (preview.touch ? 96 : 72))}px`,
                  // anchored at the pointer: its left edge at Gênesis, its centre mid-band, its right edge at Apocalipse
                  transform: `translateX(-${(preview.frac * 100).toFixed(2)}%)`,
                }}
              >
                <span className={styles.scrubName}>{label.name}</span>
                {label.links === null ? null : <span className={styles.scrubCount}>{linksText(label.links)}</span>}
              </p>
            ) : null}
          </div>
          <p className={styles.ends} aria-hidden="true">
            <span>Gênesis</span>
            <span>Apocalipse</span>
          </p>
        </div>

        <div className={styles.panel}>
          <p className={styles.readout} role="status">
            <Link href={cur.path} className={styles.readoutLink}>
              <span className={styles.readoutName}>{cur.name}</span>
              {cur.links === null ? null : <span className={styles.readoutSep}> · </span>}
              <span className={styles.readoutCount}>
                {cur.links === null ? null : linksText(cur.links)}
                <Icon name="out" className={`bc-icon ${styles.arrow}`} />
              </span>
            </Link>
          </p>
          <Picker books={books} nch={nch} ci={selCi} onPick={select} />
          {sel.kind === "chapter" ? (
            <button type="button" className={`bc-button bc-button--ghost ${styles.back}`} onClick={() => select(null)}>
              <Icon name="chev-l" />
              Voltar a {verse.ref}
            </button>
          ) : null}
          <p className={styles.hint}>
            <span className={styles.hintTouch}>Arraste pela faixa para escolher um capítulo.</span>
            <span className={styles.hintMouse}>Passe o mouse pela faixa para ver um capítulo e clique para fixar.</span>
          </p>
          <p id={`${ids}-kbd`} className="visually-hidden">
            Setas mudam o capítulo; Shift e setas, o livro. Enter abre a seleção; Esc volta a {verse.ref}.
          </p>
          {full === "offer" || full === "error" ? (
            <button type="button" className="bc-button bc-button--secondary" onClick={() => void loadFull(true)}>
              {full === "error" ? "Tentar de novo: céu completo" : `Carregar o céu completo (${formatInt(initial.arcs)} arcos)`}
            </button>
          ) : null}
          {full === "loading" ? <p className={styles.hint}>Carregando o céu completo…</p> : null}
          {mode === "failed" ? (
            <p className={styles.hint}>O céu interativo não abriu neste navegador; a imagem e a lista mostram as mesmas ligações.</p>
          ) : null}
          {mode === "software" ? (
            <p className={styles.hint}>Sem aceleração gráfica neste aparelho, o céu fica na imagem; ela e a lista mostram as mesmas ligações.</p>
          ) : null}
          {loadError ? (
            <>
              <p className={styles.hint}>Não deu para carregar as ligações.</p>
              <button type="button" className="bc-button bc-button--secondary" onClick={() => void load()}>
                Tentar de novo
              </button>
            </>
          ) : null}
        </div>
      </section>

      <section className={styles.listSection} aria-labelledby={`${ids}-list`}>
        <h2 id={`${ids}-list`} className={`bc-title ${styles.listTitle}`}>
          Mais ligados a {cur.name}
        </h2>
        {list ? (
          <LinkedList books={books} list={list} />
        ) : (
          <p className={styles.note}>{loadError ? "A lista precisa das ligações, que não carregaram." : "Carregando as ligações…"}</p>
        )}
        {headOnly ? (
          <p className={styles.note}>
            Contando só os {formatInt(initial.head.count)} pares mais votados ({formatInt(initial.head.minVotes)} votos ou mais);
            o céu completo tem {formatInt(initial.arcs)}.
          </p>
        ) : null}
        <p className={styles.note}>
          &ldquo;Ligações&rdquo; são os outros versículos que a base OpenBible.info relaciona a um versículo, contados uma vez
          cada, com qualquer número de votos; quando a referência aponta um trecho (como Mt 5:3–12), conta o primeiro
          versículo. Num capítulo, contam os pares de versículos que tocam nele; na lista, os pares entre os dois capítulos.
        </p>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- book -> chapter picker

const Picker = memo(function Picker({ books, nch, ci, onPick }: { books: BookRow[]; nch: number; ci: number; onPick: (ci: number) => void }) {
  const id = useId();
  const [b, n] = locateChapter(books, ci);
  const book = books[b];
  return (
    <div className={styles.picker}>
      <button
        type="button"
        className={`bc-icon-button ${styles.step}`}
        aria-label="Capítulo anterior"
        disabled={ci === 0}
        onClick={() => onPick(stepChapter(books, nch, ci, -1, false))}
      >
        <Icon name="chev-l" />
      </button>
      <label className="visually-hidden" htmlFor={`${id}-b`}>
        Livro
      </label>
      <span className={styles.selectBox}>
        <select id={`${id}-b`} className={styles.select} value={b} onChange={(e) => onPick(books[Number(e.target.value)][3])}>
          {(["AT", "NT"] as const).map((t) => (
            <optgroup key={t} label={t === "AT" ? "Antigo Testamento" : "Novo Testamento"}>
              {books.map((row, i) =>
                row[4] === t ? (
                  <option key={row[1]} value={i}>
                    {row[0]}
                  </option>
                ) : null,
              )}
            </optgroup>
          ))}
        </select>
        <Icon name="chev-r" className={`bc-icon ${styles.selectChevron}`} />
      </span>
      <label className="visually-hidden" htmlFor={`${id}-c`}>
        Capítulo
      </label>
      <span className={`${styles.selectBox} ${styles.selectChapter}`}>
        <select id={`${id}-c`} className={styles.select} value={n} onChange={(e) => onPick(book[3] + Number(e.target.value) - 1)}>
          {Array.from({ length: book[2] }, (_, k) => (
            <option key={k} value={k + 1}>
              {k + 1}
            </option>
          ))}
        </select>
        <Icon name="chev-r" className={`bc-icon ${styles.selectChevron}`} />
      </span>
      <button
        type="button"
        className={`bc-icon-button ${styles.step}`}
        aria-label="Próximo capítulo"
        disabled={ci === nch - 1}
        onClick={() => onPick(stepChapter(books, nch, ci, 1, false))}
      >
        <Icon name="chev-r" />
      </button>
    </div>
  );
});

const LinkedList = memo(function LinkedList({ books, list }: { books: BookRow[]; list: TopList }) {
  if (list.items.length === 0) return null;
  const last = list.items[list.items.length - 1].count;
  return (
    <>
      <ol className={`bc-list ${styles.list}`} role="list">
        {list.items.map(({ ci, count }) => (
          <li key={ci}>
            <Link href={chapterPath(books, ci)}>
              <span className="bc-list__name">{chapterName(books, ci)}</span>
              <span className="visually-hidden">: </span>
              <span className="bc-list__meta">
                {formatInt(count)} {count === 1 ? "ligação" : "ligações"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {list.tiedBeyond > 0 ? (
        <p className={styles.note}>
          {list.tiedBeyond === 1 ? "Outro capítulo também tem" : `Outros ${formatInt(list.tiedBeyond)} capítulos também têm`}{" "}
          {formatInt(last)} {last === 1 ? "ligação" : "ligações"}.
        </p>
      ) : null}
    </>
  );
});
