"use client";

import { lazy, Suspense, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

// Mounted once in the (site) layout. Renders nothing unless a bridge is in progress on this device; only then does it
// load the strip's code (PonteStripBody), so reading pages pay for this shell alone.
const Body = lazy(() => import("./PonteStripBody"));
const FLAG = "bc:ponte-faixa"; // KEYS.ponteStrip in lib/community/store.ts (inlined to keep this shell small)

function subscribe(cb: () => void) {
  window.addEventListener("bc:store", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("bc:store", cb);
    window.removeEventListener("storage", cb);
  };
}
function active() {
  try {
    return window.localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export function PonteStrip() {
  const on = useSyncExternalStore(subscribe, active, () => false);
  const pathname = usePathname();
  // the bridge pages show the same state in full
  if (!on || pathname === "/ponte" || pathname.startsWith("/ponte/")) return null;
  return (
    <Suspense fallback={null}>
      <Body pathname={pathname} />
    </Suspense>
  );
}
