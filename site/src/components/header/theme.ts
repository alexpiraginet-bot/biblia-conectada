// Appearance: the app opens in "dia" (the light theme) for everyone, whatever the device prefers; "noite" and
// "sistema" (follow the device: prefers-color-scheme, in src/styles/tokens.css) are a choice the reader makes, stored
// on the device and applied as data-theme on <html> and <body> (design/README.md, "Temas").
export type Theme = "noite" | "dia";
export type Choice = Theme | "sistema";

export const THEME_KEY = "theme";
/**
 * What a reader who never chose sees. Asked by Alex on 10/11/2026: "por padrão o tema claro para o app; escuro só se
 * o cliente mudar". Until then the default had been the device's own scheme, and night for everyone under the guard
 * below.
 */
export const DEFAULT_CHOICE: Choice = "dia";
/**
 * Release guard: true shows night to everyone and ignores the stored choice without erasing it. Alex asked for it on
 * 01/11 while the light theme's contrast was reviewed; off since 10/11, when light became the default. Kept as the
 * one-line way back.
 */
export const NIGHT_MODE_ONLY = false;

/** The ground of each theme (tokens.json `ground`; tests/tokens.test.ts checks they match), for the browser chrome */
export const THEME_COLOR: Record<Theme, string> = { noite: "#211018", dia: "#F7F0E5" };

/** A stored value that is a choice; anything else (nothing stored, storage blocked, an unknown word) is the default. */
export const themeChoice = (stored: string | null | undefined): Choice => (stored === "dia" || stored === "noite" || stored === "sistema" ? stored : DEFAULT_CHOICE);

/** What the first HTML carries, before any script: the default, or night under the guard. */
export const FIRST_THEME: Choice = NIGHT_MODE_ONLY ? "noite" : DEFAULT_CHOICE;

/** Applied before first paint: the reader's stored choice, or the default (tests/theme-default.test.ts runs it). */
export const THEME_SCRIPT = NIGHT_MODE_ONLY
  ? `document.documentElement.setAttribute("data-theme","noite")`
  : `(function(){var t=null;try{t=localStorage.getItem("${THEME_KEY}")}catch(e){}document.documentElement.setAttribute("data-theme",t==="dia"||t==="noite"||t==="sistema"?t:"${DEFAULT_CHOICE}")})()`;
