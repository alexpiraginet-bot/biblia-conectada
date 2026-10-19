"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import booksJson from "@/data/generated/books.json";
import { Icon } from "@/components/icons";
import type { Book } from "@/lib/canon/types";
import { createSearch, type Hit } from "./core";

// The box of the search (ds.css .bc-search): the field, then the results grouped as you type. A combobox over a
// listbox: arrows choose, Enter opens, Esc closes the dialog. Used by the palette and by the /buscar page.
const search = createSearch(booksJson as Book[]);
const EXAMPLES = ["Is 9:6", "Sl 23", "Jo 3:16", "Mq 5,2", "Ezequiel"];
const RECENT = "bc-recent-searches";

function subscribeRecent(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function readRecent(): string {
  try {
    return localStorage.getItem(RECENT) ?? "[]";
  } catch {
    return "[]";
  }
}

export function SearchPanel({ initial = "", onClose, page = false }: { initial?: string; onClose?: () => void; page?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState(initial);
  const [active, setActive] = useState(0);
  const { groups, message } = useMemo(() => search.results(query), [query]);
  const hits = groups.flatMap((g) => g.hits);
  const recentRaw = useSyncExternalStore(subscribeRecent, readRecent, () => "[]");
  const recent = useMemo<string[]>(() => {
    try {
      const list: unknown = JSON.parse(recentRaw);
      return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
    } catch {
      return [];
    }
  }, [recentRaw]);

  useEffect(() => {
    document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [id, active]);

  const remember = () => {
    const q = query.trim();
    if (!q) return;
    try {
      localStorage.setItem(RECENT, JSON.stringify([q, ...recent.filter((r) => r !== q)].slice(0, 5)));
    } catch {}
  };
  const open = (hit: Hit) => {
    remember();
    onClose?.();
    router.push(hit.href);
  };
  const type = (q: string) => {
    setQuery(q);
    setActive(0);
  };

  let n = 0;
  return (
    <div className={page ? "bc-search site-search__box site-search__box--page" : "bc-search site-search__box"}>
      <div className="bc-search__field">
        <Icon name="search" />
        <input
          className="bc-search__input"
          // text, not search: Esc in a search field only clears it, and here Esc closes the search
          type="text"
          inputMode="search"
          role="combobox"
          aria-label="Buscar versículo, palavra ou livro"
          aria-expanded={hits.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={hits.length > 0 ? `${id}-${active}` : undefined}
          aria-autocomplete="list"
          placeholder="Is 9:6, luz, Ezequiel"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={!page}
          value={query}
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActive((a) => Math.min(Math.max(a + step, 0), Math.max(hits.length - 1, 0)));
            } else if (e.key === "Enter" && hits[active]) {
              e.preventDefault();
              open(hits[active]);
            } else if (e.key === "Escape" && onClose) {
              e.preventDefault();
              onClose();
            }
          }}
        />
        {onClose && (
          <button className="bc-icon-button" type="button" aria-label="Fechar a busca" onClick={onClose}>
            <Icon name="close" />
          </button>
        )}
      </div>
      {message && (
        <p className="site-search__message" role="status">
          {message}
        </p>
      )}
      <div className="bc-search__results" id={`${id}-list`} role="listbox" aria-label="Resultados">
        {groups.map((g) => (
          <div key={g.id} role="group" aria-labelledby={`${id}-g-${g.id}`}>
            <p className="bc-search__group" id={`${id}-g-${g.id}`}>
              {g.label}
            </p>
            {g.hits.map((hit) => {
              const i = n++;
              return (
                <Link
                  key={hit.href}
                  id={`${id}-${i}`}
                  href={hit.href}
                  role="option"
                  aria-selected={i === active}
                  className="bc-search__item"
                  onMouseMove={() => setActive(i)}
                  onClick={() => {
                    remember();
                    onClose?.();
                  }}
                >
                  <Icon name={hit.icon} />
                  <span className="bc-search__title">{hit.title}</span>
                  <span className="bc-search__hint">{hit.hint}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      {!query.trim() && (
        <div className="site-search__start">
          <p className="bc-search__group">Experimente</p>
          <div className="site-search__chips">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className="bc-chip" onClick={() => type(x)}>
                {x}
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <>
              <p className="bc-search__group">Buscas recentes neste aparelho</p>
              <div className="site-search__chips">
                {recent.map((x) => (
                  <button key={x} type="button" className="bc-chip" onClick={() => type(x)}>
                    <Icon name="clock" />
                    {x}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {!page && (
        <div className="bc-search__foot" aria-hidden="true">
          <span>
            <kbd className="bc-kbd">↑</kbd>
            <kbd className="bc-kbd">↓</kbd> escolher
          </span>
          <span>
            <kbd className="bc-kbd">Enter</kbd> abrir
          </span>
          <span>
            <kbd className="bc-kbd">Esc</kbd> fechar
          </span>
        </div>
      )}
    </div>
  );
}
