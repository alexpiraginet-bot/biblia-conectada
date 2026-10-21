import { BASE, BOOKS, verseFromPath } from "@/lib/community/books-client";
import { SHARE_IMAGE_VERSION, SITE_NAME, SITE_URL } from "@/lib/site-identity";
import { getTranslation, parseTranslationPath, translationPath } from "@/lib/translations";

export type ShareFormat = "landscape" | "story";
export function verseShareOptions(path: string) {
  const localPath = path.startsWith("/") ? path : `/${path}`;
  const selected = parseTranslationPath(localPath);
  const edition = selected?.id === "open-nbv" ? getTranslation(selected.id) : null;
  // Only names/slugs come from the shared canon. Verse existence belongs to the
  // selected edition and is checked by the image endpoint, never the BLIVRE grid.
  const translatedBook = edition && BOOKS.find((item) => item.slug === selected?.slug);
  const gv = edition ? null : verseFromPath(localPath);
  const location = edition && translatedBook && selected?.chapter && selected.verse
    ? { book: translatedBook, chapter: selected.chapter, verse: selected.verse }
    : gv === null ? null : BASE.locate(gv);
  if (!location) throw new Error("invalid reference");
  const { book, chapter, verse } = location;
  const canonicalPath = translationPath(edition?.id ?? "blivre", book.slug, chapter, verse);
  const reference = `${book.name} ${chapter}:${verse}`;
  const url = `${SITE_URL}${canonicalPath}`;
  return {
    reference, url,
    editionName: edition?.name ?? "Bíblia Livre (BLIVRE)",
    attribution: edition ? [edition.credit, edition.sourceNotice, edition.trademarkNotice].filter(Boolean).join(" ") : undefined,
    license: edition?.license,
    licenseUrl: edition?.licenseUrl,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${reference}${edition ? ` · ${edition.shortName}` : ""} · ${SITE_NAME}\n${url}`)}`,
    image: (format: ShareFormat) => `/og?${new URLSearchParams({ path: canonicalPath, format, v: SHARE_IMAGE_VERSION })}`,
    filename: (format: ShareFormat) => `biblia-conectada-${edition ? `${edition.id}-` : ""}${book.slug}-${chapter}-${verse}-${format === "story" ? "stories" : "capa"}.png`,
  };
}

/** Fetch only our validated local image route; never share a failed response as an image. */
export async function prepareVerseImage(path: string, format: ShareFormat, signal: AbortSignal): Promise<File> {
  const options = verseShareOptions(path);
  const response = await fetch(options.image(format), { signal, credentials: "same-origin" });
  if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "image/png") throw new Error("image unavailable");
  const blob = await response.blob();
  if (blob.size > 10 * 1024 * 1024 || blob.size < 24) throw new Error("invalid image");
  const header = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
  const dimensions = new DataView(header.buffer);
  if (![137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => header[i] === value)
    || dimensions.getUint32(16) !== (format === "story" ? 1080 : 1200)
    || dimensions.getUint32(20) !== (format === "story" ? 1920 : 630)) throw new Error("invalid image");
  return new File([blob], options.filename(format), { type: "image/png", lastModified: 0 });
}

export function canShareImage(file: File): boolean {
  try { return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [file] }); }
  catch { return false; }
}
