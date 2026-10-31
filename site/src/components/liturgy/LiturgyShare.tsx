"use client";

import { useState, type ComponentType } from "react";
import { liturgyDayPath, liturgyShareDate } from "@/lib/liturgy/share";
import { SHARE_IMAGE_VERSION, SITE_NAME, SITE_URL } from "@/lib/site-identity";
import styles from "./LiturgyShare.module.css";

export type LiturgyShareProps = { date: string; references: string[] };
export function liturgyShareOptions({ date, references }: LiturgyShareProps) {
  const path = liturgyDayPath(date), reference = `Liturgia · ${liturgyShareDate(date)}`, url = `${SITE_URL}${path}`;
  return {
    reference, url, editionName: "Bíblia Livre (BLIVRE)", attribution: undefined, license: undefined, licenseUrl: undefined,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${reference}\n${references.length ? references.join(" · ") : "Leituras temporariamente indisponíveis."}\n${SITE_NAME}\n${url}`)}`,
    image: (format: "landscape" | "story") => `/og?${new URLSearchParams({ path, format, v: SHARE_IMAGE_VERSION })}`,
    filename: (format: "landscape" | "story") => `biblia-conectada-liturgia-${date}-${format === "story" ? "stories" : "capa"}.png`,
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
    {Actions ? <Actions {...props} /> : <div className={styles.fallback}>
      <p>{failed ? "As opções de imagem não carregaram. Os links abaixo continuam disponíveis." : "O link sempre abre a data escolhida."}</p>
      <a href={options.whatsapp} target="_blank" rel="noopener noreferrer">Enviar no WhatsApp ↗</a>
      <a href={options.image("story")} target="_blank" rel="noopener noreferrer">Abrir imagem para Stories ↗</a>
      <a href={options.url}>Link deste dia ↗</a>
    </div>}
  </details>;
}
