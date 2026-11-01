import { describe, it, expect } from "vitest";
import { safeContentPath, contentUrl, installationUrl } from "../src/lib/app-links";
import { GET } from "../src/app/api/qr/route";
import jsQR from "jsqr";
import { createRequire } from "node:module";
import QRCode from "qrcode";

const { PNG } = createRequire(import.meta.url)("pngjs") as { PNG: { sync: { read: (buffer: Buffer) => { data: Uint8Array; width: number; height: number } } } };

describe("public content links", () => {
  it("preserves a supported liturgy edition through dated links and installation", () => {
    for (const path of ["/liturgia?edition=open-nbv", "/dia/2026-10-31?edition=open-nbv"]) {
      expect(safeContentPath(path)).toBe(path);
      expect(new URL(installationUrl(path)).searchParams.get("next")).toBe(path);
    }
    expect(safeContentPath("/liturgia?date=2026-10-31&edition=open-nbv#psalm-1")).toBe("/dia/2026-10-31?edition=open-nbv#psalm-1");
    expect(safeContentPath("/dia/2026-10-31?edition=blivre")).toBe("/dia/2026-10-31");
  });
  it.each(["edition=", "edition=CNBB", "edition=open-nbv&edition=open-nbv", "edition=blivre&edition=open-nbv"])("rejects invalid edition QR destinations: %s", (query) => {
    expect(safeContentPath(`/dia/2026-10-31?${query}`)).toBeNull();
    expect(safeContentPath(`/liturgia?${query}`)).toBeNull();
  });
  it.each(["/", "/liturgia", "/dia/2026-10-31", "/joao/3/16", "/ler/open-nbv/3-joao/1/15", "/arcos#joao/3/16", "/interlinear/joao/1/1", "/#como-funciona"])("preserves %s", (path) => {
    expect(safeContentPath(path)).toBe(path);
    expect(contentUrl(path)).toBe(`https://www.bibliaconectada.company${path}`);
    expect(new URL(installationUrl(path)).searchParams.get("next")).toBe(path);
  });
  it.each(["https://evil.test/joao/3/16", "//evil.test", "/\\evil.test", "javascript:alert(1)", "/api/jornada", "/api/assistente/voz", "/_next/static", "/instalar?next=/", "/qr", "/icons/x.png", "/dados/v1/manifest.json", "/foo/../api/jornada", "/%2e%2e/api/jornada", "/%252e/api", "/%2f%2fevil", "/dia/2026-02-30", "/liturgia?date=2026-02-30", "https://user:password@www.bibliaconectada.company/", "https://www.bibliaconectada.company:4430/", "/a\nb", "/arcos?ref=a&ref=b"])("rejects unsafe %s", (value) => expect(safeContentPath(value)).toBeNull());
  it("pins a requested date and removes tracking/private query values", () => {
    expect(safeContentPath("/liturgia?date=2026-10-31&utm_source=qr")).toBe("/dia/2026-10-31");
    expect(safeContentPath("/coracao?question=private&token=secret")).toBe("/coracao");
    expect(safeContentPath("/buscar?q=personal")).toBe("/buscar");
    expect(safeContentPath("/arcos?ref=joao%2F3%2F16&_vercel_share=private#joao/3/16")).toBe("/arcos?ref=joao%2F3%2F16#joao/3/16");
    expect(contentUrl("https://bibliaconectada.company/joao/3/16")).toBe("https://www.bibliaconectada.company/joao/3/16");
  });
  it("bounds percent-encoded Unicode expansion before allocating a QR", async () => {
    const path = `/arcos?v=${"漢".repeat(190)}#${"é".repeat(200)}`;
    expect(path.length).toBeLessThan(1200);
    expect(safeContentPath(path)).toBeNull();
    expect((await GET(new Request(`https://example.test/api/qr?${new URLSearchParams({ path })}`))).status).toBe(400);
    const valid = safeContentPath("/arcos#palavra/coração");
    expect(safeContentPath(valid)).toBe(valid);
  });
});

describe("QR endpoint", () => {
  it("encodes the chosen NBV edition and day in the downloadable PNG", async () => {
    const path = "/dia/2026-10-31?edition=open-nbv";
    const response = await GET(new Request(`https://example.test/api/qr?${new URLSearchParams({ path })}`));
    expect(response.status).toBe(200);
    const png = PNG.sync.read(Buffer.from(await response.arrayBuffer()));
    expect(jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data).toBe(`https://www.bibliaconectada.company${path}`);
  });
  it.each(["/api/qr?path=https://evil.test", "/api/qr?path=/&path=/liturgia", "/api/qr?format=gif", "/api/qr?format=png&format=svg"])("rejects malformed requests: %s", async (path) => {
    expect((await GET(new Request(`https://example.test${path}`))).status).toBe(400);
  });
  it("delivers a real PNG and an SVG download with a quiet zone", async () => {
    const png = await GET(new Request("https://example.test/api/qr?path=%2Fdia%2F2026-10-31"));
    const bytes = Buffer.from(await png.arrayBuffer());
    expect(png.headers.get("content-type")).toBe("image/png");
    expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(bytes.readUInt32BE(16)).toBe(1024);
    const decoded = PNG.sync.read(bytes);
    expect(jsQR(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height)?.data).toBe("https://www.bibliaconectada.company/dia/2026-10-31");
    const svg = await GET(new Request("https://example.test/api/qr?path=%2Fjoao%2F3%2F16&format=svg&download=1"));
    expect(svg.headers.get("content-disposition")).toContain(".svg");
    expect(await svg.text()).toContain("<svg");
  });
  it.each(["/liturgia", "/dia/2026-10-31", "/ler/open-nbv/3-joao/1/15", "/arcos?ref=joao%2F3%2F16#joao/3/16"])("independently decodes QR modules for %s", (path) => {
    const url = contentUrl(path)!;
    const code = QRCode.create(url, { errorCorrectionLevel: "M" });
    const scale = 8, size = (code.modules.size + 8) * scale;
    const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
    for (let row = 0; row < code.modules.size; row++) for (let col = 0; col < code.modules.size; col++) if (code.modules.get(row, col)) {
      for (let y = 0; y < scale; y++) for (let x = 0; x < scale; x++) {
        const offset = (((row + 4) * scale + y) * size + (col + 4) * scale + x) * 4;
        rgba[offset] = 33; rgba[offset + 1] = 16; rgba[offset + 2] = 24;
      }
    }
    expect(jsQR(rgba, size, size)?.data).toBe(url);
  });
});
