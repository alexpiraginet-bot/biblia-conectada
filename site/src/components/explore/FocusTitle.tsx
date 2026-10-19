"use client";

import { useEffect } from "react";

let loaded = false;

// After a node of the graph is chosen (a client navigation inside the Explorar), the focus goes to the title of the
// connection panel, so keyboard and screen reader users land on what changed. Not on the first load of the page.
export function FocusTitle({ id }: { id: string }) {
  useEffect(() => {
    if (!loaded) {
      loaded = true;
      return;
    }
    document.getElementById(id)?.focus({ preventScroll: true });
  }, [id]);
  return null;
}
