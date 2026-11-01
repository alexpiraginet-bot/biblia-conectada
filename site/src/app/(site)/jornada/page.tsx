import { JourneyDashboard } from "@/components/rewards/JourneyDashboard";
import Link from "next/link";
import { shareMetadata } from "@/lib/share-metadata";
import styles from "@/components/rewards/journey.module.css";
import ReadingProgressDashboard from "@/components/reading-progress/ReadingProgressDashboard";
import { translationBooks } from "@/lib/translation-reading";
import type { ReadingCatalog } from "@/lib/reading-progress/model";

export const metadata = shareMetadata({
  title: "Minha jornada",
  description: "Marque os versículos e capítulos lidos e acompanhe a leitura completa da Bíblia. Veja também seus pontos e dias ativos crescerem no seu ritmo.",
  path: "/jornada",
});

export default function JourneyPage() {
  const compactBooks = (id: "blivre" | "open-nbv") => translationBooks(id)!.map(({ slug, name, verses }) => ({ slug, name, verses }));
  const catalog: ReadingCatalog = { blivre: compactBooks("blivre"), "open-nbv": compactBooks("open-nbv") };
  return <main id="conteudo" className={`site-page ${styles.page}`} data-journey-page>
    <JourneyDashboard><ReadingProgressDashboard catalog={catalog} /></JourneyDashboard>
    <noscript><style>{"[data-journey-start] { display: none; }"}</style><p className={styles.noscript}>O acompanhamento da jornada precisa de JavaScript. Você pode continuar <Link href="/ler" prefetch={false}>lendo a Bíblia</Link> e consultar as regras nesta página.</p></noscript>
  </main>;
}
