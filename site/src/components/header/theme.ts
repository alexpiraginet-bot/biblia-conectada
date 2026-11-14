// Appearance: "sistema" follows the device (prefers-color-scheme, in src/styles/tokens.css); "dia" and "noite" are a
// choice stored on the device and applied as data-theme on <html> and <body> (design/README.md, "Temas").
export type Theme = "noite" | "dia";
export type Choice = Theme | "sistema";

export const THEME_KEY = "theme";
/** A new visitor sees the light identity; explicit device preferences remain available. */
export const DEFAULT_APPEARANCE: Choice = "dia";

export function appearanceChoice(value: string | null): Choice {
  return value === "dia" || value === "noite" || value === "sistema" ? value : DEFAULT_APPEARANCE;
}

/** The ground of each theme (tokens.json `ground`; tests/tokens.test.ts checks they match), for the browser chrome */
export const THEME_COLOR: Record<Theme, string> = { noite: "#211018", dia: "#F7F0E5" };

/** Apply the same fallback as hydration, without overwriting choices saved before the temporary night guard. */
export const THEME_SCRIPT = `(function(){var t="${DEFAULT_APPEARANCE}";try{var s=localStorage.getItem("${THEME_KEY}");if(s==="dia"||s==="noite"||s==="sistema")t=s}catch(e){}document.documentElement.setAttribute("data-theme",t)})()`;
