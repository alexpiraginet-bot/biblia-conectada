import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchPage } from "@/components/search/SearchPage";
import { SearchPanel } from "@/components/search/SearchPanel";
import styles from "./buscar.module.css";

/** How the search reads a query (src/components/search/core.ts and text-index.ts), each with an example to open. */
const RULES: { term: string; text: string; example: string }[] = [
  { term: "Referência", text: "Em qualquer forma; abre o versículo ou o capítulo.", example: "Is 9:6" },
  { term: "Livro", text: "O começo do nome basta.", example: "ezeq" },
  { term: "Palavras", text: "Todas no mesmo versículo, em qualquer ordem, sem diferença de acento ou maiúscula.", example: "luz trevas" },
  { term: "Frase", text: "Entre aspas: as palavras nessa ordem, uma depois da outra.", example: "“grande luz”" },
  { term: "Tema", text: "Os temas da OpenBible.info, com as passagens de cada um.", example: "misericórdia" },
];

export const metadata: Metadata = shareMetadata({
    title: "Buscar",
    description: "Busca na Bíblia Conectada: referência (Is 9:6), livro, tema e palavras ou frases do texto da Bíblia Livre.",
    path: "/buscar",
  });

// The search as a page: where the "Buscar" tab and the search box lead without JavaScript, and where "Ver os N
// versículos" opens. The query is the ?q= of the address, read in the browser, so the page itself stays static; the
// results come from the word index in public/data/busca/v1 (src/components/search/text-index.ts).
export default function Buscar() {
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <h1 className="bc-display">Buscar</h1>
      <p className="bc-lede">
        Uma referência como Is 9:6, o nome de um livro ou de um tema, ou palavras do texto da Bíblia Livre. Entre aspas, a frase exata.
      </p>
      <Suspense fallback={<SearchPanel page shell />}>
        <SearchPage />
      </Suspense>
      <aside className={styles.help} aria-labelledby="como-buscar">
        <h2 id="como-buscar" className="bc-section-title">
          Como buscar
          <small>os versículos mais ligados vêm primeiro</small>
        </h2>
        <dl className={styles.rules}>
          {RULES.map((r) => (
            <div key={r.term}>
              <dt>{r.term}</dt>
              <dd>
                {r.text} <Link href={`/buscar?q=${encodeURIComponent(r.example)}`}>{r.example}</Link>
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </main>
  );
}
