// Text helpers shared by the data pipeline and the site.

/** "Isaías" -> "Isaias". Removes combining marks after NFD decomposition. */
export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}+/gu, "").normalize("NFC");
}

/** "1 Coríntios" -> "1-corintios". Used for URLs. */
export function slugify(s: string): string {
  return stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Lowercase key without accents, spaces or dots: "1 Co." -> "1co", "Cântico dos Cânticos" -> "canticodoscanticos". */
export function bookKey(s: string): string {
  return stripAccents(s).toLowerCase().replace(/[\s.]+/g, "");
}

/** Lowercase key that keeps accents, so "Jó" and "Jo" stay apart. */
export function bookKeyAccented(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[\s.]+/g, "");
}

const nf = new Intl.NumberFormat("pt-BR");
/** 31102 -> "31.102" (pt-BR grouping). Presentation only. */
export function formatInt(n: number): string {
  return nf.format(n);
}
