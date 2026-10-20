import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/header/SiteHeader";
import { THEME_COLOR, THEME_SCRIPT } from "@/components/header/theme";
import { SearchHost } from "@/components/search/SearchHost";
import { PAGE_SEARCH_SCRIPT } from "@/components/search/page-search-script";
import { SectionRail, SiteShell, TabBar } from "@/components/shell/NavLinks";
import "@/styles/tokens.css";
import "@/styles/ds.css";
import "./globals.css";

// Three self-hosted OFL families: Figtree for the UI, Newsreader for titles and Literata for Scripture.
// Font provenance and licences live in src/fonts. Their variables feed --font-ui, --font-display and
// --font-reading in src/styles/tokens.css; no font request leaves the site.
const ui = localFont({
  src: "../fonts/Figtree-VF.woff2",
  variable: "--nf-ui",
  weight: "300 900",
  display: "swap",
});
// Newsreader, one static instance (optical size 72, weight 440): page titles
const display = localFont({
  src: "../fonts/Newsreader-Display.woff2",
  variable: "--nf-display",
  weight: "440",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
// Literata: the Bible text, on every page with a verse and in the search results
const reading = localFont({
  src: "../fonts/Literata-wght-latin.woff2",
  variable: "--nf-reading",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const metadata: Metadata = {
  title: { default: "Bíblia Conectada", template: "%s · Bíblia Conectada" },
  description:
    "Mapa navegável das ligações da Bíblia: livros, capítulos, versículos e referências cruzadas. Em português, só com fontes livres.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.dia },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.noite },
  ],
  viewportFit: "cover",
};

// The shell (globals.css .site-shell): the section rail on the left from 1024px; the column with the top bar, the
// page and its footer; the tab bar on phones. The search palette loads on first use (SearchHost).
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${ui.variable} ${display.variable} ${reading.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `${THEME_SCRIPT};${PAGE_SEARCH_SCRIPT}` }} />
      </head>
      <body className="bc-root">
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <SiteShell>
          <SectionRail />
          <div className="site-column">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
          <TabBar />
        </SiteShell>
        <SearchHost />
      </body>
    </html>
  );
}
