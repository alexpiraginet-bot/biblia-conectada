"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/icons";
import { TRANSLATIONS, translationPath, type TranslationId } from "@/lib/translations";
import {
  MAX_READING_BYTES, bookReadingSummary, chapterReadingSummary, editionReadingSummary, parseReadingBackup,
  type ChapterScope, type ReadingCatalog, type ReadingUndoToken,
} from "@/lib/reading-progress/model";
import {
  exportReadingBackup, exportReadingRecovery, importReadingBackup, markChapterRead,
  setAutomaticReading, undoReadingChange, useReadingProgress,
} from "@/lib/reading-progress/store";
import { MIN_READING_MS, READING_IDLE_MS, READING_VISIBLE_RATIO } from "./automatic-policy";
import styles from "./reading-progress.module.css";

type PendingImport = { name: string; raw: string; counts: Record<TranslationId, number> };
type MutationResult = Awaited<ReturnType<typeof markChapterRead>>;
const number = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const percentage = (value: number) => value > 0 && value < .1 ? "<0,1" : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.floor(value * 10) / 10);
const searchable = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export default function ReadingProgressDashboard({ catalog }: { catalog: ReadingCatalog }) {
  const snapshot = useReadingProgress();
  const id = useId();
  const [selectedEdition, setSelectedEdition] = useState<TranslationId | null>(null);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [openBook, setOpenBook] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean; area?: "backup" } | null>(null);
  const [undo, setUndo] = useState<ReadingUndoToken | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [recoveryConsent, setRecoveryConsent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const importHeading = useRef<HTMLHeadingElement>(null);
  const downloads = useRef(new Set<string>());
  const edition = selectedEdition ?? snapshot.state.lastEdition;
  const ready = snapshot.status === "ready";
  const corrupt = snapshot.status === "corrupt";
  const books = catalog[edition];
  const stats = useMemo(() => editionReadingSummary(snapshot.state, edition, books), [snapshot.state, edition, books]);
  const bookSummaries = useMemo(() => new Map(books.map(book => [book.slug, bookReadingSummary(snapshot.state, edition, book)])), [snapshot.state, edition, books]);
  const visibleBooks = useMemo(() => books.filter(book => searchable(`${book.name} ${book.slug}`).includes(searchable(search))), [books, search]);
  const last = snapshot.state.editions[edition].lastRead;
  const lastBook = last && books.find(book => book.slug === last.book && last.verse <= (book.verses[last.chapter - 1] ?? 0));
  const continueHref = last && lastBook ? translationPath(edition, last.book, last.chapter, last.verse) : translationPath(edition);
  const continueLabel = last && lastBook ? `${lastBook.name} ${last.chapter}:${last.verse}` : null;
  const editionLabel = TRANSLATIONS.find(item => item.id === edition)!.shortName;
  const storageProblem = snapshot.status === "corrupt" || snapshot.status === "unavailable";

  useEffect(() => {
    const urls = downloads.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); };
  }, []);
  useEffect(() => { if (pendingImport) importHeading.current?.focus(); }, [pendingImport]);

  function download(text: string, filename: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
    downloads.current.add(url);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; anchor.hidden = true;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => { URL.revokeObjectURL(url); downloads.current.delete(url); }, 30_000);
  }

  async function runMutation(operation: () => Promise<MutationResult>, successMessage?: string) {
    if (busy) return;
    setBusy(true); setFeedback(null);
    try {
      const result = await operation();
      setFeedback({ message: result.ok && successMessage ? successMessage : result.message, error: !result.ok });
      setUndo(result.ok ? result.undo ?? null : null);
    } catch { setFeedback({ message: "Não foi possível salvar esta mudança. Confira o histórico antes de tentar novamente.", error: true }); setUndo(null); }
    finally { setBusy(false); }
  }

  function markChapter(scope: ChapterScope, name: string, complete: boolean) {
    void runMutation(() => markChapterRead(scope, !complete), `${name} ${scope.chapter} · ${editionLabel}: ${complete ? "marcação removida. A marcação automática está pausada" : "capítulo marcado como lido"}.`);
  }

  async function exportBackup(recovery = false) {
    if (busy) return;
    setBusy(true); setFeedback(null); setUndo(null);
    try {
      const result = await (recovery ? exportReadingRecovery() : exportReadingBackup(catalog));
      if (!result.ok || !result.text) { setFeedback({ message: result.message, error: true, area: "backup" }); return; }
      download(result.text, result.filename ?? "biblia-conectada-leitura.json");
      setFeedback({ message: recovery ? result.message : "Arquivo preparado. Guarde-o em um lugar seguro para recuperar sua leitura em outro navegador.", error: false, area: "backup" });
    } catch { setFeedback({ message: "Não foi possível preparar o arquivo. Suas marcações não foram alteradas.", error: true, area: "backup" }); }
    finally { setBusy(false); }
  }

  async function chooseBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || busy) return;
    setBusy(true); setFeedback(null); setUndo(null); setPendingImport(null); setRecoveryConsent(false);
    try {
      if (file.size > MAX_READING_BYTES) throw new Error("Este arquivo é maior que o limite de backup. Escolha um JSON exportado pela Bíblia Conectada.");
      const raw = await file.text();
      const parsed = parseReadingBackup(raw, catalog);
      setPendingImport({ name: file.name, raw, counts: {
        blivre: editionReadingSummary(parsed, "blivre", catalog.blivre).readVerses,
        "open-nbv": editionReadingSummary(parsed, "open-nbv", catalog["open-nbv"]).readVerses,
      } });
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : "Não foi possível ler este arquivo. Nenhuma marcação foi alterada.", error: true, area: "backup" }); }
    finally { setBusy(false); }
  }

  async function importBackup() {
    if (!pendingImport || busy || (corrupt && !recoveryConsent) || (!ready && !corrupt)) return;
    setBusy(true); setFeedback(null); setUndo(null);
    try {
      const recovering = corrupt;
      const result = await importReadingBackup(pendingImport.raw, catalog, recovering ? { recoverCorrupt: true } : undefined);
      setFeedback({ message: result.message, error: !result.ok, area: "backup" });
      if (result.ok) {
        setPendingImport(null); setRecoveryConsent(false); setUndo(result.undo ?? null);
        importButton.current?.focus();
      }
    } catch { setFeedback({ message: "Não foi possível importar o arquivo. Confira o histórico antes de tentar novamente.", error: true, area: "backup" }); }
    finally { setBusy(false); }
  }

  return <section className={styles.section} id="leitura" aria-labelledby={`${id}-title`}>
    <div className={styles.heading}><div><p className={styles.eyebrow}>MEU CAMINHO PELA PALAVRA</p><h2 id={`${id}-title`}>Sua leitura, passo a passo.</h2></div></div>
    <p className={styles.intro}>Acompanhe o que já leu e continue de onde parou. Este histórico fica salvo neste navegador e não acrescenta pontos à Jornada.</p>
    <fieldset className={styles.editionPicker} disabled={busy}>
      <legend>Tradução do seu progresso</legend>
      {TRANSLATIONS.map(translation => <label key={translation.id}>
        <input type="radio" name={`${id}-edition`} value={translation.id} checked={edition === translation.id} onChange={() => { setSelectedEdition(translation.id); setOpenBook(null); setFeedback(null); setUndo(null); }} />
        <span>{translation.id === "blivre" ? translation.name : translation.shortName}</span>
      </label>)}
    </fieldset>
    <p className={styles.editionNote}>As marcações de cada tradução são separadas. O total segue os versículos desta edição.</p>

    <div className={styles.overview} aria-busy={snapshot.status === "loading"}>
      <div className={styles.progressHeading}><strong className={styles.percentage}>{ready ? `${percentage(stats.percent)}%` : "—"}</strong><span>dos versículos marcados como lidos</span></div>
      <progress className={styles.progress} max={stats.totalVerses || 1} value={ready ? stats.readVerses : undefined} aria-label={`Versículos marcados em ${editionLabel}`} />
      <dl className={styles.counts}>
        <div><dt>Versículos</dt><dd>{ready ? number(stats.readVerses) : "—"} <span>de {number(stats.totalVerses)}</span></dd></div>
        <div><dt>Capítulos completos</dt><dd>{ready ? number(stats.completedChapters) : "—"} <span>de {number(stats.totalChapters)}</span></dd></div>
        <div><dt>Livros completos</dt><dd>{ready ? number(stats.completedBooks) : "—"} <span>de {number(stats.totalBooks)}</span></dd></div>
      </dl>
      <div className={styles.continue}>
        <p>{continueLabel ? <>Último trecho registrado<strong>{continueLabel} · {editionLabel}</strong></> : "Seu próximo capítulo pode começar agora."}</p>
        <Link className={styles.primary} href={continueHref} prefetch={false}>{continueLabel ? "Continuar leitura" : "Escolher uma leitura"}<Icon name="out" /></Link>
      </div>
    </div>

    <div className={styles.automatic}>
      <label htmlFor={`${id}-automatic`}><input id={`${id}-automatic`} type="checkbox" checked={snapshot.state.automatic} disabled={!ready || busy} onChange={event => void runMutation(() => setAutomaticReading(event.target.checked))} aria-describedby={`${id}-automatic-help`} />Marcar os versículos enquanto leio</label>
      <p id={`${id}-automatic-help`}>A marcação automática usa tempo com o texto visível como estimativa. Revise ou desmarque quando quiser.</p>
      <details><summary>Como funciona a marcação automática</summary><p>Um versículo por vez, com pelo menos {number(READING_VISIBLE_RATIO * 100)}% do texto visível por {number(MIN_READING_MS / 1000)} segundos. Textos maiores recebem mais tempo. A contagem pausa ao sair da página, abrir uma janela sobre a leitura ou ficar {number(READING_IDLE_MS / 1000)} segundos sem interagir. Rolar rapidamente não marca o capítulo inteiro. Desmarcar um trecho ou desfazer uma marcação também pausa o automático.</p></details>
    </div>

    {(storageProblem || snapshot.status === "loading") && <p className={styles.status} data-error={storageProblem} role="status">{snapshot.message || (snapshot.status === "loading" ? "Consultando a leitura salva neste navegador…" : "Não foi possível acessar o histórico. Nenhuma marcação foi substituída por zero.")}</p>}
    <div className={styles.status} data-error={feedback?.error} role="status" aria-live="polite" aria-atomic="true">
      {feedback && feedback.area !== "backup" && <span>{feedback.message}</span>}
      {undo && <button type="button" disabled={busy || !ready} onClick={() => void runMutation(() => undoReadingChange(undo))}>Desfazer</button>}
    </div>

    <details className={styles.catalogue} open={catalogueOpen} onToggle={event => setCatalogueOpen(event.currentTarget.open)}>
      <summary>Livros e capítulos <span>{number(books.length)} {books.length === 1 ? "livro" : "livros"}</span></summary>
      {catalogueOpen && <>
        <div className={styles.search}>
          <label htmlFor={`${id}-search`}>Encontrar um livro</label>
          <div><input id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex.: João ou Salmos" autoComplete="off" />{search && <button className={styles.secondary} type="button" onClick={() => setSearch("")}>Limpar</button>}</div>
          <p>Abra um livro para ver seus capítulos. Toque em “Lido” para desmarcar.</p>
        </div>
        <div className={styles.books}>
          {visibleBooks.map(book => {
            const bookStats = bookSummaries.get(book.slug)!;
            return <details className={styles.book} key={`${edition}-${book.slug}`} data-complete={ready && bookStats.complete} open={openBook === book.slug} onToggle={event => { const open = event.currentTarget.open; setOpenBook(current => open ? book.slug : current === book.slug ? null : current); }}>
              <summary><span className={styles.bookName}>{book.name}</span><span className={styles.bookProgress}><strong>{ready ? `${number(bookStats.completedChapters)} de ${number(bookStats.totalChapters)} ${bookStats.totalChapters === 1 ? "capítulo" : "capítulos"}` : "Consultando…"}</strong>{ready ? `${percentage(bookStats.percent)}% marcado` : "—"}</span></summary>
              {openBook === book.slug && <ol className={styles.chapters}>
                {book.verses.map((verseCount, index) => {
                  const chapter = index + 1, scope: ChapterScope = { edition, book: book.slug, chapter, verseCount };
                  const chapterStats = chapterReadingSummary(snapshot.state, scope), chapterComplete = ready && chapterStats.complete;
                  return <li key={chapter} className={styles.chapter}>
                    <div><Link href={translationPath(edition, book.slug, chapter)} prefetch={false} aria-label={`Ler ${book.name} ${chapter} em ${editionLabel}`}>Capítulo {chapter}<Icon name="out" /></Link><p>{ready ? number(chapterStats.readVerses) : "—"} de {number(verseCount)} {verseCount === 1 ? "versículo marcado" : "versículos marcados"}</p></div>
                    <div className={styles.chapterActions}><button type="button" className={styles.chapterToggle} aria-pressed={chapterComplete} aria-label={`${chapterComplete ? "Desmarcar" : "Marcar"} ${book.name} ${chapter} como lido em ${editionLabel}`} disabled={!ready || busy} onClick={() => markChapter(scope, book.name, chapterComplete)}>{chapterComplete && <Icon name="check" />}{chapterComplete ? "Lido" : "Marcar lido"}</button>{undo && undo.scope.edition === edition && undo.scope.book === book.slug && undo.scope.chapter === chapter && <button className={styles.undo} type="button" disabled={busy || !ready} onClick={() => void runMutation(() => undoReadingChange(undo))} aria-label={`Desfazer a última marcação de ${book.name} ${chapter}`}>Desfazer</button>}</div>
                  </li>;
                })}
              </ol>}
            </details>;
          })}
        </div>
        {!visibleBooks.length && <p className={styles.empty}>Nenhum livro encontrado. Tente outro nome ou limpe a busca.</p>}
      </>}
    </details>

    <details className={styles.backup}>
      <summary>Guardar ou recuperar meu histórico</summary>
      <div>
        <p>Baixe um backup JSON para levar sua leitura a outro aparelho. A importação confere o arquivo e reúne as marcações das duas traduções sem duplicar os versículos já registrados.</p>
        <p className={styles.localNotice}>Não há sincronização com uma conta. Limpar os dados do site, trocar de navegador ou encerrar uma sessão privada pode apagar este histórico. Guarde seu backup; ele contém seu percurso de leitura.</p>
        <div className={styles.backupActions}>
          <button type="button" className={styles.secondary} disabled={!ready || busy} onClick={() => void exportBackup()}>Baixar backup</button>
          <button ref={importButton} type="button" className={styles.secondary} disabled={busy || (!ready && !corrupt)} onClick={() => fileInput.current?.click()}>Escolher backup</button>
          {(corrupt || snapshot.hasRecovery) && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void exportBackup(true)}>Baixar dados preservados</button>}
        </div>
        <input ref={fileInput} type="file" className={styles.fileInput} accept="application/json,.json" aria-label="Backup de leitura da Bíblia Conectada" onChange={event => void chooseBackup(event)} />
        <p className={styles.localNotice}>Importar um backup não ativa a marcação automática e não concede pontos.</p>
        <p className={styles.status} data-error={feedback?.error} role="status" aria-live="polite">{feedback?.area === "backup" ? feedback.message : ""}</p>
        {pendingImport && <div className={styles.importReview}>
          <h3 ref={importHeading} tabIndex={-1}>Conferir o backup</h3>
          <p>Arquivo validado: <strong>{pendingImport.name}</strong></p>
          <p>{TRANSLATIONS.map(translation => `${translation.shortName}: ${number(pendingImport.counts[translation.id])} ${pendingImport.counts[translation.id] === 1 ? "versículo marcado" : "versículos marcados"}`).join(" · ")}</p>
          {corrupt ? <div className={styles.automatic}><label><input type="checkbox" checked={recoveryConsent} onChange={event => setRecoveryConsent(event.target.checked)} />Restaurar este backup; guardar cópia dos dados locais ilegíveis.</label><p>A restauração usa o arquivo escolhido. O histórico atual não pode ser mesclado porque está ilegível; uma cópia dele será preservada antes de qualquer substituição.</p></div> : <p>As marcações deste arquivo serão acrescentadas ao histórico atual. Um versículo já marcado não será contado novamente.</p>}
          <div className={styles.backupActions}>
            <button type="button" className={styles.primary} disabled={busy || (!ready && !corrupt) || (corrupt && !recoveryConsent)} onClick={() => void importBackup()}>{busy ? "Salvando…" : corrupt ? "Restaurar o backup" : "Importar e mesclar"}</button>
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setPendingImport(null); setRecoveryConsent(false); importButton.current?.focus(); }}>Cancelar</button>
          </div>
        </div>}
      </div>
    </details>
  </section>;
}
