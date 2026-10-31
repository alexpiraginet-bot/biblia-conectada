import { openSearch, SEARCH_EVENT } from "@/components/search/events";
import { installationUrl, safeContentPath } from "@/lib/app-links";

/** Enhance the server-rendered disclosure only after use. Underlying content becomes inert, never removed. */
export function enhanceMenu(nav: HTMLElement) {
  const disclosure = nav.querySelector("details")!;
  const panel = nav.querySelector<HTMLElement>(".site-tabbar__menu")!;
  const trigger = disclosure.querySelector("summary")!;
  let restore: (() => void) | undefined;
  nav.dataset.enhanced = "";
  function close() { disclosure.open = false; }
  function yieldToSearch() { close(); sync(); }
  function sync() {
    if (!disclosure.open) { restore?.(); restore = undefined; return; }
    if (restore) return;
    const path = safeContentPath(location.pathname + location.search + location.hash) ?? "/";
    panel.querySelectorAll<HTMLAnchorElement>("a[data-page-action]").forEach((link) => {
      link.href = link.dataset.pageAction === "/qr" ? `/qr?${new URLSearchParams({ path })}` : installationUrl(path);
    });
    const siblings = [...document.body.children].flatMap((child) => child.contains(nav) ? [...nav.parentElement!.children].filter((sibling) => sibling !== nav) : [child])
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName !== "SCRIPT");
    const inert = siblings.map((child) => child.inert);
    siblings.forEach((child) => { child.inert = true; });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    (panel.querySelector<HTMLElement>("[data-menu-close]") ?? panel).focus({ preventScroll: true });
    restore = () => {
      siblings.forEach((child, i) => { child.inert = inert[i]; });
      document.body.style.overflow = overflow;
      panel.removeAttribute("role"); panel.removeAttribute("aria-modal");
      trigger.focus({ preventScroll: true });
    };
  }
  function click(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("[data-menu-close], .site-tabbar__veil")) close();
    const link = target?.closest<HTMLAnchorElement>("a[href]");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    close(); sync();
    if (link.getAttribute("href") === "/buscar" && openSearch()) event.preventDefault();
  }
  function key(event: KeyboardEvent) {
    if (!disclosure.open) return;
    // SearchHost also opens directly from its keyboard listener, without dispatching SEARCH_EVENT.
    if (!event.altKey && (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") || (event.key === "/" && !event.ctrlKey && !event.metaKey))) { close(); sync(); return; }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); sync(); }
    if (event.key !== "Tab") return;
    const targets = [...panel.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),[tabindex='0']")].filter((element) => element.getClientRects().length);
    // Safari may skip links in its native Tab order. Keep every destination reachable regardless of that preference.
    event.preventDefault();
    const index = targets.indexOf(document.activeElement as HTMLElement);
    const next = index < 0 ? (event.shiftKey ? targets.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
    (targets[next] ?? panel).focus();
  }
  disclosure.addEventListener("toggle", sync);
  nav.addEventListener("click", click);
  document.addEventListener("keydown", key, true);
  window.addEventListener(SEARCH_EVENT, yieldToSearch);
  sync();
  return () => { restore?.(); disclosure.removeEventListener("toggle", sync); nav.removeEventListener("click", click); document.removeEventListener("keydown", key, true); window.removeEventListener(SEARCH_EVENT, yieldToSearch); delete nav.dataset.enhanced; };
}
