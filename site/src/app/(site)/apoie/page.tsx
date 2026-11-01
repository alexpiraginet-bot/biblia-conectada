import { SupportCampaign } from "@/components/support/SupportCampaign";
import { shareMetadata } from "@/lib/share-metadata";
import styles from "@/components/support/support.module.css";
export const metadata = shareMetadata({ title: "A Palavra vira cuidado", description: "Apoie a Bíblia Conectada, a produção dos mini Jesus da Bentô 3D Labs e a entrega de cestas básicas. Contribua pelo Pix e acompanhe a campanha.", path: "/apoie" });
export default function SupportPage() { return <main id="conteudo" className={`site-page ${styles.page}`}><SupportCampaign /><noscript>Ative o JavaScript para escolher o valor, gerar o Pix e consultar o andamento atualizado.</noscript></main>; }
