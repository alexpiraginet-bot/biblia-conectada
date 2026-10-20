"use client";

import { useEffect, useRef } from "react";
import { SearchPanel } from "./SearchPanel";

// The search over the page: a modal <dialog> (focus stays inside, Esc closes), full screen below 48rem and a centred
// box of up to 44rem above (ds.css .bc-search). Default export for React.lazy in SearchHost.
export default function SearchPalette({ initial, onClose }: { initial: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    d.showModal();
    // the page behind does not scroll while the search is open
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
      if (d.open) d.close();
    };
  }, []);
  // closing the dialog before it unmounts gives the focus back to whatever opened it (the search box, the tab)
  const close = () => {
    dialog.current?.close();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="site-search"
      aria-label="Busca"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      // a click on the veil around the box closes it
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <SearchPanel initial={initial} onClose={close} />
    </dialog>
  );
}
