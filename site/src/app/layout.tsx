import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

// OFL fonts of the videos, subset to Latin by scripts/subset-fonts.sh (licences in src/fonts/OFL-*.txt).
const grotesk = localFont({
  src: "../fonts/SpaceGrotesk-VF.woff2",
  variable: "--font-grotesk",
  weight: "300 700",
  display: "swap",
});
const cormorant = localFont({
  src: "../fonts/Cormorant-VF.woff2",
  variable: "--font-cormorant",
  weight: "300 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Bíblia Conectada", template: "%s · Bíblia Conectada" },
  description:
    "Mapa navegável das ligações da Bíblia: livros, capítulos, versículos e referências cruzadas. Em português, só com fontes livres.",
};

export const viewport: Viewport = {
  themeColor: "#060d1a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${grotesk.variable} ${cormorant.variable}`}>
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
