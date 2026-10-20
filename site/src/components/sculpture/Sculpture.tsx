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
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { usePageSearch } from "@/components/search/page-search";
import { createReferenceParser } from "@/lib/canon/reference";
import { formatInt } from "@/lib/canon/text";
import { BASE, BOOKS } from "@/lib/community/books-client";
import { loadVerseLinks } from "@/lib/community/fetchers";
import { longRef, shortRef, versePath } from "@/lib/community/geometry";
import { conexaoPath } from "@/lib/conexao";
import { buildGeometry, decodeArcs, indexByChapter, type SkyMeta } from "../sky/model";
import {
  arcBuffers,
  axisLines,
  chapterAxis,
  chapterLinks,
  focusFlags,
  litLinks,
  litVerse,
  newTestament,
  pairAngle,
  partnersFromLinks,
  partnersOf,
  verseAxis,
  type Partner,
} from "./arcs";
import type { SculptureEngine } from "./engine";
import { HOME_ORBIT, homeBox, NARROW, NT_START, TOP } from "./home";
import { ChapterPanel, PAGE, VersePanel } from "./Panel";
import { SCULPTURE_POSTER } from "./poster";
import type { ColorMode, Theme } from "./renderer";
import { arcSamples, fitOrbit, project, viewMatrix, type Box, type Mat4, type Orbit, type Vec3 } from "./space";
import {
  chapterLabel,
  hashOf,
  ligacoes,
  parseHash,
  readHash,
  subscribeHash,
  verseOf,
  verseText,
  votos,
  writeHash,
  type Data,
  type Filter,
  type Loaded,
  type Sel,
} from "./state";
import styles from "./sculpture.module.css";

export type SculptureInitial = {
  counts: { verses: number; crossrefRows: number; arcs: number; chapters: number };
  /** the most linked verse (summary.topVerses[0]) */
  top: { ref: string; links: number };
  /** verses the intro offers, with their place in the Bible */
  examples: { gv: number; label: string }[];
};

const parse = createReferenceParser(BOOKS);
/** the view a selection opens on: a little from the left and above, so the bridges and the inner links both show */
const SELECT_VIEW: Orbit = { yaw: -0.38, pitch: 0.2, dist: 2, target: [0, 0, 0] };
/** the chapter preview shows its strongest links only (the panel lists all of them) */
const PREVIEW_LINKS = 80;
/** names on the axis while nothing is selected: its two ends and where the New Testament begins */
const AXIS_NAMES = [
  { x: -1, label: BOOKS[0].name },
  { x: NT_START, label: BOOKS.find((b) => b.testament === "NT")!.name },
  { x: 1, label: BOOKS[BOOKS.length - 1].name },
];
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
  const headingRef = useRef<HTMLHeadingElement>(null);
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
  const [mode, setMode] = useState<ColorMode>("testamento");
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

  // one search in view: the top bar's entry steps aside while this field shows (page-search.ts)
  usePageSearch(fieldRef);

  // ---- choosing: the address is the selection; the trail keeps the verses followed
  const choose = useCallback((next: Sel, follow = true) => {
    setFocus(-1);
    setFilter("todas");
    setShown(PAGE);
    setSheetFull(false);
    setHandover(true);
    // a chapter previewed under a resting pointer would cover the new selection's light until the pointer moved
    setHover(null);
    setArcTip(null);
    writeHash(next);
    if (!next) setTrail([]);
    else if (next.kind === "verse" && follow) setTrail((t) => (t[t.length - 1] === next.gv ? t : [...t, next.gv].slice(-12)));
  }, []);

  // ---- what the engine calls back (kept current without re-creating the engine)
  const latest = useRef<{ data: Data | null; labels: { gv: number }[]; pickChapter: (x: number) => void; arcsIn: boolean; theme: Theme }>({
    data,
    labels: [],
    pickChapter: () => {},
    arcsIn: false,
    theme,
  });
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
        pickArc: (i) => setFocus(i),
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

  // ---- the arcs, the axis, the theme and the colour mode go to the engine
  useEffect(() => {
    const e = engine.current;
    if (!e || !data) return;
    const lines = axisLines(data.meta, data.geo);
    e.setLines(lines.axis, lines.ticks);
    e.setChapters(data.geo.nch);
  }, [data]);
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

  // ---- a chapter's links (the chapter panel, and the preview under the pointer)
  const chapterCi = sel?.kind === "chapter" ? sel.ci : null;
  const chapterList = useMemo(() => (chapterCi !== null && data && arcs ? chapterLinks(data.geo, arcs.set, arcs.idx, chapterCi) : null), [chapterCi, data, arcs]);
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
    const key = hashOf(sel);
    const fresh = key !== flown.current;
    if (!sel) {
      e.setLit(null);
      if (fresh) e.flyTo({ orbit: HOME_ORBIT, box: homeBox(e.size.width, e.size.height) });
      flown.current = key;
      return;
    }
    const points: Vec3[] = [];
    let lit;
    if (sel.kind === "verse") {
      if (!partners) return;
      // the filter keeps only its arcs lit; the list's indices stay those of every partner
      const shownPartners = filter === "todas" ? partners : partners.filter((p) => (data.nt[p.gv] === 1) === (filter === "novo"));
      lit = litVerse(data.geo, data.nt, sel.gv, shownPartners, -1);
      const x = verseAxis(data.geo, sel.gv);
      points.push([x, 0, 0]);
      for (const p of shownPartners) points.push(...arcSamples(x, verseAxis(data.geo, p.gv), pairAngle(data.geo, data.nt, sel.gv, p.gv), 4));
    } else {
      if (!chapterList) return;
      lit = litLinks(data.geo, data.nt, chapterList, chapterAxis(data.geo, sel.ci));
      chapterList.forEach((l, i) => {
        if (i % 3 === 0) points.push(...arcSamples(verseAxis(data.geo, l.here), verseAxis(data.geo, l.there), pairAngle(data.geo, data.nt, l.here, l.there), 3));
      });
      points.push([chapterAxis(data.geo, sel.ci), 0, 0]);
    }
    e.setLit(lit, fresh);
    if (fresh) {
      const { width, height } = e.size;
      const top = TOP + 40 + 8;
      // what the panel (or the sheet) leaves free
      const box: Box = phone
        ? { x: 0, y: top, w: width, h: Math.max(height * 0.5 - top, 120) }
        : { x: 16, y: top, w: Math.max(width - Math.min(26 * 16, width * 0.42) - 48, 200), h: height - top - 16 };
      e.flyTo({ orbit: fitOrbit(points, SELECT_VIEW, box.w / box.h, 0.06), box });
      flown.current = key;
    }
  }, [sel, partners, chapterList, filter, data, arcs, phone]);

  // ---- the arc in focus, among the arcs the filter shows
  useEffect(() => {
    const e = engine.current;
    if (!e || !partners || !data) return;
    const shownPartners = filter === "todas" ? partners : partners.filter((p) => (data.nt[p.gv] === 1) === (filter === "novo"));
    const at = focus >= 0 ? shownPartners.findIndex((p) => p.gv === partners[focus]?.gv) : -1;
    e.setFocus(focusFlags(shownPartners.length, at));
  }, [focus, partners, filter, data]);

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
    headingRef.current?.focus({ preventScroll: true });
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
    const want = listed
      .slice(0, shown)
      .map((p) => p.gv)
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
  }, [listed, shown, snippets, focus, partners]);

  // ---- labels on the axis: the lit verse and its strongest links among those the filter shows
  const labelItems = useMemo(() => {
    if (sel?.kind !== "verse" || !partners) return [];
    const top = listed.slice(0, phone ? 5 : 9);
    return [{ gv: sel.gv, main: true, i: -1 }, ...top.map((p) => ({ gv: p.gv, main: false, i: p.i }))];
  }, [sel, partners, listed, phone]);

  const pickChapter = useCallback(
    (x: number) => {
      if (!data) return;
      choose({ kind: "chapter", ci: Math.min(data.geo.nch - 1, Math.max(0, Math.floor(((x + 1) / 2) * data.geo.nch))) });
    },
    [data, choose],
  );
  useEffect(() => {
    latest.current = { data, labels: labelItems, pickChapter, arcsIn: !!arcs, theme };
  });
  // a new set of pills is placed on the next frame
  useEffect(() => {
    engine.current?.request(false);
  }, [labelItems, sel]);

  // ---- the search field
  function go(e: React.FormEvent) {
    e.preventDefault();
    const r = query.trim() ? parse(query) : null;
    if (!r || !r.ok) {
      setQueryError(
        !r
          ? "Escreva um versículo: “Is 53:5”, “Jo 3:16”."
          : r.error === "book" || r.error === "ambiguous"
            ? "Não achei esse livro. Tente a abreviação: “Gn”, “Sl”, “Jo”."
            : r.error === "chapter"
              ? "Esse capítulo não existe nesse livro."
              : r.error === "verse"
                ? "Esse versículo não existe nesse capítulo."
                : "Escreva livro, capítulo e versículo: “Is 53:5”.",
      );
      return;
    }
    setQueryError("");
    const { book, chapter, verse: v } = r.ref;
    choose(v ? { kind: "verse", gv: verseOf(book, chapter, v) } : { kind: "chapter", ci: book.firstChapter + chapter - 1 });
    setQuery("");
  }

  function surprise() {
    if (!arcs) return;
    // a verse with many links, different on every press: one end of an arc among the 2,000 most voted
    const k = Math.floor(Math.random() * Math.min(2000, arcs.set.n));
    choose({ kind: "verse", gv: Math.random() < 0.5 ? arcs.set.a[k] : arcs.set.b[k] });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

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
          : "";

  const focused = sel?.kind === "verse" && focus >= 0 && partners ? partners[focus] : null;
  const side = (gv: number) => {
    const { book, chapter, verse: v } = BASE.locate(gv);
    return { book: book.index, slug: book.slug, chapter, verse: v };
  };

  return (
    <div className={styles.page}>
      <div ref={stageRef} className={styles.stage} data-state={ready} data-open={sel ? "" : undefined} data-sheet={sheetFull ? "full" : undefined}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          tabIndex={0}
          role="img"
          aria-label="Escultura de luz das referências cruzadas da Bíblia. Setas percorrem os capítulos, ou as ligações do versículo aberto; Enter abre; setas para cima e para baixo aproximam; Esc volta."
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
        <div ref={labelsRef} className={styles.labels} aria-hidden="true">
          {!sel &&
            AXIS_NAMES.map((n) => (
              <span key={n.label} data-x={n.x} className={`${styles.pill} ${styles.pillAxis}`}>
                {n.label}
              </span>
            ))}
          {labelItems.map((l) => (
            <button
              key={`${l.gv}-${l.i}`}
              type="button"
              tabIndex={-1}
              data-gv={l.gv}
              data-main={l.main ? "" : undefined}
              className={l.main ? `${styles.pill} ${styles.pillMain}` : l.i === focus ? `${styles.pill} ${styles.pillOn}` : styles.pill}
              onClick={() => setFocus(l.main ? -1 : l.i)}
            >
              {shortRef(BASE, l.gv)}
            </button>
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
        {arcTip && !phone && sel?.kind === "verse" && partners && (() => {
          const shownPartners = filter === "todas" || !data ? partners : partners.filter((p) => (data.nt[p.gv] === 1) === (filter === "novo"));
          const p = shownPartners[arcTip.i];
          if (!p) return null;
          return (
            <div className={styles.tip} style={{ transform: tipTransform(arcTip.at, arcTip.flip) }} aria-hidden="true">
              <strong>
                {shortRef(BASE, sel.gv)} e {longRef(BASE, p.gv)}
              </strong>
              <span>{votos(p.votes)} · clique para ver a ligação</span>
            </div>
          );
        })()}

        <form ref={fieldRef} className={styles.search} role="search" onSubmit={go}>
          <label className="visually-hidden" htmlFor={`${ids}-q`}>
            Versículo ou capítulo
          </label>
          <input
            id={`${ids}-q`}
            className={styles.field}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setQueryError("");
            }}
            placeholder="Ir para Isaías 53:5"
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
            <h1 id={`${ids}-h`} className={styles.title}>
              Céu de ligações
            </h1>
            <p className={styles.lede}>
              São {formatInt(initial.counts.verses)} versículos e {formatInt(initial.counts.crossrefRows)} referências cruzadas, que ligam{" "}
              {formatInt(initial.counts.arcs)} pares de versículos diferentes. Cada par é um fio de luz; o versículo com mais ligações é{" "}
              {initial.top.ref}, com {formatInt(initial.top.links)}.
            </p>
            <ul className={styles.examples}>
              {initial.examples.map((x) => (
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
                  : "Arraste para girar, role para aproximar, clique na linha do meio para abrir um capítulo."}
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
          </section>
        )}

        <div className={styles.legend}>
          {mode === "testamento" ? (
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
            {ready !== "poster" && ready !== "error" && (
              <button type="button" className={styles.mode} aria-pressed={mode === "distancia"} onClick={() => setMode((m) => (m === "testamento" ? "distancia" : "testamento"))}>
                Cor pela distância
              </button>
            )}
            <Link className={styles.mode} href="/arcos/plano">
              Céu em 2D
            </Link>
          </p>
        </div>

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
                headingId={`${ids}-p`}
                headingRef={headingRef}
              />
            ) : (
              <ChapterPanel
                ci={sel.ci}
                nch={data ? data.geo.nch : 0}
                first={data ? data.geo.chapterFirst[sel.ci] : 0}
                verses={data ? data.geo.chapterVerses[sel.ci] : 0}
                links={chapterList}
                full={!!arcs?.set.full}
                onVerse={(gv) => choose({ kind: "verse", gv })}
                onChapter={(ci) => choose({ kind: "chapter", ci })}
                headingId={`${ids}-p`}
                headingRef={headingRef}
              />
            )}
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
 * Moves the pills to their verses on the axis (no React render per frame). The lit verse first, then the strongest
 * links: a pill that would cover another tries the other side of the axis before it hides.
 */
function placeLabels(root: HTMLDivElement | null, data: Data | null, m: Mat4, w: number, h: number, box: Box) {
  if (!root || !data) return;
  // pills stay inside the picture's box (never under the panel or the field)
  const left = Math.max(4, box.x), right = Math.min(w - 4, box.x + box.w), top = Math.max(4, box.y), bottom = Math.min(h - 4, box.y + box.h);
  const placed: { l: number; r: number; t: number; b: number }[] = [];
  const nodes = root.children;
  for (let k = 0; k < nodes.length; k++) {
    const el = nodes[k] as HTMLElement;
    const named = el.dataset.x !== undefined;
    const ax = named ? Number(el.dataset.x) : verseAxis(data.geo, Number(el.dataset.gv));
    const s = project(m, [ax, 0, 0], w, h);
    const bw = el.offsetWidth, bh = el.offsetHeight;
    let x = s.x - bw / 2;
    // a book's name at an end of the axis slides inward to stay whole (a verse's label stays centred on its verse)
    if (named && s.x > left && s.x < right) x = Math.min(Math.max(x, left + 2), right - bw - 2);
    let shown = false;
    let y = 0;
    for (const dy of [12, -12 - bh, 12 + bh + 6, -18 - 2 * bh]) {
      y = s.y + dy;
      const box = { l: x - 4, r: x + bw + 4, t: y - 2, b: y + bh + 2 };
      const inside = s.front && x > left && x + bw < right && y > top && y + bh < bottom;
      if (inside && !placed.some((p) => p.l < box.r && box.l < p.r && p.t < box.b && box.t < p.b)) {
        placed.push(box);
        shown = true;
        break;
      }
    }
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    el.style.visibility = shown ? "visible" : "hidden";
  }
}
