import type { Metadata } from "next";
import Link from "next/link";
import { CommunityWays } from "@/components/community/CommunityWays";
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
    <main id="conteudo" className="site-page">
      <header className={styles.head}>
        <h1 className="bc-display">Trilhas</h1>
        <p className={`bc-lede ${styles.lede}`}>Pares de versículos ligados, um por dia, para ler sozinho ou mandar a alguém.</p>
      </header>
      <ul className={`bc-list ${styles.list} ${styles.section}`}>
        <li>
          <Link href={`/trilha/${trail.slug}`}>
            <span className={styles.name}>
              <span className="bc-list__name">{trail.title}</span>
              <span className={styles.desc}>Do Antigo Testamento aos capítulos do nascimento de Jesus</span>
            </span>
            <span className={styles.count}>
              {formatInt(trail.steps.length)} passos · {formatDateBR(trail.firstDate)} a {formatDateBR(trail.lastDate)}
            </span>
          </Link>
        </li>
      </ul>
      <CommunityWays current="/trilha" />
    </main>
  );
}
