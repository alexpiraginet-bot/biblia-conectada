import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VerseRows } from "@/components/passage/Passage";
import { literata } from "@/components/passage/literata";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
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

export async function generateMetadata({ params }: PageProps<"/palavra/[palavra]">): Promise<Metadata> {
  const w = await resolve(params);
  if (!w) return {};
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
  // most linked to other verses with the word first, then canonical order
  const ordered = [...w.verses].sort((a, b) => (w.degree.get(b) ?? 0) - (w.degree.get(a) ?? 0) || a - b);
  const withText = ordered.slice(0, WITH_TEXT);
  const rest = ordered.slice(WITH_TEXT).sort((a, b) => a - b);
  const restShown = rest.slice(0, MORE_REFS);
  return (
    <main id="conteudo" className={`${styles.main} ${literata.variable}`}>
      <header className={styles.head}>
        <nav aria-label="Trilha" className={styles.crumbs}>
          <Link href="/palavra">Palavras</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{w.label}</span>
        </nav>
        <p className="kicker">Palavra</p>
        <h1 className={styles.title}>{w.label}</h1>
        <p className={styles.lede}>
          “{w.label}” aparece em {formatInt(w.verses.length)} {w.verses.length === 1 ? "versículo" : "versículos"} da Bíblia Livre. Entre esses
          versículos há {formatInt(w.linksAmong.length)} {w.linksAmong.length === 1 ? "ligação" : "ligações"} da OpenBible.info.
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.primary}>
          <h2 className={styles.sectionTitle} id="versiculos">
            Versículos <span className={styles.count}>{formatInt(w.verses.length)} versículos</span>
          </h2>
          <VerseRows
            items={withText.map((gv) => {
              const n = w.degree.get(gv) ?? 0;
              return { gv, meta: `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"} com outros versículos com “${w.label}”` };
            })}
          />
          {rest.length > 0 && (
            <>
              <p className={styles.note}>
                {withText.length < WITH_TEXT ? "" : `Acima, os ${formatInt(withText.length)} mais ligados entre si. `}
                {restShown.length < rest.length
                  ? `Mais ${formatInt(rest.length)} versículos; os ${formatInt(restShown.length)} primeiros na ordem da Bíblia:`
                  : `Os outros ${formatInt(rest.length)}, na ordem da Bíblia:`}
              </p>
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

          <h2 className={styles.sectionTitle} id="ligacoes">
            Ligações entre eles <span className={styles.count}>{formatInt(w.linksAmong.length)} ligações</span>
          </h2>
          {w.linksAmong.length ? (
            <>
              <ul className={styles.links} aria-labelledby="ligacoes">
                {w.linksAmong.slice(0, LINKS_SHOWN).map(([a, b, votes]) => (
                  <li key={`${a}-${b}`}>
                    <Link href={conexaoPath(side(a), side(b))}>
                      {verseRef(a).label} ↔ {verseRef(b).label}
                    </Link>
                    <span className={styles.meta}>{formatInt(votes)} votos</span>
                  </li>
                ))}
              </ul>
              <p className={styles.note}>
                Pares da OpenBible.info em que os dois versículos têm “{w.label}”; votos somam as duas direções.
                {w.linksAmong.length > LINKS_SHOWN && ` Aqui, os ${formatInt(LINKS_SHOWN)} mais votados.`}
              </p>
            </>
          ) : (
            <p className={styles.note}>Nenhuma ligação da OpenBible.info entre dois versículos com “{w.label}”.</p>
          )}
        </div>

        <aside className={styles.aside} aria-labelledby="sobre-palavra">
          <h2 id="sobre-palavra" className={styles.asideTitle}>
            Como a palavra é contada
          </h2>
          <p>
            A palavra exata, em qualquer sentido: sem plural nem outras formas, sem diferença de acento ou maiúscula. Uma palavra não é um tema.
          </p>
          {theme && (
            <p>
              <Link href={`/tema/${theme.slug}`} className={styles.asideLink}>
                Tema “{theme.label}” (OpenBible.info Topics)
              </Link>
            </p>
          )}
          <p className={styles.source}>
            Texto: Bíblia Livre (BLIVRE). Ligações: OpenBible.info. <Link href="/sobre">Créditos completos</Link>
          </p>
        </aside>
      </div>
    </main>
  );
}
