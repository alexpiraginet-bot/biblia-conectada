import { describe, expect, it } from "vitest";
import { GET } from "../src/app/og/route";
import { resolveShareCard, shareExcerpt } from "../src/lib/share-card";
import { bookFile, books } from "./generated";

async function png(path: string, format?: string) {
  const url = new URL("https://example.test/og");
  url.searchParams.set("path", path);
  if (format) url.searchParams.set("format", format);
  const response = await GET(new Request(url));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  const buffer = Buffer.from(await response.arrayBuffer());
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return { buffer, width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("share image formats", () => {
  it("keeps the default landscape PNG and the explicit landscape byte-identical", async () => {
    const implicit = await png("/joao/3/16");
    const explicit = await png("/joao/3/16", "landscape");
    expect([implicit.width, implicit.height]).toEqual([1200, 630]);
    expect(explicit.buffer).toEqual(implicit.buffer);
  });

  it("renders a real Story PNG for a verse and a long book reference", async () => {
    for (const path of ["/joao/3/16", "/2-tessalonicenses/3/16"]) {
      const image = await png(path, "story");
      expect([image.width, image.height]).toEqual([1080, 1920]);
    }
  });

  it("renders portrait posts for both a verse and a real connection", async () => {
    for (const path of ["/joao/3/16", "/encontro/joao-1/genesis-1"]) {
      const image = await png(path, "post");
      expect([image.width, image.height]).toEqual([1080, 1350]);
    }
    expect((await resolveShareCard("/encontro/joao-1/genesis-1"))?.kind).toBe("connection");
    expect(await resolveShareCard("/encontro/joao-999/genesis-1")).toBeNull();
    expect(await resolveShareCard("/encontro/joao-1-1/genesis-1-1")).toBeNull();
  });

  it("includes the longest source verse in a Story without the landscape excerpt cut", async () => {
    const all = books().flatMap((book) => bookFile(book.slug).chapters.flatMap((verses, chapter) => verses.map((verse, index) => ({
      path: `/${book.slug}/${chapter + 1}/${index + 1}`, text: verse.t,
    }))));
    const longest = all.sort((a, b) => b.text.length - a.text.length)[0];
    expect(longest.text.length).toBeGreaterThan(205);
    const landscape = await resolveShareCard(longest.path);
    const story = await resolveShareCard(longest.path, 500);
    expect(landscape?.description).toBe(shareExcerpt(longest.text));
    expect(story?.description).toBe(shareExcerpt(longest.text, 500));
    expect(story!.description.length).toBeGreaterThan(landscape!.description.length);
    expect(story!.description.length).toBeLessThanOrEqual(500);
    expect(story!.description).toBe(longest.text.replace(/\s+/g, " ").trim());
    const image = await png(longest.path, "story");
    expect([image.width, image.height]).toEqual([1080, 1920]);
  });

  it("rejects unknown or duplicated formats instead of accepting arbitrary image sizes", async () => {
    for (const query of ["format=square", "format=", "format=STORY", "format=1080x1920", "format=story&format=landscape"]) {
      expect((await GET(new Request(`https://example.test/og?path=/joao/3/16&${query}`))).status).toBe(400);
    }
    expect((await GET(new Request("https://example.test/og?path=/joao/3/16&path=/genesis/1/1&format=story"))).status).toBe(400);
    expect((await GET(new Request("https://example.test/og?path=https://example.com&format=story"))).status).toBe(404);
  });
});
