import type { Metadata } from "next";
import { CommunityWays } from "@/components/community/CommunityWays";
import { DeviceNote } from "@/components/community/DeviceNote";
import { Mesa } from "@/components/community/Mesa";
import styles from "@/components/community/community.module.css";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Mesa da semana",
  description:
    "Para o grupo, num aparelho só: escolha o capítulo da reunião, veja as ligações dele em arcos e traga até três para a conversa. Sem conta.",
  alternates: { canonical: "/mesa" },
};

export default function MesaPage() {
  return (
    <main id="conteudo" className="site-page">
      <header className={styles.head}>
        <h1 className="bc-display">Mesa da semana</h1>
        <p className={`bc-lede ${styles.lede}`}>
          Para a célula, a escola bíblica ou a família, num aparelho só (a TV ou um celular que passa de mão em mão): escolha o
          capítulo da reunião, e cada pessoa traz até três ligações dele para a mesa. Tocar numa ligação mostra os dois textos
          lado a lado. Ninguém precisa escrever nada além do trecho.
        </p>
      </header>
      <Mesa />
      <CommunityWays current="/mesa" />
      <DeviceNote>A mesa fica guardada só neste aparelho: sem conta, sem servidor, sem nomes.</DeviceNote>
    </main>
  );
}
