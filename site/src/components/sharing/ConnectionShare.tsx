"use client";

import { useState, type ComponentType } from "react";
import { SHARE_IMAGE_VERSION, SITE_NAME, SITE_URL } from "@/lib/site-identity";
import type { ShareFormat, ShareOptions } from "./share-options";
import styles from "./ConnectionShare.module.css";

/** The image editor loads on intent; the direct image/link remain available without JavaScript. */
export function ConnectionShare({ path, label }: { path: string; label: string }) {
  const [Actions, setActions] = useState<ComponentType<{ options: ShareOptions; connection?: boolean }> | null>(null);
  const [failed, setFailed] = useState(false);
  const url = `${SITE_URL}${path}`;
  const options: ShareOptions = {
    reference: label, url, editionName: "Referências cruzadas da Bíblia",
    attribution: undefined, license: undefined, licenseUrl: undefined,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${label} · ${SITE_NAME}\n${url}`)}`,
    image: (format: ShareFormat) => `/og?${new URLSearchParams({ path, format, v: SHARE_IMAGE_VERSION })}`,
    filename: (format: ShareFormat) => `biblia-conectada-${path.slice(1).replaceAll("/", "-")}-${format}.png`,
  };
  return <details className={styles.share} data-connection-share="" onToggle={(event) => {
    if (event.currentTarget.open && !Actions) void import("./VerseShare").then((module) => setActions(() => module.ShareCardActions)).catch(() => setFailed(true));
  }}>
    <summary>Compartilhar esta conexão <span aria-hidden="true">↗</span></summary>
    {Actions ? <Actions options={options} connection /> : <div className={styles.fallback}>
      <p>{failed ? "As opções não carregaram. Você pode abrir a imagem diretamente." : "Leve as duas referências com você."}</p>
      <a href={options.image("story")} target="_blank" rel="noopener noreferrer">Imagem para Stories ↗</a>
      <a href={options.image("post")} target="_blank" rel="noopener noreferrer">Imagem para post ↗</a>
      <a href={options.whatsapp} target="_blank" rel="noopener noreferrer">Enviar link no WhatsApp ↗</a>
    </div>}
  </details>;
}
