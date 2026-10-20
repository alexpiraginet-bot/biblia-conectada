"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./reader.module.css";

type Card = { label: string; text: string; top: number; left: number };
const cache = new Map<string, Promise<string[]>>();
function chapterTexts(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => (r.ok ? (r.json() as Promise<string[]>) : Promise.reject(new Error(String(r.status)))));
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  return p;
}

// Desktop preview of a linked verse on hover or keyboard focus (design §6): stays open while the pointer is on it,
// closes with Escape, never replaces the link itself. Touch devices skip it and just follow the link.
export function HoverPreview({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<Card | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = root.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let current: HTMLAnchorElement | null = null;
    const show = (a: HTMLAnchorElement) => {
      current = a;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        // a verse link is /livro/capitulo/versiculo; its chapter text is public/data/text/livro/capitulo.json
        const m = /^\/([a-z0-9-]+)\/(\d+)\/(\d+)$/.exec(a.pathname);
        if (!m) return;
        const url = `/data/text/${m[1]}/${m[2]}.json`;
        const verse = Number(m[3]);
        try {
          const texts = await chapterTexts(url);
          if (current !== a) return;
          const r = a.getBoundingClientRect();
          const width = 340;
          setCard({
            // the reference itself, without the direction said only to screen readers
            label: [...a.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim(),
            text: texts[verse - 1] ?? "",
            top: r.bottom + 8,
            left: Math.max(8, Math.min(r.left, window.innerWidth - width - 16)),
          });
        } catch {
          /* the link still works; no preview */
        }
      }, 220);
    };
    const hide = () => {
      current = null;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCard(null), 160);
    };
    const over = (e: Event) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (a) show(a);
    };
    const out = (e: Event) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (a) hide();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setCard(null);
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerout", out);
    el.addEventListener("focusin", over);
    el.addEventListener("focusout", out);
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    return () => {
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerout", out);
      el.removeEventListener("focusin", over);
      el.removeEventListener("focusout", out);
      window.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide, { capture: true });
      window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <div ref={root}>
      {children}
      {card && (
        <div
          className={styles.preview}
          style={{ top: card.top, left: card.left }}
          role="tooltip"
          onPointerEnter={() => window.clearTimeout(timer.current)}
          onPointerLeave={() => setCard(null)}
        >
          <p className={styles.previewRef}>{card.label}</p>
          <p className={styles.previewText}>{card.text}</p>
        </div>
      )}
    </div>
  );
}
