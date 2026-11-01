import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/header/SiteHeader";
import { THEME_COLOR, THEME_SCRIPT } from "@/components/header/theme";
import { SearchHost } from "@/components/search/SearchHost";
import { StudyHost } from "@/components/assistant/StudyHost";
import { VERSE_INTENT_SCRIPT } from "@/components/assistant/verse-intent-script";
import { VerseIntentFeedback } from "@/components/assistant/VerseIntentFeedback";
import { InstallHost } from "@/components/install/InstallHost";
import { RewardsHost } from "@/components/rewards/RewardsHost";
import { PAGE_SEARCH_SCRIPT } from "@/components/search/page-search-script";
import { SiteShell } from "@/components/shell/NavLinks";
import { SectionRail, TabBar } from "@/components/shell/Navigation";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from "@/lib/site-identity";
import { shareMetadata } from "@/lib/share-metadata";
import { books } from "@/lib/data";
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
  ...shareMetadata({ title: SITE_NAME, description: SITE_DESCRIPTION, path: "/" }),
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  formatDetection: { telephone: false },
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
    <html lang="pt-BR" data-theme="sistema" className={`${ui.variable} ${display.variable} ${reading.variable}`} suppressHydrationWarning>
      <head>
        {/* Installation identity is invariant across routes. Keep it in the static shell so
            Safari can discover it before dynamic passage metadata, without bypassing the CDN.
            These tags deliberately have no duplicate in the Metadata API/file conventions. */}
        <meta name="application-name" content={SITE_NAME} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={SITE_SHORT_NAME} />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180-v2.png" sizes="180x180" type="image/png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script dangerouslySetInnerHTML={{ __html: `${THEME_SCRIPT};${PAGE_SEARCH_SCRIPT};${VERSE_INTENT_SCRIPT}` }} />
      </head>
      <body className="bc-root">
        <VerseIntentFeedback />
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <SiteShell>
          <SectionRail />
          <div className="site-column">
            <SiteHeader />
            <InstallHost />
            {children}
            <SiteFooter />
          </div>
          <TabBar />
        </SiteShell>
        <SearchHost />
        <StudyHost />
        <RewardsHost />
        {process.env.AUDIENCE_ENABLED === "true" && <script dangerouslySetInnerHTML={{ __html: `window.bcAudience=${JSON.stringify({ enabled: true, bookSlugs: books.map(book => book.slug), measurementId: /^G-[A-Z0-9]{6,20}$/.test(process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "") ? process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID : null })};window.addEventListener('load',()=>setTimeout(()=>{if(!navigator.webdriver){const s=document.createElement('script');s.src='/audience-v1.js';s.defer=true;document.body.append(s)}},2000),{once:true});` }} />}
      </body>
    </html>
  );
}
