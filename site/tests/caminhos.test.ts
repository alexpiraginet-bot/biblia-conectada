import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import places from "../src/data/journey-places.json";
import { JOURNEY_STOPS, jesusJourney, type JourneyData } from "../src/lib/caminhos";
import { parseSide } from "../src/lib/conexao";
import { eventById } from "../src/lib/timeline";
import { bookFile, books } from "./generated";

let journey: JourneyData;
beforeAll(async () => { journey = await jesusJourney(); });

const allBooks = books();
function verseAt(gv: number) {
  const book = allBooks.findLast((b) => b.firstVerse <= gv)!;
  let offset = gv - book.firstVerse;
  let chapter = 0;
  while (offset >= book.verses[chapter]) offset -= book.verses[chapter++];
  return { book, chapter: chapter + 1, verse: offset + 1, data: bookFile(book.slug).chapters[chapter][offset] };
}

describe("the illustrated journey through the Gospels", () => {
  it("preserves the exact BLIVRE wording of every main and parallel passage", () => {
    expect(journey.stops).toHaveLength(8);
    for (const stop of journey.stops) {
      for (const passage of [stop.passage, ...stop.parallels]) {
        expect(passage.verses.length).toBeGreaterThan(0);
        for (const verse of passage.verses) {
          const original = verseAt(verse.gv);
          expect(verse.text, passage.label).toBe(original.data.t);
          expect(passage.slug).toBe(original.book.slug);
          expect(passage.chapter).toBe(original.chapter);
          expect(verse.n).toBe(original.verse);
        }
      }
      const spec = JOURNEY_STOPS.find((s) => s.id === stop.id)!;
      const [slug, chapter, verse] = spec.sourceName;
      expect(bookFile(slug).chapters[chapter - 1][verse - 1].t.toLocaleLowerCase("pt-BR")).toContain(stop.place.toLocaleLowerCase("pt-BR"));
    }
  });

  it("uses original OpenBible coordinates, preserving uncertain-location provenance", () => {
    const input = readFileSync(resolve("..", places.input));
    expect(createHash("sha256").update(input).digest("hex")).toBe(places.sourceSha256);
    const originals = new Map(input.toString("utf8").trim().split(/\r?\n/).map((line) => {
      const row = JSON.parse(line);
      return [row.id, row] as const;
    }));
    for (const place of places.places) {
      const source = originals.get(place.ancientId);
      const original = source.identifications[place.identification].resolutions[place.resolution];
      const [longitude, latitude] = original.lonlat.split(",").map(Number);
      expect({ longitude: place.longitude, latitude: place.latitude }).toEqual({ longitude, latitude });
      expect(place.alternatives).toBe(source.identifications.length);
      const stop = journey.stops.find((s) => s.sourceUrl === place.sourceUrl)!;
      expect(stop.longitude).toBe(longitude);
      expect(stop.latitude).toBe(latitude);
      expect(stop.x).toBeGreaterThan(0);
      expect(stop.x).toBeLessThan(800);
      expect(stop.y).toBeGreaterThan(0);
      expect(stop.y).toBeLessThan(850);
    }
    expect(journey.stops.find((s) => s.id === "cana")!.locationNote).toContain("discutida");
    expect(journey.stops.find((s) => s.id === "jordao")!.locationNote).toContain("não é conhecido");
    expect(journey.stops.find((s) => s.id === "galileia")!.locationNote).toContain("não permite");
  });

  it("offers only existing verse connections, with original vote counts and canonical routes", () => {
    for (const stop of journey.stops) {
      expect(stop.connections).toHaveLength(4);
      expect(new Set(stop.connections.map((c) => c.to)).size).toBe(stop.connections.length);
      for (const connection of stop.connections) {
        const source = verseAt(connection.from), target = verseAt(connection.to);
        expect(stop.passage.verses.some((v) => v.gv === connection.from)).toBe(true);
        expect(source.data.l.some(([gv, votes]) => gv === connection.to && votes === connection.votes)).toBe(true);
        expect(connection.text).toBe(target.data.t);
        const [, route, a, b] = connection.href.split("/");
        expect(route).toBe("conexao");
        const endpoints = [source, target].sort((x, y) => x.book.index - y.book.index || x.chapter - y.chapter || x.verse - y.verse);
        [a, b].forEach((segment, i) => expect(parseSide(segment)).toEqual({
          slug: endpoints[i].book.slug, chapter: endpoints[i].chapter, verse: endpoints[i].verse,
        }));
      }
    }
  });

  it("grounds approximate dates in the source events and distinguishes different Gospel episodes", () => {
    for (const stop of journey.stops) {
      const event = eventById(stop.eventId)!;
      expect(event).toBeTruthy();
      expect(event.year).toBe(stop.year);
      expect(stop.passage.verses.some((v) => event.verses.includes(v.gv))).toBe(true);
      expect(stop.eventPath).toBe(`/linha-do-tempo/${event.slug}`);
      expect(stop.date.startsWith("c. ")).toBe(true);
    }
    expect(journey.stops.find((s) => s.id === "cana")!.parallelNote).toContain("sem um relato paralelo");
    expect(journey.stops.find((s) => s.id === "jerico")!.parallels[0].note).toContain("Não é o mesmo episódio");
    expect(JSON.parse(JSON.stringify(journey))).toEqual(journey);
  });
});
