import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ChronologicalReading } from "@/components/journey/ChronologicalReading";
import { CHRONOLOGY_SOURCES, EVENT_DATE_CONTEXT, GOSPEL_COMPOSITION, GOSPELS, loadChronologicalReading } from "@/lib/chronological-reading";
import { verseText } from "@/lib/data";
import styles from "./cronologia.module.css";

export const metadata: Metadata = {
  title: "A vida de Jesus, de perto · Leitura cronológica",
  description: "Um percurso ilustrado pela vida de Jesus, com texto da Bíblia Livre, diferentes olhares dos evangelhos e caminhos para o mapa.",
};

export default async function ChronologyPage() {
  const moments = await loadChronologicalReading(verseText);
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <header className={styles.hero}>
        <div className={styles.heroArt}><Image src="/journey/galilee-dawn.webp" alt="" fill sizes="(max-width: 55rem) 100vw, 80vw" unoptimized preload /></div>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Novo Testamento · Um percurso ilustrado</span>
          <h1>A vida de Jesus,<br /><em>de perto.</em></h1>
          <p>Das primeiras páginas ao horizonte de uma nova história. Caminhe pelos acontecimentos e descubra o olhar de cada evangelho.</p>
          <div className={styles.heroActions}><a href="#percurso">Começar o percurso <span aria-hidden="true">↓</span></a><Link href="/caminhos">Abrir o mapa <span aria-hidden="true">↗</span></Link></div>
        </div>
        <span className={styles.artLabel}>Galileia · Recriação artística por IA</span>
      </header>
      <div className={styles.overview}>
        <p><strong>{moments.length} momentos</strong><span>para seguir a história</span></p>
        <p><strong>{GOSPELS.length} evangelhos</strong><span>com suas próprias perspectivas</span></p>
        <p className={styles.overviewNote}>Uma sequência de leitura dos acontecimentos. Os relatos mantêm suas diferenças de cenário, ordem e ênfase.</p>
      </div>
      <ChronologicalReading moments={moments} />
      <section className={styles.method} id="criterios" aria-labelledby="criteria-title">
        <div><span className={styles.methodEyebrow}>Para ler com atenção</span><h2 id="criteria-title">Cada voz tem<br />seu próprio caminho.</h2></div>
        <div className={styles.methodBody}>
          <p>Este percurso seleciona momentos dos evangelhos em uma ordem narrativa ampla: nascimento, vida pública, paixão e relatos da ressurreição. É um roteiro editorial de leitura, sem pretensão de estabelecer a data ou a posição exata de cada episódio.</p>
          <p>Você pode ler cada evangelista ou comparar os trechos disponíveis. “Passagem relacionada” identifica um vínculo de tema ou contexto que não deve ser confundido com o mesmo relato. As imagens são recriações artísticas, não registros arqueológicos.</p>
          <details className={styles.dates}>
            <summary>Datas dos acontecimentos e datas dos textos <span aria-hidden="true">+</span></summary>
            <h3>O tempo narrado</h3>
            <p>A vida de Jesus se situa entre o fim do período anterior à era comum e o início do século I. A relação do nascimento com Herodes costuma levar à proposta de {EVENT_DATE_CONTEXT.birthBeforeOrInBce} a.C. ou antes; a conciliação das narrativas de infância é discutida. Para a crucificação, {EVENT_DATE_CONTEXT.crucifixionAlternativesCe.join(" ou ")} d.C. são duas propostas debatidas. Essas estimativas não datam cada cena deste roteiro.</p>
            <p className={styles.inlineSources}><a href={CHRONOLOGY_SOURCES.find((source) => source.id === "birth")!.href}>Nascimento: discussão e fonte ↗</a><a href={CHRONOLOGY_SOURCES.find((source) => source.id === "death")!.href}>Crucificação: discussão e fonte ↗</a></p>
            <h3>O tempo da escrita</h3>
            <p>As faixas abaixo são propostas acadêmicas de composição, posteriores aos acontecimentos narrados. Há outras datações e debates sobre as etapas de formação de cada texto. Elas não determinam a ordem deste percurso.</p>
            <dl className={styles.composition}>{GOSPEL_COMPOSITION.map((item) => {
              const source = CHRONOLOGY_SOURCES.find((entry) => entry.id === item.source)!;
              return <div key={item.gospel}><dt>{GOSPELS.find((entry) => entry.id === item.gospel)!.label}</dt><dd>c. {item.from}–{item.to} d.C. <a href={source.href} aria-label={`Fonte da datação de ${item.gospel}`}>Fonte ↗</a></dd></div>;
            })}</dl>
          </details>
          <details className={styles.sources}>
            <summary>Texto, critérios e referências <span aria-hidden="true">+</span></summary>
            <p>Texto bíblico: Bíblia Livre (BLIVRE), carregado da base do projeto sem reescrita. Seleção e notas de comparação: curadoria editorial do Bíblia Conectada. As referências abaixo apoiam o contexto histórico e literário; não substituem o texto bíblico.</p>
            <ul>{CHRONOLOGY_SOURCES.map((source) => <li key={source.id}><a href={source.href}>{source.title} ↗</a><span>{source.note}</span></li>)}</ul>
            <Link href="/sobre">Licenças e créditos completos</Link>
          </details>
        </div>
      </section>
      <footer className={styles.next}><span>Mais caminhos para descobrir</span><Link href="/caminhos">A história também vive nos lugares. <span aria-hidden="true">↗</span></Link><Link href="/ler">Ou escolha um livro e siga lendo →</Link></footer>
    </main>
  );
}
