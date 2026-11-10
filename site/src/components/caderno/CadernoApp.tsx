"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { DownloadIcon } from "@/components/icons";
import { SavedList } from "@/components/salvos/SavedList";
import {
  CadernoError, dueMemos, isEmptyCaderno, LAST_BOX, LEITNER_DAYS, MARK_COLORS, MARK_LABEL, markGroups, MAX_CADERNO_BYTES, parseCadernoBackup, passagePlace,
  type Caderno, type CadernoBackup, type CadernoCatalog, type MarkColor, type MarkGroup, type Memo, type Nota,
} from "@/lib/caderno/model";
import {
  cadernoBackup, clearCaderno, eraseMemo, importCadernoBackup, restartCaderno, today, unmarkPassage, unreadableCaderno, useCaderno,
} from "@/lib/caderno/store";
import { formatInt } from "@/lib/canon/text";
import { parseSalvos, readRaw, subscribeSalvos } from "@/lib/salvos";
import { CadernoIcon } from "./icons";
import { NoteDialog } from "./reader";
import { Review, whenLabel } from "./Review";
import styles from "./caderno.module.css";

const VIEWS = [
  { id: "anotacoes", label: "Anotações" },
  { id: "grifos", label: "Grifos" },
  { id: "decorar", label: "Decorar" },
  { id: "salvos", label: "Salvos" },
] as const;
type View = (typeof VIEWS)[number]["id"];

// the view lives in the address (#decorar), so a link opens the notebook on it and Back keeps it
const VIEW_EVENT = "bc:caderno-view";
const isView = (id: string): id is View => VIEWS.some((v) => v.id === id);
const readView = (): View => {
  const id = window.location.hash.slice(1);
  return isView(id) ? id : "anotacoes";
};
function subscribeView(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener(VIEW_EVENT, callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener(VIEW_EVENT, callback);
  };
}
function showView(view: View) {
  window.history.replaceState(window.history.state, "", `#${view}`);
  window.dispatchEvent(new Event(VIEW_EVENT));
}

// the review day changes while the page is open: looked at again when the tab comes back and once a minute
function subscribeDay(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  const timer = window.setInterval(callback, 60_000);
  return () => {
    document.removeEventListener("visibilitychange", callback);
    window.clearInterval(timer);
  };
}

const instantFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
const dateLabel = (iso: string) => instantFmt.format(new Date(iso));
const plural = (n: number, one: string, many: string) => `${formatInt(n)} ${n === 1 ? one : many}`;
const afterPaint = (run: () => void) => requestAnimationFrame(run);

function saveFile(text: string, filename: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A button that asks before it acts: the question takes its place, and the focus follows it there and back. */
function Confirm({ label, question, yes, no = "Manter", onYes, className = "bc-button bc-button--ghost" }: { label: string; question: string; yes: string; no?: string; onYes: () => void; className?: string }) {
  const [asking, setAsking] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  if (!asking) {
    return (
      <button
        ref={opener}
        type="button"
        className={`${className} ${styles.quiet}`}
        onClick={() => {
          setAsking(true);
          afterPaint(() => keep.current?.focus());
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <span className={styles.confirm} role="group" aria-label="Confirmar">
      <span className={styles.confirmText}>{question}</span>
      <button
        type="button"
        className={`bc-button bc-button--secondary ${styles.danger}`}
        onClick={() => {
          setAsking(false);
          onYes();
        }}
      >
        {yes}
      </button>
      <button
        ref={keep}
        type="button"
        className="bc-button bc-button--secondary"
        onClick={() => {
          setAsking(false);
          afterPaint(() => opener.current?.focus());
        }}
      >
        {no}
      </button>
    </span>
  );
}

function Empty({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className={styles.empty}>
      {icon}
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyText}>{children}</p>
      <div className={styles.actions}>
        <Link href="/genesis/1" className="bc-button bc-button--primary">
          Abrir Gênesis 1
        </Link>
        <Link href="/ler" className="bc-button bc-button--secondary">
          Ver os livros
        </Link>
      </div>
    </div>
  );
}

const placeOf = (catalog: CadernoCatalog, p: { livro: string; cap: number; de: number; ate: number }) =>
  passagePlace(catalog, p) ?? { ref: `${p.livro} ${p.cap}:${p.de}`, path: null };

function PlaceLink({ place }: { place: { ref: string; path: string | null } }) {
  return place.path ? (
    <Link href={place.path} className={styles.ref} prefetch={false}>
      {place.ref}
    </Link>
  ) : (
    <span className={styles.ref}>{place.ref}</span>
  );
}

type Tell = (message: string) => void;

function Notes({ notas, catalog, tell }: { notas: Nota[]; catalog: CadernoCatalog; tell: Tell }) {
  const [editing, setEditing] = useState<Nota | null>(null);
  if (notas.length === 0) {
    return (
      <Empty icon={<CadernoIcon name="note" className={`bc-icon ${styles.emptyIcon}`} />} title="Nenhuma anotação neste aparelho.">
        Num capítulo, selecione um trecho do texto e escolha “Anotar”. O que você escrever fica aqui, com os versículos ao lado.
      </Empty>
    );
  }
  const sorted = [...notas].sort((a, b) => b.em.localeCompare(a.em));
  return (
    <>
      <h2 className="bc-section-title">
        {plural(notas.length, "anotação", "anotações")}
        <small>da mais recente à mais antiga</small>
      </h2>
      <ol className={styles.list}>
        {sorted.map((n) => {
          const place = placeOf(catalog, n);
          return (
            <li key={n.id} className={styles.item}>
              <div className={styles.itemHead}>
                <PlaceLink place={place} />
                <span className={styles.itemActions}>
                  <button type="button" className={`bc-button bc-button--ghost ${styles.quiet}`} onClick={() => setEditing(n)} aria-label={`Editar a anotação de ${place.ref}`}>
                    Editar
                  </button>
                </span>
              </div>
              <blockquote className={styles.quote}>{n.trecho}</blockquote>
              <p className={styles.noteText}>{n.nota}</p>
              <p className={`bc-meta ${styles.when}`}>
                Escrita em {dateLabel(n.criadaEm)}
                {dateLabel(n.em) !== dateLabel(n.criadaEm) && `, editada em ${dateLabel(n.em)}`} · Bíblia Livre
              </p>
            </li>
          );
        })}
      </ol>
      {editing && (
        <NoteDialog
          key={editing.id}
          passage={editing}
          label={placeOf(catalog, editing).ref}
          trecho={editing.trecho}
          onClose={(message) => {
            setEditing(null);
            if (message) tell(message);
          }}
        />
      )}
    </>
  );
}

function Marks({ groups, total, catalog, tell }: { groups: MarkGroup[]; total: number; catalog: CadernoCatalog; tell: Tell }) {
  const [only, setOnly] = useState<MarkColor | null>(null);
  if (groups.length === 0) {
    return (
      <Empty icon={<CadernoIcon name="mark" className={`bc-icon ${styles.emptyIcon}`} />} title="Nenhum versículo grifado neste aparelho.">
        Num capítulo, selecione um trecho do texto e escolha “Grifar”. Os versículos ficam marcados na leitura, em {MARK_COLORS.length} cores, e aparecem
        aqui.
      </Empty>
    );
  }
  const used = MARK_COLORS.filter((cor) => groups.some((g) => g.cor === cor));
  const filter = only && used.includes(only) ? only : null;
  const shown = filter ? groups.filter((g) => g.cor === filter) : groups;
  return (
    <>
      <h2 className="bc-section-title">
        {plural(total, "versículo grifado", "versículos grifados")}
        <small>
          em {plural(groups.length, "trecho", "trechos")}, do mais recente ao mais antigo
        </small>
      </h2>
      {used.length > 1 && (
        <div className={styles.chips} role="group" aria-label="Mostrar os grifos de uma cor">
          <button type="button" className="bc-chip" aria-pressed={filter === null} onClick={() => setOnly(null)}>
            Todas as cores
          </button>
          {used.map((cor) => (
            <button key={cor} type="button" className="bc-chip" aria-pressed={filter === cor} onClick={() => setOnly(cor)}>
              <span className={styles.dot} data-cor={cor} aria-hidden="true" />
              {MARK_LABEL[cor]}
            </button>
          ))}
        </div>
      )}
      <ol className={styles.list}>
        {shown.map((g) => {
          const place = placeOf(catalog, g);
          return (
            <li key={`${g.livro}/${g.cap}/${g.de}`} className={styles.item}>
              <div className={styles.itemHead}>
                <PlaceLink place={place} />
                <span className={styles.itemActions}>
                  <button
                    type="button"
                    className={`bc-button bc-button--ghost ${styles.quiet}`}
                    aria-label={`Tirar o grifo de ${place.ref}`}
                    onClick={() => tell(unmarkPassage(g.livro, g.cap, g.versos.map((v) => v.vers)).message)}
                  >
                    Tirar grifo
                  </button>
                </span>
              </div>
              <blockquote className={styles.quote}>
                {g.versos.map((v) => (
                  <span key={v.vers} className={styles.markedVerse}>
                    {g.versos.length > 1 && (
                      <span className={styles.verseNumber} aria-hidden="true">
                        {v.vers}
                      </span>
                    )}
                    <span className={styles.marked} data-cor={g.cor}>
                      {v.texto}
                    </span>{" "}
                  </span>
                ))}
              </blockquote>
              <p className={`bc-meta ${styles.when}`}>
                <span className={styles.dot} data-cor={g.cor} aria-hidden="true" />
                Grifo em {MARK_LABEL[g.cor].toLowerCase()}, de {dateLabel(g.em)} · Bíblia Livre
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Memos({ state, day, catalog, tell }: { state: Caderno; day: string; catalog: CadernoCatalog; tell: Tell }) {
  const due = useMemo(() => dueMemos(state, day), [state, day]);
  if (state.memos.length === 0) {
    return (
      <Empty icon={<CadernoIcon name="review" className={`bc-icon ${styles.emptyIcon}`} />} title="Nenhuma passagem para decorar neste aparelho.">
        Num capítulo, selecione um trecho do texto e escolha “Decorar”. A passagem entra na revisão: cada vez que você lembra, ela descansa mais dias (
        {LEITNER_DAYS.join(", ")}).
      </Empty>
    );
  }
  const sorted = [...state.memos].sort((a, b) => a.proxima.localeCompare(b.proxima) || a.caixa - b.caixa || a.criadaEm.localeCompare(b.criadaEm));
  const next = sorted.find((m) => m.proxima > day);
  return (
    <>
      <Review due={due} today={day} next={next} catalog={catalog} onProblem={tell} />
      <h2 className="bc-section-title">
        {plural(state.memos.length, "passagem para decorar", "passagens para decorar")}
        <small>da próxima revisão à mais distante</small>
      </h2>
      <p className={styles.how}>
        São {LAST_BOX} caixas. Lembrou, a passagem sobe uma caixa e descansa {LEITNER_DAYS.slice(0, -1).join(", ")} e depois {LEITNER_DAYS[LAST_BOX - 1]} dias. Não
        lembrou, volta à caixa 1 no mesmo dia. O dia vira à meia-noite de Brasília.
      </p>
      <ol className={styles.list}>
        {sorted.map((m: Memo) => {
          const place = placeOf(catalog, m);
          return (
            <li key={m.id} className={styles.item}>
              <div className={styles.itemHead}>
                <PlaceLink place={place} />
                <span className={styles.itemActions}>
                  <Confirm label="Tirar da lista" question="Tirar esta passagem? As revisões feitas se perdem." yes="Tirar" onYes={() => tell(eraseMemo(m.id).message)} />
                </span>
              </div>
              <p className={styles.schedule}>
                Caixa {m.caixa} de {LAST_BOX} · próxima revisão {whenLabel(m.proxima, day)}
              </p>
              <details className={styles.reveal}>
                <summary>Ver o texto</summary>
                <blockquote className={styles.quote}>{m.texto}</blockquote>
              </details>
              <p className={`bc-meta ${styles.when}`}>
                {m.revisoes === 0 ? "Ainda sem revisões" : `${plural(m.revisoes, "revisão", "revisões")}, ${plural(m.acertos, "lembrada", "lembradas")}`} · desde{" "}
                {dateLabel(m.criadaEm)} · Bíblia Livre
              </p>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function backupCounts(b: CadernoBackup): string {
  const parts = [
    b.caderno.grifos.length > 0 && plural(b.caderno.grifos.length, "versículo grifado", "versículos grifados"),
    b.caderno.notas.length > 0 && plural(b.caderno.notas.length, "anotação", "anotações"),
    b.caderno.memos.length > 0 && plural(b.caderno.memos.length, "passagem para decorar", "passagens para decorar"),
    b.salvos.length > 0 && plural(b.salvos.length, "trecho salvo", "trechos salvos"),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "nenhum item";
}

function Backup({ state, hasSalvos, catalog, tell }: { state: Caderno; hasSalvos: boolean; catalog: CadernoCatalog; tell: Tell }) {
  const input = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<{ name: string; raw: string; backup: CadernoBackup } | null>(null);
  const nothing = isEmptyCaderno(state) && !hasSalvos;

  const download = () => {
    const file = cadernoBackup();
    if (!file) return tell("O caderno não pôde ser lido para o backup.");
    saveFile(file.text, file.filename);
    tell("Backup preparado. Guarde o arquivo: ele traz o que você escreveu.");
  };
  const choose = async (file: File | undefined) => {
    setChosen(null);
    if (!file) return;
    if (file.size > MAX_CADERNO_BYTES) return tell("O arquivo é maior do que o caderno aceita.");
    try {
      const raw = await file.text();
      setChosen({ name: file.name, raw, backup: parseCadernoBackup(raw, catalog) });
      tell(`Backup conferido: ${file.name}. Falta confirmar a importação.`);
    } catch (error) {
      tell(error instanceof CadernoError ? error.message : "Não foi possível ler este arquivo.");
    }
  };

  return (
    <section className={styles.backup} aria-labelledby="caderno-backup">
      <h2 id="caderno-backup" className="bc-section-title">
        Backup
        <small>para guardar ou levar a outro aparelho</small>
      </h2>
      <p className={styles.how}>
        O arquivo leva os grifos, as anotações, as passagens para decorar e os trechos salvos. Importar junta o arquivo ao que já está neste aparelho; nada é
        apagado. Sua leitura marcada tem o próprio backup em <Link href="/jornada#leitura">Minha jornada</Link>.
      </p>
      <div className={styles.tools}>
        <button type="button" className="bc-button bc-button--secondary" onClick={download} disabled={nothing}>
          <DownloadIcon />
          Baixar meu caderno (JSON)
        </button>
        <button type="button" className="bc-button bc-button--secondary" onClick={() => input.current?.click()}>
          Importar um backup
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          hidden
          data-caderno-import=""
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {!isEmptyCaderno(state) && (
          <Confirm
            className="bc-button bc-button--secondary"
            label="Apagar o caderno deste aparelho"
            question="Apagar todos os grifos, anotações e passagens para decorar? Os trechos salvos ficam."
            yes="Apagar tudo"
            no="Cancelar"
            onYes={() => tell(clearCaderno().message)}
          />
        )}
      </div>
      {chosen && (
        <div className={styles.chosen} role="group" aria-label="Backup escolhido">
          <p className={styles.confirmText}>
            {chosen.name}: {backupCounts(chosen.backup)}, exportado em {dateLabel(chosen.backup.exportadoEm)}.
          </p>
          <button
            type="button"
            className="bc-button bc-button--primary"
            onClick={() => {
              const result = importCadernoBackup(chosen.raw, catalog);
              setChosen(null);
              tell(result.message);
            }}
          >
            Importar e mesclar
          </button>
          <button type="button" className="bc-button bc-button--secondary" onClick={() => setChosen(null)}>
            Cancelar
          </button>
        </div>
      )}
    </section>
  );
}

/** The notebook could not be read: what happened, the unreadable data to download, and the explicit way to start again. */
function Problem({ message, corrupt, tell }: { message: string; corrupt: boolean; tell: Tell }) {
  return (
    <div className={styles.problem} role="group" aria-label="Problema no caderno">
      <p className={styles.problemText}>{message}</p>
      {corrupt && (
        <div className={styles.tools}>
          <button
            type="button"
            className="bc-button bc-button--secondary"
            onClick={() => {
              const raw = unreadableCaderno();
              if (raw === null) return tell("Não há dados ilegíveis para baixar.");
              saveFile(raw, "caderno-dados-ilegiveis.txt", "text/plain");
              tell("Arquivo preparado com os dados ilegíveis, sem alterações.");
            }}
          >
            <DownloadIcon />
            Baixar os dados ilegíveis
          </button>
          <Confirm
            className="bc-button bc-button--secondary"
            label="Recomeçar o caderno"
            question="Começar um caderno vazio? Os dados ilegíveis ficam guardados à parte neste navegador."
            yes="Recomeçar"
            no="Cancelar"
            onYes={() => tell(restartCaderno().message)}
          />
        </div>
      )}
      <p className={styles.how}>
        Os trechos salvos não dependem do caderno: <Link href="/salvos">abrir os salvos</Link>.
      </p>
    </div>
  );
}

/** The notebook of this device, read from localStorage after the page loads (the static page has none). */
export function CadernoApp({ catalog }: { catalog: CadernoCatalog }) {
  const { state, status, message } = useCaderno();
  const view = useSyncExternalStore(subscribeView, readView, () => "anotacoes" as View);
  const day = useSyncExternalStore(subscribeDay, today, () => "");
  const salvosRaw = useSyncExternalStore(subscribeSalvos, () => readRaw() ?? "", () => null);
  const [said, setSaid] = useState("");
  const groups = useMemo(() => markGroups(state), [state]);
  const due = useMemo(() => (day ? dueMemos(state, day) : []), [state, day]);

  if (status === "loading" || !day) return <div className={styles.loading} aria-busy="true" />;
  const statusLine = (
    <p className={styles.status} role="status" data-caderno-status="">
      {said}
    </p>
  );
  if (status !== "ready") {
    return (
      <>
        {statusLine}
        <Problem message={message ?? ""} corrupt={status === "corrupt"} tell={setSaid} />
      </>
    );
  }
  const hasSalvos = parseSalvos(salvosRaw).length > 0;
  const choose = (next: View) => {
    setSaid("");
    showView(next);
  };

  return (
    <>
      {due.length > 0 && view !== "decorar" && (
        <p className={styles.dueBar}>
          <CadernoIcon name="review" className={`bc-icon ${styles.dueIcon}`} />
          <span>{due.length === 1 ? "1 passagem para revisar hoje." : `${formatInt(due.length)} passagens para revisar hoje.`}</span>
          <button type="button" className="bc-button bc-button--primary" onClick={() => choose("decorar")}>
            Revisar agora
          </button>
        </p>
      )}
      <div
        className={`bc-segmented ${styles.views}`}
        role="radiogroup"
        aria-label="Parte do caderno"
        onKeyDown={(event) => {
          const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
          if (!step) return;
          event.preventDefault();
          const index = (VIEWS.findIndex((v) => v.id === view) + step + VIEWS.length) % VIEWS.length;
          choose(VIEWS[index].id);
          (event.currentTarget.querySelectorAll("button")[index] as HTMLButtonElement | undefined)?.focus();
        }}
      >
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="radio" aria-checked={v.id === view} tabIndex={v.id === view ? 0 : -1} onClick={() => choose(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      {statusLine}
      <section className={styles.view} aria-label={VIEWS.find((v) => v.id === view)!.label} data-caderno-view={view}>
        {view === "anotacoes" && <Notes notas={state.notas} catalog={catalog} tell={setSaid} />}
        {view === "grifos" && <Marks groups={groups} total={state.grifos.length} catalog={catalog} tell={setSaid} />}
        {view === "decorar" && <Memos state={state} day={day} catalog={catalog} tell={setSaid} />}
        {view === "salvos" && <SavedList />}
      </section>
      <Backup state={state} hasSalvos={hasSalvos} catalog={catalog} tell={setSaid} />
    </>
  );
}
