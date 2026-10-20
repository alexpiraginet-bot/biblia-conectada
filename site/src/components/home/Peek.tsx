"use client";

import { useEffect, useState } from "react";
import styles from "./Peek.module.css";

// Phones: the selected connection peeks from the bottom of the screen, above the tab bar, and leads to the panel
// below the map (design §5: "o painel espia por baixo"). It steps aside once the panel is on screen or scrolled past.
export function Peek({ target, children }: { target: string; children: React.ReactNode }) {
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setAway(e.isIntersecting || e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return (
    <a href={`#${target}`} className={styles.peek} hidden={away}>
      {children}
    </a>
  );
}
