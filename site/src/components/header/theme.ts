// Appearance: "sistema" follows the device (prefers-color-scheme, in src/styles/tokens.css); "dia" and "noite" are a
// choice stored on the device and applied as data-theme on <html> and <body> (design/README.md, "Temas").
export type Theme = "noite" | "dia";
export type Choice = Theme | "sistema";

export const THEME_KEY = "theme";

/** The ground of each theme (tokens.json `ground`; tests/tokens.test.ts checks they match), for the browser chrome */
export const THEME_COLOR: Record<Theme, string> = { noite: "#091C17", dia: "#F6F4EB" };

/** Runs in <head> before the first paint: applies a stored choice. Without one, the CSS follows the device. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dia"||t==="noite"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;
