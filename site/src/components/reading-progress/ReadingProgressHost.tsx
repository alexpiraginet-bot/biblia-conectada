"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./controls.module.css";

export type ReadingFeedback = { message: string; undo?: () => Promise<string> };
type Controller = ReturnType<typeof import("./reading-controller").startReadingProgress>;

/** The catalog, persistence and observer stay out of the initial site bundle. */
export function ReadingProgressHost() {
  const [feedback, setFeedback] = useState<ReadingFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<Controller | null>(null);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => { if (!document.activeElement?.closest("[data-reading-feedback]")) setFeedback(null); }, 12_000);
    return () => clearTimeout(timer);
  }, [feedback]);
  useEffect(() => {
    let disposed = false;
    let pending: Promise<Controller | null> | null = null;
    const load = () => {
      if (controller.current) return Promise.resolve(controller.current);
      if (!pending) pending = import("./reading-controller").then(module => {
        if (disposed) return null;
        return controller.current = module.startReadingProgress(setFeedback);
      }).catch(() => { if (!disposed) setFeedback({ message: "Não foi possível abrir suas marcações. Tente novamente." }); return null; }).finally(() => { pending = null; });
      return pending;
    };
    const check = () => {
      try { if (localStorage.getItem("bc:reading-progress:v1")) void load(); } catch { /* Explicit use shows the storage error. */ }
    };
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("button[data-reading-toggle], button[data-reading-complete], button[data-reading-automatic]") : null;
      if (!target || target.disabled || target.getAttribute("aria-busy") === "true") return;
      event.preventDefault();
      target.setAttribute("aria-busy", "true");
      void load().then(module => module?.handleAction(target)).finally(() => target.removeAttribute("aria-busy"));
    };
    document.addEventListener("click", click);
    window.addEventListener("storage", check);
    window.addEventListener("bc:reading-progress", check);
    check();
    return () => { disposed = true; document.removeEventListener("click", click); window.removeEventListener("storage", check); window.removeEventListener("bc:reading-progress", check); controller.current?.stop(); controller.current = null; };
  }, []);

  return <>
    <noscript><style>{"[data-reading-toggle], [data-reading-complete], [data-reading-automatic] { display: none !important; }"}</style></noscript>
    {feedback && <div className={styles.toast} data-reading-feedback>
      <span role="status">{feedback.message}</span>
      {feedback.undo && <button type="button" disabled={busy} onClick={async () => {
        setBusy(true);
        try { setFeedback({ message: await feedback.undo!() }); } finally { setBusy(false); }
      }}>Desfazer</button>}
      <button type="button" aria-label="Fechar aviso de leitura" disabled={busy} onClick={() => setFeedback(null)}>×</button>
    </div>}
  </>;
}
