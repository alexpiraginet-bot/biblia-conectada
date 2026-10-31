import { Suspense } from "react";
import { QRPage } from "@/components/share/QRPage";
import { shareMetadata } from "@/lib/share-metadata";

export const metadata = { ...shareMetadata({ title: "Compartilhar por QR Code", description: "Leve uma leitura da Bíblia Conectada para outro celular. Crie e baixe o QR Code da página.", path: "/qr" }), robots: { index: false, follow: true } };

export default function Page() {
  return <main id="conteudo" className="site-page"><Suspense fallback={<p role="status">Preparando o QR Code…</p>}><QRPage /></Suspense></main>;
}
