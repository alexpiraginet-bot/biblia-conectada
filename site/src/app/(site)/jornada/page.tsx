import { JourneyDashboard } from "@/components/rewards/JourneyDashboard";
import Link from "next/link";
import { shareMetadata } from "@/lib/share-metadata";
import styles from "@/components/rewards/journey.module.css";

export const metadata = shareMetadata({
  title: "Minha jornada",
  description: "Cultive seu hábito de leitura, acompanhe a liturgia e descubra conexões. Veja seus pontos e dias ativos crescerem no seu ritmo.",
  path: "/jornada",
});

export default function JourneyPage() {
  return <main id="conteudo" className={`site-page ${styles.page}`} data-journey-page>
    <JourneyDashboard />
    <noscript><style>{"[data-journey-start] { display: none; }"}</style><p className={styles.noscript}>O acompanhamento da jornada precisa de JavaScript. Você pode continuar <Link href="/ler" prefetch={false}>lendo a Bíblia</Link> e consultar as regras nesta página.</p></noscript>
  </main>;
}
