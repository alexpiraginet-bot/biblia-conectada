import blivre from "@/data/generated/books.json";
import openNbv from "@/data/generated/translations/open-nbv-books.json";
import { parseTranslationPath } from "@/lib/translations";
import { chapterReadingSummary, isVerseRead, scopeFromCatalog, type ReadingCatalog, type ReadingUndoToken } from "@/lib/reading-progress/model";
import { getReadingProgressSnapshot, markChapterRead, markVerseRead, setAutomaticReading, subscribeReadingProgress, undoReadingChange } from "@/lib/reading-progress/store";
import { advanceReadingClock, enoughReadingVisible, READING_IDLE_MS, requiredReadingMs, type ReadingClock } from "./automatic-policy";
import type { ReadingFeedback } from "./ReadingProgressHost";

// Edition metadata only; no Scripture text or reference graph is bundled here.
const catalog: ReadingCatalog = { blivre, "open-nbv": openNbv };
function resolve(path: string | undefined) {
  const ref = path ? parseTranslationPath(path) : null;
  if (!ref?.slug || !ref.chapter) return null;
  const scope = scopeFromCatalog(catalog, ref.id, ref.slug, ref.chapter);
  if (!scope || (ref.verse !== undefined && ref.verse > scope.verseCount)) return null;
  return { scope, verse: ref.verse };
}
const setText = (element: Element | null, value: string) => { if (element && element.textContent !== value) element.textContent = value; };
const rendered = (element: Element) => element.getClientRects().length > 0 && !element.closest("[hidden], [inert], [aria-hidden='true']") && getComputedStyle(element).visibility === "visible";

export function startReadingProgress(notify: (feedback: ReadingFeedback) => void) {
  let disposed = false, frame = 0, saving = false;
  let clock: ReadingClock | null = null;
  let recentActivity = 0;
  let recentScroll = 0;
  let failure = "";
  let scriptures: HTMLElement[] = [];
  let timer: number | undefined;

  const feedback = (message: string, undo?: ReadingUndoToken) => notify({ message, ...(undo ? { undo: async () => {
    clock = null;
    const result = await undoReadingChange(undo);
    return result.ok ? "Marcação desfeita. A marcação automática está pausada." : result.message;
  } } : {}) });

  const refresh = () => {
    frame = 0;
    if (disposed) return;
    scriptures = Array.from(document.querySelectorAll<HTMLElement>("[data-reading-ref]"));
    const snapshot = getReadingProgressSnapshot();
    const ready = snapshot.status === "ready";
    if (ready && snapshot.state.automatic && scriptures.length > 0) {
      timer ??= window.setInterval(() => { void tick(); }, 500);
    } else { clearInterval(timer); timer = undefined; clock = null; }
    document.querySelectorAll<HTMLButtonElement>("[data-reading-toggle][data-reading-ready]").forEach(button => {
      const ref = resolve(button.dataset.readingToggle);
      if (!ref || !ref.verse) return;
      button.disabled = !ready;
      if (!ready) {
        button.removeAttribute("aria-pressed");
        button.setAttribute("aria-label", `Progresso de ${button.dataset.readingLabel} indisponível; veja sua Jornada`);
        setText(button.querySelector("[data-reading-caption]"), "Progresso indisponível");
        return;
      }
      const read = isVerseRead(snapshot.state, ref.scope, ref.verse);
      button.setAttribute("aria-pressed", String(read));
      button.setAttribute("aria-label", `${read ? "Desmarcar" : "Marcar"} ${button.dataset.readingLabel} ${read ? "como não lido" : "como lido"}`);
      setText(button.querySelector("[data-reading-caption]"), read ? "Lido" : "Marcar lido");
    });
    document.querySelectorAll<HTMLElement>("[data-reading-chapter][data-reading-ready]").forEach(section => {
      const ref = resolve(section.dataset.readingChapter);
      if (!ref) return;
      const button = section.querySelector<HTMLButtonElement>("[data-reading-complete]");
      if (button) button.disabled = !ready;
      if (!ready) {
        setText(section.querySelector("[data-reading-count]"), "Progresso indisponível. Veja as opções de recuperação na Jornada.");
        button?.removeAttribute("aria-pressed");
        return;
      }
      const part = chapterReadingSummary(snapshot.state, ref.scope);
      setText(section.querySelector("[data-reading-count]"), `${part.readVerses} de ${part.totalVerses} versículos marcados${part.complete ? " · capítulo concluído" : ""}`);
      button?.setAttribute("aria-pressed", String(part.complete));
      setText(button, part.complete ? "Desmarcar capítulo" : "Marcar capítulo lido");
    });
    document.querySelectorAll<HTMLButtonElement>("[data-reading-chapter][data-reading-ready] [data-reading-automatic]").forEach(button => {
      button.disabled = !ready;
      button.setAttribute("aria-pressed", String(snapshot.state.automatic));
      setText(button, snapshot.state.automatic ? "Pausar marcação automática" : "Ativar marcação automática");
    });
  };
  const queueRefresh = () => { if (!frame && !disposed) frame = requestAnimationFrame(refresh); };
  const unsubscribe = subscribeReadingProgress(queueRefresh);
  const mutation = new MutationObserver(records => {
    if (records.some(record => record.type === "attributes" || [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element
      && (node.matches("[data-reading-ref], [data-reading-toggle], [data-reading-chapter]") || node.querySelector("[data-reading-ref], [data-reading-toggle], [data-reading-chapter]"))))) queueRefresh();
  });
  mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-reading-ready"] });
  refresh();

  const activity = () => { recentActivity = performance.now(); };
  const scroll = () => { activity(); recentScroll = performance.now(); clock = null; };
  const interrupt = () => { clock = null; };
  for (const event of ["pointerdown", "keydown", "touchstart"]) document.addEventListener(event, activity, { passive: true, capture: true });
  document.addEventListener("scroll", scroll, { passive: true, capture: true });
  document.addEventListener("visibilitychange", interrupt);
  window.addEventListener("blur", interrupt);

  async function tick() {
    const snapshot = getReadingProgressSnapshot(), now = performance.now();
    if (disposed || saving || snapshot.status !== "ready" || !snapshot.state.automatic || document.visibilityState !== "visible" || !document.hasFocus()
      || !recentActivity || now - recentActivity > READING_IDLE_MS || now - recentScroll < 650
      || Array.from(document.querySelectorAll("[role='dialog'][aria-modal='true'], dialog[open], .site-tabbar__more[open]")).some(rendered)) { clock = null; return; }
    const header = document.querySelector(".site-topbar")?.getBoundingClientRect();
    const viewport = { width: innerWidth, height: innerHeight, top: Math.max(72, header?.bottom ?? 0), bottom: 100 };
    let candidate: { node: HTMLElement; path: string; ref: NonNullable<ReturnType<typeof resolve>> } | undefined;
    for (const node of scriptures) {
      const path = node.dataset.readingRef, ref = resolve(path);
      if (!ref?.verse || !path || !rendered(node) || isVerseRead(snapshot.state, ref.scope, ref.verse)) continue;
      const rect = node.getBoundingClientRect();
      if (!enoughReadingVisible(rect, viewport)) continue;
      // An inner scrolling reader can clip text even when it is in the viewport.
      let clipped = false;
      for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (/(hidden|clip|auto|scroll)/.test(`${style.overflowY} ${style.overflowX}`)) {
          const bounds = parent.getBoundingClientRect();
          if (rect.top < bounds.top || rect.bottom > bounds.bottom || rect.left < bounds.left || rect.right > bounds.right) { clipped = true; break; }
        }
      }
      if (clipped) continue;
      const hit = document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
      if (!hit || !(hit === node || node.contains(hit) || hit.contains(node))) continue;
      candidate = { node, path, ref }; break;
    }
    clock = advanceReadingClock(clock, candidate?.path ?? null, now);
    if (!candidate || !clock || clock.elapsed < requiredReadingMs(candidate.node.textContent ?? "")) return;
    clock = null; saving = true;
    try {
      const result = await markVerseRead(candidate.ref.scope, candidate.ref.verse!, true, { source: "automatic" });
      if (!result.ok && result.message !== failure) { failure = result.message; feedback(result.message); }
    } finally { saving = false; }
  }

  return {
    async handleAction(button: HTMLButtonElement) {
      activity(); clock = null;
      if ("readingAutomatic" in button.dataset) {
        const enable = !getReadingProgressSnapshot().state.automatic;
        const result = await setAutomaticReading(enable);
        feedback(result.ok ? (enable ? "Marcação automática ativada. Revise seus checks quando quiser." : "Marcação automática pausada.") : result.message);
        return;
      }
      const chapter = "readingComplete" in button.dataset;
      const ref = resolve(chapter ? button.dataset.readingComplete : button.dataset.readingToggle);
      if (!ref || (!chapter && !ref.verse)) { feedback("Não foi possível identificar esta passagem."); return; }
      const snapshot = getReadingProgressSnapshot();
      const wasRead = chapter ? chapterReadingSummary(snapshot.state, ref.scope).complete : isVerseRead(snapshot.state, ref.scope, ref.verse!);
      const result = chapter ? await markChapterRead(ref.scope, !wasRead) : await markVerseRead(ref.scope, ref.verse!, !wasRead);
      feedback(result.ok ? `${button.dataset.readingLabel} ${wasRead ? "desmarcado. Marcação automática pausada." : "marcado como lido."}` : result.message, result.ok ? result.undo : undefined);
    },
    stop() {
      disposed = true; clearInterval(timer); cancelAnimationFrame(frame); mutation.disconnect(); unsubscribe();
      for (const event of ["pointerdown", "keydown", "touchstart"]) document.removeEventListener(event, activity, true);
      document.removeEventListener("scroll", scroll, true); document.removeEventListener("visibilitychange", interrupt); window.removeEventListener("blur", interrupt);
    },
  };
}
