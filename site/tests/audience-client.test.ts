import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { googleMeasurementConfig } from "../src/lib/audience/google-config";

const source = readFileSync(new URL("../public/audience-v2.js", import.meta.url), "utf8");
const config = { enabled: true, googleEnabled: true, bookSlugs: ["joao"], measurementId: "G-TEST123456", adsId: "AW-123456789", adsConversionLabel: "TestConversionLabel" };
type Options = { preference?: string; path?: string; query?: string; dnt?: string; gpc?: boolean; webdriver?: boolean; config?: Record<string, unknown> };

function browser(options: Options = {}) {
  const listeners = new Map<string, (event?: unknown) => void>();
  const scripts: { id: string; src: string }[] = [];
  const storage = new Map([["bc-audience-preference", options.preference ?? ""]]);
  const cookieWrites: string[] = [];
  const status = { textContent: "" };
  const prompt = { hidden: true };
  const location = { origin: "https://www.bibliaconectada.company", hostname: "www.bibliaconectada.company", pathname: options.path ?? "/liturgia", href: "", reload: vi.fn() };
  location.href = location.origin + location.pathname + (options.query ?? "?utm_source=google&utm_medium=cpc&utm_campaign=liturgy_search");
  class Button {
    constructor(readonly preference: string) {}
    closest() { return this; }
    getAttribute() { return this.preference; }
  }
  const localStorage = { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) };
  const win = { bcAudience: { ...config, ...options.config }, dataLayer: [] as ArrayLike<unknown>[], addEventListener: (name: string, cb: (event?: unknown) => void) => listeners.set(name, cb) };
  const document = {
    hidden: false, referrer: "", head: { append: (script: { id: string; src: string }) => scripts.push(script) },
    get cookie() { return "_ga=example; _ga_TEST=example; _gcl_aw=example; bc-theme=dia"; },
    set cookie(value: string) { cookieWrites.push(value); },
    createElement: () => ({ id: "", src: "", async: false }),
    getElementById: (id: string) => scripts.find(script => script.id === id),
    querySelector: (selector: string) => selector === '[data-audience-prompt]' ? prompt : status,
    addEventListener: (name: string, cb: (event?: unknown) => void) => listeners.set(name, cb),
  };
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ accepted: true }) }));
  runInNewContext(source, { window: win, document, location, localStorage, navigator: { doNotTrack: options.dnt, globalPrivacyControl: options.gpc, webdriver: options.webdriver }, crypto: webcrypto, URL, Element: Button, performance: { now: () => 0 }, setTimeout: () => 1, clearTimeout: vi.fn(), fetch });
  const calls = () => win.dataLayer.map(value => Array.from(value));
  return {
    scripts, storage, cookieWrites, status, prompt, location, fetch, calls,
    choose: (preference: string) => listeners.get("click")?.({ target: new Button(preference) }),
    navigate: (path: string) => { location.pathname = path; location.href = location.origin + path; listeners.get("bc:navigation")?.(); },
    revokeInAnotherTab: () => listeners.get("storage")?.({ key: "bc-audience-preference", newValue: "basic", storageArea: localStorage }),
  };
}
const events = (b: ReturnType<typeof browser>, name: string) => b.calls().filter(c => c[0] === "event" && c[1] === name);

describe("Google Ads consent and measurement", () => {
  it("offers an equal choice once, without loading Google or displaying it on private routes", () => {
    const b = browser(); expect(b.prompt.hidden).toBe(false); expect(b.scripts).toHaveLength(0);
    b.choose("basic"); expect(b.prompt.hidden).toBe(true); expect(b.scripts).toHaveLength(0);
    b.navigate("/ler"); expect(b.prompt.hidden).toBe(true);
    for (const options of [{ preference: "google" }, { preference: "off" }, { dnt: "1" }, { path: "/admin" }]) expect(browser(options).prompt.hidden).toBe(true);
  });
  it.each([undefined, "basic", "off"])("does not load Google before a specific opt-in (%s)", preference => {
    const b = browser({ preference });
    expect(b.scripts).toHaveLength(0); expect(b.calls()).toHaveLength(0);
  });
  it("does not extend a previous Analytics permission to Ads", () => {
    const b = browser({ preference: "google" });
    expect(b.scripts).toHaveLength(1);
    expect(events(b, "page_view")[0][2]).toMatchObject({ send_to: config.measurementId });
    expect(b.calls().filter(c => c[0] === "config").map(c => c[1])).toEqual([config.measurementId]);
    expect(events(b, "conversion")).toHaveLength(0);
    expect(b.calls().find(c => c[0] === "consent" && c[1] === "update")?.[2]).toMatchObject({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  });
  it("uses the exact Ads destination, zero revenue and sanitized context after campaign opt-in", () => {
    const b = browser({ preference: "campaigns", query: "?gclid=click-private&utm_campaign=liturgy_search&q=private-prayer#joao-3-16" });
    expect(b.calls()[0]).toEqual(["consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
    expect(events(b, "conversion")).toHaveLength(1);
    expect(events(b, "conversion")[0][2]).toMatchObject({ send_to: config.adsId + "/" + config.adsConversionLabel, value: 0, currency: "BRL", page_location: locationOrigin() + "/area/liturgy", page_referrer: "" });
    expect(JSON.stringify(b.calls())).not.toMatch(/private-prayer|click-private|joao-3-16/);
    expect(b.calls().filter(c => c[0] === "consent").every(c => (c[2] as Record<string, string>).ad_personalization === "denied")).toBe(true);
  });
  it("handles upgrading Analytics consent without duplicating a page view or conversion", () => {
    const b = browser({ preference: "google" }); b.choose("campaigns"); b.choose("campaigns");
    expect(events(b, "page_view")).toHaveLength(1); expect(events(b, "conversion")).toHaveLength(1);
    b.navigate("/ler"); expect(events(b, "conversion")).toHaveLength(1); expect(b.scripts).toHaveLength(1);
  });
  it.each(["/coracao", "/buscar", "/jornada", "/admin"])("does not configure Ads or send a conversion on %s", path => {
    const b = browser({ preference: "campaigns", path });
    expect(b.calls().some(c => c[0] === "config" && c[1] === config.adsId)).toBe(false);
    expect(events(b, "conversion")).toHaveLength(0);
  });
  it("does not turn an organic visit into an Ads conversion", () => {
    const b = browser({ preference: "campaigns", query: "" }); expect(events(b, "conversion")).toHaveLength(0);
  });
  it("never sends preview or local development traffic to Google", () => {
    const b = browser({ preference: "campaigns", config: { googleEnabled: false } });
    expect(b.scripts).toHaveLength(0); expect(b.calls()).toHaveLength(0); expect(b.prompt.hidden).toBe(true);
  });
  it.each([{ dnt: "1" }, { gpc: true }, { webdriver: true }])("respects browser privacy and excludes automation %j", flags => {
    const b = browser({ preference: "campaigns", ...flags }); b.choose("campaigns");
    expect(b.scripts).toHaveLength(0); expect(b.fetch).not.toHaveBeenCalled(); expect(b.calls()).toHaveLength(0);
  });
  it("revokes cookies and reloads to stop the already-loaded library", () => {
    const b = browser({ preference: "campaigns" }); b.choose("basic");
    expect(b.storage.get("bc-audience-preference")).toBe("basic");
    expect(b.location.reload).toHaveBeenCalledOnce();
    expect(b.cookieWrites.some(c => c.startsWith("_gcl_aw=;max-age=0"))).toBe(true);
    expect(b.cookieWrites.some(c => c.startsWith("_ga=;max-age=0"))).toBe(true);
    expect(b.cookieWrites.some(c => c.startsWith("bc-theme"))).toBe(false);
    expect(b.calls().at(-1)).toEqual(["consent", "update", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }]);
  });
  it("respects revocation from another tab", () => {
    const b = browser({ preference: "campaigns" }); b.revokeInAnotherTab(); expect(b.location.reload).toHaveBeenCalledOnce();
  });
  it("validates only public identifiers before serializing configuration", () => {
    expect(googleMeasurementConfig({ NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: "</script>", NEXT_PUBLIC_GOOGLE_ADS_ID: "AW-bad", NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: "bad<script>" })).toEqual({ measurementId: null, adsId: null, adsConversionLabel: null });
    expect(googleMeasurementConfig({ NEXT_PUBLIC_GOOGLE_ANALYTICS_ID: config.measurementId, NEXT_PUBLIC_GOOGLE_ADS_ID: config.adsId, NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: config.adsConversionLabel, PRIVATE_TOKEN: "never-public" })).toEqual({ measurementId: config.measurementId, adsId: config.adsId, adsConversionLabel: config.adsConversionLabel });
  });
});
function locationOrigin() { return "https://www.bibliaconectada.company"; }
