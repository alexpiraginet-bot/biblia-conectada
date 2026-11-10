"use client";

// A reading plan on this device. The portions arrive computed by the server (lib/planos/model.ts); what is read comes
// from the personal reading progress (lib/reading-progress), in the edition the reader follows the plan with. The
// plan itself stores only that it is followed, since when and in which edition (store.ts). Rules: docs/PLANOS.md.
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatInt } from "@/lib/canon/text";
import { planProgress, type PlanEdition, type Portion } from "@/lib/planos/model";
import { chapterReadingSummary, scopeFromCatalog, type ChapterScope, type ReadingCatalog } from "@/lib/reading-progress/model";
import { markChapterRead, useReadingProgress } from "@/lib/reading-progress/store";
import { translationPath } from "@/lib/translations";
import { follow, leave, usePlans } from "./store";
import styles from "./planos.module.css";

export type PlanPortion = { day: number; verses: number; label: string; chapters: [book: string, chapter: number][] };
type Props = {
  plan: { id: string; title: string; days: number };
  portions: PlanPortion[];
  /** the plan's books in each edition, with their own verse counts */
  catalog: ReadingCatalog;
  /** the books' names, to say a chapter ("Gênesis 3") */
  names: Record<string, string>;
};

const EDITIONS: { id: PlanEdition; name: string }[] = [
  { id: "blivre", name: "Bíblia Livre" },
  { id: "open-nbv", name: "Open Nova Bíblia Viva" },
];
const TIME_ZONE = "America/Sao_Paulo";
const dayOf = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const sayDay = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const utc = (day: string) => Date.parse(`${day}T00:00:00Z`);
const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;
const key = (book: string, chapter: number) => `${book}/${chapter}`;

export function PlanTracker({ plan, portions, catalog, names }: Props) {
  const reading = useReadingProgress();
  const plans = usePlans();
  const following = plans?.planos[plan.id];
  const [picked, setPicked] = useState<PlanEdition | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState("");
  const title = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const acted = useRef(false);
  // not followed yet: the edition last read, so the plan starts where the reader already is
  const edition: PlanEdition = following?.edicao ?? picked ?? (reading.status === "ready" ? reading.state.lastEdition : "blivre");
  const ready = reading.status === "ready" && plans !== null;

  const scopes = useMemo(() => {
    const map = new Map<string, ChapterScope>();
    for (const p of portions) {
      for (const [book, chapter] of p.chapters) {
        const scope = scopeFromCatalog(catalog, edition, book, chapter);
        if (scope) map.set(key(book, chapter), scope);
      }
    }
    return map;
  }, [portions, catalog, edition]);
  const isRead = useMemo(() => {
    const state = reading.state;
    return (book: string, chapter: number) => {
      const scope = scopes.get(key(book, chapter));
      return scope !== undefined && chapterReadingSummary(state, scope).complete;
    };
  }, [reading.state, scopes]);
  const progress = useMemo(
    () => planProgress(portions.map((p): Portion => ({ day: p.day, verses: p.verses, chapters: p.chapters.map(([book, chapter]) => ({ book, chapter, verses: 0 })) })), isRead),
    [portions, isRead],
  );
  const done = useMemo(() => new Set(progress.done), [progress.done]);
  const next = progress.next ? portions[progress.next.day - 1] : null;
  const href = (book: string, chapter: number) => translationPath(edition, book, chapter);
  const state = !ready ? "loading" : progress.finished ? "finished" : following ? "following" : "open";
  // Following, leaving and reading the last portion take away the button that was pressed: the card's title takes
  // the focus then, so a keyboard or a screen reader is not left at the top of the page.
  useEffect(() => {
    if (!acted.current) return;
    acted.current = false;
    heading.current?.focus();
  }, [state]);
  const firstUnread = (p: PlanPortion) => p.chapters.find(([book, chapter]) => !isRead(book, chapter)) ?? p.chapters[0];

  const choose = (id: PlanEdition) => {
    setSaid("");
    if (!following) return setPicked(id);
    if (!follow(plan.id, following.inicio, id)) setSaid("O navegador não guardou a mudança de edição.");
  };
  const start = () => {
    const today = dayOf.format(new Date());
    acted.current = true;
    setSaid(follow(plan.id, today, edition) ? "Você está seguindo este plano neste aparelho." : "O navegador não guardou o plano. Você pode ler as porções pela lista abaixo.");
  };
  const stop = () => {
    acted.current = true;
    setPicked(edition);
    setSaid(leave(plan.id) ? "Você parou de seguir este plano. As marcações de leitura continuam guardadas." : "O navegador não guardou a mudança.");
  };
  // one chapter at a time: each write is checked by the reading progress before the next begins
  const markPortion = async () => {
    if (!next || busy) return;
    setBusy(true);
    setSaid("");
    // the last portion ends the plan and takes this button away: say so before the marks land, the card changes with them
    acted.current = progress.done.length === portions.length - 1;
    let marked = 0;
    let problem = "";
    for (const [book, chapter] of next.chapters) {
      if (isRead(book, chapter)) continue;
      const scope = scopes.get(key(book, chapter));
      if (!scope) {
        problem = `${names[book] ?? book} ${chapter} não existe nesta edição.`;
        break;
      }
      const result = await markChapterRead(scope, true);
      if (!result.ok) {
        problem = result.message;
        break;
      }
      marked++;
    }
    setBusy(false);
    if (problem) {
      acted.current = false;
      setSaid(marked > 0 ? `${plural(marked, "capítulo marcado", "capítulos marcados")}; depois o navegador recusou: ${problem}` : problem);
    } else setSaid(`Dia ${formatInt(next.day)} lido: ${next.label}.`);
  };

  const calendar = (() => {
    if (!following) return null;
    const today = dayOf.format(new Date());
    const day = Math.round((utc(today) - utc(following.inicio)) / 86_400_000) + 1;
    const began = `Você começou em ${sayDay.format(new Date(utc(following.inicio)))}.`;
    if (progress.finished || day < 1) return began;
    if (day > plan.days) return `${began} Os ${formatInt(plan.days)} dias do calendário já passaram; o plano não tem prazo, siga no seu ritmo.`;
    if (next && next.day >= day) return `${began} Pelo calendário, hoje é o dia ${formatInt(day)}: você está em dia.`;
    return `${began} Pelo calendário, hoje seria o dia ${formatInt(day)}. O plano não tem prazo: continue de onde parou.`;
  })();

  return (
    <div className={styles.tracker} data-plan-tracker={plan.id} data-plan-ready={ready ? "" : undefined}>
      <section className={styles.card} aria-labelledby={title} data-plan-state={state}>
        <h2 id={title} ref={heading} tabIndex={-1} className={styles.cardTitle}>
          {state === "finished" ? "Plano concluído" : state === "following" && next ? `Próxima porção · dia ${formatInt(next.day)} de ${formatInt(plan.days)}` : "Seguir este plano"}
        </h2>

        {reading.status === "corrupt" || reading.status === "unavailable" ? (
          <p className={styles.problem} role="status">
            {reading.message} As porções continuam na lista abaixo. <Link href="/jornada#leitura">Abrir Minha leitura</Link>
          </p>
        ) : state === "finished" ? (
          <p className={styles.note} data-plan-finished="">
            Você leu os {formatInt(progress.chapters)} capítulos deste plano na {EDITIONS.find((e) => e.id === edition)!.name}.{" "}
            <Link href="/planos">Ver os outros planos</Link>
          </p>
        ) : state === "following" && next ? (
          <>
            <p className={styles.nextLabel} data-plan-next={next.day}>
              {next.label}
              <span className={styles.nextCount}>{plural(next.verses, "versículo", "versículos")}</span>
            </p>
            <ul className={styles.chapters}>
              {next.chapters.map(([book, chapter]) => {
                const read = isRead(book, chapter);
                return (
                  <li key={key(book, chapter)}>
                    <Link href={href(book, chapter)} className={styles.chapter} data-read={read ? "" : undefined}>
                      {names[book] ?? book} {chapter}
                      {read && <span className={styles.chapterRead}>lido</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className={styles.actions}>
              <Link href={href(...firstUnread(next))} className="bc-button bc-button--primary" data-plan-read="">
                Ler {names[firstUnread(next)[0]] ?? firstUnread(next)[0]} {firstUnread(next)[1]}
              </Link>
              <button type="button" className="bc-button bc-button--secondary" onClick={markPortion} disabled={busy} data-plan-mark="">
                {busy ? "Marcando…" : "Marcar a porção como lida"}
              </button>
            </div>
          </>
        ) : (
          // also what the server renders: the page arrives with the card at its size, the controls wake up with it
          <>
            <p className={styles.note}>
              Seguir guarda neste aparelho que você está neste plano e desde quando. O plano avança com os capítulos que você marcar como lidos na
              edição escolhida.
              {ready && progress.chaptersRead > 0 && ` Você já leu ${formatInt(progress.chaptersRead)} dos ${formatInt(progress.chapters)} capítulos nessa edição.`}
            </p>
            <div className={styles.actions}>
              <button type="button" className="bc-button bc-button--primary" onClick={start} disabled={!ready} data-plan-follow="">
                Seguir este plano
              </button>
            </div>
          </>
        )}
        <p className={styles.said} role="status" aria-live="polite" data-plan-said="">
          {said}
        </p>

        <fieldset className={styles.editions} disabled={!ready}>
          <legend className={styles.editionsLabel}>Edição da leitura</legend>
          {EDITIONS.map((e) => (
            <label key={e.id} className={styles.edition}>
              <input type="radio" name={`${title}-e`} value={e.id} checked={edition === e.id} onChange={() => choose(e.id)} />
              <span>{e.name}</span>
            </label>
          ))}
        </fieldset>
        <p className={styles.progressLine} data-plan-progress="">
          <progress className={styles.progress} max={progress.chapters} value={ready ? progress.chaptersRead : 0} aria-label={`Capítulos lidos em ${plan.title}`} />
          <span>
            {ready
              ? `${formatInt(progress.done.length)} de ${plural(plan.days, "dia", "dias")} · ${formatInt(progress.chaptersRead)} de ${plural(progress.chapters, "capítulo", "capítulos")}`
              : "Lendo o progresso guardado neste aparelho…"}
          </span>
        </p>
        {calendar && <p className={styles.note}>{calendar}</p>}
        {following && (
          <button type="button" className={`bc-button bc-button--ghost ${styles.stop}`} onClick={stop} data-plan-leave="">
            Parar de seguir
          </button>
        )}
        <noscript>
          <style>{'[data-plan-tracker] section[data-plan-state="loading"] > :not(noscript, h2) { display: none; }'}</style>
          <p className={styles.note}>Sem JavaScript o plano não acompanha a leitura. As porções abaixo abrem normalmente.</p>
        </noscript>
      </section>

      <h2 className="bc-section-title">
        As {formatInt(portions.length)} porções
        <small>cada dia abre no primeiro capítulo ainda não lido</small>
      </h2>
      <ol className={styles.portions} data-portions="">
        {portions.map((p) => {
          const read = ready && done.has(p.day);
          const upNext = ready && following !== undefined && next?.day === p.day;
          const [book, chapter] = ready ? firstUnread(p) : p.chapters[0];
          return (
            <li key={p.day} id={`dia-${p.day}`} className={styles.portion} data-day={p.day} data-done={read ? "" : undefined} data-next={upNext ? "" : undefined}>
              <span className={styles.day}>
                <span className="bc-visually-hidden">Dia </span>
                {p.day}
              </span>
              <Link href={href(book, chapter)} prefetch={false} className={styles.portionLink}>
                {p.label}
              </Link>
              <span className={styles.portionCount}>
                {read ? <span className={styles.readMark}>lido</span> : upNext ? <span className={styles.nextMark}>próxima</span> : null}
                {plural(p.verses, "versículo", "versículos")}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
