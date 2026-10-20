"use client";

import { useLayoutEffect } from "react";

// Brings the current chapter into view inside the chapter list ([data-chapters]): the bar scrolls sideways on phones
// and the rail scrolls on its own beside the text, so Salmos 119 would otherwise start at Salmos 1. Only the list
// scrolls, never the page.
export function CenterCurrent() {
  useLayoutEffect(() => {
    for (const list of document.querySelectorAll<HTMLElement>("[data-chapters]")) {
      const current = list.querySelector<HTMLElement>("[aria-current]");
      if (!current) continue;
      const l = list.getBoundingClientRect();
      const c = current.getBoundingClientRect();
      if (list.scrollWidth > list.clientWidth) list.scrollLeft += c.left - l.left - (list.clientWidth - c.width) / 2;
      if (list.scrollHeight > list.clientHeight) list.scrollTop += c.top - l.top - (list.clientHeight - c.height) / 2;
    }
  }, []);
  return null;
}
