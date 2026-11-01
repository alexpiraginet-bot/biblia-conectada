import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getDailyLiturgy } from "@/lib/liturgy/service";
import { isLiturgyDate, MAX_LITURGY_DATE, MIN_LITURGY_DATE, shiftLiturgyDate } from "@/lib/liturgy/dates";
import { VerseActions } from "@/components/assistant/VerseActions";
import { Scripture } from "@/components/reader/Scripture";
import { LiturgyShare } from "./LiturgyShare";
import { liturgyDayPath } from "@/lib/liturgy/share";
import { LiturgyRefresh } from "@/components/liturgy/LiturgyRefresh";
import { getTranslation, type TranslationId } from "@/lib/translations";
import { LITURGY_EXTERNAL_EDITIONS, liturgyEditionQuery, parseLiturgyEdition } from "@/lib/liturgy/edition";
import type { LiturgyPassage } from "@/lib/liturgy/types";
import styles from "@/app/(site)/liturgia/liturgia.module.css";

export type LiturgySearch = Promise<{ date?: string | string[]; edition?: string | string[] }>;
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
function DateNavigation({ date, today, edition }: { date: string; today: string; edition: TranslationId }) {
  const previous = shiftLiturgyDate(date, -1), next = shiftLiturgyDate(date, 1);
  return <div className={styles.dateNavigation}>
    <div className={styles.dayStepper}>
      {previous ? <Link href={liturgyDayPath(previous, edition)} prefetch={false} aria-label="Liturgia do dia anterior" className={styles.arrow}>←</Link> : <span />}
      <div><span className={styles.weekday}>{dateLabel(date, { weekday: "long" })}</span><time dateTime={date}>{dateLabel(date, { day: "numeric", month: "long", year: "numeric" })}</time></div>
      {next ? <Link href={liturgyDayPath(next, edition)} prefetch={false} aria-label="Liturgia do dia seguinte" className={styles.arrow}>→</Link> : <span />}
    </div>
    <div className={styles.dateTools}>
      <form action="/liturgia" method="get" className={styles.dateForm}>
        <input type="hidden" name="edition" value={edition} />
        <label htmlFor="liturgy-date">Escolher data</label>
        <div><input id="liturgy-date" name="date" type="date" defaultValue={date} min={MIN_LITURGY_DATE} max={MAX_LITURGY_DATE} required aria-label="Data da liturgia" /><button type="submit">Ver</button></div>
      </form>
      {date !== today && <Link href={`/liturgia${liturgyEditionQuery(edition)}`} prefetch={false} className={styles.todayLink}>Voltar para hoje ↗</Link>}
    </div>
  </div>;
}

function EditionChooser({ date, edition }: { date?: string; edition: TranslationId | null }) {
  return <section className={styles.editionPicker} aria-label="Tradução para estudo">
    <p className={styles.sectionLabel}>Leia na sua tradução</p>
    <nav className={styles.editionChoices} aria-label="Tradução nesta página">
      {(["blivre", "open-nbv"] as const).map((id) => <Link key={id} href={date ? liturgyDayPath(date, id) : `/liturgia${liturgyEditionQuery(id)}`} prefetch={false} scroll={false} aria-current={edition === id ? "page" : undefined}>{id === "blivre" ? "Bíblia Livre" : "Open NBV"}<small>{id === "blivre" ? "Versículos para estudo" : "Capítulos para contexto"}</small></Link>)}
    </nav>
    <div className={styles.externalEditions}><a href={LITURGY_EXTERNAL_EDITIONS.cnbb} target="_blank" rel="noreferrer">Texto litúrgico · CNBB ↗</a><a href={LITURGY_EXTERNAL_EDITIONS.aveMaria} target="_blank" rel="noreferrer">Ave-Maria ↗ · leitura externa</a></div>
    <p className={styles.externalNotice}>CNBB e Ave-Maria abrem nos sites de seus responsáveis. Na CNBB, escolha a mesma data.</p>
  </section>;
}

function PassageText({ passage, edition }: { passage: LiturgyPassage; edition: TranslationId }) {
  const context = edition === "open-nbv";
  return <div className={styles.passage}>
    <div className={styles.passageHeading}><span>{passage.reference}{context ? " · capítulo completo" : ""}</span><span>{getTranslation(edition)!.shortName}</span></div>
    <ol className={styles.verses}>{passage.verses.map((verse) => <li key={verse.path}>
      <span className={styles.verseNumber} aria-hidden="true">{verse.number}</span>
      <div><span className="visually-hidden">Versículo {verse.number}: </span><span data-scripture data-reading-ref={verse.path}><Scripture text={verse.text} /></span>
        <div className={styles.verseActions}><VerseActions path={verse.path} label={`${passage.reference.split(":")[0]}:${verse.number}`} /></div>
      </div>
    </li>)}</ol>
    <Link href={passage.path} prefetch={false} className={styles.contextLink}>{context ? "Abrir capítulo na Open NBV" : "Ler no contexto e ver conexões"} <span aria-hidden="true">↗</span></Link>
    {context && <p className={styles.chapterConnections}><Link href={`/explorar${passage.path.replace("/ler/open-nbv", "")}`} prefetch={false}>Conexões do capítulo na BLIVRE ↗</Link><span>As conexões usam outra edição; os versículos não estão alinhados à Open NBV.</span></p>}
  </div>;
}

async function DailyReadings({ searchParams }: { searchParams: LiturgySearch }) {
  await connection();
  const search = await searchParams;
  const requested = Array.isArray(search.date) ? "invalid" : search.date;
  const selectedEdition = parseLiturgyEdition(search.edition);
  const edition = selectedEdition ?? "blivre";
  const data = await getDailyLiturgy(requested, search.edition);
  const validDate = isLiturgyDate(data.date) ? data.date : data.today;
  return <><EditionChooser date={requested ? validDate : undefined} edition={selectedEdition} /><div className={styles.layout} data-liturgy-date={validDate} data-liturgy-edition={selectedEdition ?? undefined} data-reward-liturgy={data.ok && validDate === data.today ? data.today : undefined}>
    <aside className={styles.overview} aria-label="Data e leituras">
      <DateNavigation key={`navigation-${validDate}-${edition}`} date={validDate} today={data.today} edition={edition} />
      {(data.ok || data.code === "unavailable") && <LiturgyShare key={`share-${validDate}-${edition}`} date={validDate} edition={edition} references={data.ok ? data.readings.map((reading) => reading.reference) : []} />}
      {data.ok && <>
        <div className={styles.celebration}>
          <p className={styles.sectionLabel}>Celebração</p>
          <h2>{data.celebration}</h2>
          {data.color !== "unknown" && <span className={styles.liturgicalColor}>Cor litúrgica: <strong>{data.colorLabel}</strong></span>}
        </div>
        <nav className={styles.readingNav} aria-label="Leituras deste dia">{data.readings.map((reading, index) => <a key={reading.id} href={`#${reading.id}`}>
          <span className={styles.readingNumber}>{String(index + 1).padStart(2, "0")}</span><span>{reading.label}<small>{reading.reference}</small></span><span aria-hidden="true">↓</span>
        </a>)}</nav>
      </>}
      <Link className={styles.officialLink} href="/jornada" prefetch={false}>Minha jornada de leitura <span aria-hidden="true">↗</span></Link>
    </aside>
    <div className={styles.readings}>
      {!data.ok ? <section className={styles.unavailable} role="alert">
        <p className={styles.sectionLabel}>Consulta da liturgia</p>
        <h2>Vamos tentar de novo.</h2><p>{data.message}</p>
        <div className={styles.errorActions}>{data.code !== "invalid-edition" && <a className="bc-button bc-button--primary" href={liturgyDayPath(validDate, edition)}>Tentar novamente</a>}<Link href={edition === "open-nbv" ? "/ler/open-nbv" : "/ler"} className="bc-button bc-button--secondary">Abrir a Bíblia</Link></div>
        <p>Você também pode consultar a liturgia no <a href="https://liturgiadiaria.edicoescnbb.com.br/" target="_blank" rel="noreferrer">site da CNBB ↗</a>.</p>
      </section> : <>
        <div className={styles.editionNote}><span aria-hidden="true" className={styles.editionMark}>✦</span><p><strong>{data.edition.name}.</strong> {edition === "open-nbv" ? "Abra os capítulos abaixo para ler o contexto de cada referência, sem equivalência de versículos presumida." : "Versículos para estudo, em uma tradução diferente do lecionário."}</p></div>
        {data.readings.map((reading, index) => <section key={reading.id} id={reading.id} className={styles.reading} data-liturgy-reading>
          <header className={styles.readingHeader}><span className={styles.readingNumber}>{String(index + 1).padStart(2, "0")}</span><div><p className={styles.sectionLabel}>{reading.label}</p><h2>{reading.reference}</h2></div></header>
          {reading.notice && <p className={styles.readingNotice}>{reading.notice}</p>}
          {reading.unavailableReason && <div className={styles.missingReading}><p>{reading.unavailableReason}</p><a href="https://liturgiadiaria.edicoescnbb.com.br/" target="_blank" rel="noreferrer">Consultar esta leitura na CNBB ↗</a></div>}
          {reading.passages.map((passage, p) => edition === "open-nbv" ? <details key={passage.path} className={styles.contextChapter} open={index === 0 && p === 0}><summary>Ler {passage.reference} <small>Capítulo completo · Open NBV</small></summary><PassageText passage={passage} edition={edition} /></details> : <PassageText key={`${passage.path}-${p}`} passage={passage} edition={edition} />)}
        </section>)}
        <section className={styles.continueReading}><p className={styles.sectionLabel}>Leve a leitura com você</p><h2>O que ficou no seu coração?</h2><p>Continue a reflexão, encontre uma passagem ou descubra como os textos se conectam.</p><Link href="/coracao" prefetch={false}>Abrir meu espaço de reflexão <span aria-hidden="true">↗</span></Link></section>
      </>}
      <footer className={styles.sources}>{edition === "open-nbv" && data.ok && <div className={styles.translationCredit}><p>{getTranslation(edition)!.credit} <a href={getTranslation(edition)!.licenseUrl} target="_blank" rel="noreferrer">{getTranslation(edition)!.license}</a>.</p><p>{getTranslation(edition)!.sourceNotice}</p><p>{getTranslation(edition)!.trademarkNotice}</p></div>}<details><summary>Sobre as leituras e suas fontes</summary><p>As referências seguem o calendário litúrgico católico usado no Brasil, consultado no <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name} ↗</a>. Este espaço de leitura está aberto a todos. Celebrações locais e opções podem variar.</p><p>Os textos de estudo são da {getTranslation(edition)!.name}. Consulte o <a href={data.source.officialUrl} target="_blank" rel="noreferrer">lecionário na CNBB</a> para a redação litúrgica, os recortes, refrões e orações. Na fonte, escolha a mesma data. <Link href="/sobre">Fontes e créditos</Link>.</p></details></footer>
    </div>
    {!requested && <LiturgyRefresh renderedDate={data.today} />}
  </div></>;
}

export function LiturgyPageContent({ searchParams }: { searchParams: LiturgySearch }) {
  return <main id="conteudo" className={`site-page ${styles.page}`} data-liturgy-page>
    <header className={styles.intro}><div><p className={styles.eyebrow}>Um ritmo de leitura</p><h1>Liturgia <em>diária.</em></h1></div><p>Um encontro com a Palavra.<br />Todos os dias, um novo caminho.</p></header>
    <noscript><style>{"[data-liturgy-loading] { display: none !important; }"}</style><div className={styles.unavailable}><h2>Consulte as leituras do dia.</h2><p>A consulta diária neste app precisa de JavaScript. Você pode <a href="https://liturgiadiaria.edicoescnbb.com.br/">abrir a liturgia oficial na CNBB</a> ou <Link href="/ler" prefetch={false}>continuar lendo a Bíblia</Link>.</p></div></noscript>
    <Suspense fallback={<div className={styles.loading} data-liturgy-loading role="status"><span aria-hidden="true">✦</span><p>Buscando as leituras do dia…</p></div>}><DailyReadings searchParams={searchParams} /></Suspense>
  </main>;
}
