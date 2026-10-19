"use client";

import { useEffect } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import styles from "./reader.module.css";

// Marks the verse chosen in the URL (/livro/cap/vers) inside the chapter text, which lives in the layout and does
// not re-render when only the verse changes. On a hard load it also brings the verse into view.
export function VerseFocus() {
  const segment = useSelectedLayoutSegment();
  useEffect(() => {
    const prev = document.querySelectorAll(`.${styles.verse}[aria-current]`);
    prev.forEach((el) => el.removeAttribute("aria-current"));
    if (!segment) return;
    const el = document.getElementById(`v${segment}`);
    if (!el) return;
    el.setAttribute("aria-current", "true");
    const rect = el.getBoundingClientRect();
    // desktop: the panel sits beside the text, so only a verse outside the window moves. Phone: the sheet covers the
    // lower part of the screen, so the verse goes to the top unless it is already there.
    const beside = window.matchMedia("(min-width: 64rem)").matches;
    const outOfView = beside
      ? rect.top < 80 || rect.bottom > window.innerHeight - 16
      : rect.top < 80 || rect.bottom > window.innerHeight * 0.45;
    if (outOfView) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    }
  }, [segment]);
  return null;
}
