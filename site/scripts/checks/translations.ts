import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "../../src/lib/canon/types";
import { getTranslation, translationPath } from "../../src/lib/translations";
import { OUT } from "../data/sources";

/** Verify the actual HTML text, edition links and credits for every complete NBV chapter. */
export function checkTranslations({ html, page, textOf, failures }: {
  html: readonly string[]; page: (path: string) => string; textOf: (html: string) => string; failures: string[];
}) {
  const books = JSON.parse(readFileSync(join(OUT.generated, "translations/open-nbv-books.json"), "utf8")) as Book[];
  const edition = getTranslation("open-nbv")!;
  let chapterCount = 0, verseCount = 0;
  for (const book of books) {
    const file = JSON.parse(readFileSync(join(OUT.generated, "translations/open-nbv", `${book.slug}.json`), "utf8")) as { chapters: string[][] };
    for (const [offset, verses] of file.chapters.entries()) {
      const chapter = offset + 1;
      const route = join("ler", "open-nbv", book.slug, `${chapter}.html`);
      if (!html.includes(route)) { failures.push(`[translations] ${route} not prerendered`); continue; }
      const raw = page(route);
      const shown = [...raw.matchAll(/<span data-scripture="">([\s\S]*?)<\/span>/g)].map((match) => textOf(match[1]));
      if (JSON.stringify(shown) !== JSON.stringify(verses)) failures.push(`[translations] ${route}: source text or order differs`);
      const visible = textOf(raw);
      if (!visible.includes(edition.credit) || !visible.includes("The original Work by its copyright holders is available for free at www.biblica.com and open.bible."))
        failures.push(`[translations] ${route}: edition attribution missing`);
      if (!visible.includes("Conexões do capítulo") || !visible.includes("não atribuímos estas ligações a um versículo específico"))
        failures.push(`[translations] ${route}: alignment scope missing`);
      for (let verse = 1; verse <= verses.length; verse++) {
        const ref = translationPath("open-nbv", book.slug, chapter, verse).slice(1);
        if (!raw.includes(`data-study-ref="${ref}"`) || !raw.includes(`data-share-ref="${ref}"`))
          failures.push(`[translations] ${route}: edition lost in actions of verse ${verse}`);
      }
      chapterCount++;
      verseCount += verses.length;
    }
  }
  return `${chapterCount} Open NBV chapters / ${verseCount} verses preserve source text, actions and credits`;
}
