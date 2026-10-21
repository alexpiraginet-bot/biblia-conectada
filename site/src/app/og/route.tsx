import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveShareCard, type ShareCard } from "@/lib/share-card";
import { SITE_NAME } from "@/lib/site-identity";

// WOFF, rather than the site's WOFF2, is supported by ImageResponse/Satori. Both are
// deterministic conversions of the existing OFL fonts, read once on the server.
const fonts = Promise.all([
  readFile(join(process.cwd(), "src/fonts/og/Figtree-Medium.woff")),
  readFile(join(process.cwd(), "src/fonts/og/Newsreader-Display.woff")),
]);

function BrandMark() {
  return <svg width="52" height="52" viewBox="60 100 392 300" fill="none">
    <path d="M104 328a152 152 0 0 1 304 0" stroke="#e5c48c" strokeWidth="22" strokeLinecap="round" />
    <path d="M174 328a82 82 0 0 1 164 0" stroke="#e5c48c" strokeWidth="18" strokeLinecap="round" />
    <path d="M104 328h304" stroke="#e5c48c" strokeWidth="6" opacity=".45" />
    <circle cx="104" cy="328" r="16" fill="#fff0c8" /><circle cx="408" cy="328" r="16" fill="#e5c48c" />
    <path d="m256 142 7 22 22 7-22 7-7 22-7-22-22-7 22-7z" fill="#fff5e6" />
  </svg>;
}

/** An abstract brand motif, not a fabricated visualization of passage data. */
function ConnectionMotif() {
  return <svg width="550" height="565" viewBox="0 0 550 565" style={{ position: "absolute", right: -98, top: 8 }} fill="none">
    <circle cx="330" cy="278" r="209" stroke="#e5c48c" strokeWidth="1" opacity=".12" />
    <circle cx="330" cy="278" r="150" stroke="#e5c48c" strokeWidth="1" opacity=".1" />
    <path d="M84 436C116 41 416 27 494 362M84 436C172 179 426 82 494 362M84 436C222 292 414 223 494 362M84 436C212 484 392 515 494 362" stroke="#e5c48c" strokeWidth="1.8" opacity=".23" />
    <path d="M181 123C248 357 392 460 494 362M181 123C203 35 343 44 391 86" stroke="#e5c48c" strokeWidth="1" opacity=".15" />
    <path d="m391 72 4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#e5c48c" opacity=".65" />
    <circle cx="84" cy="436" r="5" fill="#e5c48c" opacity=".45" />
    <circle cx="181" cy="123" r="4" fill="#e5c48c" opacity=".45" />
    <circle cx="494" cy="362" r="6" fill="#e5c48c" opacity=".65" />
    <circle cx="330" cy="487" r="3" fill="#e5c48c" opacity=".4" />
    <circle cx="452" cy="156" r="2" fill="#fff5e6" opacity=".5" />
  </svg>;
}

function Card({ card }: { card: ShareCard }) {
  const longestLine = Math.max(...card.title.split("\n").map((line) => line.length));
  const titleSize = longestLine > 34 ? 59 : longestLine > 26 ? 66 : 78;
  return <div style={{ width: "100%", height: "100%", display: "flex", padding: 24, background: "#211018", color: "#fff5e6", fontFamily: "Figtree", fontWeight: 500 }}>
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", padding: "32px 44px 30px", border: "1px solid #5d443b", borderRadius: 20, background: "#101014" }}>
      <ConnectionMotif />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><BrandMark /><span style={{ fontSize: 29, letterSpacing: -.7 }}>{SITE_NAME}</span></div>
        <span style={{ fontSize: 16, letterSpacing: 3, color: "#e5c48c" }}>LEIA · EXPLORE · CONECTE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, position: "relative", paddingTop: 19, paddingBottom: 18 }}>
        <div style={{ display: "flex", color: "#e5c48c", fontSize: 17, letterSpacing: 3, marginBottom: 15 }}>{card.eyebrow}</div>
        <div style={{ display: "flex", maxWidth: 970, fontFamily: "Newsreader", fontWeight: 400, fontSize: titleSize, lineHeight: 1.04, letterSpacing: -1.7, whiteSpace: "pre-line" }}>{card.title}</div>
        <div style={{ display: "flex", maxWidth: card.kind === "passage" ? 925 : 855, marginTop: 22, fontSize: card.kind === "passage" ? 32 : 30, lineHeight: 1.35, color: "#e0d5cc" }}>{card.source ? `“${card.description}”` : card.description}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", paddingTop: 15, borderTop: "1px solid #413336", minHeight: 42 }}>
        <span style={{ fontSize: 19, color: "#b8aaa6" }}>{card.source ?? "Uma história. Tudo se conecta."}</span>
        {!card.attribution && <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#e5c48c", fontSize: 19 }}><span>Abrir e descobrir</span><svg width="23" height="20" viewBox="0 0 24 20"><path d="M2 10h18m-7-7 7 7-7 7" stroke="#e5c48c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg></div>}
      </div>
      {card.attribution && <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative", marginTop: 7, fontSize: 15, lineHeight: 1.25, color: "#b8aaa6" }}>
        <div style={{ display: "flex" }}>{card.attribution}</div>
        <div style={{ display: "flex" }}>{card.license}</div>
      </div>}
    </div>
  </div>;
}

/** The whole reading area stays clear of the top/bottom controls in a 9:16 Story. */
function StoryCard({ card }: { card: ShareCard }) {
  const longestLine = Math.max(...card.title.split("\n").map((line) => line.length));
  const titleSize = longestLine > 30 ? 64 : longestLine > 22 ? 76 : 92;
  const textSize = card.description.length > 350 ? 46 : card.description.length > 240 ? 52 : card.description.length > 140 ? 62 : 76;
  const shortened = card.source && card.description.endsWith("…");
  return <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#211018", color: "#fff5e6", fontFamily: "Figtree", fontWeight: 500 }}>
    <div style={{ display: "flex", position: "absolute", left: 32, top: 32, width: 1016, height: 1856, border: "1px solid #5d443b", borderRadius: 32, background: "#101014", overflow: "hidden" }}>
      <ConnectionMotif />
      <svg width="840" height="380" viewBox="0 0 840 380" style={{ position: "absolute", bottom: 0, left: 0 }} fill="none">
        <path d="M-80 330C100 -60 680 -70 920 330M-80 330C180 30 620 30 920 330M-80 330C250 130 550 130 920 330" stroke="#e5c48c" strokeWidth="1.5" opacity=".16" />
        <circle cx="132" cy="161" r="4" fill="#e5c48c" opacity=".5" />
      </svg>
    </div>
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", padding: "252px 88px 260px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0, paddingBottom: 34, borderBottom: "1px solid #5d443b" }}>
        <BrandMark /><span style={{ fontSize: 40, letterSpacing: -1 }}>{SITE_NAME}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1, padding: "40px 0" }}>
        <div style={{ display: "flex", color: "#e5c48c", fontSize: 23, lineHeight: 1.4, letterSpacing: 3, marginBottom: 28 }}>{card.eyebrow}</div>
        <div style={{ display: "flex", fontFamily: "Newsreader", fontWeight: 400, fontSize: titleSize, lineHeight: 1.08, letterSpacing: -1.5, whiteSpace: "pre-line" }}>{card.title}</div>
        <div style={{ display: "flex", marginTop: 42, fontFamily: "Newsreader", fontWeight: 400, fontSize: textSize, lineHeight: 1.33, color: "#e0d5cc" }}>{card.source ? `“${card.description}”` : card.description}</div>
        {shortened && <div style={{ display: "flex", marginTop: 24, fontSize: 23, color: "#b8aaa6" }}>Trecho · Leia o versículo completo no site.</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, gap: 18, paddingTop: 28, borderTop: "1px solid #5d443b" }}>
        <div style={{ display: "flex", fontSize: 24, lineHeight: 1.4, color: "#b8aaa6" }}>{card.source ?? "Uma história. Tudo se conecta."}</div>
        {card.attribution && <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 19, lineHeight: 1.35, color: "#b8aaa6" }}>
          <div style={{ display: "flex" }}>{card.attribution}</div>
          <div style={{ display: "flex" }}>{card.license}</div>
        </div>}
        <div style={{ display: "flex", fontSize: 26, color: "#e5c48c" }}>Leia. Descubra. Conecte.</div>
      </div>
    </div>
  </div>;
}

/** Server-only PNG: no remote images, arbitrary text, browser canvas or user secrets. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "landscape";
  if (url.searchParams.getAll("format").length > 1 || (format !== "landscape" && format !== "story")) return new Response("Invalid share format", { status: 400 });
  if (url.searchParams.getAll("path").length > 1) return new Response("Invalid share path", { status: 400 });
  const card = await resolveShareCard(url.searchParams.get("path") ?? "/", format === "story" ? 500 : 205);
  if (!card) return new Response("Share page not found", { status: 404 });
  const [figtree, newsreader] = await fonts;
  return new ImageResponse(format === "story" ? <StoryCard card={card} /> : <Card card={card} />, {
    width: format === "story" ? 1080 : 1200, height: format === "story" ? 1920 : 630,
    fonts: [
      { name: "Figtree", data: figtree, weight: 500, style: "normal" },
      { name: "Newsreader", data: newsreader, weight: 400, style: "normal" },
    ],
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
