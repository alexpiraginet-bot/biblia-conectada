import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import { SavedList } from "@/components/salvos/SavedList";
import styles from "@/components/salvos/salvos.module.css";

export const metadata: Metadata = {
  ...shareMetadata({
    title: "Salvos",
    description: "Trechos da Bíblia salvos neste aparelho, só no navegador.",
    path: "/salvos",
  }),
  robots: { index: false },
};

// Static shell; the list is read from this browser's localStorage after the page loads (lib/salvos.ts).
export default function SalvosPage() {
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <h1 className="bc-display">Salvos</h1>
      <p className="bc-lede">
        Ficam só neste aparelho, guardados pelo navegador. Nada é enviado a um servidor, e limpar os dados do site apaga a
        lista.
      </p>
      <SavedList />
    </main>
  );
}
