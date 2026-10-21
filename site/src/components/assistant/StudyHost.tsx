"use client";

import { useEffect, useState, type ComponentType } from "react";
import type { VerseDialogProps } from "./VerseDialog";
import styles from "./StudyHost.module.css";

export type VerseAction = { path: string; label: string; opener: HTMLAnchorElement; kind: "study" | "share" };

/** Keep new tabs, downloads and modified clicks as ordinary browser navigation. */
function ordinaryLink(event: MouseEvent, selector: string): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return null;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(selector) : null;
  return link && !link.hasAttribute("download") && (!link.target || link.target === "_self") ? link : null;
}
const valid = (value = "") => /^[a-z0-9-]+\/[1-9]\d{0,2}\/[1-9]\d{0,2}$/.test(value);
export function studyLinkFromEvent(event: MouseEvent): HTMLAnchorElement | null {
  const link = ordinaryLink(event, "a[data-study-ref]");
  return link && valid(link.dataset.studyRef) ? link : null;
}
export function verseActionFromEvent(event: MouseEvent): VerseAction | null {
  const opener = ordinaryLink(event, "a[data-study-ref], a[data-share-ref]");
  if (!opener) return null;
  const kind = opener.dataset.shareRef === undefined ? "study" : "share";
  const path = kind === "share" ? opener.dataset.shareRef : opener.dataset.studyRef;
  return valid(path) ? { path: path!, label: opener.dataset.studyLabel ?? opener.dataset.shareLabel ?? "Passagem", opener, kind } : null;
}

/** Only the click delegate is initial JS. Dialog, sharing and chat load on demand. */
export function StudyHost() {
  const [entry, setEntry] = useState<VerseAction | null>(null);
  const [Dialog, setDialog] = useState<ComponentType<VerseDialogProps> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let opener: HTMLAnchorElement | undefined;
    const close = () => setEntry(null);
    const click = (event: MouseEvent) => {
      const next = verseActionFromEvent(event);
      if (!next) {
        if (ordinaryLink(event, "a[href]")) close();
        return;
      }
      if (typeof HTMLDialogElement === "undefined" || !HTMLDialogElement.prototype.showModal) return;
      event.preventDefault();
      event.stopPropagation();
      opener = next.opener;
      setEntry(next);
      setFailed(false);
      void import("./VerseDialog").then((module) => setDialog(() => module.VerseDialog)).catch(() => setFailed(true));
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
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", close);
      document.removeEventListener("keydown", key);
    };
  }, []);
  if (!entry) return null;
  return Dialog ? <Dialog key={`${entry.kind}:${entry.path}`} entry={entry} onClose={() => setEntry(null)} />
    : <div data-verse-opening="" className={styles.status} role={failed ? "alert" : "status"}>{failed
      ? <>Não foi possível abrir. <a href={entry.opener.href}>Abrir em uma página</a></>
      : entry.kind === "share" ? "Abrindo compartilhamento…" : "Abrindo o estudo…"}
      <button type="button" aria-label="Fechar aviso" onClick={() => { entry.opener.focus({ preventScroll: true }); setEntry(null); }}>×</button>
    </div>;
}
