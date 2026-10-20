"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { addSalvo, cleanQuote, newId, passageRef, quoteWithRef, readSalvos, textFragment, writeSalvos } from "@/lib/salvos";
import "./highlight.css";
import styles from "./selection.module.css";

/** "Compartilhar": an arrow leaving a tray, drawn like the design system's icons (24px grid, 1.75 stroke); the set in
 *  components/icons.tsx has no share icon yet */
function ShareIcon() {
  return (
    <svg className="bc-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6" />
    </svg>
  );
}

type Picked = { from: number; to: number; text: string; top: number; left: number; below: boolean; float: boolean };
type Note = { text: string; saved?: boolean };

const HL = "bc-trecho";
const FLOAT = "(min-width: 64rem)";

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
 * Wraps the chapter text. Selecting part of it opens a small bar: copy with the reference, share, save on this
 * device, explore the chapter's connections. The selection is painted with the CSS Custom Highlight API where the
 * browser has it (the native selection otherwise); the text's HTML is never changed. Desktop: the bar floats over
 * the selection. Phones: it sits above the bottom navigation, clear of the system's selection menu.
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
  const pickedRef = useRef<Picked | null>(null);
  useLayoutEffect(() => {
    pickedRef.current = picked;
  }, [picked]);

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
      const below = r.top < 140;
      const y = below ? Math.min(r.bottom, window.innerHeight - 80) + 10 : r.top - 10;
      const prev = pickedRef.current;
      const changed = !prev || prev.from !== got.from || prev.to !== got.to || prev.text !== got.text;
      if (changed) {
        offered = false;
        setNote(null);
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
        if (inBar) el.querySelector<HTMLElement>(`li[data-verse="${pickedRef.current.from}"] a`)?.focus();
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
    tell(ok ? { text: "Salvo neste aparelho.", saved: true } : { text: "Este navegador não deixa guardar trechos aqui." });
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
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} onClick={copy} title="Copiar com referência">
              <Icon name="copy" />
              <span>
                Copiar<span className="visually-hidden"> com referência</span>
              </span>
            </button>
            <button type="button" className={`bc-button bc-button--ghost ${styles.action}`} onClick={share}>
              <ShareIcon />
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
            }}
          >
            <Icon name="close" />
          </button>
          {note && (
            <p className={styles.note}>
              {note.saved && <Icon name="check" className={`bc-icon ${styles.noteIcon}`} />}
              {note.text}
              {note.saved && (
                <>
                  {" "}
                  <Link href="/salvos">Ver salvos</Link>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
