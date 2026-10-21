"use client";

import { useEffect, useState, type ComponentType } from "react";
import type {} from "./verse-intent-script";
export type { VerseAction } from "./verse-intent-events";

/** Initial JS only registers a lazy loader; the inline delegate retains pre-hydration clicks. */
export function StudyHost() {
  const [Controller, setController] = useState<ComponentType | null>(null);
  useEffect(() => {
    let active = true;
    const bridge = window.__bcVerse;
    const load = () => {
      void import("./StudyController").then((module) => {
        if (active) setController(() => module.StudyController);
      }).catch(() => bridge?.fail());
    };
    if (bridge) { bridge.load = load; bridge.start(); }
    else load();
    return () => { active = false; if (bridge) delete bridge.load; };
  }, []);
  return Controller ? <Controller /> : null;
}
