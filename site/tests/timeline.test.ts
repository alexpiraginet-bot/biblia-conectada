// Linha do tempo (Theographic), Temas (OpenBible.info Topics), Palavras (BLIVRE) and the reception pilot (Wikidata):
// every number those pages show is recounted here from the generated book files and the sources (CLAUDE.md rule 3),
// and the Portuguese names of the most cited places are listed for review (rule 4).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGrid } from "../src/lib/canon/grid";
import { ERAS, eraBounds, eraIndex, eraSpanLabel, eraX, yearLabel } from "../src/lib/eras";
import { formatPassage, formatRuns, passageChapters, passageSlug, verseRuns } from "../src/lib/passage";
import { contentKeys, containsWord, isStopword, isWordSlug, palavrasEmComum, tokenize, wordKey } from "../src/lib/words";
import { wordPage } from "../src/lib/word-index";
import { durationLabel, timelineAxis } from "../src/lib/timeline";
import { THEME_ALLOW, THEME_RULE } from "../scripts/data/themes";
import { nameSimilarity, PLACE_RULE, textHasName } from "../scripts/data/place-names";
import { IMAGE_REVIEW, RECEPTION_DIR, RECEPTION_SUBJECTS, WRONG_SUBJECT } from "../scripts/data/reception";
import { REPO, SITE } from "../scripts/data/sources";
import { bookFile, books, generated } from "./generated";

type Link = [number, number, number];
type Ev = {
  id: number; slug: string; ref: string; titleEn: string; sortKey: number; year: number; verses: number[]; chapters: number[];
  places: { name: string; placeID: number; gv: number }[]; links: { pairs: number; partners: number }; top: Link[];
  themes: { slug: string; label: string; passages: number }[];
};
type Theme = { slug: string; key: string; label: string; topic: string; coverage: { with: number; total: number };
  passages: { osis: string; from: number; to: number; score: number }[]; links: Link[] };

const grid = createGrid(books());
const text: string[] = [];
const links: Link[][] = [];
for (const b of books()) for (const ch of bookFile(b.slug).chapters) for (const v of ch) {
  text.push(v.t);
  links.push(v.l);
}
const timeline = generated<{ coveredVerses: number; events: Ev[] }>("linha-do-tempo/events.json");
const places = generated<{ named: { en: string; pt: string; core: string; verses: number; dice: number }[]; unnamed: unknown[] }>("linha-do-tempo/place-names.json");
const temas = generated<{ themes: Theme[]; topicsInSource: number; credit: string }>("temas.json");
const theographicEvents = JSON.parse(readFileSync(join(REPO, "fontes/theographic/json/events.json"), "utf8")) as unknown[];
const ref = (osis: string, c: number, v: number) => grid.verseIndex(books().find((b) => b.osis === osis)!, c, v);

describe("eras (site convention, src/lib/eras.ts)", () => {
  const axis = { start: -4003, end: 2026 };
  it("are five equal columns, linear inside", () => {
    expect(ERAS.map((e) => e.label)).toEqual(["Antiguidade", "Idade Média", "Renascimento", "Era moderna", "Hoje"]);
    expect(eraX(-4003, axis)).toBe(0);
    expect(eraX(2026, axis)).toBe(1);
    expect(eraX(476, axis)).toBeCloseTo(0.2, 12);
    expect(eraX(1400, axis)).toBeCloseTo(0.4, 12);
    expect(eraX(1600, axis)).toBeCloseTo(0.6, 12);
    expect(eraX(1900, axis)).toBeCloseTo(0.8, 12);
    expect(eraX(1500, axis)).toBeCloseTo(0.5, 12);
    expect(eraX(938, axis)).toBeCloseTo(0.3, 12);
  });
  it("is monotonic and clamps outside the axis", () => {
    let prev = -1;
    for (let y = -5000; y <= 2100; y += 7) {
      const x = eraX(y, axis);
      expect(x).toBeGreaterThanOrEqual(prev);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      prev = x;
    }
    expect(eraX(-9999, axis)).toBe(0);
    expect(eraX(3000, axis)).toBe(1);
    expect(() => eraX(0, { start: 10, end: 10 })).toThrow();
  });
  it("assigns boundary years to the later era and states the spans", () => {
    expect(eraIndex(475)).toBe(0);
    expect(eraIndex(476)).toBe(1);
    expect(eraIndex(1899)).toBe(3);
    expect(eraIndex(1900)).toBe(4);
    expect(eraBounds(0, axis)).toEqual([-4003, 476]);
    expect(eraSpanLabel(0, axis)).toBe("até 475 d.C.");
    expect(eraSpanLabel(4, axis)).toBe("de 1900 d.C. até 2026 d.C.");
  });
  it("labels ISO astronomical years", () => {
    expect(yearLabel(-4003)).toBe("4004 a.C.");
    expect(yearLabel(0)).toBe("1 a.C.");
    expect(yearLabel(29)).toBe("29 d.C.");
    expect(durationLabel("7D")).toBe("7 dias");
    expect(durationLabel("1Y")).toBe("1 ano");
    expect(durationLabel("3M")).toBe("3 meses");
    expect(durationLabel("x")).toBeNull();
  });
  it("the site axis runs from the first event to the reception snapshot", () => {
    const a = timelineAxis();
    expect(a.start).toBe(Math.min(...timeline.events.map((e) => e.year)));
    expect(a.start).toBe(-4003);
    expect(a.end).toBeGreaterThanOrEqual(2026);
  });
});

describe("passages (src/lib/passage.ts)", () => {
  it("formats runs as Portuguese references", () => {
    const lc = Array.from({ length: 13 }, (_, i) => ref("Luke", 10, 25 + i));
    expect(verseRuns(lc)).toEqual([[lc[0], lc[12]]]);
    expect(formatPassage(lc, grid)).toBe("Lucas 10:25–37");
    expect(passageSlug(lc, grid)).toBe("lucas-10-25-37");
    expect(formatRuns([[ref("Gen", 1, 1), ref("Gen", 2, 3)]], grid)).toBe("Gênesis 1:1–2:3");
    expect(formatPassage([ref("Acts", 2, 1), ref("Acts", 2, 2), ref("Acts", 2, 6), ref("Acts", 3, 1)], grid)).toBe("Atos 2:1–2, 6; 3:1");
    expect(formatPassage([ref("Matt", 5, 3), ref("Luke", 6, 20)], grid)).toBe("Mateus 5:3; Lucas 6:20");
    expect(formatRuns([[ref("Mal", 4, 6), ref("Matt", 1, 1)]], grid)).toBe("Malaquias 4:6–Mateus 1:1");
    expect(passageChapters([ref("Gen", 2, 3), ref("Gen", 1, 1)], grid)).toEqual([0, 1]);
  });
});

describe("linha do tempo (Theographic events)", () => {
  const events = timeline.events;
  it("has every Theographic event, in sortKey order, with unique slugs", () => {
    expect(events.length).toBe(theographicEvents.length);
    expect(events.length).toBe(450);
    for (let i = 1; i < events.length; i++) expect(events[i].sortKey).toBeGreaterThanOrEqual(events[i - 1].sortKey);
    expect(new Set(events.map((e) => e.slug)).size).toBe(events.length);
    for (const e of events) {
      expect(e.slug.startsWith(`${e.id}-`)).toBe(true);
      expect(e.ref, String(e.id)).toBe(formatPassage(e.verses, grid));
      expect(e.slug.slice(String(e.id).length + 1)).toBe(passageSlug(e.verses, grid));
      expect(e.chapters).toEqual(passageChapters(e.verses, grid));
    }
  });

  it("covers the verses the pipeline says", () => {
    expect(timeline.coveredVerses).toBe(new Set(events.flatMap((e) => e.verses)).size);
    expect(timeline.coveredVerses).toBe(15619);
  });

  it("counts the OpenBible links of every event from the book files", () => {
    for (const e of events) {
      const inside = new Set(e.verses);
      const pairs = new Set<string>();
      const partners = new Map<number, number>();
      for (const gv of e.verses) {
        for (const [o, votes] of links[gv]) {
          pairs.add(`${Math.min(gv, o)}:${Math.max(gv, o)}`);
          if (!inside.has(o)) partners.set(o, Math.max(partners.get(o) ?? -Infinity, votes));
        }
      }
      expect(e.links, String(e.id)).toEqual({ pairs: pairs.size, partners: partners.size });
      for (const [p, votes] of e.top) expect(partners.get(p), `${e.id} top ${p}`).toBe(votes);
      const best = [...partners.values()].sort((a, b) => b - a).slice(0, e.top.length);
      expect(e.top.map((t) => t[1])).toEqual(best);
    }
  });

  it("the Good Samaritan: Lucas 10:25–37, 29 d.C., Jerusalém and Jericó read from Lc 10:30", () => {
    const e = events.find((x) => x.id === 423)!;
    expect(e.slug).toBe("423-lucas-10-25-37");
    expect(e.ref).toBe("Lucas 10:25–37");
    expect(e.titleEn).toBe("Good Samaritan Parable Taught");
    expect(e.year).toBe(29);
    expect(e.verses.length).toBe(13);
    expect(e.links).toEqual({ pairs: 209, partners: 193 });
    const lc1030 = ref("Luke", 10, 30);
    expect(text[lc1030]).toContain("descia de Jerusalém a Jericó");
    expect(e.places.map((p) => [p.name, p.gv])).toEqual([["Jericó", lc1030], ["Jerusalém", lc1030]]);
    expect(e.themes.map((t) => t.slug)).toContain("proximo");
  });

  it("names a place only with a word of the BLIVRE text of one of the event's verses", () => {
    let n = 0;
    for (const e of events) {
      for (const p of e.places) {
        expect(e.verses, `${e.id} ${p.name}`).toContain(p.gv);
        expect(textHasName(text[p.gv], p.name), `${e.id} ${p.name}`).toBe(true);
        n++;
      }
    }
    expect(n).toBeGreaterThan(1000);
  });
});

describe("Portuguese place names (CLAUDE.md rule 4: read from the BLIVRE, reviewed)", () => {
  // The 45 most cited Theographic places with the name the code reads from the BLIVRE text. Reviewed one by one on
  // 2026-10-19; a change in the sources or the rule shows up here first.
  const REVIEWED: [string, string][] = [
    ["Jerusalem", "Jerusalém"], ["Egypt", "Egito"], ["Babylon", "Babilônia"], ["Jordan", "Jordão"], ["Moab", "Moabe"],
    ["Zion", "Sião"], ["Assyria", "Assíria"], ["Samaria", "Samaria"], ["Gilead", "Gileade"], ["Edom", "Edom"],
    ["Canaan", "Canaã"], ["Syria", "Síria"], ["Galilee", "Galileia"], ["Bethel", "Betel"], ["Jericho", "Jericó"],
    ["Hebron", "Hebrom"], ["Lebanon", "Líbano"], ["Damascus", "Damasco"], ["Bashan", "Basã"], ["Tyre", "Tiro"],
    ["Sodom", "Sodoma"], ["Judea", "Judeia"], ["Midian", "Midiã"], ["Gibeah", "Gibeá"], ["Shechem", "Siquém"],
    ["Heshbon", "Hesbom"], ["Gibeon", "Gibeão"], ["Gilgal", "Gilgal"], ["Beersheba", "Berseba"], ["Bethlehem", "Belém"],
    ["Euphrates", "rio Eufrates"], ["Gath", "Gate"], ["Ai", "Ai"], ["Mizpah", "Mispá"], ["Nile", "Nilo"],
    ["Shiloh", "Siló"], ["Sidon", "Sidom"], ["Nazareth", "Nazaré"], ["Red Sea", "mar Vermelho"], ["Persia", "Pérsia"],
    ["Seir", "Seir"], ["Gomorrah", "Gomorra"], ["Hamath", "Hamate"], ["Carmel", "Carmelo"], ["Jezreel", "Jezreel"],
  ];
  it("lists the most cited places for review", () => {
    const top = places.named.slice(0, REVIEWED.length).map((p) => [p.en, p.pt]);
    // printed so a reviewer sees the table in the test log
    console.log(top.map(([en, pt], i) => `${String(i + 1).padStart(2)} ${en} -> ${pt}`).join("\n"));
    expect(top).toEqual(REVIEWED);
  });
  it("every name is a capitalised word (or a geographic phrase ending in one) of the place's BLIVRE verses", () => {
    for (const p of places.named) {
      expect(p.pt.endsWith(p.core)).toBe(true);
      expect(/^\p{Lu}/u.test(p.core), p.core).toBe(true);
      expect(text.some((t) => textHasName(t, p.pt)), p.pt).toBe(true);
    }
  });
  it("uses the English name only to compare look-alike words", () => {
    expect(nameSimilarity("Jericho", "Jericó")).toBeGreaterThanOrEqual(PLACE_RULE.similarity);
    expect(nameSimilarity("Myra", "Mira")).toBe(1);
    expect(nameSimilarity("Red Sea", "Vermelho")).toBeLessThan(PLACE_RULE.similarity);
    expect(nameSimilarity("Zion", "Sião")).toBe(0);
    expect(textHasName("descia de Jerusalém a Jericó;", "Jericó")).toBe(true);
    expect(textHasName("Ramote-Gileade", "Gileade")).toBe(false);
  });
});

describe("temas (OpenBible.info Topics, labels from the BLIVRE)", () => {
  const themes = temas.themes;
  it("fixes the rule", () => {
    expect(THEME_RULE.majority).toBe(0.5);
    expect(THEME_RULE.minPassages).toBe(8);
    expect(THEME_RULE.minScoreForVerse).toBe(3);
  });
  it("publishes only allow-listed topics, each labelled by a word in most of its passages", () => {
    expect(themes.length).toBeGreaterThan(50);
    expect(new Set(themes.map((t) => t.slug)).size).toBe(themes.length);
    for (const t of themes) {
      expect(THEME_ALLOW[t.topic], t.topic).toBe(t.key);
      expect(t.passages.length).toBeGreaterThanOrEqual(THEME_RULE.minPassages);
      expect(t.coverage.total).toBe(t.passages.length);
      const withWord = t.passages.filter((p) => {
        for (let gv = p.from; gv <= p.to; gv++) if (containsWord(text[gv], t.key)) return true;
        return false;
      }).length;
      expect(withWord, t.topic).toBe(t.coverage.with);
      expect(withWord * 2, t.topic).toBeGreaterThan(t.passages.length);
      expect(wordKey(t.label)).toBe(t.key);
      expect(isStopword(t.key)).toBe(false);
    }
    expect(themes.find((t) => t.topic === "age difference")).toBeUndefined();
  });
  it("matches the numbers of the analysis: luz 14/15, próximo 8/12, misericórdia 6/11", () => {
    const by = (topic: string) => themes.find((t) => t.topic === topic)!;
    expect([by("light").label, by("light").coverage]).toEqual(["luz", { with: 14, total: 15 }]);
    expect([by("neighbor").label, by("neighbor").coverage]).toEqual(["próximo", { with: 8, total: 12 }]);
    expect([by("mercy").label, by("mercy").coverage]).toEqual(["misericórdia", { with: 6, total: 11 }]);
    const luz = by("light");
    for (const v of [ref("Gen", 1, 3), ref("John", 1, 5), ref("John", 8, 12)]) expect(luz.passages.some((p) => p.from <= v && v <= p.to)).toBe(true);
    expect(temas.topicsInSource).toBe(6712);
    expect(temas.credit).toBe("Temas: OpenBible.info Topics (CC BY 4.0), instantâneo de 19/10/2026");
  });
  it("counts the links between passages from the book files", () => {
    for (const t of themes) {
      const owner = new Map<number, Set<number>>();
      t.passages.forEach((p, i) => {
        for (let gv = p.from; gv <= p.to; gv++) owner.set(gv, (owner.get(gv) ?? new Set()).add(i));
      });
      let n = 0;
      for (const [gv, mine] of owner) for (const [o] of links[gv]) {
        const theirs = owner.get(o);
        if (o > gv && theirs && [...mine].some((i) => [...theirs].some((j) => i !== j))) n++;
      }
      expect(t.links.length, t.topic).toBe(n);
    }
  });
});

describe("palavras (src/lib/words.ts, src/lib/word-index.ts)", () => {
  it("tokenizes and matches without accents or case, whole words only", () => {
    expect(tokenize("E disse Deus: Haja luz; e houve luz.")).toEqual(["E", "disse", "Deus", "Haja", "luz", "e", "houve", "luz"]);
    expect(tokenize("disse-lhe [o] Senhor")).toEqual(["disse", "lhe", "o", "Senhor"]);
    expect(wordKey("Misericórdia")).toBe("misericordia");
    expect(containsWord("A Luz brilha", "luz")).toBe(true);
    expect(containsWord("as luzes do céu", "luz")).toBe(false);
    expect(containsWord("o céu e a terra", "ceu")).toBe(true);
    expect(isWordSlug("luz")).toBe(true);
    expect(isWordSlug("Luz")).toBe(false);
    expect(isWordSlug("l")).toBe(false);
  });
  it("leaves function words out", () => {
    for (const w of ["e", "de", "que", "não", "é", "nós", "às", "foi", "porque", "eles"]) expect(isStopword(wordKey(w)), w).toBe(true);
    for (const w of ["luz", "deus", "senhor", "amor"]) expect(isStopword(w), w).toBe(false);
    expect([...contentKeys("E disse Deus: Haja luz; e houve luz.")]).toEqual(["disse", "deus", "luz"]);
  });
  it("palavrasEmComum: the shared content words, in the order of the first text", () => {
    const gn13 = text[ref("Gen", 1, 3)];
    const jo15 = text[ref("John", 1, 5)];
    expect(palavrasEmComum(gn13, jo15).map((w) => w.form)).toEqual(["luz"]);
    expect(palavrasEmComum("No princípio era a Palavra", "No princípio criou Deus").map((w) => w.key)).toEqual(["principio"]);
    expect(palavrasEmComum("Jesus disse", "disse Jesus")).toEqual([{ key: "jesus", form: "Jesus" }, { key: "disse", form: "disse" }]);
    expect(palavrasEmComum("E Ele", "e ele")).toEqual([]);
  });
  it("/palavra/luz: verses and links among them, recounted from the book files", async () => {
    const w = await wordPage("luz");
    expect(w).not.toBeNull();
    const verses = text.flatMap((t, gv) => (containsWord(t, "luz") ? [gv] : []));
    expect(w!.verses).toEqual(verses);
    const set = new Set(verses);
    let among = 0;
    for (const gv of verses) for (const [o] of links[gv]) if (o > gv && set.has(o)) among++;
    expect(w!.linksAmong.length).toBe(among);
    expect([verses.length, among]).toEqual([304, 687]);
    expect(w!.label).toBe("luz");
    expect(await wordPage("de")).toBeNull();
    expect(await wordPage("xyzzy")).toBeNull();
  });
});

describe("recepção (Wikidata pilot)", () => {
  type W = { qid: string; year: number | null; titleLang: string | null; image: { src: string; file: string } | null };
  const rec = generated<{ snapshot: string; pilots: { event: number; works: W[] }[] }>("recepcao.json");
  const commons = JSON.parse(readFileSync(join(RECEPTION_DIR, "commons-arquivos.json"), "utf8")) as {
    files: { qid: string; file: string; licenseShort: string[]; publicDomain: boolean; thumbnail: { webp?: string; webpSha256?: string; webpWidth?: number; webpHeight?: number } | null }[];
  };
  it("maps each pilot to an existing event and keeps only paintings about the passage", () => {
    expect(rec.snapshot).toBe("2026-10-19");
    expect(rec.pilots.map((p) => p.event)).toEqual(RECEPTION_SUBJECTS.map((s) => s.event));
    for (const p of rec.pilots) expect(timeline.events.some((e) => e.id === p.event)).toBe(true);
    // 145 paintings for the parable in the snapshot, one of them left out (it shows John 4)
    expect(rec.pilots.map((p) => p.works.length)).toEqual([144, 10]);
    for (const p of rec.pilots) {
      expect(new Set(p.works.map((w) => w.qid)).size).toBe(p.works.length);
      for (const w of p.works) {
        expect(w.qid).toMatch(/^Q\d+$/);
        expect(WRONG_SUBJECT[w.qid]).toBeUndefined();
      }
    }
  });
  it("shows an image only from a public-domain Commons page, checked by eye, before 1900", () => {
    const shown = rec.pilots.flatMap((p) => p.works.filter((w) => w.image));
    expect(shown.length).toBe(4);
    for (const w of shown) {
      const f = commons.files.find((x) => x.qid === w.qid)!;
      expect(f.publicDomain).toBe(true);
      expect(f.licenseShort.every((s) => /^(public domain|pd\b|pdm\b|cc0\b)/i.test(s))).toBe(true);
      expect(IMAGE_REVIEW[w.qid]).toBe(true);
      expect(w.year).toBeLessThan(1900);
      expect(w.image!.file).toBe(f.file);
      const path = join(SITE, "public", f.thumbnail!.webp!);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(f.thumbnail!.webpSha256);
      expect(Math.max(f.thumbnail!.webpWidth!, f.thumbnail!.webpHeight!)).toBeLessThanOrEqual(400);
    }
    // nothing else in public/recepcao/
    expect(readdirSync(join(SITE, "public/recepcao")).sort()).toEqual(shown.map((w) => w.image!.src.replace("/recepcao/", "")).sort());
    // every thumbnail that was looked at and refused stays out
    for (const [qid, verdict] of Object.entries(IMAGE_REVIEW)) if (verdict !== true) expect(shown.some((w) => w.qid === qid)).toBe(false);
  });
});
