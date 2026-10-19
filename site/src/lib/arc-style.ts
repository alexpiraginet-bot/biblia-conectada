// Arc look of video 1 (estudos/biblia-referencias/arcs.py, film.py), shared by the reading pages.

// film.py palette: stops over t = span^0.55, from short blue links to long gold ones
const PAL_T = [0, 0.22, 0.42, 0.62, 0.8, 1];
const PAL_C = [
  [0.16, 0.5, 1],
  [0.14, 0.26, 1],
  [0.55, 0.2, 1],
  [1, 0.16, 0.4],
  [1, 0.5, 0.12],
  [1, 0.82, 0.36],
];

/** Colour of an arc by its span (0–1 of the baseline), as a hex string. */
export function arcTone(span: number): string {
  const t = Math.pow(Math.min(Math.max(span, 0), 1), 0.55);
  let i = 0;
  while (i < PAL_T.length - 2 && t > PAL_T[i + 1]) i++;
  const f = (t - PAL_T[i]) / (PAL_T[i + 1] - PAL_T[i]);
  const hex = PAL_C[i].map((c, k) => Math.round(255 * (c + (PAL_C[i + 1][k] - c) * f)).toString(16).padStart(2, "0"));
  return `#${hex.join("")}`;
}

/** arcs.py weight 0.55 + 0.45 * clip(log1p(max(votes, 0)) / log1p(150), 0, 1), rescaled to 0–1 */
export function arcStrength(votes: number): number {
  return Math.min(Math.max(Math.log1p(Math.max(votes, 0)) / Math.log1p(150), 0), 1);
}
