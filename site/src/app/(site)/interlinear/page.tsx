import Link from "next/link";
import { getInterlinearPassage, listInterlinearPassages } from "@/lib/interlinear/data";
import { shareMetadata } from "@/lib/share-metadata";
import { formatInt } from "@/lib/canon/text";
import styles from "@/components/interlinear/interlinear.module.css";

export const metadata = shareMetadata({ title: "Bíblia interlinear · Palavra por palavra", description: "Explore uma coleção inicial de passagens em hebraico e grego, com sentidos em português sob cada unidade e detalhes ao tocar.", path: "/interlinear" });

export default function InterlinearIndex() {
  const passages = listInterlinearPassages();
  const introduction = passages.find((passage) => passage.id === "joao/1/1") ?? passages[0];
  const sample = introduction ? getInterlinearPassage(introduction.bookSlug, introduction.chapter, introduction.verse) : null;
  return <main id="conteudo" className={`site-page ${styles.page}`}>
    <nav className={styles.breadcrumb} aria-label="Caminho da leitura"><Link href="/ler">← Voltar à leitura</Link></nav>
    <header className={styles.indexHeader}>
      <div><p className={styles.eyebrow}>Interlinear · coleção inicial</p>
        <h1>A Bíblia,<br /><em>palavra por palavra.</em></h1>
        <p className={styles.indexIntro}>O texto hebraico ou grego em cima. O sentido em português embaixo. Toque numa palavra e olhe mais de perto.</p>
        {introduction && <Link className={styles.startLink} href={`/interlinear/${introduction.id}`} prefetch={false}>Começar em {introduction.reference} <span aria-hidden="true">→</span></Link>}
      </div>
      {sample && <div className={styles.specimen} aria-label={`Amostra do alinhamento em ${sample.reference}`}>
        <div className={styles.specimenLabel}><span>Uma amostra do alinhamento</span><Link href={`/interlinear/${sample.id}`} prefetch={false}>{sample.reference} ↗</Link></div>
        <ol className={styles.specimenWords} dir={sample.direction}>{sample.tokens.slice(0, 5).map((token) => <li key={token.id}>
          <span className={styles.specimenOriginal} lang={sample.language} dir={sample.direction}>{token.original}</span>
          <bdi className={styles.specimenGloss} dir="ltr">{token.gloss}</bdi>
        </li>)}</ol>
        <p className={styles.specimenCaption}>A ordem acompanha o texto-base.<br />O sentido se esclarece na frase inteira.</p>
      </div>}
    </header>
    <section aria-labelledby="collection-title">
      <div className={styles.collectionHeading}><h2 id="collection-title">Escolha uma passagem.</h2><p>{formatInt(passages.length)} passagens nesta coleção inicial</p></div>
      <div className={styles.collections}>{(["he", "grc"] as const).map((language) => {
        const group = passages.filter((passage) => passage.language === language);
        return <section key={language} className={styles.collection} aria-label={language === "he" ? "Passagens em hebraico" : "Passagens em grego"}>
          <h3>{language === "he" ? "Hebraico · Antigo Testamento" : "Grego · Novo Testamento"}<span>{formatInt(group.length)} passagens</span></h3>
          <ol className={styles.passageList}>{group.map((passage) => <li key={passage.id}><Link href={`/interlinear/${passage.id}`} prefetch={false}><span>{passage.reference}</span><span aria-hidden="true">↗</span></Link></li>)}</ol>
        </section>;
      })}</div>
    </section>
    <p className={styles.indexNote}><strong>Uma ferramenta para aprofundar a leitura.</strong> Esta coleção inicial apresenta glosas editoriais em português para as passagens listadas. Ainda não é uma Bíblia interlinear completa. Uma palavra pode ter vários sentidos: confira a frase, as observações e a fonte em cada estudo.</p>
    <details className={styles.method}><summary>O que você encontra aqui <span aria-hidden="true">+</span></summary><div className={styles.methodContent}>
      <p>O interlinear aproxima você das palavras do texto-base e preserva sua ordem. A linha em português oferece um sentido para aquele trecho; não é uma promessa de equivalência exata palavra por palavra.</p>
      <p>Ao selecionar uma unidade, você pode consultar a forma de dicionário, a transliteração, os números de Strong e os dados da fonte. A leitura completa em português continua ao lado do estudo.</p>
      <p>As referências seguem o mapeamento indicado em cada passagem. A numeração do hebraico e de algumas traduções pode ser diferente. Não alinhamos automaticamente os versículos da Open Nova Bíblia Viva.</p>
      <p>As glosas em português são escolhas editoriais feitas com assistência de IA, ainda sem revisão acadêmica. Os dados derivados do projeto seguem a licença <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.</p>
      <p>Fontes textuais anotadas: <a href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noreferrer">STEPBible Data</a>, <a href="https://creativecommons.org/licenses/by/4.0/deed.pt-br" target="_blank" rel="noreferrer">CC BY 4.0</a>. <Link href="/sobre">Ver fontes e créditos</Link>.</p>
      <p lang="en">Data created by <a href="https://www.STEPBible.org" target="_blank" rel="noreferrer">www.STEPBible.org</a> based on work at Tyndale House Cambridge.</p>
    </div></details>
  </main>;
}
