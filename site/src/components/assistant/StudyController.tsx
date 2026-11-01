"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { VerseDialogProps } from "./VerseDialog";
import { ordinaryLink, verseActionFromEvent, type VerseAction } from "./verse-intent-events";
import type {} from "./verse-intent-script";
import styles from "./StudyHost.module.css";

/** The bootstrap owns pending clicks until this on-demand controller is listening. */
export function StudyController() {
  const [entry, setEntry] = useState<VerseAction | null>(null);
  const [Dialog, setDialog] = useState<ComponentType<VerseDialogProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let opener: HTMLAnchorElement | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const close = () => { clearTimeout(timer); setEntry(null); };
    const click = (event: MouseEvent) => {
      const next = verseActionFromEvent(event);
      if (!next) {
        if (ordinaryLink(event, "a[href]")) close();
        return;
      }
      if (typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) return;
      event.preventDefault();
      event.stopPropagation();
      // Switching actions inside the shared dialog must still return to the original reading link.
      if (!next.opener.closest("[data-verse-dialog]") || !opener?.isConnected) opener = next.opener;
      setEntry({ ...next, returnTo: opener });
      setFailed(false);
      clearTimeout(timer);
      timer = setTimeout(() => setFailed(true), 8000);
      void import("./VerseDialog").then((module) => {
        clearTimeout(timer); setDialog(() => module.VerseDialog);
      }).catch(() => { clearTimeout(timer); setFailed(true); });
    };
    const key = (event: KeyboardEvent) => {
      // An open dialog owns native Escape. While its chunk loads, consume the key so a reader panel stays open.
      if (event.key === "Escape" && document.querySelector("[data-verse-opening]")) {
        event.preventDefault(); event.stopPropagation(); close(); opener?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", close);
    document.addEventListener("keydown", key);
    window.__bcVerse?.ready();
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  if (!entry) return null;
  return Dialog ? <Dialog key={`${entry.kind}:${entry.path}`} entry={entry} onClose={() => setEntry(null)} />
    : <div data-verse-opening="" className={styles.status} role={failed ? "alert" : "status"}>{failed
      ? <>Não foi possível abrir. <a href={entry.opener.href}>Abrir em uma página</a></>
      : entry.kind === "share" ? "Abrindo compartilhamento…" : entry.kind === "connections" ? "Abrindo conexões…" : "Abrindo o estudo…"}
      <button type="button" aria-label="Fechar aviso" onClick={() => { (entry.returnTo ?? entry.opener).focus({ preventScroll: true }); setEntry(null); }}>×</button>
    </div>;
}
