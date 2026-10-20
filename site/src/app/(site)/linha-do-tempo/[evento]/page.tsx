import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { BlivreText, PassageText } from "@/components/passage/Passage";
import { EraAxis, type AxisLane } from "@/components/timeline/EraAxis";
import { formatInt } from "@/lib/canon/text";
import { conexaoPath } from "@/lib/conexao";
import { ERAS, eraIndex, eraSpanLabel, yearLabel } from "@/lib/eras";
import { medalhaoForBook } from "@/lib/medalhoes";
import { NOT_FOUND_TITLE } from "@/lib/missing";
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
import { relatedEvents } from "@/lib/timeline-links";
import { splitPeriods } from "@/lib/timeline-periods";
import { verseTable } from "@/lib/word-index";
import styles from "../linha.module.css";

export const ensureStatic = "navigation";

/** Verses shown with their text; a longer event lists its chapters instead (up to 1,364 verses). */
const MAX_VERSES = 40;

export function generateStaticParams() {
  return events.map((e) => ({ evento: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/linha-do-tempo/[evento]">): Promise<Metadata> {
  const e = eventBySlug((await params).evento);
  if (!e) return { title: NOT_FOUND_TITLE };
  return {
    title: e.ref,
    description: `${e.ref} na linha do tempo: ${yearLabel(e.year)} pela cronologia de F. N. Jones (Theographic), texto da Bíblia Livre e ${formatInt(e.links.pairs)} ligações.`,
  };
}

const side = (gv: number) => {
  const r = verseRef(gv);
  return { book: r.book.index, slug: r.book.slug, chapter: r.chapter, verse: r.verse };
};
const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;
/** "Lc 10:30": a place's verse, short, beside its name */
const shortRef = (gv: number) => {
  const r = verseRef(gv);
  return `${r.book.abbr} ${r.chapter}:${r.verse}`;
};
const DIRECTION: Record<number, { icon: "out" | "in" | "both"; text: string }> = {
  1: { icon: "out", text: "sai deste trecho" },
  2: { icon: "in", text: "chega a este trecho" },
  3: { icon: "both", text: "nos dois sentidos" },
};

function workTitle(w: Work) {
  if (!w.title) return <>Obra sem título no Wikidata</>;
  return w.titleLang === "en" ? (
    <>
      <span lang="en">{w.title}</span> <span className={styles.note}>(título em inglês no Wikidata)</span>
    </>
  ) : (
    <>{w.title}</>
  );
}

export default async function EventPage({ params }: PageProps<"/linha-do-tempo/[evento]">) {
  const e = eventBySlug((await params).evento);
  if (!e) notFound();
  const index = events.indexOf(e);
  const period = splitPeriods(events).find((p) => index >= p.start && index < p.start + p.events.length)!;
  const { text, links } = await verseTable();
  const related = await relatedEvents(index);
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
  const maxVotes = Math.max(1, ...e.top.map((t) => t[1]));

  const lanes: AxisLane[] = [
    { id: "evento", label: "Este evento", unit: ["evento", "eventos"], tone: "here", marks: [{ key: "e", year: e.year }], countText: yearLabel(e.year) },
    { id: "pintura", label: "Pintura", unit: ["pintura", "pinturas"], tone: "work", marks: dated.map((w) => ({ key: w.qid, year: w.year as number })) },
    { id: "outras", label: "Literatura e debates", unit: ["obra", "obras"], tone: "work", marks: [], empty: OTHER_RECEPTION_EMPTY },
  ];

  return (
    <main id="conteudo" className={`site-page ${styles.page}`}>
      <nav aria-label="Trilha">
        <ol className={`bc-crumbs ${styles.crumbs}`}>
          <li>
            <Link href="/linha-do-tempo">Linha do tempo</Link>
          </li>
          <li>
            <Icon name="chev-r" className={`bc-icon ${styles.crumbSep}`} />
            <Link href={`/linha-do-tempo#periodo-${period.id}`}>{period.label}</Link>
          </li>
        </ol>
      </nav>

      <header className={styles.eventHead}>
        <h1 className={`bc-display ${styles.eventTitle} ${e.ref.length > 40 ? styles.eventTitleLong : ""}`}>{e.ref}</h1>
        <p className={styles.original}>
          <span lang="en" className={styles.originalTitle}>
            {e.titleEn}
          </span>
          <span className={styles.originalNote}>Título no Theographic, em inglês</span>
        </p>
        <div className={styles.factsBox}>
          <ul className={styles.facts} aria-label="Dados do evento">
            <li>
              {e.approximate ? "c. " : ""}
              {yearLabel(e.year)}
            </li>
            {duration && <li>{duration}</li>}
            <li>{plural(e.verses.length, "versículo", "versículos")}</li>
            <li className={styles.factLinks}>
              <span className={`i i-arc ${styles.factIcon}`} aria-hidden="true" />
              {plural(e.links.pairs, "ligação", "ligações")}
            </li>
          </ul>
        </div>
        {medal ? (
          <figure className={styles.medal}>
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP; next/image would add client JS */}
            <img className={`bc-medallion__img ${styles.medalImg}`} src={medal.src192} alt={medal.alt} width={96} height={96} />
            <figcaption className={styles.medalCaption}>
              Ilustração do grupo {medal.category}: {medal.label.charAt(0).toLowerCase()}
              {medal.label.slice(1)}
            </figcaption>
          </figure>
        ) : null}
      </header>

      <div className={styles.eventLayout}>
        <div className={styles.reading}>
          <h2 className="visually-hidden">Texto da Bíblia Livre</h2>
          <PassageText verses={shown} label={`Texto de ${e.ref}`} />
          {e.verses.length > shown.length && (
            <p className={styles.note}>
              Aqui, {formatInt(shown.length)} dos {formatInt(e.verses.length)} versículos. O resto está nos capítulos abaixo.
            </p>
          )}

          {e.chapters.length > 1 || e.verses.length > shown.length ? (
            <section className={styles.block} aria-labelledby="capitulos">
              <h2 className="bc-section-title" id="capitulos">
                Capítulos <small>{plural(e.chapters.length, "capítulo", "capítulos")}</small>
              </h2>
              <ul className={styles.chapters}>
                {e.chapters.map((ci) => {
                  const c = chapterRef(ci);
                  return (
                    <li key={ci}>
                      <span className={styles.chapterName}>{c.label}</span>
                      <span className={styles.chapterLinks}>
                        <Link href={c.path} aria-label={`Ler ${c.label}`}>
                          Ler
                        </Link>
                        <Link href={`/explorar/${c.book.slug}/${c.chapter}`} aria-label={`Explorar as ligações de ${c.label}`}>
                          Explorar
                        </Link>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section className={styles.block} aria-labelledby="lugares">
            <h2 className="bc-section-title" id="lugares">
              Lugares <small>{e.places.length ? plural(e.places.length, "lugar", "lugares") : "nenhum"}</small>
            </h2>
            {e.places.length ? (
              <>
                <ul className={styles.places}>
                  {e.places.map((p) => (
                    <li key={p.name}>
                      <span className={styles.placeName}>{p.name}</span>{" "}
                      <Link href={verseRef(p.gv).path} className={styles.placeRef} aria-label={`${p.name}, em ${verseRef(p.gv).label}`}>
                        {shortRef(p.gv)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className={styles.note}>Lugares do Theographic, com o nome como está no texto da BLIVRE, no versículo ao lado.</p>
              </>
            ) : (
              <p className={styles.note}>Nenhum lugar com nome achado no texto destes versículos.</p>
            )}
          </section>

          <section className={styles.block} aria-labelledby="temas">
            <h2 className="bc-section-title" id="temas">
              Temas destes versículos <small>{e.themes.length ? plural(e.themes.length, "tema", "temas") : "nenhum"}</small>
            </h2>
            {e.themes.length ? (
              <ul className={styles.themeChips}>
                {e.themes.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/tema/${t.slug}`} className={`bc-chip ${styles.chipLink}`} aria-label={`Tema ${t.label}, ${plural(t.passages, "passagem", "passagens")} aqui`}>
                      {t.label} <span className={styles.chipCount}>{formatInt(t.passages)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.note}>Nenhum dos temas publicados (OpenBible.info Topics) passa por estes versículos.</p>
            )}
            {e.themes.length > 0 && <p className={styles.note}>O número é o de passagens do tema dentro deste trecho.</p>}
          </section>

          {(predecessor || partOf) && (
            <section className={styles.block} aria-labelledby="sequencia">
              <h2 className="bc-section-title" id="sequencia">
                No Theographic
              </h2>
              <ul className={styles.sequence}>
                {partOf && (
                  <li>
                    Parte de <Link href={`/linha-do-tempo/${partOf.slug}`}>{partOf.ref}</Link>
                  </li>
                )}
                {predecessor && (
                  <li>
                    Vem depois de <Link href={`/linha-do-tempo/${predecessor.slug}`}>{predecessor.ref}</Link>
                  </li>
                )}
              </ul>
            </section>
          )}
        </div>

        <aside className={`bc-panel ${styles.panel}`} aria-labelledby="ligacoes">
          <div className={styles.panelHead}>
            <h2 className="bc-title" id="ligacoes">
              Ligações do trecho
            </h2>
            <p className={styles.panelLede}>
              {formatInt(e.links.pairs)} ligações tocam o trecho; {formatInt(e.links.partners)} versículos de fora
            </p>
          </div>
          {e.top.length > 0 ? (
            <>
              <p className={styles.note}>
                As {formatInt(e.top.length)} mais votadas com versículos de fora, das mais votadas às menos votadas. Votos: leitores da
                OpenBible.info, somadas as duas direções.
              </p>
              <ol className="bc-conns">
                {e.top.map(([gv, votes, from]) => {
                  const r = verseRef(gv);
                  const f = verseRef(from);
                  const dir = DIRECTION[links[from].find((l) => l[0] === gv)?.[2] ?? 3];
                  return (
                    <li key={gv} className="bc-conn">
                      <Link href={r.path} className="bc-conn__ref">
                        {r.label}
                        <Icon name={dir.icon} />
                        <span className="bc-visually-hidden">, {dir.text}</span>
                      </Link>
                      <span className="bc-conn__votes">
                        <span className="bc-conn__bar" style={{ "--w": (votes / maxVotes).toFixed(3) } as CSSProperties} aria-hidden="true" />
                        {plural(votes, "voto", "votos")}
                      </span>
                      <p className="bc-conn__text">
                        <BlivreText text={text[gv]} />
                      </p>
                      <p className={styles.connMeta}>
                        com <Link href={f.path}>{f.label}</Link>
                        {" · "}
                        <Link href={conexaoPath(side(from), side(gv))} aria-label={`Abrir a conexão de ${f.label} com ${r.label}`}>
                          Abrir conexão
                        </Link>
                      </p>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <p className={styles.note}>Nenhuma ligação da OpenBible.info sai deste trecho.</p>
          )}

          <section aria-labelledby="eventos-ligados" className={styles.panelSection}>
            <h2 className="bc-section-title" id="eventos-ligados">
              Eventos ligados <small>{related.length ? `os ${formatInt(related.length)} mais ligados` : "nenhum"}</small>
            </h2>
            {related.length ? (
              <>
                <ol className={styles.related}>
                  {related.map((l) => {
                    const o = events[l.event];
                    const [votes, here, there] = l.best;
                    return (
                      <li key={o.id}>
                        <Link href={`/linha-do-tempo/${o.slug}`} className={styles.relatedRef}>
                          {o.ref}
                        </Link>
                        <span className={styles.relatedMeta}>
                          {o.approximate ? "c. " : ""}
                          {yearLabel(o.year)} · <span lang="en">{o.titleEn}</span>
                        </span>
                        <span className={styles.relatedMeta}>
                          {plural(l.pairs, "ligação", "ligações")}; a mais votada, {verseRef(here).label} e {verseRef(there).label}, com{" "}
                          {plural(votes, "voto", "votos")}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className={styles.note}>
                  Eventos com versículos ligados aos deste trecho, pela ligação mais votada entre eles. Um evento que contém outro da lista
                  fica de fora.
                </p>
              </>
            ) : (
              <p className={styles.note}>Nenhum outro evento tem versículos ligados aos deste trecho.</p>
            )}
          </section>
        </aside>
      </div>

      <section className={styles.reception} aria-labelledby="recepcao">
        <div className={styles.receptionHead}>
          <h2 className="bc-title" id="recepcao">
            Recepção cultural
          </h2>
          {pilot && <p className={styles.panelLede}>{formatInt(pilot.works.length)} pinturas no Wikidata</p>}
        </div>
        {pilot ? (
          <>
            <p className={styles.receptionLede}>
              Piloto: pinturas que o Wikidata liga a {pilot.label}, em instantâneo. Título em português quando o Wikidata tem; senão, o título
              em inglês, marcado. Imagem só quando a página do arquivo no Wikimedia Commons diz domínio público, conferida uma por uma:{" "}
              {withImage.length === 1 ? "1 pintura tem" : `${formatInt(withImage.length)} pinturas têm`} imagem por enquanto.
            </p>
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
            <EraAxis
              axis={axis}
              lanes={lanes}
              caption="O evento fica na Antiguidade; as eras seguintes guardam a recepção da passagem. As cinco eras são uma convenção deste site, de largura igual."
            />
            {pilot.excluded.map((x) => (
              <p key={x.qid} className={styles.note}>
                Fora da lista: <a href={`https://www.wikidata.org/wiki/${x.qid}`}>{x.qid}</a>, que o Wikidata liga a esta passagem, mas {x.reason}.
              </p>
            ))}
            {ERAS.map((era, i) => {
              const list = dated.filter((w) => eraIndex(w.year as number) === i);
              return list.length ? (
                <section key={era.id} aria-labelledby={`era-${era.id}`} className={styles.eraBlock}>
                  <h3 className="bc-section-title" id={`era-${era.id}`}>
                    {era.label} <small>{eraSpanLabel(i, axis)} · {plural(list.length, "pintura", "pinturas")}</small>
                  </h3>
                  <ol className={styles.works}>
                    {list.map((w) => (
                      <li key={w.qid}>
                        <span className={styles.workYear}>{yearLabel(w.year as number)}</span>
                        <span className={styles.workMain}>
                          <a href={`https://www.wikidata.org/wiki/${w.qid}`}>{workTitle(w)}</a>
                          <span className={styles.workMeta}>{w.creator ?? "autor não indicado no Wikidata"}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null;
            })}
            {undated.length > 0 && (
              <section aria-labelledby="era-sem-data" className={styles.eraBlock}>
                <h3 className="bc-section-title" id="era-sem-data">
                  Sem data no Wikidata <small>{plural(undated.length, "pintura", "pinturas")}</small>
                </h3>
                <ol className={styles.works}>
                  {undated.map((w) => (
                    <li key={w.qid}>
                      <span className={styles.workYear} aria-label="sem data">
                        –
                      </span>
                      <span className={styles.workMain}>
                        <a href={`https://www.wikidata.org/wiki/${w.qid}`}>{workTitle(w)}</a>
                        <span className={styles.workMeta}>{w.creator ?? "autor não indicado no Wikidata"}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        ) : (
          <p className={styles.receptionLede}>{RECEPTION_EMPTY}</p>
        )}
      </section>

      <nav aria-label="Eventos vizinhos" className={`bc-pager ${styles.pager}`}>
        {prev ? (
          <Link href={`/linha-do-tempo/${prev.slug}`} rel="prev">
            <small>Evento anterior</small>
            <strong>{prev.ref}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/linha-do-tempo/${next.slug}`} rel="next">
            <small>Próximo evento</small>
            <strong>{next.ref}</strong>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <p className={styles.sources}>
        Eventos e datas: Theographic Bible Metadata, Viz.Bible (CC BY-SA 4.0), cronologia de Floyd Nolen Jones. Texto: Bíblia Livre (BLIVRE).
        Ligações: OpenBible.info.{pilot ? " Dados de obras: Wikidata (CC0)." : ""}
        {medal ? " Medalhão: ilustração gerada para o site." : ""} <Link href="/sobre">Créditos completos</Link>
      </p>
    </main>
  );
}
