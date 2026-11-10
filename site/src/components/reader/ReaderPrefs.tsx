"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import {
  nextTextStep, parseReaderPrefs, READER_PREFS_EVENT, READER_PREFS_KEY, readerAttributes, serializeReaderPrefs, TEXT_STEPS, type ReaderMode, type ReaderPrefs as Prefs,
} from "@/lib/reader-prefs";
import "./reader-prefs.css";
import styles from "./reader-prefs.module.css";

const MODES: { id: ReaderMode; label: string; says: string }[] = [
  { id: "estudo", label: "Estudo", says: "O texto com as ligações e as ações de cada versículo." },
  { id: "leitura", label: "Leitura", says: "Só o texto e os números dos versículos." },
];

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === READER_PREFS_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READER_PREFS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READER_PREFS_EVENT, callback);
  };
}
// A choice the browser refused to keep (storage blocked or full): it holds while the tab is open, on every chapter,
// and the control says so. Module state, so the control of the next chapter starts from it and not from the defaults.
let unkept: string | null = null;

// the stored string: compares by value, and "" when there is none or the browser refuses to say; a choice that was
// not kept comes with a "!" in front
function stored(): string {
  if (unkept !== null) return `!${unkept}`;
  try {
    return window.localStorage.getItem(READER_PREFS_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Puts the preferences on <html>, as the head's script did when the page loaded. */
function apply(prefs: Prefs) {
  for (const [name, value] of Object.entries(readerAttributes(prefs))) {
    if (value === null) document.documentElement.removeAttribute(name);
    else document.documentElement.setAttribute(name, value);
  }
}

/** Applies at once and stores. When the browser will not keep the choice, it is kept for the tab. */
function choose(prefs: Prefs) {
  apply(prefs);
  const raw = serializeReaderPrefs(prefs);
  try {
    if (raw === null) window.localStorage.removeItem(READER_PREFS_KEY);
    else window.localStorage.setItem(READER_PREFS_KEY, raw);
    if ((window.localStorage.getItem(READER_PREFS_KEY) ?? null) !== raw) throw new Error("not kept");
    unkept = null;
  } catch {
    unkept = raw ?? "";
  }
  window.dispatchEvent(new Event(READER_PREFS_EVENT));
}

/**
 * The two reading choices in the chapter's header: the mode (Estudo or Leitura) and the size of the Bible text.
 * Server and first client render show the defaults; the stored choice arrives with hydration, already painted by
 * the head's script, so nothing moves.
 */
export function ReaderPrefs() {
  const raw = useSyncExternalStore(subscribe, stored, () => "");
  const unsaved = raw.startsWith("!");
  const prefs = parseReaderPrefs(unsaved ? raw.slice(1) : raw);
  const at = TEXT_STEPS.indexOf(prefs.texto as (typeof TEXT_STEPS)[number]);
  const size = `Tamanho ${at + 1} de ${TEXT_STEPS.length}`;
  const hint = useId();
  const set = choose;
  // The page follows the control, wherever the change came from: this tab, another tab ("storage") or a chapter
  // the router kept hidden. On the first run it repeats what the head's script already did.
  useEffect(() => {
    apply({ modo: prefs.modo, texto: prefs.texto });
  }, [prefs.modo, prefs.texto]);

  return (
    <div className={styles.prefs} data-reader-prefs="">
      <div
        className={`bc-segmented ${styles.modes}`}
        role="radiogroup"
        aria-label="Modo de leitura"
        onKeyDown={(event) => {
          const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
          if (!step) return;
          event.preventDefault();
          const index = (MODES.findIndex((m) => m.id === prefs.modo) + step + MODES.length) % MODES.length;
          set({ ...prefs, modo: MODES[index].id });
          (event.currentTarget.querySelectorAll("button")[index] as HTMLButtonElement | undefined)?.focus();
        }}
      >
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={m.id === prefs.modo} aria-describedby={`${hint}-${m.id}`} tabIndex={m.id === prefs.modo ? 0 : -1} title={m.says} onClick={() => set({ ...prefs, modo: m.id })}>
            {m.label}
            <span id={`${hint}-${m.id}`} className="visually-hidden">
              {m.says}
            </span>
          </button>
        ))}
      </div>
      <div className={styles.sizes} role="group" aria-label="Tamanho do texto bíblico">
        <button type="button" className={`bc-button bc-button--secondary ${styles.size}`} aria-label="Diminuir o texto" title="Diminuir o texto" disabled={at <= 0} onClick={() => set({ ...prefs, texto: nextTextStep(prefs.texto, -1) })}>
          <span className={styles.small}>A</span>−
        </button>
        <button type="button" className={`bc-button bc-button--secondary ${styles.size}`} aria-label="Aumentar o texto" title="Aumentar o texto" disabled={at >= TEXT_STEPS.length - 1} onClick={() => set({ ...prefs, texto: nextTextStep(prefs.texto, 1) })}>
          <span className={styles.large}>A</span>+
        </button>
        <span className="visually-hidden" role="status">
          {size}
        </span>
      </div>
      {unsaved && <p className={styles.says}>Este navegador não guardou a escolha: ela vale enquanto esta aba estiver aberta.</p>}
      <noscript>
        <style>{"[data-reader-prefs] { display: none !important; }"}</style>
      </noscript>
    </div>
  );
}
