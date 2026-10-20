// The map's motion (design/README.md §7.1) in numbers the map (components/explore/AtlasMap.tsx) and its test share.

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** When a group's trunk starts growing on the map's entrance, in seconds: the groups in the order of the canon. */
export const enterAt = (k: number) => r3(0.1 + 0.065 * k);

/**
 * How often a bead of light runs along a trunk, in seconds: every 4.4 s on the weakest, every 2.2 s on the strongest,
 * by the same √ of the votes that sets the trunk's width (src/lib/explore/atlas.ts: 0.8 + 4 × √(votes / most)).
 */
export const flowPeriod = (trunkW: number) => r3(4.4 - 2.2 * Math.min(1, Math.max(0, (trunkW - 0.8) / 4)));
