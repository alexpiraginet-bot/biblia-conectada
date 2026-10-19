"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { SEARCH_EVENT, setSearchListening } from "./events";

// The palette's code (parser, book list, results) loads on first use, so it costs nothing on pages where nobody
// searches.
const SearchPalette = lazy(() => import("./SearchPalette"));

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

export function SearchHost() {
  const [query, setQuery] = useState<string | null>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const open = (q: string) => {
      opener.current = document.activeElement;
      setQuery(q);
    };
    const onOpen = (e: Event) => open(String((e as CustomEvent<string>).detail ?? ""));
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.defaultPrevented) return;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open("");
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !typing(e.target)) {
        e.preventDefault();
        open("");
      }
    };
    window.addEventListener(SEARCH_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    setSearchListening(true);
    return () => {
      window.removeEventListener(SEARCH_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
      setSearchListening(false);
    };
  }, []);

  if (query === null) return null;
  return (
    <Suspense fallback={null}>
      <SearchPalette
        initial={query}
        onClose={() => {
          setQuery(null);
          // the dialog already gave the focus back to whoever opened the search; this covers an opener the dialog
          // did not see (a shortcut pressed with the focus on the page)
          const el = opener.current as HTMLElement | null;
          setTimeout(() => {
            if (document.activeElement === document.body) el?.focus?.();
          }, 0);
        }}
      />
    </Suspense>
  );
}
