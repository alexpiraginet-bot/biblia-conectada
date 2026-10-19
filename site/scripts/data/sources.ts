// Every input the data pipeline reads. All of them live outside site/ (fontes/ and estudos/*/data/) and are read-only.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const REPO = resolve(SITE, "..");

export const SRC = {
  blivreZip: join(REPO, "fontes/blivre/porbr2018_vpl.zip"),
  fontesDir: join(REPO, "fontes"),
  fontesSums: join(REPO, "fontes/SHA256SUMS"),
  crossrefsTxt: join(REPO, "estudos/biblia-referencias/data/openbible-cross_references.txt"),
  xrefNpz: join(REPO, "estudos/biblia-referencias/data/xref.npz"),
  statsJson: join(REPO, "estudos/biblia-referencias/data/stats.json"),
  natalStatsJson: join(REPO, "estudos/biblia-natal/data/natal-stats.json"),
  natalVersesJson: join(REPO, "estudos/biblia-natal/data/verses.json"),
  attribution: join(REPO, "ATTRIBUTION.md"),
};

// SHA-256 of the cross-reference file, as recorded in fontes/README.md and in natal-stats.json.
export const CROSSREFS_SHA256 = "2aba58d2adc91609a090f80bb05dfbc7a1518ff10ee798f6b452dfeaf01ccff8";

export const OUT = {
  generated: join(SITE, "src/data/generated"),
  publicData: join(SITE, "public/data"),
  /** open data bundle for people who build on the project's data, served at /dados/v1/ (DADOS.md) */
  publicDados: join(SITE, "public/dados"),
};

export function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
