"use client";
// The plans followed on this device (lib/planos/model.ts), in one versioned localStorage key. Nothing is sent anywhere.
import { useSyncExternalStore } from "react";
import { followPlan, leavePlan, parsePlans, PLANS_EVENT, PLANS_KEY, serializePlans, type PlanEdition, type PlansState } from "@/lib/planos/model";

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PLANS_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PLANS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PLANS_EVENT, callback);
  };
}
// the stored string compares by value; null on the server and before hydration
function stored(): string {
  try {
    return window.localStorage.getItem(PLANS_KEY) ?? "";
  } catch {
    return "";
  }
}

/** The followed plans, or null until the page has hydrated. */
export function usePlans(): PlansState | null {
  const raw = useSyncExternalStore(subscribe, stored, () => null);
  return raw === null ? null : parsePlans(raw);
}

function write(change: (state: PlansState) => PlansState): boolean {
  try {
    const before = parsePlans(window.localStorage.getItem(PLANS_KEY));
    const next = change(before);
    if (next === before) return true;
    const raw = serializePlans(next);
    if (raw === null) window.localStorage.removeItem(PLANS_KEY);
    else window.localStorage.setItem(PLANS_KEY, raw);
    if ((window.localStorage.getItem(PLANS_KEY) ?? null) !== raw) return false;
    window.dispatchEvent(new Event(PLANS_EVENT));
    return true;
  } catch {
    return false;
  }
}

export const follow = (id: string, today: string, edicao: PlanEdition) => write((s) => followPlan(s, id, today, edicao));
export const leave = (id: string) => write((s) => leavePlan(s, id));
