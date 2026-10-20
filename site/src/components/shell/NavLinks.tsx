"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { openSearch } from "@/components/search/events";
import { currentItem, NAV, type NavItem } from "./nav";

/** Explicit route state: Next can keep a previous page hidden in the DOM during navigation. */
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const discovery = pathname === "/" || pathname === "/caminhos" || pathname === "/cronologia";
  return <div className="site-shell" data-discovery={discovery ? "" : undefined}>{children}</div>;
}

// The sections with aria-current on the page's own: a rail on the left from 1024px, a tab bar at the bottom on phones
// (globals.css shows one or the other, so only one "Seções" landmark is ever exposed).
function Item({ n, current, className }: { n: NavItem; current: string | null; className: string }) {
  return (
    <Link
      href={n.href}
      className={className}
      aria-current={current === n.href ? "page" : undefined}
      // "Buscar" opens the search over the page; without JavaScript it is the /buscar page
      onClick={n.href === "/buscar" ? (e) => openSearch() && e.preventDefault() : undefined}
    >
      <Icon name={n.icon} />
      <span>{n.label}</span>
    </Link>
  );
}

export function SectionRail() {
  const current = currentItem(usePathname());
  return (
    <nav className="bc-rail site-rail" aria-label="Seções">
      {NAV.filter((n) => n.rail).map((n) => (
        <Item key={n.href} n={n} current={current} className="bc-rail__item" />
      ))}
    </nav>
  );
}

export function TabBar() {
  const current = currentItem(usePathname());
  return (
    <nav className="bc-tabbar site-tabbar" aria-label="Seções">
      {NAV.filter((n) => n.tab).map((n) => (
        <Item key={n.href} n={n} current={current} className="bc-tabbar__item" />
      ))}
    </nav>
  );
}
