"use client";

import { useEffect } from "react";

/** No tracker, API call or reading observer before the person opts in. */
export function RewardsHost() {
  useEffect(() => {
    let disposed = false;
    let loading = false;
    let stop: (() => void) | undefined;
    const check = () => {
      let enabled = false;
      try { enabled = localStorage.getItem("bc:rewards:opt-in") === "yes"; } catch { /* No persistence, no automatic tracking. */ }
      if (!enabled) { stop?.(); stop = undefined; return; }
      if (stop || loading) return;
      loading = true;
      void import("./tracker").then((module) => {
        if (!disposed && localStorage.getItem("bc:rewards:opt-in") === "yes") stop = module.startJourneyTracker();
      }).catch(() => {}).finally(() => { loading = false; });
    };
    check();
    window.addEventListener("bc:rewards-preference", check);
    window.addEventListener("storage", check);
    return () => { disposed = true; stop?.(); window.removeEventListener("bc:rewards-preference", check); window.removeEventListener("storage", check); };
  }, []);
  return null;
}
