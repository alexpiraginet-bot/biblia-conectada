import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "../src/app/instalar/route";
import { GET as getManifest } from "../src/app/manifest.webmanifest/route";
import { INSTALL_URL, SITE_NAME, SITE_URL } from "../src/lib/site-identity";

describe("public installation document", () => {
  it("delivers install identity in a complete HTML head without a client framework", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    const head = html.split("</head>")[0];
    expect(head).toContain(`<title>${SITE_NAME}</title>`);
    expect(head).toMatch(/name="apple-mobile-web-app-title" content="Bíblia Conectada"/);
    expect(head.match(/rel="apple-touch-icon"/g)).toHaveLength(1);
    expect(head.match(/rel="manifest"/g)).toHaveLength(1);
    expect(html).toContain('lang="pt-BR"');
    expect(html).not.toMatch(/\/_next\/|self\.__next_f|<script[^>]+src=/);
    expect(Buffer.byteLength(html)).toBeLessThan(25_000);
  });

  it("shows the same real PNG that Safari is asked to use", async () => {
    const html = await GET().text();
    const icon = html.match(/<link[^>]+rel="apple-touch-icon"[^>]*href="([^"]+)"/)?.[1];
    expect(icon).toBeTruthy();
    expect(html).toMatch(new RegExp(`<img[^>]+src="${icon}"`));
    const image = readFileSync(join(process.cwd(), "public", new URL(icon!, SITE_URL).pathname));
    expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([180, 180]);
  });

  it("keeps the existing app identity and launches the Bible, not the install instructions", async () => {
    const manifest = await getManifest().json();
    expect(manifest).toMatchObject({ id: "/", start_url: "/", scope: "/", name: SITE_NAME, short_name: SITE_NAME, display: "standalone" });
    expect(new URL(INSTALL_URL)).toMatchObject({ origin: SITE_URL, pathname: "/instalar" });
  });
});
