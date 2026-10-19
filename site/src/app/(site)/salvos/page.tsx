import type { Metadata } from "next";
import { SavedList } from "@/components/salvos/SavedList";
import styles from "@/components/salvos/salvos.module.css";

export const metadata: Metadata = {
  title: "Salvos",
  description: "Trechos da Bíblia salvos neste aparelho, só no navegador.",
  robots: { index: false },
};

// Static shell; the list is read from this browser's localStorage after the page loads (lib/salvos.ts).
export default function SalvosPage() {
  return (
    <main id="conteudo" className={styles.main}>
      <h1 className={styles.title}>Salvos</h1>
      <p className={styles.device}>
        Ficam só neste aparelho, guardados pelo navegador. Nada é enviado a um servidor, e limpar os dados do site apaga
        a lista.
      </p>
      <SavedList />
    </main>
  );
}
