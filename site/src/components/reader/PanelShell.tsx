"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import styles from "./reader.module.css";

const SHEET = "(max-width: 63.99rem)";
const FOCUSABLE = 'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Makes the rest of the page inert (every sibling of `keep` and of its ancestors), leaving open dialogs alone (the
 *  search palette may open over the sheet); returns the undo. */
function inertOutside(keep: HTMLElement): () => void {
  const made: HTMLElement[] = [];
  for (let el: HTMLElement | null = keep; el && el !== document.body; el = el.parentElement) {
    for (const sib of el.parentElement?.children ?? []) {
      if (sib === el || !(sib instanceof HTMLElement) || sib.inert || sib.tagName === "DIALOG" || sib.tagName === "SCRIPT") continue;
      sib.inert = true;
      made.push(sib);
    }
  }
  return () => made.forEach((m) => (m.inert = false));
}

/**
 * The links panel of a verse. From 64rem: a column beside the text (ds.css .bc-panel look). Below: the bottom sheet
 * (ds.css .bc-sheet) over the veil, as a modal dialog: the title gets the focus, Tab stays inside, the page behind is
 * inert, and Escape, the veil and "Fechar" go back to the chapter. Closing navigates to the chapter URL, so the
 * browser's back button closes it too; the focus then returns to the verse's links pill. The sheet sets its own
 * ground and ink, never inheriting a colour from the page behind (the iPhone of 19/10).
 */
export function PanelShell({
  chapterPath,
  titleId,
  verseId,
  children,
}: {
  chapterPath: string;
  titleId: string;
  /** id of the verse in the chapter text ("v6"), whose links pill gets the focus back when the sheet closes */
  verseId: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const mq = window.matchMedia(SHEET);
    const panel = ref.current;
    let undo: (() => void) | null = null;
    const apply = () => {
      const el = ref.current;
      if (!el) return;
      undo?.();
      undo = null;
      if (mq.matches) {
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        undo = inertOutside(el);
        document.getElementById(titleId)?.focus({ preventScroll: true });
      } else {
        el.removeAttribute("role");
        el.removeAttribute("aria-modal");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    const onKey = (e: KeyboardEvent) => {
      // the search palette, when open over the sheet, handles its own keys
      if (!mq.matches || document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        router.push(chapterPath, { scroll: false });
        return;
      }
      const box = sheet.current;
      if (e.key !== "Tab" || !box) return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.getClientRects().length > 0);
      if (!items.length) return;
      const [first, last] = [items[0], items[items.length - 1]];
      const active = document.activeElement;
      if (!active || !box.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("keydown", onKey);
      undo?.();
      // the router may keep this page hidden rather than remove it (Activity): it must not stay a modal dialog
      panel?.removeAttribute("role");
      panel?.removeAttribute("aria-modal");
      // a sheet that closes hands the focus back to where it was opened; another verse's sheet takes it right after
      const active = document.activeElement;
      if (mq.matches && (!active || active === document.body || panel?.contains(active))) {
        document.querySelector<HTMLElement>(`#${verseId} [data-links]`)?.focus({ preventScroll: true });
      }
    };
  }, [chapterPath, titleId, verseId, router]);

  return (
    <aside ref={ref} className={styles.verseShell} aria-labelledby={titleId}>
      <Link href={chapterPath} scroll={false} className={styles.scrim} aria-hidden="true" tabIndex={-1} />
      <div ref={sheet} className={`bc-sheet ${styles.verseSheet}`}>
        <div className={`bc-sheet__bar ${styles.sheetBar}`}>
          <span className="bc-sheet__grip" aria-hidden="true" />
          <Link href={chapterPath} scroll={false} className={`bc-button bc-button--ghost ${styles.close}`}>
            <Icon name="close" />
            Fechar<span className="visually-hidden"> as ligações</span>
          </Link>
        </div>
        {children}
      </div>
    </aside>
  );
}
