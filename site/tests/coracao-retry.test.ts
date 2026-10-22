import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import { HeartConversation } from "@/components/coracao/HeartConversation";
import type { CoracaoRequest } from "@/lib/coracao/types";

// Exercise the component's real event handlers and fetch contract without a DOM dependency.
// Effects (availability and scroll geometry) are outside this retry-focused harness.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useId: () => "retry-test",
  useEffect: () => {},
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = initial;
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === "function" ? value(hooks.values[index]) : value;
    }];
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = { current: initial };
    return hooks.values[index];
  },
}));
vi.mock("@/components/assistant/use-study-voice", () => ({
  useStudyVoice: () => ({ available: false, stop() {}, receive() {}, setAvailable() {} }),
}));

type Node = ReactElement<Record<string, unknown>>;
let tree: Node;
let timerId = 0;
const timers = new Map<number, () => void>();
const question = "Alguém me xingou no WhatsApp";
function render() { hooks.cursor = 0; tree = HeartConversation(); }
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join("");
  if (isValidElement<Record<string, unknown>>(value)) return text(value.props.children);
  return typeof value === "string" ? value : "";
}
function find(predicate: (node: Node) => boolean) {
  const found = nodes(tree).find(predicate);
  if (!found) throw new Error("Expected rendered control was absent");
  return found;
}
function event(node: Node, name: string, argument?: unknown) {
  (node.props[name] as (event?: unknown) => void)(argument);
}
function submitSameQuestion() {
  event(find((node) => node.type === "textarea"), "onChange", { target: { value: question } });
  render();
  event(find((node) => node.type === "form"), "onSubmit", { preventDefault() {} });
}
async function flush() { await new Promise<void>((resolve) => setImmediate(resolve)); render(); }
function failureResponse(code = "provider", status = 502) {
  return new Response(JSON.stringify({ ok: false, code, message: "A resposta não foi concluída." }), { status });
}
beforeEach(() => {
  hooks.values = []; hooks.cursor = 0; timers.clear(); timerId = 0;
  vi.stubGlobal("window", {
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
  });
  render();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("heart conversation retries", () => {
  it.each(["button", "typed"] as const)("starts a new UUID after a received 502 using %s, only after explicit action", async (action) => {
    const fetcher = vi.fn().mockImplementation(async () => failureResponse());
    vi.stubGlobal("fetch", fetcher);
    submitSameQuestion(); await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(text(tree)).toContain("Uma nova tentativa contará como outra consulta no limite de uso.");
    const retry = find((node) => node.type === "button" && text(node) === "Tentar nova resposta");
    if (action === "button") event(retry, "onClick"); else submitSameQuestion();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const requests = fetcher.mock.calls.map(([, init]) => JSON.parse(init.body) as CoracaoRequest);
    expect(requests[1]).toEqual({ ...requests[0], requestId: expect.any(String) });
    expect(requests[1].requestId).not.toBe(requests[0].requestId);
  });

  it.each([
    ["network", "button"], ["network", "typed"],
    ["timeout", "button"], ["timeout", "typed"],
    ["cancel", "button"], ["cancel", "typed"],
  ] as const)("keeps the UUID after ambiguous %s using %s without an automatic POST", async (failure, action) => {
    const fetcher = vi.fn().mockImplementationOnce((_url, init: RequestInit) => failure === "network"
      ? Promise.reject(new TypeError("Network unavailable"))
      : new Promise((_resolve, reject) => init.signal!.addEventListener("abort", () => reject(new Error("Aborted")), { once: true })))
      .mockImplementation(async () => failureResponse());
    vi.stubGlobal("fetch", fetcher);
    submitSameQuestion();
    if (failure === "timeout") [...timers.values()][0]();
    if (failure === "cancel") { render(); event(find((node) => node.props["aria-label"] === "Interromper espera"), "onClick"); }
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(text(tree)).not.toContain("Uma nova tentativa contará");
    const retry = find((node) => node.type === "button" && text(node) === "Tentar novamente");
    if (action === "button") event(retry, "onClick"); else submitSameQuestion();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const requests = fetcher.mock.calls.map(([, init]) => JSON.parse(init.body) as CoracaoRequest);
    expect(requests[1]).toEqual(requests[0]);
  });

  it("keeps the duplicate-response warning and starts a new UUID only on its explicit button", async () => {
    const fetcher = vi.fn().mockImplementation(async () => failureResponse("in_progress", 409));
    vi.stubGlobal("fetch", fetcher);
    submitSameQuestion(); await flush();
    expect(text(tree)).toContain("Iniciar outra contará novamente no limite de uso.");
    submitSameQuestion(); await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    event(find((node) => node.type === "button" && text(node) === "Iniciar nova consulta"), "onClick");
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const requests = fetcher.mock.calls.map(([, init]) => JSON.parse(init.body) as CoracaoRequest);
    expect(requests[1].requestId).not.toBe(requests[0].requestId);
  });
});
