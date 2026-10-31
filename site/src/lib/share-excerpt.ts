/** Truncation is visible and never presents a paraphrase as Scripture. */
export function shareExcerpt(text: string, limit = 205): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.lastIndexOf(" ", limit - 1);
  return `${clean.slice(0, cut > 0 ? cut : limit - 1).trimEnd()}…`;
}
