import "server-only";
import placesJson from "@/data/journey-places.json";
import { conexaoPath } from "@/lib/conexao";
import { yearLabel } from "@/lib/eras";
import { bookBySlug, chapterVerses, grid, verseRef, verseText } from "@/lib/reading";
import { eventById } from "@/lib/timeline";

type PassageSpec = { slug: string; chapter: number; from: number; to: number };
type ParallelSpec = PassageSpec & { note: string };
type StopSpec = {
  id: string; place: string; ancientId: string; title: string; context: string;
  sourceName: [string, number, number]; eventId: number; passage: PassageSpec;
  parallels: ParallelSpec[]; parallelNote?: string; locationNote?: string;
  label: [number, number];
};

/** Editorial reading order across the Gospels, not a reconstruction of every journey Jesus made. */
export const JOURNEY_STOPS: readonly StopSpec[] = [
  {
    id: "belem", place: "Belém", ancientId: "a112427", title: "Uma história que começa pequena.",
    context: "Lucas acompanha José e Maria até Belém. No relato do nascimento, o lugar de acolhida de Jesus é uma manjedoura. A história começa longe dos palácios.",
    sourceName: ["lucas", 2, 4], eventId: 254, passage: { slug: "lucas", chapter: 2, from: 6, to: 7 },
    parallels: [{ slug: "mateus", chapter: 2, from: 1, to: 2, note: "Mateus também situa o nascimento em Belém e apresenta a chegada dos magos." }],
    label: [320, 700],
  },
  {
    id: "nazare", place: "Nazaré", ancientId: "af5884f", title: "O tempo de crescer.",
    context: "Depois dos acontecimentos do nascimento, Lucas leva a família de volta a Nazaré. O texto resume a infância falando de crescimento, sabedoria e graça.",
    sourceName: ["lucas", 2, 39], eventId: 262, passage: { slug: "lucas", chapter: 2, from: 39, to: 40 },
    parallels: [{ slug: "mateus", chapter: 2, from: 22, to: 23, note: "Mateus narra a chegada a Nazaré depois do retorno do Egito." }],
    label: [295, 292],
  },
  {
    id: "jordao", place: "Jordão", ancientId: "a6e060d", title: "À beira de um novo começo.",
    context: "Jesus chega da Galileia para ser batizado por João. Os evangelhos aproximam a água, a descida do Espírito e a voz que o chama de Filho.",
    sourceName: ["mateus", 3, 13], eventId: 267, passage: { slug: "mateus", chapter: 3, from: 16, to: 17 },
    parallels: [
      { slug: "marcos", chapter: 1, from: 9, to: 11, note: "O batismo no relato de Marcos." },
      { slug: "lucas", chapter: 3, from: 21, to: 22, note: "Lucas associa o batismo à oração de Jesus." },
    ],
    locationNote: "Ponto aproximado: representa a tradição de Betânia além do Jordão. O lugar exato do batismo não é conhecido.",
    label: [650, 635],
  },
  {
    id: "cana", place: "Caná", ancientId: "a031bda", title: "Quando a água se torna vinho.",
    context: "Uma festa de casamento se torna o cenário do primeiro sinal narrado por João. Os serventes conhecem a origem da água; o mestre de cerimônia prova o vinho.",
    sourceName: ["joao", 2, 1], eventId: 271, passage: { slug: "joao", chapter: 2, from: 9, to: 11 },
    parallels: [{ slug: "joao", chapter: 4, from: 46, to: 46, note: "João retoma Caná em outro episódio; este não é um relato paralelo do casamento." }],
    parallelNote: "A transformação da água em vinho é narrada em João, sem um relato paralelo nos outros evangelhos.",
    locationNote: "Localização discutida: o mapa usa uma das propostas registradas pela OpenBible.info para Caná.",
    label: [300, 165],
  },
  {
    id: "cafarnaum", place: "Cafarnaum", ancientId: "af2161c", title: "Uma cidade à beira do caminho.",
    context: "Mateus situa Jesus em Cafarnaum e conecta sua presença na Galileia a palavras do profeta Isaías. Um lugar no mapa abre uma ligação entre os Testamentos.",
    sourceName: ["mateus", 4, 13], eventId: 281, passage: { slug: "mateus", chapter: 4, from: 13, to: 16 },
    parallels: [
      { slug: "lucas", chapter: 4, from: 31, to: 32, note: "Lucas descreve Jesus ensinando em Cafarnaum." },
      { slug: "marcos", chapter: 1, from: 21, to: 22, note: "Marcos também situa seu ensino na sinagoga da cidade." },
    ],
    label: [645, 110],
  },
  {
    id: "galileia", place: "Mar da Galileia", ancientId: "a562fcc", title: "Do vento à bonança.",
    context: "Durante uma travessia, os discípulos enfrentam o medo da tempestade. Marcos, Mateus e Lucas narram a mudança do vento e a pergunta sobre quem é Jesus.",
    sourceName: ["mateus", 4, 18], eventId: 386, passage: { slug: "marcos", chapter: 4, from: 39, to: 41 },
    parallels: [
      { slug: "mateus", chapter: 8, from: 23, to: 27, note: "A travessia e a tempestade no relato de Mateus." },
      { slug: "lucas", chapter: 8, from: 22, to: 25, note: "A travessia e a tempestade no relato de Lucas." },
    ],
    locationNote: "O ponto marca o lago. O relato não permite indicar o local preciso da travessia.",
    label: [655, 300],
  },
  {
    id: "jerico", place: "Jericó", ancientId: "aaf03fa", title: "Um encontro muda a direção.",
    context: "Em Jericó, Zaqueu sobe numa árvore para ver Jesus. A cena muda quando Jesus olha para cima e o chama pelo nome.",
    sourceName: ["lucas", 19, 1], eventId: 440, passage: { slug: "lucas", chapter: 19, from: 5, to: 6 },
    parallels: [{ slug: "marcos", chapter: 10, from: 46, to: 47, note: "Outro encontro em Jericó: Marcos narra Bartimeu. Não é o mesmo episódio de Zaqueu." }],
    parallelNote: "O encontro com Zaqueu é narrado em Lucas. Os outros evangelhos trazem outros encontros em Jericó.",
    label: [650, 510],
  },
  {
    id: "jerusalem", place: "Jerusalém", ancientId: "a15257a", title: "A cidade se põe em movimento.",
    context: "A entrada em Jerusalém reúne caminhos, multidões e uma pergunta: quem é este? A partir daqui, os relatos conduzem aos últimos dias de Jesus.",
    sourceName: ["mateus", 21, 10], eventId: 444, passage: { slug: "mateus", chapter: 21, from: 9, to: 11 },
    parallels: [
      { slug: "marcos", chapter: 11, from: 8, to: 11, note: "A entrada em Jerusalém no relato de Marcos." },
      { slug: "lucas", chapter: 19, from: 35, to: 40, note: "Lucas acompanha a chegada à cidade." },
      { slug: "joao", chapter: 12, from: 12, to: 15, note: "João aproxima a entrada de Jesus de palavras de Zacarias." },
    ],
    label: [285, 565],
  },
];

export type JourneyPassage = {
  label: string; path: string; slug: string; chapter: number;
  verses: { n: number; gv: number; text: string }[];
};
export type JourneyConnection = {
  from: number; to: number; votes: number; label: string; text: string; href: string; versePath: string;
};
export type JourneyStop = {
  id: string; place: string; title: string; context: string; number: number;
  date: string; eventId: number; eventPath: string; year: number;
  longitude: number; latitude: number; x: number; y: number; labelX: number; labelY: number;
  sourceUrl: string; locationNote: string | null; parallelNote: string | null;
  passage: JourneyPassage; parallels: (JourneyPassage & { note: string })[]; connections: JourneyConnection[];
};
export type JourneyData = { stops: JourneyStop[] };

/** A schematic equirectangular map. The SVG is deliberately labelled "sem escala", rather than a navigation map. */
export function journeyPoint(longitude: number, latitude: number) {
  return { x: Math.round((80 + (longitude - 34.3) * 340) * 100) / 100, y: Math.round((60 + (33.15 - latitude) * 400) * 100) / 100 };
}

async function passage(spec: PassageSpec): Promise<JourneyPassage> {
  const book = bookBySlug(spec.slug);
  if (!book) throw new Error(`Journey book missing: ${spec.slug}`);
  const chapter = await chapterVerses(book, spec.chapter);
  const verses = chapter.filter((v) => v.n >= spec.from && v.n <= spec.to).map((v) => ({ n: v.n, gv: grid.verseIndex(book, spec.chapter, v.n), text: v.text }));
  if (verses.length !== spec.to - spec.from + 1) throw new Error(`Journey passage incomplete: ${spec.slug}`);
  return { label: `${book.name} ${spec.chapter}:${spec.from}${spec.to !== spec.from ? `–${spec.to}` : ""}`, path: `/${book.slug}/${spec.chapter}/${spec.from}`, slug: book.slug, chapter: spec.chapter, verses };
}

async function connections(spec: PassageSpec): Promise<JourneyConnection[]> {
  const book = bookBySlug(spec.slug)!;
  const verses = await chapterVerses(book, spec.chapter);
  const inPassage = new Set(verses.filter((v) => v.n >= spec.from && v.n <= spec.to).map((v) => grid.verseIndex(book, spec.chapter, v.n)));
  const candidates = verses.filter((v) => v.n >= spec.from && v.n <= spec.to).flatMap((v) => v.links
    .filter(([gv, votes]) => votes > 0 && !inPassage.has(gv))
    .map(([gv, votes]) => ({ from: grid.verseIndex(book, spec.chapter, v.n), to: gv, votes })))
    .sort((a, b) => b.votes - a.votes || a.from - b.from || a.to - b.to);
  const targets = new Set<number>();
  const kept = candidates.filter((candidate) => { if (targets.has(candidate.to)) return false; targets.add(candidate.to); return true; }).slice(0, 4);
  return Promise.all(kept.map(async (edge) => {
    const a = verseRef(edge.from), b = verseRef(edge.to);
    return {
      ...edge, label: `${a.label} · ${b.label}`, text: await verseText(edge.to), versePath: b.path,
      href: conexaoPath({ book: a.book.index, slug: a.book.slug, chapter: a.chapter, verse: a.verse }, { book: b.book.index, slug: b.book.slug, chapter: b.chapter, verse: b.verse }),
    };
  }));
}

let cached: Promise<JourneyData> | undefined;
export function jesusJourney(): Promise<JourneyData> {
  cached ??= Promise.all(JOURNEY_STOPS.map(async (spec, i): Promise<JourneyStop> => {
    const place = placesJson.places.find((p) => p.ancientId === spec.ancientId);
    const event = eventById(spec.eventId);
    if (!place || !event) throw new Error(`Journey source missing: ${spec.id}`);
    const text = await passage(spec.passage);
    if (!text.verses.some((v) => event.verses.includes(v.gv))) throw new Error(`Journey event does not cover its passage: ${spec.id}`);
    return {
      id: spec.id, place: spec.place, title: spec.title, context: spec.context, number: i + 1,
      date: `c. ${yearLabel(event.year)}`, year: event.year, eventId: event.id, eventPath: `/linha-do-tempo/${event.slug}`,
      longitude: place.longitude, latitude: place.latitude, ...journeyPoint(place.longitude, place.latitude),
      labelX: spec.label[0], labelY: spec.label[1], sourceUrl: place.sourceUrl,
      locationNote: spec.locationNote ?? null, parallelNote: spec.parallelNote ?? null,
      passage: text,
      parallels: await Promise.all(spec.parallels.map(async (p) => ({ ...await passage(p), note: p.note }))),
      connections: await connections(spec.passage),
    };
  })).then((stops) => ({ stops }));
  return cached;
}
