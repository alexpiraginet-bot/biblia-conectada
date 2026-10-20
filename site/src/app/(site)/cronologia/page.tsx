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
    <main id="conteudo" className={styles.page}>
      <div className={styles.edition}><Link href="/">Bíblia Conectada <span aria-hidden="true">/</span> Atlas dos evangelhos</Link><span>Uma história · quatro olhares</span></div>
      <header className={styles.hero}>
        <div className={styles.heroArt}><Image src="/journey/jerusalem.webp" alt="" fill sizes="(max-width: 55rem) 100vw, 65vw" unoptimized loading="eager" /></div>
        <svg className={styles.compass} viewBox="0 0 240 240" fill="none" aria-hidden="true"><circle cx="120" cy="120" r="95" /><circle cx="120" cy="120" r="76" /><circle cx="120" cy="120" r="10" /><path d="M120 0v240M0 120h240M35 35l170 170M35 205 205 35M120 28l13 79 79 13-79 13-13 79-13-79-79-13 79-13Z" /><path d="m120 46 5 64 49-56-44 66 64 5-64 5 44 64-49-54-5 64-5-64-49 54 44-64-64-5 64-5-44-66 49 56Z" /></svg>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>Novo Testamento · Percurso ilustrado</span>
          <h1>Uma vida.<br />Todos esses<br /><em>caminhos.</em></h1>
          <p>Siga o fio da vida de Jesus.<br />Descubra como os evangelhos se encontram<br className={styles.desktopBreak} /> — e o que cada olhar revela.</p>
          <div className={styles.heroActions}><a href="#percurso">Entrar na história <span aria-hidden="true">↓</span></a><Link href="/caminhos">Explorar os lugares <span aria-hidden="true">↗</span></Link></div>
        </div>
        <div className={styles.heroMarginalia}><span>De Belém<br />a Jerusalém.</span><i aria-hidden="true" /><small>Um caminho de leitura.<br />Muitas conexões.</small></div>
        <span className={styles.artLabel}>Jerusalém · Recriação artística por IA</span>
      </header>
      <div className={styles.overview}>
        <p><strong>{String(moments.length).padStart(2, "0")}</strong><span>momentos<br />da mesma história</span></p>
        <p><strong>{String(GOSPELS.length).padStart(2, "0")}</strong><span>evangelhos<br />com sua própria voz</span></p>
        <p className={styles.overviewNote}>Acompanhe os acontecimentos em uma sequência de leitura. As diferenças de cenário, ordem e ênfase continuam aqui, à vista.</p>
      </div>
      <ChronologicalReading moments={moments} />
      <section className={styles.method} id="criterios" aria-labelledby="criteria-title">
        <div><span className={styles.methodEyebrow}>As fontes, à vista</span><h2 id="criteria-title">Aproximar os relatos.<br /><em>Preservar cada voz.</em></h2></div>
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
