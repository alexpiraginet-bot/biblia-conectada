import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enhanceLivingStory } from "../src/components/home/living-story-player";

class ElementStub extends EventTarget {
  dataset: Record<string, string> = {};
  hidden = false;
  textContent = "";
  private attributes = new Map<string, string>();
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  hasAttribute(name: string) { return this.attributes.has(name); }
}

class VideoStub extends ElementStub {
  muted = false;
  paused = true;
  ended = false;
  readyState = 0;
  currentTime = 0;
  get src() { return this.getAttribute("src") ?? ""; }
  set src(value: string) { this.setAttribute("src", value); }
  load = vi.fn(() => { this.paused = true; this.ended = false; this.readyState = 0; this.currentTime = 0; });
  play = vi.fn((): Promise<void> => {
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event("play"));
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent(new Event("pause"));
  });
}

type Entry = { isIntersecting: boolean; intersectionRatio: number };
let intersect: (entries: Entry[]) => void;
let observer: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
let preference: EventTarget & { matches: boolean };
let documentStub: EventTarget & { hidden: boolean };
let connection: { saveData: boolean };
let destroy: (() => void) | undefined;

function setup() {
  const video = new VideoStub();
  video.dataset.src = "/living-story/story.mp4";
  const play = new ElementStub(), status = new ElementStub(), media = new ElementStub();
  const stages = [1.2, 6.6, 11.4].map((time) => {
    const button = new ElementStub();
    button.dataset.time = String(time);
    return button;
  });
  const controls = [new ElementStub(), new ElementStub()];
  controls.forEach((element) => { element.hidden = true; });
  const elements = new Map([
    ["[data-story-video]", video], ["[data-story-play]", play],
    ["[data-story-status]", status], ["[data-story-media]", media],
  ]);
  const root = Object.assign(new ElementStub(), {
    querySelector: (selector: string) => elements.get(selector) ?? null,
    querySelectorAll: (selector: string) => selector === "[data-story-stage]" ? stages : controls,
  });
  destroy = enhanceLivingStory(root as unknown as HTMLElement);
  return { root, video, play, status, media, stages, controls };
}

function visibility(ratio: number) {
  intersect([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
}
async function settled() { await Promise.resolve(); await Promise.resolve(); }
function click(element: EventTarget) { element.dispatchEvent(new Event("click")); }
function hidden(value: boolean) {
  documentStub.hidden = value;
  documentStub.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  preference = Object.assign(new EventTarget(), { matches: false });
  documentStub = Object.assign(new EventTarget(), { hidden: false });
  connection = { saveData: false };
  vi.stubGlobal("matchMedia", () => preference);
  vi.stubGlobal("document", documentStub);
  vi.stubGlobal("navigator", { connection });
  vi.stubGlobal("IntersectionObserver", class {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: typeof intersect) {
      intersect = callback;
      observer = { observe: this.observe, disconnect: this.disconnect };
    }
  });
});

afterEach(() => {
  destroy?.(); destroy = undefined;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("living story playback lifecycle", () => {
  it("leaves the poster unloaded until enough of the artwork is visible, then plays muted", async () => {
    const { video, media, controls, root, play } = setup();
    expect(observer.observe).toHaveBeenCalledWith(media);
    expect(controls.every((control) => !control.hidden)).toBe(true);
    expect(video.hasAttribute("src")).toBe(false);
    visibility(.24); await settled();
    expect(video.load).not.toHaveBeenCalled();
    visibility(.25); await settled();
    expect(video.src).toBe("/living-story/story.mp4");
    expect(video.load).toHaveBeenCalledTimes(1);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video.muted).toBe(true);
    expect(root.dataset.storyState).toBe("playing");
    expect(play.textContent).toBe("Pausar animação");
  });

  it.each(["reduced motion", "save data"])("keeps the poster for %s while allowing an explicit play", async (setting) => {
    if (setting === "reduced motion") preference.matches = true;
    else connection.saveData = true;
    const { video, play } = setup();
    visibility(1); await settled();
    expect(video.hasAttribute("src")).toBe(false);
    expect(video.play).not.toHaveBeenCalled();
    click(play); await settled();
    expect(video.load).toHaveBeenCalledTimes(1);
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video.paused).toBe(false);
  });

  it("honors an explicit play even when less than a quarter of the artwork is visible", async () => {
    const { video, play } = setup();
    visibility(.1); await settled();
    expect(video.load).not.toHaveBeenCalled();
    click(play); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video.paused).toBe(false);
    visibility(0);
    expect(video.paused).toBe(true);
  });

  it("does not download or start in a background tab and resumes when it becomes visible", async () => {
    documentStub.hidden = true;
    const { video } = setup();
    visibility(1); await settled();
    expect(video.load).not.toHaveBeenCalled();
    hidden(false); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    hidden(true);
    expect(video.paused).toBe(true);
    hidden(false); await settled();
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it("resumes after scrolling back but preserves a manual pause across scrolling and tab changes", async () => {
    const { video, play } = setup();
    visibility(1); await settled();
    video.currentTime = 3;
    visibility(0);
    expect(video.paused).toBe(true);
    visibility(1); await settled();
    expect(video.currentTime).toBe(3);
    expect(video.load).toHaveBeenCalledTimes(1);
    expect(video.play).toHaveBeenCalledTimes(2);
    click(play);
    expect(video.paused).toBe(true);
    visibility(0); visibility(1); hidden(true); hidden(false); await settled();
    expect(video.play).toHaveBeenCalledTimes(2);
    click(play); await settled();
    expect(video.play).toHaveBeenCalledTimes(3);
  });

  it("plays automatically once, then requires an explicit replay after the ending", async () => {
    const { video, play, root } = setup();
    visibility(1); await settled();
    video.currentTime = 12; video.ended = true; video.paused = true;
    video.dispatchEvent(new Event("ended"));
    expect(root.dataset.storyState).toBe("ended");
    expect(play.textContent).toBe("Rever animação");
    visibility(0); visibility(1); hidden(true); hidden(false); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    click(play); await settled();
    expect(video.currentTime).toBe(0);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it("retains usable controls when autoplay is refused and does not retry on its own", async () => {
    const { video, play, root, status } = setup();
    video.play.mockRejectedValueOnce(new DOMException("Autoplay blocked", "NotAllowedError"));
    visibility(1); await settled();
    expect(root.dataset.storyState).toBe("paused");
    expect(play.textContent).toBe("Reproduzir animação");
    expect(status.textContent).toBe("");
    visibility(0); visibility(1); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    click(play); await settled();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.paused).toBe(false);
  });

  it("shows waiting feedback and lets the user cancel a pending play without restarting it", async () => {
    const { video, play, status } = setup();
    let finish!: () => void;
    video.play.mockImplementationOnce(() => {
      video.paused = false;
      video.dispatchEvent(new Event("play"));
      return new Promise<void>((resolve) => { finish = resolve; });
    });
    visibility(1);
    expect(status.textContent).toBe("Carregando animação…");
    expect(play.textContent).toBe("Pausar animação");
    click(play);
    expect(video.paused).toBe(true);
    expect(status.textContent).toBe("");
    finish(); await settled();
    visibility(0); visibility(1); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(status.textContent).toBe("");
  });

  it("clears buffering and seeking feedback when the media becomes ready", async () => {
    const { video, status } = setup();
    visibility(1); await settled();
    video.dispatchEvent(new Event("waiting"));
    expect(status.textContent).toBe("Carregando animação…");
    video.dispatchEvent(new Event("playing"));
    expect(status.textContent).toBe("");
    video.dispatchEvent(new Event("seeking"));
    expect(status.textContent).toBe("Carregando animação…");
    video.dispatchEvent(new Event("seeked"));
    expect(status.textContent).toBe("");
    video.dispatchEvent(new Event("waiting")); hidden(true);
    expect(status.textContent).toBe("");
  });

  it("does not leave loading feedback when play resolves for an already playing video", async () => {
    const { video, play, status } = setup();
    visibility(.1); click(play); await settled();
    expect(status.textContent).toBe("");
    // A repeated HTMLMediaElement.play() can resolve without another `playing` event.
    video.play.mockResolvedValueOnce(undefined);
    visibility(.3); await settled();
    expect(video.paused).toBe(false);
    expect(status.textContent).toBe("");
  });

  it("stops when reduced motion is enabled and waits for an explicit restart", async () => {
    const { video, play } = setup();
    visibility(1); await settled();
    preference.matches = true; preference.dispatchEvent(new Event("change"));
    expect(video.paused).toBe(true);
    preference.matches = false; preference.dispatchEvent(new Event("change"));
    visibility(0); visibility(1); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    click(play); await settled();
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it("seeks to the latest requested form after metadata loads without starting playback", async () => {
    preference.matches = true;
    const { video, stages, root } = setup();
    visibility(1);
    click(stages[1]); click(stages[2]);
    expect(video.load).toHaveBeenCalledTimes(1);
    expect(video.currentTime).toBe(0);
    expect(video.play).not.toHaveBeenCalled();
    video.readyState = 1; video.dispatchEvent(new Event("loadedmetadata"));
    expect(video.currentTime).toBe(11.4);
    expect(root.dataset.storyState).toBe("paused");
    expect(stages.map((stage) => stage.getAttribute("aria-pressed"))).toEqual(["false", "false", "true"]);
    click(stages[0]);
    expect(video.currentTime).toBe(1.2);
    expect(stages.map((stage) => stage.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    visibility(0); visibility(1); await settled();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("announces a media failure and reloads only after an explicit retry", async () => {
    const { video, play, root, status } = setup();
    visibility(1); await settled();
    video.paused = true; video.dispatchEvent(new Event("error"));
    expect(root.dataset.storyState).toBe("error");
    expect(status.textContent).toContain("A animação não carregou");
    expect(play.textContent).toBe("Tentar animação novamente");
    visibility(0); visibility(1); await settled();
    expect(video.load).toHaveBeenCalledTimes(1);
    click(play); await settled();
    expect(video.load).toHaveBeenCalledTimes(2);
    expect(status.textContent).toBe("");
    expect(root.dataset.storyState).toBe("playing");
  });

  it("cleans up route listeners and prevents a pending play from reviving a removed section", async () => {
    const { video, play, stages, controls, root } = setup();
    let finishPlay!: () => void;
    video.play.mockImplementationOnce(() => {
      video.paused = false;
      return new Promise<void>((resolve) => { finishPlay = resolve; });
    });
    visibility(1);
    destroy!(); destroy = undefined;
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(controls.every((control) => control.hidden)).toBe(true);
    click(play); click(stages[2]); hidden(true); hidden(false);
    preference.matches = true; preference.dispatchEvent(new Event("change"));
    visibility(1);
    expect(video.play).toHaveBeenCalledTimes(1);
    finishPlay(); await settled();
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(0);
    expect(video.load).toHaveBeenCalledTimes(1);
    const previousState = root.dataset.storyState;
    video.dispatchEvent(new Event("error"));
    video.currentTime = 11.4; video.dispatchEvent(new Event("timeupdate"));
    expect(root.dataset.storyState).toBe(previousState);
  });

  it("does not let an older play request pause a newer successful resume", async () => {
    const { video } = setup();
    let finishFirst!: () => void;
    video.play.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    visibility(1);
    visibility(0); visibility(1); await settled();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.paused).toBe(false);
    finishFirst(); await settled();
    expect(video.paused).toBe(false);
  });

  it.each(["manual pause", "ending"])("retains %s when Next Activity restores the same DOM", async (reason) => {
    const { root, video, play, controls } = setup();
    visibility(1); await settled();
    if (reason === "manual pause") { video.currentTime = 4.2; click(play); }
    else {
      video.currentTime = 12; video.ended = true; video.paused = true;
      video.dispatchEvent(new Event("ended"));
    }
    destroy!(); destroy = enhanceLivingStory(root as unknown as HTMLElement);
    visibility(1); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video.paused).toBe(true);
    expect(controls.every((control) => !control.hidden)).toBe(true);
    expect(video.currentTime).toBe(reason === "ending" ? 12 : 4.2);
    expect(play.textContent).toBe(reason === "ending" ? "Rever animação" : "Reproduzir animação");
    click(play); await settled();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.currentTime).toBe(reason === "ending" ? 0 : 4.2);
    destroy!(); destroy = undefined;
    const freshPage = setup();
    visibility(1); await settled();
    expect(freshPage.video.play).toHaveBeenCalledTimes(1);
  });

  it("does not let a disposed instance pause the new player restored on the same DOM", async () => {
    const { root, video, play } = setup();
    let finishOld!: () => void;
    video.play.mockImplementationOnce(() => {
      video.paused = false;
      return new Promise<void>((resolve) => { finishOld = resolve; });
    });
    visibility(1);
    destroy!(); destroy = enhanceLivingStory(root as unknown as HTMLElement);
    visibility(1); click(play); await settled();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.paused).toBe(false);
    finishOld(); await settled();
    expect(video.paused).toBe(false);
  });

  it("retains the retry after a failed media element is restored by Next Activity", async () => {
    const { root, video, play, status } = setup();
    visibility(1); await settled();
    video.paused = true; video.dispatchEvent(new Event("error"));
    destroy!(); destroy = enhanceLivingStory(root as unknown as HTMLElement);
    visibility(1); await settled();
    expect(video.play).toHaveBeenCalledTimes(1);
    expect(play.textContent).toBe("Tentar animação novamente");
    expect(status.textContent).toContain("A animação não carregou");
    click(play); await settled();
    expect(video.load).toHaveBeenCalledTimes(2);
    expect(root.dataset.storyState).toBe("playing");
    expect(status.textContent).toBe("");
  });
});
