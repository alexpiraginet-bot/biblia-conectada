import { LiturgyPageContent, type LiturgySearch } from "@/components/liturgy/LiturgyPageContent";
import { isLiturgyDate } from "@/lib/liturgy/dates";
import { shareMetadata } from "@/lib/share-metadata";
import { resolveShareCard } from "@/lib/share-card";
import { connection } from "next/server";
import { liturgyEditionQuery, parseLiturgyEdition } from "@/lib/liturgy/edition";
import { liturgyDayPath } from "@/lib/liturgy/share";

type Props = { searchParams: LiturgySearch };
export async function generateMetadata({ searchParams }: Props) {
  await connection();
  const { date, edition: requestedEdition } = await searchParams;
  const edition = parseLiturgyEdition(requestedEdition);
  if (!edition) return { title: "Escolha uma tradução · Liturgia diária", robots: { index: false, follow: false } };
  if (isLiturgyDate(date)) {
    const card = await resolveShareCard(liturgyDayPath(date, edition));
    if (card) return shareMetadata({ title: `Liturgia · ${card.title}`, description: `${card.readings?.map((reading) => reading.reference).join(" · ") ?? ""} ${card.description}`.trim(), path: card.path });
  }
  return shareMetadata({ title: "Liturgia diária", description: edition === "open-nbv" ? "Referências das leituras de hoje e capítulos completos na Open NBV para contexto, sem equivalência de versículos presumida." : "Um ritmo de leitura para todos os dias. Acompanhe as leituras, o salmo e o Evangelho e aprofunde seu estudo da Palavra.", path: `/liturgia${liturgyEditionQuery(edition)}` });
}
export default function LiturgyPage(props: Props) { return <LiturgyPageContent {...props} />; }
