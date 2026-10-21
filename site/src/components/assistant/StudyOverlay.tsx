"use client";

import { useEffect, useState } from "react";
import { DATA_TIMEOUT_MS, loadChapterText } from "@/lib/community/fetchers";
import { StudyChat, type StudyPassage } from "./StudyChat";
import { resolveStudyReference } from "./study-reference";
import books from "@/data/generated/books.json";
import type { Book } from "@/lib/canon/types";

export type StudyOverlayProps = { path: string };
const translatedChapters = new Map<string, Promise<string[]>>();

/** The edition is part of the cache key; a failed or stalled chapter can be retried. */
function loadOpenNbvChapter(slug: string, chapter: number, count: number): Promise<string[]> {
  const url = `/data/translations/open-nbv/${slug}/${chapter}.json`;
  let pending = translatedChapters.get(url);
  if (!pending) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DATA_TIMEOUT_MS);
    pending = fetch(url, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("chapter unavailable");
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length !== count || rows.some((text) => typeof text !== "string" || !text.trim())) throw new Error("missing verse");
      return rows as string[];
    }).finally(() => clearTimeout(timer));
    pending.catch(() => translatedChapters.delete(url));
    translatedChapters.set(url, pending);
  }
  return pending;
}

/** Validate against the real canon before fetching, then validate the returned exact verse. */
export async function loadStudyPassage(path: string): Promise<StudyPassage> {
  const selected = resolveStudyReference(path, books as Book[]);
  if (!selected || !path.includes("/")) throw new Error("invalid reference");
  const { book, chapter, verse, translation } = selected;
  const rows = translation === "open-nbv" ? await loadOpenNbvChapter(book.slug, chapter, book.verses[chapter - 1]) : await loadChapterText(book.slug, chapter);
  const text = Array.isArray(rows) ? rows[verse - 1] : undefined;
  if (typeof text !== "string" || !text.trim()) throw new Error("missing verse");
  return { book: book.slug, chapter, verse, reference: `${book.name} ${chapter}:${verse}`, text, ...(translation ? { translation } : {}) };
}

export function StudyOverlay({ path }: StudyOverlayProps) {
  const [passage, setPassage] = useState<StudyPassage | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadStudyPassage(path).then((value) => { if (live) setPassage(value); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [path, attempt]);
  if (failed) return <div role="alert"><p>Não foi possível carregar esta passagem.</p><button type="button"
    onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>Tentar novamente</button></div>;
  return passage ? <StudyChat passage={passage} /> : <p role="status">Carregando o texto da passagem…</p>;
}
