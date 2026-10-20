"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { openSearch, preloadSearch } from "@/components/search/events";

// "Buscar" on the 404 page: opens the search over the page; without JavaScript (or before the search host mounts) it
// is the /buscar page.
export function NotFoundSearch() {
  return (
    <Link
      href="/buscar"
      className="not-found__way"
      onClick={(e) => openSearch() && e.preventDefault()}
      onPointerEnter={preloadSearch}
      onFocus={preloadSearch}
    >
      <Icon name="search" />
      <span className="not-found__text">
        <span className="bc-list__name">Buscar</span>
        <span className="not-found__note">Um versículo, uma palavra ou um livro, como “Is 9:6” ou “luz”.</span>
      </span>
    </Link>
  );
}
