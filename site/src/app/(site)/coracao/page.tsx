import type { Metadata } from "next";
import Link from "next/link";
import { HeartConversation } from "@/components/coracao/HeartConversation";
import { Icon } from "@/components/icons";
import { shareMetadata } from "@/lib/share-metadata";
import styles from "@/components/coracao/HeartConversation.module.css";

export const metadata: Metadata = shareMetadata({
  title: "No seu coração",
  description: "Encontre passagens a partir do que você sente, de uma lembrança ou de uma pergunta. Reflita à luz dos ensinamentos de Jesus, sempre voltando ao texto bíblico.",
  path: "/coracao",
});

export default function HeartPage() {
  return <main id="conteudo" className={styles.page}>
    <header className={styles.heading}>
      <span className={styles.mark}><Icon name="heart" /></span>
      <div><p className={styles.eyebrow}>Um espaço para refletir</p><h1>No seu coração</h1></div>
      <Link href="/ler/open-nbv" className={styles.readLink} prefetch={false}>Abrir a Bíblia <span aria-hidden="true">↗</span></Link>
    </header>
    <HeartConversation />
    <noscript><p>Esta conversa precisa de JavaScript. Você pode <Link href="/buscar">buscar uma passagem</Link> ou <Link href="/ler/open-nbv">ler a Bíblia</Link>.</p></noscript>
  </main>;
}
