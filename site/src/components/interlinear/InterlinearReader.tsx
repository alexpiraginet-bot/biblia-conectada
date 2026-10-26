import Link from "next/link";
import type { InterlinearPassage } from "@/lib/interlinear/types";
import { InterlinearWords } from "./InterlinearWords";
import styles from "./interlinear.module.css";

type PassageLink = Pick<InterlinearPassage, "id" | "reference">;

export function InterlinearReader({ passage, previous, next }: { passage: InterlinearPassage; previous?: PassageLink; next?: PassageLink }) {
  const readingHref = `/${passage.bookSlug}/${passage.chapter}/${passage.verse}`;
  return <main id="conteudo" className={`site-page ${styles.page}`}>
    <nav className={styles.breadcrumb} aria-label="Caminho da leitura"><Link href="/ler">Ler</Link><span aria-hidden="true">/</span><Link href="/interlinear">Palavra por palavra</Link></nav>
    <header className={styles.passageHeading}>
      <div><p className={styles.eyebrow}>Interlinear · coleção inicial</p><h1>{passage.reference}</h1>
        <p className={styles.sourceLine}>{passage.sourceEdition}</p>
      </div>
      <Link className={styles.readLink} href={readingHref} prefetch={false}>Ler no capítulo <span aria-hidden="true">↗</span></Link>
    </header>
    <InterlinearWords passage={passage} />
    <section className={styles.wholePassage} aria-labelledby="whole-passage-title">
      <div><p className={styles.eyebrow}>Leitura · Bíblia Livre</p><h2 id="whole-passage-title">Leia também<br /><em>em português.</em></h2></div>
      <div><blockquote>{passage.readingText}</blockquote><p className={styles.readingCredit}>Bíblia Livre · {passage.reference} <Link href={readingHref} prefetch={false}>Continuar a leitura <span aria-hidden="true">↗</span></Link></p></div>
    </section>
    {passage.contextNote && <section className={styles.contextNote} aria-labelledby="context-note-title"><h2 id="context-note-title">Uma atenção ao contexto</h2><p>{passage.contextNote}</p></section>}
    <details className={styles.method}>
      <summary>Como ler o interlinear e conferir as fontes <span aria-hidden="true">+</span></summary>
      <div className={styles.methodContent}>
        <p>Cada unidade mantém o texto-base em cima e um sentido contextual em português embaixo. Algumas formas reúnem mais de uma palavra, ou precisam de várias palavras em português. A ordem do original é preservada.</p>
        <p>O interlinear ajuda a examinar o texto; não oferece uma equivalência única ou uma tradução exata em todos os contextos. A transliteração representa letras de outro alfabeto e não é uma gravação de pronúncia.</p>
        <p><strong>Texto-base:</strong> {passage.sourceEdition}. <strong>Referência na fonte:</strong> <bdi>{passage.sourceReference}</bdi>.</p>
        {passage.sourceNote && <p>{passage.sourceNote}</p>}
        <p>Texto anotado e dados lexicais: <a href={passage.sourceUrl} target="_blank" rel="noreferrer">STEPBible Data — consultar a fonte desta passagem</a>, <a href={passage.licenseUrl} target="_blank" rel="noreferrer">CC BY 4.0</a>.</p>
        <p lang="en">Data created by <a href="https://www.STEPBible.org" target="_blank" rel="noreferrer">www.STEPBible.org</a> based on work at Tyndale House Cambridge.</p>
        <p>As glosas em português são escolhas editoriais feitas com assistência de IA, ainda sem revisão acadêmica. Os dados derivados do projeto seguem a licença <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>; a fonte mantém sua licença original. O texto corrido da Bíblia Livre é apresentado para comparação, sem alinhamento automático das palavras.</p>
        <p><Link href="/sobre">Fontes e créditos do projeto</Link></p>
      </div>
    </details>
    <nav className={styles.passagePager} aria-label="Outras passagens desta coleção">
      {previous ? <Link href={`/interlinear/${previous.id}`} prefetch={false}><small>← Anterior na coleção</small><strong>{previous.reference}</strong></Link> : <Link href="/interlinear"><small>← Voltar</small><strong>Todas as passagens</strong></Link>}
      {next ? <Link href={`/interlinear/${next.id}`} prefetch={false}><small>Seguinte na coleção →</small><strong>{next.reference}</strong></Link> : <Link href="/interlinear"><small>Explorar →</small><strong>Todas as passagens</strong></Link>}
    </nav>
  </main>;
}
