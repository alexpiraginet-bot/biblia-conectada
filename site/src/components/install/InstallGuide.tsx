"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArcMark } from "../header/ArcMark";
import { dismissInstall, installDismissed } from "./policy";
import styles from "./install.module.css";
import { INSTALL_URL } from "@/lib/site-identity";

function InstallSteps({ onClose }: { onClose: (remember?: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  useEffect(() => {
    const box = dialog.current!;
    const body = document.body, root = document.documentElement;
    const x = window.scrollX, y = window.scrollY;
    const href = window.location.href;
    const keys = ["position", "top", "left", "width"] as const;
    const before = keys.map((key) => body.style[key]);
    const overflow = root.style.overflow;
    // Fixed body also keeps Safari from moving the reading behind the modal.
    Object.assign(body.style, { position: "fixed", top: `${-y}px`, left: `${-x}px`, width: `${root.clientWidth}px` });
    root.style.overflow = "hidden";
    box.showModal();
    return () => {
      if (box.open) box.close();
      keys.forEach((key, index) => { body.style[key] = before[index]; });
      root.style.overflow = overflow;
      if (window.location.href === href) window.scrollTo({ left: x, top: y, behavior: "instant" });
    };
  }, []);
  const close = (remember = false) => { dialog.current?.close(); onClose(remember); };
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={title}
    onCancel={(event) => { event.preventDefault(); close(); }}>
    <header className={styles.header}>
      <div><p>No iPhone e no iPad</p><h2 id={title}>A Bíblia, sempre por perto.</h2></div>
      <button type="button" className={styles.close} aria-label="Fechar instruções" onClick={() => close()}>×</button>
    </header>
    <p className={styles.intro}>Abra nossa página de instalação no <strong>Safari</strong>. Ela mostra o ícone antes de adicionar o app.</p>
    <a className={styles.installLink} href={INSTALL_URL}>Abrir página de instalação <span aria-hidden="true">→</span></a>
    <ol className={styles.steps}>
      <li><span aria-hidden="true">1</span><div>Toque em <strong>Compartilhar</strong> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3" /></svg><small>O quadrado com a seta para cima; pode estar no menu da página.</small></div></li>
      <li><span aria-hidden="true">2</span><div>Escolha <strong>Adicionar à Tela de Início</strong>.<small>Role as opções de compartilhamento para encontrar.</small></div></li>
      <li><span aria-hidden="true">3</span><div>Confirme em <strong>Adicionar</strong>.<small>Se aparecer, mantenha <strong>Abrir como App da Web</strong> ativado.</small></div></li>
    </ol>
    <p className={styles.tip}>Está no Instagram ou em outro app? Abra o link no Safari primeiro.</p>
    <button type="button" className={styles.done} onClick={() => close(true)}>Entendi</button>
  </dialog>;
}

export default function InstallGuide() {
  const [dismissed, setDismissed] = useState(installDismissed);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  if (dismissed) return null;
  return <>
    <aside className={styles.notice} aria-label="Adicionar à Tela de Início">
      <button ref={opener} type="button" className={styles.open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className={styles.mark}><ArcMark className={styles.logo} /></span>
        <span><strong>Bíblia na Tela de Início</strong><small>Ver passos <span aria-hidden="true">→</span></small></span>
      </button>
      <button type="button" className={styles.close} aria-label="Agora não; dispensar aviso" onClick={() => { dismissInstall(); setDismissed(true); }}>×</button>
    </aside>
    {open && <InstallSteps onClose={(remember) => {
      setOpen(false);
      if (remember) { dismissInstall(); setDismissed(true); }
      else requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
    }} />}
  </>;
}
