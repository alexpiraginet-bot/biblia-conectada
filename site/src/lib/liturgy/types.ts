import type { TranslationId } from "../translations";

export type LiturgyKind = "first" | "psalm" | "second" | "gospel" | "extra";
export type LiturgyColor = "green" | "white" | "red" | "purple" | "rose" | "black" | "unknown";

export type LiturgyVerse = { number: number; text: string; path: string };
export type LiturgyPassage = { reference: string; path: string; verses: LiturgyVerse[] };
export type LiturgyReading = {
  id: string;
  kind: LiturgyKind;
  label: string;
  /** Citation supplied by the calendar, not a quotation from a protected lectionary. */
  reference: string;
  passages: LiturgyPassage[];
  notice?: string;
  unavailableReason?: string;
};
export type LiturgySource = { name: string; url: string; officialUrl: string; notice: string };
export type LiturgyEdition = { id: TranslationId; name: string; notice: string };
export type LiturgyDay = {
  ok: true;
  date: string;
  today: string;
  celebration: string;
  color: LiturgyColor;
  colorLabel: string;
  readings: LiturgyReading[];
  source: LiturgySource;
  edition: LiturgyEdition;
  fetchedAt: string;
};
export type LiturgyUnavailable = {
  ok: false;
  date: string;
  today: string;
  code: "invalid-date" | "invalid-edition" | "unavailable";
  edition?: LiturgyEdition;
  message: string;
  source: LiturgySource;
};
export type LiturgyResult = LiturgyDay | LiturgyUnavailable;
