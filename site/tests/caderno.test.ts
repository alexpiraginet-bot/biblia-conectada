// The notebook (/caderno, and "Grifar", "Anotar" and "Decorar" on the reading pages): the pure model, the review
// schedule, the backup and the storage rules (docs/CADERNO.md). Texts and verse counts come from the generated data.
import { describe, expect, it } from "vitest";
import {
  addDays, addMemo, cadernoBytes, cadernoDay, CADERNO_FORMAT, CadernoError, chapterNotebook, daysBetween, dueMemos, emptyCaderno, exportCaderno, findNota,
  firstLetters, isDay, LAST_BOX, LEITNER_DAYS, markGroups, markVerses, MARK_COLORS, MARK_LABEL, MAX_CADERNO_BYTES, MAX_CADERNO_ITEMS, MAX_NOTE_CHARS,
  mergeCaderno, mergeSalvos, parseCaderno, parseCadernoBackup, passagePlace, removeMemo, removeNota, reviewMemo, saveNota, unmarkVerses, type Caderno,
} from "../src/lib/caderno/model";
import { CADERNO_KEY, CADERNO_RECOVERY_KEY, createCadernoStore, type CadernoStorage } from "../src/lib/caderno/store-core";
import type { Salvo } from "../src/lib/salvos";
import { bookFile, books } from "./generated";

const catalog = books();
const genesis = bookFile("genesis");
const verse = (n: number) => ({ vers: n, texto: genesis.chapters[0][n - 1].t });
const t0 = "2026-11-10T12:00:00.000Z";
const t1 = "2026-11-11T12:00:00.000Z";
const gn = (de: number, ate = de) => ({ livro: "genesis", cap: 1, de, ate });
const stored = (c: Caderno) => parseCaderno(JSON.stringify(c));

describe("review days", () => {
  it("count the day in Brasília, not in UTC", () => {
    // 02:30 UTC is still the evening before in Brasília (UTC−3, no daylight saving since 2019)
    expect(cadernoDay(new Date("2026-11-11T02:30:00Z"))).toBe("2026-11-10");
    expect(cadernoDay(new Date("2026-11-11T03:00:00Z"))).toBe("2026-11-11");
  });

  it("add days across months, years and leap days on the calendar alone", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 16)).toBe("2027-01-16");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(daysBetween("2026-11-10", "2026-11-26")).toBe(16);
    expect(daysBetween("2026-11-10", "2026-11-09")).toBe(-1);
    for (const bad of ["2026-02-30", "2026-13-01", "10/11/2026", "", 20261110]) expect(isDay(bad), String(bad)).toBe(false);
    expect(() => addDays("2026-02-30", 1)).toThrow(CadernoError);
  });
});

describe("highlights", () => {
  it("mark whole verses in a colour, once per verse, and remember the colour", () => {
    const one = markVerses(emptyCaderno(), "genesis", 1, [verse(3), verse(4)], "verde", t0);
    expect(one.cor).toBe("verde");
    expect(one.grifos).toEqual([
      { livro: "genesis", cap: 1, vers: 3, cor: "verde", texto: genesis.chapters[0][2].t, em: t0 },
      { livro: "genesis", cap: 1, vers: 4, cor: "verde", texto: genesis.chapters[0][3].t, em: t0 },
    ]);
    expect(markVerses(one, "genesis", 1, [verse(3)], "verde", t1)).toBe(one);
    // another colour changes verse 4 only; verse 3 keeps its record and its date
    const two = markVerses(one, "genesis", 1, [verse(4)], "azul", t1);
    expect(two.grifos).toHaveLength(2);
    expect(chapterNotebook(two, "genesis", 1).marks).toEqual(new Map([[3, "verde"], [4, "azul"]]));
    expect(two.grifos.find((g) => g.vers === 3)?.em).toBe(t0);
    expect(two.grifos.find((g) => g.vers === 4)?.em).toBe(t1);
    expect(stored(two)).toEqual(two);
    expect(emptyCaderno().grifos).toEqual([]);
  });

  it("remove only the verses asked for, and say when nothing changed", () => {
    const marked = markVerses(emptyCaderno(), "genesis", 1, [verse(1), verse(2), verse(3)], "ouro", t0);
    const less = unmarkVerses(marked, "genesis", 1, [2]);
    expect(less.grifos.map((g) => g.vers)).toEqual([1, 3]);
    expect(unmarkVerses(less, "genesis", 1, [2])).toBe(less);
    expect(unmarkVerses(less, "exodo", 1, [1])).toBe(less);
  });

  it("refuse a verse that is no verse, an unknown colour and an empty text", () => {
    const empty = emptyCaderno();
    for (const vers of [0, -1, 1.5, NaN]) expect(() => markVerses(empty, "genesis", 1, [{ vers, texto: "x" }], "ouro", t0), String(vers)).toThrow(CadernoError);
    expect(() => markVerses(empty, "Gênesis", 1, [verse(1)], "ouro", t0)).toThrow(CadernoError);
    expect(() => markVerses(empty, "genesis", 1, [{ vers: 1, texto: "   " }], "ouro", t0)).toThrow(CadernoError);
    expect(() => markVerses(empty, "genesis", 1, [verse(1)], "roxo" as never, t0)).toThrow(CadernoError);
  });

  it("read neighbouring verses of one colour as one passage, the most recent first", () => {
    let c = markVerses(emptyCaderno(), "genesis", 1, [verse(1), verse(2), verse(3)], "ouro", t0);
    c = markVerses(c, "genesis", 1, [verse(5)], "ouro", t0);
    c = markVerses(c, "genesis", 1, [verse(6)], "lilas", t1);
    const groups = markGroups(c);
    expect(groups.map((g) => [g.de, g.ate, g.cor])).toEqual([[6, 6, "lilas"], [1, 3, "ouro"], [5, 5, "ouro"]]);
    expect(groups[1].versos.map((v) => v.vers)).toEqual([1, 2, 3]);
    expect(passagePlace(catalog, groups[1])).toEqual({ ref: "Gênesis 1:1–3", path: "/genesis/1/1" });
  });

  it("name every colour", () => {
    expect(Object.keys(MARK_LABEL)).toEqual([...MARK_COLORS]);
    expect(new Set(Object.values(MARK_LABEL)).size).toBe(MARK_COLORS.length);
  });
});

describe("notes", () => {
  it("keep one note per passage and replace its text when it is written again", () => {
    const one = saveNota(emptyCaderno(), gn(3, 5), "  Haja luz;\n e houve luz. ", "  A primeira palavra.\r\nE a luz.  ", t0, "n1");
    expect(one.notas).toEqual([{ id: "n1", livro: "genesis", cap: 1, de: 3, ate: 5, trecho: "Haja luz; e houve luz.", nota: "A primeira palavra.\nE a luz.", criadaEm: t0, em: t0 }]);
    expect(saveNota(one, gn(3, 5), "Haja luz; e houve luz.", "A primeira palavra.\nE a luz.", t1, "n2")).toBe(one);
    const two = saveNota(one, gn(3, 5), "Haja luz;", "Outra leitura.", t1, "n2");
    expect(two.notas).toEqual([{ id: "n1", livro: "genesis", cap: 1, de: 3, ate: 5, trecho: "Haja luz;", nota: "Outra leitura.", criadaEm: t0, em: t1 }]);
    // another range of the same chapter is another note, listed first
    const three = saveNota(two, gn(3), "Haja luz;", "Só o versículo 3.", t1, "n3");
    expect(three.notas.map((n) => n.id)).toEqual(["n3", "n1"]);
    expect(findNota(three, gn(3))?.id).toBe("n3");
    expect(chapterNotebook(three, "genesis", 1).notas.map((n) => n.id)).toEqual(["n3", "n1"]);
    expect(removeNota(three, "n1").notas.map((n) => n.id)).toEqual(["n3"]);
    expect(removeNota(three, "nope")).toBe(three);
    expect(stored(three)).toEqual(three);
  });

  it("refuse an empty or oversized note without changing anything", () => {
    const empty = emptyCaderno();
    expect(() => saveNota(empty, gn(1), "No princípio", "  \n ", t0, "n")).toThrow("Escreva a anotação");
    expect(() => saveNota(empty, gn(1), "No princípio", "a".repeat(MAX_NOTE_CHARS + 1), t0, "n")).toThrow(CadernoError);
    expect(saveNota(empty, gn(1), "No princípio", "a".repeat(MAX_NOTE_CHARS), t0, "n").notas).toHaveLength(1);
    expect(() => saveNota(empty, gn(5, 3), "x", "nota", t0, "n")).toThrow(CadernoError);
  });
});

describe("memorising (Leitner boxes)", () => {
  const day = "2026-11-10";
  const start = () => addMemo(emptyCaderno(), gn(1), genesis.chapters[0][0].t, day, t0, "m1");

  it("starts a passage in box 1, due the same day, once per passage", () => {
    const c = start();
    expect(c.memos).toEqual([{ id: "m1", livro: "genesis", cap: 1, de: 1, ate: 1, texto: genesis.chapters[0][0].t, caixa: 1, proxima: day, revisoes: 0, acertos: 0, criadaEm: t0, em: t0 }]);
    expect(addMemo(c, gn(1), genesis.chapters[0][0].t, "2026-11-12", t1, "m2")).toBe(c);
    // the same passage with other words selected only refreshes the text; the schedule stays
    const again = addMemo(reviewMemo(c, "m1", true, day, t0), gn(1), "No princípio", "2026-11-12", t1, "m2");
    expect(again.memos).toHaveLength(1);
    expect(again.memos[0]).toMatchObject({ id: "m1", texto: "No princípio", caixa: 2, proxima: "2026-11-11" });
    expect(dueMemos(c, day).map((m) => m.id)).toEqual(["m1"]);
    expect(dueMemos(c, "2026-11-09")).toEqual([]);
  });

  it("rests 1, 2, 4, 8 and 16 days as the passage is remembered, and stays in the last box", () => {
    expect([...LEITNER_DAYS]).toEqual([1, 2, 4, 8, 16]);
    expect(LAST_BOX).toBe(5);
    let c = start();
    let today = day;
    const seen: [number, number][] = [];
    for (let i = 0; i < 7; i++) {
      c = reviewMemo(c, "m1", true, today, t0);
      const m = c.memos[0];
      seen.push([m.caixa, daysBetween(today, m.proxima)]);
      expect(dueMemos(c, addDays(m.proxima, -1))).toEqual([]);
      expect(dueMemos(c, m.proxima)).toHaveLength(1);
      today = m.proxima;
    }
    expect(seen).toEqual([[2, 1], [3, 2], [4, 4], [5, 8], [5, 16], [5, 16], [5, 16]]);
    expect(c.memos[0]).toMatchObject({ revisoes: 7, acertos: 7 });
    expect(stored(c)).toEqual(c);
  });

  it("sends a forgotten passage back to box 1, still due that day", () => {
    let c = start();
    for (const d of ["2026-11-10", "2026-11-11", "2026-11-13"]) c = reviewMemo(c, "m1", true, d, t0);
    expect(c.memos[0]).toMatchObject({ caixa: 4, proxima: "2026-11-17" });
    c = reviewMemo(c, "m1", false, "2026-11-17", t1);
    expect(c.memos[0]).toMatchObject({ caixa: 1, proxima: "2026-11-17", revisoes: 4, acertos: 3, em: t1 });
    expect(dueMemos(c, "2026-11-17")).toHaveLength(1);
    expect(() => reviewMemo(c, "gone", true, day, t0)).toThrow(CadernoError);
    expect(removeMemo(c, "m1").memos).toEqual([]);
  });

  it("lists what is due with the longest wait first", () => {
    let c = addMemo(emptyCaderno(), gn(1), "a", "2026-11-08", t0, "old");
    c = addMemo(c, gn(2), "b", "2026-11-10", t0, "today");
    c = addMemo(c, gn(3), "c", "2026-11-12", t0, "later");
    expect(dueMemos(c, "2026-11-10").map((m) => m.id)).toEqual(["old", "today"]);
  });

  it("gives the first letter of every word as a hint, punctuation kept", () => {
    expect(firstLetters("No princípio, criou Deus os céus e a terra.")).toBe("N p, c D o c e a t.");
    expect(firstLetters("Ótimo [é] o Senhor; 3 vezes!")).toBe("Ó [é] o S; 3 v!");
    const hint = firstLetters(genesis.chapters[0][0].t);
    expect(hint.length).toBeLessThan(genesis.chapters[0][0].t.length);
    expect(hint.split(/\s+/).length).toBe(genesis.chapters[0][0].t.split(/\s+/).length);
  });
});

describe("stored notebook", () => {
  it("is empty when nothing is stored and whole or unreadable otherwise", () => {
    expect(parseCaderno(null)).toEqual(emptyCaderno());
    const good = saveNota(markVerses(emptyCaderno(), "genesis", 1, [verse(1)], "ouro", t0), gn(1), "No princípio", "nota", t0, "n1");
    expect(stored(good)).toEqual(good);
    const raw = JSON.stringify(good);
    const broken: [string, string][] = [
      ["not json", "{"],
      ["a list", "[]"],
      ["another version", raw.replace('"v":1', '"v":2')],
      ["an extra field", raw.replace('"v":1', '"v":1,"x":1')],
      ["an unknown colour", raw.replace('"cor":"ouro","texto"', '"cor":"roxo","texto"')],
      ["a verse 0", raw.replace('"vers":1', '"vers":0')],
      ["an empty note", raw.replace('"nota":"nota"', '"nota":" "')],
      ["a date that is no date", raw.replace(`"criadaEm":"${t0}"`, '"criadaEm":"ontem"')],
    ];
    for (const [what, text] of broken) {
      expect(text, what).not.toBe(raw);
      expect(() => parseCaderno(text), what).toThrow(CadernoError);
    }
    // the same verse or the same passage twice is not a notebook either
    const twice = { ...good, grifos: [...good.grifos, ...good.grifos] };
    expect(() => parseCaderno(JSON.stringify(twice))).toThrow(CadernoError);
    expect(() => parseCaderno(JSON.stringify({ ...good, notas: [good.notas[0], { ...good.notas[0], id: "n2" }] }))).toThrow(CadernoError);
  });
});

describe("backup", () => {
  const salvo: Salvo = { id: "s1", ref: "Gênesis 1:3", path: "/genesis/1/3", livro: "genesis", cap: 1, de: 3, ate: 3, texto: "Haja luz;", salvoEm: t0 };
  const full = () => {
    let c = markVerses(emptyCaderno(), "genesis", 1, [verse(1), verse(2)], "azul", t0);
    c = saveNota(c, gn(1, 2), "No princípio", "O começo.", t0, "n1");
    return addMemo(c, gn(1), genesis.chapters[0][0].t, "2026-11-10", t0, "m1");
  };

  it("round-trips the notebook and the saved passages in one versioned file", () => {
    const text = exportCaderno(full(), [salvo], new Date(t1));
    const out = JSON.parse(text);
    expect(out.formato).toBe(CADERNO_FORMAT);
    expect(out.exportadoEm).toBe(t1);
    expect(out.fonte).toBe("Texto: Bíblia Livre (BLIVRE), CC BY 4.0");
    const back = parseCadernoBackup(text, catalog);
    expect(back.salvos).toEqual([salvo]);
    expect(back.exportadoEm).toBe(t1);
    expect(mergeCaderno(emptyCaderno(), back.caderno)).toEqual({ ...full(), cor: "ouro" });
    // importing the same file again changes nothing
    const merged = mergeCaderno(emptyCaderno(), back.caderno);
    expect(mergeCaderno(merged, back.caderno)).toBe(merged);
  });

  it("checks every item against the real books, chapters and verses and takes nothing from a bad file", () => {
    const text = exportCaderno(full(), [salvo], new Date(t1));
    const lastVerse = catalog.find((b) => b.slug === "genesis")!.verses[0];
    const bad: [string, string][] = [
      ["another format", text.replace(CADERNO_FORMAT, "biblia-conectada/salvos@1")],
      ["a book that does not exist", text.replace('"livro": "genesis",\n      "cap": 1,\n      "vers": 1', '"livro": "genesys",\n      "cap": 1,\n      "vers": 1')],
      ["a chapter past the book", text.replace('"cap": 1,\n      "vers": 2', '"cap": 51,\n      "vers": 2')],
      ["a verse past the chapter", text.replace('"vers": 2', `"vers": ${lastVerse + 1}`)],
      ["a box past the last", text.replace('"caixa": 1', `"caixa": ${LAST_BOX + 1}`)],
      ["a broken saved passage", text.replace('"path": "/genesis/1/3"', '"path": "genesis/1/3"')],
      ["not json", "caderno"],
    ];
    for (const [what, file] of bad) {
      expect(file, what).not.toBe(text);
      expect(() => parseCadernoBackup(file, catalog), what).toThrow(CadernoError);
    }
    expect(() => parseCadernoBackup(" ".repeat(MAX_CADERNO_BYTES + 1), catalog)).toThrow("maior");
    expect(parseCadernoBackup(text.replace(`"vers": 2`, `"vers": ${lastVerse}`), catalog).caderno.grifos).toHaveLength(2);
  });

  it("merges without losing anything: the newer change wins, a tie keeps this device", () => {
    const local = full();
    let theirs = saveNota(emptyCaderno(), gn(1, 2), "No princípio", "Versão do outro aparelho.", t1, "x1");
    theirs = saveNota(theirs, gn(9), "E disse Deus", "Só no backup.", t0, "n1");
    theirs = markVerses(theirs, "genesis", 1, [verse(2)], "lilas", t1);
    theirs = markVerses(theirs, "genesis", 1, [verse(1)], "verde", t0);
    theirs = addMemo(theirs, gn(1), genesis.chapters[0][0].t, "2026-11-10", t0, "m9");
    const merged = mergeCaderno(local, theirs);
    // the note of the same passage: theirs is newer, and it keeps this device's id
    expect(findNota(merged, gn(1, 2))).toMatchObject({ id: "n1", nota: "Versão do outro aparelho.", em: t1 });
    // a new note whose id this device already uses gets another id
    expect(findNota(merged, gn(9))).toMatchObject({ id: "n1-2", nota: "Só no backup." });
    expect(new Set(merged.notas.map((n) => n.id)).size).toBe(merged.notas.length);
    // verse 2 is newer in the backup; verse 1 ties and stays as it is here
    expect(chapterNotebook(merged, "genesis", 1).marks).toEqual(new Map([[1, "azul"], [2, "lilas"]]));
    expect(merged.memos).toEqual(local.memos);
    expect(merged.cor).toBe(local.cor);
    expect(stored(merged)).toEqual(merged);
    // nothing local is ever removed by a merge
    expect(mergeCaderno(local, emptyCaderno())).toBe(local);
  });

  it("joins the saved passages of a backup once, the new ones in front", () => {
    const other: Salvo = { ...salvo, id: "s2", ref: "Gênesis 1:1", path: "/genesis/1/1", de: 1, ate: 1, texto: "No princípio" };
    const third: Salvo = { ...salvo, id: "s3", ref: "Gênesis 1:5", path: "/genesis/1/5", de: 5, ate: 5, texto: "Dia" };
    expect(mergeSalvos([], [salvo, other])).toEqual([salvo, other]);
    expect(mergeSalvos([salvo], [other, third])).toEqual([other, third, salvo]);
    // the same passage under another id, the same id, or twice in the file: once
    expect(mergeSalvos([salvo], [{ ...salvo, id: "copy" }])).toBeNull();
    expect(mergeSalvos([salvo], [{ ...other, id: "s1" }])).toBeNull();
    expect(mergeSalvos([salvo], [other, { ...other, id: "again" }])).toEqual([other, salvo]);
    expect(mergeSalvos([salvo], [])).toBeNull();
    // the same place with other words is another saved passage
    expect(mergeSalvos([salvo], [{ ...salvo, id: "s9", texto: "e houve luz." }])).toHaveLength(2);
  });

  it("refuses a merge that would pass the limit of items", () => {
    const many = (from: number): Caderno => ({
      ...emptyCaderno(),
      memos: Array.from({ length: MAX_CADERNO_ITEMS }, (_, i) => ({ id: `m${from + i}`, livro: "salmos", cap: 1 + ((from + i) % 150), de: 1, ate: 1 + Math.floor((from + i) / 150), texto: "x", caixa: 1, proxima: "2026-11-10", revisoes: 0, acertos: 0, criadaEm: t0, em: t0 })),
    });
    const a = many(0);
    expect(stored(a).memos).toHaveLength(MAX_CADERNO_ITEMS);
    expect(() => mergeCaderno(a, addMemo(emptyCaderno(), gn(1), "x", "2026-11-10", t0, "one-more"))).toThrow("limite");
    expect(() => addMemo(a, gn(1), "x", "2026-11-10", t0, "one-more")).toThrow("limite");
  });
});

describe("storage in the browser", () => {
  function browser() {
    const values = new Map<string, string>();
    let quota = false, blocked = false, published = 0;
    const storage: CadernoStorage = {
      getItem(key) { if (blocked) throw new Error("SecurityError"); return values.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw new Error("SecurityError"); if (quota) throw new Error("QuotaExceededError"); values.set(key, value); },
      removeItem(key) { if (blocked) throw new Error("SecurityError"); values.delete(key); },
    };
    const store = createCadernoStore({ storage: () => storage, publish: () => { published++; }, now: () => new Date(t1) });
    return { values, store, quota: (on: boolean) => { quota = on; }, blocked: (on: boolean) => { blocked = on; }, published: () => published };
  }
  const mark = (c: Caderno) => markVerses(c, "genesis", 1, [verse(1)], "ouro", t0);

  it("confirms a change only after the browser stored it, and tells open pages", () => {
    const b = browser();
    expect(b.store.getSnapshot()).toMatchObject({ status: "ready", state: emptyCaderno() });
    const first = b.store.getSnapshot();
    expect(b.store.getSnapshot()).toBe(first);
    expect(b.store.change(mark, "Grifado.")).toEqual({ ok: true, changed: true, message: "Grifado." });
    expect(b.published()).toBe(1);
    expect(parseCaderno(b.values.get(CADERNO_KEY)).grifos).toHaveLength(1);
    expect(b.store.getSnapshot().state.grifos).toHaveLength(1);
    // the same change again is not a write
    expect(b.store.change(mark, "Grifado.", "Já estava.")).toEqual({ ok: true, changed: false, message: "Já estava." });
    expect(b.published()).toBe(1);
  });

  it("removes the key when the notebook becomes empty", () => {
    const b = browser();
    b.store.change(mark, "ok");
    expect(b.store.change((c) => unmarkVerses(c, "genesis", 1, [1]), "Tirado.")).toMatchObject({ ok: true, changed: true });
    expect(b.values.has(CADERNO_KEY)).toBe(false);
    expect(b.store.getSnapshot()).toMatchObject({ status: "ready", state: emptyCaderno() });
  });

  it("says so when the quota is full or the storage is blocked, and keeps what was there", () => {
    const b = browser();
    b.store.change(mark, "ok");
    const before = b.values.get(CADERNO_KEY);
    b.quota(true);
    const full = b.store.change((c) => saveNota(c, gn(1), "No princípio", "nota", t0, "n1"), "Guardado.");
    expect(full).toMatchObject({ ok: false, changed: false });
    expect(full.message).toContain("Não foi possível guardar");
    expect(b.values.get(CADERNO_KEY)).toBe(before);
    b.quota(false);
    b.blocked(true);
    expect(b.store.change(mark, "ok").ok).toBe(false);
    expect(b.store.getSnapshot().status).toBe("unavailable");
    b.blocked(false);
    expect(b.store.getSnapshot()).toMatchObject({ status: "ready" });
    expect(b.store.getSnapshot().state.grifos).toHaveLength(1);
    expect(createCadernoStore({ storage: () => null }).change(mark, "ok")).toMatchObject({ ok: false, changed: false });
  });

  it("shows the reader's own message for a refused change", () => {
    const b = browser();
    const refused = b.store.change((c) => saveNota(c, gn(1), "No princípio", "", t0, "n1"), "Guardado.");
    expect(refused).toEqual({ ok: false, changed: false, message: "Escreva a anotação antes de guardar." });
    expect(b.values.has(CADERNO_KEY)).toBe(false);
  });

  it("never writes over unreadable data; a restart sets it aside first", () => {
    const b = browser();
    b.values.set(CADERNO_KEY, '{"v":1,"grifos":"?"}');
    expect(b.store.getSnapshot()).toMatchObject({ status: "corrupt", state: emptyCaderno() });
    expect(b.store.change(mark, "ok")).toMatchObject({ ok: false, changed: false });
    expect(b.values.get(CADERNO_KEY)).toBe('{"v":1,"grifos":"?"}');
    expect(b.store.unreadableRaw()).toBe('{"v":1,"grifos":"?"}');
    // the copy cannot be stored: nothing is removed
    b.quota(true);
    expect(b.store.restart().ok).toBe(false);
    expect(b.values.get(CADERNO_KEY)).toBe('{"v":1,"grifos":"?"}');
    b.quota(false);
    expect(b.store.restart()).toMatchObject({ ok: true, changed: true });
    expect(b.values.has(CADERNO_KEY)).toBe(false);
    expect(JSON.parse(b.values.get(CADERNO_RECOVERY_KEY)!)).toEqual([{ em: t1, raw: '{"v":1,"grifos":"?"}' }]);
    expect(b.store.getSnapshot().status).toBe("ready");
    expect(b.store.unreadableRaw()).toBeNull();
    // a readable notebook is never restarted
    b.store.change(mark, "ok");
    expect(b.store.restart().ok).toBe(false);
    expect(b.store.getSnapshot().state.grifos).toHaveLength(1);
    // a second unreadable notebook joins the first copy
    b.values.set(CADERNO_KEY, "oops");
    expect(b.store.restart().ok).toBe(true);
    expect(JSON.parse(b.values.get(CADERNO_RECOVERY_KEY)!).map((c: { raw: string }) => c.raw)).toEqual(['{"v":1,"grifos":"?"}', "oops"]);
  });

  it("refuses a notebook larger than the limit", () => {
    const b = browser();
    const huge = (c: Caderno): Caderno => ({ ...c, notas: Array.from({ length: 600 }, (_, i) => ({ id: `n${i}`, livro: "salmos", cap: 119, de: 1 + (i % 176), ate: 176, trecho: "x", nota: "a".repeat(MAX_NOTE_CHARS), criadaEm: t0, em: t0 })).filter((n, i, all) => all.findIndex((o) => o.de === n.de) === i) });
    const small = b.store.change(huge, "ok");
    expect(small.ok).toBe(true);
    expect(cadernoBytes(b.values.get(CADERNO_KEY)!)).toBeLessThan(MAX_CADERNO_BYTES);
    const tooBig = b.store.change((c) => ({ ...c, memos: Array.from({ length: 400 }, (_, i) => ({ id: `m${i}`, livro: "salmos", cap: 1 + (i % 150), de: 1, ate: 1 + Math.floor(i / 150), texto: "b".repeat(8000), caixa: 1, proxima: "2026-11-10", revisoes: 0, acertos: 0, criadaEm: t0, em: t0 })) }), "ok");
    expect(tooBig).toMatchObject({ ok: false, changed: false });
    expect(tooBig.message).toContain("limite de espaço");
    expect(parseCaderno(b.values.get(CADERNO_KEY)).memos).toEqual([]);
  });
});
