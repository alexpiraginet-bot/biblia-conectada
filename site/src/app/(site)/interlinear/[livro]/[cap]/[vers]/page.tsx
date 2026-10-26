import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInterlinearPassage, listInterlinearPassages } from "@/lib/interlinear/data";
import { shareMetadata } from "@/lib/share-metadata";
import { InterlinearReader } from "@/components/interlinear/InterlinearReader";

type Props = { params: Promise<{ livro: string; cap: string; vers: string }> };
export const ensureStatic = "navigation";

export function generateStaticParams() {
  return listInterlinearPassages().map((passage) => ({ livro: passage.bookSlug, cap: String(passage.chapter), vers: String(passage.verse) }));
}

async function resolve(params: Props["params"]) {
  const { livro, cap, vers } = await params;
  if (!/^[1-9]\d{0,2}$/.test(cap) || !/^[1-9]\d{0,2}$/.test(vers)) return null;
  return getInterlinearPassage(livro, Number(cap), Number(vers));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const passage = await resolve(params);
  if (!passage) return { title: "Passagem fora da coleção interlinear", robots: { index: false } };
  return shareMetadata({ title: `${passage.reference} · Palavra por palavra`, description: `Explore ${passage.reference} no texto ${passage.language === "he" ? "hebraico" : "grego"}, com sentidos em português sob cada unidade e detalhes das palavras.`, path: `/interlinear/${passage.id}` });
}

export default async function InterlinearPassagePage({ params }: Props) {
  const passage = await resolve(params);
  if (!passage) notFound();
  const passages = listInterlinearPassages();
  const index = passages.findIndex((item) => item.id === passage.id);
  return <InterlinearReader key={passage.id} passage={passage} previous={passages[index - 1]} next={passages[index + 1]} />;
}
