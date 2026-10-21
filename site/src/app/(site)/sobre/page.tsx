import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
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
      <section id="instalar" className={`${styles.prose} ${styles.install}`} aria-labelledby="install-title">
        <h2 id="install-title">Instalar no iPhone</h2>
        <p>Tenha a Bíblia Conectada na Tela de Início do iPhone ou iPad. Você pode rever estes passos quando quiser.</p>
        <ol>
          <li>Abra <Link href="/">a Bíblia Conectada</Link> no <strong>Safari</strong>.</li>
          <li>Toque em <strong>Compartilhar</strong>, o quadrado com a seta para cima. Ele pode estar no menu da página.</li>
          <li>Escolha <strong>Adicionar à Tela de Início</strong>. Role as opções se precisar.</li>
          <li>Confira o nome <strong>Bíblia Conectada</strong> e o símbolo dourado. Mantenha <strong>Abrir como app web</strong> ativado, se aparecer, e toque em <strong>Adicionar</strong>.</li>
        </ol>
        <p>Se o link abriu dentro do Instagram ou WhatsApp, abra-o no Safari antes de seguir os passos.</p>
      </section>
    </main>
  );
}
