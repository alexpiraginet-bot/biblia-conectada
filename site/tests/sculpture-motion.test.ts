import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SculptureEngine, type EngineEvents } from "../src/components/sculpture/engine";
import { SculptureRenderer, type ArcBuffers, type Lit } from "../src/components/sculpture/renderer";

const arcs: ArcBuffers = { n: 1, geo: new Float32Array([-0.5, 0.5, 1, 1]), color: new Float32Array([1, 1, 1, 1]), votes: new Int16Array([100]) };
const lit: Lit = { n: 1, geo: arcs.geo, flags: new Float32Array([0, 1, 0, 0]), at: -0.5 };

let engine: SculptureEngine;
let renderer: ReturnType<typeof fakeRenderer>;
let media: EventTarget & { matches: boolean };
let doc: EventTarget & { hidden: boolean };
let canvas: HTMLCanvasElement;
let intersection: (entries: { isIntersecting: boolean }[]) => void;
let rafs: Map<number, FrameRequestCallback>;
let events: EngineEvents;
let now: number;

function fakeRenderer() {
  return {
    contextLost: false, flowTime: -1, pulse: -1, grow: 1, recede: 1, mark: null,
    setArcs: vi.fn(), setLit: vi.fn(), setFocus: vi.fn(), draw: vi.fn(),
    resize: vi.fn(), destroy: vi.fn(), markLost: vi.fn(),
  };
}

function frame(ms = 34) {
  now += ms;
  vi.advanceTimersByTime(ms);
  const queued = [...rafs.values()];
  rafs.clear();
  queued.forEach((callback) => callback(now));
}

beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  rafs = new Map();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { rafs.set(++id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (n: number) => rafs.delete(n));
  media = Object.assign(new EventTarget(), { matches: false });
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", {
    devicePixelRatio: 1, matchMedia: () => media,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout,
  });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersection) { intersection = callback; }
    observe() {}
    disconnect() {}
  });
  canvas = Object.assign(new EventTarget(), {
    width: 800, height: 600, style: {},
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600 }),
  }) as unknown as HTMLCanvasElement;
  renderer = fakeRenderer();
  renderer.markLost.mockImplementation(() => { renderer.contextLost = true; });
  vi.spyOn(SculptureRenderer, "create").mockReturnValue({ r: renderer as unknown as SculptureRenderer, software: false });
  events = { hover: vi.fn(), hoverArc: vi.fn(), pickArc: vi.fn(), pick: vi.fn(), miss: vi.fn(), frame: vi.fn(), lost: vi.fn() };
  engine = SculptureEngine.create(canvas, events)!;
  engine.setArcs(arcs);
  frame();
});

afterEach(() => {
  engine.destroy();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("sculpture pulse lifecycle", () => {
  it("moves light at rest without moving the camera, downgrading quality or updating DOM labels", () => {
    expect(engine.still).toBe(true);
    const position = engine.matrix();
    const first = renderer.flowTime;
    for (let i = 0; i < 12; i++) frame();
    expect(renderer.flowTime).toBeGreaterThan(first);
    expect(renderer.draw.mock.calls.every((call) => call[4] === "settled")).toBe(true);
    expect(events.frame).toHaveBeenCalledTimes(1);
    expect(engine.matrix()).toEqual(position);
    expect(engine.still).toBe(true);
  });

  it("cancels all scheduled frames when hidden or offscreen and resumes without a clock jump", () => {
    frame();
    const before = renderer.flowTime;
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(rafs.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    engine.setArcs(arcs);
    frame(10_000);
    expect(renderer.flowTime).toBe(before);
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    frame();
    expect(renderer.flowTime).toBe(before);
    intersection([{ isIntersecting: false }]);
    expect(rafs.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    intersection([{ isIntersecting: true }]);
    frame();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("responds to reduced motion changing at runtime and keeps the selected passage fully lit", () => {
    engine.setLit(lit);
    frame(150);
    expect(renderer.grow).toBeLessThan(1);
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    frame();
    expect(renderer.grow).toBe(1);
    expect(renderer.flowTime).toBe(-1);
    expect(renderer.pulse).toBe(-1);
    expect(rafs.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    frame();
    expect(renderer.flowTime).toBeGreaterThanOrEqual(0);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("keeps a manual pause when system motion changes, and resumes only when unpaused", () => {
    engine.setMotionPaused(true);
    frame();
    expect(vi.getTimerCount()).toBe(0);
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    frame();
    expect(renderer.flowTime).toBe(-1);
    expect(vi.getTimerCount()).toBe(0);
    engine.setMotionPaused(false);
    frame();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("does not pulse unrelated arcs or keep an idle timer when a real selection has no links", () => {
    engine.setLit({ n: 0, geo: new Float32Array(), flags: new Float32Array(), at: null });
    frame();
    expect(renderer.flowTime).toBe(-1);
    expect(renderer.grow).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    engine.setLit(null);
    frame();
    expect(renderer.flowTime).toBeGreaterThanOrEqual(0);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("stops immediately on context loss and after destruction", () => {
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    expect(events.lost).toHaveBeenCalledWith(true);
    expect(rafs.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    engine.destroy();
    doc.dispatchEvent(new Event("visibilitychange"));
    media.dispatchEvent(new Event("change"));
    expect(rafs.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
