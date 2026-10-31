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
import styles from "@/app/(site)/liturgia/liturgia.module.css";

type Search = Promise<{ date?: string | string[] }>;
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
function DateNavigation({ date, today }: { date: string; today: string }) {
  const previous = shiftLiturgyDate(date, -1), next = shiftLiturgyDate(date, 1);
  return <div className={styles.dateNavigation}>
    <div className={styles.dayStepper}>
      {previous ? <Link href={liturgyDayPath(previous)} prefetch={false} aria-label="Liturgia do dia anterior" className={styles.arrow}>←</Link> : <span />}
      <div><span className={styles.weekday}>{dateLabel(date, { weekday: "long" })}</span><time dateTime={date}>{dateLabel(date, { day: "numeric", month: "long", year: "numeric" })}</time></div>
      {next ? <Link href={liturgyDayPath(next)} prefetch={false} aria-label="Liturgia do dia seguinte" className={styles.arrow}>→</Link> : <span />}
    </div>
    <div className={styles.dateTools}>
      <form action="/liturgia" method="get" className={styles.dateForm}>
        <label htmlFor="liturgy-date">Escolher data</label>
        <div><input id="liturgy-date" name="date" type="date" defaultValue={date} min={MIN_LITURGY_DATE} max={MAX_LITURGY_DATE} required aria-label="Data da liturgia" /><button type="submit">Ver</button></div>
      </form>
      {date !== today && <Link href="/liturgia" prefetch={false} className={styles.todayLink}>Voltar para hoje ↗</Link>}
    </div>
  </div>;
}

async function DailyReadings({ searchParams }: { searchParams: Search }) {
  await connection();
  const search = await searchParams;
  const requested = Array.isArray(search.date) ? "invalid" : search.date;
  const data = await getDailyLiturgy(requested);
  const validDate = isLiturgyDate(data.date) ? data.date : data.today;
  return <div className={styles.layout} data-liturgy-date={validDate} data-reward-liturgy={data.ok && validDate === data.today ? data.today : undefined}>
    <aside className={styles.overview} aria-label="Data e leituras">
      <DateNavigation key={validDate} date={validDate} today={data.today} />
      {(data.ok || data.code !== "invalid-date") && <LiturgyShare key={validDate} date={validDate} references={data.ok ? data.readings.map((reading) => reading.reference) : []} />}
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
        <div className={styles.errorActions}><a className="bc-button bc-button--primary" href={`/liturgia?date=${validDate}`}>Tentar novamente</a><Link href="/ler" className="bc-button bc-button--secondary">Abrir a Bíblia</Link></div>
        <p>Você também pode consultar a liturgia no <a href="https://liturgiadiaria.edicoescnbb.com.br/" target="_blank" rel="noreferrer">site da CNBB ↗</a>.</p>
      </section> : <>
        <div className={styles.editionNote}><span aria-hidden="true" className={styles.editionMark}>✦</span><p><strong>Bíblia Livre.</strong> Versículos para estudo, em uma tradução diferente do lecionário.</p></div>
        {data.readings.map((reading, index) => <section key={reading.id} id={reading.id} className={styles.reading} data-liturgy-reading>
          <header className={styles.readingHeader}><span className={styles.readingNumber}>{String(index + 1).padStart(2, "0")}</span><div><p className={styles.sectionLabel}>{reading.label}</p><h2>{reading.reference}</h2></div></header>
          {reading.notice && <p className={styles.readingNotice}>{reading.notice}</p>}
          {reading.unavailableReason && <div className={styles.missingReading}><p>{reading.unavailableReason}</p><a href="https://liturgiadiaria.edicoescnbb.com.br/" target="_blank" rel="noreferrer">Consultar esta leitura na CNBB ↗</a></div>}
          {reading.passages.map((passage, p) => <div key={`${passage.path}-${p}`} className={styles.passage}>
            <div className={styles.passageHeading}><span>{passage.reference}</span><span>{data.edition.name}</span></div>
            <ol className={styles.verses}>{passage.verses.map((verse) => <li key={verse.path}>
              <span className={styles.verseNumber} aria-hidden="true">{verse.number}</span>
              <div><span className="visually-hidden">Versículo {verse.number}: </span><span data-scripture><Scripture text={verse.text} /></span>
                <div className={styles.verseActions}><VerseActions path={verse.path} label={`${passage.reference.split(":")[0]}:${verse.number}`} /></div>
              </div>
            </li>)}</ol>
            <Link href={passage.path} prefetch={false} className={styles.contextLink}>Ler no contexto e ver conexões <span aria-hidden="true">↗</span></Link>
          </div>)}
        </section>)}
        <section className={styles.continueReading}><p className={styles.sectionLabel}>Leve a leitura com você</p><h2>O que ficou no seu coração?</h2><p>Continue a reflexão, encontre uma passagem ou descubra como os textos se conectam.</p><Link href="/coracao" prefetch={false}>Abrir meu espaço de reflexão <span aria-hidden="true">↗</span></Link></section>
      </>}
      <footer className={styles.sources}><details><summary>Sobre as leituras e suas fontes</summary><p>As referências seguem o calendário litúrgico católico usado no Brasil, consultado no <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name} ↗</a>. Este espaço de leitura está aberto a todos. Celebrações locais e opções podem variar.</p><p>Os textos de estudo são da Bíblia Livre. Consulte o <a href={data.source.officialUrl} target="_blank" rel="noreferrer">lecionário na CNBB</a> para a redação litúrgica, os recortes, refrões e orações. Na fonte, escolha a mesma data. <Link href="/sobre">Fontes e créditos</Link>.</p></details></footer>
    </div>
    {!requested && <LiturgyRefresh renderedDate={data.today} />}
  </div>;
}

export function LiturgyPageContent({ searchParams }: { searchParams: Search }) {
  return <main id="conteudo" className={`site-page ${styles.page}`} data-liturgy-page>
    <header className={styles.intro}><div><p className={styles.eyebrow}>Um ritmo de leitura</p><h1>Liturgia <em>diária.</em></h1></div><p>Um encontro com a Palavra.<br />Todos os dias, um novo caminho.</p></header>
    <noscript><style>{"[data-liturgy-loading] { display: none !important; }"}</style><div className={styles.unavailable}><h2>Consulte as leituras do dia.</h2><p>A consulta diária neste app precisa de JavaScript. Você pode <a href="https://liturgiadiaria.edicoescnbb.com.br/">abrir a liturgia oficial na CNBB</a> ou <Link href="/ler" prefetch={false}>continuar lendo a Bíblia</Link>.</p></div></noscript>
    <Suspense fallback={<div className={styles.loading} data-liturgy-loading role="status"><span aria-hidden="true">✦</span><p>Buscando as leituras do dia…</p></div>}><DailyReadings searchParams={searchParams} /></Suspense>
  </main>;
}
