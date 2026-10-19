import localFont from "next/font/local";

// Literata, the Bible text face (design §4), for the community pages that show verses.
export const scripture = localFont({
  src: "../../fonts/Literata-wght-latin.woff2",
  variable: "--font-scripture",
  weight: "200 900",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
