import QRCode from "qrcode";
import { campaignPix } from "@/lib/support/pix";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, amount = params.get("cents");
  if (params.getAll("cents").length !== 1 || !amount || !/^[1-9]\d{0,10}$/.test(amount)) return new Response("Valor inválido", { status: 400 });
  try {
    const payload = campaignPix(Number(amount));
    const image = new Uint8Array(await QRCode.toBuffer(payload, { margin: 4, width: 640, errorCorrectionLevel: "M", color: { dark: "#211018ff", light: "#ffffffff" } }));
    return new Response(image, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Valor inválido", { status: 400 }); }
}
