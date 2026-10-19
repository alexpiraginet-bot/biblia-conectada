"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { BASE } from "@/lib/community/books-client";
import { loadCalendar } from "@/lib/community/fetchers";
import { shortRef } from "@/lib/community/geometry";
import { PONTE_DAYS, bridgeDate, bridgeHome, bridgeNumber, formatDateBR, saoPauloDate } from "@/lib/community/ponte";
import styles from "./community.module.css";

type Entry = { n: number; date: string; start: number; target: number; min: number };
const noop = () => () => {};

/**
 * Past bridges, newest first. The prerendered list stops at the build day; on later days this device adds the bridges
 * up to today from the calendar (never a future one).
 */
export function PonteArchive({ built, builtThrough }: { built: Entry[]; builtThrough: number }) {
  const today = useSyncExternalStore(noop, () => saoPauloDate(new Date()), () => null);
  const todayN = today ? Math.min(bridgeNumber(today), PONTE_DAYS) : builtThrough;
  const [extra, setExtra] = useState<Entry[]>([]);
  useEffect(() => {
    if (todayN <= builtThrough) return;
    let live = true;
    loadCalendar()
      .then((c) => {
        if (!live) return;
        setExtra(
          c.bridges.slice(builtThrough, todayN).map(([start, target, min], i) => {
            const n = builtThrough + i + 1;
            return { n, date: bridgeDate(n), start, target, min };
          }),
        );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [todayN, builtThrough]);
  const list = [...built, ...extra].filter((b) => b.n <= todayN).reverse();
  if (!list.length) return <p className={styles.small}>O arquivo começa com a Ponte nº 1.</p>;
  return (
    <ol className={styles.list} reversed>
      {list.map((b) => (
        <li key={b.n}>
          <Link href={bridgeHome(b.n, builtThrough)} className={styles.rowLink}>
            <span className={styles.rowLead}>nº {b.n}</span>
            <span className={styles.rowMain}>
              {shortRef(BASE, b.start)} → {shortRef(BASE, b.target)}
            </span>
            <span className={styles.rowCount}>
              {formatDateBR(b.date).slice(0, 5)} · mínimo {b.min}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
