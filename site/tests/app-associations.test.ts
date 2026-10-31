import { afterEach, describe, expect, it, vi } from "vitest";
import books from "../src/data/generated/books.json";
import { androidAppAssociation, appleAppAssociation, nativeLinkComponents, NATIVE_CONTENT_PATHS } from "../src/lib/app-associations";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
import { GET as getApple } from "../src/app/.well-known/apple-app-site-association/route";
import { GET as getAndroid } from "../src/app/.well-known/assetlinks.json/route";

// Test identities only; no production identifier is shipped or inferred from these fixtures.
const ios = { IOS_UNIVERSAL_LINKS_ENABLED: "true", IOS_APPLICATION_ID: "ABCDE12345.org.test.reader" };
const fingerprint = Array.from({ length: 32 }, (_, n) => n.toString(16).padStart(2, "0")).join(":").toUpperCase();
const android = { ANDROID_APP_LINKS_ENABLED: "true", ANDROID_APPLICATION_ID: "org.test.reader", ANDROID_SIGNING_SHA256: fingerprint };

/** Exercise the documented first-match path glob contract, independently of OS/app UI. */
function opensNative(url: string): boolean {
  const path = new URL(url, "https://www.bibliaconectada.company").pathname;
  const rule = nativeLinkComponents().find((component) => {
    const glob = component["/"].split("*").map((part) => part.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")).join(".*");
    return new RegExp("^" + glob + "$").test(path);
  });
  return rule !== undefined && !rule.exclude;
}

afterEach(() => vi.unstubAllEnvs());

describe("app identity association switches", () => {
  it("ships no guessed app identities and treats missing switches as disabled", () => {
    expect(appleAppAssociation({})).toEqual({ applinks: { apps: [], details: [] } });
    expect(androidAppAssociation({})).toEqual([]);
    expect(appleAppAssociation({ IOS_APPLICATION_ID: ios.IOS_APPLICATION_ID }).applinks.details).toEqual([]);
    expect(androidAppAssociation({ ...android, ANDROID_APP_LINKS_ENABLED: undefined })).toEqual([]);
  });

  it.each(["false", "TRUE", "1", " true", ""])("%s does not enable either platform", (flag) => {
    expect(appleAppAssociation({ ...ios, IOS_UNIVERSAL_LINKS_ENABLED: flag }).applinks.details).toEqual([]);
    expect(androidAppAssociation({ ...android, ANDROID_APP_LINKS_ENABLED: flag })).toEqual([]);
  });

  it("enables platforms independently and publishes the supplied configured identities", () => {
    const onlyApple = { ...ios, ANDROID_APP_LINKS_ENABLED: "false" };
    expect(appleAppAssociation(onlyApple).applinks.details[0].appIDs).toEqual([ios.IOS_APPLICATION_ID]);
    expect(androidAppAssociation(onlyApple)).toEqual([]);
    expect(appleAppAssociation(android).applinks.details).toEqual([]);
    expect(androidAppAssociation(android)[0].target).toEqual({
      namespace: "android_app", package_name: android.ANDROID_APPLICATION_ID, sha256_cert_fingerprints: [fingerprint],
    });
  });

  it.each([undefined, "1234567890", "org.test.reader", "TEAM.org.test.reader", "ABCDE12345.org.test/*", "ABCDE12345.org.test.reader ", "ABCDE12345.org.test\nreader"])("rejects invalid Apple identity %s", (value) => {
    expect(appleAppAssociation({ ...ios, IOS_APPLICATION_ID: value }).applinks.details).toEqual([]);
  });

  it.each([undefined, "reader", "org.test/reader", "org.1reader", " org.test.reader", "org.test.*"])("rejects invalid Android package %s", (value) => {
    expect(androidAppAssociation({ ...android, ANDROID_APPLICATION_ID: value })).toEqual([]);
  });

  it.each([undefined, "", "not-a-certificate", fingerprint.replaceAll(":", ""), fingerprint + ",", fingerprint + ",invalid", Array(11).fill(fingerprint).join(",")])("fails closed for malformed signing fingerprints", (value) => {
    expect(androidAppAssociation({ ...android, ANDROID_SIGNING_SHA256: value })).toEqual([]);
  });

  it("accepts multiple signing certificates for a verified rotation and normalizes duplicates", () => {
    const second = fingerprint.split(":").reverse().join(":");
    const output = androidAppAssociation({ ...android, ANDROID_SIGNING_SHA256: " " + fingerprint.toLowerCase() + ", " + second + "," + fingerprint });
    expect(output[0].target.sha256_cert_fingerprints).toEqual([fingerprint, second]);
  });
});

describe("public-content routing contract", () => {
  it.each([
    "/", "/liturgia", "/dia/2026-10-31", "/joao/3/16", "/salmos/22/6",
    "/ler/open-nbv/3-joao/1/15", "/interlinear/salmos/22/6",
    "/arcos#salmos/34/4", "/arcos/plano#joao/3/16", "/explorar/isaias/9/lucas/2",
    "/conexao/isaias-9/lucas-2", "/cronologia", "/caminhos", "/linha-do-tempo/423-lucas-10-25-37",
    "/tema/luz", "/palavra/luz", "/trilha/antes-do-natal/3", "/coracao", "/buscar?q=paz",
  ])("associates public paths without restricting query or fragment: %s", (url) => {
    expect(opensNative(url)).toBe(true);
  });

  it.each([
    "/api", "/api/coracao", "/api/jornada", "/_next/static/app.js", "/.well-known/assetlinks.json",
    "/instalar", "/instalar?next=/joao/3/16", "/og?book=joao", "/files/image.png", "/data/books.json",
    "/dados", "/dados/v1/books.json", "/admin", "/admin/settings", "/salvos", "/jornada", "/mesa",
    "/private", "/config", "/unknown", "/ler/unknown", "/manifest.webmanifest", "/apple-icon.png",
  ])("keeps infrastructure, local/private state and unknown routes on the web: %s", (url) => {
    expect(opensNative(url)).toBe(false);
  });

  it("covers every canonical book in both reading editions without an unrestricted allow rule", () => {
    for (const book of books) {
      expect(opensNative("/" + book.slug + "/1/1")).toBe(true);
      expect(opensNative("/ler/open-nbv/" + book.slug + "/1/1")).toBe(true);
    }
    expect(new Set(NATIVE_CONTENT_PATHS).size).toBe(NATIVE_CONTENT_PATHS.length);
    expect(NATIVE_CONTENT_PATHS).not.toContain("*");
    expect(NATIVE_CONTENT_PATHS).not.toContain("/*");
    expect(nativeLinkComponents().at(-1)).toEqual({ "/": "*", exclude: true });
  });

  it("publishes matching Apple and Android 15 rule sets within the Apple size limit", () => {
    const apple = appleAppAssociation(ios);
    const androidRules = androidAppAssociation(android)[0].relation_extensions["delegate_permission/common.handle_all_urls"].dynamic_app_link_components;
    expect(apple.applinks.details[0].components).toEqual(androidRules);
    expect(Buffer.byteLength(JSON.stringify(apple))).toBeLessThan(128 * 1024);
  });
});

describe("well-known HTTP responses", () => {
  it("returns JSON without redirects, caching, cookies or fictitious association while disabled", async () => {
    vi.stubEnv("IOS_UNIVERSAL_LINKS_ENABLED", "false");
    vi.stubEnv("ANDROID_APP_LINKS_ENABLED", "false");
    for (const get of [getApple, getAndroid]) {
      const response = await get();
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("application/json");
      expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.has("Location")).toBe(false);
      expect(response.headers.has("Set-Cookie")).toBe(false);
    }
    expect(await (await getApple()).json()).toEqual({ applinks: { apps: [], details: [] } });
    expect(await (await getAndroid()).json()).toEqual([]);
  });

  it("reads configuration at request time and keeps flags reversible", async () => {
    for (const [key, value] of Object.entries({ ...ios, ...android })) vi.stubEnv(key, value);
    expect(await (await getApple()).json()).toEqual(appleAppAssociation(ios));
    expect(await (await getAndroid()).json()).toEqual(androidAppAssociation(android));
    vi.stubEnv("IOS_UNIVERSAL_LINKS_ENABLED", "false");
    vi.stubEnv("ANDROID_APP_LINKS_ENABLED", "false");
    expect(await (await getApple()).json()).toEqual({ applinks: { apps: [], details: [] } });
    expect(await (await getAndroid()).json()).toEqual([]);
  });
});
