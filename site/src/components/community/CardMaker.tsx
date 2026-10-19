"use client";

import { useEffect, useRef, useState } from "react";
import type { CardSpec } from "./card-draw";
import styles from "./community.module.css";

type Made = { url: string; file: File };

// The card is drawn on this device when asked (the drawing code loads then) and shared through the system's share
// sheet, or saved. Nothing is uploaded.
export function CardMaker({
  spec,
  fileName,
  shareText,
  alt,
  title = "Cartão de ligação",
  intro,
}: {
  spec: CardSpec;
  fileName: string;
  shareText: string;
  /** what the image shows, for screen readers */
  alt: string;
  title?: string;
  intro: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  useEffect(
    () => () => {
      if (made) URL.revokeObjectURL(made.url);
    },
    [made],
  );

  async function make() {
    setBusy(true);
    setNote("");
    try {
      const { drawCard } = await import("./card-draw");
      const css = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
      const root = document.documentElement;
      const here = ref.current ?? root;
      const blob = await drawCard(spec, {
        title: css(root, "--font-display") || "Georgia, serif",
        ui: css(root, "--font-grotesk") || "system-ui, sans-serif",
        scripture: css(here, "--font-scripture") || "Georgia, serif",
      });
      setMade({ url: URL.createObjectURL(blob), file: new File([blob], fileName, { type: "image/png" }) });
    } catch {
      setNote("Não deu para desenhar o cartão neste navegador.");
    } finally {
      setBusy(false);
    }
  }

  const canShare = (f: File) => {
    try {
      return typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [f] });
    } catch {
      return false;
    }
  };

  async function share(m: Made) {
    try {
      await navigator.share({ files: [m.file], text: `${shareText}\n${location.href}` });
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setNote("O compartilhamento não abriu. Use “Salvar imagem”.");
    }
  }

  return (
    <section ref={ref} className={styles.card} aria-labelledby="titulo-cartao">
      <h2 id="titulo-cartao" className={styles.h2}>
        {title}
      </h2>
      <p className={styles.lede}>{intro}</p>
      {!made ? (
        <button type="button" className={styles.buttonQuiet} onClick={make} disabled={busy}>
          {busy ? "Desenhando…" : "Fazer o cartão"}
        </button>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a blob drawn on this device, not a site image */}
          <img src={made.url} alt={alt} width={1080} height={1350} className={styles.cardPreview} />
          <div className={styles.actions}>
            {canShare(made.file) && (
              <button type="button" className={styles.button} onClick={() => share(made)}>
                Compartilhar
              </button>
            )}
            <a href={made.url} download={fileName} className={styles.buttonQuiet}>
              Salvar imagem
            </a>
          </div>
        </>
      )}
      <p role="status" className={styles.status}>
        {note || (made ? "Cartão pronto. Ele foi desenhado neste aparelho; nada foi enviado." : "")}
      </p>
    </section>
  );
}
