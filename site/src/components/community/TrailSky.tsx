"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { KEYS, readRaw, subscribeStore, writeJSON } from "@/lib/community/store";
import { ArcSky, type SkyArc } from "./ArcSky";

export type TrailArc = { step: number; x0: number; x1: number; votes: number };

const parse = (raw: string | null): number[] => {
  try {
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
};

function useVisited(slug: string): number[] {
  const raw = useSyncExternalStore(
    subscribeStore,
    () => readRaw(KEYS.trail(slug)),
    () => null,
  );
  return parse(raw);
}

/**
 * The trail's constellation: one arc per step. Steps opened on this device show brighter; once every step has been
 * opened, the whole trail lights up in gold. No counter, no badge: only the light.
 */
export function TrailSky({ slug, arcs, captionId }: { slug: string; arcs: TrailArc[]; captionId: string }) {
  const visited = new Set(useVisited(slug));
  const complete = arcs.every((a) => visited.has(a.step));
  const sky: SkyArc[] = arcs.map((a) => ({
    x0: a.x0,
    x1: a.x1,
    votes: a.votes,
    look: complete ? "gold" : "tone",
    dim: !complete && !visited.has(a.step),
    id: String(a.step),
  }));
  const stars = complete ? arcs.flatMap((a) => [{ x: a.x0, gold: true }, { x: a.x1, gold: true }]) : [];
  return (
    <ArcSky
      arcs={sky}
      stars={stars}
      captionId={captionId}
      caption={
        complete ? (
          <>Todos os passos foram abertos neste aparelho, e a trilha acendeu. A linha vai de Gênesis a Apocalipse; cada arco é um passo.</>
        ) : (
          <>
            A linha vai de Gênesis a Apocalipse; cada arco é um passo, com a cor pela distância e a espessura pelos votos. Os passos
            abertos neste aparelho ficam mais claros. Quando todos forem abertos, a trilha acende em ouro.
          </>
        )
      }
    />
  );
}

/** The trail's one action: start at step 1, or go on from the first step not yet opened on this device. */
export function TrailStart({ slug, steps }: { slug: string; steps: number[] }) {
  const visited = new Set(useVisited(slug));
  const left = steps.filter((n) => !visited.has(n));
  const [label, n] =
    visited.size === 0 ? ["Começar no passo 1", steps[0]] : left.length ? [`Continuar no passo ${left[0]}`, left[0]] : ["Ler de novo do passo 1", steps[0]];
  return (
    <Link href={`/trilha/${slug}/${n}`} className="bc-button bc-button--primary">
      {label}
      <Icon name="chev-r" />
    </Link>
  );
}

/** Remembers, on this device only, that this step was opened. */
export function MarkVisited({ slug, step }: { slug: string; step: number }) {
  useEffect(() => {
    const seen = parse(readRaw(KEYS.trail(slug)));
    if (!seen.includes(step)) writeJSON(KEYS.trail(slug), [...seen, step].sort((a, b) => a - b));
  }, [slug, step]);
  return null;
}
