"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const never = () => () => {};

// After a chapter of the map is chosen (a client navigation), the focus goes to the title of the connection panel, so
// keyboard and screen reader users land on what changed; not on the first load of the page. The title is found from
// this marker, inside its own panel: Next keeps the last visited routes in the page, hidden, so an id can repeat.
export function FocusTitle() {
  // true while the server HTML is hydrated (the first load), false when a navigation mounts the panel
  const hydrating = useSyncExternalStore(never, () => false, () => true);
  const firstLoad = useRef(hydrating);
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    mark.current?.parentElement?.querySelector<HTMLElement>("h2, h3")?.focus({ preventScroll: true });
  }, []);
  return <span ref={mark} hidden />;
}
