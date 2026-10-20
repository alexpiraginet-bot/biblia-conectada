// Saved passages (/salvos, "Salvar trecho"): the pure helpers behind the localStorage list and the copied quote.
import { describe, expect, it } from "vitest";
import {
  addSalvo,
  cleanQuote,
  exportSalvos,
  parseSalvos,
  passageRef,
  quoteWithRef,
  removeSalvo,
  type Salvo,
  textFragment,
} from "../src/lib/salvos";
import { bookFile } from "./generated";

const item = (over: Partial<Salvo> = {}): Salvo => ({
  id: "a",
  ref: "Gênesis 1:3",
  path: "/genesis/1/3",
  livro: "genesis",
  cap: 1,
  de: 3,
  ate: 3,
  texto: "Haja luz;",
  salvoEm: "2026-10-19T12:00:00.000Z",
  ...over,
});

describe("quote with reference", () => {
  it("copies the BLIVRE text with its reference, as the reference image shows", () => {
    const gn13 = bookFile("genesis").chapters[0][2].t;
    expect(gn13).toContain("Haja luz;");
    expect(quoteWithRef("Haja luz;", passageRef("Gênesis", 1, 3, 3))).toBe("Haja luz; — Gênesis 1:3 (BLIVRE)");
    expect(passageRef("Gênesis", 1, 3, 5)).toBe("Gênesis 1:3–5");
    expect(cleanQuote("  E disse Deus:\n  Haja luz;  ")).toBe("E disse Deus: Haja luz;");
  });

  it("builds text fragments that survive the directive's reserved characters", () => {
    expect(textFragment("Haja luz;")).toBe("#:~:text=Haja%20luz%3B");
    expect(textFragment("um-dois, três")).toBe("#:~:text=um%2Ddois%2C%20tr%C3%AAs");
    const long = "No princípio criou Deus os céus e a terra, e a terra era sem forma";
    expect(textFragment(long)).toBe("#:~:text=No%20princ%C3%ADpio%20criou%20Deus,terra%20era%20sem%20forma");
  });
});

describe("saved list", () => {
  it("drops malformed data instead of throwing", () => {
    expect(parseSalvos(null)).toEqual([]);
    expect(parseSalvos("not json")).toEqual([]);
    expect(parseSalvos('{"a":1}')).toEqual([]);
    expect(parseSalvos(JSON.stringify([item(), { id: 1 }, item({ id: "b", path: "http://x" }), item({ id: "c", cap: 0 })]))).toEqual([item()]);
  });

  it("adds newest first, once per text of a passage, and removes by id", () => {
    const a = item();
    const b = item({ id: "b", texto: "e houve luz.", salvoEm: "2026-10-19T13:00:00.000Z" });
    let list = addSalvo([], a);
    list = addSalvo(list, b);
    expect(list.map((s) => s.id)).toEqual(["b", "a"]);
    list = addSalvo(list, item({ id: "a2" }));
    expect(list.map((s) => s.id)).toEqual(["a2", "b"]);
    expect(removeSalvo(list, "b").map((s) => s.id)).toEqual(["a2"]);
  });

  it("exports a versioned JSON file", () => {
    const out = JSON.parse(exportSalvos([item()], new Date("2026-10-19T15:00:00Z")));
    expect(out.formato).toBe("biblia-conectada/salvos@1");
    expect(out.exportadoEm).toBe("2026-10-19T15:00:00.000Z");
    expect(out.itens).toEqual([item()]);
    expect(parseSalvos(JSON.stringify(out.itens))).toEqual([item()]);
  });
});
