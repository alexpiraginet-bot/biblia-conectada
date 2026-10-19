"use client";

import { useSearchParams } from "next/navigation";
import { SearchPanel } from "./SearchPanel";

/** The search box of /buscar, filled with the address's ?q= */
export function SearchPage() {
  const q = useSearchParams().get("q") ?? "";
  return <SearchPanel key={q} initial={q} page />;
}
