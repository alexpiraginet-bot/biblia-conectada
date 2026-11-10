"use client";

import { usePlans } from "./store";
import styles from "./planos.module.css";

/**
 * On the plans' index, beside a plan's name: the word that says this device follows it. A word in the line, not a
 * block above the list, so nothing on the page moves when it appears. Renders nothing for a plan not followed.
 */
export function FollowingMark({ id }: { id: string }) {
  const state = usePlans();
  if (!state?.planos[id]) return null;
  return (
    <span className={styles.following} data-following={id}>
      seguindo
    </span>
  );
}
