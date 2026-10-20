// The living map (src/lib/explore/atlas-motion.ts, design/README.md §7.1): the trunks grow in the order of the canon,
// and on the real map of Isaías 9 a trunk with more votes carries a bead of light more often, as the legend says
// ("Pulso de luz mais frequente, mais votos"), on phones and on the wide map.
import { describe, expect, it } from "vitest";
import { GROUPS } from "../src/lib/explore/atlas";
import { atlasOf } from "../src/lib/explore/atlas-data";
import { enterAt, flowPeriod } from "../src/lib/explore/atlas-motion";
import { bookBySlug } from "../src/lib/reading";

describe("the living map", () => {
  it("grows the trunks in the order of the canon, all of them started within the first 0.6 s", () => {
    const t = GROUPS.map((_, k) => enterAt(k));
    expect(t[0]).toBe(0.1);
    for (let k = 1; k < t.length; k++) expect(t[k]).toBeGreaterThan(t[k - 1]);
    expect(t[t.length - 1]).toBeLessThanOrEqual(0.6);
  });

  it("runs light more often along the trunks with more votes, from every 4.4 s to every 2.2 s", async () => {
    expect(flowPeriod(0.8)).toBe(4.4);
    expect(flowPeriod(4.8)).toBe(2.2);
    const atlas = await atlasOf(bookBySlug("isaias")!, 9);
    for (const l of [atlas.wide, atlas.narrow]) {
      const trunks = l.hubs.filter((h) => h.trunkW > 0).map((h) => ({ votes: atlas.groups[h.k].votes, period: flowPeriod(h.trunkW) }));
      expect(trunks).toHaveLength(8);
      for (const a of trunks) for (const b of trunks) if (a.votes > b.votes) expect(a.period).toBeLessThanOrEqual(b.period);
      const periods = trunks.map((x) => x.period);
      // not one rhythm for all: the strongest group (Profetas, 2.445 votes) pulses every 2.2 s, the weakest far less often
      expect(Math.min(...periods)).toBe(2.2);
      expect(Math.max(...periods)).toBeGreaterThan(3.5);
    }
  });
});
