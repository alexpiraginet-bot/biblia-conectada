"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import { openSearch } from "@/components/search/events";
import { currentItem, MOBILE_MENU, NAV, type NavItem } from "./nav";

/** Explicit route state: Next can keep a previous page hidden in the DOM during navigation. */
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const discovery = pathname === "/" || pathname === "/caminhos" || pathname === "/cronologia" || pathname === "/arcos" || pathname === "/assistente" || pathname === "/coracao";
  return <div className="site-shell" data-discovery={discovery ? "" : undefined} data-immersive={pathname === "/arcos" ? "" : undefined}>{children}</div>;
}

// The sections with aria-current on the page's own: a rail on the left from 1024px, a tab bar at the bottom on phones
// (globals.css shows one or the other, so only one "Seções" landmark is ever exposed).
function Item({ n, current, className, described = false }: { n: NavItem; current: string | null; className: string; described?: boolean }) {
  return (
    <Link
      href={n.href}
      prefetch={false}
      className={className}
      aria-current={current === n.href ? "page" : undefined}
      data-featured={described && n.featured ? "" : undefined}
      // "Buscar" opens the search over the page; without JavaScript it is the /buscar page
      onClick={(e) => {
        const disclosure = e.currentTarget.closest("details");
        if (disclosure) {
          disclosure.open = false;
          // Keep focus out of the now-hidden disclosure while Next resolves the destination.
          disclosure.querySelector("summary")?.focus({ preventScroll: true });
        }
        if (n.href === "/buscar" && openSearch()) e.preventDefault();
      }}
    >
      <Icon name={n.icon} />
      <span>{n.label}{described && n.description && <small>{n.description}</small>}</span>
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
  const pathname = usePathname();
  const current = currentItem(pathname);
  const more = useRef<HTMLDetailsElement>(null);
  const bar = useRef<HTMLElement>(null);
  const menuCurrent = MOBILE_MENU.find((n) => n.href === current);
  useEffect(() => {
    if (pathname !== "/arcos") return;
    let active = true;
    let stop: (() => void) | undefined;
    void import("./idle-navigation").then(({ idleNavigation }) => {
      if (active && bar.current) stop = idleNavigation(bar.current);
    });
    return () => { active = false; stop?.(); };
  }, [pathname]);
  useEffect(() => {
    function outside(event: PointerEvent) {
      const menu = more.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        const focusWasInside = menu.contains(document.activeElement);
        menu.open = false;
        if (focusWasInside) menu.querySelector("summary")?.focus({ preventScroll: true });
      }
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return (
    <nav ref={bar} className="bc-tabbar site-tabbar" aria-label="Seções">
      {NAV.filter((n) => n.tab).map((n) => (
        <Item key={n.href} n={n} current={current} className="bc-tabbar__item" />
      ))}
      <details key={pathname} ref={more} className="site-tabbar__more" data-current={menuCurrent ? "" : undefined}
        onKeyDown={(event) => { if (event.key === "Escape" && event.currentTarget.open) { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); } }}
        // WebKit may blur the summary with no next focus target before dispatching a touch click inside.
        onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
        <summary className="bc-tabbar__item" aria-label={menuCurrent ? `Menu — você está em ${menuCurrent.label}` : "Menu — mapa, cronologia e mais"}>
          <Icon name="more" /><span>Menu</span>
        </summary>
        <div className="site-tabbar__menu">
          <div className="site-tabbar__menu-heading">
            <p>Explore a Bíblia</p>
            <button type="button" aria-label="Fechar menu" onClick={() => {
              if (more.current) { more.current.open = false; more.current.querySelector("summary")?.focus({ preventScroll: true }); }
            }}><Icon name="close" /></button>
          </div>
          <div className="site-tabbar__menu-grid">
            {MOBILE_MENU.map((n) => <Item key={n.href} n={n} current={current} className="site-tabbar__menu-link" described />)}
          </div>
        </div>
      </details>
    </nav>
  );
}
