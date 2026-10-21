import { books, verseText } from "./data";
import { createGrid } from "./canon/grid";
import type { Book } from "./canon/types";
import { parseSide } from "./conexao";
import { SITE_NAME } from "./site-identity";
import { STOPWORDS, isWordSlug, wordKey } from "./words";
import { parseHash } from "@/components/sculpture/state";
import { getTranslation, parseTranslationPath } from "./translations";

export type ShareCard = {
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  source?: string;
  attribution?: string;
  license?: string;
  kind: "landing" | "passage" | "connection" | "explore";
};

const grid = createGrid(books);
const bySlug = new Map(books.map((book) => [book.slug, book]));
const sections: Record<string, Omit<ShareCard, "path">> = {
  "/": { eyebrow: "UM ATLAS VIVO", title: "Uma história.\nTudo se conecta.", description: "Leia uma passagem. Descubra suas conexões. Encontre novos caminhos pela Bíblia.", kind: "landing" },
  "/ler": { eyebrow: "BÍBLIA LIVRE", title: "Uma leitura abre\nnovos caminhos.", description: "Livros, capítulos e versículos em português. Entre no texto e siga suas ligações.", kind: "landing" },
  "/arcos": { eyebrow: "CÉU DE CONEXÕES", title: "Cada ligação,\numa descoberta.", description: "Explore as referências cruzadas da Bíblia em um céu de fios de luz.", kind: "explore" },
  "/arcos/plano": { eyebrow: "CÉU DE CONEXÕES", title: "A Bíblia,\nligação por ligação.", description: "Encontre uma passagem e veja os caminhos que a aproximam de outros textos.", kind: "explore" },
  "/explorar": { eyebrow: "ATLAS DE CONEXÕES", title: "Siga o fio\nde uma passagem.", description: "Veja os capítulos que se encontram. Leia os textos e descubra a relação entre eles.", kind: "explore" },
  "/cronologia": { eyebrow: "BÍBLIA CRONOLÓGICA", title: "Uma história,\ndiferentes olhares.", description: "Leia os relatos dos evangelhos ao longo de uma proposta de ordem dos acontecimentos.", kind: "landing" },
  "/caminhos": { eyebrow: "PELOS CAMINHOS DE JESUS", title: "Lugares que\ncontam uma história.", description: "Percorra o mapa, descubra as passagens e acompanhe os caminhos dos evangelhos.", kind: "landing" },
  "/linha-do-tempo": { eyebrow: "LINHA DO TEMPO", title: "Leia a história\npelo tempo.", description: "Acontecimentos, lugares e passagens conectados, com as fontes da cronologia à vista.", kind: "landing" },
  "/tema": { eyebrow: "TEMAS BÍBLICOS", title: "Um tema.\nMuitos encontros.", description: "Explore passagens reunidas por tema e acompanhe suas ligações no texto bíblico.", kind: "explore" },
  "/palavra": { eyebrow: "PALAVRAS DA BÍBLIA", title: "Uma palavra pode\nabrir um mundo.", description: "Encontre palavras na Bíblia Livre e descubra os textos em que elas aparecem.", kind: "explore" },
  "/assistente": { eyebrow: "COMPANHEIRO DE ESTUDO · IA", title: "Vamos entender\njuntos.", description: "Pergunte sobre uma passagem, explore o contexto e confira as referências no texto bíblico.", kind: "landing" },
  "/buscar": { eyebrow: "ENCONTRE SEU CAMINHO", title: "O que você quer\ndescobrir hoje?", description: "Busque uma referência, uma palavra ou uma passagem. A próxima conexão começa aqui.", kind: "landing" },
  "/salvos": { eyebrow: "SEU CADERNO", title: "Guarde o que\ntocou você.", description: "Volte às passagens que você salvou neste aparelho e continue sua leitura.", kind: "landing" },
  "/ponte": { eyebrow: "PONTE BÍBLICA", title: "De um versículo\na outro.", description: "Siga as referências cruzadas e encontre um caminho entre duas passagens.", kind: "connection" },
  "/trilha": { eyebrow: "TRILHAS DE LEITURA", title: "Cada passo,\numa conexão.", description: "Explore caminhos de leitura que aproximam passagens do Antigo e do Novo Testamento.", kind: "connection" },
  "/trilha/antes-do-natal": { eyebrow: "TRILHA DE LEITURA", title: "Antes do Natal.", description: "Acompanhe as ligações entre o Antigo Testamento e os relatos do nascimento de Jesus.", kind: "connection" },
  "/mesa": { eyebrow: "MESA DE LEITURA", title: "Uma passagem.\nUma conversa.", description: "Leia, siga as conexões e compartilhe suas descobertas.", kind: "landing" },
  "/sobre": { eyebrow: "SOBRE O PROJETO", title: SITE_NAME, description: "Um atlas vivo para ler, explorar e conectar a Bíblia. Conheça as fontes e os créditos.", kind: "landing" },
  "/dados": { eyebrow: "FONTES ABERTAS", title: "Cada conexão\ntem uma fonte.", description: "Conheça os dados, as licenças e as referências que sustentam o atlas.", kind: "explore" },
};

/** A route identifier, never an external URL, arbitrary headline or filesystem path. */
export function parseSharePath(raw: string): { pathname: string; ref: string | null } | null {
  if (!raw || raw.length > 512 || !raw.startsWith("/") || raw.startsWith("//") || /[\\#\u0000-\u0020]/.test(raw)) return null;
  const pathname = raw.split("?", 1)[0];
  if (!/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?\/?$/.test(pathname)) return null;
  const url = new URL(raw, "https://share.invalid");
  const refs = url.searchParams.getAll("ref");
  if (refs.length > 1) return null;
  return { pathname: pathname === "/" ? "/" : pathname.replace(/\/$/, ""), ref: refs[0] ?? null };
}

/** Truncation is marked and never cuts a word or substitutes a paraphrase for Scripture. */
export function shareExcerpt(text: string, limit = 205): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.lastIndexOf(" ", limit - 1);
  return `${clean.slice(0, cut > 0 ? cut : limit - 1).trimEnd()}…`;
}

type Passage = { book: Book; chapter?: number; verse?: number; reference: string };
function passage(parts: string[]): Passage | null {
  if (!parts.length || parts.length > 3) return null;
  const book = bySlug.get(parts[0]);
  if (!book) return null;
  if (parts.length === 1) return { book, reference: book.name };
  if (!/^[1-9]\d{0,2}$/.test(parts[1])) return null;
  const chapter = Number(parts[1]);
  if (chapter > book.verses.length) return null;
  if (parts.length === 2) return { book, chapter, reference: `${book.name} ${chapter}` };
  if (!/^[1-9]\d{0,2}$/.test(parts[2])) return null;
  const verse = Number(parts[2]);
  return verse <= book.verses[chapter - 1] ? { book, chapter, verse, reference: `${book.name} ${chapter}:${verse}` } : null;
}

function side(segment: string): Passage | null {
  const parsed = parseSide(segment);
  return parsed ? passage([parsed.slug, String(parsed.chapter), ...(parsed.verse ? [String(parsed.verse)] : [])]) : null;
}

async function passageCard(path: string, selected: Passage, eyebrow?: string, excerptLimit = 205): Promise<ShareCard> {
  const chapter = selected.chapter ?? 1, verse = selected.verse ?? 1;
  return {
    path, kind: "passage", title: selected.reference,
    eyebrow: eyebrow ?? (selected.verse ? "UMA PASSAGEM. NOVAS CONEXÕES." : selected.chapter ? "LEIA O CAPÍTULO" : selected.book.testament === "AT" ? "ANTIGO TESTAMENTO" : "NOVO TESTAMENTO"),
    description: shareExcerpt(await verseText(selected.book.slug, chapter, verse), excerptLimit),
    source: `Bíblia Livre (BLIVRE) · ${selected.book.name} ${chapter}:${verse}`,
  };
}

function pairCard(path: string, a: Passage, b: Passage, eyebrow = "PASSAGENS EM DIÁLOGO"): ShareCard {
  return { path, eyebrow, title: `${a.reference}\ne ${b.reference}`, description: "Leia lado a lado. Descubra o contexto e acompanhe as conexões entre as passagens.", kind: "connection" };
}

function atVerse(gv: number): Passage {
  const { book, chapter, verse } = grid.locate(gv);
  return { book, chapter, verse, reference: `${book.name} ${chapter}:${verse}` };
}

async function skyCard(path: string, ref: string, excerptLimit: number): Promise<ShareCard> {
  const selection = parseHash(ref);
  if (selection?.kind === "verse") return passageCard(path, atVerse(selection.gv), "NO CÉU DE CONEXÕES", excerptLimit);
  if (selection?.kind === "chapter") {
    const { book, chapter } = grid.locateChapter(selection.ci);
    return passageCard(path, { book, chapter, reference: `${book.name} ${chapter}` }, "NO CÉU DE CONEXÕES", excerptLimit);
  }
  if (selection?.kind === "path") return pairCard(path, atVerse(selection.from), atVerse(selection.to), "UM CAMINHO ENTRE PASSAGENS");
  if (selection?.kind === "word") {
    const key = wordKey(selection.q);
    if (isWordSlug(key) && !STOPWORDS.has(key)) {
      const { wordLabel } = await import("./word-index");
      const label = await wordLabel(key);
      if (label) return { path, eyebrow: "UMA PALAVRA NO CÉU", title: label, description: "Descubra as passagens da Bíblia Livre que compartilham esta palavra e explore suas conexões.", kind: "explore" };
    }
  }
  // Invalid or free-form word searches retain the branded sky cover, never caller text.
  return { path, ...sections[path] };
}

/** Resolves only known routes and existing source records. Query strings cannot supply image content. */
export async function resolveShareCard(raw: string, excerptLimit: 205 | 500 = 205): Promise<ShareCard | null> {
  const parsed = parseSharePath(raw);
  if (!parsed) return null;
  const { pathname: path, ref } = parsed;
  if ((path === "/arcos" || path === "/arcos/plano") && ref !== null) {
    return skyCard(path, ref, excerptLimit);
  }
  if (Object.hasOwn(sections, path)) return { path, ...sections[path] };
  const translated = parseTranslationPath(path);
  if (translated?.id === "open-nbv") {
    const translation = getTranslation(translated.id)!;
    const credits = {
      attribution: [translation.credit, translation.sourceNotice].filter(Boolean).join(" "),
      license: `${translation.license} · ${translation.licenseUrl}`,
    };
    if (!translated.slug) return {
      path, kind: "landing", title: translation.name, eyebrow: "BÍBLIA EM PORTUGUÊS",
      description: "Escolha um livro e continue sua leitura nesta edição. Compartilhe uma passagem sem perder sua fonte.",
      ...credits,
    };
    const { translationBooks, translatedVerse } = await import("./translation-reading");
    const book = translationBooks(translated.id)?.find((item) => item.slug === translated.slug);
    if (!book) return null;
    const chapter = translated.chapter ?? 1;
    const verse = translated.verse ?? 1;
    const text = await translatedVerse(translated.id, book.slug, chapter, verse);
    if (text === null) return null;
    const reference = `${book.name}${translated.chapter ? ` ${chapter}` : ""}${translated.verse ? `:${verse}` : ""}`;
    return {
      path, kind: "passage", title: reference,
      eyebrow: translated.verse ? "UMA PASSAGEM. NOVAS CONEXÕES." : translated.chapter ? "LEIA O CAPÍTULO" : "ESCOLHA UM CAPÍTULO",
      description: shareExcerpt(text, excerptLimit),
      source: `${translation.name} · ${book.name} ${chapter}:${verse}`,
      ...credits,
    };
  }
  const parts = path.slice(1).split("/");
  const selected = passage(parts);
  if (selected) return passageCard(path, selected, undefined, excerptLimit);
  if (parts[0] === "conexao" && parts.length === 3) {
    const a = side(parts[1]), b = side(parts[2]);
    return a && b ? pairCard(path, a, b) : null;
  }
  if (parts[0] === "explorar") {
    const a = passage(parts.slice(1, 3));
    if (!a?.chapter || (parts.length !== 3 && parts.length !== 5)) return null;
    if (parts.length === 3) return passageCard(path, a, "ATLAS DE CONEXÕES", excerptLimit);
    const b = passage(parts.slice(3, 5));
    return b?.chapter ? pairCard(path, a, b, "ATLAS DE CONEXÕES") : null;
  }
  if (parts[0] === "tema" && parts.length === 2) {
    const { themeBySlug } = await import("./timeline");
    const theme = themeBySlug(parts[1]);
    return theme ? { path, eyebrow: "TEMA BÍBLICO", title: theme.label, description: "Um tema, diferentes passagens. Leia os textos e descubra as conexões entre eles.", kind: "explore" } : null;
  }
  if (parts[0] === "linha-do-tempo" && parts.length === 2) {
    const { eventBySlug } = await import("./timeline");
    const event = eventBySlug(parts[1]);
    if (!event) return null;
    return { path, eyebrow: "NA LINHA DO TEMPO", title: event.ref.split(/[;,]/, 1)[0], description: "Acompanhe este episódio e os relatos relacionados na cronologia bíblica, com suas conexões e fontes.", kind: "explore" };
  }
  if (parts[0] === "palavra" && parts.length === 2 && /^[a-z]{2,40}$/.test(parts[1])) {
    if (STOPWORDS.has(parts[1])) return null;
    const { wordLabel } = await import("./word-index");
    const label = await wordLabel(parts[1]);
    return label ? { path, eyebrow: "UMA PALAVRA NA BÍBLIA", title: label, description: "Encontre esta palavra no texto da Bíblia Livre e explore os caminhos entre as passagens.", kind: "explore" } : null;
  }
  if (parts[0] === "ponte" && parts.length === 2 && /^[1-9]\d{0,2}$/.test(parts[1])) {
    const { ponteBuilt } = await import("./community/data");
    const bridge = ponteBuilt.bridges.find((item) => item.n === Number(parts[1]));
    if (!bridge) return null;
    const a = grid.locate(bridge.start), b = grid.locate(bridge.target);
    return pairCard(path, passage([a.book.slug, String(a.chapter), String(a.verse)])!, passage([b.book.slug, String(b.chapter), String(b.verse)])!, `PONTE Nº ${bridge.n}`);
  }
  if (parts[0] === "trilha" && parts[1] === "antes-do-natal" && parts.length === 3 && /^[1-9]\d?$/.test(parts[2])) {
    const { trailStep } = await import("./community/data");
    const step = trailStep(Number(parts[2]));
    if (!step) return null;
    const a = grid.locate(step.ot.gv), b = grid.locate(step.nt.gv);
    return pairCard(path, passage([a.book.slug, String(a.chapter), String(a.verse)])!, passage([b.book.slug, String(b.chapter), String(b.verse)])!, "TRILHA · ANTES DO NATAL");
  }
  return null;
}
