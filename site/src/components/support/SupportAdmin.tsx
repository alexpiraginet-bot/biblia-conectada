"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CAMPAIGN, money, parseAmount, SUPPORT_CATEGORIES } from "@/lib/support/campaign";
import type { EntryKind, PublicSupport, SupportLedger } from "@/lib/support/ledger";
import styles from "./support.module.css";
import dynamic from "next/dynamic";
const SupportGiftsAdmin = dynamic(() => import("./SupportGiftsAdmin"));

type Report = PublicSupport & { ledger: SupportLedger };
const kinds: Record<EntryKind, string> = { receipt: "Contribuição recebida", expense: "Uso dos recursos", production: "Mini Jesus produzidos", delivery: "Entrega realizada", update: "Notícia da campanha", reversal: "Anular um registro" };
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export default function SupportAdmin({ onSessionExpired, onBusyChange }: { onSessionExpired: () => void; onBusyChange: (busy: boolean) => void }) {
  const [data, setData] = useState<Report | null>(null), [message, setMessage] = useState("");
  const [kind, setKind] = useState<EntryKind>("receipt"), [target, setTarget] = useState("");
  const [pending, setPending] = useState(false), [limit, setLimit] = useState(20);
  const [showGifts, setShowGifts] = useState(false);
  const requestId = useRef<string | null>(null), alive = useRef(true), heading = useRef<HTMLHeadingElement>(null);
  const fetchReport = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/admin/support", { cache: "no-store", signal });
    const body = await response.json(); if (!alive.current || signal?.aborted) return;
    if (response.status === 401) { onSessionExpired(); return; }
    if (!response.ok) throw new Error(body.message || "Não foi possível consultar a campanha.");
    setData(body);
  }, [onSessionExpired]);
  useEffect(() => {
    alive.current = true; const controller = new AbortController();
    const timer = setTimeout(() => void fetchReport(controller.signal).catch(() => { if (!controller.signal.aborted) setMessage("Não foi possível consultar a campanha. Nenhum valor foi substituído por zero."); }), 0);
    return () => { alive.current = false; clearTimeout(timer); controller.abort(); };
  }, [fetchReport]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget, fields = new FormData(form), financial = kind === "receipt" || kind === "expense";
    const amountCents = financial ? parseAmount(fields.get("amount")) : undefined;
    if (financial && amountCents === null) { setMessage("Confira o valor em reais, sem separador de milhar."); return; }
    requestId.current ??= crypto.randomUUID();
    const payload = { id: requestId.current, kind, occurredOn: fields.get("occurredOn"), title: fields.get("title"), note: fields.get("note") ?? "",
      ...(financial ? { amountCents, reference: fields.get("reference"), verified: fields.get("verified") === "on" } : {}),
      ...(["expense", "delivery", "production"].includes(kind) ? { category: kind === "production" ? "mini" : fields.get("category") } : {}),
      ...(["production", "delivery"].includes(kind) ? { quantity: Number(fields.get("quantity")) } : {}),
      ...(kind === "reversal" ? { targetId: target } : {}) };
    setPending(true); onBusyChange(true); setMessage("");
    try {
      const response = await fetch("/api/admin/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json(); if (!alive.current) return;
      if (response.status === 401) { onSessionExpired(); return; }
      if (!response.ok) throw new Error(body.message || "Não foi possível registrar.");
      requestId.current = null; form.reset(); setKind("receipt"); setTarget("");
      setMessage(body.duplicate ? "Este envio já estava registrado. Não foi contado novamente." : "Registro salvo. O andamento público será atualizado em até 30 segundos.");
      await fetchReport().catch(() => setMessage("Registro salvo. A consulta ao histórico falhou; use Atualizar campanha para conferir."));
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : "Conexão indisponível. Tente novamente; o mesmo envio não será contado duas vezes."); }
    finally { if (alive.current) setPending(false); onBusyChange(false); }
  }
  const financial = kind === "receipt" || kind === "expense";
  const reversals = new Set(data?.ledger.entries.filter(e => e.kind === "reversal").map(e => e.targetId));
  if (showGifts) return <section className={styles.admin}><SupportGiftsAdmin onSessionExpired={onSessionExpired} onBusyChange={onBusyChange} onBack={() => setShowGifts(false)} /></section>;
  return <section className={styles.admin}>
    <div className={styles.panelTop}><div><p className={styles.eyebrow}>CAMPANHA · META {money(CAMPAIGN.goalCents)}</p><h2>A Palavra vira cuidado.</h2></div><a href="/apoie" target="_blank" rel="noopener noreferrer">Ver campanha pública ↗</a></div>
    <p>Confira cada Pix no extrato antes de registrar. Apenas as contribuições confirmadas somam na meta; os botões do público não confirmam pagamentos.</p>
    <button type="button" className={styles.primary} disabled={pending} onClick={() => setShowGifts(true)}>Acompanhar presentes →</button>
    {data?.environment === "preview" && <p className={styles.notice}>AMBIENTE DE PRÉVIA. Estes registros são separados da campanha pública.</p>}
    {data && <div className={styles.impact}>{[["Recebido", money(data.raisedCents)], ["Utilizado", money(data.spentCents)], ["Saldo registrado", money(data.availableCents)]].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>}
    <div className={styles.shareActions}>{data && <a href="/api/admin/support?format=export" download="campanha-biblia-conectada.json">Exportar registros JSON</a>}<button type="button" className={styles.quiet} disabled={pending} onClick={() => void fetchReport().then(() => setMessage("Campanha atualizada.")).catch(() => setMessage("Não foi possível atualizar. Tente novamente."))}>{data ? "Atualizar campanha" : "Tentar consultar novamente"}</button></div>
    <h3 ref={heading} tabIndex={-1}>Registrar um passo</h3>
    <form onSubmit={submit} onChange={() => { requestId.current = null; }}><fieldset disabled={pending || !data}>
      <label>Tipo de registro<select value={kind} onChange={event => { setKind(event.target.value as EntryKind); setTarget(""); }}>{Object.entries(kinds).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Data do fato<input type="date" name="occurredOn" defaultValue={today()} min={CAMPAIGN.historyReportedOn} max={today()} required /></label>
      <label>{kind === "receipt" ? "Descrição interna" : "Título público"}<input key={kind} name="title" maxLength={100} minLength={3} defaultValue={kind === "receipt" ? "Contribuição confirmada no PicPay" : ""} required /></label>
      {financial && <><label>Valor (R$)<input name="amount" inputMode="decimal" placeholder="20,00" required /></label><label>Identificador completo da transação / documento<input name="reference" minLength={16} maxLength={120} autoComplete="off" required /></label><p className={styles.small}>Copie o identificador único do extrato ou documento. Guardamos um identificador criptográfico para evitar duplicidade e apenas os últimos seis caracteres para conferência. Não use o código Pix da campanha aqui.</p></>}
      {(kind === "expense" || kind === "delivery") && <label>Destino<select name="category" required>{Object.entries(SUPPORT_CATEGORIES).filter(([value]) => kind === "expense" || value !== "project").map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>}
      {(kind === "production" || kind === "delivery") && <label>Quantidade realizada<input name="quantity" type="number" min={1} max={10000} step={1} required /></label>}
      {kind === "reversal" && <><label>Registro a anular<select value={target} onChange={event => setTarget(event.target.value)} required><option value="">Selecione o registro</option>{data?.ledger.entries.filter(e => e.kind !== "reversal" && !reversals.has(e.id)).map(e => <option value={e.id} key={e.id}>{e.occurredOn} · {e.title}{e.amountCents ? ` · ${money(e.amountCents)}` : ""}</option>)}</select></label><p className={styles.notice}>Anular corrige os números do site e preserva o histórico. Depois, registre o valor correto usando o mesmo identificador da transação. Esta ação não devolve dinheiro no banco.</p></>}
      <label>{kind === "receipt" ? "Observação interna (opcional)" : kind === "reversal" ? "Motivo da correção (até 160 caracteres)" : "Relato público"}<textarea key={kind} name="note" rows={3} maxLength={kind === "reversal" ? 160 : 1000} minLength={kind === "reversal" ? 8 : undefined} required={kind !== "receipt"} /></label>
      {kind !== "receipt" && <p className={styles.small}>Não publique nomes de beneficiários, contatos, endereços ou dados de comprovantes. Relate somente o que já foi realizado nesta campanha.</p>}
      {financial && <label className={styles.check}><input name="verified" type="checkbox" required />Conferi o valor e o identificador no extrato ou documento. Este lançamento pertence à campanha.</label>}
      <button type="submit" className={styles.primary}>{pending ? "Registrando…" : "Salvar registro"}</button>
    </fieldset></form>
    <p className={styles.notice} role="status" aria-live="polite">{message || "O histórico mantém registros e correções. Exporte periodicamente uma cópia da prestação de contas."}</p>
    <h3>Histórico da campanha</h3><ul className={styles.adminList}>{data?.ledger.entries.slice(-limit).reverse().map(entry => <li key={entry.id}><div><strong>{entry.title}</strong>{entry.amountCents !== undefined && <strong>{money(entry.amountCents)}</strong>}</div><small>{entry.occurredOn} · {kinds[entry.kind]}{entry.category ? ` · ${SUPPORT_CATEGORIES[entry.category]}` : ""}{entry.quantity ? ` · ${entry.quantity} unidades` : ""}{reversals.has(entry.id) ? " · ANULADO" : ""}{entry.referenceTail ? ` · Ref. final ${entry.referenceTail}` : ""}</small><p>{entry.note}</p>{entry.kind !== "reversal" && !reversals.has(entry.id) && <button type="button" className={styles.quiet} disabled={pending} onClick={() => { setKind("reversal"); setTarget(entry.id); requestId.current = null; heading.current?.focus(); }}>Corrigir / anular registro</button>}</li>)}</ul>
    {data && data.ledger.entries.length > limit && <button className={styles.quiet} type="button" onClick={() => setLimit(value => value + 20)}>Ver registros anteriores</button>}
    {data?.ledger.entries.length === 0 && <p>Ainda não há registros nesta campanha.</p>}
  </section>;
}
