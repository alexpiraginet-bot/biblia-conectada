"use client";

// The notebook on the reading pages. SelectionBar.tsx loads this module the first time the reader uses "Grifar",
// "Anotar" or "Decorar", or when this browser already has a notebook; no other page carries it.
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { formatInt } from "@/lib/canon/text";
import { chapterMarks, chapterNotebook, findNota, MAX_NOTE_CHARS, type Nota, type Passage } from "@/lib/caderno/model";
import { eraseNota, getCadernoSnapshot, useCaderno, writeNota } from "@/lib/caderno/store";
import { passageRef } from "@/lib/salvos";
import styles from "./reader.module.css";

export { MARK_COLORS, MARK_LABEL, MAX_TEXT_CHARS } from "@/lib/caderno/model";
export { markPassage, memorise, unmarkPassage } from "@/lib/caderno/store";

/** The colour last used and the colour of each highlighted verse of a chapter, as stored right now. */
export function chapterState(livro: string, cap: number) {
  const { state } = getCadernoSnapshot();
  return { cor: state.cor, marks: chapterMarks(state, livro, cap) };
}

const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;

/**
 * Paints the chapter with what the notebook holds (data-grifo, data-nota and data-decorar on the verses; the text's
 * HTML is never changed) and lists the chapter's notes under the text.
 */
export function ChapterNotebook({
  scope,
  slug,
  bookName,
  chapter,
  onEdit,
}: {
  scope: RefObject<HTMLElement | null>;
  slug: string;
  bookName: string;
  chapter: number;
  onEdit: (nota: Nota) => void;
}) {
  const { state, status, message } = useCaderno();
  const book = useMemo(() => chapterNotebook(state, slug, chapter), [state, slug, chapter]);
  const title = useId();

  // A passive effect on purpose. When the router shows again a page it kept hidden, React runs a child's layout
  // effects before it gives the parent's element back to its ref: a layout effect here would find `scope` empty and
  // leave the chapter unpainted (seen in the browser, 10/11). Passive effects run after every ref is back.
  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    const touched: HTMLElement[] = [];
    for (const li of root.querySelectorAll<HTMLElement>("li[data-verse]")) {
      const n = Number(li.dataset.verse);
      const cor = book.marks.get(n);
      const noted = book.notas.some((x) => x.de <= n && n <= x.ate);
      const learning = book.memos.some((x) => x.de <= n && n <= x.ate);
      if (!cor && !noted && !learning) continue;
      if (cor) li.dataset.grifo = cor;
      if (noted) li.dataset.nota = "";
      if (learning) li.dataset.decorar = "";
      touched.push(li);
    }
    return () => {
      for (const li of touched) {
        delete li.dataset.grifo;
        delete li.dataset.nota;
        delete li.dataset.decorar;
      }
    };
  }, [scope, book]);

  if (status === "corrupt" || status === "unavailable") {
    return (
      <p className={styles.problem} role="status">
        {message} <Link href="/caderno">Abrir o caderno</Link>
      </p>
    );
  }
  const counts = [
    book.marks.size > 0 && plural(book.marks.size, "versículo grifado", "versículos grifados"),
    book.notas.length > 0 && plural(book.notas.length, "anotação", "anotações"),
    book.memos.length > 0 && plural(book.memos.length, "passagem para decorar", "passagens para decorar"),
  ].filter(Boolean);
  if (counts.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby={title} data-caderno-chapter="">
      <h2 id={title} className="bc-section-title">
        Seu caderno neste capítulo
        <small>só neste aparelho</small>
      </h2>
      {book.notas.length > 0 && (
        <ol className={styles.notes}>
          {book.notas.map((n) => (
            <li key={n.id} className={styles.noteItem}>
              <a className={styles.noteRef} href={`#v${n.de}`}>
                {passageRef(bookName, chapter, n.de, n.ate)}
              </a>
              <p className={styles.noteText}>{n.nota}</p>
              <button type="button" className={`bc-button bc-button--ghost ${styles.edit}`} onClick={() => onEdit(n)} aria-label={`Editar a anotação de ${passageRef(bookName, chapter, n.de, n.ate)}`}>
                Editar
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.summary}>
        {counts.join(" · ")}.{" "}
        <Link href="/caderno" prefetch={false}>
          Abrir o caderno
        </Link>
      </p>
    </section>
  );
}

/** Opens a native modal dialog and keeps the reading where it was behind it (Safari moves it otherwise). */
function useModal(dialog: RefObject<HTMLDialogElement | null>, focus: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const box = dialog.current;
    if (!box) return;
    const body = document.body;
    const root = document.documentElement;
    const href = window.location.href;
    const [x, y] = [window.scrollX, window.scrollY];
    const keys = ["position", "top", "left", "width"] as const;
    const before = keys.map((key) => body.style[key]);
    const overflow = root.style.overflow;
    Object.assign(body.style, { position: "fixed", top: `${-y}px`, left: `${-x}px`, width: `${root.clientWidth}px` });
    root.style.overflow = "hidden";
    box.showModal();
    focus.current?.focus();
    return () => {
      if (box.open) box.close();
      keys.forEach((key, index) => {
        body.style[key] = before[index];
      });
      root.style.overflow = overflow;
      if (window.location.href === href) window.scrollTo({ left: x, top: y, behavior: "instant" });
    };
  }, [dialog, focus]);
}

/**
 * Writing a note on a passage: the verses, the text field and what happens to it. One note per passage, so a passage
 * that has a note opens with it. Leaving with unsaved words asks first.
 */
export function NoteDialog({ passage, label, trecho, onClose }: { passage: Passage; label: string; trecho: string; onClose: (message?: string) => void }) {
  const { state } = useCaderno();
  const existing = findNota(state, passage);
  const [text, setText] = useState(existing?.nota ?? "");
  const [ask, setAsk] = useState<"erase" | "discard" | null>(null);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const title = useId();
  const hint = useId();
  useModal(dialog, field);

  const dirty = text.trim() !== (existing?.nota ?? "");
  const leave = () => {
    if (dirty && text.trim()) setAsk("discard");
    else onClose();
  };
  const save = () => {
    const result = writeNota(passage, trecho, text);
    if (result.ok) onClose(result.message);
    else setError(result.message);
  };
  const erase = () => {
    if (!existing) return;
    const result = eraseNota(existing.id);
    if (result.ok) onClose(result.message);
    else {
      setAsk(null);
      setError(result.message);
    }
  };

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={title}
      data-caderno-note=""
      onCancel={(event) => {
        event.preventDefault();
        leave();
      }}
    >
      <header className={styles.head}>
        <h2 id={title} className={styles.title}>
          <span className={styles.kind}>{existing ? "Sua anotação em" : "Anotar em"}</span> {label}
        </h2>
        <button type="button" className="bc-icon-button" aria-label="Fechar sem guardar" onClick={leave}>
          <svg className="bc-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <blockquote className={styles.excerpt}>{trecho}</blockquote>
      <label className={styles.label} htmlFor={`${title}-f`}>
        Sua anotação
      </label>
      <textarea
        ref={field}
        id={`${title}-f`}
        className={styles.field}
        value={text}
        maxLength={MAX_NOTE_CHARS}
        rows={5}
        aria-describedby={hint}
        onChange={(event) => {
          setText(event.target.value);
          setError("");
        }}
      />
      <p id={hint} className={styles.hint}>
        Fica só neste aparelho, guardada pelo navegador. {formatInt(text.length)} de {formatInt(MAX_NOTE_CHARS)} caracteres.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {ask ? (
        <div className={styles.buttons} role="group" aria-label="Confirmar">
          <p className={styles.question}>{ask === "erase" ? "Apagar esta anotação deste aparelho?" : "Sair sem guardar o que você escreveu?"}</p>
          <button type="button" className={`bc-button bc-button--secondary ${styles.danger}`} onClick={ask === "erase" ? erase : () => onClose()}>
            {ask === "erase" ? "Apagar" : "Sair sem guardar"}
          </button>
          <button type="button" className="bc-button bc-button--secondary" autoFocus onClick={() => setAsk(null)}>
            {ask === "erase" ? "Manter" : "Continuar escrevendo"}
          </button>
        </div>
      ) : (
        <div className={styles.buttons}>
          <button type="button" className="bc-button bc-button--primary" onClick={save}>
            Guardar anotação
          </button>
          <button type="button" className="bc-button bc-button--secondary" onClick={leave}>
            Cancelar
          </button>
          {existing && (
            <button type="button" className={`bc-button bc-button--ghost ${styles.eraseButton}`} onClick={() => setAsk("erase")}>
              Apagar
            </button>
          )}
        </div>
      )}
    </dialog>
  );
}
