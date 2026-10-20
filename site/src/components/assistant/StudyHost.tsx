"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import type { StudyOverlayProps } from "./StudyOverlay";
import styles from "./StudyOverlay.module.css";

/** Keep browser conventions (new tab, modifiers, downloads) on ordinary links. */
function ordinaryLink(event: MouseEvent, selector: string): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return null;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(selector) : null;
  return link && !link.hasAttribute("download") && (!link.target || link.target === "_self") ? link : null;
}
export function studyLinkFromEvent(event: MouseEvent): HTMLAnchorElement | null {
  const link = ordinaryLink(event, "a[data-study-ref]");
  return link && /^[a-z0-9-]+\/[1-9]\d{0,2}\/[1-9]\d{0,2}$/.test(link.dataset.studyRef ?? "") ? link : null;
}

/** Only this small shell is initial JS. Bible validation, data and chat load after an explicit click. */
export function StudyHost() {
  const [entry, setEntry] = useState<{ path: string; label: string; opener: HTMLAnchorElement } | null>(null);
  const [Overlay, setOverlay] = useState<ComponentType<StudyOverlayProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => { dialog.current?.close(); setEntry(null); };

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link = studyLinkFromEvent(event);
      if (!link) {
        const navigation = ordinaryLink(event, "a[href]");
        if (navigation && dialog.current?.contains(navigation)) { dialog.current.close(); setEntry(null); }
        return;
      }
      if (!dialog.current?.showModal) return;
      event.preventDefault();
      event.stopPropagation(); // Capture runs before Next Link's delegated navigation.
      setEntry({ path: link.dataset.studyRef!, label: link.dataset.studyLabel ?? "Estudo da passagem", opener: link });
      setFailed(false);
      void import("./StudyOverlay").then((module) => setOverlay(() => module.StudyOverlay)).catch(() => setFailed(true));
    };
    const navigation = () => { dialog.current?.close(); setEntry(null); };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", navigation);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", navigation);
    };
  }, []);

  useLayoutEffect(() => {
    const box = dialog.current;
    if (!entry || !box) return;
    const body = document.body, root = document.documentElement;
    const href = window.location.href;
    const x = window.scrollX, y = window.scrollY, width = root.clientWidth;
    const keys = ["position", "top", "left", "width"] as const;
    const previous = keys.map((key) => body.style[key]);
    const overflow = root.style.overflow;
    // Fixed body also prevents scroll chaining on iOS; restore only properties owned by this modal.
    Object.assign(body.style, { position: "fixed", top: `${-y}px`, left: `${-x}px`, width: `${width}px` });
    root.style.overflow = "hidden";
    box.showModal();
    return () => {
      if (box.open) box.close();
      keys.forEach((key, index) => { body.style[key] = previous[index]; });
      root.style.overflow = overflow;
      if (window.location.href === href) {
        window.scrollTo({ left: x, top: y, behavior: "instant" });
        if (entry.opener.isConnected && entry.opener.getClientRects().length) entry.opener.focus({ preventScroll: true });
      }
    };
  }, [entry]);

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="study-overlay-title"
    onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => setEntry(null)}>
    <header className={styles.header}>
      <div><span>Converse sobre a passagem</span><h2 id="study-overlay-title">{entry?.label ?? "Estudo da passagem"}</h2></div>
      <button type="button" aria-label="Fechar estudo e voltar à leitura" onClick={close}>×</button>
    </header>
    <div className={styles.body}>
      {entry && (failed ? <p role="alert">Não foi possível abrir o estudo. <a href={`/assistente?ref=${entry.path}`}>Abrir em uma página</a></p>
        : Overlay ? <Overlay key={entry.path} path={entry.path} /> : <p role="status">Abrindo o estudo…</p>)}
    </div>
  </dialog>;
}
