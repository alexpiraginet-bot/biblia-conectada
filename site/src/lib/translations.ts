/** Edition identity and URL syntax only. Safe to import without loading Bible data. */
export type TranslationId = "blivre" | "open-nbv";

export type Translation = {
  id: TranslationId;
  name: string;
  shortName: string;
  language: string;
  edition: string;
  credit: string;
  sourceNotice?: string;
  trademarkNotice?: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  verseAlignment: "canonical" | "unreviewed";
};

export const TRANSLATIONS: readonly Translation[] = [
  {
    id: "blivre",
    name: "Bíblia Livre",
    shortName: "BLIVRE",
    language: "pt-BR",
    edition: "fevereiro de 2018",
    credit: "Todas as Escrituras em português citadas são da Bíblia Livre (BLIVRE), Copyright © Diego Santos, Mario Sérgio, e Marco Teles, http://sites.google.com/site/biblialivre/ - fevereiro de 2018. Licença Creative Commons Atribuição 4.0 Brasil (http://creativecommons.org/licenses/by/4.0/br/). Reprodução permitida desde que devidamente mencionados fonte e autores.",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.pt-br",
    sourceUrl: "https://ebible.org/porbr2018/copyright.htm",
    verseAlignment: "canonical",
  },
  {
    id: "open-nbv",
    name: "Biblica® Open Nova Bíblia Viva™",
    shortName: "Open NBV",
    language: "pt-BR",
    edition: "2007",
    credit: "Biblica® Open Nova Bíblia Viva™ Copyright © 2007, 2010 by Biblica, Inc.",
    sourceNotice: "The original Work by its copyright holders is available for free at www.biblica.com and open.bible.",
    trademarkNotice: "“Biblica” é uma marca registrada na Oficina de Patentes e Marcas dos Estados Unidos por Biblica, Inc. Usado com permissão.",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br",
    sourceUrl: "https://ebible.org/poronbv/copyright.htm",
    verseAlignment: "unreviewed",
  },
];

export function getTranslation(id: string): Translation | null {
  return TRANSLATIONS.find((translation) => translation.id === id) ?? null;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NUMBER = /^[1-9]\d{0,2}$/;

/** Syntax only: callers must separately validate the book and the edition's chapter/verse counts. */
export function translationPath(id: TranslationId, slug?: string, chapter?: number, verse?: number): string {
  if (!getTranslation(id) || (slug !== undefined && (typeof slug !== "string" || !SLUG.test(slug))) ||
      (chapter !== undefined && (!slug || !Number.isInteger(chapter) || !NUMBER.test(String(chapter)))) ||
      (verse !== undefined && (chapter === undefined || !Number.isInteger(verse) || !NUMBER.test(String(verse))))) {
    throw new Error("Invalid translation path");
  }
  const prefix = id === "open-nbv" ? "/ler/open-nbv" : "";
  if (!slug) return prefix || "/ler";
  return `${prefix}/${slug}${chapter === undefined ? "" : `/${chapter}`}${verse === undefined ? "" : `/${verse}`}`;
}

export type TranslationPath = { id: TranslationId; slug?: string; chapter?: number; verse?: number };

/** A clean pathname, without query/hash/encoding. A parsed slug is not yet a known Bible book. */
export function parseTranslationPath(pathname: string): TranslationPath | null {
  if (pathname === "/ler") return { id: "blivre" };
  if (pathname === "/ler/open-nbv") return { id: "open-nbv" };
  const nbv = pathname.startsWith("/ler/open-nbv/");
  if (!pathname.startsWith("/") || (!nbv && pathname.startsWith("/ler/"))) return null;
  const parts = pathname.slice(nbv ? "/ler/open-nbv/".length : 1).split("/");
  if (parts.length > 3 || !SLUG.test(parts[0]) || parts.slice(1).some((part) => !NUMBER.test(part))) return null;
  return {
    id: nbv ? "open-nbv" : "blivre",
    slug: parts[0],
    ...(parts[1] === undefined ? {} : { chapter: Number(parts[1]) }),
    ...(parts[2] === undefined ? {} : { verse: Number(parts[2]) }),
  };
}
