import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { VerseRows } from "@/components/passage/Passage";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { NOT_FOUND_TITLE } from "@/lib/missing";
import { verseRef } from "@/lib/reading";
import { themeBySlug, themes } from "@/lib/timeline";
import { wordPage } from "@/lib/word-index";
import { isWordSlug } from "@/lib/words";
import styles from "../../tema/tema.module.css";

export const ensureStatic = "navigation";

const WITH_TEXT = 40;
const MORE_REFS = 300;
const LINKS_SHOWN = 20;

// The theme labels are built with the site; any other word renders on its first visit and is kept.
export function generateStaticParams() {
  return themes.map((t) => ({ palavra: t.key }));
}

async function resolve(params: Promise<{ palavra: string }>) {
  const { palavra } = await params;
  return isWordSlug(palavra) ? wordPage(palavra) : null;
}

const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;

export async function generateMetadata({ params }: PageProps<"/palavra/[palavra]">): Promise<Metadata> {
  const w = await resolve(params);
  if (!w) return { title: NOT_FOUND_TITLE };
  return {
    title: `“${w.label}” na Bíblia Livre`,
    description: `Os ${formatInt(w.verses.length)} versículos da Bíblia Livre com a palavra “${w.label}” e as ${formatInt(w.linksAmong.length)} ligações entre eles.`,
  };
}

const side = (gv: number) => {
  const r = verseRef(gv);
  return { book: r.book.index, slug: r.book.slug, chapter: r.chapter, verse: r.verse };
};

export default async function PalavraPage({ params }: PageProps<"/palavra/[palavra]">) {
  const w = await resolve(params);
  if (!w) notFound();
  const theme = themeBySlug(w.key);
  // most linked to other verses with the word first, then the Bible's order
  const ordered = [...w.verses].sort((a, b) => (w.degree.get(b) ?? 0) - (w.degree.get(a) ?? 0) || a - b);
  const withText = ordered.slice(0, WITH_TEXT);
  const rest = ordered.slice(WITH_TEXT).sort((a, b) => a - b);
  const restShown = rest.slice(0, MORE_REFS);
  const pairs = w.linksAmong.slice(0, LINKS_SHOWN);
  const maxVotes = Math.max(1, ...pairs.map((l) => l[2]));
  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <nav aria-label="Trilha">
        <ol className={`bc-crumbs ${styles.crumbs}`}>
          <li>
            <Icon name="chev-l" className={`bc-icon ${styles.crumbIcon}`} />
            <Link href="/palavra">Palavras</Link>
          </li>
        </ol>
      </nav>
      <header className={styles.head}>
        <h1 className="bc-display">{w.label}</h1>
        <p className={`bc-lede ${styles.lede}`}>
          “{w.label}” aparece em {plural(w.verses.length, "versículo", "versículos")} da Bíblia Livre. Entre esses versículos há{" "}
          {plural(w.linksAmong.length, "ligação", "ligações")} da OpenBible.info.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.primary}>
          <section aria-labelledby="versiculos" className={styles.block}>
            <h2 className="bc-title" id="versiculos">
              Versículos <small className={styles.titleCount}>{plural(w.verses.length, "versículo", "versículos")}</small>
            </h2>
            <p className={styles.rule}>
              {withText.length < w.verses.length
                ? `Com o texto, os ${formatInt(withText.length)} mais ligados a outros versículos que têm “${w.label}”; o número ao lado conta essas ligações. Depois, os outros, na ordem da Bíblia.`
                : `Todos, dos mais ligados a outros versículos que têm “${w.label}” aos menos ligados; o número ao lado conta essas ligações.`}
            </p>
            <VerseRows
              label={`Versículos com “${w.label}”`}
              word={w.key}
              items={withText.map((gv) => ({ gv, meta: plural(w.degree.get(gv) ?? 0, "ligação", "ligações") }))}
            />
            {rest.length > 0 && (
              <>
                <h3 className={styles.subTitle}>
                  {restShown.length < rest.length
                    ? `Mais ${formatInt(rest.length)} versículos; os ${formatInt(restShown.length)} primeiros na ordem da Bíblia`
                    : `Os outros ${formatInt(rest.length)}, na ordem da Bíblia`}
                </h3>
                <ul className={styles.refs} aria-label={`Outros versículos com “${w.label}”`}>
                  {restShown.map((gv) => {
                    const r = verseRef(gv);
                    return (
                      <li key={gv}>
                        <Link href={r.path}>{r.label}</Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="ligacoes" className={styles.block}>
            <h2 className="bc-title" id="ligacoes">
              Ligações entre eles <small className={styles.titleCount}>{plural(w.linksAmong.length, "ligação", "ligações")}</small>
            </h2>
            {w.linksAmong.length ? (
              <>
                <p className={styles.rule}>
                  Pares da OpenBible.info em que os dois versículos têm “{w.label}”, dos mais votados aos menos votados; votos somam as duas
                  direções.{w.linksAmong.length > LINKS_SHOWN && ` Aqui, os ${formatInt(LINKS_SHOWN)} mais votados.`}
                </p>
                <ol className={`bc-conns ${styles.pairs}`}>
                  {pairs.map(([a, b, votes]) => (
                    <li key={`${a}-${b}`} className="bc-conn">
                      <Link href={conexaoPath(side(a), side(b))} className="bc-conn__ref">
                        {verseRef(a).label}
                        <Icon name="both" />
                        <span className="bc-visually-hidden"> e </span>
                        {verseRef(b).label}
                      </Link>
                      <span className="bc-conn__votes">
                        <span className="bc-conn__bar" style={{ "--w": (votes / maxVotes).toFixed(3) } as CSSProperties} aria-hidden="true" />
                        {plural(votes, "voto", "votos")}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className={styles.rule}>Nenhuma ligação da OpenBible.info entre dois versículos com “{w.label}”.</p>
            )}
          </section>
        </div>

        <aside className={styles.aside} aria-labelledby="sobre-palavra">
          <h2 id="sobre-palavra" className="bc-title">
            Como a palavra é contada
          </h2>
          <p>
            A palavra exata, em qualquer sentido: sem plural nem outras formas, sem diferença de acento ou de maiúscula. Uma palavra não é um
            tema.
          </p>
          {theme && (
            <p>
              <Link href={`/tema/${theme.slug}`} className={styles.asideLink}>
                Tema “{theme.label}” (OpenBible.info Topics)
              </Link>
            </p>
          )}
          <p>
            <Link href="/palavra" className={styles.asideLink}>
              Outras palavras
            </Link>
          </p>
          <p className={styles.source}>
            Texto: Bíblia Livre (BLIVRE). Ligações: OpenBible.info. <Link href="/sobre">Créditos completos</Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
