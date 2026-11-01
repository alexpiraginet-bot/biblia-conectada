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
      <section id="audiencia" className={styles.prose} aria-labelledby="audience-privacy-title">
        <h2 id="audience-privacy-title">Audiência e privacidade</h2>
        <p>Contamos visualizações por área do site e páginas mantidas visíveis por pelo menos 30 segundos. Os relatórios próprios guardam totais por dia, área e origem geral do acesso; não usam cookies ou identificador de visitante. Um código aleatório por visualização expira em até uma hora e evita contar o mesmo evento duas vezes. Essa medição não informa quantas pessoas diferentes visitaram o site. Não enviamos o texto dos versículos, pesquisas ou conversas com a IA para esses contadores.</p>
        <p>Os contadores permanecem por até 400 dias e ajudam a melhorar o projeto e apresentar sua audiência a parceiros. Proteção contra abuso usa uma chave temporária, calculada no servidor, que expira em até dois minutos; IP não faz parte do relatório. Preferências “Não rastrear” e Controle Global de Privacidade são respeitadas. Bloqueadores e recusas podem reduzir a cobertura.</p>
        <p>O Google Analytics, quando configurado, só carrega se você permitir. Essa opção pode usar cookies para estatísticas de visitantes e recebe somente a área geral da página, sem versículos, buscas ou mensagens. Personalização de anúncios e listas de remarketing não são ativadas.</p>
        <p><button type="button" data-audience-preference="basic">Somente contagem própria</button>{" "}<button type="button" data-audience-preference="google">Permitir Google Analytics</button>{" "}<button type="button" data-audience-preference="off">Desativar medição</button></p>
        <p data-audience-status="" role="status">Você pode alterar sua preferência a qualquer momento neste navegador.</p>
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
