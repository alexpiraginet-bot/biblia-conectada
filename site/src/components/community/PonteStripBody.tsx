"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { BASE, verseFromPath } from "@/lib/community/books-client";
import { linkVotes, loadBridge, loadVerseLinks } from "@/lib/community/fetchers";
import { shortRef, versePath } from "@/lib/community/geometry";
import { decodeDistances, distanceAt } from "@/lib/community/ponte";
import { KEYS, readPonte, readRaw, subscribeStore, writeJSON, type PonteStore } from "@/lib/community/store";
import styles from "./strip.module.css";

const parse = (raw: string | null): PonteStore => {
  try {
    const s = raw ? (JSON.parse(raw) as PonteStore) : null;
    return s?.bridges ? s : { bridges: {} };
  } catch {
    return { bridges: {} };
  }
};
const hops = (d: number) => `${d} ${d === 1 ? "salto" : "saltos"}`;

/** While the strip shows, the page reserves its height below the footer (the column already reserves the phone's tab
 *  bar). The selection bar of the reading pages sits 3.75rem higher (reader/selection.module.css): the strip is never
 *  taller than that. */
const RESERVE = `html[data-ponte-faixa]{scroll-padding-bottom:calc(var(--tabbar-h) + 4.5rem)}html[data-ponte-faixa] body{padding-bottom:3.75rem}`;

/**
 * The bridge strip on the reading pages: "Ponte nº 12 · a 2 saltos / destino Lc 2:10 · mais perto". Every verse page
 * opened from the last verse of the path is a hop when the two verses are linked (the panel's links, any vote);
 * the verse texts stay the page's, so the game is the reading.
 */
export default function PonteStripBody({ pathname }: { pathname: string }) {
  const raw = useSyncExternalStore(subscribeStore, () => readRaw(KEYS.ponte), () => null);
  const store = parse(raw);
  const p = store.current !== undefined ? store.bridges[String(store.current)] : undefined;
  const [dist, setDist] = useState<{ n: number; packed: Uint8Array } | null>(null);
  const [unlinked, setUnlinked] = useState<{ from: number; to: number } | null>(null);
  const here = verseFromPath(pathname);
  const last = p ? p.path[p.path.length - 1] : -1;

  useEffect(() => {
    document.documentElement.setAttribute("data-ponte-faixa", "");
    return () => document.documentElement.removeAttribute("data-ponte-faixa");
  }, []);

  const n = p?.n;
  useEffect(() => {
    if (n === undefined) return;
    let live = true;
    loadBridge(n)
      .then((f) => live && setDist({ n, packed: decodeDistances(f.dist) }))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [n]);

  // a verse page opened while playing: a hop if it is linked to the last verse of the path
  const playing = p?.state === "playing";
  useEffect(() => {
    if (!playing || n === undefined || here === null || here === last) return;
    let live = true;
    const { book, chapter, verse } = BASE.locate(last);
    loadVerseLinks(book.slug, chapter)
      .then((perVerse) => {
        if (!live) return;
        const fresh = readPonte();
        const cur = fresh.bridges[String(n)];
        if (!cur || cur.state !== "playing" || cur.path[cur.path.length - 1] !== last) return;
        const votes = linkVotes(perVerse[verse - 1], here);
        if (votes === undefined) {
          setUnlinked({ from: last, to: here });
          return;
        }
        cur.path.push(here);
        cur.votes.push(votes);
        if (here === cur.target) cur.state = "arrived";
        writeJSON(KEYS.ponte, fresh);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [playing, n, here, last]);

  if (!p) return null;
  const packed = dist && dist.n === p.n ? dist.packed : null;
  const d = packed ? distanceAt(packed, last) : null;
  const prev = p.path.length > 1 ? p.path[p.path.length - 2] : null;
  const dPrev = packed && prev !== null ? distanceAt(packed, prev) : null;
  const move = d === null || dPrev === null ? "" : d < dPrev ? "mais perto" : d > dPrev ? "mais longe" : "mesma distância";
  const target = shortRef(BASE, p.target);
  const off = unlinked && unlinked.to === here && unlinked.from === last && p.state === "playing";
  const taken = p.path.length - 1;

  return (
    <aside className={styles.strip} aria-label={`Ponte nº ${p.n}`}>
      <style href="ponte-faixa" precedence="default">
        {RESERVE}
      </style>
      <div className={styles.inner}>
        <span className={`i i-bridge ${styles.icon}`} aria-hidden="true" />
        <p className={styles.text} role="status">
          {p.state === "arrived" ? (
            <>
              <strong>
                Ponte nº {p.n} · chegou a {target}
              </strong>{" "}
              <span>
                em {hops(taken)}; o mínimo é {p.min}
              </span>
            </>
          ) : off ? (
            <>
              <strong>Este salto não conta</strong>{" "}
              <span>
                {shortRef(BASE, unlinked.to)} não tem ligação com {shortRef(BASE, last)}.
              </span>
            </>
          ) : (
            <>
              <strong>
                Ponte nº {p.n}
                {d !== null && <> · a {hops(d)}</>}
              </strong>{" "}
              <span>
                destino {target}
                {move && <> · {move}</>}
              </span>
            </>
          )}
        </p>
        {off ? (
          <Link href={versePath(BASE, last)} className={styles.action}>
            <Icon name="chev-l" />
            <span className={styles.label}>Voltar a {shortRef(BASE, last)}</span>
          </Link>
        ) : (
          <Link href={p.home} className={styles.action}>
            <span className={styles.label}>Ver a ponte</span>
            <Icon name="chev-r" />
          </Link>
        )}
      </div>
    </aside>
  );
}
