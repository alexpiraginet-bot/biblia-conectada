// Medallion illustrations for the Explorar graph (HANDOFF §3.8, design/README.md §11): one generated picture per
// category, never per chapter. Every category assignment comes from a source field, so it is reproducible:
//   - books: Theographic books.json `bookDiv` (10 divisions merged into 8 groups; the two prophet divisions become
//     "Profetas" and the two epistle divisions become "Cartas", so the site never prints a claim about who wrote Hebrews);
//   - places: OpenBible ancient.jsonl `types` (first type of the place that has a group);
//   - people, people groups and events: one picture each.
// This module is pure (no network, no writes); scripts/medallions.ts generates, encodes and writes the manifest.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, SITE, readJson } from "./sources";

export const THEOGRAPHIC_BOOKS = join(REPO, "fontes/theographic/json/books.json");
export const OPENBIBLE_ANCIENT = join(REPO, "fontes/openbible-geo/ancient.jsonl");
/** shipped WebP files, served at /medalhoes/<id>-<size>.webp */
export const MEDALLION_DIR = join(SITE, "public/medalhoes");
/** provenance of every generation call: prompt, model, time, usage and the review verdict */
export const REVIEW_LOG = join(SITE, "scripts/data/medallions-review.json");
export const MANIFEST = join(SITE, "src/data/medalhoes.json");

export const SIZES = [96, 192] as const;
export type Size = (typeof SIZES)[number];
/** byte caps, enforced by tests/medalhoes.test.ts */
export const CAPS = { 96: 3 * 1024, 192: 8 * 1024, total: 200 * 1024 } as const;
/** at most this many generation calls, and at most 1 + 2 retries per group */
export const MAX_CALLS = 45;
export const MAX_ATTEMPTS = 3;
/**
 * Image model. On 2026-10-19, GET /v1/models listed no plain `gpt-image-2.5` (the id Alex named); the newest
 * `gpt-image*` entry by `created` was this dated snapshot. Listed then: gpt-image-1, -1-mini, -1.5, -2, -2-2026-04-21,
 * -2.5-flare, -2.5-sunburst, -2.5-flare-2026-09-08, -2.5-sunburst-2026-09-08.
 */
export const MODEL = "gpt-image-2.5-sunburst-2026-09-08";

export type Kind = "livro" | "lugar" | "pessoa" | "povo" | "evento";

export type GroupDef = {
  id: string;
  kind: Kind;
  /** category name in PT-BR, e.g. "Evangelhos" */
  category: string;
  /** what the picture shows, in PT-BR (short caption) */
  label: string;
  /** what the picture shows, in PT-BR (full sentence for alt text) */
  alt: string;
  /** subject of the picture, in English, for the image model */
  subject: string;
};

// Order: the 8 book groups in canon order, the 9 place groups by number of places, then people, groups, events.
export const GROUPS: readonly GroupDef[] = [
  {
    id: "pentateuco", kind: "livro", category: "Pentateuco",
    label: "Rolo fechado",
    alt: "Ilustração: um rolo fechado, enrolado em duas varas de madeira e amarrado com um cordão.",
    subject: "a closed scroll wound on two wooden rollers and tied with a cord, resting on a flat stone; rolled shut, so no writing shows",
  },
  {
    id: "historicos", kind: "livro", category: "Livros históricos",
    label: "Coroa",
    alt: "Ilustração: uma coroa simples de metal batido sobre um pano dobrado.",
    subject: "a plain ancient royal crown, a hammered metal circlet with low points and no jewels or symbols, resting on a folded cloth on a stone ledge",
  },
  {
    id: "poesia", kind: "livro", category: "Poesia e sabedoria",
    label: "Lira",
    alt: "Ilustração: uma lira de madeira em pé, apoiada numa pedra.",
    subject: "an ancient wooden lyre with a wooden yoke and a few strings, standing upright on a stone, nobody playing it",
  },
  {
    id: "profetas", kind: "livro", category: "Profetas",
    label: "Ramo de amendoeira",
    alt: "Ilustração: um ramo de amendoeira em flor sobre uma pedra.",
    subject: "a flowering almond branch with open blossoms, buds and a few young green almonds, lying across a rough stone",
  },
  {
    id: "evangelhos", kind: "livro", category: "Evangelhos",
    label: "Pães e peixes",
    alt: "Ilustração: um cesto de vime com pães redondos e dois peixes, sobre uma pedra.",
    subject: "a woven reed basket holding five round flat barley loaves and two small fish, standing on a plain stone",
  },
  {
    id: "atos", kind: "livro", category: "Atos",
    label: "Navio a vela",
    alt: "Ilustração: um navio mercante antigo, de uma vela quadrada, navegando no mar.",
    subject: "an ancient merchant sailing ship with one large square sail, under way on a moderate sea, seen from the side, no crew visible",
  },
  {
    id: "cartas", kind: "livro", category: "Cartas",
    label: "Carta selada",
    alt: "Ilustração: uma carta de papiro enrolada, amarrada e selada com barro, ao lado de uma pena de junco e um tinteiro.",
    subject: "a rolled papyrus letter tied with cord and closed with a plain unmarked clay seal, lying beside a reed pen and a small clay inkpot on a wooden table; rolled shut, so no writing shows",
  },
  {
    id: "apocalipse", kind: "livro", category: "Apocalipse",
    label: "Porta aberta no céu",
    alt: "Ilustração: uma porta antiga de tábuas, entreaberta sobre nuvens, num céu com pequenas estrelas.",
    subject: "a tall, heavy ancient door of rough wooden planks with iron straps and no handle or knob, standing half open in a plain stone frame on a bank of clouds; night sky with tiny round dot stars only (no sparkles, no four-pointed stars, no moon); soft light in the gap of the doorway, no beams",
  },
  {
    id: "cidade", kind: "lugar", category: "Cidade",
    label: "Cidade murada",
    alt: "Ilustração: uma pequena cidade murada de pedra clara no alto de um morro, vista de longe.",
    subject: "a small walled hilltop town of pale limestone at dusk, flat-roofed houses, one gate, terraced olive trees on the slope, seen from a distance, empty of people",
  },
  {
    id: "regiao", kind: "lugar", category: "Região",
    label: "Paisagem vista do alto",
    alt: "Ilustração: uma paisagem vista do alto, com morros secos até o horizonte, um rio numa planície e pequenas aldeias.",
    subject: "a wide Near Eastern landscape seen from a height: dry layered hills receding to a far horizon, a river winding through a plain with date palms and fields, a few tiny villages of flat-roofed mud-brick houses; no towers, steeples, domes or temples",
  },
  {
    id: "monte", kind: "lugar", category: "Monte",
    label: "Monte",
    alt: "Ilustração: um pico de montanha rochoso acima de morros mais baixos, com nuvens.",
    subject: "a single rocky mountain peak rising above lower foothills, a few drifting clouds around the summit, calm night sky",
  },
  {
    id: "agua", kind: "lugar", category: "Água",
    label: "Fonte",
    alt: "Ilustração: uma fonte que corre de uma fenda na rocha para um tanque raso de pedra, com juncos.",
    subject: "a spring flowing from a cleft in a rock into a shallow stone pool, reeds and grasses at the edge, ripples on the water",
  },
  {
    id: "vale", kind: "lugar", category: "Vale e campo",
    label: "Vale com campo de cevada",
    alt: "Ilustração: um vale com um campo de cevada madura, alguns feixes e uma oliveira antiga.",
    subject: "a gentle valley floor with a field of ripe barley, a few bound sheaves and one old olive tree, low hills on both sides",
  },
  {
    id: "construcao", kind: "lugar", category: "Construção",
    label: "Portão de pedra",
    alt: "Ilustração: um portão antigo de pedra entre duas torres, com as portas de madeira abertas.",
    subject: "an ancient Near Eastern city gate of large rough-cut stone blocks: a dark gateway passage under a flat stone lintel between two square towers with flat tops (no battlements, no arch), heavy wooden doors standing open, seen close, empty street beyond",
  },
  {
    id: "acampamento", kind: "lugar", category: "Acampamento",
    label: "Tendas no deserto",
    alt: "Ilustração: tendas baixas de pelo de cabra numa planície de deserto, à noite.",
    subject: "a few low black goat-hair tents pitched on a desert plain, tent ropes and pegs, low dunes; plain navy night sky with a few tiny round dot stars only (no moon, no sparkles, no four-pointed stars)",
  },
  {
    id: "ilha", kind: "lugar", category: "Ilha",
    label: "Ilha rochosa",
    alt: "Ilustração: uma pequena ilha rochosa num mar calmo, com algumas árvores no alto.",
    subject: "a small rocky island rising from a calm sea, steep cliffs, a few trees on its top, gentle waves around it, no boats",
  },
  {
    id: "caminho", kind: "lugar", category: "Caminho",
    label: "Estrada de pedra",
    alt: "Ilustração: uma estrada antiga calçada de pedras, entre morros baixos e um muro de pedra seca.",
    subject: "an ancient road paved with worn stones winding away between low hills, edged by a low dry-stone wall, vanishing toward the horizon",
  },
  {
    id: "pessoa", kind: "pessoa", category: "Pessoa",
    label: "Manto e sandálias",
    alt: "Ilustração: um manto de lã dobrado, um par de sandálias de couro e um odre sobre um muro baixo de pedra.",
    subject: "a folded wool cloak, a pair of worn leather sandals and a leather water-skin resting on a low stone wall beside a dirt path; objects only",
  },
  {
    id: "povo", kind: "povo", category: "Povo",
    label: "Rebanho no curral",
    alt: "Ilustração: um rebanho de ovelhas reunido num curral redondo de pedras.",
    subject: "a flock of sheep gathered inside a low round sheepfold of rough stacked stones, seen from slightly above, no shepherd",
  },
  {
    id: "evento", kind: "evento", category: "Evento",
    label: "Lamparina acesa",
    alt: "Ilustração: uma lamparina de barro acesa sobre um degrau de pedra gasto.",
    subject: "a clay oil lamp with a small steady flame on a worn stone step, casting a long soft shadow",
  },
];

/** Shared style for the whole set (one look; hard bans repeated in every prompt). */
export const STYLE =
  "Style: a fine steel-engraving or etching vignette. Crisp warm gold line work with hatching and cross-hatching and a " +
  "few pale gold highlights, printed on a flat, uniform deep navy ground (hex #051219) that fills the whole square. " +
  "Composition: one subject, centred and kept entirely inside a central circle about 70% of the width, with a bold, " +
  "simple silhouette and open navy space around it, so it reads at 96 pixels and survives a circular crop; corners " +
  "and edges are plain navy. Only gold tones on navy, no other colours. Calm, even light. " +
  "Strictly none of: text, letters, numbers, inscriptions or pseudo-writing; people, human figures, faces, hands or " +
  "children; light rays, beams, sunbursts, halos, glow or lens flare; Bible, open book or pages; dove; cross or any " +
  "other religious symbol; weapons, armour, eagle, fasces, flags or insignia; border, ring, frame or coin rim.";

export function promptFor(id: string): string {
  const g = GROUPS.find((x) => x.id === id);
  if (!g) throw new Error(`[medallions] unknown group ${id}`);
  return `Subject: ${g.subject}.\n${STYLE}`;
}

// --- books ---------------------------------------------------------------------------------------------------------

/** Theographic bookDiv -> group id */
export const BOOK_DIV_GROUP: Readonly<Record<string, string>> = {
  Pentateuch: "pentateuco",
  Historical: "historicos",
  "Poetry-Wisdom": "poesia",
  "Major Prophets": "profetas",
  "Minor Prophets": "profetas",
  Gospels: "evangelhos",
  Acts: "atos",
  "Pauline Epistles": "cartas",
  "General Epistles": "cartas",
  Revelation: "apocalipse",
};

type TheographicBook = { fields: { osisName: string; bookOrder: number; bookDiv: string } };

/** OSIS id -> group id for the 66 books, in canon order, from Theographic `bookDiv`. Throws on anything unmapped. */
export function bookGroupFromTheographic(path = THEOGRAPHIC_BOOKS): Record<string, string> {
  const rows = readJson<TheographicBook[]>(path).map((r) => r.fields).sort((a, b) => a.bookOrder - b.bookOrder);
  const out: Record<string, string> = {};
  for (const r of rows) {
    const g = BOOK_DIV_GROUP[r.bookDiv];
    if (!g) throw new Error(`[medallions] bookDiv "${r.bookDiv}" of ${r.osisName} has no group`);
    out[r.osisName] = g;
  }
  return out;
}

// --- places --------------------------------------------------------------------------------------------------------

/** OpenBible ancient place type -> group id (types without a group, such as "special", are skipped) */
export const PLACE_TYPE_GROUP: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries({
    cidade: ["settlement", "district in settlement"],
    regiao: ["region", "people group"],
    monte: ["mountain", "hill", "mountain range", "mountain ridge", "mountain pass", "cliff", "rock", "promontory"],
    agua: ["river", "body of water", "spring", "pool", "well", "wadi", "canal", "ford"],
    vale: ["valley", "natural area", "field", "garden", "tree", "forest"],
    construcao: ["gate", "structure", "fortification", "altar", "hall", "room", "stone heap", "mine"],
    acampamento: ["campsite"],
    ilha: ["island"],
    caminho: ["road"],
  }).flatMap(([g, types]) => types.map((t) => [t, g])),
);

/** The group of a place: the first of its OpenBible types that has one, or null. */
export function placeGroup(types: readonly string[]): string | null {
  for (const t of types) if (PLACE_TYPE_GROUP[t]) return PLACE_TYPE_GROUP[t];
  return null;
}

export type OpenBiblePlace = { id: string; friendly_id: string; types?: string[] };

export function openBiblePlaces(path = OPENBIBLE_ANCIENT): OpenBiblePlace[] {
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as OpenBiblePlace);
}

// --- people, groups, events ------------------------------------------------------------------------------------------

/** node kind -> group id for the kinds that have a single picture */
export const KIND_GROUP: Readonly<Record<"pessoa" | "povo" | "evento", string>> = { pessoa: "pessoa", povo: "povo", evento: "evento" };

// --- review log and manifest ---------------------------------------------------------------------------------------

export type ReviewEntry = {
  id: string;
  attempt: number;
  /** master file name (the 1024² PNG lives outside the repo) */
  master: string;
  model: string;
  /** ISO time from the API response's `created` */
  createdAt: string;
  prompt: string;
  quality: string;
  size: string;
  /** token usage reported by the API, when present */
  usage?: Record<string, unknown>;
  status: "pending" | "accepted" | "rejected";
  reason: string;
};

export type ReviewLog = { calls: ReviewEntry[]; errors: { id: string; at: string; error: string }[] };

export function readReviewLog(path = REVIEW_LOG): ReviewLog {
  return existsSync(path) ? readJson<ReviewLog>(path) : { calls: [], errors: [] };
}

export const fileName = (id: string, size: Size) => `${id}-${size}.webp`;
export const publicPath = (id: string, size: Size) => `/medalhoes/${fileName(id, size)}`;

export function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export type ManifestGroup = {
  id: string;
  kind: Kind;
  category: string;
  label: string;
  alt: string;
  src96: string;
  src192: string;
  prompt: string;
  model: string;
  createdAt: string;
  sha256: Record<`${Size}`, string>;
  bytes: Record<`${Size}`, number>;
};

export type Manifest = {
  version: 1;
  note: string;
  groups: Record<string, ManifestGroup>;
  bookGroup: Record<string, string>;
  placeTypeGroup: Record<string, string>;
  kindGroup: Record<string, string>;
};

/** The manifest, from the group definitions, the accepted review entries, Theographic and the shipped files. */
export function buildManifest(log: ReviewLog = readReviewLog(), dir = MEDALLION_DIR): Manifest {
  const groups: Record<string, ManifestGroup> = {};
  for (const g of GROUPS) {
    const accepted = log.calls.filter((c) => c.id === g.id && c.status === "accepted");
    if (accepted.length > 1) throw new Error(`[medallions] ${g.id} has ${accepted.length} accepted attempts`);
    const a = accepted[0];
    if (!a) continue;
    const file = (s: Size) => join(dir, fileName(g.id, s));
    if (!SIZES.every((s) => existsSync(file(s)))) throw new Error(`[medallions] ${g.id} is accepted but its WebP files are missing`);
    groups[g.id] = {
      id: g.id,
      kind: g.kind,
      category: g.category,
      label: g.label,
      alt: g.alt,
      src96: publicPath(g.id, 96),
      src192: publicPath(g.id, 192),
      prompt: a.prompt,
      model: a.model,
      createdAt: a.createdAt,
      sha256: { 96: sha256File(file(96)), 192: sha256File(file(192)) },
      bytes: { 96: readFileSync(file(96)).length, 192: readFileSync(file(192)).length },
    };
  }
  return {
    version: 1,
    note: "Written by `npx tsx scripts/medallions.ts manifest` from scripts/data/medallions.ts, scripts/data/medallions-review.json and public/medalhoes/. Do not edit by hand.",
    groups,
    bookGroup: bookGroupFromTheographic(),
    placeTypeGroup: { ...PLACE_TYPE_GROUP },
    kindGroup: { ...KIND_GROUP },
  };
}

/** Width and height of a WebP file (VP8, VP8L or VP8X), read from its header. */
export function webpSize(buf: Buffer): { width: number; height: number } {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") throw new Error("not a WebP file");
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 ") return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  throw new Error(`unknown WebP chunk ${chunk}`);
}
