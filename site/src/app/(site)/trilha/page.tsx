import type { Metadata } from "next";
import Link from "next/link";
import styles from "@/components/community/community.module.css";
import { formatInt } from "@/lib/canon/text";
import { trail } from "@/lib/community/data";
import { formatDateBR } from "@/lib/community/ponte";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Trilhas",
  description: "Trilhas de leitura feitas das ligações entre versículos, com o texto da Bíblia Livre.",
  alternates: { canonical: "/trilha" },
};

export default function TrailsPage() {
  return (
    <main id="conteudo" className={styles.page}>
      <div className={styles.column}>
        <h1 className={styles.title}>Trilhas</h1>
        <p className={styles.lede}>Pares de versículos ligados, um por dia, para ler sozinho ou mandar a alguém.</p>
        <ul className={styles.list}>
          <li>
            <Link href={`/trilha/${trail.slug}`} className={styles.rowLink}>
              <span className={styles.rowMain}>{trail.title}</span>
              <span className={styles.rowCount}>
                {formatInt(trail.steps.length)} passos · {formatDateBR(trail.firstDate)} a {formatDateBR(trail.lastDate)}
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
