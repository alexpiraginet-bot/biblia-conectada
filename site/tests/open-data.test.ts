// The open data bundle at public/dados/v1/ (scripts/data/open-data.ts, documented in DADOS.md). Its files must agree
// with the pipeline's numbers, with their own descriptions (datapackage.json, manifest.json, SHA256SUMS) and with the
// data the site itself reads. The leak guard over public/ (tests/sources.test.ts) covers these files too.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { unzipSync } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import { createGrid } from "../src/lib/canon/grid";
import { formatInt } from "../src/lib/canon/text";
import type { DadosManifest } from "../src/lib/dados";
import { readNpz } from "../scripts/data/npz";
import { ZIP_NAME } from "../scripts/data/open-data";
import { OUT, REPO, SRC } from "../scripts/data/sources";
import { bookFile, books, generated, summary } from "./generated";

const DIR = join(OUT.publicDados, "v1");
const raw = (p: string) => readFileSync(join(DIR, p));
const text = (p: string) => readFileSync(join(DIR, p), "utf8");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

/** RFC 4180 reader, written apart from the writer in open-data.ts so the test does not share its mistakes. */
function parseCsv(s: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = 0;
  while (i < s.length) {
    let field = "";
    if (s[i] === '"') {
      i++;
      for (;;) {
        const q = s.indexOf('"', i);
        if (q < 0) throw new Error("unterminated quoted field");
        field += s.slice(i, q);
        if (s[q + 1] === '"') {
          field += '"';
          i = q + 2;
        } else {
          i = q + 1;
          break;
        }
      }
    } else {
      let j = i;
      while (j < s.length && s[j] !== "," && s[j] !== "\n" && s[j] !== "\r") j++;
      field = s.slice(i, j);
      if (field.includes('"')) throw new Error(`stray quote in unquoted field: ${field}`);
      i = j;
    }
    row.push(field);
    if (s[i] === ",") i++;
    else {
      rows.push(row);
      row = [];
      if (s[i] === "\r") i++;
      if (s[i] === "\n") i++;
    }
  }
  return rows;
}

type Resource = {
  name: string;
  path: string;
  type?: string;
  format: string;
  bytes: number;
  hash: string;
  schema?: { fields: { name: string; type: string }[]; primaryKey: string[] };
};
type DataPackage = { resources: Resource[]; licenses: { name?: string }[] };

let manifest: DadosManifest;
let dp: DataPackage;
const tables = new Map<string, { header: string[]; rows: string[][] }>();
const table = (path: string) => {
  let t = tables.get(path);
  if (!t) {
    const [header, ...rows] = parseCsv(text(path));
    t = { header, rows };
    tables.set(path, t);
  }
  return t;
};

beforeAll(() => {
  manifest = JSON.parse(text("manifest.json"));
  dp = JSON.parse(text("datapackage.json"));
});

describe("ligacoes.csv", () => {
  it("has one row per distinct pair of different verses: summary.json pairs minus the self-pairs", () => {
    const c = summary().counts;
    const { header, rows } = table("ligacoes.csv");
    expect(rows.length).toBe(c.pairs - c.selfPairs);
    expect(rows.length).toBe(301584 - 45);
    for (const r of rows) expect(r.length).toBe(header.length);
  });

  it("holds exactly the pairs and votes of xref.npz (written by the Python analysis of the videos)", () => {
    const { header, rows } = table("ligacoes.csv");
    const col = (n: string) => header.indexOf(n);
    const [ia, ib, iv, im] = ["indice_a", "indice_b", "votos", "votos_max"].map(col);
    const mine = rows.map((r) => `${r[ia]}-${r[ib]}:${r[iv]}:${r[im]}`);
    const z = readNpz(SRC.xrefNpz);
    const ref: string[] = [];
    for (let k = 0; k < z.a.data.length; k++) {
      const a = z.a.data[k], b = z.b.data[k];
      if (a !== b) ref.push(`${Math.min(a, b)}-${Math.max(a, b)}:${z.votes.data[k]}:${z.vmax.data[k]}`);
    }
    expect(mine.slice().sort()).toEqual(ref.sort());
  });

  it("names both verses as the site does and keeps the directed votes consistent", () => {
    const grid = createGrid(books());
    const { header, rows } = table("ligacoes.csv");
    const c = Object.fromEntries(header.map((h, k) => [h, k]));
    let prev = -1;
    for (const r of rows) {
      const a = Number(r[c.indice_a]), b = Number(r[c.indice_b]);
      expect(a).toBeLessThan(b);
      expect(a * 40000 + b).toBeGreaterThan(prev); // ordered by (a, b), no repeats
      prev = a * 40000 + b;
      for (const [gv, ref, osis] of [[a, r[c.referencia_a], r[c.osis_a]], [b, r[c.referencia_b], r[c.osis_b]]] as const) {
        const loc = grid.locate(gv);
        expect(ref).toBe(`${loc.book.name} ${loc.chapter}:${loc.verse}`);
        expect(osis).toBe(`${loc.book.osis}.${loc.chapter}.${loc.verse}`);
      }
      const ab = r[c.votos_a_para_b], ba = r[c.votos_b_para_a];
      const dir = r[c.direcao];
      expect(dir === "ambas" ? ab !== "" && ba !== "" : dir === "a_para_b" ? ab !== "" && ba === "" : ab === "" && ba !== "").toBe(true);
      const directed = [ab, ba].filter((v) => v !== "").map(Number);
      expect(Number(r[c.votos])).toBe(directed.reduce((s, v) => s + v, 0));
      expect(Number(r[c.votos_max])).toBe(Math.max(...directed));
    }
  });
});

describe("datapackage.json", () => {
  it("declares, for every CSV, the field names of its header row, in order", () => {
    const csvs = dp.resources.filter((r) => r.format === "csv");
    expect(csvs.map((r) => r.path).sort()).toEqual(["capitulos-arestas.csv", "capitulos.csv", "ligacoes.csv", "versiculos.csv"]);
    for (const r of csvs) {
      expect(r.type, r.path).toBe("table");
      expect(r.schema!.fields.map((f) => f.name), r.path).toEqual(table(r.path).header);
    }
  });

  it("declares the keys of every record of livros.json", () => {
    const r = dp.resources.find((x) => x.path === "livros.json")!;
    expect(r.type).toBe("table");
    const records = JSON.parse(text("livros.json")) as Record<string, unknown>[];
    expect(records).toHaveLength(66);
    for (const rec of records) expect(Object.keys(rec)).toEqual(r.schema!.fields.map((f) => f.name));
  });

  it("lists every data file once, with its real size and SHA-256", () => {
    const dataFiles = manifest.arquivos.filter((f) => !["datapackage.json", "LEIA-ME.md", "LICENSE.txt", ZIP_NAME].includes(f.caminho));
    expect(dp.resources.map((r) => r.path).sort()).toEqual(dataFiles.map((f) => f.caminho).sort());
    for (const r of dp.resources) {
      const b = raw(r.path);
      expect(r.bytes, r.path).toBe(b.byteLength);
      expect(r.hash, r.path).toBe(`sha256:${sha(b)}`);
    }
  });

  it("gives the BLIVRE text its own licence and the derived data CC BY-SA 4.0", () => {
    for (const r of dp.resources) {
      const names = (r as unknown as { licenses: { name?: string; path?: string }[] }).licenses.map((l) => l.name ?? l.path);
      if (r.path.startsWith("texto/")) expect(names, r.path).toEqual(["CC-BY-4.0"]);
      else expect(names[0], r.path).toBe("CC-BY-SA-4.0");
    }
  });
});

describe("SHA256SUMS", () => {
  const listed = () =>
    new Map(text("SHA256SUMS").trim().split("\n").map((l) => {
      const [hash, ...name] = l.split("  ");
      return [name.join("  "), hash] as const;
    }));
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
  }

  it("matches every file it lists", () => {
    const sums = listed();
    expect(sums.size).toBeGreaterThan(70);
    for (const [name, hash] of sums) expect(sha(raw(name)), name).toBe(hash);
  });

  it("lists every file of the bundle except itself", () => {
    const files = walk(DIR).map((f) => relative(DIR, f)).filter((f) => f !== "SHA256SUMS").sort();
    expect([...listed().keys()].sort()).toEqual(files);
  });
});

describe("texto/", () => {
  it("carries the BLIVRE credit line of ATTRIBUTION.md and the text unchanged, in every book", () => {
    const { blivreCredit } = generated<{ blivreCredit: string }>("credits.json");
    expect(blivreCredit).toMatch(/^Todas as Escrituras em português citadas são da Bíblia Livre \(BLIVRE\)/);
    for (const b of books()) {
      const path = `texto/${b.slug}.json`;
      const s = text(path);
      expect(s, path).toContain(blivreCredit);
      const f = JSON.parse(s) as { credito: string; licenca: string; osis: string; capitulos: string[][] };
      expect(f.credito).toBe(blivreCredit);
      expect(f.licenca).toBe("CC BY 4.0 Brasil");
      expect(f.osis).toBe(b.osis);
      expect(f.capitulos).toEqual(bookFile(b.slug).chapters.map((ch) => ch.map((v) => v.t)));
    }
    for (const doc of ["LEIA-ME.md", "LICENSE.txt"]) expect(text(doc), doc).toContain(blivreCredit);
  });
});

describe("manifest.json", () => {
  it("is the copy the /dados page reads", () => {
    expect(readFileSync(join(OUT.generated, "dados-manifest.json"), "utf8")).toBe(text("manifest.json"));
  });

  it("states the real size, SHA-256 and record count of every file", () => {
    const all = new Set<string>();
    for (const f of manifest.arquivos) {
      all.add(f.caminho);
      const b = raw(f.caminho);
      expect(statSync(join(DIR, f.caminho)).size, f.caminho).toBe(f.bytes);
      expect(sha(b), f.caminho).toBe(f.sha256);
      let count: number | undefined;
      if (f.formato === "csv") count = table(f.caminho).rows.length;
      else if (f.caminho === "livros.json") count = JSON.parse(text(f.caminho)).length;
      else if (f.caminho.startsWith("texto/")) count = (JSON.parse(text(f.caminho)).capitulos as string[][]).flat().length;
      else if (f.formato === "zip") count = Object.keys(unzipSync(b)).length;
      expect(f.registros, f.caminho).toBe(count);
    }
    // everything but the manifest itself and SHA256SUMS, which lists the manifest
    expect(all.size).toBe(manifest.arquivos.length);
    expect(all.has("manifest.json") || all.has("SHA256SUMS")).toBe(false);
  });

  it("repeats the counts of summary.json", () => {
    const c = summary().counts;
    expect(manifest.contagens).toMatchObject({
      livros: c.books, capitulos: c.chapters, versiculos: c.verses, linhasOpenBible: c.crossrefRows, paresUnicos: c.pairs,
      autoPares: c.selfPairs, paresLigados: c.arcs, versiculosComLigacao: c.versesWithLinks, arestasCapitulos: c.chapterEdges,
    });
    const { header, rows } = table("ligacoes.csv");
    const iv = header.indexOf("votos");
    let min = Infinity, max = -Infinity;
    for (const r of rows) {
      min = Math.min(min, Number(r[iv]));
      max = Math.max(max, Number(r[iv]));
    }
    expect([manifest.contagens.votosMin, manifest.contagens.votosMax]).toEqual([min, max]);
    // the range the videos published for the 301,584 pairs (HANDOFF §4.2); no self-pair sits at either end
    expect([min, max]).toEqual([-86, 1477]);
  });
});

describe("versiculos.csv, capitulos.csv and capitulos-arestas.csv", () => {
  it("give every verse the link count the site shows", () => {
    const { header, rows } = table("versiculos.csv");
    expect(rows).toHaveLength(31102);
    const iL = header.indexOf("ligacoes");
    const site: number[] = [];
    for (const b of books()) for (const ch of bookFile(b.slug).chapters) for (const v of ch) site.push(v.l.length);
    expect(rows.map((r) => Number(r[iL]))).toEqual(site);
    expect(rows.reduce((s, r, gv) => s + (Number(r[0]) === gv ? Number(r[iL]) : NaN), 0)).toBe(2 * summary().counts.arcs);
    const top = summary().topVerses[0];
    expect(rows[top.gv][header.indexOf("referencia")]).toBe(top.ref);
    expect(Number(rows[top.gv][iL])).toBe(top.links);
  });

  it("are the chapter graph of the site, accounting for every pair", () => {
    type G = { nodes: { x: number; y: number; degree: number; internal: number }[]; edges: { count: number } };
    const g = JSON.parse(readFileSync(join(OUT.publicData, "chapter-graph.json"), "utf8")) as G;
    const chapterPairs = generated<number[]>("chapter-pairs.json");
    const nodes = table("capitulos.csv");
    const col = (n: string) => nodes.header.indexOf(n);
    expect(nodes.rows).toHaveLength(1189);
    nodes.rows.forEach((r, ci) => {
      expect(Number(r[col("indice")])).toBe(ci);
      expect([Number(r[col("x")]), Number(r[col("y")])]).toEqual([g.nodes[ci].x, g.nodes[ci].y]);
      expect(Number(r[col("pares_entre_capitulos")])).toBe(g.nodes[ci].degree);
      expect(Number(r[col("pares_internos")])).toBe(g.nodes[ci].internal);
      expect(Number(r[col("pares")])).toBe(chapterPairs[ci]);
    });
    const edges = table("capitulos-arestas.csv");
    expect(edges.rows).toHaveLength(g.edges.count);
    const iP = edges.header.indexOf("pares");
    const between = edges.rows.reduce((s, r) => s + Number(r[iP]), 0);
    const internal = nodes.rows.reduce((s, r) => s + Number(r[col("pares_internos")]), 0);
    expect(between + internal).toBe(summary().counts.arcs);
  });
});

describe("estudos/natal.json", () => {
  it("repeats the numbers of the study the site computed", () => {
    type N = { pairsAll: number; pairsMaxVoteGt0: number; otVersesAll: number; otBooksAll: number; otBooksMissing: string[];
      birthChapterVerses: number; keyPairs: { ot: string; nt: string; votes: number }[]; top: { ot: string; nt: string; max: number; sum: number }[] };
    const n = generated<N>("studies/natal.json");
    const pub = JSON.parse(text("estudos/natal.json"));
    expect(pub).toMatchObject({
      pares: n.pairsAll,
      pares_com_voto_positivo: n.pairsMaxVoteGt0,
      versiculos_at: n.otVersesAll,
      livros_at: n.otBooksAll,
      livros_at_sem_par_com_voto_positivo: n.otBooksMissing,
      versiculos_nos_capitulos_do_nascimento: n.birthChapterVerses,
      pares_chave: n.keyPairs.map((p) => ({ at: p.ot, nt: p.nt, votos: p.votes })),
    });
    expect(pub.pares_mais_fortes.map((p: { at: string; nt: string; votos_max: number; votos: number }) => [p.at, p.nt, p.votos_max, p.votos]))
      .toEqual(n.top.map((p) => [p.ot, p.nt, p.max, p.sum]));
    expect(pub.pares).toBe(2094);
  });
});

describe("DADOS.md", () => {
  it("states the record counts of the manifest in its summary table", () => {
    const doc = readFileSync(join(REPO, "DADOS.md"), "utf8");
    const row = (name: string) => doc.split("\n").find((l) => l.startsWith(`| [\`${name}\`]`));
    for (const f of manifest.arquivos.filter((x) => x.registros !== undefined && !x.caminho.startsWith("texto/") && x.formato !== "zip")) {
      expect(row(f.caminho), f.caminho).toContain(`| ${formatInt(f.registros!)} ${f.unidade} |`);
    }
    const verses = manifest.arquivos.filter((x) => x.caminho.startsWith("texto/")).reduce((s, x) => s + x.registros!, 0);
    expect(row("texto/<livro>.json")).toContain(`| ${formatInt(verses)} versículos |`);
  });
});

describe(ZIP_NAME, () => {
  it("holds the same bytes as the loose files, with its own SHA256SUMS", () => {
    const entries = unzipSync(raw(ZIP_NAME));
    const names = Object.keys(entries).map((n) => n.replace(/^biblia-conectada-dados-v1\//, ""));
    expect(Object.keys(entries).every((n) => n.startsWith("biblia-conectada-dados-v1/"))).toBe(true);
    const loose = manifest.arquivos.filter((f) => f.caminho !== ZIP_NAME).map((f) => f.caminho);
    expect(names.sort()).toEqual([...loose, "SHA256SUMS"].sort());
    for (const [n, b] of Object.entries(entries)) {
      const p = n.replace(/^biblia-conectada-dados-v1\//, "");
      if (p !== "SHA256SUMS") expect(sha(b), p).toBe(sha(raw(p)));
    }
    const inner = new TextDecoder().decode(entries["biblia-conectada-dados-v1/SHA256SUMS"]).trim().split("\n");
    const outer = new Set(text("SHA256SUMS").trim().split("\n"));
    expect(inner.length).toBe(loose.length);
    for (const l of inner) expect(outer.has(l), l).toBe(true);
  });
});
