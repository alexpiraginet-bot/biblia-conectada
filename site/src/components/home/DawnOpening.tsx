import Link from "next/link";
import { Icon } from "@/components/icons";
import type { LivingGraphData } from "@/lib/explore/living-graph";
import { openingNodes } from "@/lib/explore/opening";
import { DawnConstellation } from "./DawnConstellation";
import styles from "./DawnOpening.module.css";

export function DawnOpening({ graph }: { graph: LivingGraphData }) {
  return (
    <section className={styles.opening} aria-labelledby="home-title" data-dawn-opening="">
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span aria-hidden="true" /> Um encontro com a Palavra</p>
          <h1 id="home-title">Uma Palavra.<br /><em>Novos caminhos.</em></h1>
          <p className={styles.lead}>Descubra como cada passagem se conecta à sua vida.</p>
        </div>
        <DawnConstellation nodes={openingNodes(graph)} />
        <div className={styles.starts}>
          <h2>Por onde seu coração<br className={styles.mobileBreak} /> quer começar?</h2>
          <div className={styles.startGrid}>
            <Link href="/liturgia" prefetch={false} className={styles.startCard}>
              <span className={styles.cardArt} aria-hidden="true"><Icon name="sun" /></span>
              <span><strong>Leituras de hoje</strong><span>Seu encontro diário</span></span><Icon name="out" />
            </Link>
            <Link href="/coracao" prefetch={false} className={`${styles.startCard} ${styles.heartCard}`}>
              <span className={styles.cardArt} aria-hidden="true"><Icon name="heart" /></span>
              <span><strong>No seu coração</strong><span>Encontre uma passagem</span></span><Icon name="out" />
            </Link>
          </div>
          <nav className={styles.quickLinks} aria-label="Outras formas de descobrir"><Link href="#atlas-vivo"><Icon name="explore" /> Constelação</Link><Link href="/arcos"><Icon name="arc" /> Céu em 3D</Link><Link href="/caminhos"><Icon name="map" /> Mapa de Jesus</Link></nav>
        </div>
      </div>
    </section>
  );
}
