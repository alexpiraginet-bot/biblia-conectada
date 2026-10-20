"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { arcStrength, arcTone } from "@/lib/arc-style";
import { createReferenceParser } from "@/lib/canon/reference";
import { formatInt } from "@/lib/canon/text";
import { BASE, BOOKS } from "@/lib/community/books-client";
import { loadChapterText, loadVerseLinks } from "@/lib/community/fetchers";
import { ARC_BASE, ARC_W, arcPath, baselineTicks, longRef, shortRef, versePath } from "@/lib/community/geometry";
import { mesaLinks, type MesaLink } from "@/lib/community/mesa";
import { KEYS, readJSON, readRaw, subscribeStore, writeJSON } from "@/lib/community/store";
import { conexaoPath, parseSide, sideSegment } from "@/lib/conexao";
import { VersePair } from "./Pair";
import styles from "./community.module.css";
import mesa from "./mesa.module.css";

const parse = createReferenceParser(BOOKS);
const TICKS = baselineTicks(BASE);
const PER_TURN = 3;
const PAGE = 30;
/** passages to tap before anything was opened on this device (the field's examples) */
const EXAMPLES = ["isaias-9", "joao-1", "salmos-23"];

/** what this device keeps per passage: the links brought (key -> how many people brought it) and this turn's */
type Table = { brought: Record<string, number>; turn: string[] };
type MesaStore = { tables: Record<string, Table>; recent: string[] };
const EMPTY: MesaStore = { tables: {}, recent: [] };

function readStore(raw: string | null): MesaStore {
  try {
    const s = raw ? (JSON.parse(raw) as MesaStore) : null;
    return s?.tables ? { tables: s.tables, recent: Array.isArray(s.recent) ? s.recent : [] } : EMPTY;
  } catch {
    return EMPTY;
  }
}
function update(fn: (s: MesaStore) => void) {
  const s = readJSON<MesaStore>(KEYS.mesa, EMPTY);
  const next: MesaStore = { tables: { ...(s.tables ?? {}) }, recent: [...(s.recent ?? [])] };
  fn(next);
  writeJSON(KEYS.mesa, next);
}
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function sideOf(gv: number) {
  const { book, chapter, verse } = BASE.locate(gv);
  return { book: book.index, slug: book.slug, chapter, verse };
}

type Passage = { slug: string; chapter: number; book: (typeof BOOKS)[number]; key: string; label: string };
function passageOf(segment: string): Passage | null {
  const side = parseSide(segment);
  const book = side && BOOKS.find((b) => b.slug === side.slug);
  if (!side || !book || side.verse || side.chapter > book.verses.length) return null;
  return { slug: book.slug, chapter: side.chapter, book, key: segment, label: `${book.name} ${side.chapter}` };
}

/**
 * Mesa da semana on one device: the group picks the passage; its links are drawn as arcs, most votes first; each
 * person brings up to three to the table, then passes the device. Nobody types anything but the passage.
 */
export function Mesa() {
  const id = useId();
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const raw = useSyncExternalStore(subscribeStore, () => readRaw(KEYS.mesa), () => null);
  const store = readStore(raw);
  const passage = passageOf(hash);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function open(e: React.FormEvent) {
    e.preventDefault();
    const r = value.trim() ? parse(value) : null;
    if (!r || !r.ok) {
      setError(
        !r
          ? "Escreva um capítulo: “Is 9”, “Jo 1”, “Sl 23”."
          : r.error === "book" || r.error === "ambiguous"
            ? "Não achei esse livro. Tente a abreviação: “Gn”, “Sl”, “Jo”."
            : r.error === "chapter"
              ? "Esse capítulo não existe nesse livro."
              : "Escreva livro e capítulo: “Is 9”.",
      );
      return;
    }
    setError("");
    setValue("");
    window.location.hash = sideSegment({ slug: r.ref.book.slug, chapter: r.ref.chapter });
  }

  // every passage opened here (typed, an example or a link to /mesa#isaias-9) joins this device's list
  const key = passage?.key;
  useEffect(() => {
    if (!key) return;
    update((s) => {
      if (s.recent[0] !== key) s.recent = [key, ...s.recent.filter((k) => k !== key)].slice(0, 6);
    });
  }, [key]);

  const recent = store.recent.map(passageOf).filter((p): p is Passage => !!p);
  const chips = recent.length ? recent : EXAMPLES.map(passageOf).filter((p): p is Passage => !!p);
  return (
    <>
      <form className={mesa.form} onSubmit={open} role="search" aria-label="Escolher o trecho da reunião">
        <label htmlFor={`${id}-ref`} className={mesa.label}>
          Trecho da reunião
        </label>
        <div className={mesa.formRow}>
          <input
            id={`${id}-ref`}
            className={mesa.input}
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="Is 9, Jo 1, Sl 23"
            value={value}
            aria-describedby={`${id}-erro`}
            aria-invalid={error ? true : undefined}
            onChange={(e) => setValue(e.target.value)}
          />
          <button type="submit" className="bc-button bc-button--primary">
            Abrir
          </button>
        </div>
        <p id={`${id}-erro`} className={`${styles.status} ${mesa.error}`} aria-live="polite">
          {error}
        </p>
      </form>
      <nav aria-label={recent.length ? "Mesas neste aparelho" : "Exemplos de trechos"} className={mesa.recent}>
        <span className={styles.meta}>{recent.length ? "Neste aparelho:" : "Por exemplo:"}</span>
        {chips.map((p) => (
          <a key={p.key} href={`#${p.key}`} className="bc-chip" aria-current={passage?.key === p.key ? "true" : undefined}>
            {p.label}
          </a>
        ))}
      </nav>
      {passage ? <MesaTable key={passage.key} passage={passage} table={store.tables[passage.key] ?? { brought: {}, turn: [] }} /> : null}
    </>
  );
}

function MesaTable({ passage, table }: { passage: Passage; table: Table }) {
  const [data, setData] = useState<{ links: MesaLink[]; texts: string[] } | "error" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [far, setFar] = useState<Record<string, string>>({});
  const detail = useRef<HTMLDivElement>(null);
  // a link chosen further down the list: bring its two texts into view and move the focus there
  useEffect(() => {
    if (!selected || !detail.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    detail.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    detail.current.focus({ preventScroll: true });
  }, [selected]);

  useEffect(() => {
    let live = true;
    Promise.all([loadVerseLinks(passage.slug, passage.chapter), loadChapterText(passage.slug, passage.chapter)])
      .then(([perVerse, texts]) => {
        if (!live) return;
        let gv0 = passage.book.firstVerse;
        for (let c = 0; c < passage.chapter - 1; c++) gv0 += passage.book.verses[c];
        setData({ links: mesaLinks(perVerse, gv0), texts });
      })
      .catch(() => live && setData("error"));
    return () => {
      live = false;
    };
  }, [passage]);

  const byKey = useMemo(() => (data && data !== "error" ? new Map(data.links.map((l) => [l.key, l])) : new Map<string, MesaLink>()), [data]);
  const sel = selected ? byKey.get(selected) : undefined;
  useEffect(() => {
    if (!sel) return;
    const { book, chapter, verse } = BASE.locate(sel.there);
    let live = true;
    loadChapterText(book.slug, chapter)
      .then((t) => live && setFar((m) => ({ ...m, [sel.key]: t[verse - 1] })))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [sel]);

  if (data === null) return <p className={`${styles.meta} ${styles.section}`}>Carregando as ligações de {passage.label}…</p>;
  if (data === "error") return <p className={`${styles.meta} ${styles.section}`}>Não deu para carregar as ligações. Tente de novo.</p>;

  const brought = Object.keys(table.brought).filter((k) => byKey.has(k));
  const turnLeft = PER_TURN - table.turn.length;
  const visible = data.links.slice(0, shown);
  // the arcs drawn: the visible list, plus what is on the table or selected further down the list
  const drawn = [...visible, ...data.links.slice(shown).filter((l) => l.key in table.brought || l.key === selected)];
  const bring = (key: string) =>
    update((s) => {
      const t = s.tables[passage.key] ?? { brought: {}, turn: [] };
      if (t.turn.includes(key) || t.turn.length >= PER_TURN) return;
      s.tables[passage.key] = { brought: { ...t.brought, [key]: (t.brought[key] ?? 0) + 1 }, turn: [...t.turn, key] };
    });
  const remove = (key: string) =>
    update((s) => {
      const t = s.tables[passage.key];
      if (!t) return;
      const rest = { ...t.brought };
      delete rest[key];
      s.tables[passage.key] = { brought: rest, turn: t.turn.filter((k) => k !== key) };
    });
  const nextPerson = () =>
    update((s) => {
      const t = s.tables[passage.key];
      if (t) s.tables[passage.key] = { ...t, turn: [] };
    });
  const clear = () =>
    update((s) => {
      delete s.tables[passage.key];
    });

  const chapterX = BASE.chapterX(passage.book.firstChapter + passage.chapter - 1);
  const arcFor = (l: MesaLink) => arcPath(BASE.verseX(l.here), BASE.verseX(l.there));
  const isBrought = (k: string) => k in table.brought;
  const pairLabel = (l: MesaLink) => `${shortRef(BASE, l.here)} e ${shortRef(BASE, l.there)}`;
  const people = (n: number) => (n === 1 ? "" : ` · trazida ${formatInt(n)} vezes`);
  const nt = Math.round(BASE.ntStart * 1000) / 10;

  return (
    <section className={styles.section} aria-labelledby="titulo-mesa">
      <div className={styles.sectionHead}>
        <h2 id="titulo-mesa" className="bc-title">
          {passage.label}
        </h2>
        <p className={styles.meta}>
          {formatInt(data.links.length)} {data.links.length === 1 ? "ligação" : "ligações"} com outros capítulos, das mais
          votadas para as menos votadas (votos: soma das duas direções, de leitores da OpenBible.info).{" "}
          <Link href={`/${passage.slug}/${passage.chapter}`}>Ler {passage.label}</Link>
        </p>
      </div>

      <figure className={styles.sky}>
        <div className={`bc-window ${styles.skyWindow}`}>
          <svg viewBox={`0 0 ${ARC_W} ${ARC_BASE + 26}`} className={`${styles.skySvg} ${mesa.svg}`} aria-hidden="true">
            <g fill="none" strokeLinecap="round">
              {[...drawn].reverse().map((l) => {
                const lit = isBrought(l.key) || l.key === selected;
                const span = Math.abs(BASE.verseX(l.there) - BASE.verseX(l.here));
                const s = arcStrength(l.votes);
                return (
                  <g key={l.key} className={mesa.arc} onClick={() => setSelected(l.key)}>
                    <path d={arcFor(l)} className={mesa.hit} vectorEffect="non-scaling-stroke" />
                    <path
                      d={arcFor(l)}
                      // lit arcs in the sky's gold; the others in video 1's stained glass, by span
                      stroke={lit ? "var(--sky-gold)" : arcTone(span)}
                      strokeWidth={l.key === selected ? 3.2 : lit ? 2.4 : Math.round((0.9 + 1.2 * s) * 10) / 10}
                      strokeOpacity={lit ? 1 : Math.round((0.35 + 0.55 * s) * 100) / 100}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </g>
            <g className={styles.skyTicks}>
              <path d={`M0 ${ARC_BASE}H${ARC_W}`} vectorEffect="non-scaling-stroke" />
              <path d={TICKS.books} vectorEffect="non-scaling-stroke" />
              <path d={TICKS.nt} vectorEffect="non-scaling-stroke" />
            </g>
            <circle cx={Math.round(chapterX * ARC_W * 10) / 10} cy={ARC_BASE} r={6} className={styles.skyStarGold} />
          </svg>
          <div className={styles.skyScale} aria-hidden="true">
            <span style={{ left: 0, width: `${nt}%` }}>AT</span>
            <span style={{ left: `${nt}%`, right: 0 }}>NT</span>
          </div>
        </div>
        <figcaption className={styles.skyCaption}>
          As {formatInt(visible.length)} ligações mais votadas de {passage.label}, de Gênesis a Apocalipse. Toque num arco, ou
          escolha na lista abaixo, para ver os dois textos. Em ouro, as que estão na mesa.
        </figcaption>
      </figure>

      {sel && (
        <div ref={detail} tabIndex={-1} className={`bc-panel ${mesa.detail}`} role="region" aria-label={`Ligação ${pairLabel(sel)}`}>
          <VersePair
            a={{ ref: longRef(BASE, sel.here), href: versePath(BASE, sel.here), text: data.texts[BASE.locate(sel.here).verse - 1] }}
            b={{ ref: longRef(BASE, sel.there), href: versePath(BASE, sel.there), text: far[sel.key] ?? null }}
            link={`${formatInt(sel.votes)} votos`}
          />
          <p className={styles.note}>
            {formatInt(sel.votes)} votos de leitores na OpenBible.info · Bíblia Livre (BLIVRE)
            {isBrought(sel.key) ? people(table.brought[sel.key]) : ""}
          </p>
          <div className={mesa.detailActions}>
            {table.turn.includes(sel.key) ? (
              <button type="button" className="bc-button bc-button--secondary" onClick={() => remove(sel.key)}>
                Tirar da mesa
              </button>
            ) : (
              <button type="button" className="bc-button bc-button--primary" onClick={() => bring(sel.key)} disabled={turnLeft <= 0}>
                Trazer para a mesa
              </button>
            )}
            <Link className="bc-button bc-button--secondary" href={conexaoPath(sideOf(sel.here), sideOf(sel.there))}>
              <Icon name="side" />
              Ler os dois lado a lado
            </Link>
            <button type="button" className="bc-button bc-button--ghost" onClick={() => setSelected(null)}>
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className={mesa.turn}>
        <p className={styles.meta} role="status">
          {turnLeft > 0
            ? `Quem está com o aparelho pode trazer mais ${turnLeft} ${turnLeft === 1 ? "ligação" : "ligações"}.`
            : "Esta pessoa já trouxe 3 ligações."}
        </p>
        <button type="button" className="bc-button bc-button--secondary" onClick={nextPerson} disabled={table.turn.length === 0}>
          Passar para a próxima pessoa
        </button>
      </div>

      <div className={mesa.lists}>
        <section aria-labelledby="titulo-na-mesa">
          <h3 id="titulo-na-mesa" className={`bc-title ${styles.h2}`}>
            Na mesa
          </h3>
          {brought.length === 0 ? (
            <p className={styles.meta}>Ninguém trouxe uma ligação ainda. Escolha um arco ou um item da lista.</p>
          ) : (
            <ul className={mesa.items}>
              {brought
                .map((k) => byKey.get(k)!)
                .sort((a, b) => b.votes - a.votes || a.here - b.here)
                .map((l) => (
                  <li key={l.key}>
                    <button type="button" className={mesa.item} aria-pressed={l.key === selected} onClick={() => setSelected(l.key)}>
                      <span className={mesa.mark}>
                        <span className="i i-arc" aria-hidden="true" />
                      </span>
                      <span>{pairLabel(l)}</span>
                      <span className={styles.count}>
                        {formatInt(l.votes)} votos{people(table.brought[l.key])}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
          {brought.length > 0 && (
            <p className={`${styles.actions} ${mesa.after}`}>
              <button type="button" className="bc-button bc-button--ghost" onClick={clear}>
                Limpar esta mesa
              </button>
            </p>
          )}
        </section>

        <section aria-labelledby="titulo-todas">
          <h3 id="titulo-todas" className={`bc-title ${styles.h2}`}>
            Ligações de {passage.label}
          </h3>
          <ol className={mesa.items}>
            {visible.map((l) => (
              <li key={l.key}>
                <button type="button" className={mesa.item} aria-pressed={l.key === selected} onClick={() => setSelected(l.key)}>
                  <span className={mesa.mark}>{isBrought(l.key) && <span className="i i-arc" aria-hidden="true" />}</span>
                  <span>
                    {pairLabel(l)}
                    {isBrought(l.key) && <span className="visually-hidden"> (na mesa)</span>}
                  </span>
                  <span className={styles.count}>{formatInt(l.votes)} votos</span>
                </button>
              </li>
            ))}
          </ol>
          {shown < data.links.length && (
            <p className={`${styles.actions} ${mesa.after}`}>
              <button type="button" className="bc-button bc-button--secondary" onClick={() => setShown((s) => s + PAGE)}>
                Mostrar mais {formatInt(Math.min(PAGE, data.links.length - shown))}
              </button>
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
