// Appearance: "sistema" follows the device (prefers-color-scheme, in src/styles/tokens.css); "dia" and "noite" are a
// choice stored on the device and applied as data-theme on <html> and <body> (design/README.md, "Temas").
export type Theme = "noite" | "dia";
export type Choice = Theme | "sistema";

export const THEME_KEY = "theme";

/** The ground of each theme (tokens.json `ground`; tests/tokens.test.ts checks they match), for the browser chrome */
export const THEME_COLOR: Record<Theme, string> = { noite: "#211018", dia: "#F7F0E5" };

/** Before first paint; the CSS-only fallback is also Noite. Explicit Sistema stays explicit. */
export const THEME_SCRIPT = `(function(){var t="noite";try{t=localStorage.getItem("${THEME_KEY}")||t}catch(e){}document.documentElement.setAttribute("data-theme",t==="dia"||t==="sistema"?t:"noite")})()`;
