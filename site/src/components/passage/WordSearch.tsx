"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { openSearch } from "@/components/search/events";

// "Buscar outra palavra": opens the site's search over the page; without JavaScript, the link leads to /buscar.
export function WordSearch() {
  return (
    <Link href="/buscar" className="bc-button bc-button--secondary" onClick={(e) => openSearch() && e.preventDefault()}>
      <Icon name="search" />
      Buscar outra palavra
    </Link>
  );
}
