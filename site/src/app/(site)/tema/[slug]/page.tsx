import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { BlivreText } from "@/components/passage/Passage";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { formatRuns } from "@/lib/passage";
import { grid, verseRef } from "@/lib/reading";
import { themeView } from "@/lib/theme-view";
import { events, themeBySlug, themeRule, themes, themesMeta } from "@/lib/timeline";
import { verseTable } from "@/lib/word-index";
import styles from "../tema.module.css";

export const ensureStatic = "navigation";

/** Verses shown per passage; a longer passage shows its first verses and a link to the chapter. */
const VERSES_PER_PASSAGE = 4;
const LINKS_SHOWN = 20;

export function generateStaticParams() {
  return themes.map((t) => ({ slug: t.slug }));
}

const capital = (s: string) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;

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
  const { text } = await verseTable();
  const view = await themeView(t);
  const maxVotes = Math.max(1, ...t.links.slice(0, LINKS_SHOWN).map((l) => l[2]));
  const withTheme = events.filter((e) => e.themes.some((x) => x.slug === t.slug));
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <nav aria-label="Trilha">
        <ol className="bc-crumbs">
          <li>
            <Link href="/tema">Temas</Link>
          </li>
        </ol>
      </nav>
      <header className={styles.head}>
        <h1 className="bc-display">{capital(t.label)}</h1>
        <p className={`bc-lede ${styles.lede}`}>
          {formatInt(t.passages.length)} passagens do tópico <span lang="en">“{t.topic}”</span> da OpenBible.info Topics. A palavra “{t.label}”
          está em {formatInt(t.coverage.with)} delas no texto da Bíblia Livre, e por isso dá o nome ao tema.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.primary}>
          <section aria-labelledby="palavras" className={styles.block}>
            <h2 className="bc-section-title" id="palavras">
              Palavras destas passagens <small>{plural(view.words.length, "palavra", "palavras")}</small>
            </h2>
            <ul className={styles.chips}>
              {view.words.map((w) => (
                <li key={w.key}>
                  <Link href={`/palavra/${w.key}`} className={`bc-chip ${styles.chip}`} aria-label={`${w.label}, em ${plural(w.passages, "passagem", "passagens")}`}>
                    {w.label} <span className={styles.chipCount}>{formatInt(w.passages)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className={styles.note}>
              As palavras que estão em mais passagens deste tema (o número), contadas no texto da Bíblia Livre sem as palavras de ligação
              como “de” e “que”. Cada uma abre os versículos que a têm.
            </p>
          </section>

          <section aria-labelledby="passagens" className={styles.block}>
            <h2 className="bc-title" id="passagens">
              Passagens
            </h2>
            <p className={styles.rule}>
              As {formatInt(view.passages.length)} passagens, das mais ligadas às menos ligadas. Ligações: pares da OpenBible.info com ao menos
              um versículo da passagem. A nota é a dos leitores da OpenBible.info Topics para a passagem neste tópico.
            </p>
            <ol className={`bc-conns ${styles.passages}`}>
              {view.passages.map((p) => {
                const first = verseRef(p.from);
                const count = p.to - p.from + 1;
                const shown = Array.from({ length: Math.min(count, VERSES_PER_PASSAGE) }, (_, i) => p.from + i);
                return (
                  <li key={p.osis} className="bc-conn">
                    <Link href={first.path} className="bc-conn__ref">
                      {formatRuns([[p.from, p.to]], grid)}
                    </Link>
                    <span className={`bc-conn__votes ${styles.count}`}>
                      <span className={`i i-arc ${styles.countIcon}`} aria-hidden="true" />
                      {plural(p.pairs, "ligação", "ligações")}
                    </span>
                    <p className="bc-conn__text">
                      {shown.map((gv, i) => (
                        <span key={gv}>
                          {count > 1 && (
                            <span className={`bc-verse__n ${styles.verseN}`}>
                              <span className="visually-hidden">Versículo </span>
                              {verseRef(gv).verse}
                            </span>
                          )}
                          <BlivreText text={text[gv]} />
                          {i < shown.length - 1 ? " " : ""}
                        </span>
                      ))}
                    </p>
                    <p className={styles.passageMeta}>
                      nota {formatInt(p.score)}
                      {count > shown.length && (
                        <>
                          {" · "}
                          mais {plural(count - shown.length, "versículo", "versículos")} em{" "}
                          <Link href={`/${first.book.slug}/${first.chapter}`}>
                            {first.book.name} {first.chapter}
                          </Link>
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ol>
            <p className={styles.note}>{formatInt(t.passages.length)} passagens do tópico, todas acima.</p>
          </section>

          <section aria-labelledby="ligacoes" className={styles.block}>
            <h2 className="bc-title" id="ligacoes">
              Ligações entre as passagens <small className={styles.titleCount}>{plural(t.links.length, "ligação", "ligações")}</small>
            </h2>
            {t.links.length ? (
              <>
                <p className={styles.rule}>
                  Pares da OpenBible.info entre versículos de passagens diferentes deste tema, dos mais votados aos menos votados; votos somam as
                  duas direções.{t.links.length > LINKS_SHOWN && ` Aqui, os ${formatInt(LINKS_SHOWN)} mais votados.`}
                </p>
                <ol className={`bc-conns ${styles.pairs}`}>
                  {t.links.slice(0, LINKS_SHOWN).map(([a, b, votes]) => {
                    const ra = verseRef(a);
                    const rb = verseRef(b);
                    return (
                      <li key={`${a}-${b}`} className="bc-conn">
                        <Link href={conexaoPath(side(a), side(b))} className="bc-conn__ref">
                          {ra.label}
                          <Icon name="both" />
                          <span className="bc-visually-hidden"> e </span>
                          {rb.label}
                        </Link>
                        <span className="bc-conn__votes">
                          <span className="bc-conn__bar" style={{ "--w": (votes / maxVotes).toFixed(3) } as CSSProperties} aria-hidden="true" />
                          {plural(votes, "voto", "votos")}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <p className={styles.rule}>Nenhuma ligação da OpenBible.info entre versículos de passagens diferentes deste tema.</p>
            )}
          </section>
        </div>

        <aside className={styles.aside} aria-labelledby="sobre-tema">
          <h2 id="sobre-tema" className="bc-title">
            Sobre este tema
          </h2>
          <p>
            Fonte: tópico <span lang="en">“{t.topic}”</span> da OpenBible.info Topics. O nome “{t.label}” é a palavra da Bíblia Livre presente em
            mais da metade das passagens ({formatInt(t.coverage.with)} de {formatInt(t.coverage.total)}); não é tradução.
          </p>
          <p>
            <Link href={`/palavra/${t.key}`} className={styles.asideLink}>
              Todos os versículos com a palavra “{t.label}”
            </Link>
          </p>
          {withTheme.length > 0 && (
            <>
              <h3 className={styles.asideTitle}>Na linha do tempo</h3>
              <p className={styles.asideNote}>Eventos com uma passagem deste tema de nota {formatInt(themeRule.minScoreForVerse)} ou mais.</p>
              <ul className={styles.events}>
                {withTheme.map((e) => (
                  <li key={e.id}>
                    <Link href={`/linha-do-tempo/${e.slug}`}>{e.ref}</Link>
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
