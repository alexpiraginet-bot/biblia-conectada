"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import styles from "./audience.module.css";

type SecurityInfo = {
  passwordChangedAt: string | null;
  passkeys: { id: string; name: string; createdAt: string }[];
  remember: boolean;
  expiresAt: string;
};
type Result = { ok: true; message?: string };
type SecurityAttempt = { controller: AbortController; version: number; recovery: string | null };
class AdminRequestError extends Error {}
const dateLabel = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Capability detection is restricted to the administration screens. */
export function usePasskeySupport() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    let active = true;
    if (!window.isSecureContext) return;
    void import("@simplewebauthn/browser").then(({ browserSupportsWebAuthn }) => {
      if (active) setSupported(browserSupportsWebAuthn());
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return supported;
}

export function passkeyErrorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "AbortError") return "A verificação foi cancelada ou expirou. Você pode tentar novamente ou usar sua senha.";
  if (name === "InvalidStateError") return "Este aparelho já pode ter uma chave cadastrada. Confira suas chaves em Segurança, após entrar com sua senha.";
  if (name === "NotSupportedError" || name === "SecurityError") return "A chave de acesso não está disponível neste navegador. Use sua senha ou tente em um navegador compatível.";
  return "Não foi possível concluir a verificação do aparelho. Tente novamente ou use sua senha.";
}

export function AdminUsername() {
  return <input className={styles.usernameField} type="text" name="username" autoComplete="username" value="administrador" readOnly tabIndex={-1} aria-label="Usuário" />;
}

export function AdminSecurity({ onSessionExpired, onBusyChange }: { onSessionExpired: () => void; onBusyChange: (busy: boolean) => void }) {
  const id = useId();
  const supported = usePasskeySupport();
  const [info, setInfo] = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState(false), [message, setMessage] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const alive = useRef(true), readVersion = useRef(0), operationVersion = useRef(0);
  const readFlight = useRef<AbortController | null>(null), operation = useRef<SecurityAttempt | null>(null);
  const cancelCeremony = useRef<(() => void) | null>(null);
  const feedback = useRef<HTMLParagraphElement>(null);
  const invalidateRead = useCallback(() => {
    readVersion.current++;
    readFlight.current?.abort();
    readFlight.current = null;
  }, []);
  const interruptOperation = useCallback(() => {
    operationVersion.current++;
    const attempt = operation.current; operation.current = null;
    attempt?.controller.abort(); cancelCeremony.current?.(); cancelCeremony.current = null;
    if (attempt?.recovery) setMessage(attempt.recovery);
    setPending(false); onBusyChange(false);
  }, [onBusyChange]);

  const request = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(path, { cache: "no-store", ...init });
    const body = await response.json();
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (response.status === 401) {
      onSessionExpired();
      throw new AdminRequestError("Sua sessão expirou. Entre novamente para continuar.");
    }
    if (!response.ok || body.ok === false) throw new AdminRequestError(body.message || "Não foi possível concluir. Tente novamente.");
    return body as T;
  }, [onSessionExpired]);

  const load = useCallback(async () => {
    invalidateRead();
    const version = readVersion.current, controller = new AbortController();
    readFlight.current = controller;
    setLoading(true);
    try {
      const value = await request<SecurityInfo>("/api/admin/security", { signal: controller.signal });
      if (!alive.current || controller.signal.aborted || version !== readVersion.current) return;
      setInfo(value); setLoadError("");
    } catch (error) {
      if (!alive.current || controller.signal.aborted || version !== readVersion.current) return;
      setLoadError(error instanceof AdminRequestError ? error.message : "Não foi possível atualizar os dados de segurança. Tente novamente.");
    } finally {
      if (alive.current && version === readVersion.current) setLoading(false);
      if (readFlight.current === controller) readFlight.current = null;
    }
  }, [request, invalidateRead]);

  useEffect(() => {
    alive.current = true;
    const initial = setTimeout(() => { if (!operation.current) void load(); }, 0);
    return () => {
      alive.current = false; clearTimeout(initial); invalidateRead();
      interruptOperation();
    };
  }, [load, invalidateRead, interruptOperation]);
  useEffect(() => {
    if (!message) return;
    feedback.current?.scrollIntoView({ block: "nearest" });
    if (!pending) feedback.current?.focus({ preventScroll: true });
  }, [message, pending]);

  function begin(recovery: string) {
    if (!alive.current || operation.current) return null;
    invalidateRead(); setLoading(false);
    const attempt: SecurityAttempt = { controller: new AbortController(), version: ++operationVersion.current, recovery };
    operation.current = attempt;
    setPending(true); setMessage(""); onBusyChange(true);
    return attempt;
  }
  function isCurrent(attempt: SecurityAttempt) {
    return alive.current && operation.current === attempt && operationVersion.current === attempt.version && !attempt.controller.signal.aborted;
  }
  function finish(attempt: SecurityAttempt) {
    if (operation.current !== attempt || operationVersion.current !== attempt.version) return;
    operation.current = null;
    cancelCeremony.current = null;
    if (alive.current) { setPending(false); onBusyChange(false); }
  }
  const jsonRequest = (value: unknown, controller: AbortController, method = "POST") => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(value), signal: controller.signal });

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    const currentPassword = String(values.get("currentPassword") ?? ""), newPassword = String(values.get("newPassword") ?? ""), confirmPassword = String(values.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
      const confirm = form.elements.namedItem("confirmPassword") as HTMLInputElement;
      confirm.setCustomValidity("As novas senhas precisam ser iguais."); confirm.reportValidity(); confirm.focus();
      return;
    }
    const attempt = begin("A troca de senha foi interrompida e o resultado não foi confirmado. Confira a última alteração abaixo e verifique o acesso com a nova senha antes de tentar outra troca."); if (!attempt) return;
    const { controller } = attempt;
    setMessage("Alterando sua senha…");
    try {
      const result = await request<Result>("/api/admin/password", jsonRequest({ currentPassword, newPassword, confirmPassword }, controller));
      if (!isCurrent(attempt)) return;
      attempt.recovery = null;
      form.reset();
      setMessage(result.message || "Senha alterada. As outras sessões foram encerradas.");
      await load();
    } catch (error) {
      if (isCurrent(attempt)) setMessage(error instanceof AdminRequestError ? error.message : "Não foi possível confirmar a alteração. Confira o acesso com a nova senha antes de repetir a troca.");
    } finally { finish(attempt); }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, values = new FormData(form);
    const currentPassword = String(values.get("currentPassword") ?? ""), name = String(values.get("name") ?? "").trim();
    const attempt = begin("O cadastro da chave foi interrompido. Confira a lista atualizada abaixo antes de tentar novamente."); if (!attempt) return;
    const { controller } = attempt;
    try {
      const browser = await import("@simplewebauthn/browser");
      if (!isCurrent(attempt)) return;
      if (!browser.browserSupportsWebAuthn()) throw new DOMException("Unsupported", "NotSupportedError");
      const { options } = await request<{ options: PublicKeyCredentialCreationOptionsJSON }>("/api/admin/passkeys/options", jsonRequest({ action: "register", currentPassword, name }, controller));
      if (!isCurrent(attempt)) return;
      cancelCeremony.current = () => browser.WebAuthnAbortService.cancelCeremony();
      setMessage("Confirme o cadastro da chave no seu aparelho.");
      const credential = await browser.startRegistration({ optionsJSON: options });
      if (!isCurrent(attempt)) return;
      const result = await request<Result>("/api/admin/passkeys/verify", jsonRequest({ action: "register", credential }, controller));
      if (!isCurrent(attempt)) return;
      attempt.recovery = null;
      form.reset(); setMessage(result.message || "Chave de acesso cadastrada. Você já pode usá-la para entrar.");
      await load();
    } catch (error) {
      if (isCurrent(attempt)) setMessage(error instanceof AdminRequestError ? error.message : passkeyErrorMessage(error));
    } finally { finish(attempt); }
  }

  async function remove(event: FormEvent<HTMLFormElement>, keyId: string) {
    event.preventDefault();
    const form = event.currentTarget, currentPassword = String(new FormData(form).get("currentPassword") ?? "");
    const attempt = begin("A remoção da chave foi interrompida. Confira a lista atualizada abaixo antes de tentar novamente."); if (!attempt) return;
    const { controller } = attempt;
    setMessage("Removendo a chave de acesso…");
    try {
      const result = await request<Result>("/api/admin/passkeys", jsonRequest({ id: keyId, currentPassword }, controller, "DELETE"));
      if (!isCurrent(attempt)) return;
      attempt.recovery = null;
      form.reset(); setRemoving(null); setMessage(result.message || "Chave de acesso removida. Sua senha continua válida.");
      await load();
    } catch (error) {
      if (isCurrent(attempt)) setMessage(error instanceof AdminRequestError ? error.message : "Não foi possível confirmar a remoção. Atualize a lista antes de tentar novamente.");
    } finally { finish(attempt); }
  }

  return <section className={styles.security} aria-labelledby={`${id}-title`}>
    <div className={styles.securityHeading}><div><h2 id={`${id}-title`}>Segurança do painel</h2><p>Cuide da sua senha e escolha como entrar neste aparelho.</p></div><button type="button" className={styles.subtle} disabled={loading || pending} onClick={() => void load()}>Atualizar segurança</button></div>
    {loadError && <p className={styles.notice} role="alert">{loadError}{info && " Os dados abaixo são da última consulta."}</p>}
    {loading && !info && <p role="status">Conferindo sua segurança…</p>}
    <p ref={feedback} tabIndex={-1} className={styles.securityMessage} role="status" aria-live="polite" aria-atomic="true">{message}</p>
    {info && <>
      <p className={styles.sessionNote}>{info.remember ? "Manter conectado está ativo: sessão de até 30 dias." : "Este acesso tem duração de até 8 horas."} Válido até {dateLabel(info.expiresAt)} (Brasília).</p>
      <div className={styles.securityGrid}>
        <section className={styles.panel} aria-labelledby={`${id}-password`}>
          <h3 id={`${id}-password`}>Alterar senha</h3>
          <p>Sua senha atual continua válida até você concluir a troca. Ao alterar, as outras sessões serão encerradas.</p>
          <p className={styles.securityCaption}>{info.passwordChangedAt ? `Última alteração: ${dateLabel(info.passwordChangedAt)} (Brasília).` : "A senha atual ainda não foi alterada por este painel."}</p>
          <form className={styles.securityForm} onSubmit={changePassword} onChange={event => { const confirm = event.currentTarget.elements.namedItem("confirmPassword") as HTMLInputElement; confirm.setCustomValidity(""); }}>
            <AdminUsername />
            <fieldset disabled={pending}>
              <label htmlFor={`${id}-current`}>Senha atual</label><input id={`${id}-current`} name="currentPassword" type="password" autoComplete="current-password" required minLength={16} maxLength={128} />
              <label htmlFor={`${id}-new`}>Nova senha</label><input id={`${id}-new`} name="newPassword" type="password" autoComplete="new-password" required minLength={16} maxLength={128} aria-describedby={`${id}-password-hint`} />
              <p id={`${id}-password-hint`} className={styles.securityCaption}>Use de 16 a 128 caracteres. Uma frase longa é uma opção fácil de lembrar.</p>
              <label htmlFor={`${id}-confirm`}>Confirmar nova senha</label><input id={`${id}-confirm`} name="confirmPassword" type="password" autoComplete="new-password" required minLength={16} maxLength={128} />
              <button type="submit" className={styles.securityPrimary}>Alterar senha</button>
            </fieldset>
          </form>
        </section>
        <section className={styles.panel} aria-labelledby={`${id}-passkeys`}>
          <h3 id={`${id}-passkeys`}>Face ID e chaves de acesso</h3>
          <p>Seu aparelho oferece Face ID, impressão digital ou código de desbloqueio. Os dados biométricos ficam no aparelho e não chegam ao site.</p>
          {supported ? <form className={styles.securityForm} onSubmit={register}>
            <AdminUsername />
            <fieldset disabled={pending}>
              <label htmlFor={`${id}-device`}>Nome do aparelho</label><input id={`${id}-device`} name="name" type="text" autoComplete="off" defaultValue="Meu aparelho" required maxLength={64} />
              <label htmlFor={`${id}-register-password`}>Senha atual para cadastrar</label><input id={`${id}-register-password`} name="currentPassword" type="password" autoComplete="current-password" required minLength={16} maxLength={128} />
              <button type="submit" className={styles.securityPrimary}>Cadastrar chave de acesso</button>
            </fieldset>
          </form> : <p className={styles.notice}>Este navegador não disponibilizou o cadastro de chaves. Sua senha continua disponível para entrar.</p>}
          <p className={styles.securityCaption}>A chave pode ser guardada e sincronizada pelo gerenciador de senhas do aparelho, conforme seus ajustes.</p>
        </section>
      </div>
      <section className={styles.panel} aria-labelledby={`${id}-saved`}>
        <h3 id={`${id}-saved`}>Suas chaves de acesso</h3>
        {info.passkeys.length === 0 ? <p>Nenhuma chave cadastrada. Cadastre uma acima para entrar com a verificação do aparelho.</p> : <ul className={styles.passkeyList}>{info.passkeys.map(key => <li key={key.id}>
          <div className={styles.passkeyRow}><div><strong>{key.name}</strong><span>Cadastrada em {dateLabel(key.createdAt)} (Brasília).</span></div><button type="button" className={styles.subtle} disabled={pending} aria-expanded={removing === key.id} aria-label={`Remover chave ${key.name}`} onClick={() => { setRemoving(removing === key.id ? null : key.id); setMessage(""); }}>Remover</button></div>
          {removing === key.id && <form className={styles.securityForm} onSubmit={event => void remove(event, key.id)}>
            <AdminUsername />
            <p>Remover “{key.name}” deste painel? Sua senha continuará funcionando.</p>
            <fieldset disabled={pending}>
              <label htmlFor={`${id}-remove-password`}>Senha atual para remover</label><input id={`${id}-remove-password`} name="currentPassword" type="password" autoComplete="current-password" required minLength={16} maxLength={128} />
              <div className={styles.securityActions}><button type="submit" className={styles.securityPrimary}>Remover chave</button><button type="button" onClick={() => setRemoving(null)}>Cancelar</button></div>
            </fieldset>
          </form>}
        </li>)}</ul>}
      </section>
    </>}
  </section>;
}
