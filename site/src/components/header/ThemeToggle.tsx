"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

// Noite is the default theme; the choice is stored on the device and applied before paint by THEME_SCRIPT.
type Theme = "noite" | "dia";
const THEME_COLOR: Record<Theme, string> = { noite: "#051219", dia: "#f8f4ed" };

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t==="dia"||t==="noite"){document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dia"?"${THEME_COLOR.dia}":"${THEME_COLOR.noite}")}}catch(e){}})()`;

/** The theme goes on <html> and on <body>: the [data-theme] rules then match <body> itself, so the browser recomputes
 *  it and everything that inherits from it, rather than trusting values it inherited before the switch. */
function apply(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  document.body.setAttribute("data-theme", t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[t]);
}
function read(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dia" ? "dia" : "noite";
}
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribe, read, () => "noite");
  const next: Theme = theme === "noite" ? "dia" : "noite";
  // A document rendered on the client never ran THEME_SCRIPT: Next.js sends the 404 of a reading route ("/x") as an
  // empty shell that the browser fills in. Apply the stored choice there too, before the first paint.
  useLayoutEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("theme");
    } catch {}
    apply(stored === "dia" || stored === "noite" ? stored : read());
  }, []);
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === "noite" ? "Tema Noite. Mudar para Dia" : "Tema Dia. Mudar para Noite"}
      onClick={() => {
        apply(next);
        try {
          localStorage.setItem("theme", next);
        } catch {}
      }}
    >
      {theme === "noite" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
