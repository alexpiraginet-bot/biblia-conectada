import { LiturgyPageContent } from "@/components/liturgy/LiturgyPageContent";
import { isLiturgyDate } from "@/lib/liturgy/dates";
import { shareMetadata } from "@/lib/share-metadata";
import { resolveShareCard } from "@/lib/share-card";
import { connection } from "next/server";

type Props = { searchParams: Promise<{ date?: string | string[] }> };
export async function generateMetadata({ searchParams }: Props) {
  await connection();
  const { date } = await searchParams;
  if (isLiturgyDate(date)) {
    const card = await resolveShareCard(`/dia/${date}`);
    if (card) return shareMetadata({ title: `Liturgia · ${card.title}`, description: `${card.readings?.map((reading) => reading.reference).join(" · ") ?? ""} ${card.description}`.trim(), path: card.path });
  }
  return shareMetadata({ title: "Liturgia diária", description: "Um ritmo de leitura para todos os dias. Acompanhe as leituras, o salmo e o Evangelho e aprofunde seu estudo da Palavra.", path: "/liturgia" });
}
export default function LiturgyPage(props: Props) { return <LiturgyPageContent {...props} />; }
