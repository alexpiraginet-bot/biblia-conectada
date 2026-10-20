"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { openSearch, preloadSearch } from "@/components/search/events";

// The capa's big search field (design §5): opens the same search as the top bar; without JavaScript it leads to /buscar.
export function HeroSearch({ text }: { text: string }) {
  return (
    <Link
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
