// Poster images of the light sculpture (/arcos): the opening view (home.ts HOME_ORBIT) at HOME_ASPECT, the first live
// frame, drawn from the real data with the page's own renderer by scripts/render-sculpture-poster.mjs and committed
// under public/sculpture/. Each one is drawn for 2 device px per CSS px. Phones get the 854 px image with the 20,000
// most voted arcs (sky-head.bin, what a phone draws); from 48rem the 2002 px image shows every arc (arcs.bin).
// The home box fills the middle `box` share of each image: the rest carries the glow past the box's edges, as the
// canvas does, so the image can fade out before its own edge instead of ending in a seam (sculpture.module.css).
// tests/sculpture-poster.test.ts checks the files against these sizes.
const image = (theme: "noite" | "dia", w: number, h: number) => ({
  avif: `/sculpture/${theme}-${w}.avif`,
  webp: `/sculpture/${theme}-${w}.webp`,
  w,
  h,
});

export const SCULPTURE_POSTER = {
  media: "(min-width: 48rem)",
  /** the share of the image's width and height the home box fills, in its middle */
  box: 0.9,
  phone: { noite: image("noite", 854, 610), dia: image("dia", 854, 610) },
  wide: { noite: image("noite", 2002, 1430), dia: image("dia", 2002, 1430) },
} as const;
