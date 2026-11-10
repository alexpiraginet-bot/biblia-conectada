"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { addDays, daysBetween, firstLetters, LAST_BOX, LEITNER_DAYS, passagePlace, type CadernoCatalog, type Memo } from "@/lib/caderno/model";
import { answerReview } from "@/lib/caderno/store";
import { formatInt } from "@/lib/canon/text";
import styles from "./caderno.module.css";

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });
/** "12 de novembro" for a day string; the day is already a calendar day, so it is formatted as it is. */
export const dayLabel = (day: string) => dayFmt.format(new Date(`${day}T00:00:00Z`));

/** "hoje", "amanhã" or "em 4 dias (14 de novembro)" */
export function whenLabel(day: string, today: string): string {
  const days = daysBetween(today, day);
  if (days <= 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${formatInt(days)} dias (${dayLabel(day)})`;
}

const restLabel = (days: number) => (days === 1 ? "amanhã" : `em ${formatInt(days)} dias`);

/**
 * Today's review, one passage at a time: the reference, the reader recites from memory (the first letters help),
 * the text is shown and the reader says how it went. A passage answered "Ainda não" comes back after the others.
 */
export function Review({ due, today, next, catalog, onProblem }: { due: Memo[]; today: string; next: Memo | undefined; catalog: CadernoCatalog; onProblem: (message: string) => void }) {
  const [later, setLater] = useState<string[]>([]);
  const [shown, setShown] = useState(false);
  const [hint, setHint] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const head = useRef<HTMLHeadingElement>(null);

  const waiting = later.flatMap((id) => due.filter((m) => m.id === id));
  const queue = [...due.filter((m) => !later.includes(m.id)), ...waiting];
  const current = queue[0];

  if (!current) {
    return (
      <div className={styles.review} data-review="done">
        <p className={styles.reviewDone}>
          {remembered > 0 ? "Revisão de hoje concluída." : "Nada para revisar hoje."}
          {next && ` A próxima é ${whenLabel(next.proxima, today)}.`}
        </p>
      </div>
    );
  }

  const place = passagePlace(catalog, current);
  const answer = (ok: boolean) => {
    const result = answerReview(current.id, ok);
    if (!result.ok) return onProblem(result.message);
    setShown(false);
    setHint(false);
    setLater((ids) => (ok ? ids.filter((id) => id !== current.id) : [...ids.filter((id) => id !== current.id), current.id]));
    if (ok) setRemembered((n) => n + 1);
    requestAnimationFrame(() => head.current?.focus());
  };

  return (
    <div className={styles.review} data-review="open">
      <p className={styles.reviewCount}>{queue.length === 1 ? "1 passagem para revisar hoje" : `${formatInt(queue.length)} passagens para revisar hoje`}</p>
      <h3 ref={head} tabIndex={-1} className={styles.reviewRef}>
        {place?.ref ?? `${current.livro} ${current.cap}:${current.de}`}
      </h3>
      <p className={styles.reviewBox}>
        Caixa {current.caixa} de {LAST_BOX}
      </p>
      {shown ? (
        <>
          <blockquote className={styles.reviewText} data-review-text="">
            {current.texto}
          </blockquote>
          <p className={styles.reviewAsk}>Você lembrou?</p>
          <div className={styles.reviewButtons}>
            <button type="button" className="bc-button bc-button--primary" onClick={() => answer(true)}>
              Lembrei
            </button>
            <button type="button" className="bc-button bc-button--secondary" onClick={() => answer(false)}>
              Ainda não
            </button>
          </div>
          <p className={styles.reviewNote}>
            Lembrei: volta {restLabel(LEITNER_DAYS[current.caixa - 1])}, em {dayLabel(addDays(today, LEITNER_DAYS[current.caixa - 1]))}. Ainda não: volta ainda hoje, na caixa 1.
            {place && (
              <>
                {" "}
                <Link href={place.path} prefetch={false}>
                  Abrir {place.ref} na leitura
                </Link>
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <p className={styles.reviewAsk}>Diga a passagem de memória, em voz alta ou em silêncio. Depois confira.</p>
          {hint && (
            <p className={styles.reviewHint} data-review-hint="">
              <span className="visually-hidden">Primeira letra de cada palavra: </span>
              {firstLetters(current.texto)}
            </p>
          )}
          <div className={styles.reviewButtons}>
            <button type="button" className="bc-button bc-button--primary" onClick={() => setShown(true)}>
              Mostrar o texto
            </button>
            <button type="button" className="bc-button bc-button--secondary" aria-pressed={hint} onClick={() => setHint((on) => !on)}>
              {hint ? "Esconder as primeiras letras" : "Ver as primeiras letras"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
