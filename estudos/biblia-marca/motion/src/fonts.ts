import {continueRender, delayRender, staticFile} from "remotion";

// Local OFL fonts (public/fonts). Rendering waits until every face is loaded.
const FACES: [string, string, string, string?][] = [
  ["Newsreader", "fonts/Newsreader-Display.woff2", "400 500"],
  ["Space Grotesk", "fonts/SpaceGrotesk-VF.woff2", "300 700"],
  ["Space Mono", "fonts/SpaceMono-Regular.woff2", "400"],
  ["Space Mono", "fonts/SpaceMono-Bold.woff2", "700"],
  ["Gentium Book Plus", "fonts/gentium-book-plus-latin-400-normal.woff2", "400", "U+0000-024F"],
  ["Gentium Book Plus", "fonts/gentium-book-plus-greek-400-normal.woff2", "400", "U+0370-03FF"],
  ["Gentium Book Plus", "fonts/gentium-book-plus-greek-ext-400-normal.woff2", "400", "U+1F00-1FFF, U+0300-036F"],
  ["Noto Serif Hebrew", "fonts/noto-serif-hebrew-hebrew-500-normal.woff2", "400 700", "U+0590-05FF, U+FB1D-FB4F"],
];

const handle = delayRender("fonts");
Promise.all(
  FACES.map(([family, file, weight, range]) => {
    const face = new FontFace(family, `url(${staticFile(file)}) format("woff2")`, {
      weight,
      ...(range ? {unicodeRange: range} : {}),
    });
    return face.load().then((f) => {
      document.fonts.add(f);
    });
  }),
)
  .then(() => continueRender(handle))
  .catch((e) => {
    console.error("font load failed", e);
    continueRender(handle);
  });
