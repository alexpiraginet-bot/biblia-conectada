// The open data bundle served at /dados/v1/ (written by scripts/data/open-data.ts; documented in DADOS.md).
// Shared by the data pipeline, the /dados page and scripts/check-dist.ts, so the page and the check agree.

/** Folder of the bundle under public/ and its URL path on the site. */
export const DADOS_BASE = "/dados/v1/";

export type DadosFile = {
  /** path inside the bundle ("ligacoes.csv", "texto/isaias.json") */
  caminho: string;
  /** short Portuguese title shown on /dados */
  titulo: string;
  bytes: number;
  sha256: string;
  formato: "csv" | "json" | "md" | "txt" | "zip";
  licenca: string;
  /** how many records the file holds, in `unidade` (CSV: data rows without the header) */
  registros?: number;
  unidade?: string;
};

export type DadosManifest = {
  formato: "biblia-conectada/dados-manifest@1";
  versao: string;
  base: string;
  contagens: {
    livros: number;
    capitulos: number;
    versiculos: number;
    linhasOpenBible: number;
    paresUnicos: number;
    autoPares: number;
    paresLigados: number;
    versiculosComLigacao: number;
    arestasCapitulos: number;
    votosMin: number;
    votosMax: number;
  };
  /** every file of the bundle except manifest.json itself and SHA256SUMS (which lists this file) */
  arquivos: DadosFile[];
};

const dec1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const int = new Intl.NumberFormat("pt-BR");

/** 25612345 -> "25,6 MB" (SI units: 1 kB = 1.000 bytes, 1 MB = 1.000.000 bytes). Presentation only. */
export function formatBytes(n: number): string {
  if (n < 1000) return `${int.format(n)} B`;
  if (n < 999_950) return `${dec1.format(n / 1000)} kB`;
  return `${dec1.format(n / 1_000_000)} MB`;
}
