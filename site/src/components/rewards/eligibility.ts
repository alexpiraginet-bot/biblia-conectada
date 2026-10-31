import type { JourneyArea, JourneySnapshot } from "@/lib/rewards/types";

const EXPLORATION: Readonly<Record<string, JourneyArea>> = {
  arcos: "arcs", explorar: "explore", caminhos: "map", cronologia: "chronology", "linha-do-tempo": "timeline", interlinear: "interlinear",
};
/** Reading wins only on reading pages; the six discovery areas keep their own identity. */
export function journeyArea(pathname: string, scriptureVisible: boolean, todayLiturgy: boolean): JourneyArea | null {
  const section = pathname.split("/").filter(Boolean)[0];
  if (section === "liturgia" || section === "dia") return scriptureVisible ? (todayLiturgy ? "liturgy" : "reading") : null;
  if (EXPLORATION[section]) return EXPLORATION[section];
  return scriptureVisible ? "reading" : null;
}
export function canAdvanceJourney(snapshot: JourneySnapshot, area: JourneyArea): boolean {
  if (area === "reading") return !snapshot.tasks.reading.complete;
  if (area === "liturgy") return !snapshot.tasks.liturgy.complete || !snapshot.tasks.reading.complete;
  return !snapshot.tasks.explore.complete;
}
export const journeyToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
/** Elements under overlays, below the fold or with no rendered text do not qualify. */
export function isVisibleReading(element: Element): boolean {
  if (!element.textContent?.trim() || element.closest("[inert], [hidden], [aria-hidden='true']")) return false;
  const style = getComputedStyle(element);
  if (style.visibility !== "visible" || style.display === "none" || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  const width = Math.min(rect.right, innerWidth) - Math.max(rect.left, 0);
  const height = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
  return width >= Math.min(60, rect.width) && height >= Math.min(20, rect.height) && rect.width > 0 && rect.height > 0;
}
export function visibleJourneyArea(): JourneyArea | null {
  if (Array.from(document.querySelectorAll(".site-tabbar__more[open], [role='dialog'][aria-modal='true'], dialog[open]")).some((element) => element.getClientRects().length > 0)) return null;
  // Next's Activity can retain a previous route in a display:none subtree.
  const main = Array.from(document.querySelectorAll("main")).find(isVisibleReading);
  if (!main || main.closest("[inert]")) return null;
  const visibleScripture = Array.from(main.querySelectorAll("[data-scripture]")).find(isVisibleReading);
  const today = journeyToday();
  const currentLiturgy = !!visibleScripture?.closest(`[data-reward-liturgy='${today}']`);
  const area = journeyArea(location.pathname, !!visibleScripture, currentLiturgy);
  if (area === "reading" || area === "liturgy") return area;
  return area && isVisibleReading(main) ? area : null;
}
