import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/SiteFooter";
import { THEME_SCRIPT } from "@/components/header/ThemeToggle";
import { NavLinks } from "@/components/shell/NavLinks";
import "./globals.css";

// OFL fonts, subset to Latin (scripts/subset-fonts.sh; licences in src/fonts/OFL-*.txt).
// Only the interface face lives in the root layout; faces used by one route are declared there (design/README.md §4).
const grotesk = localFont({
  src: "../fonts/SpaceGrotesk-VF.woff2",
  variable: "--font-grotesk",
  weight: "300 700",
  display: "swap",
});
// Newsreader, one static instance (optical size 72, weight 440): page titles on every route (design §4)
const display = localFont({
  src: "../fonts/Newsreader-Display.woff2",
  variable: "--font-display",
  weight: "440",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: { default: "Bíblia Conectada", template: "%s · Bíblia Conectada" },
  description:
    "Mapa navegável das ligações da Bíblia: livros, capítulos, versículos e referências cruzadas. Em português, só com fontes livres.",
};

export const viewport: Viewport = {
  themeColor: "#051219",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-theme="noite" className={`${grotesk.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
        <SiteFooter />
        <nav aria-label="Atalhos" className="bottom-bar">
          <NavLinks variant="bar" />
        </nav>
      </body>
    </html>
  );
}
