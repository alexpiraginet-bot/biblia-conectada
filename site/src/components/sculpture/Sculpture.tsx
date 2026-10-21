"use client";

// The light sculpture at /arcos (design/README.md §15): every verse pair of the OpenBible.info cross references as a
// thread of light over the Bible, in 3D. The canvas is the picture; the panel beside it (a sheet on phones) is the
// accessible source of truth: the verse, its text, its links and where each one leads.
//
// The selection lives in the URL fragment ("#isaias/53/5" a verse, "#isaias/53" a chapter), so a link can open the
// sculpture on a verse and the browser keeps it on reload. The engine (engine.ts) owns frames and the pointer; this
// component owns what is selected. Data that changes rarely (the axis, the arcs) is state; refs only reach the engine
// and the DOM from effects and handlers.
import Link from "next/link";
import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { VerseStudyLink } from "@/components/assistant/VerseStudyLink";
import { usePageSearch } from "@/components/search/page-search";
import { formatInt } from "@/lib/canon/text";
import { BASE, BOOKS } from "@/lib/community/books-client";
import { loadVerseLinks } from "@/lib/community/fetchers";
import { longRef, shortRef, versePath } from "@/lib/community/geometry";
import { conexaoPath } from "@/lib/conexao";
import { buildGeometry, decodeArcs, indexByChapter, type ArcSet, type SkyMeta } from "../sky/model";
import {
  arcBuffers,
  axisLines,
  chapterAxis,
  chapterHighlights,
  chapterLinks,
  focusFlags,
  litLinks,
  litPath,
  litVerse,
  litWord,
  newTestament,
  pairAngle,
  partnersFromLinks,
  partnersOf,
  pathFlags,
  verseAxis,
  wordLinks,
  wordMarks,
  type Hop,
  type Partner,
} from "./arcs";
import type { SculptureEngine } from "./engine";
import { groupNames, type AxisGroup } from "./groups";
import { HOME_ORBIT, homeBox, NARROW, TOP } from "./home";
import type { Graph } from "./path";
import { SCULPTURE_POSTER } from "./poster";
import type { ColorMode, Theme } from "./renderer";
import { arcSamples, axisX, fitOrbit, project, viewMatrix, type Box, type Mat4, type Orbit, type Vec3 } from "./space";
import {
  chapterLabel,
  hashOf,
  ligacoes,
  PAGE,
  parseHash,
  readHash,
  subscribeHash,
  verseText,
  versiculos,
  votos,
  writeHash,
  type Data,
  type Filter,
  type Loaded,
  type Sel,
} from "./state";
import type { WordResult } from "./word";
import styles from "./sculpture.module.css";

// Selection panels load when one is opened (the page's own script stays within its budget; they are
// never on the server's page: a selection lives in the address's fragment)
const VersePanel = lazy(() => import("./Panel").then((m) => ({ default: m.VersePanel })));
const ChapterPanel = lazy(() => import("./Panel").then((m) => ({ default: m.ChapterPanel })));
const PathPanel = lazy(() => import("./PathPanel").then((m) => ({ default: m.PathPanel })));
const WordPanel = lazy(() => import("./WordPanel").then((m) => ({ default: m.WordPanel })));
const SculptureControls = lazy(() => import("./SculptureControls").then((m) => ({ default: m.SculptureControls })));

export type SculptureInitial = {
  counts: { verses: number; crossrefRows: number; arcs: number; chapters: number };
  /** the most linked verse (summary.topVerses[0]) */
  top: { ref: string; links: number };
  /** verses the intro offers, with their place in the Bible */
  examples: { gv: number; label: string }[];
  /** what the intro offers to try: a path between two verses and a word */
  pathExample: { from: number; to: number; label: string };
  wordExample: string;
  /** the stretches of the eight book groups along the axis (groups.ts) */
  groups: AxisGroup[];
  /** arcs with at least `min` votes (summary.json strength) */
  strength: { min: number; arcs: number }[];
  /** the exact credit lines of the links and of the text (credits.json), for the saved image */
  credits: string[];
};

/** the view a selection opens on: a little from the left and above, so the bridges and the inner links both show */
const SELECT_VIEW: Orbit = { yaw: -0.38, pitch: 0.2, dist: 2, target: [0, 0, 0] };
const DANIEL_NINE = BOOKS.find((book) => book.slug === "daniel")!.firstChapter + 8;
/** the chapter preview shows its strongest links only (the panel lists all of them) */
const PREVIEW_LINKS = 80;
/** a word lights at most this many of the links between its verses, the most voted (the panel counts them all) */
const WORD_LIT = 3000;
/** a word's most linked verses get a label on the axis */
const WORD_LABELS = 5;
/** chapters on the axis */
const NCH = BOOKS[BOOKS.length - 1].firstChapter + BOOKS[BOOKS.length - 1].verses.length;
/** every book's stretch of the axis: its name shows when the camera is near enough for the name to fit in it */
const BOOK_SPANS = BOOKS.map((b) => ({ name: b.name, first: b.firstChapter, x0: axisX(b.firstChapter / NCH), x1: axisX((b.firstChapter + b.verses.length) / NCH) }));
/** the first and the last of a list, then the rest: the names placed first are the ones never left out */
const endsFirst = <T,>(xs: readonly T[]): T[] => (xs.length < 3 ? [...xs] : [xs[0], xs[xs.length - 1], ...xs.slice(1, -1)]);
// The poster images (poster.ts) as CSS backgrounds: sculpture.module.css picks the theme's and the size's, so only that
// one is downloaded, and the right one shows before any script runs.
const imageSet = (img: { avif: string; webp: string }) => `image-set(url("${img.avif}") type("image/avif"), url("${img.webp}") type("image/webp"))`;
const POSTER_STYLE = {
  "--poster-phone-noite": imageSet(SCULPTURE_POSTER.phone.noite),
  "--poster-phone-dia": imageSet(SCULPTURE_POSTER.phone.dia),
  "--poster-wide-noite": imageSet(SCULPTURE_POSTER.wide.noite),
  "--poster-wide-dia": imageSet(SCULPTURE_POSTER.wide.dia),
} as React.CSSProperties;

// ---------------------------------------------------------------- external stores

function readTheme(): Theme {
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "dia" || t === "noite") return t;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "dia" : "noite";
}
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  mq.addEventListener("change", cb);
  return () => {
    mo.disconnect();
    mq.removeEventListener("change", cb);
  };
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

/** Phones, small windows and Save-Data start with the 20,000 most voted arcs and offer the rest (design §8). */
function lightDevice() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < NARROW || !!conn?.saveData;
}

async function fetchBin(file: string) {
  const res = await fetch(`/data/${file}`);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  return res.arrayBuffer();
}

// ---------------------------------------------------------------- the component

export function Sculpture({ initial }: { initial: SculptureInitial }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLFormElement>(null);
  // the panel's heading takes the focus when a selection opens; the panels of a path and of a word load on their own, so
  // a heading that is not there yet takes it when it arrives
  const headingEl = useRef<HTMLHeadingElement | null>(null);
  const wantFocus = useRef(false);
  const headingRef = useCallback((el: HTMLHeadingElement | null) => {
    headingEl.current = el;
    if (el && wantFocus.current) {
      wantFocus.current = false;
      el.focus({ preventScroll: true });
    }
  }, []);
  const engine = useRef<SculptureEngine | null>(null);
  const ids = useId();

  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "noite" as Theme);
  const phone = useMedia("(max-width: 47.99rem)");
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const sel = useMemo(() => parseHash(hash), [hash]);

  // "poster": no canvas on this device (no WebGL2, or drawn by the CPU); "error": the arcs did not load
  const [ready, setReady] = useState<"loading" | "live" | "poster" | "error">("loading");
  // the canvas has taken over from the poster (it drew the same picture, or the person reached for it)
  const [handover, setHandover] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [arcs, setArcs] = useState<Loaded | null>(null);
  const [full, setFull] = useState<"auto" | "offer" | "loading" | "error" | "done">("auto");
  const [mode, setMode] = useState<ColorMode>("livros");
  const [lightsPaused, setLightsPaused] = useState(false);
  const [focus, setFocus] = useState(-1);
  const [filter, setFilter] = useState<Filter>("todas");
  const [shown, setShown] = useState(PAGE);
  const [trail, setTrail] = useState<number[]>([]);
  // what the pointer rests on; `flip`: the tip opens to the pointer's left (it would run past the picture's box)
  const [hover, setHover] = useState<{ x: number; at: { x: number; y: number }; flip: boolean } | null>(null);
  const [arcTip, setArcTip] = useState<{ i: number; at: { x: number; y: number }; flip: boolean } | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [queryError, setQueryError] = useState("");
  const [copied, setCopied] = useState(false);
  const [sheetFull, setSheetFull] = useState(false);
  const [fetched, setFetched] = useState<{ gv: number; list: Partner[] } | null>(null);
  const [verseBody, setVerseBody] = useState<{ gv: number; text: string } | null>(null);
  const [snippets, setSnippets] = useState<ReadonlyMap<number, string>>(new Map());
  // 0: every arc; 1..3: only the arcs with initial.strength[step - 1].min votes or more
  const [strength, setStrength] = useState(0);
  const [allChapterThreads, setAllChapterThreads] = useState(false);
  const [viewportRevision, setViewportRevision] = useState(0);
  const framing = useRef<{ points: Vec3[]; box: Box } | null>(null);
  // the answer for a path or a word in the address (key: its address), or the error of the last try
  const [pathFound, setPathFound] = useState<{ key: string; hops: Hop[] | null } | { key: string; error: true } | null>(null);
  const [wordFound, setWordFound] = useState<{ key: string; result: WordResult | null } | { key: string; error: true } | null>(null);
  const [saving, setSaving] = useState<"idle" | "busy" | "saved" | "shared" | "error">("idle");
  // a new try after the network failed a path or a word
  const [retry, setRetry] = useState(0);

  // one search in view: the top bar's entry steps aside while this field shows (page-search.ts)
  usePageSearch(fieldRef);

  // ---- choosing: the address is the selection; the trail keeps the verses followed
  const choose = useCallback((next: Sel, follow = true) => {
    setFocus(-1);
    setFilter("todas");
    setShown(PAGE);
    setSheetFull(false);
    setAllChapterThreads(false);
    setHandover(true);
    // a chapter previewed under a resting pointer would cover the new selection's light until the pointer moved
    setHover(null);
    setArcTip(null);
    writeHash(next);
    if (!next) setTrail([]);
    else if (next.kind === "verse" && follow) setTrail((t) => (t[t.length - 1] === next.gv ? t : [...t, next.gv].slice(-12)));
  }, []);

  // Accept a human-readable reference in shared URLs as well as our canonical hash.
  useEffect(() => {
    if (window.location.hash) return;
    const reference = new URLSearchParams(window.location.search).get("v");
    if (!reference || reference.length > 160) return;
    let active = true;
    void import("./query").then(({ readQuery }) => {
      if (!active || window.location.hash) return;
      const result = readQuery(reference);
      if ("sel" in result) choose(result.sel);
    });
    return () => { active = false; };
  }, [choose]);

  // ---- what the engine calls back (kept current without re-creating the engine)
  const latest = useRef<{ data: Data | null; labels: { gv: number }[]; pickChapter: (x: number) => void; pickArc: (i: number) => void; arcsIn: boolean; theme: Theme; strength: number }>({
    data,
    labels: [],
    pickChapter: () => {},
    pickArc: () => {},
    arcsIn: false,
    theme,
    strength: 0,
  });
  // every pair (arcs.bin) for the paths, fetched once on a device that draws only the most voted, and the links
  // graph built from them (path.ts)
  const fullSet = useRef<Promise<ArcSet> | null>(null);
  const graph = useRef<{ set: ArcSet; g: Graph } | null>(null);
  // set when the engine has been given arcs as complete as the poster on screen: its next frame replaces the poster
  const posterArmed = useRef(false);
  /** the person reached for the picture (pointer on the axis, a drag, the keyboard): the canvas shows from now on */
  const reach = useCallback(() => {
    if (latest.current.arcsIn) setHandover(true);
  }, []);

  // ---- the engine and the data, once. The WebGL code (engine.ts, renderer.ts, shaders.ts) loads after the first paint,
  // beside sky.json: the poster covers the wait. The engine exists before the data reaches the state, so every effect
  // that hands the data to it finds it.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let e: SculptureEngine | null = null;
    let live = false;
    const start = import("./engine").then(({ SculptureEngine }) => {
      if (!alive) return;
      const made = SculptureEngine.create(canvas, {
        hover: (x, at) => {
          setHover(x === null || !at ? null : { x, at, flip: tipFlips(engine.current, at) });
          if (x !== null) reach();
        },
        hoverArc: (i, at) => setArcTip(i < 0 || !at ? null : { i, at, flip: tipFlips(engine.current, at) }),
        pickArc: (i) => latest.current.pickArc(i),
        pick: (x) => latest.current.pickChapter(x),
        miss: () => setFocus(-1),
        frame: (m, w, h, box) => {
          placeLabels(labelsRef.current, latest.current.data, m, w, h, box);
          if (posterArmed.current) {
            posterArmed.current = false;
            setHandover(true);
          }
        },
        lost: (lost) => setReady(lost ? "poster" : "live"),
      });
      // the test scripts draw on a CPU renderer and set this flag to see the picture anyway
      const allowSoftware = (window as Window & { __SCULPTURE_ALLOW_SOFTWARE__?: boolean }).__SCULPTURE_ALLOW_SOFTWARE__ === true;
      live = !!made && (!made.software || allowSoftware);
      if (made && live) {
        e = made;
        engine.current = made;
        made.setTheme(latest.current.theme);
        made.setStrength(latest.current.strength);
        // stand at the opening view at once: it is the poster's picture, and a selection in the address flies from it
        made.jumpTo({ orbit: HOME_ORBIT, box: homeBox(made.size.width, made.size.height) });
        if (allowSoftware) (window as Window & { __sculpture?: SculptureEngine }).__sculpture = made;
      } else {
        // no WebGL2, or a CPU-drawn context: the poster stays and every list keeps working
        made?.destroy();
      }
    });
    (async () => {
      const [res] = await Promise.all([fetch("/data/sky.json"), start]);
      if (!res.ok) throw new Error(`sky.json: ${res.status}`);
      const meta = (await res.json()) as SkyMeta;
      const geo = buildGeometry(meta);
      if (!alive) return;
      setData({ meta, geo, nt: newTestament(meta, geo) });
      const head = decodeArcs(await fetchBin(meta.files.head.file), false);
      if (!alive) return;
      setArcs({ set: head, idx: indexByChapter(geo, head) });
      setReady(live ? "live" : "poster");
      if (lightDevice()) {
        setFull("offer");
        return;
      }
      try {
        const all = decodeArcs(await fetchBin(meta.files.full.file), true);
        if (!alive) return;
        setArcs({ set: all, idx: indexByChapter(geo, all) });
        setFull("done");
      } catch {
        // the 20,000 most voted stay; the intro offers the rest again
        if (alive) setFull("error");
      }
    })().catch(() => alive && setReady((r) => (r === "loading" ? "error" : r)));
    return () => {
      alive = false;
      e?.destroy();
      engine.current = null;
    };
  }, [reach]);

  async function loadFull() {
    if (!data) return;
    setFull("loading");
    try {
      const all = decodeArcs(await fetchBin(data.meta.files.full.file), true);
      setArcs({ set: all, idx: indexByChapter(data.geo, all) });
      setFull("done");
    } catch {
      setFull("error");
    }
  }

  // ---- the arcs, the axis, the theme, the colour mode and the strength step go to the engine
  const groups = initial.groups;
  useEffect(() => {
    const e = engine.current;
    if (!e || !data) return;
    e.setLines(axisLines(data.meta, data.geo, groups));
    e.setChapters(data.geo.nch);
  }, [data, groups]);
  useEffect(() => {
    engine.current?.setStrength(strength);
  }, [strength]);
  useEffect(() => {
    const e = engine.current;
    if (!e || !data || !arcs) return;
    e.setArcs(arcBuffers(data.geo, arcs.set, data.nt, theme, mode));
    // the poster from 48rem shows every pair, the phone's the 20,000 most voted: the canvas replaces it once it has
    // drawn as much (or when the person reaches for it, see reach)
    if (arcs.set.full || !window.matchMedia(SCULPTURE_POSTER.media).matches) posterArmed.current = true;
  }, [data, arcs, theme, mode]);
  useEffect(() => {
    engine.current?.setTheme(theme);
  }, [theme]);
  useEffect(() => {
    engine.current?.setMotionPaused(lightsPaused);
  }, [lightsPaused, ready]);
  // light devices draw only the most voted arcs while the camera moves
  useEffect(() => {
    if (full === "done") engine.current?.setMovingCap(lightDevice() ? 30000 : 100000);
  }, [full]);

  // ---- the partners of a verse: from the full arc file when it is in, else from its chapter's links file
  const verse = sel?.kind === "verse" ? sel.gv : null;
  useEffect(() => {
    if (verse === null || arcs?.set.full) return;
    let alive = true;
    const { book, chapter, verse: v } = BASE.locate(verse);
    loadVerseLinks(book.slug, chapter)
      .then((links) => alive && setFetched({ gv: verse, list: partnersFromLinks(links[v - 1] ?? []) }))
      .catch(() => alive && setFetched({ gv: verse, list: [] }));
    return () => {
      alive = false;
    };
  }, [verse, arcs]);
  const partners = useMemo<Partner[] | null>(() => {
    if (verse === null) return null;
    if (arcs?.set.full) return partnersOf(arcs.set, verse);
    return fetched?.gv === verse ? fetched.list : null;
  }, [verse, arcs, fetched]);

  // ---- a path: the shortest chain of links between two verses, over every pair (path.ts, loaded when asked for)
  const pathFrom = sel?.kind === "path" ? sel.from : null;
  const pathTo = sel?.kind === "path" ? sel.to : null;
  const pathKey = pathFrom !== null && pathTo !== null ? hashOf({ kind: "path", from: pathFrom, to: pathTo }) : null;
  useEffect(() => {
    if (pathFrom === null || pathTo === null || !pathKey || !data) return;
    let alive = true;
    (async () => {
      const every = arcs?.set.full ? arcs.set : await (fullSet.current ??= fetchBin(data.meta.files.full.file).then((b) => decodeArcs(b, true)));
      const { buildGraph, findPath } = await import("./path");
      if (graph.current?.set !== every) graph.current = { set: every, g: buildGraph(every, data.geo.nverses) };
      const found = findPath(graph.current.g, pathFrom, pathTo);
      if (alive) setPathFound({ key: pathKey, hops: found });
    })().catch(() => {
      fullSet.current = null;
      if (alive) setPathFound({ key: pathKey, error: true });
    });
    return () => {
      alive = false;
    };
  }, [pathKey, pathFrom, pathTo, data, arcs, retry]);
  const hops = pathFound && pathKey && pathFound.key === pathKey && !("error" in pathFound) ? pathFound.hops : undefined;
  const pathError = !!pathFound && pathFound.key === pathKey && "error" in pathFound;

  // ---- a word: the verses of the BLIVRE that have it (word.ts, the site's word index), and the links between them
  const wordKey = sel?.kind === "word" ? sel.q : null;
  useEffect(() => {
    if (!wordKey) return;
    let alive = true;
    import("./word")
      .then((w) => w.versesOfWord(wordKey))
      .then((result) => alive && setWordFound({ key: wordKey, result }))
      .catch(() => alive && setWordFound({ key: wordKey, error: true }));
    return () => {
      alive = false;
    };
  }, [wordKey, retry]);
  const wordResult = wordFound && wordKey && wordFound.key === wordKey && !("error" in wordFound) ? wordFound.result : undefined;
  const wordError = !!wordFound && wordFound.key === wordKey && "error" in wordFound;
  const wordLit = useMemo(() => {
    if (!wordResult || !data || !arcs) return null;
    const has = new Uint8Array(data.geo.nverses);
    for (const gv of wordResult.verses) has[gv] = 1;
    return { links: wordLinks(arcs.set, has), full: arcs.set.full };
  }, [wordResult, data, arcs]);

  // ---- a chapter's links (the chapter panel, and the preview under the pointer)
  const chapterCi = sel?.kind === "chapter" ? sel.ci : null;
  const chapterList = useMemo(() => (chapterCi !== null && data && arcs ? chapterLinks(data.geo, arcs.set, arcs.idx, chapterCi) : null), [chapterCi, data, arcs]);
  const chapterFeatured = useMemo(() => data && chapterList ? chapterHighlights(data.geo, chapterList) : [], [data, chapterList]);
  const chapterScene = allChapterThreads ? chapterList : chapterFeatured;
  const hoverCi = hover && data ? Math.min(data.geo.nch - 1, Math.max(0, Math.floor(((hover.x + 1) / 2) * data.geo.nch))) : null;
  const preview = useMemo(() => (hoverCi !== null && data && arcs ? { ci: hoverCi, list: chapterLinks(data.geo, arcs.set, arcs.idx, hoverCi), full: arcs.set.full } : null), [hoverCi, data, arcs]);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    if (!preview || !data) e.setPreview(null);
    else e.setPreview(litLinks(data.geo, data.nt, preview.list.slice(0, PREVIEW_LINKS), chapterAxis(data.geo, preview.ci)));
  }, [preview, data]);

  // ---- the panel's list: filtered by testament, shown 20 at a time
  const counts = useMemo(() => {
    if (!partners || !data) return { todas: 0, antigo: 0, novo: 0 };
    const novo = partners.filter((p) => data.nt[p.gv] === 1).length;
    return { todas: partners.length, antigo: partners.length - novo, novo };
  }, [partners, data]);
  const listed = useMemo(() => {
    if (!partners) return [];
    const all = partners.map((p, i) => ({ ...p, i }));
    if (filter === "todas" || !data) return all;
    return all.filter((p) => (data.nt[p.gv] === 1) === (filter === "novo"));
  }, [partners, filter, data]);

  // ---- light the selection and fly to it (only when the selection itself changes)
  const flown = useRef("");
  useEffect(() => {
    const e = engine.current;
    if (!e || !data) return;
    const key = `${hashOf(sel)}${sel?.kind === "chapter" ? `:${allChapterThreads ? "all" : "featured"}:${arcs?.set.full ? "full" : "head"}` : ""}`;
    const fresh = key !== flown.current;
    // a word's verses glow as marks on the axis; any other selection has none
    e.setMarks(sel?.kind === "word" && wordResult ? wordMarks(data.geo, wordResult.verses) : null);
    if (!sel) {
      framing.current = null;
      e.setLit(null);
      if (fresh) e.flyTo({ orbit: HOME_ORBIT, box: homeBox(e.size.width, e.size.height) });
      flown.current = key;
      return;
    }
    const points: Vec3[] = [];
    let lit;
    // a path's hops grow one after the other; a word's links show at once; the rest of the sculpture recedes more
    // behind a word's many links than behind one verse's
    let growMs = 1100;
    let grow = fresh;
    let recede = 0.045;
    if (sel.kind === "path") {
      if (!hops) {
        e.setLit(null);
        return;
      }
      lit = litPath(data.geo, data.nt, hops);
      growMs = Math.min(Math.max(hops.length * 650, 1100), 3600);
      for (const h of hops) points.push(...arcSamples(verseAxis(data.geo, h.from), verseAxis(data.geo, h.to), pairAngle(data.geo, data.nt, h.from, h.to), 4));
      points.push([verseAxis(data.geo, sel.from), 0, 0], [verseAxis(data.geo, sel.to), 0, 0]);
    } else if (sel.kind === "word") {
      if (!wordResult || !wordLit) {
        e.setLit(null);
        return;
      }
      lit = litWord(data.geo, data.nt, wordLit.links, WORD_LIT);
      grow = false;
      recede = 0.035;
      const xs = Array.from(wordResult.verses, (gv) => verseAxis(data.geo, gv));
      if (xs.length) points.push([Math.min(...xs), 0, 0], [Math.max(...xs), 0, 0]);
      wordLit.links.slice(0, 400).forEach((l, i) => {
        if (i % 4 === 0) points.push(...arcSamples(verseAxis(data.geo, l.a), verseAxis(data.geo, l.b), pairAngle(data.geo, data.nt, l.a, l.b), 3));
      });
      // no verse has the word: the whole Bible, beside the panel
      if (points.length === 0) points.push([-1, 0, 0], [1, 0, 0]);
    } else if (sel.kind === "verse") {
      if (!partners) return;
      // the filter keeps only its arcs lit; the list's indices stay those of every partner
      const shownPartners = filter === "todas" ? partners : partners.filter((p) => (data.nt[p.gv] === 1) === (filter === "novo"));
      lit = litVerse(data.geo, data.nt, sel.gv, shownPartners, -1);
      const x = verseAxis(data.geo, sel.gv);
      points.push([x, 0, 0]);
      for (const p of shownPartners) points.push(...arcSamples(x, verseAxis(data.geo, p.gv), pairAngle(data.geo, data.nt, sel.gv, p.gv), 4));
    } else {
      if (!chapterList || !chapterScene) return;
      lit = litLinks(data.geo, data.nt, chapterScene, chapterAxis(data.geo, sel.ci));
      chapterScene.forEach((l) => {
        points.push(...arcSamples(verseAxis(data.geo, l.here), verseAxis(data.geo, l.there), pairAngle(data.geo, data.nt, l.here, l.there), 4));
      });
      points.push([chapterAxis(data.geo, sel.ci), 0, 0]);
    }
    e.setLit(lit, grow, growMs, recede);
    if (fresh) {
      const { width, height } = e.size;
      const top = phone ? TOP + 48 : TOP + 16;
      // what the panel (or the sheet) leaves free
      const box: Box = phone
        ? { x: 12, y: top, w: width - 24, h: Math.max(height * 0.53 - top - 48, 110) }
        : { x: 28, y: top, w: Math.max(width - Math.min(400, width * 0.38) - 76, 200), h: height - top - 106 };
      framing.current = { points, box };
      e.flyTo({ orbit: fitOrbit(points, SELECT_VIEW, box.w / box.h, 0.09), box });
      flown.current = key;
    }
  }, [sel, partners, chapterList, chapterScene, allChapterThreads, filter, data, arcs, phone, hops, wordResult, wordLit, viewportRevision]);

  // ---- the arc in focus: among the arcs the filter shows, or a path's hop
  useEffect(() => {
    const e = engine.current;
    if (!e || !data) return;
    if (sel?.kind === "path") {
      if (hops) e.setFocus(pathFlags(hops.length, focus));
      return;
    }
    if (!partners) return;
    const shownPartners = filter === "todas" ? partners : partners.filter((p) => (data.nt[p.gv] === 1) === (filter === "novo"));
    const at = focus >= 0 ? shownPartners.findIndex((p) => p.gv === partners[focus]?.gv) : -1;
    e.setFocus(focusFlags(shownPartners.length, at));
  }, [focus, partners, filter, data, sel, hops]);

  // ---- without a live canvas the names on the axis still sit on the poster's picture (the same view, home.ts)
  useEffect(() => {
    const stage = stageRef.current;
    if ((ready !== "poster" && ready !== "error") || sel || !stage || !data) return;
    const place = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      const box = homeBox(w, h);
      placeLabels(labelsRef.current, data, viewMatrix({ orbit: HOME_ORBIT, box }, w, h), w, h, box);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [ready, sel, data]);

  // ---- a new size at rest reframes the whole Bible (unless the camera was moved by hand)
  const selKey = hashOf(sel);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let t = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const e = engine.current;
        if (e && !selKey && !e.touched) e.jumpTo({ orbit: HOME_ORBIT, box: homeBox(e.size.width, e.size.height) });
        else if (e && selKey) {
          flown.current = "";
          setViewportRevision((revision) => revision + 1);
        }
      }, 120);
    });
    ro.observe(stage);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
    };
  }, [selKey]);

  // ---- a new selection takes the focus to the panel's heading (not while the canvas walks the chapters)
  useEffect(() => {
    if (!selKey) return;
    if (document.activeElement === canvasRef.current) return;
    if (headingEl.current) headingEl.current.focus({ preventScroll: true });
    else wantFocus.current = true;
  }, [selKey]);

  // ---- the verse's text and the snippets of the listed verses
  useEffect(() => {
    if (verse === null) return;
    let alive = true;
    verseText(verse)
      .then((text) => alive && setVerseBody({ gv: verse, text }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [verse]);
  useEffect(() => {
    const want = (sel?.kind === "chapter"
      ? chapterFeatured.slice(0, 6).map((link) => link.there)
      : listed.slice(0, shown).map((p) => p.gv))
      .filter((gv) => !snippets.has(gv));
    if (focus >= 0 && partners?.[focus] && !snippets.has(partners[focus].gv)) want.push(partners[focus].gv);
    if (want.length === 0) return;
    let alive = true;
    Promise.all(want.map(async (gv) => [gv, await verseText(gv)] as const))
      .then((pairs) => {
        if (!alive) return;
        setSnippets((m) => {
          const next = new Map(m);
          for (const [gv, t] of pairs) next.set(gv, t);
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [listed, shown, snippets, focus, partners, sel, chapterFeatured]);

  // ---- labels on the axis: the lit verse and its strongest links among those the filter shows; a path's steps, in
  // order; a word's most linked verses
  const labelItems = useMemo<{ gv: number; main: boolean; i: number; step?: number }[]>(() => {
    if (sel?.kind === "path") {
      if (!hops?.length) return [];
      return [hops[0].from, ...hops.map((h) => h.to)].map((gv, k) => ({ gv, main: k === 0, i: k === 0 ? -1 : k - 1, step: k + 1 }));
    }
    if (sel?.kind === "word") return wordResult ? Array.from(wordResult.verses.subarray(0, WORD_LABELS), (gv) => ({ gv, main: false, i: -1 })) : [];
    if (sel?.kind !== "verse" || !partners) return [];
    const top = listed.slice(0, phone ? 5 : 9);
    return [{ gv: sel.gv, main: true, i: -1 }, ...top.map((p) => ({ gv: p.gv, main: false, i: p.i }))];
  }, [sel, partners, listed, phone, hops, wordResult]);

  const pickChapter = useCallback(
    (x: number) => {
      if (!data) return;
      choose({ kind: "chapter", ci: Math.min(data.geo.nch - 1, Math.max(0, Math.floor(((x + 1) / 2) * data.geo.nch))) });
    },
    [data, choose],
  );
  // a tap on a lit arc: a verse's link opens its card, a path's hop is put in focus; a word's links only show
  const pickArc = useCallback(
    (i: number) => {
      if (sel?.kind === "verse") setFocus(listed[i]?.i ?? -1);
      else if (sel?.kind === "path") setFocus(i);
      else if (sel?.kind === "chapter" && chapterScene?.[i]) choose({ kind: "verse", gv: chapterScene[i].there });
    },
    [sel, chapterScene, choose, listed],
  );
  useEffect(() => {
    latest.current = { data, labels: labelItems, pickChapter, pickArc, arcsIn: !!arcs, theme, strength };
  });
  // a new set of pills is placed on the next frame
  useEffect(() => {
    engine.current?.request(false);
  }, [labelItems, sel]);

  // ---- the search field: a verse or a chapter ("Is 53:5", "Jo 3"), a path ("Gn 3:15 até Ap 12:9") or a word of the
  // text ("cordeiro", "pão da vida"): query.ts reads it (loaded when the field is first used)
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const asked = (await import("./query")).readQuery(query);
    if ("error" in asked) {
      setQueryError(asked.error);
      return;
    }
    setQueryError("");
    choose(asked.sel);
    setQuery("");
  }

  function surprise() {
    if (!arcs) return;
    // a verse with many links, different on every press: one end of an arc among the 2,000 most voted
    const k = Math.floor(Math.random() * Math.min(2000, arcs.set.n));
    choose({ kind: "verse", gv: Math.random() < 0.5 ? arcs.set.a[k] : arcs.set.b[k] });
  }

  function cameraView(view: "orbital" | "front" | "top") {
    const e = engine.current;
    if (!e) return;
    reach();
    const base = view === "front" ? { ...SELECT_VIEW, yaw: 0, pitch: 0 }
      : view === "top" ? { ...SELECT_VIEW, yaw: -0.12, pitch: 1.08 }
      : SELECT_VIEW;
    const frame = framing.current;
    e.flyTo(frame
      ? { orbit: fitOrbit(frame.points, base, frame.box.w / frame.box.h, 0.09), box: frame.box }
      : { orbit: { ...HOME_ORBIT, yaw: base.yaw, pitch: base.pitch }, box: homeBox(e.size.width, e.size.height) });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  /** A path from the verse open to another typed in the panel; gives what is wrong, or null when it opens. */
  async function openPathTo(from: number, input: string): Promise<string | null> {
    const asked = (await import("./query")).readPathEnd(from, input);
    if ("error" in asked) return asked.error;
    choose(asked.sel);
    return null;
  }

  function pickStrength(step: number) {
    setStrength(step);
    // the arcs with 5 votes or more are not all among the most voted 20,000 a light device starts with
    if (step === 1 && !arcs?.set.full && full !== "loading") void loadFull();
  }

  // ---- the image to save or share (snapshot.ts, loaded when asked for): the view now, what is lit, the credits
  async function saveImage() {
    const e = engine.current;
    if (!e || saving === "busy") return;
    setSaving("busy");
    try {
      const { snapshot, deliver, contentOf } = await import("./snapshot");
      const content = contentOf({
        sel,
        labels: labelItems,
        data,
        partners: partners?.length ?? null,
        verseText: sel?.kind === "verse" && verseBody?.gv === sel.gv ? verseBody.text : null,
        chapterLinks: chapterList?.length ?? null,
        full: !!arcs?.set.full,
        hops,
        wordVerses: wordResult?.verses ?? null,
        wordLinks: wordLit?.links.length ?? null,
        groups,
        strength: strength > 0 ? initial.strength[strength - 1] : null,
        counts: initial.counts,
        credits: initial.credits,
      });
      const blob = await snapshot(e, content, lightDevice() ? 1.5 : 2);
      const name = `biblia-conectada-${hashOf(sel).replace(/^#/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "ceu-de-ligacoes"}.png`;
      const done = await deliver(blob, name, content.title);
      setSaving(done === "cancelled" ? "idle" : done);
      if (done !== "cancelled") window.setTimeout(() => setSaving("idle"), 2400);
    } catch {
      setSaving("error");
    }
  }
  const saveLabel = saving === "busy" ? "Preparando a imagem…" : saving === "saved" ? "Imagem salva" : saving === "shared" ? "Imagem enviada" : saving === "error" ? "Tentar a imagem de novo" : "Salvar imagem";

  // ---- keyboard on the canvas: with a verse open the arrows walk its links (Enter follows one); otherwise they walk
  // the chapters (Shift: the books) and Enter opens one. Up and down zoom; Esc steps back.
  function onKey(e: React.KeyboardEvent) {
    const eng = engine.current;
    if (!data) return;
    if (e.key.startsWith("Arrow")) reach();
    if (sel?.kind === "verse" && listed.length > 0 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const at = listed.findIndex((p) => p.i === focus);
      const next = e.key === "ArrowRight" ? (at + 1) % listed.length : (at - 1 + listed.length) % listed.length;
      setFocus(listed[next].i);
      e.preventDefault();
      return;
    }
    if (sel?.kind === "verse" && e.key === "Enter" && focus >= 0 && partners?.[focus]) {
      choose({ kind: "verse", gv: partners[focus].gv });
      e.preventDefault();
      return;
    }
    // with a path open the arrows walk its hops
    if (sel?.kind === "path" && hops?.length && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      setFocus((f) => (e.key === "ArrowRight" ? (f + 1) % hops.length : (f - 1 + hops.length) % hops.length));
      e.preventDefault();
      return;
    }
    const nch = data.geo.nch;
    const from = cursor ?? (sel?.kind === "chapter" ? sel.ci : sel?.kind === "verse" ? data.geo.chapOfGv[sel.gv] : 0);
    const step = (delta: number) => {
      let ci = from;
      if (e.shiftKey) {
        const b = BOOKS.findLastIndex((x) => x.firstChapter <= from);
        ci = BOOKS[Math.min(Math.max(b + delta, 0), BOOKS.length - 1)].firstChapter;
      } else ci = Math.min(Math.max(from + delta, 0), nch - 1);
      setCursor(ci);
      eng?.setMark(chapterAxis(data.geo, ci));
    };
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowUp") eng?.nudge(0, 0, 0.85);
    else if (e.key === "ArrowDown") eng?.nudge(0, 0, 1 / 0.85);
    else if (e.key === "Enter" && cursor !== null) choose({ kind: "chapter", ci: cursor });
    else if (e.key === "Escape") {
      if (focus >= 0) setFocus(-1);
      else {
        setCursor(null);
        eng?.setMark(null);
        choose(null);
      }
    } else return;
    e.preventDefault();
  }

  // ---- words for screen readers: what the canvas shows now
  const announce =
    cursor !== null && data
      ? chapterLabel(cursor).label
      : sel?.kind === "verse" && partners
        ? `${longRef(BASE, sel.gv)}: ${ligacoes(partners.length)}.${focus >= 0 && partners[focus] ? ` Em foco: ${longRef(BASE, partners[focus].gv)}, ${votos(partners[focus].votes)}.` : ""}`
        : sel?.kind === "chapter" && chapterList
          ? `${chapterLabel(sel.ci).label}: ${ligacoes(chapterList.length)}.`
          : sel?.kind === "path" && hops !== undefined
            ? hops
              ? `Caminho de ${longRef(BASE, sel.from)} a ${longRef(BASE, sel.to)}: ${ligacoes(hops.length)}.${focus >= 0 && hops[focus] ? ` Em foco: ${longRef(BASE, hops[focus].from)} e ${longRef(BASE, hops[focus].to)}, ${votos(hops[focus].votes)}.` : ""}`
              : `Não há caminho entre ${longRef(BASE, sel.from)} e ${longRef(BASE, sel.to)}.`
            : sel?.kind === "word" && wordResult !== undefined
              ? `“${sel.q}”: ${versiculos(wordResult?.verses.length ?? 0)}.`
              : "";

  // the canvas draws (or will, once loaded): the controls that act on it show
  const canvasMode = ready !== "poster" && ready !== "error";
  const strong = strength > 0 ? initial.strength[strength - 1] : null;
  const strengthControl = (
    <div className={styles.strength}>
      <div className={styles.filters} role="group" aria-label="Força das ligações: mostrar só as mais votadas">
        {[0, ...initial.strength.map((_, i) => i + 1)].map((step) => (
          <button key={step} type="button" aria-pressed={strength === step} onClick={() => pickStrength(step)}>
            {step === 0 ? "Todas" : `${initial.strength[step - 1].min}+`}
          </button>
        ))}
      </div>
      <p className={styles.strengthNote} aria-live="polite">
        {strong
          ? `${ligacoes(strong.arcs)} com ${formatInt(strong.min)} votos ou mais${strength === 1 && full === "loading" ? " (carregando…)" : ""}`
          : arcs && !arcs.set.full
            ? `As ${formatInt(arcs.set.n)} mais votadas, de ${formatInt(initial.counts.arcs)}`
            : `${ligacoes(initial.counts.arcs)}`}
      </p>
    </div>
  );

  const focused = sel?.kind === "verse" && focus >= 0 && partners ? partners[focus] : null;
  const side = (gv: number) => {
    const { book, chapter, verse: v } = BASE.locate(gv);
    return { book: book.index, slug: book.slug, chapter, verse: v };
  };

  return (
    <div className={styles.page} data-scene-theme={theme}>
      <div ref={stageRef} className={styles.stage} data-state={ready} data-open={sel ? "" : undefined} data-sheet={sheetFull ? "full" : undefined}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          role="img"
          aria-label="Escultura de luz das referências cruzadas da Bíblia. Setas percorrem os capítulos, as ligações do versículo aberto ou os passos do caminho aberto; Enter abre; setas para cima e para baixo aproximam; Esc volta."
          onKeyDown={onKey}
          onPointerDown={reach}
          onWheel={reach}
          onBlur={() => {
            setCursor(null);
            engine.current?.setMark(null);
          }}
        />
        <div
          className={styles.poster}
          style={POSTER_STYLE}
          data-poster={ready === "live" ? (handover || sel ? "gone" : undefined) : sel ? "dim" : undefined}
          role={ready === "poster" || ready === "error" ? "img" : undefined}
          aria-label={ready === "poster" || ready === "error" ? "Escultura de luz das referências cruzadas da Bíblia, vista inteira" : undefined}
          aria-hidden={ready === "poster" || ready === "error" ? undefined : true}
        />
        {/* placed by the engine every frame, in this order of priority: the lit verses, then the books' names (where
            the camera is near enough for a name to fit its book), then the groups' (with nothing open) */}
        <div ref={labelsRef} className={styles.labels} aria-hidden="true">
          {sel?.kind === "chapter" && data && (
            <>
              <span data-x={chapterAxis(data.geo, sel.ci)} className={`${styles.pill} ${styles.pillMain}`}>{chapterLabel(sel.ci).label}</span>
              {chapterFeatured.slice(0, phone ? 4 : 7).map((link) => (
                <button key={link.there} type="button" tabIndex={-1} data-gv={link.there} className={styles.pill}
                  onClick={() => choose({ kind: "verse", gv: link.there })}>
                  {shortRef(BASE, link.there)}
                </button>
              ))}
            </>
          )}
          {labelItems.map((l) => (
            <button
              key={`${l.gv}-${l.i}-${l.step ?? 0}`}
              type="button"
              tabIndex={-1}
              data-gv={l.gv}
              data-main={l.main ? "" : undefined}
              className={l.main ? `${styles.pill} ${styles.pillMain}` : l.i === focus && sel?.kind !== "word" ? `${styles.pill} ${styles.pillOn}` : styles.pill}
              onClick={() => (sel?.kind === "word" ? choose({ kind: "verse", gv: l.gv }) : setFocus(l.main ? -1 : l.i))}
            >
              {l.step !== undefined && <span className={styles.pillStep}>{l.step}</span>}
              {shortRef(BASE, l.gv)}
            </button>
          ))}
          {BOOK_SPANS.map((b) => (
            <span
              key={b.name}
              data-x={(b.x0 + b.x1) / 2}
              data-x0={b.x0}
              data-x1={b.x1}
              data-group={groups.find((g) => b.first >= g.first && b.first < g.end)?.id}
              data-tier="book"
              className={`${styles.pill} ${styles.pillAxis}`}
            >
              {b.name}
            </span>
          ))}
          {!sel &&
            endsFirst(groupNames(groups)).map((g) => (
              <span
                key={g.id}
                data-x={axisX((g.first + g.end) / 2 / NCH)}
                data-group={g.id}
                data-tier="group"
                className={`${styles.pill} ${styles.pillAxis} ${styles.pillGroup}`}
              >
                {g.name}
              </span>
            ))}
        </div>
        {hover && preview && !phone && (
          <div className={styles.tip} style={{ transform: tipTransform(hover.at, hover.flip) }} aria-hidden="true">
            <strong>{chapterLabel(preview.ci).label}</strong>
            <span>
              {ligacoes(preview.list.length)}
              {preview.full ? "" : " entre as mais votadas"} · clique para abrir
            </span>
          </div>
        )}
        {arcTip && !phone && (() => {
          // the lit arc under the pointer: a verse's link, a path's hop, or one of the links between a word's verses
          let a: number, b: number, v: number, more: string;
          if (sel?.kind === "verse" && partners) {
            const shownPartners = filter === "todas" || !data ? partners : partners.filter((p) => (data.nt[p.gv] === 1) === (filter === "novo"));
            const p = shownPartners[arcTip.i];
            if (!p) return null;
            [a, b, v, more] = [sel.gv, p.gv, p.votes, "clique para ver a ligação"];
          } else if (sel?.kind === "path" && hops?.[arcTip.i]) {
            const h = hops[arcTip.i];
            [a, b, v, more] = [h.from, h.to, h.votes, `passo ${arcTip.i + 1} de ${hops.length}`];
          } else if (sel?.kind === "word" && wordLit?.links[arcTip.i]) {
            const l = wordLit.links[arcTip.i];
            [a, b, v, more] = [l.a, l.b, l.votes, "os dois têm a palavra"];
          } else if (sel?.kind === "chapter" && chapterScene?.[arcTip.i]) {
            const link = chapterScene[arcTip.i];
            [a, b, v, more] = [link.here, link.there, link.votes, "clique para seguir este versículo"];
          } else return null;
          return (
            <div className={styles.tip} style={{ transform: tipTransform(arcTip.at, arcTip.flip) }} aria-hidden="true">
              <strong>
                {shortRef(BASE, a)} e {longRef(BASE, b)}
              </strong>
              <span>
                {votos(v)} · {more}
              </span>
            </div>
          );
        })()}

        <form ref={fieldRef} className={styles.search} role="search" onSubmit={go}>
          <label className="visually-hidden" htmlFor={`${ids}-q`}>
            Versículo, capítulo, palavra, ou dois versículos com “até” para o caminho entre eles
          </label>
          <input
            id={`${ids}-q`}
            className={styles.field}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setQueryError("");
            }}
            placeholder="Daniel 9, João 3:16, uma palavra…"
            onFocus={() => void import("./query")}
            autoComplete="off"
            enterKeyHint="go"
            aria-invalid={queryError ? true : undefined}
            aria-describedby={queryError ? `${ids}-err` : undefined}
          />
          <button type="submit" className={styles.go}>
            Ver
          </button>
          {queryError && (
            <p id={`${ids}-err`} className={styles.error} role="alert">
              {queryError}
            </p>
          )}
        </form>

        {/* the page keeps its title while the intro steps aside for a selection (the panel's heading is the h2) */}
        {sel && <h1 className="visually-hidden">Céu de ligações</h1>}
        {sel && (
          <button type="button" className={styles.whole} onClick={() => choose(null)}>
            <Icon name="arc" />
            Bíblia inteira
          </button>
        )}
        {trail.length > 1 && (
          <nav className={styles.trail} aria-label="Caminho percorrido">
            <ol>
              {trail.map((gv, i) => (
                <li key={`${gv}-${i}`}>
                  {i === trail.length - 1 ? (
                    <span aria-current="true">{shortRef(BASE, gv)}</span>
                  ) : (
                    <button type="button" onClick={() => choose({ kind: "verse", gv }, false)}>
                      {shortRef(BASE, gv)}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        {!sel && (
          <section className={styles.intro} aria-labelledby={`${ids}-h`}>
            <p className={styles.eyebrow}>A BÍBLIA EM OUTRA DIMENSÃO</p>
            <h1 id={`${ids}-h`} className={styles.title}>
              Um céu.<br /><em>Infinitos encontros.</em>
            </h1>
            <p className={styles.lede}>
              Gire a história. Acenda uma passagem.<br />
              Siga os fios que aproximam a Palavra.
            </p>
            <ul className={styles.examples}>
              <li>
                <button type="button" className={`${styles.chip} ${styles.chipPrimary}`} onClick={() => choose({ kind: "chapter", ci: DANIEL_NINE })}>
                  Começar por Daniel 9 <span aria-hidden="true">↗</span>
                </button>
              </li>
              {initial.examples.slice(0, 2).map((x) => (
                <li key={x.gv}>
                  <button type="button" className={styles.chip} onClick={() => choose({ kind: "verse", gv: x.gv })}>
                    {x.label}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className={`${styles.chip} ${styles.chipLuck}`} onClick={surprise} disabled={!arcs}>
                  Um versículo ao acaso
                </button>
              </li>
            </ul>
            <details className={styles.moreWays}>
            <summary>Mais caminhos para descobrir</summary>
            <p className={styles.tryLine}>Una dois versículos ou descubra uma palavra pela Bíblia:</p>
            <ul className={styles.examples}>
              <li>
                <button type="button" className={styles.chip} onClick={() => choose({ kind: "path", from: initial.pathExample.from, to: initial.pathExample.to })}>
                  {initial.pathExample.label}
                </button>
              </li>
              <li>
                <button type="button" className={styles.chip} onClick={() => choose({ kind: "word", q: initial.wordExample })}>
                  “{initial.wordExample}”
                </button>
              </li>
            </ul>
            <p className={styles.hint}>
              São {formatInt(initial.counts.verses)} versículos, {formatInt(initial.counts.crossrefRows)} referências cruzadas e{" "}
              {formatInt(initial.counts.arcs)} pares de versículos diferentes. A passagem mais conectada é{" "}
              {initial.top.ref}, com {formatInt(initial.top.links)} ligações.
            </p>
            </details>
            {ready === "poster" ? (
              <p className={styles.hint}>
                Este aparelho não desenha a escultura em 3D. Busque um versículo: o texto e as ligações aparecem do mesmo jeito, ou{" "}
                <Link href="/arcos/plano">veja o céu de ligações em 2D</Link>.
              </p>
            ) : ready === "error" ? (
              <p className={styles.hint} role="alert">
                Não deu para carregar as ligações.{" "}
                <button type="button" className={styles.loadAll} onClick={() => window.location.reload()}>
                  Tentar de novo
                </button>
              </p>
            ) : (
              <p className={styles.hint}>
                {phone
                  ? "Arraste para girar, use dois dedos para aproximar, toque na linha do meio para abrir um capítulo."
                  : "Arraste para girar, role para aproximar, clique na linha do meio para abrir um capítulo."}{" "}
              </p>
            )}
            {full === "offer" || full === "error" || full === "loading" ? (
              <p className={styles.hint}>
                {full === "loading" ? (
                  "Carregando todas as ligações…"
                ) : (
                  <button type="button" className={styles.loadAll} onClick={() => void loadFull()}>
                    {full === "error" ? "Tentar de novo: " : "Mostrar "}as {formatInt(initial.counts.arcs)} ligações (agora: as {formatInt(arcs?.set.n ?? 0)} mais votadas)
                  </button>
                )}
              </p>
            ) : null}
            {/* phones have no legend: the strength of the links and the image live here, last, so nothing above moves */}
            {phone && canvasMode && (
              <div className={styles.phoneTools}>
                {strengthControl}
                <button type="button" className={styles.mode} onClick={() => void saveImage()} disabled={saving === "busy" || ready !== "live"}>
                  {saveLabel}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Loading is also a canvas mode; wait for the engine so these controls stay out of the initial page script. */}
        {canvasMode && ready === "live" && (
          <Suspense fallback={null}>
            <SculptureControls
              onView={cameraView}
              onZoom={(factor) => { reach(); engine.current?.nudge(0, 0, factor); }}
              onPause={() => setLightsPaused((paused) => !paused)}
              lightsPaused={lightsPaused}
            />
          </Suspense>
        )}

        {/* the legend stands on its bottom edge: the strength row at its top, and the buttons left of "Céu em 2D", come
            and go (no canvas on this device) without moving anything else */}
        <details className={styles.legend}>
          <summary>Ajustar o céu <span aria-hidden="true">+</span></summary>
          {canvasMode && !phone && strengthControl}
          {mode === "livros" ? (
            <p><i className={styles.swSpectrum} /> Cores na ordem dos livros, de Gênesis a Apocalipse</p>
          ) : mode === "testamento" ? (
            <ul aria-label="Cores dos fios">
              <li>
                <i className={styles.swAt} /> Dentro do Antigo Testamento
              </li>
              <li>
                <i className={styles.swNt} /> Dentro do Novo
              </li>
              <li>
                <i className={styles.swBr} /> Pontes entre os dois
              </li>
            </ul>
          ) : (
            <p>
              <i className={styles.swGlass} /> Ligações perto (azul) e longe (ouro)
            </p>
          )}
          <p className={styles.legendActions}>
            {canvasMode && (
              <select className={styles.mode} aria-label="Cores do céu" value={mode} onChange={(event) => setMode(event.target.value as ColorMode)}>
                <option value="livros">Arco-íris dos livros</option>
                <option value="testamento">Por testamento</option>
                <option value="distancia">Pela distância</option>
              </select>
            )}
            {canvasMode && (
              <button type="button" className={styles.mode} onClick={() => void saveImage()} disabled={saving === "busy" || ready !== "live"}>
                {saveLabel}
              </button>
            )}
            <Link className={styles.mode} href="/arcos/plano">
              Céu em 2D
            </Link>
          </p>
        </details>

        {sel && (
          <aside className={styles.panel} aria-labelledby={`${ids}-p`}>
            <div className={styles.panelBar}>
              <button
                type="button"
                className={styles.grip}
                aria-expanded={sheetFull}
                aria-label={sheetFull ? "Reduzir o painel" : "Expandir o painel"}
                onClick={() => setSheetFull((f) => !f)}
              >
                <span />
              </button>
              <button type="button" className={styles.close} onClick={() => choose(null)} aria-label="Fechar e voltar à Bíblia inteira">
                <Icon name="close" />
              </button>
            </div>
            <p className={styles.panelEyebrow}>SIGA AS CONEXÕES</p>
            <Suspense fallback={<><h2 id={`${ids}-p`} className={styles.ref}>
              {sel.kind === "verse" ? longRef(BASE, sel.gv) : sel.kind === "chapter" ? chapterLabel(sel.ci).label : "Passagem selecionada"}
            </h2><p role="status" className={styles.meta}>Carregando passagem…</p></>}>
            {sel.kind === "verse" ? (
              <VersePanel
                gv={sel.gv}
                nt={data ? data.nt[sel.gv] === 1 : null}
                partners={partners}
                text={verseBody?.gv === sel.gv ? verseBody.text : null}
                snippets={snippets}
                filter={filter}
                onFilter={(f) => {
                  setFilter(f);
                  setShown(PAGE);
                  setFocus(-1);
                }}
                listed={listed}
                counts={counts}
                shown={shown}
                onMore={() => setShown((s) => s + PAGE)}
                focus={focus}
                onFocus={setFocus}
                onChapter={() => data && choose({ kind: "chapter", ci: data.geo.chapOfGv[sel.gv] })}
                copied={copied}
                onCopy={() => void copyLink()}
                save={ready === "live" ? { label: saveLabel, busy: saving === "busy", onSave: () => void saveImage() } : null}
                onPath={(input) => openPathTo(sel.gv, input)}
                headingId={`${ids}-p`}
                headingRef={headingRef}
              />
            ) : sel.kind === "chapter" ? data ? (
              <ChapterPanel
                key={sel.ci}
                ci={sel.ci}
                nch={data.geo.nch}
                first={data.geo.chapterFirst[sel.ci]}
                verses={data.geo.chapterVerses[sel.ci]}
                links={chapterList}
                highlights={chapterFeatured.slice(0, 6)}
                snippets={snippets}
                sceneControl={chapterList && (
                  <div className={styles.constellationNote}>
                    <span>{formatInt(chapterScene?.length ?? 0)} fios {arcs?.set.full ? "em destaque" : "entre os mais votados"}</span>
                    <button type="button" aria-pressed={allChapterThreads} disabled={full === "loading"} onClick={() => {
                      if (full === "error" && allChapterThreads) { void loadFull(); return; }
                      if (!allChapterThreads && !arcs?.set.full) void loadFull();
                      setAllChapterThreads((value) => !value);
                    }}>
                      {full === "loading" ? "Carregando todos os fios…" : full === "error" && allChapterThreads ? "Tentar carregar todos" : allChapterThreads ? "Simplificar o céu" : "Mostrar todos os fios"}
                    </button>
                  </div>
                )}
                full={!!arcs?.set.full}
                onVerse={(gv) => choose({ kind: "verse", gv })}
                onChapter={(ci) => choose({ kind: "chapter", ci })}
                save={ready === "live" ? { label: saveLabel, busy: saving === "busy", onSave: () => void saveImage() } : null}
                headingId={`${ids}-p`}
                headingRef={headingRef}
              />
            ) : (
              <>
                <h2 id={`${ids}-p`} ref={headingRef} tabIndex={-1} className={styles.ref}>{chapterLabel(sel.ci).label}</h2>
                <p className={styles.meta} role="status">Iluminando as conexões deste capítulo…</p>
              </>
            ) : sel.kind === "path" ? (
              <Suspense fallback={null}>
                <PathPanel
                  key={hashOf(sel)}
                  from={sel.from}
                  to={sel.to}
                  hops={hops}
                  error={pathError}
                  onRetry={() => setRetry((r) => r + 1)}
                  loadingAll={!arcs?.set.full}
                  focus={focus}
                  onFocus={setFocus}
                  onVerse={(gv) => choose({ kind: "verse", gv })}
                  onSwap={() => choose({ kind: "path", from: sel.to, to: sel.from })}
                  copied={copied}
                  onCopy={() => void copyLink()}
                  save={ready === "live" ? { label: saveLabel, busy: saving === "busy", onSave: () => void saveImage() } : null}
                  headingId={`${ids}-p`}
                  headingRef={headingRef}
                />
              </Suspense>
            ) : (
              <Suspense fallback={null}>
                <WordPanel
                  key={sel.q}
                  q={sel.q}
                  result={wordResult}
                  error={wordError}
                  onRetry={() => setRetry((r) => r + 1)}
                  links={wordLit?.links.length ?? null}
                  full={!!arcs?.set.full}
                  lit={Math.min(wordLit?.links.length ?? 0, WORD_LIT)}
                  groups={groups}
                  chapterOf={data ? (gv: number) => data.geo.chapOfGv[gv] : null}
                  onVerse={(gv) => choose({ kind: "verse", gv })}
                  copied={copied}
                  onCopy={() => void copyLink()}
                  save={ready === "live" ? { label: saveLabel, busy: saving === "busy", onSave: () => void saveImage() } : null}
                  headingId={`${ids}-p`}
                  headingRef={headingRef}
                />
              </Suspense>
            )}
            </Suspense>
            <p className={styles.credit}>Ligações sugeridas por leitores na OpenBible.info (CC BY), das mais votadas para as menos. Texto da Bíblia Livre (BLIVRE).</p>
          </aside>
        )}

        {focused && sel?.kind === "verse" && (
          <div className={styles.card} role="group" aria-label={`Ligação entre ${longRef(BASE, sel.gv)} e ${longRef(BASE, focused.gv)}`}>
            <button type="button" className={styles.close} onClick={() => setFocus(-1)} aria-label="Fechar a ligação">
              <Icon name="close" />
            </button>
            <p className={styles.route}>
              {shortRef(BASE, sel.gv)} <Icon name="out" className={styles.routeArrow} />
              <span className="visually-hidden"> até </span> <strong>{longRef(BASE, focused.gv)}</strong>
            </p>
            <blockquote className={styles.cardText}>{snippets.get(focused.gv) ?? "…"}</blockquote>
            <p className={styles.meta}>{votos(focused.votes)} de leitores na OpenBible.info</p>
            <p className={styles.cardActions}>
              <VerseStudyLink path={versePath(BASE, focused.gv)} label={longRef(BASE, focused.gv)} />
              <button type="button" className={styles.follow} onClick={() => choose({ kind: "verse", gv: focused.gv })}>
                Seguir para {shortRef(BASE, focused.gv)}
              </button>
              <Link className={styles.act} href={conexaoPath(side(sel.gv), side(focused.gv))}>
                Ler lado a lado
              </Link>
              <Link className={styles.act} href={versePath(BASE, focused.gv)}>
                Abrir {shortRef(BASE, focused.gv)}
              </Link>
            </p>
          </div>
        )}
        <p className="visually-hidden" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the pointer's tip

/** room a tip needs beside the pointer (the longest, a link's two verses and its votes, is about 270 px) */
const TIP_ROOM = 300;
/** Opens the tip to the pointer's left when, to its right, it would run past the picture's box (under the panel). */
function tipFlips(e: SculptureEngine | null, at: { x: number }) {
  const box = e?.view.box;
  return !!box && at.x + 14 + TIP_ROOM > box.x + box.w;
}
const tipTransform = (at: { x: number; y: number }, flip: boolean) =>
  `translate3d(${flip ? `calc(${Math.round(at.x - 14)}px - 100%)` : `${Math.round(at.x + 14)}px`}, ${Math.round(at.y - 56)}px, 0)`;

// ---------------------------------------------------------------- labels, placed by the engine every frame

/**
 * Moves the pills to their places on the axis (no React render per frame), in the order they come: the lit verses (the
 * lit verse first, then the strongest links), then the books' names, then the groups'. A pill that would cover another
 * tries the other side of the axis before it hides. A book's name shows only when the camera is near enough for it to
 * fit inside its book's stretch of the axis; a group's name only when none of its books' names shows. Every size is
 * read before any pill moves, so a frame forces one layout, not one per pill.
 */
function placeLabels(root: HTMLDivElement | null, data: Data | null, m: Mat4, w: number, h: number, box: Box) {
  if (!root || !data) return;
  // pills stay inside the picture's box (never under the panel or the field)
  const left = Math.max(4, box.x), right = Math.min(w - 4, box.x + box.w), top = Math.max(4, box.y), bottom = Math.min(h - 4, box.y + box.h);
  const placed: { l: number; r: number; t: number; b: number }[] = [];
  const nodes = Array.from(root.children) as HTMLElement[];
  const sizes = nodes.map((el) => [el.offsetWidth, el.offsetHeight] as const);
  const named = new Set<string>();
  // books get names once the axis is drawn well over twice as long as the picture is wide (the whole Bible shows the
  // groups; a camera close to a passage, the books around it)
  const ends = [project(m, [-1, 0, 0], w, h), project(m, [1, 0, 0], w, h)];
  const near = !ends[0].front || !ends[1].front || Math.hypot(ends[1].x - ends[0].x, ends[1].y - ends[0].y) >= 2.2 * box.w;
  nodes.forEach((el, k) => {
    const [bw, bh] = sizes[k];
    const d = el.dataset;
    const tier = d.tier;
    const ax = d.x !== undefined ? Number(d.x) : verseAxis(data.geo, Number(d.gv));
    const s = project(m, [ax, 0, 0], w, h);
    let fits = s.front;
    if (tier === "book") {
      const a = project(m, [Number(d.x0), 0, 0], w, h), b = project(m, [Number(d.x1), 0, 0], w, h);
      fits = fits && near && a.front && b.front && Math.hypot(b.x - a.x, b.y - a.y) >= bw + 12;
    } else if (tier === "group") fits = fits && !named.has(d.group ?? "");
    let x = s.x - bw / 2;
    // a label whose place is near an edge of the picture slides inward to stay whole (it still touches its place)
    if (s.x > left && s.x < right) x = Math.min(Math.max(x, left + 2), right - bw - 2);
    let shown = false;
    let y = 0;
    if (fits) {
      // the groups' names keep to the two rows next to the axis: on a small picture eight names would bury it
      for (const dy of tier === "group" ? [12, -12 - bh] : [12, -12 - bh, 12 + bh + 6, -18 - 2 * bh]) {
        y = s.y + dy;
        const r = { l: x - 4, r: x + bw + 4, t: y - 2, b: y + bh + 2 };
        const inside = x > left && x + bw < right && y > top && y + bh < bottom;
        if (inside && !placed.some((p) => p.l < r.r && r.l < p.r && p.t < r.b && r.t < p.b)) {
          placed.push(r);
          shown = true;
          break;
        }
      }
    }
    if (shown && tier === "book" && d.group) named.add(d.group);
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    el.style.visibility = shown ? "visible" : "hidden";
  });
}
