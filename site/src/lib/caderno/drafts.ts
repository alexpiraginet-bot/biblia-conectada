// The unsaved words of a note, kept for this tab so that no way of leaving the note dialog loses them: a second
// Escape (the browser closes a dialog on it whatever the page answers), the back gesture, a reload. sessionStorage
// with a memory fallback; nothing is sent anywhere. One draft per passage; the oldest go when there are too many.
import { MAX_NOTE_CHARS, type Passage } from "./model";

export const CADERNO_DRAFTS_KEY = "bc:caderno:rascunhos:v1";
export const MAX_DRAFTS = 12;

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
/** passage key -> text, oldest first */
type Drafts = Record<string, string>;

export const draftKey = (p: Passage) => `${p.livro}/${p.cap}/${p.de}-${p.ate}`;

export function createDrafts(storage: () => DraftStorage | null) {
  // what this page wrote last: used when the browser has no session storage, or refuses it
  let memory: Drafts = {};

  function read(): Drafts {
    try {
      const raw = storage()?.getItem(CADERNO_DRAFTS_KEY);
      if (raw === null || raw === undefined) return memory;
      const data: unknown = JSON.parse(raw);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return Object.fromEntries(Object.entries(data).filter((e): e is [string, string] => typeof e[1] === "string" && e[1].length <= MAX_NOTE_CHARS));
      }
    } catch {
      /* unreadable drafts are not worth an error: the memory copy stands */
    }
    return memory;
  }

  function write(drafts: Drafts) {
    memory = drafts;
    try {
      const store = storage();
      if (!store) return;
      if (Object.keys(drafts).length) store.setItem(CADERNO_DRAFTS_KEY, JSON.stringify(drafts));
      else store.removeItem(CADERNO_DRAFTS_KEY);
    } catch {
      /* the memory copy keeps the words for as long as this page lives */
    }
  }

  return {
    /** The draft of a passage, or null when there is none worth showing. */
    get(passage: Passage): string | null {
      const text = read()[draftKey(passage)];
      return typeof text === "string" && text.trim() ? text : null;
    },
    /** Keeps the words of a passage as its newest draft. */
    set(passage: Passage, text: string) {
      const drafts = { ...read() };
      const key = draftKey(passage);
      delete drafts[key];
      drafts[key] = text.slice(0, MAX_NOTE_CHARS);
      const keys = Object.keys(drafts);
      for (const old of keys.slice(0, Math.max(0, keys.length - MAX_DRAFTS))) delete drafts[old];
      write(drafts);
    },
    clear(passage: Passage) {
      const drafts = { ...read() };
      const key = draftKey(passage);
      if (!(key in drafts)) return;
      delete drafts[key];
      write(drafts);
    },
  };
}

/** The drafts of this tab. */
export const noteDrafts = createDrafts(() => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
});
