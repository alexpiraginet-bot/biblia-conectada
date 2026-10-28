import {continueRender, delayRender, staticFile} from "remotion";

// Local OFL fonts (public/fonts). Rendering waits until every face is loaded.
const FACES: [string, string, string][] = [
  ["Figtree", "fonts/Figtree-VF.woff2", "300 900"],
  ["Newsreader", "fonts/Newsreader-Display.woff2", "400 500"],
  ["Space Mono", "fonts/SpaceMono-Regular.woff2", "400"],
  ["Space Mono", "fonts/SpaceMono-Bold.woff2", "700"],
];

const handle = delayRender("fonts");
Promise.all(
  FACES.map(([family, file, weight]) => {
    const face = new FontFace(family, `url(${staticFile(file)}) format("woff2")`, {weight});
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
