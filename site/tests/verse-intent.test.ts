import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VERSE_INTENT_SCRIPT } from "../src/components/assistant/verse-intent-script";

function fixture(dialog = true) {
  const events = new Map<string, Set<(event?: unknown) => void>>();
  const on = (name: string, fn: (event?: unknown) => void) => {
    if (!events.has(name)) events.set(name, new Set());
    events.get(name)!.add(fn);
  };
  const off = (name: string, fn: (event?: unknown) => void) => events.get(name)?.delete(fn);
  class Link {
    dataset: Record<string, string> = { shareRef: "joao/3/16" };
    href = "/og?path=/joao/3/16";
    target = "";
    download = false;
    isConnected = true;
    focus = vi.fn();
    click = vi.fn();
    closest(selector: string) { return selector === "a[href]" ? this : null; }
    hasAttribute() { return this.download; }
  }
  class Cancel extends Link {
    closest(selector: string) { return selector === "#verse-intent-feedback button" ? this : null; }
  }
  const fallback = { href: "", hidden: true };
  const box = { hidden: true, children: [{ hidden: false }, { hidden: true }], querySelector: () => fallback };
  const win: { __bcVerse?: { load?: () => void; start: () => void; ready: () => void; fail: () => void }; addEventListener: typeof on; removeEventListener: typeof off } = { addEventListener: on, removeEventListener: off };
  runInNewContext(VERSE_INTENT_SCRIPT, { window: win, document: { getElementById: () => box, addEventListener: on, removeEventListener: off }, Element: Link, HTMLDialogElement: dialog ? { prototype: { showModal() {} } } : undefined, setTimeout, clearTimeout });
  const emit = (name: string, event?: unknown) => [...(events.get(name) ?? [])].forEach(fn => fn(event));
  const click = (target = new Link(), extra = {}) => {
    const event = { target, button: 0, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...extra };
    emit("click", event); return event;
  };
  return { Link, Cancel, box, fallback, win, emit, click, events };
}

afterEach(() => vi.useRealTimers());

describe("verse intention before hydration", () => {
  it("keeps a visible early click on the page and hands it off exactly once", () => {
    const f = fixture(), opener = new f.Link();
    const e = f.click(opener);
    expect(e.preventDefault).toHaveBeenCalledOnce();
    expect(f.box.hidden).toBe(false);
    expect(f.fallback.hidden).toBe(true);
    const ready = f.win.__bcVerse!.ready;
    ready(); ready();
    expect(opener.click).toHaveBeenCalledOnce();
    expect(f.box.hidden).toBe(true);
    expect(f.win.__bcVerse).toBeUndefined();
    expect(f.events.get("click")?.size).toBe(0);
  });

  it("starts on hydration, only loads once, and delivers the latest intention", () => {
    const f = fixture(), first = new f.Link(), second = new f.Link();
    second.dataset = { studyRef: "salmos/34/4" };
    f.click(first);
    const load = vi.fn(); f.win.__bcVerse!.load = load; f.win.__bcVerse!.start();
    f.click(second); f.win.__bcVerse!.start();
    expect(load).toHaveBeenCalledOnce();
    f.win.__bcVerse!.ready();
    expect(first.click).not.toHaveBeenCalled();
    expect(second.click).toHaveBeenCalledOnce();
  });

  it("bounds loading at eight seconds with an explicit original fallback, never navigation", () => {
    vi.useFakeTimers(); const f = fixture(), opener = new f.Link();
    f.click(opener); vi.advanceTimersByTime(7999);
    expect(f.fallback.hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(f.box.children[0].hidden).toBe(true);
    expect(f.box.children[1].hidden).toBe(false);
    expect(f.fallback).toEqual({ href: opener.href, hidden: false });
    expect(opener.click).not.toHaveBeenCalled();
    const key = { key: "Escape", preventDefault: vi.fn(), stopPropagation: vi.fn() };
    f.emit("keydown", key); f.win.__bcVerse!.ready();
    expect(key.preventDefault).toHaveBeenCalledOnce();
    expect(key.stopPropagation).toHaveBeenCalledOnce();
    expect(opener.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(opener.click).not.toHaveBeenCalled();
  });

  it("exposes a rejected import and lets the close button cancel it", () => {
    const f = fixture(), opener = new f.Link(); f.click(opener); f.win.__bcVerse!.fail();
    expect(f.fallback.hidden).toBe(false);
    f.click(new f.Cancel()); f.win.__bcVerse!.ready();
    expect(f.box.hidden).toBe(true);
    expect(opener.click).not.toHaveBeenCalled();
    expect(opener.focus).toHaveBeenCalledOnce();
  });

  it.each(["link", "popstate", "pagehide"])("cancels stale intent after %s", (event) => {
    const f = fixture(), opener = new f.Link(); f.click(opener);
    if (event === "link") { const other = new f.Link(); other.dataset = {}; f.click(other); }
    else f.emit(event);
    f.win.__bcVerse!.ready(); expect(opener.click).not.toHaveBeenCalled();
  });

  it("does not intercept browser gestures or invalid references", () => {
    const f = fixture();
    for (const extra of [{ button: 1 }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { defaultPrevented: true }]) expect(f.click(new f.Link(), extra).preventDefault).not.toHaveBeenCalled();
    const download = new f.Link(); download.download = true;
    const blank = new f.Link(); blank.target = "_blank";
    const invalid = new f.Link(); invalid.dataset = { shareRef: "../3/16" };
    for (const link of [download, blank, invalid]) expect(f.click(link).preventDefault).not.toHaveBeenCalled();
    expect(f.box.hidden).toBe(true);
  });

  it("does not revive a removed link or intercept on browsers without native dialogs", () => {
    const f = fixture(), opener = new f.Link(); f.click(opener); opener.isConnected = false;
    f.win.__bcVerse!.ready(); expect(opener.click).not.toHaveBeenCalled();
    const unsupported = fixture(false); expect(unsupported.win.__bcVerse).toBeUndefined();
    expect(unsupported.click().preventDefault).not.toHaveBeenCalled();
  });
});
