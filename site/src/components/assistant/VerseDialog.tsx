"use client";

import { lazy, Suspense, useLayoutEffect, useRef, Component, type ReactNode } from "react";
import type { VerseAction } from "./StudyHost";
import styles from "./StudyOverlay.module.css";

const Study = lazy(() => import("./StudyOverlay").then((module) => ({ default: module.StudyOverlay })));
const Share = lazy(() => import("../sharing/VerseShare").then((module) => ({ default: module.VerseShare })));
const Connections = lazy(() => import("../reader/VerseConnections").then((module) => ({ default: module.VerseConnections })));
export type VerseDialogProps = { entry: VerseAction; onClose: () => void };

class ContentBoundary extends Component<{ children: ReactNode; href: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert">Não foi possível carregar. <a href={this.props.href}>Abrir em uma página</a></p> : this.props.children; }
}

/** Shared lifecycle preserves reading position and native focus trapping, including on iOS. */
export function VerseDialog({ entry, onClose }: VerseDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const box = dialog.current;
    if (!box) return;
    const body = document.body, root = document.documentElement;
    const href = window.location.href;
    const x = window.scrollX, y = window.scrollY, width = root.clientWidth;
    const keys = ["position", "top", "left", "width"] as const;
    const previous = keys.map((key) => body.style[key]);
    const overflow = root.style.overflow;
    Object.assign(body.style, { position: "fixed", top: `${-y}px`, left: `${-x}px`, width: `${width}px` });
    root.style.overflow = "hidden";
    box.showModal();
    return () => {
      if (box.open) box.close();
      keys.forEach((key, index) => { body.style[key] = previous[index]; });
      root.style.overflow = overflow;
      if (window.location.href === href) {
        window.scrollTo({ left: x, top: y, behavior: "instant" });
        const opener = entry.returnTo ?? entry.opener;
        if (opener.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
      }
    };
  }, [entry]);
  const sharing = entry.kind === "share";
  const connections = entry.kind === "connections";
  return <dialog ref={dialog} data-verse-dialog="" className={styles.dialog} aria-labelledby="verse-dialog-title"
    onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}>
    <header className={styles.header}>
      <div><span>{connections ? "Siga as conexões" : sharing ? "Leve esta palavra com você" : "Converse sobre a passagem"}</span><h2 id="verse-dialog-title">{entry.label}</h2></div>
      <button type="button" aria-label={connections ? "Fechar conexões e voltar à leitura" : sharing ? "Fechar compartilhamento e voltar à leitura" : "Fechar estudo e voltar à leitura"} onClick={onClose}>×</button>
    </header>
    <div className={styles.body}>
      <ContentBoundary href={entry.opener.href}><Suspense fallback={<p role="status">{sharing ? "Abrindo compartilhamento…" : "Carregando o texto da passagem…"}</p>}>
        {connections ? <Connections path={entry.path} /> : sharing ? <Share path={entry.path} /> : <Study path={entry.path} />}
      </Suspense></ContentBoundary>
    </div>
  </dialog>;
}
