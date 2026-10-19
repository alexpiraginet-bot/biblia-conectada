import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PassageText } from "@/components/passage/Passage";
import { literata } from "@/components/passage/literata";
import { EraAxis, type AxisLane } from "@/components/timeline/EraAxis";
import tl from "@/components/timeline/timeline.module.css";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { ERAS, eraIndex, eraSpanLabel, yearLabel } from "@/lib/eras";
import { medalhaoForBook } from "@/lib/medalhoes";
import { chapterRef, verseRef } from "@/lib/reading";
import {
  durationLabel,
  eventById,
  eventBySlug,
  eventNeighbours,
  events,
  OTHER_RECEPTION_EMPTY,
  pilotForEvent,
  RECEPTION_EMPTY,
  timelineAxis,
  type Work,
} from "@/lib/timeline";
import styles from "../linha.module.css";

export const ensureStatic = "navigation";

/** Verses shown with their text; a longer event lists its chapters instead (up to 1,364 verses). */
const MAX_VERSES = 40;

export function generateStaticParams() {
  return events.map((e) => ({ evento: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/linha-do-tempo/[evento]">): Promise<Metadata> {
  const e = eventBySlug((await params).evento);
  if (!e) return {};
  return {
    title: e.ref,
    description: `${e.ref} na linha do tempo: ${yearLabel(e.year)} pela cronologia de F. N. Jones (Theographic), texto da Bíblia Livre e ${formatInt(e.links.pairs)} ligações.`,
  };
}

const side = (gv: number) => {
  const r = verseRef(gv);
  return { book: r.book.index, slug: r.book.slug, chapter: r.chapter, verse: r.verse };
};

function workTitle(w: Work) {
  if (!w.title) return <>Obra sem título no Wikidata</>;
  return w.titleLang === "en" ? (
    <>
      <span lang="en">{w.title}</span> <span className={styles.linkMeta}>(título em inglês no Wikidata)</span>
    </>
  ) : (
    <>{w.title}</>
  );
}

export default async function EventPage({ params }: PageProps<"/linha-do-tempo/[evento]">) {
  const e = eventBySlug((await params).evento);
  if (!e) notFound();
  const axis = timelineAxis();
  const pilot = pilotForEvent(e.id);
  const first = verseRef(e.verses[0]);
  const medal = medalhaoForBook(first.book.osis);
  const { prev, next } = eventNeighbours(e);
  const predecessor = e.predecessor !== null ? eventById(e.predecessor) : undefined;
  const partOf = e.partOf !== null ? eventById(e.partOf) : undefined;
  const duration = durationLabel(e.duration);
  const shown = e.verses.slice(0, MAX_VERSES);
  const dated = pilot?.works.filter((w) => w.year !== null) ?? [];
  const undated = pilot?.works.filter((w) => w.year === null) ?? [];
  const withImage = pilot?.works.filter((w) => w.image) ?? [];

  const lanes: AxisLane[] = [
    { id: "evento", label: "Este evento", unit: ["evento", "eventos"], tone: "here", marks: [{ key: "e", year: e.year }], countText: yearLabel(e.year) },
  ];
  if (pilot) {
    lanes.push({ id: "pintura", label: "Pintura", unit: ["pintura", "pinturas"], tone: "work", marks: dated.map((w) => ({ key: w.qid, year: w.year as number })) });
    lanes.push({ id: "outras", label: "Literatura e debates", unit: ["obra", "obras"], tone: "work", marks: [], empty: OTHER_RECEPTION_EMPTY });
  } else {
    lanes.push({ id: "recepcao", label: "Recepção cultural", unit: ["obra", "obras"], tone: "work", marks: [], empty: RECEPTION_EMPTY });
  }

  return (
    <main id="conteudo" className={`${styles.main} ${literata.variable}`}>
      <header className={styles.head}>
        <nav aria-label="Trilha" className={styles.crumbs}>
          <Link href="/linha-do-tempo">Linha do tempo</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">{e.ref}</span>
        </nav>
        <h1 className={`${styles.title} ${e.ref.length > 40 ? styles.titleLong : ""}`}>{e.ref}</h1>
        <p className={styles.original}>
          Título original (Theographic, em inglês): <span lang="en">{e.titleEn}</span>
        </p>
      </header>

      <div className={`${styles.layout} ${styles.layoutEvent}`}>
        <aside className={styles.aside} aria-labelledby="dados-evento">
          <p className="kicker">Evento</p>
          <h2 id="dados-evento" className={styles.asideTitle}>
            Dados do evento
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>Data</dt>
              <dd>
                {e.approximate ? "c. " : ""}
                {yearLabel(e.year)}
                <span className={styles.factNote}>cronologia de F. N. Jones (Theographic)</span>
              </dd>
            </div>
            {duration && (
              <div>
                <dt>Duração</dt>
                <dd>{duration}</dd>
              </div>
            )}
            <div>
              <dt>Lugares</dt>
              <dd>
                {e.places.length ? (
                  <>
                    {e.places.map((p, i) => (
                      <span key={p.name}>
                        {i > 0 && ", "}
                        {p.name} <span className={styles.linkMeta}>({verseRef(p.gv).book.abbr} {verseRef(p.gv).chapter}:{verseRef(p.gv).verse})</span>
                      </span>
                    ))}
                    <span className={styles.factNote}>Lugares do Theographic, com o nome como está no texto da BLIVRE.</span>
                  </>
                ) : (
                  <span className={styles.factNote}>Nenhum lugar com nome achado no texto destes versículos.</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Ligações</dt>
              <dd>
                {formatInt(e.links.pairs)} ligações
                <span className={styles.factNote}>pares da OpenBible.info com ao menos um versículo do trecho</span>
              </dd>
            </div>
            {(predecessor || partOf) && (
              <div>
                <dt>No Theographic</dt>
                <dd>
                  {partOf && (
                    <span className={styles.factNote}>
                      Parte de <Link href={`/linha-do-tempo/${partOf.slug}`}>{partOf.ref}</Link>
                    </span>
                  )}
                  {predecessor && (
                    <span className={styles.factNote}>
                      Vem depois de <Link href={`/linha-do-tempo/${predecessor.slug}`}>{predecessor.ref}</Link>
                    </span>
                  )}
                </dd>
              </div>
            )}
          </dl>
          <p className={styles.sources}>
            Eventos e datas: Theographic Bible Metadata, Viz.Bible (CC BY-SA 4.0), cronologia de Floyd Nolen Jones. Texto: Bíblia Livre
            (BLIVRE). Ligações: OpenBible.info.{pilot ? " Dados de obras: Wikidata (CC0)." : ""} <Link href="/sobre">Créditos completos</Link>
          </p>
        </aside>
        <div className={styles.primary}>
          <div className={styles.lead}>
            <div className={tl.node}>
              <span className={tl.medallion} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP; next/image would add client JS */}
                {medal ? <img src={medal.src192} alt="" width={96} height={96} /> : first.book.abbr}
              </span>
              <span>
                <span className={styles.year}>{e.approximate ? "c. " : ""}{yearLabel(e.year)}</span>
                <br />
                {formatInt(e.verses.length)} {e.verses.length === 1 ? "versículo" : "versículos"}
                {medal && (
                  <>
                    <br />
                    <span className={styles.illustration}>
                      Ilustração do grupo {medal.category}: {medal.label.charAt(0).toLowerCase()}
                      {medal.label.slice(1)}
                    </span>
                  </>
                )}
              </span>
            </div>
            {e.themes.length > 0 ? (
              <div>
                <p className="kicker" id="temas">
                  Temas destes versículos
                </p>
                <ul className={tl.branches} aria-labelledby="temas">
                  {e.themes.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/tema/${t.slug}`} className={tl.themeNode}>
                        {t.label}
                      </Link>
                      <span className={tl.themeMeta}>
                        {formatInt(t.passages)} {t.passages === 1 ? "passagem" : "passagens"} do tema aqui
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className={styles.more}>Nenhum dos temas publicados (OpenBible.info Topics) passa por estes versículos.</p>
            )}
          </div>

          <EraAxis
            axis={axis}
            lanes={lanes}
            caption="O evento fica na Antiguidade; as eras seguintes guardam a recepção da passagem. As cinco eras são uma convenção deste site, de largura igual."
          />

          <h2 className={styles.sectionTitle} id="texto">
            Texto <span className={styles.count}>Bíblia Livre (BLIVRE)</span>
          </h2>
          <PassageText verses={shown} label={`Texto de ${e.ref}`} />
          {e.verses.length > shown.length && (
            <p className={styles.more}>
              Mostrando {formatInt(shown.length)} de {formatInt(e.verses.length)} versículos. O resto está nos capítulos abaixo.
            </p>
          )}

          <h2 className={styles.sectionTitle} id="ligacoes">
            Ligações{" "}
            <span className={styles.count}>
              {formatInt(e.links.pairs)} ligações tocam o trecho; {formatInt(e.links.partners)} versículos de fora
            </span>
          </h2>
          {e.top.length > 0 ? (
            <ul className={styles.links} aria-labelledby="ligacoes">
              {e.top.map(([gv, votes, from]) => {
                const r = verseRef(gv);
                const f = verseRef(from);
                return (
                  <li key={gv}>
                    <span>
                      <Link href={r.path}>{r.label}</Link>
                      <span className={styles.linkMeta}> · com {f.book.abbr} {f.chapter}:{f.verse}</span>
                    </span>
                    <span>
                      <span className={styles.linkMeta}>{formatInt(votes)} votos · </span>
                      <Link href={conexaoPath(side(from), side(gv))} aria-label={`Abrir conexão ${f.label} e ${r.label}`}>
                        Abrir conexão
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.more}>Nenhuma ligação da OpenBible.info sai deste trecho.</p>
          )}
          <p className={styles.more}>
            Ligação: par de versículos da OpenBible.info; votos somam as duas direções. Aqui, as {formatInt(e.top.length)} mais votadas com versículos
            de fora do trecho.
          </p>

          <h2 className={styles.sectionTitle} id="capitulos">
            Capítulos <span className={styles.count}>{formatInt(e.chapters.length)} {e.chapters.length === 1 ? "capítulo" : "capítulos"}</span>
          </h2>
          <ul className={styles.chapters} aria-labelledby="capitulos">
            {e.chapters.map((ci) => {
              const c = chapterRef(ci);
              return (
                <li key={ci}>
                  <span className={styles.chapterName}>{c.label}</span>
                  <Link href={c.path}>Ler</Link>
                  <Link href={`/explorar/${c.book.slug}/${c.chapter}`}>Explorar ligações</Link>
                </li>
              );
            })}
          </ul>

          <h2 className={styles.sectionTitle} id="recepcao">
            Recepção cultural
            {pilot && <span className={styles.count}>{formatInt(pilot.works.length)} pinturas no Wikidata</span>}
          </h2>
          {pilot ? (
            <>
              <p className={styles.more}>
                Piloto: pinturas que o Wikidata liga a {pilot.label}, em instantâneo. Título em português quando o Wikidata tem; senão, o
                título em inglês, marcado. Imagem só quando a página do arquivo no Wikimedia Commons diz domínio público, conferida uma por
                uma: {formatInt(withImage.length)} {withImage.length === 1 ? "pintura tem" : "pinturas têm"} imagem por enquanto.{" "}
                {OTHER_RECEPTION_EMPTY}
              </p>
              {pilot.excluded.map((x) => (
                <p key={x.qid} className={styles.more}>
                  Fora da lista: <a href={`https://www.wikidata.org/wiki/${x.qid}`}>{x.qid}</a>, que o Wikidata liga a esta passagem, mas{" "}
                  {x.reason}.
                </p>
              ))}
              {withImage.length > 0 && (
                <ul className={styles.gallery} aria-label="Pinturas com imagem">
                  {withImage.map((w) => {
                    const img = w.image!;
                    return (
                      <li key={w.qid}>
                        <figure className={styles.figure}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP; next/image would add client JS */}
                          <img src={img.src} width={img.width} height={img.height} alt={w.title ? `Pintura: ${w.title}` : "Pintura"} loading="lazy" decoding="async" />
                          <figcaption>
                            {workTitle(w)}, <span lang="en">{img.author ?? w.creator}</span>, <span lang="en">{img.date ?? yearLabel(w.year as number)}</span> ·
                            imagem: Wikimedia Commons, <a href={img.page}>{img.file}</a>, domínio público
                          </figcaption>
                        </figure>
                      </li>
                    );
                  })}
                </ul>
              )}
              {ERAS.map((era, i) => {
                const list = dated.filter((w) => eraIndex(w.year as number) === i);
                return list.length ? (
                  <section key={era.id} aria-label={era.label}>
                    <h3 className={styles.eraHeading}>
                      {era.label} <span className={styles.linkMeta}>({eraSpanLabel(i, axis)}): {formatInt(list.length)} {list.length === 1 ? "pintura" : "pinturas"}</span>
                    </h3>
                    <ol className={styles.works}>
                      {list.map((w) => (
                        <li key={w.qid}>
                          <span className={styles.year}>{yearLabel(w.year as number)}</span>
                          <span>
                            <a href={`https://www.wikidata.org/wiki/${w.qid}`}>{workTitle(w)}</a>
                          </span>
                          <span className={styles.workMeta}>{w.creator ?? "autor não indicado no Wikidata"}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null;
              })}
              {undated.length > 0 && (
                <section aria-label="Sem data">
                  <h3 className={styles.eraHeading}>
                    Sem data no Wikidata <span className={styles.linkMeta}>{formatInt(undated.length)} {undated.length === 1 ? "pintura" : "pinturas"}</span>
                  </h3>
                  <ol className={styles.works}>
                    {undated.map((w) => (
                      <li key={w.qid}>
                        <span className={styles.year}>—</span>
                        <span>
                          <a href={`https://www.wikidata.org/wiki/${w.qid}`}>{workTitle(w)}</a>
                        </span>
                        <span className={styles.workMeta}>{w.creator ?? "autor não indicado no Wikidata"}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          ) : (
            <p className={styles.more}>{RECEPTION_EMPTY}</p>
          )}

          <nav aria-label="Eventos vizinhos" className={styles.pager}>
            {prev ? (
              <Link href={`/linha-do-tempo/${prev.slug}`} rel="prev">
                <span className={styles.pagerLabel}>Evento anterior</span>
                {prev.ref}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/linha-do-tempo/${next.slug}`} rel="next">
                <span className={styles.pagerLabel}>Próximo evento</span>
                {next.ref}
              </Link>
            )}
          </nav>
        </div>
      </div>
    </main>
  );
}
