// The word index of the search (src/components/search/), from the BLIVRE text the pipeline already checked.
// Words are runs of letters, lowercase, without accents (src/lib/words.ts: "Misericórdia" -> "misericordia"; digits
// and punctuation separate words). Every word is kept: no stopword list, so a phrase like "o senhor é meu pastor" can
// be found word by word. Written to public/data/busca/v1/ (format in src/components/search/format.ts):
//   index.json             counts, the verse at each rank and the link count of each rank
//   palavras/<x>/<y>.json  word -> ascending ranks (xy: the first two letters of the word; "_" for a one-letter word)
//   posicoes/<x>/<y>.json  word -> where it stands in each of those verses, read only for "phrases in quotes"
// The snippets of the results are the BLIVRE text itself, from public/data/text/<livro>/<capitulo>.json.
import { gzipSync } from "node:zlib";
import { tokenize, wordKey } from "../../src/lib/words";
import {
  encodeAscending,
  encodeOrder,
  INDEX_FORMAT,
  shardFile,
  shardOf,
  type IndexMeta,
  type PositionShard,
  type WordShard,
} from "../../src/components/search/format";

export type SearchTheme = { slug: string; label: string; key: string; topic: string; passages: number };

type Input = {
  text: readonly string[];
  /** per verse, its links (partner, votes, direction); the count is what the reading pages show */
  links: ReadonlyArray<ReadonlyArray<unknown>>;
  themes: readonly { slug: string; key: string; label: string; topic: string; passages: readonly unknown[] }[];
  /** writes under public/data/ */
  writePublic: (rel: string, data: string) => void;
  /** writes under src/data/generated/ */
  writeGenerated: (rel: string, data: string) => void;
};

export function buildSearchIndex({ text, links, themes, writePublic, writeGenerated }: Input) {
  const n = text.length;
  // rank: most links first, then canonical order
  const byRank = Array.from({ length: n }, (_, gv) => gv).sort((a, b) => links[b].length - links[a].length || a - b);
  const runs: [number, number][] = [];
  for (const gv of byRank) {
    const count = links[gv].length;
    const last = runs[runs.length - 1];
    if (last && last[0] === count) last[1]++;
    else runs.push([count, 1]);
  }

  // walking the verses in rank order makes every word's list come out ascending
  const words = new Map<string, { ranks: number[]; positions: (number | number[])[] }>();
  let tokens = 0;
  byRank.forEach((gv, rank) => {
    const here = new Map<string, number[]>();
    tokenize(text[gv]).forEach((w, i) => {
      const k = wordKey(w);
      if (!/^[a-z]+$/.test(k)) throw new Error(`[search] word "${w}" (verse ${gv}) does not reduce to a-z: "${k}"`);
      const at = here.get(k);
      if (at) at.push(i);
      else here.set(k, [i]);
      tokens++;
    });
    for (const [k, at] of here) {
      let e = words.get(k);
      if (!e) words.set(k, (e = { ranks: [], positions: [] }));
      e.ranks.push(rank);
      e.positions.push(at.length === 1 ? at[0] : at);
    }
  });

  const shards = new Map<string, string[]>();
  for (const k of [...words.keys()].sort()) {
    const s = shardOf(k);
    const list = shards.get(s);
    if (list) list.push(k);
    else shards.set(s, [k]);
  }
  const sizes: { shard: string; bytes: number; gzip: number }[] = [];
  let postings = 0;
  for (const [s, keys] of shards) {
    const w: WordShard = {};
    const p: PositionShard = {};
    for (const k of keys) {
      const e = words.get(k)!;
      w[k] = encodeAscending(e.ranks);
      p[k] = e.positions;
      postings += e.ranks.length;
    }
    const wj = JSON.stringify(w);
    writePublic(`busca/v1/palavras/${shardFile(s)}`, wj);
    writePublic(`busca/v1/posicoes/${shardFile(s)}`, JSON.stringify(p));
    sizes.push({ shard: s, bytes: Buffer.byteLength(wj), gzip: gzipSync(wj, { level: 9 }).length });
  }

  const meta: IndexMeta & Record<string, unknown> = {
    format: INDEX_FORMAT,
    verses: n,
    words: words.size,
    postings,
    runs,
    order: encodeOrder(byRank, runs),
    shards: [...shards.keys()],
    normalization: "palavras = sequências de letras (\\p{L}+), em minúsculas e sem acento; números e pontuação separam palavras",
    rank: "versículos do mais ligado ao menos ligado (parceiros únicos, como nas páginas de leitura), depois na ordem canônica",
    source: "texto da Bíblia Livre (BLIVRE), CC BY 4.0 Brasil; contagem de ligações: OpenBible.info (CC BY), dados derivados CC BY-SA 4.0",
  };
  const metaJson = JSON.stringify(meta);
  writePublic("busca/v1/index.json", metaJson);

  // the themes the palette can offer, from the same list the /tema pages publish
  const searchThemes: SearchTheme[] = themes.map((t) => ({ slug: t.slug, label: t.label, key: t.key, topic: t.topic, passages: t.passages.length }));
  writeGenerated("busca-temas.json", JSON.stringify(searchThemes));

  sizes.sort((a, b) => b.gzip - a.gzip);
  return {
    words: words.size,
    postings,
    tokens,
    shards: shards.size,
    largest: sizes[0],
    gzipTotal: sizes.reduce((s, x) => s + x.gzip, 0),
    indexGzip: gzipSync(metaJson, { level: 9 }).length,
  };
}
