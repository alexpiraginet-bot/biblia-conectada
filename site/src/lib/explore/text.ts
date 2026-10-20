// Count words of the Explorar, shared by the pages and the layout test (which measures these exact strings).
const nf = new Intl.NumberFormat("pt-BR");

/** 296 -> "296 votos"; summed votes can be 1, 0 or negative */
export function votesText(v: number): string {
  return `${nf.format(v)} ${Math.abs(v) === 1 ? "voto" : "votos"}`;
}

/** 3 -> "3 pares" (verse pairs between two chapters) */
export function pairsText(p: number): string {
  return `${nf.format(p)} ${p === 1 ? "par" : "pares"}`;
}

/** count line under the centre of the graph */
export function partnersText(n: number): string {
  return `${nf.format(n)} ${n === 1 ? "capítulo ligado" : "capítulos ligados"}`;
}
