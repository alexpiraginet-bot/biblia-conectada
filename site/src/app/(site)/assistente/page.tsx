import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StudyCompanion, type StudyMoment } from "@/components/assistant/StudyCompanion";
import { resolveStudyReference } from "@/components/assistant/study-reference";
import { Icon } from "@/components/icons";
import { assistantAvailability } from "@/lib/assistant/config";
import { loadChronologicalReading } from "@/lib/chronological-reading";
import { books, verseText } from "@/lib/data";
import styles from "@/components/assistant/StudyCompanion.module.css";

export const metadata: Metadata = {
  title: "Um companheiro de estudo",
  description: "Entenda uma passagem, explore suas conexões e acompanhe histórias bíblicas ilustradas, com referências sempre à vista.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

async function CompanionForReference({ searchParams, moments }: { searchParams: SearchParams; moments: StudyMoment[] }) {
  const { ref } = await searchParams;
  const selected = resolveStudyReference(ref, books);
  const initialPassage: StudyMoment | undefined = selected ? {
    id: `verse-${selected.book.slug}-${selected.chapter}-${selected.verse}`,
    title: "Versículo escolhido", reference: selected.reference, href: selected.href,
    book: selected.book.slug, chapter: selected.chapter, verse: selected.verse,
    verses: [{ number: selected.verse, text: await verseText(selected.book.slug, selected.chapter, selected.verse) }],
  } : undefined;
  return <StudyCompanion
    key={initialPassage?.id ?? (ref === undefined ? "default" : "invalid")}
    moments={moments}
    initialPassage={initialPassage}
    referenceError={ref !== undefined && !selected}
    enabled={assistantAvailability().available}
  />;
}

export default async function AssistantPage({ searchParams }: { searchParams: SearchParams }) {
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
    <header className={styles.hero}><span>Companheiro de estudo</span><h1>Uma pergunta.<br /><em>Novos caminhos.</em></h1><p>Escolha qualquer versículo. Compreenda a passagem, siga suas conexões e ouça a resposta com a voz do aparelho.</p></header>
    <Suspense fallback={<section className={styles.referenceLoading} aria-busy="true" role="status">Abrindo a passagem para seu estudo…</section>}>
      <CompanionForReference searchParams={searchParams} moments={moments} />
    </Suspense>
    <footer className={styles.pageFooter}><Link href="/cronologia">Percorrer a vida de Jesus<Icon name="time" /></Link><Link href="/sobre">Bíblia Livre, fontes e créditos<Icon name="out" /></Link></footer>
  </main>;
}
