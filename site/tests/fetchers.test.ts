// The browser's loading of the public data files (src/lib/community/fetchers.ts): each file fetched once, a failure
// forgotten so the next call asks again, and a file that never answers given up after DATA_TIMEOUT_MS instead of
// holding the page (the endless list of a verse waits on every file of its next section).
import { afterEach, describe, expect, it, vi } from "vitest";
import { DATA_TIMEOUT_MS, loadChapterText, loadVerseLinks } from "../src/lib/community/fetchers";

const json = (v: unknown) => new Response(JSON.stringify(v), { status: 200, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("public data files in the browser", () => {
  it("fetches a file once and shares it between callers", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      return json([[1, 2]]);
    });
    const [a, b] = await Promise.all([loadVerseLinks("rute", 1), loadVerseLinks("rute", 1)]);
    expect(a).toEqual([[1, 2]]);
    expect(b).toBe(a);
    expect(calls).toEqual(["/data/verse-links/rute/1.json"]);
  });

  it("forgets a failed file, so the next call asks again", async () => {
    let n = 0;
    vi.stubGlobal("fetch", async () => (++n === 1 ? new Response("", { status: 502 }) : json(["Então Rute disse"])));
    await expect(loadChapterText("rute", 2)).rejects.toThrow("/data/text/rute/2.json: 502");
    await expect(loadChapterText("rute", 2)).resolves.toEqual(["Então Rute disse"]);
    expect(n).toBe(2);
  });

  it("gives up a file that never answers, and fetches it again on the next call", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
      calls.push(url);
      if (calls.length > 1) return Promise.resolve(json(["No princípio criou Deus os céus e a terra."]));
      // a stalled request: no answer until its signal gives up
      return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
    });
    const stalled = loadChapterText("genesis", 1);
    const failed = expect(stalled).rejects.toThrow(`no answer in ${DATA_TIMEOUT_MS} ms`);
    await vi.advanceTimersByTimeAsync(DATA_TIMEOUT_MS - 1);
    expect(calls).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await failed;
    await expect(loadChapterText("genesis", 1)).resolves.toEqual(["No princípio criou Deus os céus e a terra."]);
    expect(calls).toEqual(["/data/text/genesis/1.json", "/data/text/genesis/1.json"]);
  });
});
