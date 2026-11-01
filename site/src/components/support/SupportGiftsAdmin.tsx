"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { money } from "@/lib/support/campaign";
import type { GiftReport, GiftStatus, GiftMethod } from "@/lib/support/gifts";
import styles from "./support.module.css";

const statuses: Record<GiftStatus, string> = { waiting: "A combinar", production: "Em produção", ready: "Pronto", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado" };
type Draft = { id: string; revision: number; receiptId: string; name: string; contact: string; method: GiftMethod; status: GiftStatus; logisticsNote: string };
const blank = (): Draft => ({ id: crypto.randomUUID(), revision: 0, receiptId: "", name: "", contact: "", method: "pickup", status: "waiting", logisticsNote: "" });

export default function SupportGiftsAdmin({ onSessionExpired, onBusyChange, onBack }: { onSessionExpired: () => void; onBusyChange: (busy: boolean) => void; onBack: () => void }) {
  const [report, setReport] = useState<GiftReport | null>(null), [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState(""), [pending, setPending] = useState(false), [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("all"), [limit, setLimit] = useState(20);
  const alive = useRef(true), requestId = useRef<string | null>(null), generation = useRef(0), editor = useRef<HTMLHeadingElement>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const version = ++generation.current;
    const response = await fetch("/api/admin/support/gifts", { cache: "no-store", signal });
    const body = await response.json();
    if (!alive.current || signal?.aborted || version !== generation.current) return;
    if (response.status === 401) { onSessionExpired(); return; }
    if (!response.ok) throw new Error(body.message || "Não foi possível consultar os presentes.");
    setReport(body as GiftReport);
  }, [onSessionExpired]);
  useEffect(() => {
    alive.current = true; const controller = new AbortController();
    const timer = setTimeout(() => void refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted) setMessage("Não foi possível consultar os presentes. Tente novamente.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); }), 0);
    return () => { alive.current = false; clearTimeout(timer); controller.abort(); };
  }, [refresh]);
  const draftId = draft?.id;
  useEffect(() => { if (draftId) editor.current?.focus(); }, [draftId]);
  const editing = !!draft || pending;
  useEffect(() => { onBusyChange(editing); return () => onBusyChange(false); }, [editing, onBusyChange]);
  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    requestId.current = null;
    setDraft(current => current ? { ...current, [key]: value } : null);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!draft || pending) return;
    requestId.current ??= crypto.randomUUID(); setPending(true); setMessage("");
    try {
      const response = await fetch("/api/admin/support/gifts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...draft, requestId: requestId.current }) });
      const body = await response.json(); if (!alive.current) return;
      if (response.status === 401) { onSessionExpired(); return; }
      if (!response.ok) throw new Error(body.message || "Não foi possível salvar a ficha.");
      requestId.current = null; setDraft(null);
      setMessage(body.duplicate ? "Este envio já estava salvo. Nenhum presente foi duplicado." : "Ficha salva no painel privado.");
      await refresh().catch(() => setMessage("Ficha salva. Use Atualizar presentes para consultar o resultado."));
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : "Conexão indisponível. Tente novamente; o mesmo envio não será duplicado."); }
    finally { if (alive.current) setPending(false); }
  }
  const search = query.trim().toLocaleLowerCase("pt-BR");
  const gifts = report?.gifts.filter(gift => (filter === "all" || gift.status === filter) && (!search || `${gift.name} ${gift.contact}`.toLocaleLowerCase("pt-BR").includes(search))) ?? [];
  const receipt = report?.receipts.find(item => item.id === draft?.receiptId);
  const existing = report?.gifts.find(item => item.id === draft?.id);
  return <>
    <div className={styles.panelTop}><div><p className={styles.eyebrow}>CAMPANHA · GESTÃO PRIVADA</p><h2>Um presente. Uma pessoa.</h2></div><button type="button" className={styles.quiet} disabled={editing} onClick={onBack}>Voltar à prestação de contas</button></div>
    <p>Acompanhe cada mini Jesus, da contribuição confirmada até a entrega. Os dados desta lista ficam apenas no painel.</p>
    {report?.environment === "preview" && <p className={styles.notice}>AMBIENTE DE PRÉVIA. Estas fichas são separadas da campanha pública.</p>}
    <p className={styles.small}>Uma ficha por apoiador nesta campanha. Confira a pessoa pelo contato antes de cadastrar; um contato não comprova identidade. Registre primeiro o recebimento conferido no extrato.</p>
    <div className={styles.shareActions}>
      <button type="button" className={styles.primary} disabled={pending || !report || !!draft} onClick={() => { requestId.current = null; setDraft(blank()); setMessage(""); }}>Cadastrar presente</button>
      <button type="button" className={styles.quiet} disabled={pending} onClick={() => void refresh().then(() => setMessage("Lista atualizada. Se houver uma ficha aberta, feche e reabra para carregar a versão mais recente.")).catch(error => setMessage(error.message))}>Atualizar presentes</button>
      {report && <a href="/api/admin/support/gifts?format=export" download="presentes-biblia-conectada.json">Exportar fichas e histórico</a>}
    </div>
    {report && <div className={styles.giftCounts}>{Object.entries(statuses).map(([key, label]) => <button className={styles.quiet} aria-pressed={filter === key} key={key} type="button" disabled={pending} onClick={() => { setFilter(filter === key ? "all" : key); setLimit(20); }}><strong>{report.gifts.filter(item => item.status === key).length}</strong> {label}</button>)}</div>}
    <p className={styles.notice}>O andamento das fichas não soma novamente na campanha pública. Na prestação de contas, registre cada lote produzido ou entregue uma única vez. Exportações contêm contatos: mantenha-as privadas.</p>
    {draft && <form onSubmit={save}>
      <h3 ref={editor} tabIndex={-1}>{draft.revision === 0 ? "Novo presente" : "Atualizar presente"}</h3>
      <p className={styles.small}>Salve a ficha ou use Fechar sem salvar para mudar de área no painel. O rascunho existe somente nesta tela.</p>
      <fieldset disabled={pending}>
        <label>Contribuição confirmada<select value={draft.receiptId} onChange={event => change("receiptId", event.target.value)} required><option value="">Selecione o recebimento</option>{report?.receipts.filter(item => !item.assignedGiftId || item.assignedGiftId === draft.id).map(item => <option key={item.id} value={item.id}>{item.date} · {money(item.amountCents)} · Ref. final {item.referenceTail}</option>)}{draft.receiptId && !receipt && <option value={draft.receiptId}>Recebimento anulado — vincule a correção ou cancele a ficha</option>}</select></label>
        {existing && !existing.receiptActive && <p className={styles.notice}>O recebimento desta ficha foi anulado. Vincule um recebimento ativo da mesma pessoa para continuar, ou cancele a ficha. O histórico será preservado.</p>}
        <label>Nome ou apelido<input autoComplete="off" value={draft.name} onChange={event => change("name", event.target.value)} minLength={2} maxLength={80} required /></label>
        <label>E-mail ou telefone com DDD<input autoComplete="off" value={draft.contact} onChange={event => change("contact", event.target.value)} maxLength={160} required /></label>
        <label>Forma de entrega<select value={draft.method} onChange={event => change("method", event.target.value as GiftMethod)}><option value="pickup">Retirada gratuita</option><option value="shipping">Envio · frete pago pelo apoiador</option></select></label>
        <label>Etapa<select value={draft.status} onChange={event => change("status", event.target.value as GiftStatus)}>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value} disabled={value === "shipped" && draft.method !== "shipping"}>{label}</option>)}</select></label>
        <label>Combinação ou referência logística (opcional)<textarea value={draft.logisticsNote} onChange={event => change("logisticsNote", event.target.value)} rows={3} maxLength={240} placeholder="Ex.: retirada combinada; código de rastreio…" /></label>
        <p className={styles.small}>Combine prazo, retirada ou frete diretamente com o apoiador. Não inclua CPF, endereço, comprovante bancário ou dados de outras pessoas nesta observação. Marque Entregue somente após a entrega real.</p>
        <div className={styles.giftActions}><button type="submit" className={styles.primary}>{pending ? "Salvando…" : "Salvar ficha"}</button><button type="button" className={styles.quiet} onClick={() => { setDraft(null); requestId.current = null; }}>Fechar sem salvar</button></div>
      </fieldset>
    </form>}
    <p className={styles.status} role="status" aria-live="polite">{message || (loading ? "Consultando presentes…" : "")}</p>
    {report && <><div className={styles.giftFilters}><label>Buscar apoiador<input type="search" autoComplete="off" value={query} onChange={event => { setQuery(event.target.value); setLimit(20); }} placeholder="Nome ou contato" /></label><label>Filtrar etapa<select value={filter} onChange={event => { setFilter(event.target.value); setLimit(20); }}><option value="all">Todas as etapas</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
      <ul className={styles.adminList}>{gifts.slice(0, limit).map(gift => <li key={gift.id}><div><strong>{gift.name}</strong><span className={styles.badge}>{statuses[gift.status]}</span></div><p>{gift.contact}</p><small>{gift.method === "pickup" ? "Retirada gratuita" : "Envio · frete do apoiador"} · Atualizado em {new Date(gift.updatedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small>{!gift.receiptActive && <p className={styles.notice}>Recebimento anulado. Confira antes de continuar.</p>}{gift.logisticsNote && <p>{gift.logisticsNote}</p>}<button type="button" className={styles.quiet} disabled={pending || !!draft} onClick={() => { requestId.current = null; setMessage(""); setDraft({ id: gift.id, revision: gift.revision, receiptId: gift.receiptId, name: gift.name, contact: gift.contact, method: gift.method, status: gift.status, logisticsNote: gift.logisticsNote }); }}>Abrir ficha</button></li>)}</ul>
      {gifts.length > limit && <button type="button" className={styles.quiet} onClick={() => setLimit(current => current + 20)}>Ver mais presentes</button>}
      {gifts.length === 0 && <p>{report.gifts.length ? "Nenhuma ficha corresponde a esta busca." : "Nenhum presente cadastrado. Comece por uma contribuição confirmada."}</p>}
    </>}
  </>;
}
