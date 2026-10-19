import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlivreText } from "@/components/passage/Passage";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { literata } from "@/components/passage/literata";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { formatRuns } from "@/lib/passage";
import { grid, verseRef, verseText } from "@/lib/reading";
import { events, themeBySlug, themeRule, themes, themesMeta } from "@/lib/timeline";
import styles from "../tema.module.css";

export const ensureStatic = "navigation";

/** Verses shown per passage; a longer passage shows its first verses and a link to the chapter. */
const VERSES_PER_PASSAGE = 4;
const LINKS_SHOWN = 20;

export function generateStaticParams() {
  return themes.map((t) => ({ slug: t.slug }));
}

const capital = (s: string) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);

export async function generateMetadata({ params }: PageProps<"/tema/[slug]">): Promise<Metadata> {
  const t = themeBySlug((await params).slug);
  if (!t) return { title: NOT_FOUND_TITLE };
  return {
    title: `${capital(t.label)} (tema)`,
    description: `${formatInt(t.passages.length)} passagens do tema “${t.label}” (OpenBible.info Topics), no texto da Bíblia Livre, e as ligações entre elas.`,
  };
}

const side = (gv: number) => {
  const r = verseRef(gv);
  return { book: r.book.index, slug: r.book.slug, chapter: r.chapter, verse: r.verse };
};

export default async function TemaPage({ params }: PageProps<"/tema/[slug]">) {
  const t = themeBySlug((await params).slug);
  if (!t) notFound();
  const passages = await Promise.all(
    t.passages.map(async (p) => {
      const count = p.to - p.from + 1;
      const shown = Array.from({ length: Math.min(count, VERSES_PER_PASSAGE) }, (_, i) => p.from + i);
      return {
        ...p,
        label: formatRuns([[p.from, p.to]], grid),
        first: verseRef(p.from),
        count,
        verses: await Promise.all(shown.map(async (gv) => ({ gv, n: verseRef(gv).verse, text: await verseText(gv) }))),
      };
    }),
  );
  const withTheme = events.filter((e) => e.themes.some((x) => x.slug === t.slug));
  return (
    <main id="conteudo" className={`${styles.main} ${literata.variable}`}>
      <header className={styles.head}>
        <nav aria-label="Trilha" className={styles.crumbs}>
          <Link href="/tema">Temas</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{t.label}</span>
        </nav>
        <p className="kicker">Tema</p>
        <h1 className={styles.title}>{capital(t.label)}</h1>
        <p className={styles.lede}>
          {formatInt(t.passages.length)} passagens do tópico <span lang="en">“{t.topic}”</span> da OpenBible.info Topics, na ordem da nota dos
          leitores. A palavra “{t.label}” está em {formatInt(t.coverage.with)} delas no texto da Bíblia Livre, e por isso dá o nome ao tema.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.primary}>
          <h2 className={styles.sectionTitle} id="passagens">
            Passagens <span className={styles.count}>{formatInt(t.passages.length)} passagens</span>
          </h2>
          <ol className={styles.passages} aria-labelledby="passagens">
            {passages.map((p) => (
              <li key={p.osis} className={styles.passage}>
                <p className={styles.passageHead}>
                  <Link href={p.first.path}>{p.label}</Link>
                  <span className={styles.meta}>nota {formatInt(p.score)}</span>
                </p>
                <ol className={styles.verses}>
                  {p.verses.map((v) => (
                    <li key={v.gv} value={v.n}>
                      {p.count > 1 && <span className={styles.num}>{v.n}</span>}
                      <span className={styles.scripture}>
                        <BlivreText text={v.text} />
                      </span>
                    </li>
                  ))}
                </ol>
                {p.count > p.verses.length && (
                  <p className={styles.meta}>
                    Mais {formatInt(p.count - p.verses.length)} versículos em{" "}
                    <Link href={`/${p.first.book.slug}/${p.first.chapter}`}>
                      {p.first.book.name} {p.first.chapter}
                    </Link>
                    .
                  </p>
                )}
              </li>
            ))}
          </ol>

          <h2 className={styles.sectionTitle} id="ligacoes">
            Ligações entre as passagens <span className={styles.count}>{formatInt(t.links.length)} ligações</span>
          </h2>
          {t.links.length ? (
            <>
              <ul className={styles.links} aria-labelledby="ligacoes">
                {t.links.slice(0, LINKS_SHOWN).map(([a, b, votes]) => {
                  const ra = verseRef(a);
                  const rb = verseRef(b);
                  return (
                    <li key={`${a}-${b}`}>
                      <Link href={conexaoPath(side(a), side(b))}>
                        {ra.label} ↔ {rb.label}
                      </Link>
                      <span className={styles.meta}>{formatInt(votes)} votos</span>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.note}>
                Pares da OpenBible.info entre versículos de passagens diferentes deste tema; votos somam as duas direções.
                {t.links.length > LINKS_SHOWN && ` Aqui, as ${formatInt(LINKS_SHOWN)} mais votadas.`}
              </p>
            </>
          ) : (
            <p className={styles.note}>Nenhuma ligação da OpenBible.info entre versículos de passagens diferentes deste tema.</p>
          )}
        </div>

        <aside className={styles.aside} aria-labelledby="sobre-tema">
          <h2 id="sobre-tema" className={styles.asideTitle}>
            Sobre este tema
          </h2>
          <p>
            Fonte: tópico <span lang="en">“{t.topic}”</span> da OpenBible.info Topics. O nome “{t.label}” é a palavra da BLIVRE presente em mais da
            metade das passagens ({formatInt(t.coverage.with)} de {formatInt(t.coverage.total)}).
          </p>
          <p>
            <Link href={`/palavra/${t.key}`} className={styles.asideLink}>
              Todos os versículos com a palavra “{t.label}”
            </Link>
          </p>
          {withTheme.length > 0 && (
            <>
              <p>
                Na linha do tempo (passagens com nota {formatInt(themeRule.minScoreForVerse)} ou mais):
              </p>
              <ul className={styles.events}>
                {withTheme.map((e) => (
                  <li key={e.id}>
                    <Link href={`/linha-do-tempo/${e.slug}`} className={styles.asideLink}>
                      {e.ref}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className={styles.source}>
            {themesMeta.credit}. Texto: Bíblia Livre (BLIVRE). Ligações: OpenBible.info. <Link href="/sobre">Créditos completos</Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
