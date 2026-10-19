"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import booksJson from "@/data/generated/books.json";
import { createReferenceParser, formatRef, refPath } from "@/lib/canon/reference";
import type { Book } from "@/lib/canon/types";

const parse = createReferenceParser(booksJson as Book[]);

const ERRORS = {
  empty: "",
  format: "Escreva livro, capítulo e, se quiser, versículo: “Is 9:6”, “Mq 5,2”, “1 Co 13”.",
  book: "Não achei esse livro. Tente a abreviação: “Gn”, “Sl”, “Jo”.",
  chapter: "Esse capítulo não existe nesse livro.",
  verse: "Esse versículo não existe nesse capítulo.",
  ambiguous: "Mais de um livro serve. Escolha:",
} as const;

// Reference search (Phase 2). Free-text, places and people come with the ⌘K palette (Phase 3).
export function RefSearch() {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const result = useMemo(() => (value.trim() ? parse(value) : null), [value]);

  const hint = !result
    ? ""
    : result.ok
      ? `Abrir ${formatRef(result.ref)}`
      : submitted || result.error === "ambiguous"
        ? ERRORS[result.error]
        : "";

  return (
    <form
      role="search"
      className="ref-search"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (result?.ok) {
          router.push(refPath(result.ref));
          setValue("");
          setSubmitted(false);
        }
      }}
    >
      <label htmlFor={id} className="visually-hidden">
        Buscar referência
      </label>
      <svg className="ref-search__icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        placeholder="Is 9:6, Mq 5,2, 1 Co 13"
        value={value}
        aria-describedby={`${id}-hint`}
        onChange={(e) => {
          setValue(e.target.value);
          setSubmitted(false);
        }}
      />
      <p
        id={`${id}-hint`}
        className={hint ? "ref-search__hint is-visible" : "ref-search__hint"}
        aria-live="polite"
      >
        {hint}
        {result && !result.ok && result.error === "ambiguous" && result.candidates
          ? result.candidates.map((b) => {
              const alt = parse(`${b.name} ${value.replace(/^\D+/, "")}`);
              return alt.ok ? (
                <button key={b.osis} type="button" className="ref-search__pick" onClick={() => router.push(refPath(alt.ref))}>
                  {formatRef(alt.ref)}
                </button>
              ) : null;
            })
          : null}
      </p>
    </form>
  );
}
