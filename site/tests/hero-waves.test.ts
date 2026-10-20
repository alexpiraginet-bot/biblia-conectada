import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHeroWaves, WebGLShader } from "../src/components/ui/web-gl-shader";

let media: EventTarget & { matches: boolean };
let doc: EventTarget & { hidden: boolean };
let intersection: (entries: { isIntersecting: boolean }[]) => void;
let resize: () => void;
let rafs: Map<number, FrameRequestCallback>;
let now: number;
let rect: { width: number; height: number };
let control: ReturnType<typeof createHeroWaves>;

function fakeGL() {
  return {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4, RENDERER: 5, TRIANGLES: 6,
    getExtension: vi.fn(() => null), getParameter: vi.fn(() => "NVIDIA GeForce"),
    createShader: vi.fn(() => ({})), shaderSource: vi.fn(), compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true), createProgram: vi.fn(() => ({})), attachShader: vi.fn(),
    linkProgram: vi.fn(), getProgramParameter: vi.fn(() => true), createVertexArray: vi.fn(() => ({})),
    getUniformLocation: vi.fn(() => ({})), useProgram: vi.fn(), bindVertexArray: vi.fn(), viewport: vi.fn(),
    uniform2f: vi.fn(), uniform1f: vi.fn(), drawArrays: vi.fn(), deleteShader: vi.fn(),
    deleteProgram: vi.fn(), deleteVertexArray: vi.fn(),
  };
}

function makeCanvas(gl: ReturnType<typeof fakeGL> | null) {
  return Object.assign(new EventTarget(), {
    width: 300, height: 150, dataset: {}, getContext: vi.fn(() => gl),
    getBoundingClientRect: () => rect,
  }) as unknown as HTMLCanvasElement;
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
  now = 0; rect = { width: 1200, height: 480 }; control = null;
  rafs = new Map();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { rafs.set(++id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (n: number) => rafs.delete(n));
  media = Object.assign(new EventTarget(), { matches: false });
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", { devicePixelRatio: 3, matchMedia: () => media,
    setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersection) { intersection = callback; }
    observe() {} disconnect() {}
  });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: typeof resize) { resize = callback; }
    observe() {} disconnect() {}
  });
});

afterEach(() => {
  control?.destroy();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe("hero waves lifecycle", () => {
  it("serves visible wave artwork before JavaScript without an unusable motion control", () => {
    const html = renderToStaticMarkup(createElement(WebGLShader));
    expect(html).toContain('viewBox="0 0 800 480"');
    expect(html.match(/<path /g)).toHaveLength(3);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("data-ready");
  });

  it("draws one triangle only when visible, within the raster and DPR bounds", () => {
    const gl = fakeGL(), canvas = makeCanvas(gl), state = vi.fn();
    control = createHeroWaves(canvas, state);
    expect(rafs.size).toBe(0);
    intersection([{ isIntersecting: true }]);
    frame();
    expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, 3);
    expect(canvas.width).toBe(1440);
    expect(canvas.height).toBe(576);
    expect(canvas.dataset.ready).toBe("true");
    frame(); frame();
    expect(gl.uniform1f.mock.calls.at(-1)![1]).toBeGreaterThan(0);
    expect(state).toHaveBeenCalledTimes(1); // No React state updates per frame.
    rect = { width: 375, height: 500 }; resize(); frame();
    expect(canvas.width).toBe(562);
    expect(canvas.height).toBe(750);
  });

  it("cancels timers and frames while hidden/offscreen, with no time jump on return", () => {
    const gl = fakeGL();
    control = createHeroWaves(makeCanvas(gl), vi.fn());
    intersection([{ isIntersecting: true }]); frame(); frame();
    const before = gl.uniform1f.mock.calls.at(-1)![1];
    doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange"));
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    frame(10000);
    expect(gl.uniform1f.mock.calls.at(-1)![1]).toBe(before);
    doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange")); frame();
    expect(gl.uniform1f.mock.calls.at(-1)![1]).toBe(before);
    intersection([{ isIntersecting: false }]);
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });

  it("draws one still frame for reduced motion and retains a manual pause across preference changes", () => {
    media.matches = true;
    const gl = fakeGL(), state = vi.fn();
    control = createHeroWaves(makeCanvas(gl), state);
    intersection([{ isIntersecting: true }]); frame(); frame();
    expect(gl.drawArrays).toHaveBeenCalledTimes(1);
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    expect(state).toHaveBeenLastCalledWith("reduced");
    media.matches = false; media.dispatchEvent(new Event("change")); frame();
    control!.togglePause(); frame();
    media.matches = true; media.dispatchEvent(new Event("change")); frame();
    media.matches = false; media.dispatchEvent(new Event("change")); frame();
    expect(state).toHaveBeenLastCalledWith("paused");
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    control!.togglePause(); frame();
    expect(state).toHaveBeenLastCalledWith("running");
    expect(vi.getTimerCount()).toBe(1);
  });

  it("keeps the CSS fallback without loops for unavailable/software WebGL or compile failures", () => {
    expect(createHeroWaves(makeCanvas(null), vi.fn())).toBeNull();
    const gl = fakeGL(); gl.getParameter.mockReturnValue("Google SwiftShader");
    expect(createHeroWaves(makeCanvas(gl), vi.fn())).toBeNull();
    expect(gl.createShader).not.toHaveBeenCalled();
    gl.getParameter.mockReturnValue("NVIDIA"); gl.getShaderParameter.mockReturnValue(false);
    expect(createHeroWaves(makeCanvas(gl), vi.fn())).toBeNull();
    expect(gl.deleteShader).toHaveBeenCalledTimes(1);
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });

  it("retains the server artwork if the browser refuses context creation", () => {
    const canvas = makeCanvas(null);
    vi.mocked(canvas.getContext).mockImplementation(() => { throw new Error("WebGL unavailable"); });
    const state = vi.fn();
    expect(createHeroWaves(canvas, state)).toBeNull();
    expect(canvas.dataset.ready).toBeUndefined();
    expect(state).not.toHaveBeenCalled();
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });

  it("falls back permanently on context loss and removes all work on unmount", () => {
    const gl = fakeGL(), canvas = makeCanvas(gl), state = vi.fn();
    control = createHeroWaves(canvas, state);
    intersection([{ isIntersecting: true }]); frame();
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(canvas.dataset.ready).toBeUndefined();
    expect(state).toHaveBeenLastCalledWith("fallback");
    media.matches = true; media.dispatchEvent(new Event("change"));
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(state).toHaveBeenLastCalledWith("fallback");
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
    control!.destroy();
    intersection([{ isIntersecting: true }]); resize();
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });

  it("releases shader/program/VAO allocations on normal unmount", () => {
    const gl = fakeGL();
    control = createHeroWaves(makeCanvas(gl), vi.fn());
    intersection([{ isIntersecting: true }]); frame();
    control!.destroy(); control = null;
    expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);
    expect(gl.deleteVertexArray).toHaveBeenCalledTimes(1);
    expect(rafs.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
});
