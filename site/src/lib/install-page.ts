import credits from "@/data/generated/credits.json";
import tokens from "@/styles/tokens.json";
import { THEME_SCRIPT } from "@/components/header/theme";
import { SITE_NAME, SITE_URL } from "./site-identity";
import { getTranslation } from "./translations";

const APPLE_ICON = "/icons/apple-touch-icon-180-v2.png";
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);

const colors = (theme: "dia" | "noite") => tokens.color.tokens
  .map((token) => `--${token.name}:${token.value[theme]}`).join(";");
const dimensions = [...tokens.spacing.tokens, ...tokens.radius.tokens, ...tokens.layout.tokens]
  .map((token) => `--${token.name}:${token.value}`).join(";");

/** A complete document, independent of the React shell and its hydration. */
export function installPageHtml(): string {
  const name = escapeHtml(SITE_NAME);
  const home = escapeHtml(SITE_URL);
  const nbv = getTranslation("open-nbv")!;
  return `<!doctype html>
<html lang="pt-BR" data-theme="noite">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${name}</title>
<meta name="application-name" content="${name}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${name}">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="${APPLE_ICON}" sizes="180x180" type="image/png">
<link rel="icon" href="${APPLE_ICON}" type="image/png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="canonical" href="${home}/instalar">
<meta name="description" content="Adicione a ${name} à Tela de Início do seu iPhone ou iPad pelo Safari.">
<meta name="theme-color" content="${tokens.color.tokens.find((token) => token.name === "ground")!.value.noite}">
<script>${THEME_SCRIPT}</script>
<style>
:root{${colors("noite")};${dimensions};color-scheme:dark}
:root[data-theme="dia"]{${colors("dia")};color-scheme:light}
@media(prefers-color-scheme:light){:root[data-theme="sistema"]{${colors("dia")};color-scheme:light}}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-text-size-adjust:100%}
[hidden]{display:none!important}
a{color:var(--accent);text-underline-offset:4px}
a:focus-visible,button:focus-visible{outline:2px solid var(--focus);outline-offset:4px}
main,footer{width:min(100% - var(--space-6),58rem);margin-inline:auto}
main{padding-block:clamp(32px,6vw,80px) var(--space-7)}
.card{border:1px solid var(--line);border-radius:var(--radius-lg);background:var(--surface);padding:clamp(24px,4vw,48px)}
.identity{display:flex;align-items:center;gap:var(--space-5)}
.icon{display:block;flex:none;width:112px;height:112px;border-radius:var(--radius-lg);color:var(--ink-2);font-size:14px;overflow:hidden}
.eyebrow{margin:0 0 var(--space-2);color:var(--accent);font-size:14px;font-weight:600}
h1{margin:0;font:400 clamp(32px,4vw,46px)/1.08 Georgia,"Times New Roman",serif;letter-spacing:-.025em}
.intro{max-width:39rem;margin:var(--space-5) 0 0;color:var(--ink-2);font-size:17px}
.icon-status{margin:var(--space-2) 0 0;color:var(--ink-3);font-size:14px}
.icon-status[data-state="error"]{color:var(--danger)}
ol{list-style:none;counter-reset:step;padding:0;margin:var(--space-6) 0;border-top:1px solid var(--line)}
li{counter-increment:step;display:grid;grid-template-columns:var(--target) minmax(0,1fr);gap:var(--space-4);align-items:start;padding:var(--space-5) 0;border-bottom:1px solid var(--line)}
li::before{content:counter(step);display:grid;place-items:center;width:var(--target);height:var(--target);border:1px solid var(--line-strong);border-radius:var(--radius-pill);color:var(--accent);font-variant-numeric:tabular-nums}
li h2{margin:0;font-size:17px;line-height:1.5;font-weight:650}
li p{margin:var(--space-1) 0 0;color:var(--ink-2);font-size:15px}
.share-symbol{width:20px;height:20px;vertical-align:-3px;margin-left:4px;color:var(--accent)}
.actions{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center}
.button{display:inline-flex;min-height:var(--target);justify-content:center;align-items:center;gap:var(--space-3);border:1px solid var(--action-fill);border-radius:var(--radius-md);padding:var(--space-3) var(--space-5);background:var(--action-fill);color:var(--on-action);font:600 16px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;text-decoration:none;cursor:pointer}
.button:hover{filter:brightness(1.06)}
.secondary{border-color:var(--line-strong);background:var(--surface);color:var(--ink)}
.note{max-width:42rem;margin:var(--space-5) 0 0;color:var(--ink-3);font-size:14px}
footer{padding-block:0 max(var(--space-6),env(safe-area-inset-bottom));color:var(--ink-3);font-size:14px;overflow-wrap:anywhere}
footer>a{display:inline-flex;align-items:center;min-height:var(--target);font-weight:600}
footer p{margin:var(--space-3) 0;max-width:54rem}
@media(max-width:520px){main{padding-top:var(--space-5)}.card{padding:20px}.identity{gap:var(--space-4)}.identity>div{min-width:0}.icon{width:80px;height:80px}h1{font-size:28px}.eyebrow{font-size:13px}.intro{font-size:16px;margin-top:var(--space-4)}ol{margin-block:var(--space-5)}li{gap:var(--space-3);padding-block:var(--space-3)}li h2{font-size:16px}li p{font-size:14px;line-height:1.45}.actions>.button{width:100%}.note{margin-top:var(--space-4)}}
</style>
</head>
<body>
<main>
  <section class="card" aria-labelledby="install-title">
    <header class="identity">
      <img id="app-icon" class="icon" src="${APPLE_ICON}" width="180" height="180" alt="Ícone dourado de arcos e estrela da ${name}" decoding="sync" fetchpriority="high">
      <div><p class="eyebrow">Na sua Tela de Início</p><h1 id="install-title">${name}</h1></div>
    </header>
    <p id="icon-status" class="icon-status" role="status">Confira o ícone dourado acima antes de adicionar.</p>
    <p class="intro">Abra esta página no <strong>Safari do iPhone ou iPad</strong> e siga os passos.</p>
    <ol aria-label="Passos para adicionar à Tela de Início">
      <li><div><h2>Toque em Compartilhar <svg class="share-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 15V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3"/></svg></h2><p>O quadrado com a seta para cima; também pode estar no menu.</p></div></li>
      <li><div><h2>Adicionar à Tela de Início</h2><p>Role as opções para encontrar essa ação.</p></div></li>
      <li><div><h2>Confirme em Adicionar</h2><p>Confira <strong>${name}</strong> e o ícone dourado. Mantenha <strong>Abrir como App da Web</strong> ativado, se aparecer.</p></div></li>
    </ol>
    <div class="actions">
      <a class="button" href="${home}">Abrir a Bíblia</a>
      <button id="reload-icon" class="button secondary" type="button" hidden>Recarregar a página</button>
    </div>
    <p class="note">Está no Instagram ou em outro aplicativo? Abra este link no Safari primeiro. A adição à Tela de Início é concluída pelo próprio Safari.</p>
    <noscript><p class="note">As instruções e o ícone estão disponíveis sem JavaScript. Se a imagem não aparecer, recarregue a página pelo Safari antes de adicionar.</p></noscript>
  </section>
</main>
<footer>
  <a href="${home}/sobre">Sobre e créditos completos</a>
  <p><strong>Nas páginas da Bíblia Livre:</strong> ${escapeHtml(credits.blivreCredit)}</p>
  <p><strong>Nas páginas Open Nova Bíblia Viva:</strong> ${escapeHtml(nbv.credit)} <a href="${escapeHtml(nbv.licenseUrl)}">${escapeHtml(nbv.license)}</a>. Texto sem alterações.</p>
  <p>${escapeHtml(credits.openBibleCredit)} (<a href="https://www.openbible.info/labs/cross-references/">CC BY</a>). Dados derivados sob <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>
</footer>
<script>
(function(){
var icon=document.getElementById("app-icon"),status=document.getElementById("icon-status"),reload=document.getElementById("reload-icon");
function update(){var ready=icon.naturalWidth>0;status.textContent=ready?"Ícone carregado. Confira-o também no Safari.":"Não foi possível carregar o ícone. Recarregue esta página antes de adicionar.";status.dataset.state=ready?"loaded":"error";reload.hidden=ready;}
icon.addEventListener("load",update);icon.addEventListener("error",update);if(icon.complete)update();
reload.addEventListener("click",function(){location.reload()});
function chromeColor(){document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.documentElement).getPropertyValue("--ground").trim()}
chromeColor();if(window.matchMedia)window.matchMedia("(prefers-color-scheme: light)").addEventListener("change",chromeColor);
})();
</script>
</body>
</html>`;
}
