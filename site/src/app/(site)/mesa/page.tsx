import type { Metadata } from "next";
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
    <main id="conteudo" className={styles.page}>
      <div className={styles.column}>
        <p className="kicker">Para grupos</p>
        <h1 className={styles.title}>Mesa da semana</h1>
        <p className={styles.lede}>
          Para a célula, a escola bíblica ou a família, num aparelho só (a TV ou um celular que passa de mão em mão): escolha o
          capítulo da reunião, e cada pessoa traz até três ligações dele para a mesa. Tocar numa ligação mostra os dois textos
          lado a lado. Ninguém precisa escrever nada além do trecho.
        </p>
      </div>
      <Mesa />
      <div className={styles.column}>
        <DeviceNote>A mesa fica guardada só neste aparelho: sem conta, sem servidor, sem nomes.</DeviceNote>
      </div>
    </main>
  );
}
