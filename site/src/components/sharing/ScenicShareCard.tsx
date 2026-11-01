import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ShareCard } from "@/lib/share-card";
import { SITE_NAME, SITE_URL } from "@/lib/site-identity";
import { getTranslation } from "@/lib/translations";

export type ScenicFormat = "story" | "post" | "landscape";
const images = new Map<string, Promise<string>>();
export function shareScenery(card: ShareCard) {
  const name = card.kind === "connection" ? "share-tunnel-v2.jpg" : "share-valley-v2.jpg";
  let value = images.get(name);
  if (!value) {
    value = readFile(join(process.cwd(), "public/home", name)).then((file) => `data:image/jpeg;base64,${file.toString("base64")}`);
    images.set(name, value);
  }
  return value;
}

function Stamp() {
  return <svg width="54" height="42" viewBox="60 100 392 300" fill="none">
    <path d="M104 328a152 152 0 0 1 304 0M174 328a82 82 0 0 1 164 0" stroke="#e5c48c" strokeWidth="18" strokeLinecap="round" />
    <path d="M104 328h304" stroke="#e5c48c" strokeWidth="5" opacity=".5" />
    <path d="m256 142 7 22 22 7-22 7-7 22-7-22-22-7 22-7z" fill="#f6e1ad" />
  </svg>;
}

/** Native typography over decorative art: quotations come only from the validated source card. */
export function ScenicShareCard({ card, format, background }: { card: ShareCard; format: ScenicFormat; background: string }) {
  const story = format === "story", landscape = format === "landscape";
  const connection = card.kind === "connection";
  const quoted = !!card.source && !card.contextOnly;
  const attribution = card.attribution ?? (quoted && card.source?.startsWith("Bíblia Livre") ? getTranslation("blivre")!.credit : undefined);
  const long = card.description.length > 350;
  const titleSize = landscape ? 58 : card.title.length > 40 ? 64 : 84;
  const textSize = landscape ? 30 : long ? (story ? 43 : 35) : card.description.length > 180 ? (story ? 58 : 46) : (story ? 72 : 58);
  const readings = card.readings?.slice(0, 4) ?? [];
  return <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", flexDirection: "column", background: "#e6e1d4", color: "#420d20", fontFamily: "Figtree", fontWeight: 500 }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={background} alt="" width={1024} height={1536} style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", objectPosition: connection ? "70% 44%" : "center" }} />
    <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(180deg, rgba(255,252,246,.2), transparent 75%, rgba(47,15,30,.24))" }} />
    <div style={{ position: "absolute", top: story ? 220 : landscape ? 48 : 92, left: landscape ? 54 : 72, right: landscape ? 54 : 72, display: "flex", flexDirection: "column", padding: landscape ? "28px 40px" : "48px 52px", border: "1px solid rgba(255,255,255,.85)", borderRadius: landscape ? 24 : 32, background: "rgba(255,252,246,.84)", boxShadow: "0 12px 50px rgba(71,33,32,.08)" }}>
      <div style={{ display: "flex", fontSize: landscape ? 16 : 22, letterSpacing: 3, color: "#71544c", marginBottom: landscape ? 12 : 24 }}>{connection ? "UMA CONEXÃO. UM NOVO OLHAR." : card.kind === "liturgy" ? "A PALAVRA DE CADA DIA" : "UMA PALAVRA PARA LEVAR COM VOCÊ"}</div>
      <div style={{ display: "flex", fontFamily: "Newsreader", fontWeight: 400, fontSize: titleSize, lineHeight: 1.08, letterSpacing: -1.5, whiteSpace: "pre-line" }}>{card.title}</div>
      <div style={{ display: "flex", marginTop: landscape ? 17 : 32, fontFamily: quoted ? "Newsreader" : "Figtree", fontWeight: quoted ? 400 : 500, fontSize: card.kind === "liturgy" ? (landscape ? 24 : story ? 43 : 36) : connection ? (landscape ? 27 : 36) : textSize, lineHeight: 1.32, color: "#4e2935" }}>{quoted ? `“${card.description}”` : card.description}</div>
      {card.source && <div style={{ display: "flex", fontSize: landscape ? 17 : 23, lineHeight: 1.4, color: "#664c50", marginTop: landscape ? 12 : 25 }}>{card.source}{quoted && card.description.endsWith("…") ? " · Trecho" : ""}</div>}
      {!landscape && readings.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24, paddingTop: 20, borderTop: "1px solid #bea58155" }}>{readings.map((reading, i) => <div key={i} style={{ display: "flex", gap: 16, fontSize: story ? 25 : 23, lineHeight: 1.3 }}><span style={{ display: "flex", width: 190, color: "#664c50" }}>{reading.label}</span><span style={{ display: "flex", flex: 1 }}>{reading.reference}</span></div>)}</div>}
      {landscape && readings.length > 0 && <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: 16, color: "#664c50" }}>{readings.map((reading, i) => <span key={i}>{reading.reference}</span>)}</div>}
      {attribution && <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: landscape ? 11 : 17, lineHeight: 1.35, color: "#664c50", marginTop: landscape ? 12 : 20 }}><div style={{ display: "flex" }}>{attribution}</div>{card.license && <div style={{ display: "flex" }}>{card.license}</div>}</div>}
    </div>
    <div style={{ position: "absolute", left: landscape ? 54 : 72, right: landscape ? 54 : 72, bottom: story ? 240 : landscape ? 35 : 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 15 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 26px", border: "1px solid #e4c48a88", borderRadius: 28, background: "rgba(67,13,33,.94)", color: "#f9e9c3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}><Stamp /><span style={{ fontSize: landscape ? 25 : 30 }}>{SITE_NAME}</span></div>
        <div style={{ display: "flex", fontSize: landscape ? 16 : 19, color: "#ead6b8" }}>{new URL(SITE_URL).hostname.replace(/^www\./, "")}</div>
      </div>
    </div>
  </div>;
}
