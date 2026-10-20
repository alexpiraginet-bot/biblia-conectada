"use client";

import { useSearchParams } from "next/navigation";
import { SearchPanel } from "./SearchPanel";

/** The search of /buscar: starts from the address's ?q= and follows it when it changes from outside (back, a link). */
export function SearchPage() {
  const q = useSearchParams().get("q") ?? "";
  return <SearchPanel initial={q} urlQuery={q} page />;
}
