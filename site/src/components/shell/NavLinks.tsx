"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Explicit route state: Next can keep a previous page hidden in the DOM during navigation. */
export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => { window.dispatchEvent(new Event("bc:navigation")); }, [pathname]);
  const discovery = pathname === "/" || pathname === "/caminhos" || pathname === "/cronologia" || pathname === "/arcos" || pathname === "/assistente" || pathname === "/coracao";
  return <div className="site-shell" data-homepage={pathname === "/" ? "" : undefined} data-discovery={discovery ? "" : undefined} data-immersive={pathname === "/arcos" ? "" : undefined}>{children}</div>;
}

/** Link copy and icons are server-rendered slots, rather than duplicating the complete catalogue in initial JS. */
export function NavigationState({ children, floating = false }: { children: ReactNode; floating?: boolean }) {
  const pathname = usePathname();
  const nav = useRef<HTMLElement>(null);
  const lastPath = useRef(pathname);
  useEffect(() => {
    const element = nav.current;
    if (lastPath.current !== pathname) {
      const menu = element?.querySelector("details");
      if (menu?.open) menu.open = false;
      lastPath.current = pathname;
    }
    let active = true;
    void import("./navigation-state").then(({ markCurrent }) => { if (active && element) markCurrent(element, pathname); }).catch(() => {});
    return () => { active = false; };
  }, [pathname]);
  useEffect(() => {
    if (!floating || pathname !== "/arcos") return;
    let active = true;
    let stop: (() => void) | undefined;
    void import("./idle-navigation").then(({ idleNavigation }) => { if (active && nav.current) stop = idleNavigation(nav.current); });
    return () => { active = false; stop?.(); };
  }, [floating, pathname]);
  useEffect(() => {
    const element = nav.current;
    if (!floating || !element) return;
    let active = true; let ready = false; let stop: (() => void) | undefined;
    function enhance() {
      if (ready) return;
      ready = true;
      void import("./menu-controller").then(({ enhanceMenu }) => {
        if (active) stop = enhanceMenu(element!);
      }).catch(() => { ready = false; });
    }
    element.addEventListener("toggle", enhance, true);
    if (element.querySelector("details[open]")) enhance();
    return () => { active = false; stop?.(); element.removeEventListener("toggle", enhance, true); };
  }, [floating]);
  return <nav ref={nav} className={floating ? "site-tabbar" : "bc-rail site-rail"} aria-label={floating ? "Menu principal" : "Seções"}>{children}</nav>;
}
