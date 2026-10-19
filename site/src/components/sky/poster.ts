// Poster images of the sky, rendered from the real data by scripts/render-sky-poster.mjs with the same WebGL code and
// committed under public/sky/. Two layers per size, blended by the page with "screen" (as the shader does):
//   sky  = night ground + receded arcs + chapter ticks;  gold = Isaías 9:6 lit (arcs, glow, light point), on black.
// Phones get the 20,000 most voted arcs (what their canvas draws); from 48rem the poster shows every arc.
// Sizes are multiples of 8 so height = width * 5 / 8 exactly (BAND.aspect).
const layer = (set: "head" | "full", kind: "sky" | "gold", w: number) => ({
  avif: `/sky/${kind}-${set}-${w}.avif`,
  webp: `/sky/${kind}-${set}-${w}.webp`,
  w,
  h: (w * 5) / 8,
});

export const POSTER = {
  desktopMedia: "(min-width: 48rem)",
  head: layer("head", "sky", 864),
  headGold: layer("head", "gold", 864),
  full: layer("full", "sky", 2304),
  fullGold: layer("full", "gold", 2304),
} as const;

/** Runs before the poster paints: on the first visit of the session (motion allowed) the poster's gold layer is
 *  hidden, so the canvas can draw Isaías 9:6's arcs growing over the already visible sky (design §7). */
export const INTRO_SCRIPT = `try{if(!sessionStorage.getItem("sky-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.setAttribute("data-sky-intro","")}catch(e){}`;
