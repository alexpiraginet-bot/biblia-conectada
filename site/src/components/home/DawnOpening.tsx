import Link from "next/link";
import { Icon } from "@/components/icons";
import type { LivingGraphData } from "@/lib/explore/living-graph";
import { openingNodes } from "@/lib/explore/opening";
import { DawnConstellation } from "./DawnConstellation";
import { HeroSky } from "./HeroSky";
import styles from "./DawnOpening.module.css";

/**
 * The cover's opening: the sky of real arcs with the page's title (HeroSky), then the crystal spheres of one real
 * connection, then the ways in.
 */
export function DawnOpening({ graph }: { graph: LivingGraphData }) {
  const nodes = openingNodes(graph);
  return (
    <section className={styles.opening} aria-labelledby="home-title" data-dawn-opening="">
      <HeroSky />
      <div className={styles.scene}>
        <div className={styles.backdrop} aria-hidden="true" />
        <div className={styles.inner}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}><span aria-hidden="true" /> Toque e siga a luz</p>
          <h2>Uma passagem<br /><em>leva a outra.</em></h2>
          <p className={styles.lead}>{nodes[0].label} e capítulos ligados a ele nas referências cruzadas. Toque numa esfera e viaje de uma passagem a outra.</p>
        </div>
        <DawnConstellation nodes={nodes} />
        </div>
      </div>
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
    </section>
  );
}
