"use client";

import { useEffect, useState } from "react";
import booksJson from "@/data/generated/books.json";
import { createGrid } from "@/lib/canon/grid";
import type { Book } from "@/lib/canon/types";
import { createTextIndex, markVerse, type Segment, type TextQuery } from "./text-index";

// The text results in the browser: the index files (public/data/busca/v1/) and, for the snippets, the chapter texts
// the reading pages' previews already use (public/data/text/<livro>/<capitulo>.json). Kept for the whole visit, so a
// search typed again, or the /buscar page after the palette, needs no new request.
const grid = createGrid(booksJson as Book[]);

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export const textIndex = createTextIndex(getJson);

const chapters = new Map<string, Promise<string[]>>();
function chapterText(slug: string, chapter: number): Promise<string[]> {
  const k = `${slug}/${chapter}`;
  let p = chapters.get(k);
  if (!p) {
    p = getJson(`/data/text/${k}.json`) as Promise<string[]>;
    chapters.set(k, p);
    p.catch(() => chapters.delete(k));
  }
  return p;
}

export type TextItem = { rank: number; links: number; ref: string; href: string; segments: Segment[] };
export type TextResults = { key: string; status: "done"; total: number; items: TextItem[] } | { key: string; status: "error" };

/**
 * The first `want` text results of `q`, with their snippets. Gives back the last answer that arrived, which may be
 * for an earlier query while the new one loads (`pending`): what is on screen stays until the next answer replaces it.
 */
export function useTextSearch(q: TextQuery | null, want: number, maxWords: number) {
  const [settled, setSettled] = useState<TextResults | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!q) return;
    let live = true;
    const go = async () => {
      try {
        const [meta, ranks] = await Promise.all([textIndex.meta(), textIndex.search(q)]);
        const items = await Promise.all(
          Array.from(ranks.subarray(0, want), async (rank) => {
            const { book, chapter, verse } = grid.locate(meta.verse[rank]);
            const text = (await chapterText(book.slug, chapter))[verse - 1];
            return {
              rank,
              links: meta.links[rank],
              ref: `${book.name} ${chapter}:${verse}`,
              href: `/${book.slug}/${chapter}/${verse}`,
              segments: markVerse(text, q, maxWords),
            };
          }),
        );
        if (live) setSettled({ key: q.key, status: "done", total: ranks.length, items });
      } catch {
        if (live) setSettled({ key: q.key, status: "error" });
      }
    };
    // a query answered from memory shows at once; one that needs the network waits for a pause in the typing
    const timer = setTimeout(go, textIndex.ready(q) ? 0 : 120);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [q, want, maxWords, attempt]);

  const current = q && settled?.key === q.key ? settled : null;
  return {
    /** the answer to show: this query's, or the last one while this one loads */
    settled: q ? settled : null,
    /** this query's answer has not arrived yet */
    pending: !!q && !current,
    /** more results were asked for this query and are on their way */
    loadingMore: current?.status === "done" && current.items.length < Math.min(want, current.total),
    retry: () => setAttempt((a) => a + 1),
  };
}
