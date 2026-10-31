"use client";

import { useEffect, useId, useRef, useState } from "react";
import { canShareImage, prepareShareImage, verseShareOptions, type ShareFormat, type ShareOptions } from "./share-options";
import styles from "./VerseShare.module.css";

type Prepared = { file: File; url: string; native: boolean };

export function VerseShare({ path }: { path: string }) {
  return <ShareCardActions options={verseShareOptions(path)} />;
}

export function ShareCardActions({ options, daily = false }: { options: ShareOptions; daily?: boolean }) {
  const id = useId();
  const [format, setFormat] = useState<ShareFormat>("story");
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [copyFallback, setCopyFallback] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const imageUrl = useRef<string | null>(null);
  useEffect(() => () => { abort.current?.abort(); if (imageUrl.current) URL.revokeObjectURL(imageUrl.current); }, []);

  function choose(next: ShareFormat) {
    if (next === format) return;
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    imageUrl.current = null;
    setPrepared(null); setExpanded(false); setMessage(""); setFormat(next);
  }
  async function prepare() {
    if (busy) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true); setMessage("Preparando sua imagem…");
    try {
      const file = await prepareShareImage(options, format, controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(file);
      if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
      imageUrl.current = url;
      setPrepared({ file, url, native: canShareImage(file) });
      setMessage("Imagem pronta. Escolha como levar com você.");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMessage("Não foi possível preparar a imagem. Tente novamente.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function share() {
    if (!prepared || sharing) return;
    // No await before navigator.share: this second, explicit tap retains user activation on Safari.
    const failed = (error: Error) => {
      if (error.name !== "AbortError") setMessage("Não foi possível compartilhar. Você pode baixar a imagem abaixo.");
    };
    try {
      const result = navigator.share({ files: [prepared.file] });
      setSharing(true);
      void result.catch(failed).finally(() => setSharing(false));
    } catch (error) { failed(error as Error); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(options.url); setMessage(daily ? "Link deste dia copiado." : "Link do versículo copiado."); setCopyFallback(false); }
    catch { setCopyFallback(true); setMessage("Selecione o link abaixo para copiar."); }
  }
  return <div className={styles.content}>
    <p className={styles.intro}>{daily ? "Leve as leituras deste dia para alguém. O link preserva a data escolhida." : "Uma palavra pode encontrar alguém no momento certo."}</p>
    <div className={styles.links}>
      <a className={styles.primary} href={options.whatsapp} target="_blank" rel="noopener noreferrer">Enviar link no WhatsApp <span aria-hidden="true">↗</span></a>
      <button type="button" className={styles.secondary} onClick={copy}>Copiar link</button>
    </div>
    <p className={styles.hint}>{daily ? "A capa mostra a data e as referências das leituras. O trecho, quando disponível, é da Bíblia Livre." : options.attribution ? `O link mantém esta edição: ${options.editionName}.` : "O link abre este versículo, com uma capa na prévia."}</p>
    {copyFallback && <input className={styles.url} aria-label={daily ? "Link deste dia para copiar" : "Link do versículo para copiar"} readOnly value={options.url} onFocus={(event) => event.currentTarget.select()} />}

    <section className={styles.images} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`}>Compartilhe em imagem</h3>
      <fieldset className={styles.formats} disabled={busy || sharing}>
        <legend className="visually-hidden">Formato da imagem</legend>
        {(["story", "landscape"] as const).map((value) => <label key={value} data-selected={format === value || undefined}>
          <input type="radio" name={`${id}-format`} value={value} checked={format === value} onChange={() => choose(value)} />
          <span>{value === "story" ? "Stories" : "Capa horizontal"}</span>
          <small>{value === "story" ? "1080 × 1920" : "1200 × 630"}</small>
        </label>)}
      </fieldset>
      {prepared ? <><button type="button" className={styles.previewToggle} aria-expanded={expanded}
        aria-controls={`${id}-preview`} onClick={() => setExpanded((value) => !value)}>
        {expanded ? "Reduzir prévia" : "Ampliar prévia"}<span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button><figure id={`${id}-preview`} className={styles.preview} data-format={format} data-expanded={expanded || undefined}>
        {/* A local blob is already the final PNG; Next Image would add no benefit here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={prepared.url} alt={`${format === "story" ? "Story" : "Capa"} de ${options.reference}${daily ? "" : `, com texto de ${options.editionName}`}`}
          width={format === "story" ? 1080 : 1200} height={format === "story" ? 1920 : 630} />
      </figure></> : <button type="button" className={styles.prepare} disabled={busy} onClick={prepare}>
        {busy ? "Preparando imagem…" : "Preparar imagem"}<span aria-hidden="true">↓</span>
      </button>}
      {prepared && <div className={styles.ready}>
        {prepared.native && <button type="button" className={styles.primary} disabled={sharing} onClick={share}>{sharing ? "Compartilhando…" : "Compartilhar imagem"}<span aria-hidden="true">↗</span></button>}
        <a className={prepared.native ? styles.secondary : styles.primary} href={prepared.url} download={prepared.file.name}>Baixar imagem <span aria-hidden="true">↓</span></a>
      </div>}
      <p className={styles.hint}>{format === "story" ? "Escolha o Instagram no menu do aparelho, quando disponível. Ou baixe a imagem e adicione ao seu Story." : "A mesma capa do link, pronta para enviar ou guardar. Trechos longos aparecem com reticências."}</p>
    </section>
    {options.attribution && <p className={styles.hint}>
      {options.attribution}{" "}<a href={options.licenseUrl} target="_blank" rel="noopener noreferrer">{options.license}</a>
    </p>}
    <p className={styles.message} role="status" aria-live="polite">{message}</p>
  </div>;
}
