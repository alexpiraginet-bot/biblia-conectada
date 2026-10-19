"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Close } from "@/components/icons";
import styles from "./reader.module.css";

// The links panel. Desktop: a static column next to the text. Below 64rem: a bottom sheet that behaves as a dialog
// (title focused, Escape and the close button return to the chapter, the text behind is inert). Closing navigates
// to the chapter URL, so the browser's back button also closes it; focus then goes back to the verse's count link.
export function PanelShell({
  chapterPath,
  titleId,
  verseId,
  children,
}: {
  chapterPath: string;
  titleId: string;
  /** id of the verse in the chapter text ("v6"), whose count link gets the focus back when the sheet closes */
  verseId: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const router = useRouter();
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 63.99rem)");
    const text = document.getElementById("leitura");
    const panel = ref.current;
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      if (mq.matches) {
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        if (text) text.inert = true;
        document.getElementById(titleId)?.focus({ preventScroll: true });
      } else {
        el.removeAttribute("role");
        el.removeAttribute("aria-modal");
        if (text) text.inert = false;
      }
    };
    apply();
    mq.addEventListener("change", apply);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mq.matches) router.push(chapterPath, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("keydown", onKey);
      if (text) text.inert = false;
      // a sheet that closes hands the focus back to where it was opened; another verse's sheet takes it right after
      const active = document.activeElement;
      if (mq.matches && (!active || active === document.body || panel?.contains(active))) {
        document.querySelector<HTMLElement>(`#${verseId} a`)?.focus({ preventScroll: true });
      }
    };
  }, [chapterPath, titleId, verseId, router]);

  return (
    <aside ref={ref} className={styles.panel} aria-labelledby={titleId}>
      <Link href={chapterPath} scroll={false} className={styles.backdrop} aria-hidden="true" tabIndex={-1} />
      <div className={styles.sheet}>
        <div className={styles.sheetBar}>
          <span className={styles.grip} aria-hidden="true" />
          <Link href={chapterPath} scroll={false} className={styles.close} aria-label="Fechar as ligações">
            <Close />
          </Link>
        </div>
        {children}
      </div>
    </aside>
  );
}
