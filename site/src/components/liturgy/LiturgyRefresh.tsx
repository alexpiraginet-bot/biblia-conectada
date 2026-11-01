"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** A tab left open overnight must not keep calling yesterday's celebration "today". */
export function LiturgyRefresh({ renderedDate }: { renderedDate: string }) {
  const router = useRouter();
  useEffect(() => {
    // Readings arrive through streaming after the browser's initial hash lookup.
    const hash = window.location.hash;
    if (!/^#(?:first|psalm|second|gospel|extra)-\d+$/.test(hash)) return;
    const target = [...document.querySelectorAll(`[id="${hash.slice(1)}"]`)].find(element => element.getClientRects().length);
    target?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [renderedDate]);
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
      if (today !== renderedDate) router.refresh();
    };
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("pageshow", check); };
  }, [renderedDate, router]);
  return null;
}
