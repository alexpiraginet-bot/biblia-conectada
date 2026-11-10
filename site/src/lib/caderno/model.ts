// The reader's notebook ("Caderno"): highlighted verses, notes and verses to memorise, kept only in this browser.
// Pure model: validation, changes, the review schedule, backup and merge. No storage and no data imports, so the
// reading pages can load it on first use. Rules for readers and maintainers: docs/CADERNO.md.
import { parseSalvos, passageRef, type Salvo } from "@/lib/salvos";

export const CADERNO_FORMAT = "biblia-conectada/caderno@1";
export const CADERNO_SOURCE = "Texto: Bíblia Livre (BLIVRE), CC BY 4.0";

export const MARK_COLORS = ["ouro", "verde", "azul", "lilas"] as const;
export type MarkColor = (typeof MARK_COLORS)[number];
export const MARK_LABEL: Record<MarkColor, string> = { ouro: "Ouro", verde: "Verde", azul: "Azul", lilas: "Lilás" };

/** Leitner boxes 1 to 5: days until the next review after the passage is remembered in each box. */
export const LEITNER_DAYS = [1, 2, 4, 8, 16] as const;
export const LAST_BOX = LEITNER_DAYS.length;
/** The review day follows Brasília, like the liturgy and the journey of this site. */
export const CADERNO_TIME_ZONE = "America/Sao_Paulo";

export const MAX_NOTE_CHARS = 4000;
export const MAX_TEXT_CHARS = 8000;
export const MAX_CADERNO_ITEMS = 5000;
export const MAX_CADERNO_BYTES = 2_000_000;

/** A verse range of one chapter on the BLIVRE grid: the book's slug, the chapter and the first and last verse. */
export type Passage = { livro: string; cap: number; de: number; ate: number };
/** One highlighted verse, with its text as shown on the page when it was marked. */
export type Grifo = { livro: string; cap: number; vers: number; cor: MarkColor; texto: string; em: string };
export type Nota = Passage & { id: string; trecho: string; nota: string; criadaEm: string; em: string };
export type Memo = Passage & {
  id: string;
  texto: string;
  /** Leitner box, 1 to LAST_BOX */
  caixa: number;
  /** next review day, "YYYY-MM-DD" in CADERNO_TIME_ZONE */
  proxima: string;
  revisoes: number;
  acertos: number;
  criadaEm: string;
  em: string;
};
export type Caderno = { v: 1; cor: MarkColor; grifos: Grifo[]; notas: Nota[]; memos: Memo[] };
/** What validation needs from the generated book list (src/data/generated/books.json). */
export type CadernoCatalog = readonly { slug: string; name: string; verses: readonly number[] }[];

/** A message that can be shown to the reader as it is. */
export class CadernoError extends Error {}

export const emptyCaderno = (): Caderno => ({ v: 1, cor: "ouro", grifos: [], notas: [], memos: [] });
export const isEmptyCaderno = (c: Caderno) => c.grifos.length + c.notas.length + c.memos.length === 0;

// ---- days

/** "2026-11-10": the calendar day in Brasília of an instant. */
export function cadernoDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CADERNO_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
function dayParts(day: string): [number, number, number] | null {
  const m = DAY.exec(day);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? [y, mo, d] : null;
}
export const isDay = (day: unknown): day is string => typeof day === "string" && dayParts(day) !== null;

/** Calendar arithmetic on a day string; never touches a time zone. */
export function addDays(day: string, days: number): string {
  const p = dayParts(day);
  if (!p) throw new CadernoError("Data inválida no caderno.");
  return new Date(Date.UTC(p[0], p[1] - 1, p[2] + days)).toISOString().slice(0, 10);
}

/** Whole days from one day to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [a, b] = [dayParts(from), dayParts(to)];
  if (!a || !b) throw new CadernoError("Data inválida no caderno.");
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000);
}

// ---- validation

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const isPos = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) < 1000;
const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < 1_000_000;
const isInstant = (s: unknown): s is string => typeof s === "string" && s.length <= 40 && !Number.isNaN(Date.parse(s));
const isText = (s: unknown, max: number): s is string => typeof s === "string" && s.trim().length > 0 && s.length <= max;
const isId = (s: unknown): s is string => typeof s === "string" && s.length > 0 && s.length <= 80;
const isColor = (s: unknown): s is MarkColor => (MARK_COLORS as readonly unknown[]).includes(s);
const onlyKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).length === keys.length && keys.every((k) => k in o);

function inChapter(o: Record<string, unknown>, first: unknown, last: unknown, catalog?: CadernoCatalog): boolean {
  if (typeof o.livro !== "string" || o.livro.length > 40 || !SLUG.test(o.livro) || !isPos(o.cap) || !isPos(first) || !isPos(last) || last < first) return false;
  if (!catalog) return true;
  const verses = catalog.find((b) => b.slug === o.livro)?.verses[o.cap - 1];
  return verses !== undefined && last <= verses;
}

const GRIFO_KEYS = ["livro", "cap", "vers", "cor", "texto", "em"];
const NOTA_KEYS = ["id", "livro", "cap", "de", "ate", "trecho", "nota", "criadaEm", "em"];
const MEMO_KEYS = ["id", "livro", "cap", "de", "ate", "texto", "caixa", "proxima", "revisoes", "acertos", "criadaEm", "em"];

const isGrifo = (x: unknown, catalog?: CadernoCatalog): x is Grifo =>
  isObject(x) && onlyKeys(x, GRIFO_KEYS) && inChapter(x, x.vers, x.vers, catalog) && isColor(x.cor) && isText(x.texto, MAX_TEXT_CHARS) && isInstant(x.em);
const isNota = (x: unknown, catalog?: CadernoCatalog): x is Nota =>
  isObject(x) && onlyKeys(x, NOTA_KEYS) && isId(x.id) && inChapter(x, x.de, x.ate, catalog) && isText(x.trecho, MAX_TEXT_CHARS)
  && isText(x.nota, MAX_NOTE_CHARS) && isInstant(x.criadaEm) && isInstant(x.em);
const isMemo = (x: unknown, catalog?: CadernoCatalog): x is Memo =>
  isObject(x) && onlyKeys(x, MEMO_KEYS) && isId(x.id) && inChapter(x, x.de, x.ate, catalog) && isText(x.texto, MAX_TEXT_CHARS)
  && isPos(x.caixa) && x.caixa <= LAST_BOX && isDay(x.proxima) && isCount(x.revisoes) && isCount(x.acertos) && x.acertos <= x.revisoes
  && isInstant(x.criadaEm) && isInstant(x.em);

const verseKey = (g: { livro: string; cap: number; vers: number }) => `${g.livro}/${g.cap}/${g.vers}`;
const passageKey = (p: Passage) => `${p.livro}/${p.cap}/${p.de}-${p.ate}`;
const unique = (keys: string[]) => new Set(keys).size === keys.length;

/** The three lists of a notebook, or null: every item valid, and no verse, passage or id twice. */
function readLists(o: Record<string, unknown>, catalog?: CadernoCatalog): Pick<Caderno, "grifos" | "notas" | "memos"> | null {
  const { grifos, notas, memos } = o;
  if (!Array.isArray(grifos) || !Array.isArray(notas) || !Array.isArray(memos)) return null;
  if (Math.max(grifos.length, notas.length, memos.length) > MAX_CADERNO_ITEMS) return null;
  if (!grifos.every((g) => isGrifo(g, catalog)) || !notas.every((n) => isNota(n, catalog)) || !memos.every((m) => isMemo(m, catalog))) return null;
  if (!unique(grifos.map(verseKey)) || !unique(notas.map(passageKey)) || !unique(memos.map(passageKey))) return null;
  if (!unique(notas.map((n: Nota) => n.id)) || !unique(memos.map((m: Memo) => m.id))) return null;
  return { grifos, notas, memos };
}

/**
 * The stored notebook. Nothing stored is an empty notebook; anything else must be whole. A single bad item makes the
 * whole string unreadable on purpose: dropping it quietly and saving again would erase what the reader wrote.
 */
export function parseCaderno(raw: string | null | undefined): Caderno {
  if (raw === null || raw === undefined) return emptyCaderno();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new CadernoError("Os dados do caderno neste navegador não puderam ser lidos.");
  }
  const lists = isObject(data) && onlyKeys(data, ["v", "cor", "grifos", "notas", "memos"]) && data.v === 1 && isColor(data.cor) ? readLists(data) : null;
  if (!lists) throw new CadernoError("Os dados do caderno neste navegador não puderam ser lidos.");
  return { v: 1, cor: (data as { cor: MarkColor }).cor, ...lists };
}

// ---- reading the notebook

export const samePassage = (a: Passage, b: Passage) => a.livro === b.livro && a.cap === b.cap && a.de === b.de && a.ate === b.ate;

/** Colour of each highlighted verse of a chapter. */
export function chapterMarks(c: Caderno, livro: string, cap: number): Map<number, MarkColor> {
  return new Map(c.grifos.filter((g) => g.livro === livro && g.cap === cap).map((g) => [g.vers, g.cor]));
}

/** What the notebook holds about one chapter, in verse order. */
export function chapterNotebook(c: Caderno, livro: string, cap: number) {
  const here = <T extends Passage>(list: T[]) => list.filter((x) => x.livro === livro && x.cap === cap).sort((a, b) => a.de - b.de || a.ate - b.ate);
  return { marks: chapterMarks(c, livro, cap), notas: here(c.notas), memos: here(c.memos) };
}

export const findNota = (c: Caderno, p: Passage) => c.notas.find((n) => samePassage(n, p));

/** Passages to review on a day: the ones waiting longest first, then the lowest box. */
export function dueMemos(c: Caderno, today: string): Memo[] {
  return c.memos
    .filter((m) => m.proxima <= today)
    .sort((a, b) => a.proxima.localeCompare(b.proxima) || a.caixa - b.caixa || a.criadaEm.localeCompare(b.criadaEm) || a.id.localeCompare(b.id));
}

export type MarkGroup = Passage & { cor: MarkColor; versos: { vers: number; texto: string }[]; em: string };

/** Neighbouring verses of one chapter in the same colour read as one passage; the most recently marked first. */
export function markGroups(c: Caderno): MarkGroup[] {
  const sorted = [...c.grifos].sort((a, b) => a.livro.localeCompare(b.livro) || a.cap - b.cap || a.vers - b.vers);
  const groups: MarkGroup[] = [];
  for (const g of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.livro === g.livro && last.cap === g.cap && last.cor === g.cor && last.ate === g.vers - 1) {
      last.ate = g.vers;
      last.versos.push({ vers: g.vers, texto: g.texto });
      if (g.em > last.em) last.em = g.em;
    } else groups.push({ livro: g.livro, cap: g.cap, de: g.vers, ate: g.vers, cor: g.cor, versos: [{ vers: g.vers, texto: g.texto }], em: g.em });
  }
  return groups.sort((a, b) => b.em.localeCompare(a.em) || a.livro.localeCompare(b.livro) || a.cap - b.cap || a.de - b.de);
}

/** "Gênesis 1:3–5" and the page of the first verse, or null when the book or the verses are not on the grid. */
export function passagePlace(catalog: CadernoCatalog, p: Passage): { ref: string; path: string } | null {
  const book = catalog.find((b) => b.slug === p.livro);
  const verses = book?.verses[p.cap - 1];
  if (!book || verses === undefined || p.de < 1 || p.ate < p.de || p.ate > verses) return null;
  return { ref: passageRef(book.name, p.cap, p.de, p.ate), path: `/${book.slug}/${p.cap}/${p.de}` };
}

/**
 * The first letter of every word, with the punctuation kept: the classic aid for reciting a passage from memory.
 * "No princípio, criou Deus" becomes "N p, c D".
 */
export function firstLetters(text: string): string {
  return text.replace(/[\p{L}\p{M}]+/gu, (word) => String.fromCodePoint(word.codePointAt(0)!));
}

// ---- changes (each returns a new notebook, or the same object when nothing changed)

const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();
function textOf(text: string, what: string): string {
  const clean = cleanText(text);
  if (!clean) throw new CadernoError(`${what} sem texto.`);
  if (clean.length > MAX_TEXT_CHARS) throw new CadernoError("Trecho longo demais para o caderno. Selecione menos texto.");
  return clean;
}
function checkPassage(p: Passage): Passage {
  if (!inChapter(p as unknown as Record<string, unknown>, p.de, p.ate)) throw new CadernoError("Não foi possível identificar esta passagem.");
  return { livro: p.livro, cap: p.cap, de: p.de, ate: p.ate };
}
function room(list: readonly unknown[], what: string) {
  if (list.length >= MAX_CADERNO_ITEMS) throw new CadernoError(`O caderno chegou ao limite de ${what} neste aparelho. Baixe uma cópia e apague o que não usa mais.`);
}

/** Marks verses of a chapter in a colour (a verse already marked changes colour) and remembers the colour. */
export function markVerses(c: Caderno, livro: string, cap: number, verses: readonly { vers: number; texto: string }[], cor: MarkColor, now: string): Caderno {
  if (!isColor(cor)) throw new CadernoError("Cor de grifo desconhecida.");
  const incoming = new Map(verses.map((v) => [v.vers, textOf(v.texto, "Versículo")]));
  for (const vers of incoming.keys()) checkPassage({ livro, cap, de: vers, ate: vers });
  const here = (g: Grifo) => g.livro === livro && g.cap === cap && incoming.has(g.vers);
  const old = new Map(c.grifos.filter(here).map((g) => [g.vers, g]));
  const settled = (vers: number, texto: string) => old.get(vers)?.cor === cor && old.get(vers)?.texto === texto;
  if (c.cor === cor && [...incoming].every(([vers, texto]) => settled(vers, texto))) return c;
  // a verse already in this colour keeps its record (and its date); the others are marked now
  const marked = [...incoming].map(([vers, texto]): Grifo => (settled(vers, texto) ? old.get(vers)! : { livro, cap, vers, cor, texto, em: now }));
  const grifos = [...c.grifos.filter((g) => !here(g)), ...marked];
  if (grifos.length > MAX_CADERNO_ITEMS) throw new CadernoError("O caderno chegou ao limite de grifos neste aparelho. Baixe uma cópia e apague o que não usa mais.");
  return { ...c, cor, grifos };
}

export function unmarkVerses(c: Caderno, livro: string, cap: number, verses: readonly number[]): Caderno {
  const grifos = c.grifos.filter((g) => !(g.livro === livro && g.cap === cap && verses.includes(g.vers)));
  return grifos.length === c.grifos.length ? c : { ...c, grifos };
}

/** One note per passage: writing on a passage that has a note replaces its text. */
export function saveNota(c: Caderno, passage: Passage, trecho: string, nota: string, now: string, id: string): Caderno {
  const p = checkPassage(passage);
  const text = nota.replace(/\r\n?/g, "\n").trim();
  if (!text) throw new CadernoError("Escreva a anotação antes de guardar.");
  if (text.length > MAX_NOTE_CHARS) throw new CadernoError(`A anotação passou de ${MAX_NOTE_CHARS.toLocaleString("pt-BR")} caracteres. Encurte o texto para guardar.`);
  const excerpt = textOf(trecho, "Trecho");
  const old = findNota(c, p);
  if (old) {
    if (old.nota === text && old.trecho === excerpt) return c;
    return { ...c, notas: c.notas.map((n) => (n === old ? { ...old, trecho: excerpt, nota: text, em: now } : n)) };
  }
  room(c.notas, "anotações");
  if (!isId(id)) throw new CadernoError("Não foi possível criar a anotação.");
  return { ...c, notas: [{ id, ...p, trecho: excerpt, nota: text, criadaEm: now, em: now }, ...c.notas] };
}

export function removeNota(c: Caderno, id: string): Caderno {
  const notas = c.notas.filter((n) => n.id !== id);
  return notas.length === c.notas.length ? c : { ...c, notas };
}

/** Adds a passage to memorise, due today in box 1. The same passage again only refreshes its text. */
export function addMemo(c: Caderno, passage: Passage, texto: string, today: string, now: string, id: string): Caderno {
  const p = checkPassage(passage);
  const text = textOf(texto, "Trecho");
  if (!isDay(today)) throw new CadernoError("Data inválida no caderno.");
  const old = c.memos.find((m) => samePassage(m, p));
  if (old) return old.texto === text ? c : { ...c, memos: c.memos.map((m) => (m === old ? { ...old, texto: text, em: now } : m)) };
  room(c.memos, "passagens para decorar");
  if (!isId(id)) throw new CadernoError("Não foi possível guardar a passagem.");
  return { ...c, memos: [{ id, ...p, texto: text, caixa: 1, proxima: today, revisoes: 0, acertos: 0, criadaEm: now, em: now }, ...c.memos] };
}

/**
 * One review. Remembered: the passage rests for the days of its box (LEITNER_DAYS) and moves up one box, staying in
 * the last. Not yet: it goes back to box 1 and stays due today, so it can be tried again in the same sitting.
 */
export function reviewMemo(c: Caderno, id: string, remembered: boolean, today: string, now: string): Caderno {
  if (!isDay(today)) throw new CadernoError("Data inválida no caderno.");
  const old = c.memos.find((m) => m.id === id);
  if (!old) throw new CadernoError("Esta passagem não está mais na sua lista para decorar.");
  const next: Memo = remembered
    ? { ...old, caixa: Math.min(old.caixa + 1, LAST_BOX), proxima: addDays(today, LEITNER_DAYS[old.caixa - 1]), revisoes: old.revisoes + 1, acertos: old.acertos + 1, em: now }
    : { ...old, caixa: 1, proxima: today, revisoes: old.revisoes + 1, em: now };
  return { ...c, memos: c.memos.map((m) => (m === old ? next : m)) };
}

export function removeMemo(c: Caderno, id: string): Caderno {
  const memos = c.memos.filter((m) => m.id !== id);
  return memos.length === c.memos.length ? c : { ...c, memos };
}

// ---- backup

export const cadernoBytes = (raw: string) => new TextEncoder().encode(raw).length;

/** The file of "Baixar meu caderno": the notebook and the saved passages of /salvos, with the text's licence. */
export function exportCaderno(c: Caderno, salvos: readonly Salvo[], now: Date): string {
  return JSON.stringify(
    { formato: CADERNO_FORMAT, exportadoEm: now.toISOString(), fonte: CADERNO_SOURCE, grifos: c.grifos, notas: c.notas, memos: c.memos, salvos },
    null,
    2,
  );
}

export type CadernoBackup = { caderno: Caderno; salvos: Salvo[]; exportadoEm: string };

/**
 * The saved passages of a backup joined to the ones of this device: the ones it does not have yet go in front, in the
 * backup's order. A passage is the same by its id or by its place and text. Null when the backup brings nothing new.
 */
export function mergeSalvos(mine: readonly Salvo[], theirs: readonly Salvo[]): Salvo[] | null {
  const same = (a: Salvo, b: Salvo) => a.id === b.id || (a.path === b.path && a.ate === b.ate && a.texto === b.texto);
  const fresh: Salvo[] = [];
  for (const s of theirs) if (![...mine, ...fresh].some((m) => same(m, s))) fresh.push(s);
  return fresh.length ? [...fresh, ...mine] : null;
}

/** A backup file, checked whole against the real books, chapters and verses before anything is merged. */
export function parseCadernoBackup(raw: string, catalog: CadernoCatalog): CadernoBackup {
  if (cadernoBytes(raw) > MAX_CADERNO_BYTES) throw new CadernoError("O arquivo é maior do que o caderno aceita.");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new CadernoError("Este arquivo não é um backup do caderno.");
  }
  if (!isObject(data) || data.formato !== CADERNO_FORMAT || !isInstant(data.exportadoEm)) throw new CadernoError("Este arquivo não é um backup do caderno.");
  const lists = readLists(data, catalog);
  if (!lists) throw new CadernoError("O backup tem itens que não puderam ser conferidos com os livros e versículos da Bíblia Livre. Nada foi importado.");
  const salvosIn = data.salvos === undefined ? [] : data.salvos;
  const salvos = Array.isArray(salvosIn) ? parseSalvos(JSON.stringify(salvosIn)) : null;
  if (!salvos || salvos.length !== (salvosIn as unknown[]).length) throw new CadernoError("O backup tem trechos salvos que não puderam ser lidos. Nada foi importado.");
  return { caderno: { ...emptyCaderno(), ...lists }, salvos, exportadoEm: data.exportadoEm };
}

/**
 * Brings a backup into the notebook without losing anything: items are added, and when both sides have the same
 * verse or passage the most recently changed one stays (a tie keeps what is on this device). Nothing is removed, so
 * an old backup can bring back an item erased after it was made.
 */
export function mergeCaderno(local: Caderno, incoming: Caderno): Caderno {
  let changed = false;
  function merge<T extends { em: string }>(mine: T[], theirs: T[], key: (x: T) => string, adopt: (x: T, old?: T) => T, what: string): T[] {
    const byKey = new Map(mine.map((x) => [key(x), x]));
    const out = [...mine];
    for (const x of theirs) {
      const old = byKey.get(key(x));
      if (!old) {
        out.push(adopt(x));
        changed = true;
      } else if (Date.parse(x.em) > Date.parse(old.em)) {
        out[out.indexOf(old)] = adopt(x, old);
        changed = true;
      }
    }
    if (out.length > MAX_CADERNO_ITEMS) throw new CadernoError(`Com este backup o caderno passaria do limite de ${what} neste aparelho. Nada foi importado.`);
    return out;
  }
  const ids = new Set([...local.notas, ...local.memos].map((x) => x.id));
  // an item replacing a local one keeps the local id; a new one keeps its own unless this device already uses it
  const withId = <T extends { id: string; em: string }>(x: T, old?: T): T => {
    if (old) return { ...x, id: old.id };
    let id = x.id;
    for (let n = 2; ids.has(id); n++) id = `${x.id}-${n}`;
    ids.add(id);
    return id === x.id ? x : { ...x, id };
  };
  const grifos = merge(local.grifos, incoming.grifos, verseKey, (x) => x, "grifos");
  const notas = merge(local.notas, incoming.notas, passageKey, withId, "anotações");
  const memos = merge(local.memos, incoming.memos, passageKey, withId, "passagens para decorar");
  return changed ? { ...local, grifos, notas, memos } : local;
}
