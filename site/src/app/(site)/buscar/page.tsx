import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPage } from "@/components/search/SearchPage";
import { SearchPanel } from "@/components/search/SearchPanel";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Busca na Bíblia Conectada: referência (Is 9:6), livro e palavra do texto da Bíblia Livre.",
};

// The search as a page: where the "Buscar" tab and the search box lead without JavaScript, and where "Ver os N
// versículos" opens. The query is the ?q= of the address, read on the client.
export default function Buscar() {
  return (
    <main id="conteudo" className="site-page">
      <h1 className="bc-display">Buscar</h1>
      <p className="bc-lede">Uma referência como Is 9:6, o nome de um livro ou uma palavra do texto da Bíblia Livre.</p>
      <Suspense fallback={<SearchPanel page />}>
        <SearchPage />
      </Suspense>
    </main>
  );
}
