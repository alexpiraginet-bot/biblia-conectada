import { SITE_URL } from "./site-identity";
import { isLiturgyDate } from "./liturgy/dates";
import { parseLiturgyEdition } from "./liturgy/edition";

const INTERNAL = /^\/(?:api|_next|\.well-known|instalar|qr|og|admin|auth|login|logout|icons|data|dados\/v1)(?:\/|$)/i;
const QUERY: Record<string, readonly string[]> = {
  "/arcos": ["ref", "v"], "/assistente": ["ref", "translation"], "/liturgia": ["date", "edition"],
};

/** Public content only: no external redirect, private query, credentials or nested redirect. */
export function safeContentPath(value: string | null | undefined): string | null {
  if (!value || value.length > 1200 || /[\\\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, SITE_URL);
    if (url.protocol !== "https:" || ![new URL(SITE_URL).hostname, "bibliaconectada.company"].includes(url.hostname)
      || url.username || url.password || url.port || value.startsWith("//")) return null;
    const rawPath = value.split(/[?#]/)[0];
    // Reject encoded separators/traversal before URL normalization can hide them.
    if (/%(?:2e|2f|5c|25)/i.test(rawPath) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(rawPath)) return null;
    const path = decodeURIComponent(url.pathname);
    if (!/^\/[a-z0-9/-]*$/.test(path) || path.includes("//") || INTERNAL.test(path)) return null;
    if (path.startsWith("/dia/") && !isLiturgyDate(path.slice(5))) return null;
    const query = new URLSearchParams();
    for (const key of (path.startsWith("/dia/") ? ["edition"] : QUERY[path] ?? [])) {
      const values = url.searchParams.getAll(key);
      if (values.length > 1) return null;
      const item = values[0];
      if (key === "edition" && parseLiturgyEdition(item) === null) return null;
      if (key === "edition" && item === "blivre") continue;
      if (item && item.length <= 200 && !/[\u0000-\u001f\u007f<>]/.test(item)) query.set(key, item);
    }
    let destination = path;
    if (path === "/liturgia" && query.has("date")) {
      const date = query.get("date");
      if (!isLiturgyDate(date)) return null;
      destination = `/dia/${date}`;
      query.delete("date");
    }
    // Hashes in this app identify public sections/verses, never arbitrary serialized state.
    const fragment = decodeURIComponent(url.hash.slice(1));
    const hash = fragment && fragment.length <= 240 && /^[\p{L}\p{N}_/ -]+$/u.test(fragment)
      ? `#${fragment.split("/").map(encodeURIComponent).join("/")}` : "";
    const result = `${destination}${query.size ? `?${query}` : ""}${hash}`;
    // Percent-encoding can expand Unicode. Bound the normalized URL too (QR capacity and idempotence).
    return result.length <= 1200 ? result : null;
  } catch { return null; }
}

export function contentUrl(value: string): string | null {
  const path = safeContentPath(value);
  return path === null ? null : `${SITE_URL}${path}`;
}

export function installationUrl(value: string): string {
  return `${SITE_URL}/instalar?${new URLSearchParams({ next: safeContentPath(value) ?? "/" })}`;
}
