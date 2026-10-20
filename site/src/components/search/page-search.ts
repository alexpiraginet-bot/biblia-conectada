"use client";

import { useEffect, type RefObject } from "react";
import { PAGE_SEARCH_ATTR as ATTR } from "./page-search-script";

// One search in view: the capa and /buscar have their own search field, so while it is on screen the top bar hides
// its own entry (app/globals.css, html[data-page-search]); once the field scrolls under the bar, the bar's entry comes
// back. Ctrl K, "/" and the Buscar tab work all the time.

/** Marks the page's own search field: `on` while it shows below the top bar. */
export function usePageSearch(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const root = document.documentElement;
    const bar = document.querySelector(".site-topbar")?.getBoundingClientRect().height ?? 0;
    const io = new IntersectionObserver(([e]) => root.toggleAttribute(ATTR, e.isIntersecting), {
      rootMargin: `-${Math.ceil(bar)}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      root.removeAttribute(ATTR);
    };
  }, [ref, enabled]);
}
