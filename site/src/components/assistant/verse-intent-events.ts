export type VerseAction = { path: string; label: string; opener: HTMLAnchorElement; returnTo?: HTMLAnchorElement; kind: "study" | "share" | "connections" };

/** Keep new tabs, downloads and modified clicks as ordinary browser navigation. */
export function ordinaryLink(event: MouseEvent, selector: string): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return null;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(selector) : null;
  return link && !link.hasAttribute("download") && (!link.target || link.target === "_self") ? link : null;
}
const valid = (value = "") => /^(?:ler\/open-nbv\/)?[a-z0-9-]+\/[1-9]\d{0,2}\/[1-9]\d{0,2}$/.test(value);
export function studyLinkFromEvent(event: MouseEvent): HTMLAnchorElement | null {
  const link = ordinaryLink(event, "a[data-study-ref]");
  return link && valid(link.dataset.studyRef) ? link : null;
}
export function verseActionFromEvent(event: MouseEvent): VerseAction | null {
  const opener = ordinaryLink(event, "a[data-study-ref], a[data-share-ref], a[data-connections-ref]");
  if (!opener) return null;
  const kind = opener.dataset.connectionsRef !== undefined ? "connections" : opener.dataset.shareRef === undefined ? "study" : "share";
  const path = kind === "connections" ? opener.dataset.connectionsRef : kind === "share" ? opener.dataset.shareRef : opener.dataset.studyRef;
  if (kind === "connections" && path?.startsWith("ler/")) return null;
  return valid(path) ? { path: path!, label: opener.dataset.connectionsLabel ?? opener.dataset.studyLabel ?? opener.dataset.shareLabel ?? "Passagem", opener, kind } : null;
}
