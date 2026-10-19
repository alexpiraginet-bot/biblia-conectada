// Reception pilot ("Recepção cultural"): works of art about two passages, from a Wikidata snapshot (CC0) kept in
// fontes/wikidata-recepcao/. Only paintings enter the "Pintura" lane; the titles are Wikidata's Portuguese labels, or the
// English label marked as such. An image is shown only when (1) the work is from before 1900, (2) its Commons file page
// states public domain (fontes/wikidata-recepcao/commons-arquivos.json, read on 2026-10-19), (3) its thumbnail is in
// site/public/recepcao/ with the recorded SHA-256, and (4) it passed the visual check below (CLAUDE.md rule 8: no
// children's faces). Commons answered 429 to most requests that day, so few thumbnails could be fetched.
// Literature and ethical debate have no free structured source yet, so their lanes stay empty with a sentence.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, SITE, sha256 } from "./sources";

export const RECEPTION_DIR = join(REPO, "fontes/wikidata-recepcao");
const PAINTING = "http://www.wikidata.org/entity/Q3305213";

/** Thumbnails looked at one by one on 2026-10-19: true = shown; otherwise the reason it is not. */
export const IMAGE_REVIEW: Record<string, true | string> = {
  Q114706800: true, // landscape, two small adult figures
  Q18686218: true, // the Samaritan and the wounded man, a donkey and dogs
  Q28555658: true, // the Samaritan and the wounded man; two small adults far behind
  Q5963059: true, // God and the animals, no other figure
  Q115670464: "uma figura jovem com o rosto visível (regra 8: sem rostos de crianças)",
  Q21558277: "um menino segura o cavalo (regra 8: sem rostos de crianças)",
  Q117337993: "a pintura mostra Jesus e a samaritana no poço (João 4), não a parábola",
};

/** Works the Wikidata snapshot links to the passage by mistake, left out of the list (reason shown in the data). */
export const WRONG_SUBJECT: Record<string, string> = {
  Q117337993: "“La Samaritaine” (Marcantonio Franceschini) mostra Jesus e a samaritana no poço (João 4), não a parábola",
};

type CommonsFile = {
  qid: string;
  file: string;
  page: string;
  author: string | null;
  date: string | null;
  licenseShort: string[];
  publicDomain: boolean;
  thumbnail: { webp?: string; webpWidth?: number; webpHeight?: number; webpSha256?: string } | null;
};

export type WorkImage = { src: string; width: number; height: number; file: string; page: string; author: string | null; date: string | null };

/** Which snapshot feeds which Theographic event (pilot: two passages). Labels are the subjects' Wikidata pt labels. */
export const RECEPTION_SUBJECTS = [
  { file: "bom-samaritano", event: 423, subjects: ["Q261103"], label: "“Bom samaritano” (Wikidata Q261103) e suas partes" },
  { file: "criacao-luz", event: 1, subjects: ["Q137651", "Q2704440"], label: "“História da criação no Gênesis” (Wikidata Q137651) e “Fiat Lux” (Q2704440)" },
] as const;

export type Work = {
  qid: string;
  /** Wikidata's Portuguese label; when there is none, the English label with titleLang "en"; null when neither exists */
  title: string | null;
  titleLang: "pt" | "en" | null;
  creator: string | null;
  /** earliest inception year (ISO astronomical), null when undated */
  year: number | null;
  /** image file named on Wikidata */
  commonsFile: string | null;
  /** thumbnail shown on the site, with the credit read from the Commons file page; null when not checked or not kept */
  image: WorkImage | null;
};

function readCommons(): Map<string, CommonsFile> {
  const data = JSON.parse(readFileSync(join(RECEPTION_DIR, "commons-arquivos.json"), "utf8")) as { files: CommonsFile[] };
  return new Map(data.files.map((f) => [f.qid, f]));
}

const PD = /^(public domain|pd\b|pdm\b|cc0\b)/i;

/** The checked thumbnail of a work, or null. Throws when a kept thumbnail is missing or differs from the record. */
function imageFor(qid: string, year: number | null, commons: Map<string, CommonsFile>): WorkImage | null {
  const f = commons.get(qid);
  const t = f?.thumbnail;
  if (!f || !t?.webp || IMAGE_REVIEW[qid] !== true || year === null || year >= 1900) return null;
  if (!f.publicDomain || !f.licenseShort.length || !f.licenseShort.every((s) => PD.test(s))) throw new Error(`[reception] ${qid}: licence is not public domain`);
  const path = join(SITE, "public", t.webp);
  if (!existsSync(path) || sha256(path) !== t.webpSha256) throw new Error(`[reception] ${t.webp} is missing or differs from commons-arquivos.json`);
  return { src: `/${t.webp}`, width: t.webpWidth!, height: t.webpHeight!, file: f.file, page: f.page, author: f.author, date: f.date };
}

type Binding = Record<string, { value: string }>;

export function readWorks(file: string): Work[] {
  const data = JSON.parse(readFileSync(join(RECEPTION_DIR, `${file}.json`), "utf8")) as { results: { bindings: Binding[] } };
  const byQ = new Map<string, Map<string, Set<string>>>();
  for (const b of data.results.bindings) {
    const q = b.work.value.replace(/^.*\//, "");
    const w = byQ.get(q) ?? new Map<string, Set<string>>();
    for (const [k, v] of Object.entries(b)) (w.get(k) ?? w.set(k, new Set()).get(k)!).add(v.value);
    byQ.set(q, w);
  }
  const first = (w: Map<string, Set<string>>, k: string) => [...(w.get(k) ?? [])].sort()[0] ?? null;
  const works: Work[] = [];
  const commons = readCommons();
  for (const [qid, w] of byQ) {
    if (!w.get("type")?.has(PAINTING) || WRONG_SUBJECT[qid]) continue;
    const pt = first(w, "labelPt");
    const en = first(w, "labelEn");
    const years = [...(w.get("inception") ?? [])].map((s) => Number(/^(-?\d+)-/.exec(s)?.[1])).filter((n) => Number.isFinite(n));
    const image = first(w, "image");
    const year = years.length ? Math.min(...years) : null;
    works.push({
      qid,
      title: pt ?? en,
      titleLang: pt ? "pt" : en ? "en" : null,
      creator: first(w, "creatorPt") ?? first(w, "creatorEn"),
      year,
      commonsFile: image ? decodeURIComponent(image.replace(/^.*Special:FilePath\//, "")) : null,
      image: imageFor(qid, year, commons),
    });
  }
  return works.sort((a, b) => (a.year ?? 1e9) - (b.year ?? 1e9) || a.qid.localeCompare(b.qid, "en", { numeric: true }));
}

export function buildReception(input: { write: (rel: string, data: string) => void }) {
  const files = ["bom-samaritano.json", "bom-samaritano.rq", "criacao-luz.json", "criacao-luz.rq", "commons-arquivos.json", "LEIA-ME.md"];
  const source = Object.fromEntries(files.map((f) => [`fontes/wikidata-recepcao/${f}`, sha256(join(RECEPTION_DIR, f))]));
  const readme = readFileSync(join(RECEPTION_DIR, "LEIA-ME.md"), "utf8");
  const snapshot = /Consulta feita em (\d{4}-\d{2}-\d{2})/.exec(readme)?.[1];
  if (!snapshot) throw new Error("[reception] LEIA-ME.md lacks the snapshot date");
  const pilots = RECEPTION_SUBJECTS.map((s) => {
    const raw = readFileSync(join(RECEPTION_DIR, `${s.file}.json`), "utf8");
    // works Wikidata links to the passage by mistake: left out of the list, the reason kept with the pilot
    const excluded = Object.entries(WRONG_SUBJECT)
      .filter(([q]) => raw.includes(`/entity/${q}"`))
      .map(([qid, reason]) => ({ qid, reason }));
    return { ...s, subjects: [...s.subjects], works: readWorks(s.file), excluded };
  });
  // every thumbnail in site/public/recepcao/ belongs to a work shown with it
  const shown = new Set(pilots.flatMap((p) => p.works.flatMap((w) => (w.image ? [w.image.src.replace(/^\//, "")] : []))));
  const dir = join(SITE, "public/recepcao");
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) if (!shown.has(`recepcao/${f}`)) throw new Error(`[reception] public/recepcao/${f} is not a checked thumbnail of a work`);
  }
  input.write("recepcao.json", JSON.stringify({
    format: "biblia-conectada/recepcao@1",
    snapshot,
    source,
    license: "Wikidata: CC0 (dados estruturados). Imagens: Wikimedia Commons, só arquivos cuja página diz domínio público, conferidos um por um",
    lanes: ["pintura", "literatura", "debate"],
    review: IMAGE_REVIEW,
    wrongSubject: WRONG_SUBJECT,
    pilots,
  }));
  return { snapshot, pilots };
}
