"use client";

import { useLayoutEffect } from "react";

// The chapter lists ([data-chapters]): the bar scrolls sideways on phones and the rail scrolls on its own beside the
// text. Two things on load:
// - the current chapter comes into view inside the list, so Salmos 119 does not start at Salmos 1 (only the list
//   scrolls, never the page);
// - the list is one Tab stop, the current chapter, and the arrows, Home and End move between chapters, so Salmos'
//   150 links are not 150 presses of Tab before the text. Without JavaScript every link stays in the Tab order.
export function CenterCurrent() {
  useLayoutEffect(() => {
    const cleanups: (() => void)[] = [];
    for (const list of document.querySelectorAll<HTMLElement>("[data-chapters]")) {
      const current = list.querySelector<HTMLElement>("[aria-current]");
      if (!current) continue;
      const l = list.getBoundingClientRect();
      const c = current.getBoundingClientRect();
      if (list.scrollWidth > list.clientWidth) list.scrollLeft += c.left - l.left - (list.clientWidth - c.width) / 2;
      if (list.scrollHeight > list.clientHeight) list.scrollTop += c.top - l.top - (list.clientHeight - c.height) / 2;

      const links = [...list.querySelectorAll<HTMLAnchorElement>("a")];
      for (const a of links) a.tabIndex = a === current ? 0 : -1;
      const onKey = (e: KeyboardEvent) => {
        const i = links.indexOf(e.target as HTMLAnchorElement);
        if (i < 0) return;
        const to =
          e.key === "ArrowDown" || e.key === "ArrowRight"
            ? Math.min(i + 1, links.length - 1)
            : e.key === "ArrowUp" || e.key === "ArrowLeft"
              ? Math.max(i - 1, 0)
              : e.key === "Home"
                ? 0
                : e.key === "End"
                  ? links.length - 1
                  : -1;
        if (to < 0) return;
        e.preventDefault();
        links[i].tabIndex = -1;
        links[to].tabIndex = 0;
        links[to].focus();
      };
      list.addEventListener("keydown", onKey);
      cleanups.push(() => list.removeEventListener("keydown", onKey));
    }
    return () => cleanups.forEach((f) => f());
  }, []);
  return null;
}
