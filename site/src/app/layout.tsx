import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/SiteFooter";
import { THEME_SCRIPT } from "@/components/header/ThemeToggle";
import "./globals.css";

// OFL fonts, subset to Latin (scripts/subset-fonts.sh; licences in src/fonts/OFL-*.txt).
// Only the interface face lives in the root layout; faces used by one route are declared there (design/README.md §4).
const grotesk = localFont({
  src: "../fonts/SpaceGrotesk-VF.woff2",
  variable: "--font-grotesk",
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
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="noite" className={grotesk.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
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
