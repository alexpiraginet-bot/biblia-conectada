"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  level = 2,
  intro,
}: {
  spec: CardSpec;
  fileName: string;
  shareText: string;
  /** what the image shows, for screen readers */
  alt: string;
  title?: string;
  /** heading level of the section in its page */
  level?: 2 | 3;
  intro: React.ReactNode;
}) {
  const id = useId();
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
      // the card is night sky in both themes: its inks are the --sky* tokens
      const blob = await drawCard(
        spec,
        {
          title: css(root, "--font-display") || "Georgia, serif",
          ui: css(root, "--font-ui") || "system-ui, sans-serif",
          scripture: css(here, "--font-reading") || "Georgia, serif",
        },
        { sky: css(here, "--sky"), ink: css(here, "--sky-ink"), ink2: css(here, "--sky-ink-2"), gold: css(here, "--sky-gold") },
      );
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

  const H = level === 2 ? "h2" : "h3";
  return (
    <section ref={ref} className={styles.card} aria-labelledby={`${id}-t`}>
      <H id={`${id}-t`} className="bc-title">
        {title}
      </H>
      <p className={styles.prose}>{intro}</p>
      {!made ? (
        <button type="button" className="bc-button bc-button--secondary" onClick={make} disabled={busy}>
          {busy ? "Desenhando…" : "Fazer o cartão"}
        </button>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a blob drawn on this device, not a site image */}
          <img src={made.url} alt={alt} width={1080} height={1350} className={styles.cardPreview} />
          <div className={styles.actions}>
            {canShare(made.file) && (
              <button type="button" className="bc-button bc-button--primary" onClick={() => share(made)}>
                Compartilhar
              </button>
            )}
            <a href={made.url} download={fileName} className="bc-button bc-button--secondary">
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
