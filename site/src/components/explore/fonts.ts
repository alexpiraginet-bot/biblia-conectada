import localFont from "next/font/local";

// Literata: the Bible text face (design §4), for the verses quoted in the connection panel and the side by side
// reading. Same file as the reading pages (src/app/(site)/[livro]/[cap]/layout.tsx), so the browser fetches it once.
export const scripture = localFont({
  src: "../../fonts/Literata-wght-latin.woff2",
  variable: "--font-scripture",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
