import type { ShareCard } from "../share-card";
import { shareExcerpt } from "../share-excerpt";
import { isLiturgyDate } from "./dates";
import type { LiturgyResult } from "./types";

export function liturgyDayPath(date: string): string {
  if (!isLiturgyDate(date)) throw new Error("Invalid liturgy date");
  return `/dia/${date}`;
}
export function liturgyShareDate(date: string): string {
  if (!isLiturgyDate(date)) throw new Error("Invalid liturgy date");
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00Z`));
}

/** Calendar supplies factual references; any quotation comes only from resolved BLIVRE verses. */
export function createLiturgyShareCard(data: LiturgyResult, excerptLimit: 205 | 500 = 205): ShareCard {
  const path = liturgyDayPath(data.date);
  const base = { path, kind: "liturgy" as const, eyebrow: "LITURGIA DIÁRIA", title: liturgyShareDate(data.date) };
  if (!data.ok) return { ...base, description: "As leituras deste dia estão temporariamente indisponíveis. Abra o site para tentar novamente ou consultar a fonte oficial.", unavailable: true, readings: [] };
  const gospel = data.readings.find((reading) => reading.kind === "gospel");
  const passage = gospel?.passages.find((item) => item.verses.length > 0);
  const verse = passage?.verses[0];
  const verseReference = verse && passage ? `${passage.reference.split(":")[0]}:${verse.number}` : undefined;
  return {
    ...base, readings: data.readings.map(({ label, reference, kind }) => ({ label, reference, kind })),
    description: verse ? shareExcerpt(verse.text, excerptLimit === 500 ? 320 : 150) : "Leia as referências deste dia e confira os textos disponíveis para estudo no site.",
    ...(verseReference ? { source: `Bíblia Livre (BLIVRE) · ${verseReference}` } : {}),
  };
}
