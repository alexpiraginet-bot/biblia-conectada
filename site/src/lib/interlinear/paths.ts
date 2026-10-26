/** Only this editorial pilot is available. No corpus or server modules enter client bundles. */
export const INTERLINEAR_REFERENCES = [
  "genesis/1/1", "genesis/1/2", "genesis/1/3", "genesis/1/4", "genesis/1/5",
  "salmos/22/1", "salmos/22/6",
  "salmos/23/1", "salmos/23/2", "salmos/23/3", "salmos/23/4", "salmos/23/5", "salmos/23/6",
  "mateus/27/46", "marcos/15/34",
  "joao/1/1", "joao/1/2", "joao/1/3", "joao/1/4", "joao/1/5", "joao/1/14", "joao/3/16",
] as const;

/** BLIVRE reading coordinates only: matching chapter numbers in another edition is not alignment. */
export function interlinearPathForReading(path: string): string | null {
  return /^\/(genesis\/1\/[1-5]|salmos\/(22\/(1|6)|23\/[1-6])|joao\/(1\/([1-5]|14)|3\/16)|mateus\/27\/46|marcos\/15\/34)$/.test(path)
    ? `/interlinear${path}` : null;
}
