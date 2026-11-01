"use client";

import { useState, type ComponentType } from "react";
import { liturgyDayPath, liturgyShareDate } from "@/lib/liturgy/share";
import { SHARE_IMAGE_VERSION, SITE_NAME, SITE_URL } from "@/lib/site-identity";
import styles from "./LiturgyShare.module.css";
import type { TranslationId } from "@/lib/translations";
import type { ShareFormat } from "@/components/sharing/share-options";

export type LiturgyShareProps = { date: string; references: string[]; edition?: TranslationId };
export function liturgyShareOptions({ date, references, edition = "blivre" }: LiturgyShareProps) {
  const path = liturgyDayPath(date, edition), reference = `Liturgia · ${liturgyShareDate(date)}`, url = `${SITE_URL}${path}`;
  const editionName = edition === "open-nbv" ? "Open NBV · capítulos de contexto" : "Bíblia Livre (BLIVRE)";
  return {
    reference, url, editionName, attribution: undefined, license: undefined, licenseUrl: undefined,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${reference}\n${references.length ? references.join(" · ") : "Leituras temporariamente indisponíveis."}\n${editionName}\n${SITE_NAME}\n${url}`)}`,
    image: (format: ShareFormat) => `/og?${new URLSearchParams({ path, format, v: SHARE_IMAGE_VERSION })}`,
    filename: (format: ShareFormat) => `biblia-conectada-liturgia-${date}-${edition}-${format === "story" ? "stories" : format === "post" ? "post" : "capa"}.png`,
  };
}

export function LiturgyShare(props: LiturgyShareProps) {
  const [Actions, setActions] = useState<ComponentType<LiturgyShareProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const options = liturgyShareOptions(props);
  return <details className={styles.share} data-liturgy-share onToggle={(event) => {
    if (event.currentTarget.open && !Actions) void import("./LiturgyShareActions").then((module) => setActions(() => module.default)).catch(() => setFailed(true));
  }}>
    <summary>Compartilhar este dia <span aria-hidden="true">↗</span></summary>
    <div className={styles.fallback}><a href={`/qr?${new URLSearchParams({ path: liturgyDayPath(props.date, props.edition) })}`}>QR Code deste dia ↗</a></div>
    {Actions ? <Actions {...props} /> : <div className={styles.fallback}>
      <p>{failed ? "As opções de imagem não carregaram. Os links abaixo continuam disponíveis." : "O link sempre abre a data escolhida."}</p>
      <a href={options.whatsapp} target="_blank" rel="noopener noreferrer">Enviar no WhatsApp ↗</a>
      <a href={options.image("story")} target="_blank" rel="noopener noreferrer">Abrir imagem para Stories ↗</a>
      <a href={options.url}>Link deste dia ↗</a>
    </div>}
  </details>;
}
