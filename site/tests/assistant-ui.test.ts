import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { books, verseText } from "@/lib/data";
import { loadChronologicalReading } from "@/lib/chronological-reading";
import { StudyCompanion, type StudyMoment } from "@/components/assistant/StudyCompanion";
import { resolveStudyReference } from "@/components/assistant/study-reference";
import { speakStudyText, speechSnapshot, stopStudySpeech, subscribeSpeech } from "@/components/assistant/study-speech";

afterEach(() => { stopStudySpeech(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("study passage selection", () => {
  it.each(["jeremias/17/8", "Jeremias 17:8", "Jr 17:8"])("resolves %s to the exact canonical verse", (input) => {
    expect(resolveStudyReference(input, books)).toMatchObject({
      book: { slug: "jeremias" }, chapter: 17, verse: 8, reference: "Jeremias 17:8", href: "/jeremias/17/8",
    });
  });

  it("accepts the first and final verse of every canonical book", () => {
    for (const book of books) {
      const lastChapter = book.verses.length, lastVerse = book.verses.at(-1)!;
      expect(resolveStudyReference(`${book.slug}/1/1`, books)?.book.slug).toBe(book.slug);
      expect(resolveStudyReference(`${book.slug}/${lastChapter}/${lastVerse}`, books)?.verse).toBe(lastVerse);
      expect(resolveStudyReference(`${book.slug}/${lastChapter + 1}/1`, books)).toBeNull();
      expect(resolveStudyReference(`${book.slug}/${lastChapter}/${lastVerse + 1}`, books)).toBeNull();
    }
  });

  it.each([
    undefined, null, ["jeremias/17/8"], "", "../jeremias/17/8", "Jeremias/17/8", "jeremias/17/0",
    "jeremias/0/8", "jeremias/17/08", "jeremias/99/8", "jeremias/17/99", "inexistente/1/1",
    "jeremias/17/8?extra=1", "Jeremias 17", "Jeremias 17:8-9", "Jeremias 17:8,9", "Jeremias 17:8a",
    "Jeremias 17:8; João 3:16", "a".repeat(121),
  ])("rejects malformed, multiple or nonexistent reference %j", (input) => {
    expect(resolveStudyReference(input, books)).toBeNull();
  });

  it("renders the requested BLIVRE verse, keeps all curated shortcuts and does not attach an unrelated image", async () => {
    const itinerary = await loadChronologicalReading(verseText);
    const moments: StudyMoment[] = itinerary.map((item) => {
      const passage = item.passages.find((p) => p.gospel === item.defaultGospel)!;
      return { id: item.id, title: item.title, place: item.place, image: item.image, imageAlt: item.imageAlt,
        reference: passage.reference, href: passage.href, book: passage.gospel, chapter: passage.chapter, verse: passage.from, verses: passage.verses };
    });
    const text = await verseText("jeremias", 17, 8);
    const html = renderToStaticMarkup(createElement(StudyCompanion, { moments, enabled: false,
      initialPassage: { id: "verse-jeremias-17-8", title: "Versículo escolhido", reference: "Jeremias 17:8", href: "/jeremias/17/8",
        book: "jeremias", chapter: 17, verse: 8, verses: [{ number: 8, text }] } }));
    expect(html).toContain('value="verse-jeremias-17-8" selected=""');
    expect(html).toContain(text.slice(0, 45));
    for (const item of moments) expect(html).toContain(`value="${item.id}"`);
    expect(html).not.toContain("<img");
    expect(html).toContain('href="/explorar/jeremias/17"');
    expect(html).toContain('value="contexto"');
    expect(html).toContain('value="simples"');
    expect(html).toContain('value="cotidiano"');
    expect(html).toContain("Este navegador não oferece leitura em voz alta.");
  });
});

function mockVoice() {
  class Utterance {
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(public text: string) {}
  }
  const synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: vi.fn(() => []) };
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("window", { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
  return synth;
}

describe("study speech ownership (device voice only)", () => {
  it("switches players without leaving the previous player active or allowing its cleanup to stop the next", () => {
    const synth = mockVoice(), changed = vi.fn(), unsubscribe = subscribeSpeech(changed);
    speakStudyText("passage", "Primeiro texto.");
    const first = synth.speak.mock.calls[0][0];
    expect(speechSnapshot().owner).toBe("passage");
    speakStudyText("answer", "Uma resposta.");
    const second = synth.speak.mock.calls[1][0];
    expect(first.onend).toBeNull();
    expect(first.onerror).toBeNull();
    expect(speechSnapshot().owner).toBe("answer");
    const cancels = synth.cancel.mock.calls.length;
    stopStudySpeech("passage");
    expect(synth.cancel).toHaveBeenCalledTimes(cancels);
    expect(speechSnapshot().owner).toBe("answer");
    second.onend();
    expect(speechSnapshot().owner).toBeNull();
    expect(changed).toHaveBeenCalled();
    unsubscribe();
  });

  it("clears ownership on explicit stop and reports a voice error separately", () => {
    const synth = mockVoice();
    speakStudyText("answer", "Texto.");
    stopStudySpeech("answer");
    expect(speechSnapshot()).toEqual({ owner: null, failedOwner: null });
    speakStudyText("answer", "Outro texto.");
    synth.speak.mock.calls[1][0].onerror({ error: "voice-unavailable" });
    expect(speechSnapshot()).toEqual({ owner: null, failedOwner: "answer" });
  });

  it("reports unsupported voice and speak failures without leaving a player active", () => {
    speakStudyText("unsupported", "Texto.");
    expect(speechSnapshot()).toEqual({ owner: null, failedOwner: "unsupported" });
    const synth = mockVoice();
    synth.speak.mockImplementation(() => { throw new Error("Voice unavailable"); });
    speakStudyText("failed", "Texto.");
    expect(speechSnapshot()).toEqual({ owner: null, failedOwner: "failed" });
  });

  it("does not report intentional browser interruption as a voice failure", () => {
    const synth = mockVoice();
    speakStudyText("answer", "Texto.");
    synth.speak.mock.calls[0][0].onerror({ error: "interrupted" });
    expect(speechSnapshot()).toEqual({ owner: null, failedOwner: null });
  });
});
