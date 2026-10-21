"use client";

import { useEffect } from "react";

export function TranslationVerseFocus({ verse }: { verse?: number }) {
  useEffect(() => {
    if (verse) document.getElementById(`v${verse}`)?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [verse]);
  return null;
}
