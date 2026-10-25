import Link from "next/link";
import { Icon } from "@/components/icons";
import styles from "./living-story.module.css";

/** The artwork introduces the experience; biblical data remains in the atlas. */
export function LivingStory() {
  return (
    <section id="sua-historia" className={styles.story} data-living-story="" aria-labelledby="living-story-title">
      <div className={styles.copy}>
        <span className={styles.signature}><Icon name="heart" /> No seu coração</span>
        <h2 id="living-story-title">Sua história<br />também <em>se conecta.</em></h2>
        <p>Uma pergunta, uma lembrança, o que você está vivendo. Encontre passagens e descubra o contexto por trás das palavras.</p>
        <Link href="/coracao" prefetch={false} className={styles.primary}>Encontrar uma passagem <Icon name="out" /></Link>
        <span className={styles.assistance}>Busca bíblica com IA, acompanhada de fontes.</span>
        <div className={styles.paths}>
          <Link href="/ler" prefetch={false}><Icon name="book" /><span>Começar pela leitura</span><Icon name="out" /></Link>
          <Link href="/arcos" prefetch={false}><Icon name="explore" /><span>Explorar conexões reais</span><Icon name="out" /></Link>
        </div>
      </div>
      <figure className={styles.figure}>
        <div className={styles.media} data-story-media="">
          <video className={styles.film} poster="/living-story/poster.webp" muted playsInline preload="none" data-story-video="" data-src="/living-story/story.mp4" aria-label="Animação artística: fios de luz formam uma digital, um portal e uma rede sobre um livro aberto." />
          <div className={styles.playback} data-story-controls="" hidden>
            <button type="button" data-story-play="">Reproduzir animação</button>
          </div>
        </div>
        <div className={styles.stages} data-story-controls="" role="group" aria-label="Escolha uma forma da animação" hidden>
          <button type="button" data-story-stage="0" data-time="1.2" aria-pressed="true">Sua história</button>
          <button type="button" data-story-stage="1" data-time="6.6" aria-pressed="false">A Palavra</button>
          <button type="button" data-story-stage="2" data-time="11.4" aria-pressed="false">As conexões</button>
        </div>
        <figcaption>Recriação artística · rede ilustrativa</figcaption>
        <p className={styles.status} data-story-status="" role="status" />
      </figure>
    </section>
  );
}
