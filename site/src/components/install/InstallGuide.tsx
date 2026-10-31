"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArcMark } from "../header/ArcMark";
import { dismissInstall, installDismissed } from "./policy";
import styles from "./install.module.css";
import { installationUrl } from "@/lib/app-links";
import type { NativeAppLinks } from "@/lib/native-apps";
import { installPlatform } from "./device";

function InstallSteps({ destination, platform, store, onClose }: {
  destination: string;
  platform: "ios" | "android";
  store: string | null;
  onClose: (remember?: boolean) => void;
}) {
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
      <div><p>{platform === "ios" ? "No iPhone e no iPad" : "No Android"}</p><h2 id={title}>A Bíblia, sempre por perto.</h2></div>
      <button type="button" className={styles.close} aria-label="Fechar instruções" onClick={() => close()}>×</button>
    </header>
    {store ? <>
      <p className={styles.intro}>Leve a Bíblia Conectada com você. Depois de instalar, volte a esta página para continuar de onde estava.</p>
      <a className={styles.installLink} href={store}>Instalar pela {platform === "ios" ? "App Store" : "Google Play"} <span aria-hidden="true">→</span></a>
      <a className={styles.webOption} href={installationUrl(destination)}>Ver também como adicionar o site à Tela de Início</a>
    </> : <>
    <p className={styles.intro}>Adicione o site à sua Tela de Início e mantenha a Bíblia por perto.</p>
    <a className={styles.installLink} href={installationUrl(destination)}>Ver instruções de instalação <span aria-hidden="true">→</span></a>
    {platform === "ios" ? <ol className={styles.steps}>
      <li><span aria-hidden="true">1</span><div>Toque em <strong>Compartilhar</strong> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3" /></svg><small>O quadrado com a seta para cima; pode estar no menu da página.</small></div></li>
      <li><span aria-hidden="true">2</span><div>Escolha <strong>Adicionar à Tela de Início</strong>.<small>Role as opções de compartilhamento para encontrar.</small></div></li>
      <li><span aria-hidden="true">3</span><div>Confirme em <strong>Adicionar</strong>.<small>Se aparecer, mantenha <strong>Abrir como App da Web</strong> ativado.</small></div></li>
    </ol> : <ol className={styles.steps}>
      <li><span aria-hidden="true">1</span><div>Abra o site no <strong>Chrome</strong>.<small>Se estiver no Instagram, use o menu para abrir no navegador.</small></div></li>
      <li><span aria-hidden="true">2</span><div>No menu, escolha <strong>Adicionar à tela inicial</strong>.<small>Em alguns aparelhos, a opção se chama <strong>Instalar app</strong>.</small></div></li>
      <li><span aria-hidden="true">3</span><div>Confirme em <strong>Adicionar</strong> ou <strong>Instalar</strong>.<small>O nome é Bíblia Conectada; o ícone é dourado sobre bordô.</small></div></li>
    </ol>}
    </>}
    <p className={styles.tip}>{platform === "ios" ? "Está no Instagram ou em outro app? Abra o link no Safari primeiro." : "As opções podem variar conforme o navegador e a versão do Android."} Você pode continuar lendo sem instalar.</p>
    <button type="button" className={styles.done} onClick={() => close(true)}>Continuar lendo</button>
  </dialog>;
}

export default function InstallGuide() {
  const [dismissed, setDismissed] = useState(installDismissed);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("/");
  const [apps, setApps] = useState<NativeAppLinks>({ ios: null, android: null });
  const [platform] = useState(() => installPlatform(navigator) ?? "ios");
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (dismissed) return;
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 8000);
    void fetch("/api/app-install", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const data = await response.json() as NativeAppLinks;
      if (active) setApps({ ios: typeof data.ios === "string" ? data.ios : null, android: typeof data.android === "string" ? data.android : null });
    }).catch(() => {}).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [dismissed]);
  if (dismissed) return null;
  const store = apps[platform];
  return <>
    <aside className={styles.notice} aria-label="Bíblia Conectada no celular">
      <button ref={opener} type="button" className={styles.open} aria-haspopup="dialog" onClick={() => {
        setDestination(window.location.pathname + window.location.search + window.location.hash);
        setOpen(true);
      }}>
        <span className={styles.mark}><ArcMark className={styles.logo} /></span>
        <span><strong>{store ? "Leve a Bíblia com você" : "Bíblia na Tela de Início"}</strong><small>{store ? "Ver como instalar" : "Ver passos"} <span aria-hidden="true">→</span></small></span>
      </button>
      <button type="button" className={styles.close} aria-label="Agora não; dispensar aviso" onClick={() => { dismissInstall(); setDismissed(true); }}>×</button>
    </aside>
    {open && <InstallSteps destination={destination} platform={platform} store={store} onClose={(remember) => {
      setOpen(false);
      if (remember) { dismissInstall(); setDismissed(true); }
      else requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
    }} />}
  </>;
}
