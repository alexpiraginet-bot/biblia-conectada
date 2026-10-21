import "server-only";
import { CHRONOLOGICAL_MOMENTS } from "@/lib/chronological-reading";
import { conexaoPath } from "@/lib/conexao";
import { bookBySlug, chapterVerses, grid, verseRef, verseText } from "@/lib/reading";
import { getTranslation, translationPath } from "@/lib/translations";
import { translatedChapter, translationBooks } from "@/lib/translation-reading";
import { invalid } from "./input";
import type { AssistantCitation, AssistantRequest, AssistantScene } from "./types";

export type Grounding = {
  label: string;
  scope: string;
  citations: AssistantCitation[];
  connections: { from: string; to: string; href: string }[];
  art: AssistantScene["art"];
  source: { name: string; credit: string; license: string; licenseUrl: string; sourceNotice?: string; trademarkNotice?: string };
};

export async function retrieveGrounding(request: AssistantRequest): Promise<Grounding> {
  const { book: slug, chapter, verse } = request.passage;
  const edition = getTranslation(request.translation ?? "blivre");
  if (!edition) return invalid();
  const source = {
    name: edition.name, credit: edition.credit, license: edition.license, licenseUrl: edition.licenseUrl,
    ...(edition.sourceNotice ? { sourceNotice: edition.sourceNotice } : {}),
    ...(edition.trademarkNotice ? { trademarkNotice: edition.trademarkNotice } : {}),
  };
  if (request.translation === "open-nbv") {
    const book = translationBooks("open-nbv")?.find((item) => item.slug === slug);
    if (!book || chapter < 1 || chapter > book.verses.length || (verse !== undefined && (verse < 1 || verse > book.verses[chapter - 1]))) return invalid();
    const rows = await translatedChapter("open-nbv", slug, chapter);
    if (!rows || (verse !== undefined && !rows[verse - 1]?.trim())) return invalid();
    const start = rows.length <= 60 ? 0 : Math.max(0, Math.min(rows.length - 40, (verse ?? 1) - 11));
    const selected = rows.length <= 60 ? rows : rows.slice(start, start + 40);
    return {
      label: `${book.name} ${chapter}${verse ? `:${verse}` : ""}`,
      source,
      scope: `${selected.length === rows.length ? "Capítulo completo" : `Recorte do capítulo: versículos ${start + 1} a ${start + selected.length}; o restante não foi fornecido`}, em ${edition.name}. Sem referências cruzadas de versículo: o alinhamento desta edição com o grafo ainda não foi revisado. Use apenas o texto deste capítulo; não suponha equivalência com a BLIVRE nem complete com outra tradução.`,
      citations: selected.map((text, index) => {
        const n = start + index + 1;
        return { id: `open-nbv:${slug}:${chapter}:${n}`, reference: `${book.name} ${chapter}:${n}`, text, href: translationPath("open-nbv", slug, chapter, n), source: edition.name };
      }),
      connections: [],
      art: {
        src: "/journey/galilee-dawn.webp", alt: "Recriação de uma paisagem da Galileia ao amanhecer.",
        caption: "Recriação da Galileia usada como ambiente de leitura; não representa necessariamente esta passagem.",
      },
    };
  }
  const book = bookBySlug(slug);
  if (!book || chapter > book.verses.length || (verse && verse > book.verses[chapter - 1])) return invalid();
  const rows = await chapterVerses(book, chapter);
  // Keep a full ordinary chapter. Very long chapters use a clearly labeled window.
  const start = rows.length <= 60 ? 0 : Math.max(0, Math.min(rows.length - 40, (verse ?? 1) - 11));
  const selected = rows.length <= 60 ? rows : rows.slice(start, start + 40);
  const citations: AssistantCitation[] = selected.map((row) => {
    const gv = grid.verseIndex(book, chapter, row.n);
    const ref = verseRef(gv);
    return { id: `v${gv}`, reference: ref.label, text: row.text, href: ref.path };
  });
  const existing = new Set(citations.map((citation) => citation.id));
  const ranked = (verse ? rows.filter((row) => row.n === verse) : selected)
    .flatMap((row) => row.links.map(([to, votes]) => ({
      from: grid.verseIndex(book, chapter, row.n), to, votes,
    }))).filter((link) => !existing.has(`v${link.to}`))
    .sort((a, b) => b.votes - a.votes || a.to - b.to || a.from - b.from);
  const connections: Grounding["connections"] = [];
  for (const link of ranked) {
    if (existing.has(`v${link.to}`)) continue;
    existing.add(`v${link.to}`);
    const ref = verseRef(link.to);
    const from = verseRef(link.from);
    citations.push({ id: `v${link.to}`, reference: ref.label, text: await verseText(link.to), href: ref.path });
    connections.push({
      from: `v${link.from}`, to: `v${link.to}`,
      href: conexaoPath(
        { book: from.book.index, slug: from.book.slug, chapter: from.chapter, verse: from.verse },
        { book: ref.book.index, slug: ref.book.slug, chapter: ref.chapter, verse: ref.verse },
      ),
    });
    if (connections.length === 8) break;
  }
  const moment = CHRONOLOGICAL_MOMENTS.find((item) => item.passages.some((p) =>
    p.gospel === slug && p.chapter === chapter && verse !== undefined && verse >= p.from && verse <= p.to));
  return {
    label: `${book.name} ${chapter}${verse ? `:${verse}` : ""}`,
    source,
    scope: selected.length === rows.length
      ? "Capítulo completo, seguido de até oito referências cruzadas reais do OpenBible."
      : `Recorte do capítulo: versículos ${selected[0].n} a ${selected.at(-1)!.n}, seguido de referências cruzadas. O restante do capítulo não foi fornecido.`,
    citations,
    connections,
    art: moment ? {
      src: moment.image, alt: moment.imageAlt,
      caption: "Recriação artística. A imagem acompanha a leitura e não é um registro histórico.",
    } : {
      src: "/journey/galilee-dawn.webp",
      alt: "Recriação de uma paisagem da Galileia ao amanhecer.",
      caption: "Recriação da Galileia usada como ambiente de leitura; não representa necessariamente esta passagem.",
    },
  };
}
