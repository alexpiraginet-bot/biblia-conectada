"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CadernoIcon } from "@/components/caderno/icons";
import { Icon } from "@/components/icons";
import { CADERNO_EVENT, CADERNO_KEY } from "@/lib/caderno/keys";
import { addSalvo, cleanQuote, newId, passageRef, quoteWithRef, readSalvos, textFragment, writeSalvos } from "@/lib/salvos";
import "./highlight.css";
import styles from "./selection.module.css";

type Picked = { from: number; to: number; text: string; top: number; left: number; below: boolean; float: boolean };
/** What the bar says after an action: `saved` adds the check; `go` names a way on, a link (`href`) or an act (`onGo`). */
type Note = { text: string; saved?: boolean; href?: string; go?: string; onGo?: () => void };
/** The notebook's side of the reading pages: its model, storage and dialog arrive on first use. */
type Notebook = typeof import("@/components/caderno/reader");
type MarkColor = Notebook["MARK_COLORS"][number];
type Editing = { from: number; to: number; text: string };

const HL = "bc-trecho";
const FLOAT = "(min-width: 64rem)";
/** room the bar needs above the selection before it goes below it: its two rows of actions and what it answers */
const BAR_ROOM = 300;

let notebook: Promise<Notebook> | null = null;
/**
 * Gives the keyboard back to a verse after the bar or the note dialog closes: its first link when one is drawn, the
 * verse itself otherwise (in the "Leitura" mode the verse's links are put away, and focusing a link that is not
 * drawn would leave the keyboard at the top of the page; found by review, 10/11).
 */
function focusVerse(root: HTMLElement, verse: number, preventScroll = false) {
  const li = [...root.querySelectorAll<HTMLElement>(`li[data-verse="${verse}"]`)].find((el) => el.getClientRects().length > 0);
  if (!li) return;
  const link = [...li.querySelectorAll<HTMLElement>("a")].find((a) => a.getClientRects().length > 0);
  if (!link) li.tabIndex = -1;
  (link ?? li).focus({ preventScroll });
}

function loadNotebook(): Promise<Notebook> {
  notebook ??= import("@/components/caderno/reader").catch((error: unknown) => {
    notebook = null;
    throw error;
  });
  return notebook;
}

/** The whole BLIVRE text of each verse of a range, as the page shows it; null when a verse is not on the page. */
function verseTexts(root: HTMLElement, from: number, to: number): { vers: number; texto: string }[] | null {
  const verses: { vers: number; texto: string }[] = [];
  for (let vers = from; vers <= to; vers++) {
    const texto = cleanQuote(root.querySelector(`li[data-verse="${vers}"] [data-scripture]`)?.textContent ?? "");
    if (!texto) return null;
    verses.push({ vers, texto });
  }
  return verses;
}

/** The text nodes of the Bible text that a range touches, each with the part of it inside the range. */
function* scriptureParts(range: Range, root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!range.intersectsNode(node)) continue;
    const el = node.parentElement;
    const li = el?.closest<HTMLElement>("li[data-verse]");
    if (!el?.closest("[data-scripture]") || !li) continue;
    const len = node.textContent?.length ?? 0;
    const a = node === range.startContainer ? range.startOffset : 0;
    const b = node === range.endContainer ? range.endOffset : len;
    if (b > a) yield { node, a, b, verse: Number(li.dataset.verse) };
  }
}

/** The selected BLIVRE text, verse by verse. */
function readRange(range: Range, root: HTMLElement) {
  const parts = new Map<number, string>();
  for (const { node, a, b, verse } of scriptureParts(range, root)) {
    parts.set(verse, (parts.get(verse) ?? "") + (node.textContent ?? "").slice(a, b));
  }
  const verses = [...parts].filter(([, s]) => s.trim());
  if (!verses.length) return null;
  return { from: verses[0][0], to: verses[verses.length - 1][0], text: cleanQuote(verses.map(([, s]) => s).join(" ")) };
}

/** One range per piece of Bible text, so the highlight never paints the verse numbers or the counts. */
function scriptureRanges(range: Range, root: HTMLElement): Range[] {
  return [...scriptureParts(range, root)].map(({ node, a, b }) => {
    const r = document.createRange();
    r.setStart(node, a);
    r.setEnd(node, b);
    return r;
  });
}

/**
 * Wraps the chapter text. Selecting part of it opens a small bar. Its first row is the reader's notebook: highlight
 * the verses, write a note on them, keep them to memorise (whole verses, kept on this device; docs/CADERNO.md). Its
 * second row acts on the selected words: copy with the reference, share, save, explore the chapter's connections.
 * The selection is painted with the CSS Custom Highlight API where the browser has it (the native selection
 * otherwise); the text's HTML is never changed. Desktop: the bar floats over the selection. Phones: it sits above the
 * bottom navigation, clear of the system's selection menu.
 */
export function SelectionScope({
  slug,
  bookName,
  chapter,
  children,
}: {
  slug: string;
  bookName: string;
  chapter: number;
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [said, setSaid] = useState("");
  const [nb, setNb] = useState<Notebook | null>(null);
  // the colour row: open, with the colour the selected verses share (if they share one)
  const [marking, setMarking] = useState<{ cor: MarkColor | null } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  // what was done after the bar is gone (a note saved in its dialog)
  const [flash, setFlash] = useState<Note | null>(null);
  const pickedRef = useRef<Picked | null>(null);
  useLayoutEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

  // a browser that already has a notebook paints the chapter with it; the others load nothing
  useEffect(() => {
    let gone = false;
    const check = () => {
      try {
        if (!localStorage.getItem(CADERNO_KEY)) return;
      } catch {
        return;
      }
      loadNotebook().then(
        (loaded) => {
          if (!gone) setNb(loaded);
        },
        () => {},
      );
    };
    check();
    window.addEventListener("storage", check);
    window.addEventListener(CADERNO_EVENT, check);
    return () => {
      gone = true;
      window.removeEventListener("storage", check);
      window.removeEventListener(CADERNO_EVENT, check);
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 9000);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const hl = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";
    if (hl) el.dataset.hl = "";
    let dragging = false;
    let pressedBar = 0;
    let timer = 0;
    // Tab jumps into the bar once per selection, so it never traps the keyboard
    let offered = false;

    const paint = (range: Range | null) => {
      if (!hl) return;
      if (range) CSS.highlights.set(HL, new Highlight(...scriptureRanges(range, el)));
      else CSS.highlights.delete(HL);
    };
    const close = () => {
      paint(null);
      setPicked(null);
      setNote(null);
      setMarking(null);
    };
    const evaluate = () => {
      const sel = document.getSelection();
      const range = sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.getRangeAt(0) : null;
      if (!range || !range.intersectsNode(el)) {
        // a tap on the bar may clear the selection on touch screens; the bar keeps what was picked
        if (Date.now() - pressedBar > 800 && !bar.current?.contains(document.activeElement)) close();
        return;
      }
      if (dragging) return;
      const got = readRange(range, el);
      if (!got) return close();
      const box = el.getBoundingClientRect();
      const r = range.getBoundingClientRect();
      // above the selection; below it when the top is near the header, kept inside the window for long selections
      const below = r.top < BAR_ROOM;
      const y = below ? Math.min(r.bottom, window.innerHeight - BAR_ROOM) + 10 : r.top - 10;
      const prev = pickedRef.current;
      const changed = !prev || prev.from !== got.from || prev.to !== got.to || prev.text !== got.text;
      if (changed) {
        offered = false;
        setNote(null);
        setMarking(null);
      }
      if (!prev) setSaid(`Trecho selecionado: ${passageRef(bookName, chapter, got.from, got.to)}. A tecla Tab leva às ações.`);
      setPicked({
        ...got,
        top: Math.round(y - box.top),
        left: Math.round(r.left + r.width / 2 - box.left),
        below,
        float: window.matchMedia(FLOAT).matches,
      });
    };
    const onChange = () => {
      const sel = document.getSelection();
      const range = sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.getRangeAt(0) : null;
      if (range && range.intersectsNode(el)) paint(range);
      else if (Date.now() - pressedBar > 800) paint(null);
      window.clearTimeout(timer);
      timer = window.setTimeout(evaluate, 140);
    };
    const onDown = (e: PointerEvent) => {
      if (bar.current?.contains(e.target as Node)) {
        pressedBar = Date.now();
        return;
      }
      if (el.contains(e.target as Node)) dragging = true;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(evaluate, 10);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!pickedRef.current) return;
      if (e.key === "Escape") {
        const inBar = bar.current?.contains(document.activeElement);
        document.getSelection()?.removeAllRanges();
        close();
        if (inBar) focusVerse(el, pickedRef.current.from);
      } else if (e.key === "Tab" && !e.shiftKey && !offered && !bar.current?.contains(document.activeElement)) {
        const first = bar.current?.querySelector<HTMLElement>("button, a");
        if (first) {
          e.preventDefault();
          offered = true;
          first.focus();
        }
      }
    };
    document.addEventListener("selectionchange", onChange);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", evaluate);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", evaluate);
      paint(null);
    };
  }, [bookName, chapter]);

  // a route hidden by the router (Activity) closes its bar, so it never comes back open
  useLayoutEffect(
    () => () => {
      setPicked(null);
      setNote(null);
      setMarking(null);
      setEditing(null);
      setFlash(null);
    },
    [],
  );

  // keep the floating bar inside the text column
  useLayoutEffect(() => {
    const b = bar.current;
    const el = root.current;
    if (!b || !el || !picked?.float) return;
    const half = b.offsetWidth / 2;
    const max = el.clientWidth - half;
    b.style.left = `${Math.round(Math.min(Math.max(picked.left, half), Math.max(half, max)))}px`;
  }, [picked]);

  const ref = picked ? passageRef(bookName, chapter, picked.from, picked.to) : "";
  const tell = (n: Note) => {
    setNote(n);
    setSaid(n.text);
  };

  async function copy() {
    if (!picked) return;
    try {
      await navigator.clipboard.writeText(quoteWithRef(picked.text, ref));
      tell({ text: "Copiado com a referência." });
    } catch {
      tell({ text: "Não deu para copiar neste navegador." });
    }
  }

  async function share() {
    if (!picked) return;
    const url = `${location.origin}/${slug}/${chapter}/${picked.from}${picked.from === picked.to ? textFragment(picked.text) : ""}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: ref, text: quoteWithRef(picked.text, ref), url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      tell({ text: "Link copiado." });
    } catch {
      tell({ text: "Não deu para compartilhar neste navegador." });
    }
  }

  function save() {
    if (!picked) return;
    const ok = writeSalvos(
      addSalvo(readSalvos(), {
        id: newId(),
        ref,
        path: `/${slug}/${chapter}/${picked.from}`,
        livro: slug,
        cap: chapter,
        de: picked.from,
        ate: picked.to,
        texto: picked.text,
        salvoEm: new Date().toISOString(),
      }),
    );
    tell(ok ? { text: "Salvo neste aparelho.", saved: true, href: "/salvos", go: "Ver salvos" } : { text: "Este navegador não deixa guardar trechos aqui." });
  }

  /** The notebook module, or null after saying that it could not be fetched. */
  async function open(): Promise<Notebook | null> {
    try {
      const loaded = await loadNotebook();
      setNb(loaded);
      return loaded;
    } catch {
      tell({ text: "Não foi possível abrir o caderno. Confira a conexão e tente de novo." });
      return null;
    }
  }

  // "Grifar" marks the whole verses of the selection in the colour last used, and opens the colours. On verses
  // already highlighted it only opens the colours, so one more tap changes the colour or takes the highlight away.
  async function mark(cor?: MarkColor) {
    const el = root.current;
    if (!picked || !el) return;
    const loaded = await open();
    if (!loaded) return;
    const verses = verseTexts(el, picked.from, picked.to);
    if (!verses) return tell({ text: "Não foi possível ler este trecho na página." });
    const before = loaded.chapterState(slug, chapter);
    const colours = new Set(verses.map((v) => before.marks.get(v.vers) ?? null));
    const shared = colours.size === 1 ? [...colours][0] : null;
    if (cor === undefined && !colours.has(null)) {
      setMarking({ cor: shared });
      return tell({ text: "Este trecho já está grifado. Escolha outra cor ou tire o grifo." });
    }
    const chosen = cor ?? before.cor;
    const result = loaded.markPassage(slug, chapter, verses, chosen);
    setMarking(result.ok ? { cor: chosen } : null);
    const done = `${verses.length === 1 ? "Versículo grifado" : `${verses.length} versículos grifados`} em ${loaded.MARK_LABEL[chosen].toLowerCase()}, neste aparelho.`;
    tell(result.ok ? { text: done, saved: true } : { text: result.message });
  }

  async function unmark() {
    if (!picked) return;
    const loaded = await open();
    if (!loaded) return;
    const verses = Array.from({ length: picked.to - picked.from + 1 }, (_, i) => picked.from + i);
    const result = loaded.unmarkPassage(slug, chapter, verses);
    setMarking(null);
    tell({ text: result.message });
  }

  // the note dialog takes the place of the bar: the selection ends, and what was saved is said in a flash
  async function annotate() {
    const el = root.current;
    if (!picked || !el) return;
    const { from, to } = picked;
    const loaded = await open();
    if (!loaded) return;
    const verses = verseTexts(el, from, to);
    if (!verses) return tell({ text: "Não foi possível ler este trecho na página." });
    const text = verses.map((v) => v.texto).join(" ");
    // said before the dialog opens: nobody writes a note that cannot be kept
    if (text.length > loaded.MAX_TEXT_CHARS) return tell({ text: "Trecho longo demais para uma anotação. Selecione menos versículos." });
    document.getSelection()?.removeAllRanges();
    if (typeof CSS !== "undefined" && "highlights" in CSS) CSS.highlights.delete(HL);
    setPicked(null);
    setNote(null);
    setMarking(null);
    setFlash(null);
    setEditing({ from, to, text });
  }

  async function memorise() {
    const el = root.current;
    if (!picked || !el) return;
    const loaded = await open();
    if (!loaded) return;
    const verses = verseTexts(el, picked.from, picked.to);
    if (!verses) return tell({ text: "Não foi possível ler este trecho na página." });
    const result = loaded.memorise({ livro: slug, cap: chapter, de: picked.from, ate: picked.to }, verses.map((v) => v.texto).join(" "));
    setMarking(null);
    tell(result.ok ? { text: result.message, saved: result.changed, href: "/caderno#decorar", go: "Abrir o caderno" } : { text: result.message });
  }

  function closeEditor(message?: string, draft?: boolean) {
    const left = editing;
    const from = left?.from;
    setEditing(null);
    if (message) {
      setSaid(message);
      setFlash({ text: message, saved: true, href: "/caderno#anotacoes", go: "Abrir o caderno" });
    } else if (draft && left) {
      // left without saving: the words wait as a draft, one tap away
      const kept = "Você saiu sem guardar. O rascunho fica nesta aba.";
      setSaid(kept);
      setFlash({ text: kept, go: "Continuar a anotação", onGo: () => { setFlash(null); setEditing(left); } });
    }
    // the dialog gave the focus back to a bar that is gone: the verse the note is about takes it
    if (from) requestAnimationFrame(() => root.current && focusVerse(root.current, from, true));
  }

  return (
    <div ref={root} className={styles.scope}>
      {children}
      <p className="visually-hidden" role="status">
        {said}
      </p>
      {picked && (
        <div
          ref={bar}
          data-selection-bar=""
          role="group"
          aria-label={`Ações para ${ref}`}
          className={styles.bar}
          data-float={picked.float || undefined}
          data-below={picked.below || undefined}
          style={picked.float ? { top: picked.top, left: picked.left } : undefined}
          onMouseDown={(e) => {
            // keep the selection (and the page focus) when a mouse presses a button of the bar
            if ((e.target as HTMLElement).closest("button")) e.preventDefault();
          }}
        >
          <p className={styles.ref}>{ref}</p>
          <div className={styles.actions}>
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} data-main="" onClick={() => mark()} aria-expanded={!!marking} title="Grifar os versículos">
              <CadernoIcon name="mark" />
              <span>
                Grifar<span className="visually-hidden"> os versículos</span>
              </span>
            </button>
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} data-main="" onClick={annotate} aria-haspopup="dialog" title="Anotar nos versículos">
              <CadernoIcon name="note" />
              <span>
                Anotar<span className="visually-hidden"> nos versículos</span>
              </span>
            </button>
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} data-main="" onClick={memorise} title="Guardar para decorar">
              <CadernoIcon name="review" />
              <span>
                Decorar<span className="visually-hidden"> os versículos</span>
              </span>
            </button>
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} onClick={copy} title="Copiar com referência">
              <Icon name="copy" />
              <span>
                Copiar<span className="visually-hidden"> com referência</span>
              </span>
            </button>
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} onClick={share}>
              <Icon name="share" />
              <span>Compartilhar</span>
            </button>
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} onClick={save} title="Salvar trecho">
              <Icon name="bookmark" />
              <span>
                Salvar<span className="visually-hidden"> trecho</span>
              </span>
            </button>
            <Link href={`/explorar/${slug}/${chapter}`} className={`bc-button bc-button--ghost ${styles.action}`} title="Explorar conexões">
              <Icon name="explore" />
              <span>
                Explorar<span className="visually-hidden"> conexões</span>
              </span>
            </Link>
          </div>
          <button
            type="button"
            className={`bc-icon-button ${styles.close}`}
            aria-label="Fechar"
            onClick={() => {
              document.getSelection()?.removeAllRanges();
              if (typeof CSS !== "undefined" && "highlights" in CSS) CSS.highlights.delete(HL);
              setPicked(null);
              setNote(null);
              setMarking(null);
            }}
          >
            <Icon name="close" />
          </button>
          {marking && nb && (
            <div className={styles.colours} role="group" aria-label="Cor do grifo">
              {nb.MARK_COLORS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  className={styles.swatch}
                  data-cor={cor}
                  aria-pressed={marking.cor === cor}
                  aria-label={`Grifar em ${nb.MARK_LABEL[cor].toLowerCase()}`}
                  title={nb.MARK_LABEL[cor]}
                  onClick={() => mark(cor)}
                />
              ))}
              <button type="button" className={`bc-button bc-button--ghost ${styles.unmark}`} onClick={unmark}>
                Tirar grifo
              </button>
            </div>
          )}
          {note && <Said note={note} />}
        </div>
      )}
      {nb && (
        <nb.ChapterNotebook scope={root} slug={slug} bookName={bookName} chapter={chapter} onEdit={(n) => setEditing({ from: n.de, to: n.ate, text: n.trecho })} />
      )}
      {editing && nb && (
        <nb.NoteDialog
          key={`${slug}/${chapter}/${editing.from}-${editing.to}`}
          passage={{ livro: slug, cap: chapter, de: editing.from, ate: editing.to }}
          label={passageRef(bookName, chapter, editing.from, editing.to)}
          trecho={editing.text}
          onClose={closeEditor}
        />
      )}
      {flash && !picked && (
        <div className={styles.flash} data-caderno-flash="">
          <Said note={flash} />
          <button type="button" className={`bc-icon-button ${styles.flashClose}`} aria-label="Fechar aviso" onClick={() => setFlash(null)}>
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}

function Said({ note }: { note: Note }) {
  return (
    <p className={styles.note}>
      {note.saved && <Icon name="check" className={`bc-icon ${styles.noteIcon}`} />}
      {note.text}
      {note.href && (
        <>
          {" "}
          <Link href={note.href} prefetch={false}>
            {note.go}
          </Link>
        </>
      )}
      {note.onGo && (
        <button type="button" className={styles.noteAct} onClick={note.onGo}>
          {note.go}
        </button>
      )}
    </p>
  );
}
