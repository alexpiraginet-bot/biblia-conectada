import type { Book } from "../canon/types";
import { isLiturgyDate, liturgyToday } from "./dates";
import { resolveLiturgyReference } from "./references";
import { getTranslation, translationPath } from "../translations";
import { parseLiturgyEdition } from "./edition";
import type { LiturgyColor, LiturgyDay, LiturgyKind, LiturgyReading, LiturgyResult, LiturgySource } from "./types";

export const LITURGY_SOURCE: LiturgySource = {
  name: "Liturgia Diária · serviço comunitário",
  url: "https://github.com/Dancrf/liturgia-diaria",
  officialUrl: "https://liturgiadiaria.edicoescnbb.com.br/",
  notice: "Calendário e referências do serviço comunitário Liturgia Diária. Celebrações locais e opções de leitura podem variar. Na CNBB, selecione a mesma data para conferir o lecionário oficial.",
};
export const LITURGY_EDITION = {
  id: "blivre" as const,
  name: "Bíblia Livre (BLIVRE)",
  notice: "Leitura para estudo em tradução livre. Não reproduz o lecionário oficial da Missa, seus refrãos ou orações. Os textos litúrgicos oficiais estão disponíveis na CNBB.",
};
export const LITURGY_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 500_000;
const MAX_READINGS = 24;
const COLORS: Record<string, { color: LiturgyColor; label: string }> = {
  verde: { color: "green", label: "Verde" }, branco: { color: "white", label: "Branco" },
  vermelho: { color: "red", label: "Vermelho" }, roxo: { color: "purple", label: "Roxo" },
  rosa: { color: "rose", label: "Rosa" }, preto: { color: "black", label: "Preto" },
};
const KINDS: { field: string; kind: LiturgyKind; label: string }[] = [
  { field: "primeiraLeitura", kind: "first", label: "Primeira leitura" },
  { field: "salmo", kind: "psalm", label: "Salmo" },
  { field: "segundaLeitura", kind: "second", label: "Segunda leitura" },
  { field: "evangelho", kind: "gospel", label: "Evangelho" },
  { field: "extras", kind: "extra", label: "Leitura adicional" },
];

export type LiturgyMetadata = {
  date: string; celebration: string; color: LiturgyColor; colorLabel: string;
  readings: { id: string; kind: LiturgyKind; label: string; reference: string }[];
};

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
function fact(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max || /[<>\u0000-\u001f]/.test(value)) throw new Error("Invalid calendar metadata");
  const result = value.replace(/\s+/g, " ").trim();
  if (!result) throw new Error("Empty calendar metadata");
  return result;
}

/** Allowlist factual fields only. Protected text, prayers, titles and refrains never leave this boundary. */
export function extractLiturgyMetadata(value: unknown, requestedDate: string): LiturgyMetadata {
  if (!isLiturgyDate(requestedDate) || !record(value) || !record(value.leituras)) throw new Error("Invalid calendar response");
  const expectedDate = requestedDate.split("-").reverse().join("/");
  if (value.data !== expectedDate) throw new Error("Calendar date mismatch");
  const celebration = fact(value.liturgia, 240);
  const color = typeof value.cor === "string" ? COLORS[value.cor.trim().toLocaleLowerCase("pt-BR")] : undefined;
  const readings: LiturgyMetadata["readings"] = [];
  for (const { field, kind, label } of KINDS) {
    const entries = value.leituras[field];
    if (!Array.isArray(entries)) {
      if (field === "extras" && entries === undefined) continue;
      throw new Error("Invalid reading list");
    }
    if (entries.length > MAX_READINGS) throw new Error("Excessive reading list");
    for (let i = 0; i < entries.length; i++) {
      if (!record(entries[i])) throw new Error("Invalid reading");
      // This group also contains non-biblical rites (for example the Easter proclamation).
      // Do not copy those texts, and do not mistake them for a missing biblical citation.
      if (field === "extras" && entries[i].referencia === undefined) continue;
      // The provider currently appends ¬ to some citations; it is not a reference character.
      const reference = fact(entries[i].referencia, 180).replace(/¬+$/g, "").trim();
      if (!reference || !/\d/.test(reference)) throw new Error("Missing reading reference");
      readings.push({ id: `${kind}-${i + 1}`, kind, label: entries.length > 1 ? `${label} · ${i + 1}` : label, reference });
    }
  }
  if (!readings.some((reading) => reading.kind === "gospel") || !readings.some((reading) => reading.kind === "first") || readings.length > MAX_READINGS) {
    throw new Error("Incomplete or excessive calendar");
  }
  return { date: requestedDate, celebration, color: color?.color ?? "unknown", colorLabel: color?.label ?? "Não informada", readings };
}

export async function fetchLiturgyMetadata(date: string, fetcher: typeof fetch = fetch): Promise<LiturgyMetadata> {
  if (!isLiturgyDate(date)) throw new Error("Invalid calendar date");
  const [year, month, day] = date.split("-");
  const url = new URL("https://liturgia.up.railway.app/v2/");
  url.search = new URLSearchParams({ dia: day, mes: month, ano: year }).toString();
  const response = await fetcher(url, {
    cache: "no-store", signal: AbortSignal.timeout(LITURGY_TIMEOUT_MS), redirect: "error",
    headers: { Accept: "application/json" },
  });
  if (!response.ok || Number(response.headers.get("content-length")) > MAX_RESPONSE_BYTES || !response.headers.get("content-type")?.includes("json")) {
    throw new Error("Calendar unavailable");
  }
  // Do not persist the upstream JSON. Bound reads before decoding, then discard all non-factual fields.
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty calendar response");
  const decoder = new TextDecoder();
  let bytes = 0;
  let raw = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error("Excessive calendar response");
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
    return extractLiturgyMetadata(JSON.parse(raw), date);
  } finally {
    await reader.cancel().catch(() => {});
  }
}

type LiturgyDependencies = {
  books: readonly Book[];
  readVerse: (slug: string, chapter: number, verse: number) => Promise<string>;
  metadata: (date: string) => Promise<LiturgyMetadata>;
  now?: Date;
  contextBooks?: readonly Book[];
  readContextChapter?: (slug: string, chapter: number) => Promise<string[] | null>;
};

export async function createLiturgyResult(input: string | undefined, dependencies: LiturgyDependencies, editionInput?: string | string[]): Promise<LiturgyResult> {
  const now = dependencies.now ?? new Date();
  const today = liturgyToday(now);
  const date = input === undefined ? today : input;
  const editionId = parseLiturgyEdition(editionInput);
  if (editionId === null) return {
    ok: false, code: "invalid-edition", date: isLiturgyDate(date) ? date : today, today, source: LITURGY_SOURCE,
    message: "Esta edição não está disponível aqui. Escolha Bíblia Livre ou Open NBV para continuar.",
  };
  const edition = editionId === "blivre" ? LITURGY_EDITION : {
    id: editionId, name: getTranslation(editionId)!.name,
    notice: "Capítulos completos para contexto na Open NBV. O alinhamento dos versículos com a referência litúrgica não foi revisado; não representam o recorte do lecionário.",
  };
  if (!isLiturgyDate(date)) return {
    ok: false, code: "invalid-date", date: today, today, source: LITURGY_SOURCE, edition,
    message: "Escolha uma data válida no calendário para consultar a liturgia.",
  };
  try {
    const metadata = await dependencies.metadata(date);
    if (metadata.date !== date) throw new Error("Calendar date mismatch");
    const readings: LiturgyReading[] = await Promise.all(metadata.readings.map(async (reading) => {
      const selection = resolveLiturgyReference(reading.reference, dependencies.books);
      if ("unavailableReason" in selection) return { ...reading, passages: [], unavailableReason: selection.unavailableReason.replace("BLIVRE", editionId === "open-nbv" ? "Open NBV" : "BLIVRE") };
      const passages: LiturgyReading["passages"] = [];
      if (editionId === "open-nbv") {
        // The canonical parser is used ONLY to identify safe chapters. Its verse coordinates
        // are deliberately discarded: same-number verses across editions are not aligned.
        const book = dependencies.contextBooks?.find((candidate) => candidate.slug === selection.book.slug && candidate.osis === selection.book.osis);
        if (!book || !dependencies.readContextChapter) throw new Error("Missing context edition");
        for (const chapter of new Set(selection.coordinates.map((coordinate) => coordinate.chapter))) {
          if (!book.verses[chapter - 1]) throw new Error("Unvalidated context chapter");
          const rows = await dependencies.readContextChapter(book.slug, chapter);
          if (!rows || rows.length !== book.verses[chapter - 1] || rows.some((text) => !text)) throw new Error("Missing licensed context chapter");
          const path = translationPath(editionId, book.slug, chapter);
          passages.push({ reference: `${book.name} ${chapter}`, path, verses: rows.map((text, index) => ({ number: index + 1, text, path: `${path}/${index + 1}` })) });
        }
        return { ...reading, passages, notice: edition.notice + (selection.book.osis === "Ps" ? " O salmo usa apenas o capítulo pareado entre parênteses; confira o refrão e a forma responsorial na CNBB." : "") };
      }
      for (const coordinate of selection.coordinates) {
        const { chapter, verse } = coordinate;
        const text = await dependencies.readVerse(selection.book.slug, chapter, verse);
        if (!text) throw new Error("Missing licensed scripture");
        let passage = passages.find((row) => row.path === `/${selection.book.slug}/${chapter}`);
        if (!passage) {
          passage = { reference: `${selection.book.name} ${chapter}`, path: `/${selection.book.slug}/${chapter}`, verses: [] };
          passages.push(passage);
        }
        passage.verses.push({ number: verse, text, path: `${passage.path}/${verse}` });
      }
      return { ...reading, passages, notice: selection.notice };
    }));
    return {
      ok: true, ...metadata, date, today, readings, source: LITURGY_SOURCE, edition,
      fetchedAt: now.toISOString(),
    } satisfies LiturgyDay;
  } catch {
    // No stale previous day, fabricated calendar, raw upstream body or sensitive failure details.
    return {
      ok: false, code: "unavailable", date, today, source: LITURGY_SOURCE, edition,
      message: "Não foi possível confirmar as leituras desta data agora. Tente novamente ou consulte a liturgia oficial na CNBB.",
    };
  }
}
