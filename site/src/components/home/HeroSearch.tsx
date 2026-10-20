"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icon } from "@/components/icons";
import { openSearch, preloadSearch } from "@/components/search/events";
import { usePageSearch } from "@/components/search/page-search";

// The capa's big search field (design §5): opens the same search as the top bar, whose own entry steps aside while
// this one is on screen; without JavaScript it leads to /buscar.
export function HeroSearch({ text }: { text: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  usePageSearch(ref);
  return (
    <Link
      ref={ref}
      href="/buscar"
      className="bc-searchbox bc-searchbox--hero"
      onClick={(e) => openSearch() && e.preventDefault()}
      onPointerEnter={preloadSearch}
      onFocus={preloadSearch}
    >
      <Icon name="search" />
      <span className="bc-searchbox__text">{text}</span>
    </Link>
  );
}
