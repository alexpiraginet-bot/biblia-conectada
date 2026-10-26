import "server-only";
import Link from "next/link";
import { interlinearPathForReading } from "@/lib/interlinear/paths";
import styles from "@/components/assistant/VerseStudyLink.module.css";

/** Only offer a direct study link when this exact BLIVRE reference has an explicit source mapping. */
export function InterlinearStudyLink({ path, label }: { path: string; label: string }) {
  const href = interlinearPathForReading(path);
  if (!href) return null;
  return <Link href={href} prefetch={false} className={styles.link} aria-label={`${label}, palavra por palavra`}>
    Palavra por palavra <span aria-hidden="true">↗</span>
  </Link>;
}
