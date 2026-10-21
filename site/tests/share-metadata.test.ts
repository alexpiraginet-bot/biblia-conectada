import { describe, expect, it } from "vitest";
import { shareMetadata } from "../src/lib/share-metadata";
import { SHARE_IMAGE_VERSION, SITE_NAME, SITE_URL } from "../src/lib/site-identity";

describe("share metadata", () => {
  it.each(["João 3:16", `João 3:16 · ${SITE_NAME}`, SITE_NAME])("brands %s once, including the document title", (title) => {
    const result = shareMetadata({ title, description: "Leia a passagem.", path: "/joao/3/16" });
    const expected = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;
    expect(result.title).toEqual({ absolute: expected });
    expect(result.openGraph?.title).toBe(expected);
    expect(result.twitter?.title).toBe(expected);
  });

  it("uses one absolute, versioned on-demand card across social networks", () => {
    const path = "/arcos?ref=joao%2F3%2F16";
    const result = shareMetadata({ title: "João 3:16", description: "Uma passagem. Novas conexões.", path });
    const card = `${SITE_URL}/og?path=${encodeURIComponent(path)}&v=${SHARE_IMAGE_VERSION}`;
    expect(result.alternates?.canonical).toBe(`${SITE_URL}${path}`);
    expect(result.openGraph).toMatchObject({
      type: "website", locale: "pt_BR", siteName: SITE_NAME,
      url: `${SITE_URL}${path}`, description: "Uma passagem. Novas conexões.",
      images: [{ url: card, width: 1200, height: 630, type: "image/png", alt: `João 3:16 · ${SITE_NAME}` }],
    });
    expect(result.twitter).toMatchObject({ card: "summary_large_image", images: [{ url: card, alt: `João 3:16 · ${SITE_NAME}` }] });
    expect(new URL(card).searchParams.get("path")).toBe(path);
  });

  it("omits fragments that a social crawler cannot receive", () => {
    const result = shareMetadata({ title: "Céu", description: "Conexões", path: "/arcos#joao/3/16" });
    expect(result.alternates?.canonical).toBe(`${SITE_URL}/arcos`);
    expect(result.openGraph?.url).toBe(`${SITE_URL}/arcos`);
  });

  it.each(["https://example.com/", "//example.com/", "/\\example.com/", "javascript:alert(1)"])("rejects an off-site path: %s", (path) => {
    expect(() => shareMetadata({ title: "Céu", description: "Conexões", path })).toThrow();
  });
});
