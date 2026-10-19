import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { scripture } from "@/components/explore/fonts";
import { Scripture } from "@/components/reader/Scripture";
import { formatInt } from "@/lib/canon/text";
import { compareSides, conexaoPath, parseSide, sideSegment, type Side } from "@/lib/conexao";
import { explore, explorePages, pairsText, votesText } from "@/lib/explore/data";
import { explorePath } from "@/lib/explore/home";
import { bookBySlug, chapterVerses, grid, type VerseData } from "@/lib/reading";
import styles from "./conexao.module.css";

export const ensureStatic = "navigation";

// Built ahead: the connection each prebuilt Explorar page opens on (its chapter and its strongest partner).
export async function generateStaticParams() {
  const seen = new Set<string>();
  for (const { book, chapter } of explorePages()) {
    const n = (await explore(book, chapter)).neighbours[0];
    if (!n) continue;
    const path = conexaoPath(
      { book: book.index, slug: book.slug, chapter },
      { book: n.ref.book.index, slug: n.ref.book.slug, chapter: n.ref.chapter },
    );
    seen.add(path);
  }
  return [...seen].map((p) => {
    const [, , a, b] = p.split("/");
    return { a, b };
  });
}

type Resolved = Side & { label: string; path: string; first: number; last: number };

/** A URL segment as a passage that exists (a whole chapter or one verse), or null. */
function side(segment: string): Resolved | null {
  const s = parseSide(segment);
  const book = s && bookBySlug(s.slug);
  if (!s || !book || s.chapter > book.verses.length) return null;
  const n = book.verses[s.chapter - 1];
  if (s.verse && s.verse > n) return null;
  const label = s.verse ? `${book.name} ${s.chapter}:${s.verse}` : `${book.name} ${s.chapter}`;
  const path = s.verse ? `/${book.slug}/${s.chapter}/${s.verse}` : `/${book.slug}/${s.chapter}`;
  const first = grid.verseIndex(book, s.chapter, s.verse ?? 1);
  return { ...s, book: book.index, label, path, first, last: s.verse ? first : first + n - 1 };
}

async function resolve(params: Promise<{ a: string; b: string }>) {
  const { a, b } = await params;
  const x = side(a);
  const y = side(b);
  // two passages that overlap (the same one, or a chapter and one of its verses) are not a connection
  if (!x || !y || (x.book === y.book && x.chapter === y.chapter && (!x.verse || !y.verse || x.verse === y.verse))) return null;
  return { x, y, canonical: compareSides(x, y) <= 0 };
}

export async function generateMetadata({ params }: PageProps<"/conexao/[a]/[b]">): Promise<Metadata> {
  const r = await resolve(params);
  // no such passage: the 404 title; the reversed pair redirects to its canonical page, which has the title
  if (!r) return { title: NOT_FOUND_TITLE };
  if (!r.canonical) return {};
  return {
    title: `${r.x.label} e ${r.y.label}`,
    description: `${r.x.label} e ${r.y.label} lado a lado na Bíblia Livre (BLIVRE), com os versículos que a OpenBible.info liga entre os dois.`,
    alternates: { canonical: `/conexao/${sideSegment(r.x)}/${sideSegment(r.y)}` },
  };
}

async function passage(s: Resolved): Promise<{ n: number; gv: number; v: VerseData }[]> {
  const book = grid.locate(s.first).book;
  const start = grid.verseIndex(book, s.chapter, 1);
  return (await chapterVerses(book, s.chapter)).map((v, i) => ({ n: i + 1, gv: start + i, v })).filter((x) => x.gv >= s.first && x.gv <= s.last);
}

// Two passages side by side (stacked on phones), with the verse pairs that link them listed and marked in the text.
// No client code: the pair list and the marks are plain anchors.
export default async function ConexaoPage({ params }: PageProps<"/conexao/[a]/[b]">) {
  const r = await resolve(params);
  if (!r) notFound();
  const { x, y } = r;
  if (!r.canonical) permanentRedirect(conexaoPath(x, y));

  const [left, right] = await Promise.all([passage(x), passage(y)]);
  // every verse pair with one end on each side, strongest first (votes, then the left verse, then the right one)
  const pairs = left
    .flatMap((l) => l.v.links.filter(([gv]) => gv >= y.first && gv <= y.last).map(([gv, votes]) => ({ a: l.n, b: grid.locate(gv).verse, votes })))
    .sort((p, q) => q.votes - p.votes || p.a - q.a || p.b - q.b);
  const votes = pairs.reduce((s, p) => s + p.votes, 0);
  const partnersOf = (k: "a" | "b", n: number) => pairs.filter((p) => p[k] === n);
  const ref = (s: Resolved, v: number) => `${grid.locate(s.first).book.name} ${s.chapter}:${v}`;
  const xBook = grid.locate(x.first).book;
  const yBook = grid.locate(y.first).book;

  const column = (s: Resolved, rows: typeof left, k: "a" | "b") => {
    const other = k === "a" ? y : x;
    const ok = k === "a" ? "b" : "a";
    return (
      <section className={styles.col} aria-labelledby={`lado-${k}`}>
        <h2 id={`lado-${k}`} className={styles.colTitle}>
          <Link href={s.path}>{s.label}</Link>
        </h2>
        <ol className={styles.verses}>
          {rows.map(({ n, v }) => {
            const linked = partnersOf(k, n);
            return (
              <li key={n} id={`${k}-${n}`} className={styles.verse} data-linked={linked.length > 0 || undefined}>
                <span className={styles.vnum}>{n}</span>
                <p className={styles.vtext}>
                  <Scripture text={v.text} />
                </p>
                {linked.length > 0 && (
                  <p className={styles.vlinks}>
                    <span className="visually-hidden">Ligado a </span>
                    {linked.map((p) => (
                      <a key={p[ok]} href={`#${ok}-${p[ok]}`}>
                        <span aria-hidden="true">↔ </span>
                        {ref(other, p[ok])} · {votesText(p.votes)}
                      </a>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    );
  };

  return (
    <main id="conteudo" className={`${styles.page} ${scripture.variable}`}>
      <p className="kicker">Lado a lado</p>
      <h1 className={styles.title}>
        {x.label} <span className={styles.arrow} aria-hidden="true">↔</span>
        <span className="visually-hidden">e</span> {y.label}
      </h1>
      <p className={styles.meta} data-conexao-meta="">
        {pairs.length > 0
          ? `${pairsText(pairs.length)} · ${votesText(votes)} · Bíblia Livre (BLIVRE)`
          : "Nenhum par de versículos liga estas passagens na base OpenBible.info. Bíblia Livre (BLIVRE)."}
      </p>
      <p className={styles.links}>
        <Link href={explorePath(xBook.slug, x.chapter)}>Explorar {xBook.name} {x.chapter}</Link>
        <Link href={explorePath(yBook.slug, y.chapter)}>Explorar {yBook.name} {y.chapter}</Link>
      </p>

      {pairs.length > 0 && (
        <section className={styles.pairs} aria-labelledby="pares">
          <h2 id="pares" className={styles.pairsTitle}>
            {formatInt(pairs.length)} {pairs.length === 1 ? "par ligado" : "pares ligados"}
            {pairs.length > 1 && <span>do mais votado ao menos votado</span>}
          </h2>
          <ol className={styles.pairRows}>
            {pairs.map((p) => (
              <li key={`${p.a}-${p.b}`} data-pair={`${p.a}-${p.b}`}>
                <a href={`#a-${p.a}`}>{ref(x, p.a)}</a>
                <span aria-hidden="true" className={styles.arrow}>
                  ↔
                </span>
                <span className="visually-hidden">e</span>
                <a href={`#b-${p.b}`}>{ref(y, p.b)}</a>
                <span className={styles.votes}>{votesText(p.votes)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className={styles.cols}>
        {column(x, left, "a")}
        {column(y, right, "b")}
      </div>
      <p className={styles.source}>
        Ligações: OpenBible.info (votos somam as duas direções; um trecho conta pelo primeiro versículo). Texto: Bíblia Livre
        (BLIVRE).
      </p>
    </main>
  );
}
