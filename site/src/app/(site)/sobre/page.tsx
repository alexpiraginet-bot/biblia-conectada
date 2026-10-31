import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { marked } from "marked";
import { credits } from "@/lib/data";
import styles from "./sobre.module.css";
import { INSTALL_URL } from "@/lib/site-identity";

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
      <section id="jornada" className={styles.prose} aria-labelledby="journey-privacy-title">
        <h2 id="journey-privacy-title">Sua jornada e seus dados</h2>
        <p>A <Link href="/jornada" prefetch={false}>Jornada de leitura</Link> é opcional e começa sem cadastro. Ao ativá-la, um identificador protegido neste navegador permite manter o saldo e as tarefas na nuvem. O acompanhamento registra tempo ativo por categoria, pontos e dias de participação; não envia o texto dos versículos nem um histórico das passagens lidas.</p>
        <p>Uma cópia do último progresso fica no aparelho. A confirmação de pontos depende da conexão. Sem uma conta vinculada, apagar os cookies ou usar outro navegador perde o acesso à jornada anterior. Você pode pausar o acompanhamento ou apagar a jornada na própria página. Registros inativos expiram após um ano.</p>
        <p>O Mini Jesus da Bentô 3D Labs é uma recompensa futura em preparação. Atingir a meta sinaliza progresso; não garante entrega nem abre um resgate agora. Identificação para entrega, disponibilidade e validação serão apresentadas quando a campanha estiver pronta.</p>
      </section>
      <section id="instalar" className={`${styles.prose} ${styles.install}`} aria-labelledby="install-title">
        <h2 id="install-title">Instalar no iPhone</h2>
        <p>Tenha a Bíblia Conectada na Tela de Início do iPhone ou iPad. Você pode rever estes passos quando quiser.</p>
        <ol>
          <li>Abra <a href={INSTALL_URL}>a página de instalação</a> no <strong>Safari</strong> e aguarde o símbolo dourado aparecer.</li>
          <li>Toque em <strong>Compartilhar</strong>, o quadrado com a seta para cima. Ele pode estar no menu da página.</li>
          <li>Escolha <strong>Adicionar à Tela de Início</strong>. Role as opções se precisar.</li>
          <li>Confira o nome <strong>Bíblia Conectada</strong> e o símbolo dourado. Mantenha <strong>Abrir como app web</strong> ativado, se aparecer, e toque em <strong>Adicionar</strong>.</li>
        </ol>
        <p>Se o link abriu dentro do Instagram ou WhatsApp, abra-o no Safari antes de seguir os passos.</p>
      </section>
    </main>
  );
}
