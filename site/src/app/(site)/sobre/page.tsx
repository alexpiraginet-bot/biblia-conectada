import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import { marked } from "marked";
import { credits } from "@/lib/data";
import styles from "./sobre.module.css";

export const metadata: Metadata = shareMetadata({
    title: "Sobre e créditos",
    description: "Fontes, licenças e créditos da Bíblia Conectada.",
    path: "/sobre",
  });

// ATTRIBUTION.md rendered verbatim at build time (trusted repository file; no client JavaScript).
export default function Sobre() {
  const html = marked.parse(credits.attributionMarkdown, { async: false });
  return (
    <main id="conteudo" className="site-page">
      <article className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
