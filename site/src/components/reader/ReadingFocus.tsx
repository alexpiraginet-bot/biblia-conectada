"use client";

import { useLayoutEffect, useId, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { DEFAULT_FOCUS_PREFERENCES, FOCUS_PREFERENCES_KEY, parseFocusPreferences, type FocusPreferences } from "./focus-preferences";
import styles from "./reading-focus.module.css";

// Only the current reading surface opens. Next may keep previous routes mounted but hidden.
let activeScope: string | null = null;
let nextScope: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const notify = () => listeners.forEach((fn) => fn());
const serverSnapshot = () => false;
let savedOverflow = "";
const scrollLocks = new Set<HTMLDialogElement>();
let preferencesLoaded = false;
let currentPreferences = DEFAULT_FOCUS_PREFERENCES;
const preferencesSnapshot = () => currentPreferences;
const serverPreferences = () => DEFAULT_FOCUS_PREFERENCES;
function loadPreferences() {
  if (preferencesLoaded) return;
  preferencesLoaded = true;
  try { currentPreferences = parseFocusPreferences(localStorage.getItem(FOCUS_PREFERENCES_KEY)); }
  catch { /* Keep this session's settings when storage is unavailable. */ }
}

export function ReadingFocus({ scope, title, edition, credit, children }: {
  scope: string; title: string; edition: string; credit: string; children: ReactNode;
}) {
  const active = useSyncExternalStore(subscribe, () => activeScope === scope || nextScope === scope, serverSnapshot);
  const preferences = useSyncExternalStore(subscribe, preferencesSnapshot, serverPreferences);
  const dialog = useRef<HTMLDialogElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const entry = useRef<HTMLButtonElement>(null);
  const anchor = useRef<string | null>(null);
  const headingId = useId();
  const settingsId = useId();

  function open() {
    const verses = root.current?.querySelectorAll<HTMLElement>("[data-reading-ref]");
    anchor.current = [...(verses ?? [])].find((node) => {
      const r = node.getBoundingClientRect();
      return r.bottom > 80 && r.top < innerHeight;
    })?.dataset.readingRef ?? null;
    loadPreferences();
    activeScope = scope;
    nextScope = null;
    notify();
  }

  function close() {
    const verses = dialog.current?.querySelectorAll<HTMLElement>("[data-reading-ref]");
    const top = dialog.current?.querySelector("[data-reading-focus-toolbar]")?.getBoundingClientRect().bottom ?? 64;
    anchor.current = [...(verses ?? [])].find((node) => {
      const r = node.getBoundingClientRect();
      return r.bottom > top && r.top < innerHeight;
    })?.dataset.readingRef ?? anchor.current;
    activeScope = null;
    nextScope = null;
    notify();
    requestAnimationFrame(() => {
      const target = [...(root.current?.querySelectorAll<HTMLElement>("[data-reading-ref]") ?? [])]
        .find((node) => node.dataset.readingRef === anchor.current);
      target?.scrollIntoView({ block: "center", behavior: "instant" });
      entry.current?.focus({ preventScroll: true });
    });
  }

  function update(patch: Partial<FocusPreferences>) {
    const value = { ...preferences, ...patch };
    currentPreferences = value;
    notify();
    try { localStorage.setItem(FOCUS_PREFERENCES_KEY, JSON.stringify(value)); } catch { /* Do not block reading in private mode. */ }
  }

  useLayoutEffect(() => {
    if (!active) return;
    const el = dialog.current;
    if (!el) return;
    if (nextScope === scope) { activeScope = scope; nextScope = null; notify(); }
    el.showModal();
    if (!scrollLocks.size) savedOverflow = document.body.style.overflow;
    scrollLocks.add(el);
    document.body.style.overflow = "hidden";
    // Verse numbers retain their quiet visual reference, without an interactive link in focus mode.
    el.querySelectorAll<HTMLElement>("[data-reading-verse-number]").forEach((node) => { node.inert = true; });
    const target = [...el.querySelectorAll<HTMLElement>("[data-reading-ref]")]
      .find((node) => node.dataset.readingRef === anchor.current);
    target?.scrollIntoView({ block: "center", behavior: "instant" });
    return () => {
      el.close(); scrollLocks.delete(el);
      if (!scrollLocks.size) document.body.style.overflow = savedOverflow;
    };
  }, [active, scope]);

  const content = <div className={active ? styles.content : undefined}>{children}</div>;
  return <div ref={root} className={styles.root}>
    <button ref={entry} type="button" className={styles.entry} onClick={open} aria-haspopup="dialog">
      <span aria-hidden="true">Aa</span> Modo leitura
    </button>
    {active ? <dialog ref={dialog} className={styles.dialog} data-reading-focus-dialog data-paper={preferences.paper}
      aria-labelledby={headingId} style={{ "--reading-size": `${preferences.size / 16}rem` } as CSSProperties}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onKeyDown={(event) => { event.stopPropagation(); }}
      onClickCapture={(event) => {
        const link = (event.target as Element).closest<HTMLAnchorElement>('a[rel="next"], a[rel="prev"]');
        if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          nextScope = new URL(link.href).pathname;
          // The new chapter picks up focus mode when mounted; the current text stays visible while it loads.
        }
      }}>
      <header className={styles.toolbar} data-reading-focus-toolbar>
        <button type="button" onClick={close} className={styles.exit}>← <span>Sair da leitura</span></button>
        <span className={styles.runningTitle}>{title}</span>
        <details className={styles.settings}>
          <summary aria-controls={settingsId} aria-label="Ajustar leitura">Aa</summary>
          <div className={styles.settingsPanel} id={settingsId}>
            <span>Tamanho do texto</span>
            <div className={styles.sizeControls}>
              <button type="button" aria-label="Diminuir texto" disabled={preferences.size <= 18} onClick={() => update({ size: preferences.size - 1 })}>A−</button>
              <output aria-live="polite">{preferences.size}</output>
              <button type="button" aria-label="Aumentar texto" disabled={preferences.size >= 28} onClick={() => update({ size: preferences.size + 1 })}>A+</button>
            </div>
            <fieldset><legend>Cor da página</legend>{([['paper', 'Papel'], ['sepia', 'Sépia'], ['night', 'Noite']] as const).map(([paper, label]) => <button type="button" key={paper} aria-pressed={preferences.paper === paper} onClick={() => update({ paper })}>{label}</button>)}</fieldset>
          </div>
        </details>
      </header>
      <div className={styles.page}>
        <div className={styles.heading}><p>{edition}</p><h1 id={headingId}>{title}</h1></div>
        {content}
        <footer className={styles.credit}>{credit}</footer>
      </div>
    </dialog> : content}
  </div>;
}
