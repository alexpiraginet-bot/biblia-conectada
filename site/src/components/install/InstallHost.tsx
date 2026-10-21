"use client";

import { useEffect, useState, type ComponentType } from "react";
import { canOfferInstall } from "./device";

/** Only detection and a timer are initial JS. The guide and styles load later on eligible Apple devices. */
export function InstallHost() {
  const [Guide, setGuide] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (!canOfferInstall(navigator, matchMedia("(display-mode: standalone), (display-mode: fullscreen)").matches)) return;
    let active = true;
    const timer = setTimeout(() => {
      void import("./InstallGuide").then((module) => { if (active) setGuide(() => module.default); }).catch(() => {});
    }, 7000);
    return () => { active = false; clearTimeout(timer); };
  }, []);
  return Guide ? <Guide /> : null;
}
