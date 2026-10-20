import Link from "next/link";
import { formatInt } from "@/lib/canon/text";
import { yearLabel } from "@/lib/eras";
import type { TimelineEvent } from "@/lib/timeline";
import type { Period } from "@/lib/timeline-periods";
import styles from "./timeline.module.css";

// The events of the Linha do tempo as a calm vertical timeline: one section per period (its name as a title, its span
// and count), each event a row with its year, a dot on the spine (larger the more links touch it), the Portuguese
// reference as its title, Theographic's English title and the link count. The chips filter the periods with CSS only
// (a radio group read by :has()), so the filter works before and without JavaScript; its rules are written here, from
// the same list of periods as the sections.

const eventos = (n: number) => `${formatInt(n)} ${n === 1 ? "evento" : "eventos"}`;
const ligacoes = (n: number) => `${formatInt(n)} ${n === 1 ? "ligação" : "ligações"}`;
const spanOf = (p: Period<TimelineEvent>) => (p.first === p.last ? `em ${yearLabel(p.first)}` : `de ${yearLabel(p.first)} a ${yearLabel(p.last)}`);
/** dot size step, 0–4, by the log of the links (the scale of the sky's ticks) */
const step = (pairs: number, max: number) => Math.round((Math.log1p(pairs) / Math.log1p(max)) * 4);

function filterRules(periods: Period<TimelineEvent>[]): string {
  const root = `.${styles.timeline}`;
  return periods
    .map((p) => {
      const on = `${root}:has(#f-${p.id}:checked)`;
      return `${on} [data-period]:not([data-period="${p.id}"]),${on} [data-for]:not([data-for="${p.id}"]){display:none}${on} [data-for="${p.id}"]{display:inline}`;
    })
    .join("");
}

export function EventList({ periods, total }: { periods: Period<TimelineEvent>[]; total: number }) {
  const max = Math.max(...periods.flatMap((p) => p.events.map((e) => e.links.pairs)));
  const chips = [{ id: "todos", label: "Todos", count: total }, ...periods.map((p) => ({ id: p.id, label: p.label, count: p.events.length }))];
  return (
    <div className={styles.timeline}>
      <style>{filterRules(periods)}</style>
      <fieldset className={styles.filter}>
        <legend className={styles.filterLegend}>Mostrar os eventos de</legend>
        <div className={styles.chips}>
          {chips.map((c) => (
            <span key={c.id} className={styles.chipItem}>
              <input type="radio" name="periodo" id={`f-${c.id}`} value={c.id} defaultChecked={c.id === "todos"} className={styles.radio} />
              <label htmlFor={`f-${c.id}`} className={`bc-chip ${styles.chip}`}>
                {c.label} <span className={styles.chipCount}>{formatInt(c.count)}</span>
              </label>
            </span>
          ))}
        </div>
      </fieldset>
      <p className={styles.status} aria-live="polite">
        <span data-for="todos">
          Todos os {eventos(total)}, em {formatInt(periods.length)} períodos.
        </span>
        {periods.map((p) => (
          <span key={p.id} data-for={p.id}>
            {p.label}: {eventos(p.events.length)}, {spanOf(p)}.
          </span>
        ))}
      </p>

      <div className={styles.periods} id="eventos-lista">
        {periods.map((p) => (
          <section key={p.id} className={styles.period} data-period={p.id} aria-labelledby={`periodo-${p.id}`}>
            <header className={styles.periodHead}>
              <h2 className="bc-title" id={`periodo-${p.id}`}>
                {p.label}
              </h2>
              <p className={styles.periodMeta}>
                {eventos(p.events.length)}, {spanOf(p)}
              </p>
            </header>
            <ol className={styles.events}>
              {p.events.map((e) => (
                <li key={e.id} className={styles.event} data-event={e.id}>
                  <span className={styles.year}>
                    {e.approximate ? "c. " : ""}
                    {yearLabel(e.year)}
                  </span>
                  <span className={styles.dot} data-s={step(e.links.pairs, max)} aria-hidden="true" />
                  <span className={styles.main}>
                    <Link href={`/linha-do-tempo/${e.slug}`} className={styles.ref}>
                      {e.ref}
                    </Link>
                    <span className={styles.en} lang="en">
                      {e.titleEn}
                    </span>
                  </span>
                  <span className={styles.links}>
                    <span className={`i i-arc ${styles.linksIcon}`} aria-hidden="true" />
                    {ligacoes(e.links.pairs)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
