import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/app/instalar/route";
import { GET as getManifest } from "../src/app/manifest.webmanifest/route";
import { INSTALL_URL, SITE_NAME, SITE_URL } from "../src/lib/site-identity";
import { installPageHtml } from "../src/lib/install-page";

afterEach(() => vi.unstubAllEnvs());

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

  it("preserves the specific reading, date and 3D fragment in a safe return link", async () => {
    for (const path of ["/dia/2026-10-31", "/joao/3/16", "/arcos#salmos/34/4"]) {
      const response = GET(new Request(`${INSTALL_URL}?next=${encodeURIComponent(path)}`));
      expect(response.headers.get("cache-control")).toContain("no-store");
      const html = await response.text();
      expect(html).toContain(`id="continue-reading" class="button" href="${SITE_URL}${path}"`);
      expect(html).toContain("Android");
      expect(html).toContain("Safari");
      expect(html).not.toContain("apple-itunes-app");
    }
  });

  it.each(["https://evil.test", "//evil.test", "/api/jornada", '/joao/3/16\" onclick=\"alert(1)'])
    ("does not reflect unsafe installation destination %s", (path) => {
      const html = installPageHtml(path);
      expect(html).toContain(`id="continue-reading" class="button" href="${SITE_URL}/"`);
      expect(html).not.toContain("onclick=");
    });

  it("shows live stores and contextual Smart App Banner only after a platform is released", async () => {
    vi.stubEnv("IOS_APP_AVAILABLE", "true");
    vi.stubEnv("IOS_APP_STORE_URL", "https://apps.apple.com/br/app/biblia-conectada/id123456789");
    vi.stubEnv("ANDROID_APP_AVAILABLE", "false");
    const html = await GET(new Request(`${INSTALL_URL}?next=%2Fdia%2F2026-10-31`)).text();
    expect(html).toContain(`name="apple-itunes-app" content="app-id=123456789, app-argument=${SITE_URL}/dia/2026-10-31"`);
    expect(html).toContain("Instalar pela App Store");
    expect(html).not.toContain("Instalar pelo Google Play");
    expect(html).not.toContain("location.href=");
    expect(html).not.toContain("location.replace");
  });
});
