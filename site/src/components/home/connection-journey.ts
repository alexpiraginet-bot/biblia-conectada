import styles from "./connection-journey.module.css";

// Alex's portrait clip is already accelerated to 1s. No decoding/rendering job runs in the browser.
let preparedVideo: HTMLVideoElement | null = null;
let prewarmTimer = 0;
function motionAllowed() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !document.hidden && !matchMedia("(prefers-reduced-motion: reduce)").matches
    && !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
}
export function prewarmConnectionJourney() {
  if (preparedVideo || !motionAllowed() || !document.querySelector("[data-dawn-constellation]")?.getClientRects().length) return;
  const variant = matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";
  const video = document.createElement("video");
  video.muted = true; video.defaultMuted = true; video.playsInline = true;
  video.preload = "auto"; video.setAttribute("aria-hidden", "true"); video.tabIndex = -1;
  video.poster = `/home/tunnel-${variant}-poster.webp`;
  video.src = `/home/tunnel-${variant}-1s.mp4`;
  preparedVideo = video;
  video.load();
}
// Download after the opening has settled; pointer/focus can prepare it earlier. Never await it on navigation.
if (typeof window !== "undefined") prewarmTimer = window.setTimeout(prewarmConnectionJourney, 1600);
export function releasePreparedJourney() {
  window.clearTimeout(prewarmTimer);
  if (preparedVideo) { preparedVideo.pause(); preparedVideo.removeAttribute("src"); preparedVideo.load(); preparedVideo = null; }
}
let finishCurrent: (() => void) | undefined;
export const JOURNEY_MS = 1000;

/** A bounded transition, outside the page React may hide during navigation. Never waits for a network response. */
export function travelThroughConnection(label: string, navigate: () => void) {
  window.clearTimeout(prewarmTimer);
  finishCurrent?.();
  if (!motionAllowed()) { navigate(); return; }
  prewarmConnectionJourney();
  const video = preparedVideo;
  preparedVideo = null;
  const layer = document.createElement("div");
  layer.className = styles.journey;
  layer.dataset.connectionJourney = "";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-label", `Seguindo a conexão até ${label}`);
  const art = document.createElement("div"); art.className = styles.art; art.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas"); canvas.className = styles.canvas; canvas.setAttribute("aria-hidden", "true");
  const destination = document.createElement("div"); destination.className = styles.destination; destination.textContent = label; destination.setAttribute("aria-hidden", "true");
  const skip = document.createElement("button"); skip.type = "button"; skip.className = styles.skip; skip.textContent = "Pular ›";
  if (video) { video.className = styles.video; layer.append(art, video, canvas, destination, skip); }
  else layer.append(art, canvas, destination, skip);
  document.body.append(layer);
  const shell = document.querySelector<HTMLElement>(".site-shell");
  const wasInert = shell?.inert ?? false;
  const overflow = document.body.style.overflow;
  if (shell) shell.inert = true;
  document.body.style.overflow = "hidden";
  skip.focus({ preventScroll: true });

  const started = performance.now();
  let frame = 0, done = false, navigated = false;
  const go = () => { if (!navigated) { navigated = true; navigate(); } };
  const navTimer = window.setTimeout(go, 125);
  const endTimer = window.setTimeout(finish, JOURNEY_MS);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (video) {
    video.onplaying = () => { if (!done) { layer.dataset.videoPlaying = "true"; cancelAnimationFrame(frame); } };
    video.onerror = () => { delete layer.dataset.videoPlaying; };
    video.currentTime = 0;
    void video.play().catch(() => { /* Poster and native particles remain; navigation never waits for playback. */ });
  }

  function finish() {
    if (done) return;
    done = true;
    clearTimeout(navTimer); clearTimeout(endTimer); cancelAnimationFrame(frame);
    if (video) { video.onplaying = null; video.onerror = null; video.pause(); video.removeAttribute("src"); video.load(); }
    layer.remove();
    if (shell) shell.inert = wasInert;
    document.body.style.overflow = overflow;
    document.removeEventListener("keydown", key);
    document.removeEventListener("visibilitychange", hidden);
    window.removeEventListener("pagehide", finish);
    window.removeEventListener("popstate", finish);
    reduced.removeEventListener("change", skipTrip);
    if (finishCurrent === finish) finishCurrent = undefined;
    const title = [...document.querySelectorAll<HTMLElement>("main h1")].find((el) => el.getClientRects().length > 0);
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  }
  function skipTrip() { go(); finish(); }
  function key(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); skipTrip(); }
    if (event.key === "Tab") { event.preventDefault(); skip.focus(); }
  }
  function hidden() { if (document.hidden) skipTrip(); }
  finishCurrent = finish;
  skip.addEventListener("click", skipTrip);
  document.addEventListener("keydown", key);
  document.addEventListener("visibilitychange", hidden);
  window.addEventListener("pagehide", finish, { once: true });
  window.addEventListener("popstate", finish, { once: true });
  reduced.addEventListener("change", skipTrip);

  const width = window.innerWidth, height = window.innerHeight;
  const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2_000_000 / (width * height)));
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  const cx = width * .7, cy = height * .44, size = Math.min(width, height);
  const gold = ctx.createLinearGradient(0, height, width, 0);
  [[0, "#f8e4b4"], [.18, "#bd802c"], [.32, "#fff5cf"], [.51, "#e7b45c"], [.7, "#fff6d6"], [1, "#be883f"]].forEach(([stop, color]) => gold.addColorStop(Number(stop), String(color)));
  function draw(now: number) {
    if (done || !ctx || layer.dataset.videoPlaying === "true") return;
    const t = Math.min(1, (now - started) / JOURNEY_MS);
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = Math.min(1, t * 8) * Math.min(1, (1 - t) * 6);
    // Perspective projection: forward-moving rings grow as their depth approaches the viewer.
    for (let i = 14; i >= 0; i--) {
      const z = ((i * .22 - t * 1.1 + 4) % 3.3) + .22;
      const radius = size * .31 / z;
      ctx.beginPath(); ctx.ellipse(cx, cy, radius, radius * 1.16, -.2 + t * .06, 0, Math.PI * 2);
      ctx.strokeStyle = "#fffae236"; ctx.lineWidth = Math.max(1, radius * .022); ctx.stroke();
      ctx.strokeStyle = gold; ctx.lineWidth = Math.max(.5, radius * .006); ctx.stroke();
    }
    // Every spark moves in depth along a curved fibre; none are static background specks.
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 90; i++) {
      const seed = i * 2.39996;
      const depth = ((i * .071 + t * 1.8) % 1.8) + .15;
      const r = size * .27 / depth;
      const angle = seed + depth * .45;
      const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r * 1.16;
      const tail = 1 + 8 / depth;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (x - cx) * tail * .008, y + (y - cy) * tail * .008);
      ctx.strokeStyle = i % 3 ? "#ffd987d4" : "#fffdf0"; ctx.lineWidth = Math.min(3, 1 / depth); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    if (t < 1) frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
}

