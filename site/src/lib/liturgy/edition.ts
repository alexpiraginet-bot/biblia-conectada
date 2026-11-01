import type { TranslationId } from "../translations";

/** Repeated, empty or unknown values must never silently select another text. */
export function parseLiturgyEdition(value: string | string[] | null | undefined): TranslationId | null {
  return value === undefined || value === null ? "blivre" : value === "blivre" || value === "open-nbv" ? value : null;
}

export function liturgyEditionQuery(edition: TranslationId): string {
  if (!parseLiturgyEdition(edition)) throw new Error("Invalid liturgy edition");
  return edition === "open-nbv" ? "?edition=open-nbv" : "";
}

export const LITURGY_EXTERNAL_EDITIONS = {
  cnbb: "https://liturgiadiaria.edicoescnbb.com.br/",
  aveMaria: "https://claretianos.com.br/biblia-ave-maria-online/",
} as const;
