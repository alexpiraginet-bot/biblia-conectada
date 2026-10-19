import localFont from "next/font/local";

// Literata: the Bible text face (design §4). Imported only by the routes that show Bible text (reading pages,
// /salvos), so the other pages never download it.
export const literata = localFont({
  src: "../../fonts/Literata-wght-latin.woff2",
  variable: "--font-scripture",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
