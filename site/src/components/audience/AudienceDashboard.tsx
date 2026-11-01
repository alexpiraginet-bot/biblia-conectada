"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { AUDIENCE_AREAS, AUDIENCE_CHANNELS, AUDIENCE_CAMPAIGNS, type AudienceReport } from "@/lib/audience/core";
import { AdminSecurity, AdminUsername, passkeyErrorMessage, usePasskeySupport } from "./AdminSecurity";
import styles from "./audience.module.css";
const integer = (n: number) => n.toLocaleString("pt-BR");
const dateLabel = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
type Envelope = { report: AudienceReport; sha256: string };
export function AudienceDashboard() {
  const [days, setDays] = useState(30), [data, setData] = useState<Envelope | null>(null), [state, setState] = useState("loading"), [message, setMessage] = useState("");
  const [pending, setPending] = useState(false), [tab, setTab] = useState("audience");
  const [remember, setRemember] = useState(true), [securityBusy, setSecurityBusy] = useState(false);
  const [authMethod, setAuthMethod] = useState<"password" | "passkey" | null>(null);
  const passkeysSupported = usePasskeySupport();
  const authFlight = useRef<AbortController | null>(null), cancelCeremony = useRef<(() => void) | null>(null);
  const authGeneration = useRef(0), active = useRef(true);
  const securityOperation = useRef(false);
  const loginTitle = useRef<HTMLHeadingElement>(null), focusLogin = useRef(false);
  const loginFeedback = useRef<HTMLParagraphElement>(null), focusFeedback = useRef(false);
  const generation = useRef(0), inFlight = useRef<AbortController | null>(null), closing = useRef(false);
  const invalidate = useCallback(() => { generation.current++; inFlight.current?.abort(); inFlight.current = null; }, []);
  const cancelAuth = useCallback(() => {
    authGeneration.current++;
    const controller = authFlight.current; authFlight.current = null;
    controller?.abort(); cancelCeremony.current?.(); cancelCeremony.current = null;
    setPending(false); setAuthMethod(null);
  }, []);
  const securityBusyChange = useCallback((busy: boolean) => {
    securityOperation.current = busy;
    if (busy) invalidate();
    setSecurityBusy(busy);
  }, [invalidate]);
  const refresh = useCallback(async () => {
    if (!active.current || closing.current || securityOperation.current) return;
    invalidate(); const current = generation.current, controller = new AbortController(); inFlight.current = controller;
    try {
      const response = await fetch(`/api/admin/audience?days=${days}`, { cache: "no-store", signal: controller.signal }); const body = await response.json();
      if (current !== generation.current || controller.signal.aborted) return;
      if (!response.ok) { if (response.status === 401 || response.status === 503 && body.error === "setup") { setData(null); setState(body.error); } else setState("error"); setMessage(body.message || "Não foi possível atualizar o painel."); return; }
      setData(body); setState("ready"); setMessage("");
    } catch { if (current !== generation.current || controller.signal.aborted) return; setState("error"); setMessage("Conexão indisponível. A última leitura não foi substituída por zeros."); }
    finally { if (inFlight.current === controller) inFlight.current = null; }
  }, [days, invalidate]);
  useEffect(() => { const initial = setTimeout(() => { void refresh(); }, 0); const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 60000); return () => { clearTimeout(initial); clearInterval(timer); invalidate(); }; }, [refresh, invalidate]);
  useEffect(() => {
    active.current = true; closing.current = false;
    return () => {
      active.current = false; cancelAuth();
      securityOperation.current = false; setSecurityBusy(false);
    };
  }, [cancelAuth]);
  useEffect(() => { if (!data && state === "login" && focusLogin.current) { focusLogin.current = false; loginTitle.current?.focus(); } }, [data, state]);
  useEffect(() => {
    if (data) { focusFeedback.current = false; return; }
    if (!data && !pending && message && focusFeedback.current) {
      focusFeedback.current = false;
      loginFeedback.current?.focus({ preventScroll: true });
      loginFeedback.current?.scrollIntoView({ block: "nearest" });
    }
  }, [data, message, pending]);
  const sessionExpired = useCallback(() => {
    closing.current = true; invalidate(); securityOperation.current = false; setSecurityBusy(false); setData(null); setTab("audience");
    focusLogin.current = true; setState("login"); setMessage("Sua sessão expirou. Entre novamente para continuar.");
  }, [invalidate]);
  function beginAuth(method: "password" | "passkey" | "logout") {
    if (!active.current || authFlight.current || securityOperation.current) return null;
    const attempt = { controller: new AbortController(), version: ++authGeneration.current };
    authFlight.current = attempt.controller;
    setPending(true); setAuthMethod(method === "logout" ? null : method);
    return attempt;
  }
  function isCurrentAuth(attempt: { controller: AbortController; version: number }) {
    return active.current && authFlight.current === attempt.controller && authGeneration.current === attempt.version && !attempt.controller.signal.aborted;
  }
  function finishAuth(attempt: { controller: AbortController; version: number }) {
    if (authFlight.current !== attempt.controller || authGeneration.current !== attempt.version) return;
    authFlight.current = null; cancelCeremony.current = null;
    if (active.current) { setPending(false); setAuthMethod(null); }
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, password = String(new FormData(form).get("password") ?? "");
    const attempt = beginAuth("password"); if (!attempt) return;
    const { controller } = attempt;
    focusFeedback.current = true;
    setMessage("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, remember }), signal: controller.signal });
      const result = await response.json(); if (!isCurrentAuth(attempt)) return;
      if (!response.ok || result.ok !== true) setMessage(result.message || "Não foi possível entrar.");
      else { form.reset(); closing.current = false; await refresh(); }
    } catch { if (isCurrentAuth(attempt)) setMessage("Não foi possível conectar. Tente novamente."); }
    finally { finishAuth(attempt); }
  }
  async function loginWithPasskey() {
    const attempt = beginAuth("passkey"); if (!attempt) return;
    const { controller } = attempt;
    focusFeedback.current = true;
    setMessage("Confirme a entrada no seu aparelho.");
    try {
      const browser = await import("@simplewebauthn/browser");
      if (!isCurrentAuth(attempt)) return;
      if (!browser.browserSupportsWebAuthn()) throw new DOMException("Unsupported", "NotSupportedError");
      const response = await fetch("/api/admin/passkeys/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "authenticate", remember }), signal: controller.signal });
      const body = await response.json() as { options?: PublicKeyCredentialRequestOptionsJSON; message?: string };
      if (!isCurrentAuth(attempt)) return;
      if (!response.ok || !body.options) { setMessage(body.message || "Não foi possível preparar a entrada. Use sua senha ou tente novamente."); return; }
      cancelCeremony.current = () => browser.WebAuthnAbortService.cancelCeremony();
      const credential = await browser.startAuthentication({ optionsJSON: body.options });
      if (!isCurrentAuth(attempt)) return;
      const verification = await fetch("/api/admin/passkeys/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "authenticate", credential }), signal: controller.signal });
      const result = await verification.json(); if (!isCurrentAuth(attempt)) return;
      if (!verification.ok || result.ok !== true) setMessage(result.message || "Não foi possível confirmar a entrada. Use sua senha ou tente novamente.");
      else { closing.current = false; await refresh(); }
    } catch (error) { if (isCurrentAuth(attempt)) setMessage(passkeyErrorMessage(error)); }
    finally { finishAuth(attempt); }
  }
  async function logout() {
    const attempt = beginAuth("logout"); if (!attempt) return;
    closing.current = true; invalidate();
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE", signal: attempt.controller.signal });
      if (!isCurrentAuth(attempt)) return;
      if (!response.ok) throw new Error("logout");
      setData(null); setTab("audience"); setMessage(""); focusLogin.current = true; setState("login");
    } catch { if (isCurrentAuth(attempt)) { closing.current = false; setMessage("Não foi possível encerrar a sessão. Tente novamente."); } }
    finally { finishAuth(attempt); }
  }
  const report = data?.report;
  return <main id="conteudo" className={`${styles.root} site-page`}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>BÍBLIA CONECTADA · GESTÃO PRIVADA</p><h1>A Palavra alcança.<br /><em>Acompanhe o caminho.</em></h1><p>Audiência, campanhas e evidências para crescer com propósito.</p></div>{report && <button type="button" className={styles.subtle} disabled={pending || securityBusy} onClick={logout}>{pending ? "Saindo…" : "Sair"}</button>}</header>
    {!report ? <section className={styles.login}>
      <h2 ref={loginTitle} tabIndex={-1}>Seu painel de audiência</h2><p>Acesso reservado à gestão do projeto. As informações de leitores não são públicas.</p>
      {state === "loading" ? <p role="status">Conferindo o acesso…</p> : state === "setup" ? <p role="status">O painel está instalado. Falta configurar a senha inicial de administração no servidor.</p> : <>
        <form onSubmit={login}>
          <AdminUsername />
          <label htmlFor="audience-password">Senha</label><input id="audience-password" name="password" type="password" autoComplete="current-password" required minLength={16} maxLength={128} disabled={pending} aria-describedby="audience-password-help" />
          <label className={styles.remember}><input type="checkbox" name="remember" checked={remember} disabled={pending} onChange={event => setRemember(event.target.checked)} /><span>Manter conectado por 30 dias</span></label>
          <p className={styles.securityCaption}>Desmarcado, o acesso dura até 8 horas.</p>
          <button type="submit" disabled={pending}>{authMethod === "password" ? "Entrando…" : "Entrar no painel"}</button>
        </form>
        {passkeysSupported && <><button type="button" className={styles.passkeyLogin} disabled={pending} onClick={loginWithPasskey}>{authMethod === "passkey" ? "Aguardando o aparelho…" : "Entrar com Face ID / biometria"}</button><p className={styles.securityCaption}>Use uma chave já cadastrada em Segurança. O aparelho oferece biometria ou código; os dados biométricos não chegam ao site.</p></>}
        <p id="audience-password-help" className={styles.securityCaption}>Sua senha atual continua válida. Depois de entrar, abra Segurança para alterá-la ou cadastrar uma chave de acesso.</p>
        <details className={styles.passwordHelp}><summary>Salvar a senha neste aparelho</summary><p>Ao entrar, o navegador pode oferecer salvar a senha. Aceite o aviso se quiser usar o preenchimento automático. No iPhone, confira também o app Senhas e os ajustes de preenchimento automático. A oferta depende do navegador e das suas preferências.</p></details>
      </>}
      <p ref={loginFeedback} tabIndex={-1} className={styles.securityMessage} role="status" aria-live="polite" aria-atomic="true">{message}</p>
    </section> : <>
      <nav className={styles.tabs} aria-label="Áreas de gestão">{[["audience", "Audiência"], ["growth", "Google e crescimento"], ["partners", "Relatório para parceiros"], ["security", "Segurança"]].map(([value, label]) => <button key={value} type="button" disabled={securityBusy || pending} aria-current={tab === value ? "page" : undefined} onClick={() => setTab(value)}>{label}</button>)}</nav>
      {tab !== "security" && <>
      <div className={styles.toolbar}><label>Período <select value={days} onChange={e => { invalidate(); setData(null); setState("loading"); setDays(Number(e.target.value)); }}>{[7, 30, 90].map(value => <option key={value} value={value}>Últimos {value} dias</option>)}</select></label><button className={styles.subtle} onClick={refresh}>Atualizar</button><span>Última leitura: {dateLabel(report.generatedAt)}</span></div>
      {message && <p className={styles.notice} role="status">{message} Os números abaixo são da última atualização indicada.</p>}
      <p className={styles.notice}>{report.startedAt ? `Coleta iniciada em ${dateLabel(report.startedAt)}. Hoje ainda está em andamento.` : "A coleta ainda não registrou a primeira visualização. Nenhum histórico foi criado retroativamente."}{!report.enabled && " A coleta está desativada."}{report.environment !== "production" && " Ambiente de PRÉVIA: não utilizar estes dados como audiência pública."}</p>
      </>}
      {tab === "security" && <AdminSecurity onSessionExpired={sessionExpired} onBusyChange={securityBusyChange} />}
      {tab === "audience" && <>
        <div className={styles.kpis}><article><span>Visualizações registradas</span><strong>{report.startedAt ? integer(report.totals.views) : "—"}</strong><small>Recargas podem contar novamente.</small></article><article><span>Páginas visíveis por 30s</span><strong>{report.startedAt ? integer(report.totals.engaged) : "—"}</strong><small>Sinal de atenção; não comprova leitura.</small></article><article><span>Visitantes únicos</span><strong>Não medido</strong><small>Depende da conexão com o Analytics.</small></article><article><span>Campanhas Google Ads</span><strong>Em preparação</strong><small>Nenhum gasto informado ou campanha ativada.</small></article></div>
        <section className={styles.panel}><div className={styles.panelHeading}><h2>Um dia de cada vez</h2><span>Visualizações · horário de Brasília</span></div><div className={styles.chart} role="img" aria-label={`Visualizações registradas por dia: ${report.rows.filter(r => r.covered).map(r => `${r.date}: ${r.views}`).join("; ") || "coleta ainda não iniciada"}`}>
          {report.rows.map(row => <div key={row.date} className={styles.barSlot} title={`${row.date}: ${row.covered ? integer(row.views) : "sem cobertura"}`}><div className={styles.bar} style={{ height: `${row.covered ? Math.max(row.views > 0 ? 2 : 0, row.views / Math.max(1, ...report.rows.map(r => r.views)) * 100) : 0}%` }} /><span>{row.date.slice(8)}</span></div>)}
        </div><p className={styles.caption}>De {report.from} a {report.to}. Dias anteriores à coleta não representam zero acessos.</p></section>
        <div className={styles.columns}><Breakdown report={report} labels={AUDIENCE_AREAS} dimension="areas" title="Onde a Palavra é explorada" /><Breakdown report={report} labels={AUDIENCE_CHANNELS} dimension="channels" title="Como chegam até aqui" /><Breakdown report={report} labels={AUDIENCE_CAMPAIGNS} dimension="campaigns" title="Campanhas identificadas" /></div>
      </>}
      {tab === "growth" && <section className={styles.panel}><p className={styles.eyebrow}>MENSURAÇÃO ANTES DO INVESTIMENTO</p><h2>Google e crescimento</h2><p>Conta escolhida: <strong>{report.google.account}</strong></p><ol className={styles.steps}><li><strong>Google Analytics 4</strong><p>{report.google.measurementConfigured ? "Identificador configurado. A coleta do Google depende de consentimento e precisa ser conferida no DebugView." : "Aguardando a propriedade do projeto e seu identificador G-. A contagem própria acima permanece independente."}</p><a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Abrir Google Analytics ↗</a></li><li><strong>Google Search Console</strong><p>Validar o domínio para acompanhar consultas, impressões e cliques orgânicos. Esses números não são cliques pagos.</p><a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Abrir Search Console ↗</a></li><li><strong>Campanhas de pesquisa</strong><p>Dois grupos preparados: Bíblia online e Liturgia diária. Linkar cada anúncio à página correspondente e usar UTMs consistentes. Antes de ativar: conta, conversões, orçamento e limite de CPC aprovados.</p><a href="https://ads.google.com/" target="_blank" rel="noopener noreferrer">Abrir Google Ads ↗</a></li></ol><p className={styles.notice}>A posição patrocinada depende do leilão. Não há garantia de aparecer acima de outro site. Sem listas de remarketing ou segmentação por crença religiosa.</p></section>}
      {tab === "partners" && <section className={styles.panel}><p className={styles.eyebrow}>TRANSPARÊNCIA PARA CONSTRUIR PARCERIAS</p><h2>Evidências, com contexto.</h2><p>Exporte a mesma consulta exibida no painel. Os arquivos incluem a fonte, o período, a cobertura, a metodologia e o momento de geração.</p><div className={styles.actions}><a href={`/api/admin/audience?days=${days}&format=csv`}>Baixar CSV</a><a href={`/api/admin/audience?days=${days}&format=export`}>Baixar relatório JSON</a><button onClick={() => window.print()}>Imprimir / salvar PDF</button></div><dl className={styles.facts}><dt>Fonte</dt><dd>{report.source}</dd><dt>Período</dt><dd>{report.from} a {report.to}</dd><dt>Início da coleta</dt><dd>{report.startedAt ? dateLabel(report.startedAt) : "Ainda não iniciada"}</dd><dt>Visualizações</dt><dd>{report.startedAt ? integer(report.totals.views) : "Não disponível"}</dd><dt>Retenção dos contadores</dt><dd>{report.retentionDays} dias</dd><dt>Integridade desta consulta</dt><dd className={styles.hash}>{data.sha256}</dd></dl><p>{report.methodology}</p><p>O hash identifica a versão do arquivo; não é uma auditoria independente de audiência. Para negociação comercial, confronte os dados com GA4 e relatórios oficiais de campanhas quando estiverem conectados.</p></section>}
      {tab !== "security" && <>{report.totals.capped > 0 && <p className={styles.notice}>Cobertura parcial: {integer(report.totals.capped)} eventos chegaram após o limite diário de coleta ({integer(report.dailyEventCap)}). Esses eventos não foram incluídos nos totais.</p>}
      <details className={styles.method}><summary>Como estes números são medidos</summary><p>{report.methodology}</p><p>Texto de versículos, buscas, mensagens da IA, nome, e-mail e IP não integram os relatórios. Uma chave temporária de proteção contra abuso expira em até dois minutos. As métricas são separadas dos pontos da Jornada.</p></details></>}
    </>}
  </main>;
}
function Breakdown({ report, labels, dimension, title }: { report: AudienceReport; labels: Record<string, string>; dimension: "areas" | "channels" | "campaigns"; title: string }) {
  const rows = Object.entries(labels).map(([key, label]) => ({ key, label, count: report.rows.reduce((sum, row) => sum + (row[dimension][key] ?? 0), 0) })).sort((a, b) => b.count - a.count);
  return <section className={styles.panel}><h2>{title}</h2>{!report.startedAt ? <p>Aguardando a primeira coleta.</p> : <ul className={styles.ranking}>{rows.map(row => <li key={row.key}><span>{row.label}</span><strong>{integer(row.count)}</strong></li>)}</ul>}</section>;
}
