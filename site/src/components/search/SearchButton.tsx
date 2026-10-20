"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { openSearch, preloadSearch } from "./events";

const noop = () => () => {};
const shortcut = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K");

// The search entry of the top bar: a wide box from 40rem, an icon on phones. Both open the palette; without
// JavaScript they lead to /buscar.
export function SearchButton() {
  const keys = useSyncExternalStore(noop, shortcut, () => "Ctrl K");
  const props = {
    href: "/buscar",
    onClick: (e: React.MouseEvent) => openSearch() && e.preventDefault(),
    onPointerEnter: preloadSearch,
    onFocus: preloadSearch,
  };
  return (
    <>
      <Link {...props} className="bc-searchbox site-topbar__search">
        <Icon name="search" />
        <span className="bc-searchbox__text">Buscar versículo, palavra ou livro</span>
        <kbd className="bc-kbd">{keys}</kbd>
      </Link>
      <Link {...props} className="bc-icon-button site-topbar__search-icon" aria-label="Buscar">
        <Icon name="search" />
      </Link>
    </>
  );
}
