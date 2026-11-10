"use client";

// The notebook on the reading pages. SelectionBar.tsx loads this module the first time the reader uses "Grifar",
// "Anotar" or "Decorar", or when this browser already has a notebook; no other page carries it.
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { formatInt } from "@/lib/canon/text";
import { noteDrafts } from "@/lib/caderno/drafts";
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

/**
 * Opens a native modal dialog and keeps the reading where it was behind it (Safari moves it otherwise). `ours` is set
 * when the effect's own cleanup closes the dialog: the "close" event of that call arrives later, and whoever listens
 * must not take it for the reader leaving (React runs effects twice in development, and again when the router shows
 * a hidden page).
 */
function useModal(dialog: RefObject<HTMLDialogElement | null>, focus: RefObject<HTMLElement | null>, ours: RefObject<boolean>) {
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
    const first = focus.current;
    first?.focus();
    // a note opened for editing continues where its text ends
    if (first instanceof HTMLTextAreaElement) first.setSelectionRange(first.value.length, first.value.length);
    return () => {
      if (box.open) {
        ours.current = true;
        box.close();
      }
      keys.forEach((key, index) => {
        body.style[key] = before[index];
      });
      root.style.overflow = overflow;
      if (window.location.href === href) window.scrollTo({ left: x, top: y, behavior: "instant" });
    };
  }, [dialog, focus, ours]);
}

/**
 * Writing a note on a passage: the verses, the text field and what happens to it. One note per passage, so a passage
 * that has a note opens with it.
 *
 * Nothing written is lost by leaving. The dialog never refuses to close: a browser closes a modal dialog on a second
 * Escape (or back gesture) whatever the page answers to the first, and a dialog closed behind the page's back left
 * the reading frozen under the scroll lock (found by review, 10/11). So every way out that is not "Guardar" or
 * "Apagar" keeps the unsaved words as this passage's draft for the tab (lib/caderno/drafts.ts), and opening the
 * note again brings them back.
 */
export function NoteDialog({
  passage,
  label,
  trecho,
  onClose,
}: {
  passage: Passage;
  label: string;
  trecho: string;
  /** `message`: what was saved or erased; `draft`: unsaved words were kept as a draft */
  onClose: (message?: string, draft?: boolean) => void;
}) {
  const { state } = useCaderno();
  const existing = findNota(state, passage);
  const saved = existing?.nota ?? "";
  const [found] = useState(() => noteDrafts.get(passage));
  const [text, setText] = useState(found ?? saved);
  const [recovered, setRecovered] = useState(found !== null && found.trim() !== saved);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  const ours = useRef(false);
  const latest = useRef({ text, saved });
  const title = useId();
  const hint = useId();
  useModal(dialog, field, ours);
  useLayoutEffect(() => {
    latest.current = { text, saved };
  });
  // unmounted without an answer (the router hid the page under the dialog): the words still become the draft
  useEffect(
    () => () => {
      const { text: words, saved: kept } = latest.current;
      if (!done.current && words.trim() && words.trim() !== kept) noteDrafts.set(passage, words);
    },
    [passage],
  );

  const finish = (message?: string, draft = false) => {
    if (done.current) return;
    done.current = true;
    onClose(message, draft);
  };
  // Cancelar, the X, Escape, the back gesture and the browser's own close all end here
  const leave = () => {
    const words = text.trim();
    if (words && words !== saved) {
      noteDrafts.set(passage, text);
      finish(undefined, true);
    } else {
      noteDrafts.clear(passage);
      finish();
    }
  };
  const save = () => {
    const result = writeNota(passage, trecho, text);
    if (!result.ok) return setError(result.message);
    noteDrafts.clear(passage);
    finish(result.message);
  };
  const erase = () => {
    if (!existing) return;
    const result = eraseNota(existing.id);
    setAsking(false);
    if (!result.ok) return setError(result.message);
    noteDrafts.clear(passage);
    finish(result.message);
  };
  const discard = () => {
    noteDrafts.clear(passage);
    setText(saved);
    setRecovered(false);
    field.current?.focus();
  };

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={title}
      data-caderno-note=""
      onClose={() => {
        // the browser closed it (Escape, the back gesture): the reader is leaving. A close of our own cleanup is not.
        if (ours.current) ours.current = false;
        else leave();
      }}
    >
      <header className={styles.head}>
        <h2 id={title} className={styles.title}>
          <span className={styles.kind}>{existing ? "Sua anotação em" : "Anotar em"}</span> {label}
        </h2>
        <button type="button" className="bc-icon-button" aria-label="Fechar a anotação" onClick={leave}>
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
      {recovered && (
        <p className={styles.draft} data-caderno-draft="">
          Rascunho recuperado: você tinha saído sem guardar.
          <button type="button" className={`bc-button bc-button--ghost ${styles.draftButton}`} onClick={discard}>
            Descartar rascunho
          </button>
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {asking ? (
        <div className={styles.buttons} role="group" aria-label="Confirmar">
          <p className={styles.question}>Apagar esta anotação deste aparelho?</p>
          <button type="button" className={`bc-button bc-button--secondary ${styles.danger}`} onClick={erase}>
            Apagar
          </button>
          <button type="button" className="bc-button bc-button--secondary" autoFocus onClick={() => setAsking(false)}>
            Manter
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
            <button type="button" className={`bc-button bc-button--ghost ${styles.eraseButton}`} onClick={() => setAsking(true)}>
              Apagar
            </button>
          )}
        </div>
      )}
    </dialog>
  );
}
