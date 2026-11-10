import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import { CadernoApp } from "@/components/caderno/CadernoApp";
import styles from "@/components/caderno/caderno.module.css";
import { books } from "@/lib/data";

export const metadata: Metadata = {
  ...shareMetadata({
    title: "Caderno",
    description: "Grifos, anotações e passagens para decorar, guardados só neste aparelho.",
    path: "/caderno",
  }),
  robots: { index: false },
};

// Static shell; the notebook is read from this browser's localStorage after the page loads (lib/caderno). The client
// gets only what it needs to name and check a passage: each book's slug, name and verses per chapter.
export default function CadernoPage() {
  const catalog = books.map(({ slug, name, verses }) => ({ slug, name, verses }));
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <h1 className="bc-display">Caderno</h1>
      <p className="bc-lede">
        Seus grifos, suas anotações e as passagens que você quer decorar. Ficam só neste aparelho, guardados pelo navegador: nada é enviado a um
        servidor, e limpar os dados do site apaga o caderno.
      </p>
      <CadernoApp catalog={catalog} />
      <noscript>
        <p className={styles.how}>O caderno precisa de JavaScript, porque fica guardado no navegador. A leitura da Bíblia funciona sem ele.</p>
      </noscript>
    </main>
  );
}
