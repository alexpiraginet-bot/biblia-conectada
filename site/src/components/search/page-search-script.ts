// The attribute that hides the top bar's search entry while the page's own search field is on screen (page-search.ts,
// app/globals.css), and the <head> script that sets it before the first paint on the pages that have such a field,
// so the capa, /buscar and /arcos open without the bar's entry instead of losing it once their code has loaded.
export const PAGE_SEARCH_ATTR = "data-page-search";

export const PAGE_SEARCH_SCRIPT = `(function(){var p=location.pathname;if(p==="/"||p==="/buscar"||p==="/arcos"){document.documentElement.setAttribute("${PAGE_SEARCH_ATTR}","")}})()`;
