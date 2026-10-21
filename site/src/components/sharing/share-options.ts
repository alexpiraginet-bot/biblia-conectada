import { BASE, verseFromPath } from "@/lib/community/books-client";
import { SHARE_IMAGE_VERSION, SITE_NAME, SITE_URL } from "@/lib/site-identity";

export type ShareFormat = "landscape" | "story";
export function verseShareOptions(path: string) {
  const gv = verseFromPath(`/${path}`);
  if (gv === null) throw new Error("invalid reference");
  const { book, chapter, verse } = BASE.locate(gv);
  const canonicalPath = `/${book.slug}/${chapter}/${verse}`;
  const reference = `${book.name} ${chapter}:${verse}`;
  const url = `${SITE_URL}${canonicalPath}`;
  return {
    reference, url,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${reference} · ${SITE_NAME}\n${url}`)}`,
    image: (format: ShareFormat) => `/og?${new URLSearchParams({ path: canonicalPath, format, v: SHARE_IMAGE_VERSION })}`,
    filename: (format: ShareFormat) => `biblia-conectada-${book.slug}-${chapter}-${verse}-${format === "story" ? "stories" : "capa"}.png`,
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
