"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { openSearch } from "@/components/search/events";
import { currentItem, NAV, type NavItem } from "./nav";

/** Explicit route state: Next can keep a previous page hidden in the DOM during navigation. */
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const discovery = pathname === "/" || pathname === "/caminhos" || pathname === "/cronologia" || pathname === "/arcos" || pathname === "/assistente" || pathname === "/coracao";
  return <div className="site-shell" data-discovery={discovery ? "" : undefined}>{children}</div>;
}

// The sections with aria-current on the page's own: a rail on the left from 1024px, a tab bar at the bottom on phones
// (globals.css shows one or the other, so only one "Seções" landmark is ever exposed).
function Item({ n, current, className }: { n: NavItem; current: string | null; className: string }) {
  return (
    <Link
      href={n.href}
      prefetch={false}
      className={className}
      aria-current={current === n.href ? "page" : undefined}
      // "Buscar" opens the search over the page; without JavaScript it is the /buscar page
      onClick={(e) => {
        const disclosure = e.currentTarget.closest("details");
        if (disclosure) { disclosure.open = false; if (n.href === "/buscar") disclosure.querySelector("summary")?.focus(); }
        if (n.href === "/buscar" && openSearch()) e.preventDefault();
      }}
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
  const more = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      const menu = more.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <nav className="bc-tabbar site-tabbar" aria-label="Seções">
      {NAV.filter((n) => n.tab).map((n) => (
        <Item key={n.href} n={n} current={current} className="bc-tabbar__item" />
      ))}
      <details ref={more} className="site-tabbar__more" data-current={NAV.some((n) => n.more && n.href === current) ? "" : undefined}
        onKeyDown={(event) => { if (event.key === "Escape" && event.currentTarget.open) { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
        <summary className="bc-tabbar__item"><Icon name="more" /><span>Mais</span></summary>
        <div className="site-tabbar__menu" aria-label="Mais caminhos">
          <p>Continue explorando</p>
          {NAV.filter((n) => n.more).map((n) => <Item key={n.href} n={n} current={current} className="site-tabbar__menu-link" />)}
        </div>
      </details>
    </nav>
  );
}
