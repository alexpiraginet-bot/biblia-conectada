import { currentItem } from "./nav";

export function markCurrent(nav: HTMLElement, pathname: string) {
  const current = currentItem(pathname);
  for (const link of nav.querySelectorAll<HTMLAnchorElement>("a[data-nav-href]")) {
    if (link.dataset.navHref === current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}
