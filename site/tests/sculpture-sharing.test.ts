import { afterEach, describe, expect, it, vi } from "vitest";
import { hashOf, parseHash, readHash, selectionAddress, subscribeHash, writeHash } from "../src/components/sculpture/state";

afterEach(() => vi.unstubAllGlobals());

describe("shareable sky addresses", () => {
  it.each([
    "#joao/3/16", "#daniel/9", "#caminho/genesis/3/15/apocalipse/12/9", "#palavra/miseric%C3%B3rdia",
  ])("round trips %s in both the crawler-visible query and legacy fragment", (hash) => {
    const selection = parseHash(hash);
    expect(selection).not.toBeNull();
    const address = new URL(selectionAddress("https://example.com/arcos?utm_source=amigo&v=Daniel+9", selection), "https://example.com");
    expect(address.searchParams.get("ref")).toBe(hashOf(selection).slice(1));
    expect(parseHash(address.searchParams.get("ref")!)).toEqual(selection);
    expect(parseHash(address.hash)).toEqual(selection);
    expect(address.searchParams.get("utm_source")).toBe("amigo");
    expect(address.searchParams.has("v")).toBe(false);
  });

  it("clears all selection forms when returning to the whole Bible", () => {
    const address = selectionAddress("https://example.com/arcos?ref=joao/3/16&v=Daniel+9&utm_source=amigo#joao/3/16", null);
    expect(address).toBe("/arcos?utm_source=amigo");
  });

  it.each([
    ["?ref=joao%2F3%2F16", "#joao/3/16"],
    ["?ref=daniel%2F999", ""],
    ["?ref=joao%2F3%2F16&ref=daniel%2F9", ""],
  ])("validates the initial query %s", (search, expected) => {
    vi.stubGlobal("window", { location: { hash: "", search } });
    expect(readHash()).toBe(expected);
  });

  it("keeps legacy fragment links authoritative when one is present", () => {
    vi.stubGlobal("window", { location: { hash: "#daniel/9", search: "?ref=joao%2F3%2F16" } });
    expect(readHash()).toBe("#daniel/9");
  });

  it("preserves router state, synchronizes old links and releases navigation listeners", () => {
    const target = new EventTarget();
    const location = new URL("https://example.com/arcos#daniel/9");
    const routerState = { __NA: true, tree: "retained" };
    const replaceState = vi.fn((state, _title, address) => { expect(state).toBe(routerState); location.href = new URL(address, location).href; });
    vi.stubGlobal("window", Object.assign(target, { location, history: { state: routerState, replaceState } }));
    const changed = vi.fn();
    const unsubscribe = subscribeHash(changed);
    target.dispatchEvent(new Event("hashchange"));
    expect(location.searchParams.get("ref")).toBe("daniel/9");
    expect(changed).toHaveBeenCalledTimes(1);
    writeHash(parseHash("#joao/3/16"));
    expect(location.searchParams.get("ref")).toBe("joao/3/16");
    location.href = "https://example.com/arcos?ref=daniel%2F9";
    target.dispatchEvent(new Event("popstate"));
    expect(readHash()).toBe("#daniel/9");
    location.href = "https://example.com/joao/3#joao/3/16";
    replaceState.mockClear();
    changed.mockClear();
    target.dispatchEvent(new Event("popstate"));
    target.dispatchEvent(new Event("hashchange"));
    expect(replaceState).not.toHaveBeenCalled();
    expect(location.href).toBe("https://example.com/joao/3#joao/3/16");
    expect(changed).not.toHaveBeenCalled();
    unsubscribe();
    changed.mockClear();
    target.dispatchEvent(new Event("popstate"));
    expect(changed).not.toHaveBeenCalled();
  });
});
