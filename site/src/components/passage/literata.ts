import localFont from "next/font/local";

// Literata: the Bible text face (design/README.md §4), for the pages outside the reader that show BLIVRE verses
// (linha do tempo, temas, palavras). Same file as the reader's declaration.
export const literata = localFont({
  src: "../../fonts/Literata-wght-latin.woff2",
  variable: "--font-scripture",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
