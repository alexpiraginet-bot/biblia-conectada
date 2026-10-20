import type { Metadata } from "next";
import Link from "next/link";
import { StudyCompanion, type StudyMoment } from "@/components/assistant/StudyCompanion";
import { Icon } from "@/components/icons";
import { assistantAvailability } from "@/lib/assistant/config";
import { loadChronologicalReading } from "@/lib/chronological-reading";
import { verseText } from "@/lib/data";
import styles from "@/components/assistant/StudyCompanion.module.css";

export const metadata: Metadata = {
  title: "Um companheiro de estudo",
  description: "Entenda uma passagem, explore suas conexões e acompanhe histórias bíblicas ilustradas, com referências sempre à vista.",
};

export default async function AssistantPage() {
  const itinerary = await loadChronologicalReading(verseText);
  const moments: StudyMoment[] = itinerary.map((moment) => {
    const passage = moment.passages.find((item) => item.gospel === moment.defaultGospel)!;
    return {
      id: moment.id, title: moment.title, place: moment.place,
      image: moment.image, imageAlt: moment.imageAlt,
      reference: passage.reference, href: passage.href,
      book: passage.gospel, chapter: passage.chapter, verse: passage.from, verses: passage.verses,
    };
  });
  return <main id="conteudo" className={styles.page}>
    <div className={styles.edition}><Link href="/"><Icon name="arc" />Bíblia Conectada / Estudo acompanhado</Link><span>O texto por perto. A curiosidade também.</span></div>
    <header className={styles.hero}><span>Companheiro de estudo</span><h1>Uma pergunta.<br /><em>Novos caminhos.</em></h1><p>Compreenda uma passagem, siga suas conexões e acompanhe a história com as fontes sempre à vista.</p></header>
    <StudyCompanion moments={moments} enabled={assistantAvailability().available} />
    <footer className={styles.pageFooter}><Link href="/cronologia">Percorrer a vida de Jesus<Icon name="time" /></Link><Link href="/sobre">Bíblia Livre, fontes e créditos<Icon name="out" /></Link></footer>
  </main>;
}
