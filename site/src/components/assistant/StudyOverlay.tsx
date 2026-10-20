"use client";

import { useEffect, useState } from "react";
import { BASE, verseFromPath } from "@/lib/community/books-client";
import { loadChapterText } from "@/lib/community/fetchers";
import { StudyChat } from "./StudyChat";

export type StudyOverlayProps = { path: string };
type Passage = { book: string; chapter: number; verse: number; reference: string; text: string };

/** Validate against the real canon before fetching, then validate the returned exact verse. */
export async function loadStudyPassage(path: string): Promise<Passage> {
  const gv = verseFromPath(`/${path}`);
  if (gv === null) throw new Error("invalid reference");
  const { book, chapter, verse } = BASE.locate(gv);
  const text = (await loadChapterText(book.slug, chapter))[verse - 1];
  if (typeof text !== "string" || !text.trim()) throw new Error("missing verse");
  return { book: book.slug, chapter, verse, reference: `${book.name} ${chapter}:${verse}`, text };
}

export function StudyOverlay({ path }: StudyOverlayProps) {
  const [passage, setPassage] = useState<Passage | null>(null);
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
