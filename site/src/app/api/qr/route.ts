import QRCode from "qrcode";
import { contentUrl } from "@/lib/app-links";

/** Encode locally on the server; never send a reading URL to a third-party QR service. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const format = params.get("format") ?? "png";
  const target = contentUrl(params.get("path") ?? "/");
  if (!target || params.getAll("path").length > 1 || params.getAll("format").length > 1 || !["png", "svg"].includes(format)) {
    return new Response("Link inválido. Escolha uma página pública da Bíblia Conectada.", { status: 400 });
  }
  const options = { errorCorrectionLevel: "M" as const, margin: 4, width: 1024, color: { dark: "#211018ff", light: "#ffffffff" } };
  const image = format === "svg" ? await QRCode.toString(target, { ...options, type: "svg" }) : new Uint8Array(await QRCode.toBuffer(target, options));
  return new Response(image, { headers: {
    "Content-Type": format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png",
    "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff",
    ...(params.get("download") === "1" ? { "Content-Disposition": `attachment; filename="biblia-conectada-qr.${format}"` } : {}),
  } });
}
