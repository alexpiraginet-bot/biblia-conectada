"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useId, useState } from "react";
import { contentUrl, installationUrl, safeContentPath } from "@/lib/app-links";
import { SITE_URL } from "@/lib/site-identity";
import styles from "./qr.module.css";

export function QRPage() {
  const inputId = useId();
  const params = useSearchParams();
  const raw = params.get("path") ?? "/";
  const path = params.getAll("path").length > 1 ? null : safeContentPath(raw);
  const url = path === null ? null : contentUrl(path);
  return <div className={styles.page}>
    <header><p className={styles.eyebrow}>Uma leitura pode chegar mais longe</p><h1>Compartilhe<br /><em>um novo caminho.</em></h1><p>Aponte a câmera e abra direto na página. Quem recebe pode continuar lendo e ver como levar a Bíblia para a tela inicial.</p></header>
    <form action="/qr" method="get" className={styles.form}>
      <label htmlFor={inputId}>Link da página</label><div><input id={inputId} name="path" type="text" key={raw} defaultValue={path === null ? "" : `${SITE_URL}${path}`} maxLength={1200} placeholder={`${SITE_URL}/liturgia`} required /><button className="bc-button bc-button--primary" type="submit">Gerar QR</button></div>
    </form>
    {url && path !== null ? <QRResult key={url} path={path} url={url} /> : <p role="alert" className={styles.error}>Esse link não pode ser compartilhado aqui. Use uma página pública de bibliaconectada.company.</p>}
    <section className={styles.choices} aria-labelledby="qr-liturgy"><h2 id="qr-liturgy">Uma liturgia, dois caminhos.</h2>
      <Link href="/qr?path=%2Fliturgia" prefetch={false}><strong>Sempre as leituras de hoje <span aria-hidden="true">↗</span></strong><span>Ideal para um QR impresso: a leitura acompanha o dia de quem abre.</span></Link>
      <p>Para manter uma data, abra o dia na liturgia e escolha <strong>Compartilhar este dia → QR Code deste dia</strong>.</p>
    </section>
  </div>;
}

function QRResult({ path, url }: { path: string; url: string }) {
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState("");
  const image = `/api/qr?${new URLSearchParams({ path })}`;
  return <section className={styles.result} aria-label="QR Code e opções de compartilhamento">
    <div className={styles.code}>
      {/* This is a generated PNG endpoint, not a remote photograph for the image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!failed && <img src={image} width={320} height={320} alt="QR Code para abrir esta página da Bíblia Conectada" onError={() => setFailed(true)} />}
      {failed && <p role="alert">A imagem não carregou. <button type="button" onClick={() => setFailed(false)}>Tentar novamente</button></p>}
      <p>Bíblia Conectada</p><span>Aponte a câmera. Continue a leitura.</span>
    </div>
    <div className={styles.details}>
      <h2>{path === "/liturgia" ? "As leituras de cada dia." : path.startsWith("/dia/") ? "Este dia, sempre no link." : "A mesma página. Outro encontro."}</h2>
      <a className={styles.destination} href={url}>{url}</a>
      <div className={styles.actions}>
        <a className="bc-button bc-button--primary" href={`${image}&download=1`} download>Baixar QR em PNG</a>
        <a className="bc-button bc-button--secondary" href={`${image}&format=svg&download=1`} download>SVG para impressão</a>
        <button className="bc-button bc-button--ghost" type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied("Link copiado."); } catch { setCopied("Selecione e copie o link acima."); } }}>Copiar link</button>
      </div>
      <p className={styles.status} role="status">{copied}</p>
      <p>O QR abre o conteúdo no site. Quando os apps nativos estiverem publicados e vinculados ao domínio, este mesmo link poderá abrir a página dentro do app instalado.</p>
      <a href={installationUrl(path)}>Ver opções para instalar <span aria-hidden="true">↗</span></a>
    </div>
  </section>;
}
