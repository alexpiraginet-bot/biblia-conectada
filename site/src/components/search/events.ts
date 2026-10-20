// Opening the search from anywhere: the top bar, the "Buscar" tab, Ctrl K or "/", the cover's big field. The host in
// the root layout (SearchHost) listens and loads the palette on first use.
export const SEARCH_EVENT = "bc:search";

let listening = false;
export function setSearchListening(on: boolean) {
  listening = on;
}

/** Opens the search over the page with `q` typed in. False until the host has mounted: a link to /buscar then does
 *  its normal navigation. */
export function openSearch(q = ""): boolean {
  if (!listening) return false;
  window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: q }));
  return true;
}

/** Fetches the palette's code ahead of the click (pointer over or focus on a search control). */
export function preloadSearch() {
  void import("./SearchPalette");
}
