"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import booksJson from "@/data/generated/books.json";
import themesJson from "@/data/generated/busca-temas.json";
import { Icon, type IconName } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import type { Book } from "@/lib/canon/types";
import { createSearch, describe, emptyText, linksLabel, quoted, type Hit, type Scope, type SearchTheme } from "./core";
import { usePageSearch } from "./page-search";
import { textIndex, useTextSearch, type TextItem } from "./useTextSearch";

// The box of the search (ds.css .bc-search): the field, the scopes, then the results grouped as you type: reference,
// books, the text (most linked verses first), themes. A combobox over a listbox: arrows choose, Enter opens, Esc closes
// the palette. The palette shows the top of each group; /buscar (page) shows every text result, 20 at a time.
const books = booksJson as Book[];
const search = createSearch(books, themesJson as SearchTheme[]);
const EXAMPLES = ["Jo 3:16", "Is 9:6", "luz", "“grande luz”", "Ezequiel", "misericórdia"];
const RECENT = "bc-recent-searches";
/** text results in the palette ("Tudo"), and in its "Texto" scope and per step of /buscar */
const TOP = 5;
const PAGE = 20;
/** words of a snippet in the palette (19 of 20 verses fit whole); /buscar shows the whole verse */
const SNIPPET_WORDS = 40;
/** the largest count the "Texto" chip can show: every verse */
const MOST = formatInt(books.reduce((n, b) => n + b.verses.reduce((a, v) => a + v, 0), 0));
const SCOPES: [Scope, string][] = [
  ["tudo", "Tudo"],
  ["texto", "Texto"],
  ["livros", "Livros"],
  ["temas", "Temas"],
];

type Item =
  | { kind: "hit"; key: string; hit: Hit }
  | { kind: "text"; key: string; item: TextItem }
  | { kind: "retry"; key: string }
  | { kind: "all"; key: string; href: string; title: string; icon: IconName };
/** `inert`: an earlier query's rows, kept on screen while this one loads (nothing moves), but not offered */
type Section = { id: string; label: string; items: Item[]; inert?: boolean };

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
const versos = (n: number) => `${formatInt(n)} ${n === 1 ? "versículo" : "versículos"}`;

type Props = {
  initial?: string;
  /** the palette's close; absent on /buscar */
  onClose?: () => void;
  /** /buscar: every text result, 20 at a time, the query kept in the address */
  page?: boolean;
  /** /buscar: the ?q= of the address, followed when it changes from outside (back, a link) */
  urlQuery?: string;
  /** /buscar before the browser takes over: the field only, and a note for a browser without JavaScript */
  shell?: boolean;
};

export function SearchPanel({ initial = "", onClose, page = false, urlQuery, shell = false }: Props) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // /buscar: the top bar's search entry steps aside while this field is on screen
  const field = useRef<HTMLDivElement>(null);
  usePageSearch(field, page);
  const [query, setQuery] = useState(initial);
  const [scope, setScope] = useState<Scope>("tudo");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [more, setMore] = useState({ key: "", n: PAGE });
  // /buscar: the last ?q= this panel wrote, and the last one it saw
  const [written, setWritten] = useState(initial.trim());
  const [seen, setSeen] = useState(urlQuery);
  if (urlQuery !== undefined && urlQuery !== seen) {
    setSeen(urlQuery);
    if (urlQuery.trim() !== written) {
      setQuery(urlQuery);
      setWritten(urlQuery.trim());
      setActiveKey(null);
    }
  }

  const q = query.trim();
  const sync = useMemo(() => search.results(query, scope), [query, scope]);
  // the text query depends on the words only, so changing the scope does not ask again
  const textQuery = useMemo(() => search.results(query).text, [query]);
  const textKey = textQuery?.key ?? "";
  const want = page ? (more.key === textKey ? more.n : PAGE) : scope === "texto" ? PAGE : TOP;
  const text = useTextSearch(textQuery, want, page ? Infinity : SNIPPET_WORDS);
  const settled = text.settled;
  const done = settled?.status === "done" ? settled : null;
  /** the answer to this very query (not the last one, still on screen while this one loads) */
  const fresh = text.pending ? null : done;

  const recentRaw = useSyncExternalStore(subscribeRecent, readRecent, () => "[]");
  const recent = useMemo<string[]>(() => {
    try {
      const list: unknown = JSON.parse(recentRaw);
      return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, 5) : [];
    } catch {
      return [];
    }
  }, [recentRaw]);

  // the palette asks for the index while the person types, so the first word does not wait for it
  useEffect(() => {
    if (!shell) void textIndex.meta().catch(() => {});
  }, [shell]);

  // /buscar keeps the query in the address (?q=), without a history entry per letter
  useEffect(() => {
    if (!page || shell) return;
    const timer = setTimeout(() => {
      const next = q ? `/buscar?${new URLSearchParams({ q })}` : "/buscar";
      if (`${location.pathname}${location.search}` !== next) window.history.replaceState(null, "", next);
      setWritten(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, shell, q]);

  // ---- sections, in the order of design §6; on /buscar the long text list comes last
  const sections: Section[] = [];
  const hits = (g: { id: string; label: string; hits: Hit[] }): Section => ({
    id: g.id,
    label: g.label,
    items: g.hits.map((hit) => ({ kind: "hit", key: hit.href, hit })),
  });
  const ref = sync.groups.find((g) => g.id === "ref");
  const bookGroup = sync.groups.find((g) => g.id === "books");
  const themeGroup = sync.groups.find((g) => g.id === "themes");
  if (ref) sections.push(hits(ref));
  if (bookGroup) sections.push(hits(bookGroup));
  if (page && themeGroup) sections.push(hits(themeGroup));

  const showsText = !!textQuery && (scope === "tudo" || scope === "texto");
  // while the first answer is on its way nothing is drawn below the text, so nothing moves when it arrives
  const holding = showsText && !settled;
  // the rows on screen answer the words typed before: they stay, but Enter and a click cannot open them
  const stale = showsText && text.pending && !!done;
  if (showsText && settled?.status === "error") {
    sections.push({ id: "text", label: "No texto · não deu para buscar agora", items: [{ kind: "retry", key: "retry" }] });
  } else if (showsText && done && done.total > 0) {
    const label = stale
      ? page
        ? `Procurando ${describe(query)} no texto da Bíblia Livre…`
        : "No texto · procurando…"
      : page
        ? `${versos(done.total)} com ${describe(query)} no texto da Bíblia Livre${done.total > 1 ? ", os mais ligados primeiro" : ""}.`
        : `No texto · ${versos(done.total)}${done.total > 1 ? ", os mais ligados primeiro" : ""}`;
    const items: Item[] = done.items.map((item) => ({ kind: "text", key: item.href, item }));
    if (!stale && !page && scope === "texto" && done.total > done.items.length) items.push(seeAll(q, done.total));
    sections.push({ id: "text", label, items, inert: stale });
  }
  if (!page && !holding && themeGroup) sections.push(hits(themeGroup));
  if (!page && !holding && !stale && scope === "tudo" && done && done.total > done.items.length) {
    sections.push({ id: "all", label: "", items: [seeAll(q, done.total)] });
  }
  if (q && scope === "livros") {
    sections.push({ id: "all", label: "", items: [{ kind: "all", key: "/ler", href: "/ler", title: `Ver os ${formatInt(books.length)} livros`, icon: "book" }] });
  }
  if (q && scope === "temas") {
    const n = search.themes.length;
    sections.push({ id: "all", label: "", items: [{ kind: "all", key: "/tema", href: "/tema", title: `Ver os ${formatInt(n)} temas`, icon: "explore" }] });
  }
  const options = sections.flatMap((s) => (s.inert ? [] : s.items));
  const found = options.findIndex((o) => o.key === activeKey);
  // the palette always has a choice for Enter; the page lights a row only once the arrows are used
  const active = found >= 0 ? found : page ? -1 : 0;

  // ---- what to say when nothing was found (design §6: what was searched, and the next step)
  let message = sync.message;
  const textEmpty = !textQuery || fresh?.total === 0;
  if (!message && q && !text.pending) {
    if ((scope === "tudo" && !sync.groups.length && textEmpty) || (scope === "texto" && !ref && textEmpty)) message = emptyText(q);
    else if (scope === "livros" && !sync.groups.length) message = `Nenhum livro com o nome ${quoted(q)}.`;
    else if (scope === "temas" && !sync.groups.length) message = `Nenhum dos ${formatInt(search.themes.length)} temas tem ${quoted(q)} no nome.`;
  }
  const announce =
    message ??
    (showsText && fresh
      ? `${versos(fresh.total)} no texto.${page && fresh.total > 0 ? ` Mostrando ${formatInt(fresh.items.length)}.` : ""}`
      : showsText && settled?.status === "error" && !text.pending
        ? "Não deu para buscar no texto."
        : "");

  const remember = () => {
    if (!q) return;
    try {
      localStorage.setItem(RECENT, JSON.stringify([q, ...recent.filter((r) => r !== q)].slice(0, 5)));
    } catch {}
  };
  const pick = (o: Item) => {
    if (o.kind === "retry") return text.retry();
    remember();
    onClose?.();
    router.push(o.kind === "text" ? o.item.href : o.kind === "hit" ? o.hit.href : o.href);
  };
  const type = (value: string) => {
    setQuery(value);
    setActiveKey(null);
  };
  const choose = (s: Scope) => {
    setScope(s);
    setActiveKey(null);
  };
  const move = (step: number) => {
    if (!options.length) return;
    const next = Math.min(Math.max(active + step, 0), options.length - 1);
    setActiveKey(options[next].key);
    document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: "nearest" });
  };

  let n = 0;
  return (
    <div className={page ? "bc-search site-search__box site-search__box--page" : "bc-search site-search__box"}>
      <div ref={field} className="bc-search__field">
        <Icon name="search" />
        <input
          ref={input}
          className="bc-search__input"
          // text, not search: Esc in a search field only clears it, and here Esc closes the search
          type="text"
          inputMode="search"
          role="combobox"
          aria-label="Buscar versículo, palavra, livro ou tema"
          aria-expanded={options.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 && options.length > 0 ? `${id}-${active}` : undefined}
          aria-autocomplete="list"
          placeholder="Is 9:6, luz, “grande luz”, Ezequiel"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={!page}
          disabled={shell}
          value={query}
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              move(e.key === "ArrowDown" ? 1 : -1);
            } else if (e.key === "Enter" && options.length) {
              e.preventDefault();
              pick(options[Math.max(active, 0)]);
            } else if (e.key === "Escape" && onClose) {
              e.preventDefault();
              onClose();
            }
          }}
        />
        {text.pending && showsText && (
          <span className="site-search__busy" aria-hidden="true">
            Procurando…
          </span>
        )}
        {onClose && (
          <button className="bc-icon-button" type="button" aria-label="Fechar a busca" onClick={onClose}>
            <Icon name="close" />
          </button>
        )}
      </div>
      {q && (
        <div className="bc-search__scopes" role="group" aria-label="Onde buscar">
          {SCOPES.map(([s, label]) => (
            <button key={s} type="button" className="bc-chip" aria-pressed={scope === s} onClick={() => choose(s)}>
              {s === "texto" && textQuery ? (
                // while words are searched, the widest this label can be (every verse) holds the chip's width, hidden,
                // so a count that arrives or changes moves no chip; a reference has no count, so its chip fits its label
                <span className="site-search__scope">
                  <span>
                    {label}
                    {fresh && <span className="site-search__count">{formatInt(fresh.total)}</span>}
                  </span>
                  <span className="site-search__ghost" aria-hidden="true">
                    {label}
                    <span className="site-search__count">{MOST}</span>
                  </span>
                </span>
              ) : (
                label
              )}
            </button>
          ))}
        </div>
      )}
      {message && <p className="site-search__message">{message}</p>}
      <div className="bc-search__results" id={`${id}-list`} role="listbox" aria-label="Resultados" aria-busy={text.pending && showsText}>
        {sections.map((s) => (
          <div
            key={s.id}
            role="group"
            aria-labelledby={s.label ? `${id}-g-${s.id}` : undefined}
            aria-label={s.label ? undefined : "Ver tudo"}
            inert={s.inert || undefined}
          >
            {s.label && (
              <p className={s.id === "text" && page ? "bc-search__group site-search__count-line" : "bc-search__group"} id={`${id}-g-${s.id}`}>
                {s.label}
              </p>
            )}
            {s.items.map((o) => {
              // inert rows are not options: no number, never selected
              const i = s.inert ? -1 : n++;
              const common = {
                id: i >= 0 ? `${id}-${i}` : undefined,
                role: "option" as const,
                "aria-selected": i >= 0 && i === active,
                // the focus stays in the field (combobox): the arrows choose an option, not Tab
                tabIndex: -1,
                className: "bc-search__item",
                onMouseMove: i >= 0 ? () => setActiveKey(o.key) : undefined,
              };
              if (o.kind === "retry") {
                return (
                  <button key={o.key} type="button" {...common} onClick={() => text.retry()}>
                    <Icon name="search" />
                    <span className="bc-search__title">Tentar de novo</span>
                  </button>
                );
              }
              const href = o.kind === "text" ? o.item.href : o.kind === "hit" ? o.hit.href : o.href;
              return (
                <Link
                  key={o.key}
                  href={href}
                  {...common}
                  onClick={() => {
                    remember();
                    onClose?.();
                  }}
                >
                  {o.kind === "text" ? (
                    <>
                      <Icon name="text" />
                      <span className="bc-search__title">{o.item.ref}</span>
                      <span className="bc-search__hint">{linksLabel(o.item.links)}</span>
                      <span className="bc-search__snippet">
                        {o.item.segments.map((seg, k) => (
                          <Fragment key={k}>{seg.mark ? <mark>{seg.text}</mark> : seg.text}</Fragment>
                        ))}
                      </span>
                    </>
                  ) : o.kind === "hit" ? (
                    <>
                      <Icon name={o.hit.icon} />
                      <span className="bc-search__title">{o.hit.title}</span>
                      <span className="bc-search__hint">{o.hit.hint}</span>
                    </>
                  ) : (
                    <>
                      <Icon name={o.icon} />
                      <span className="bc-search__title">{o.title}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      {page && showsText && fresh && fresh.items.length < fresh.total && (
        <button
          type="button"
          className="site-search__more"
          aria-disabled={text.loadingMore || undefined}
          onClick={() => {
            if (!text.loadingMore) setMore({ key: textKey, n: want + PAGE });
          }}
        >
          <small>
            Mostrando {formatInt(fresh.items.length)} de {formatInt(fresh.total)}
          </small>
          <strong>{text.loadingMore ? "Carregando…" : "Mais resultados"}</strong>
        </button>
      )}
      {!q && !shell && (
        <div className="site-search__start">
          <p className="bc-search__group">Experimente</p>
          <div className="site-search__chips">
            {EXAMPLES.map((x) => (
              <button
                key={x}
                type="button"
                className="bc-chip"
                onClick={() => {
                  type(x);
                  input.current?.focus();
                }}
              >
                {x}
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <>
              <p className="bc-search__group">Buscas recentes neste aparelho</p>
              <div className="site-search__chips">
                {recent.map((x) => (
                  <button
                    key={x}
                    type="button"
                    className="bc-chip"
                    onClick={() => {
                      type(x);
                      input.current?.focus();
                    }}
                  >
                    <Icon name="clock" />
                    {x}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {shell && (
        <noscript>
          <p className="site-search__message">
            A busca precisa de JavaScript. Sem ele, abra um versículo pelo endereço, como /isaias/9/6, ou escolha o livro em <Link href="/ler">Ler</Link>.
          </p>
        </noscript>
      )}
      <p className="visually-hidden" role="status">
        {announce}
      </p>
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

function seeAll(q: string, total: number): Item {
  const href = `/buscar?${new URLSearchParams({ q })}`;
  return { kind: "all", key: href, href, title: `Ver os ${versos(total)}`, icon: "chev-r" };
}
