import { shareMetadata } from "@/lib/share-metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Icon } from "@/components/icons";
import { ConnectionShare } from "@/components/sharing/ConnectionShare";
import { ScriptureText } from "@/components/explore/ScriptureText";
import { formatInt } from "@/lib/canon/text";
import { compareSides, conexaoPath, parseSide, sideSegment, type Side } from "@/lib/conexao";
import { explorePages, pairsText, votesText } from "@/lib/explore/data";
import { explorePath } from "@/lib/explore/home";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { bookBySlug, chapterNeighbours, chapterRef, chapterVerses, grid, type VerseData } from "@/lib/reading";
import styles from "./conexao.module.css";

export const ensureStatic = "navigation";

// Built ahead: the connection each prebuilt Explorar page opens on (its chapter and its most voted linked chapter).
export async function generateStaticParams() {
  const seen = new Set<string>();
  for (const { book, chapter } of explorePages()) {
    const top = (await chapterNeighbours(book, chapter))[0];
    if (!top) continue;
    const p = chapterRef(top.ci);
    seen.add(conexaoPath({ book: book.index, slug: book.slug, chapter }, { book: p.book.index, slug: p.book.slug, chapter: p.chapter }));
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
  return shareMetadata({
    title: `${r.x.label} e ${r.y.label}`,
    description: `${r.x.label} e ${r.y.label} lado a lado na Bíblia Livre (BLIVRE), com os versículos que a OpenBible.info liga entre os dois.`,
    path: `/conexao/${sideSegment(r.x)}/${sideSegment(r.y)}`,
  });
}

async function passage(s: Resolved): Promise<{ n: number; gv: number; v: VerseData }[]> {
  const book = grid.locate(s.first).book;
  const start = grid.verseIndex(book, s.chapter, 1);
  return (await chapterVerses(book, s.chapter)).map((v, i) => ({ n: i + 1, gv: start + i, v })).filter((x) => x.gv >= s.first && x.gv <= s.last);
}

/** "3 pares de versículos · 296 votos somados" */
function meta(pairs: number, votes: number): string {
  return `${pairsText(pairs)} de versículos · ${votesText(votes)} ${Math.abs(votes) === 1 ? "somado" : "somados"}`;
}

// Two passages side by side (stacked on phones), in Literata at reading size, with the verse pairs that link them listed
// first and marked in the text. No client code: the pair list and the marks are plain anchors.
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
  const maxVotes = Math.max(1, ...pairs.map((p) => p.votes));
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
                  <ScriptureText text={v.text} />
                </p>
                {linked.length > 0 && (
                  <p className={styles.vlinks}>
                    {linked.map((p) => (
                      <a key={p[ok]} href={`#${ok}-${p[ok]}`}>
                        <Icon name="both" />
                        <span className="visually-hidden">Ligado a </span>
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
    <main id="conteudo" className={styles.page}>
      <header className={styles.head}>
        <h1 className={`bc-display ${styles.title}`}>
          <span>{x.label}</span>
          <Icon name="both" className={`bc-icon ${styles.both}`} />
          <span className="visually-hidden"> e </span>
          <span>{y.label}</span>
        </h1>
        <p className="bc-lede" data-conexao-meta="">
          {pairs.length > 0
            ? `${meta(pairs.length, votes)} · Bíblia Livre (BLIVRE)`
            : "Nenhum par de versículos liga estas passagens na base OpenBible.info. Bíblia Livre (BLIVRE)."}
        </p>
        <p className={styles.links}>
          <Link href={explorePath(xBook.slug, x.chapter)} className="bc-button bc-button--secondary">
            <Icon name="explore" />
            Mapa de {xBook.name} {x.chapter}
          </Link>
          <Link href={explorePath(yBook.slug, y.chapter)} className="bc-button bc-button--secondary">
            <Icon name="explore" />
            Mapa de {yBook.name} {y.chapter}
          </Link>
        </p>
      </header>
      <ConnectionShare path={conexaoPath(x, y)} label={`${x.label} ↔ ${y.label}`} />

      {pairs.length > 0 && (
        <section className={styles.pairs} aria-labelledby="pares">
          <h2 id="pares" className="bc-section-title">
            {formatInt(pairs.length)} {pairs.length === 1 ? "par ligado" : "pares ligados"}
            {pairs.length > 1 && <small>do mais votado ao menos votado</small>}
          </h2>
          <ol className={styles.pairRows}>
            {pairs.map((p) => (
              <li key={`${p.a}-${p.b}`} data-pair={`${p.a}-${p.b}`}>
                <span className={styles.pairRefs}>
                  <a href={`#a-${p.a}`}>{ref(x, p.a)}</a>
                  <Icon name="both" className={`bc-icon ${styles.pairIcon}`} />
                  <span className="visually-hidden"> e </span>
                  <a href={`#b-${p.b}`}>{ref(y, p.b)}</a>
                </span>
                <span className={styles.votes}>
                  {votesText(p.votes)}
                  <span className="bc-conn__bar" style={{ "--w": Math.max(0, p.votes) / maxVotes } as React.CSSProperties} aria-hidden="true" />
                </span>
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
