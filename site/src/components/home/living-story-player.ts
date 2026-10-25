/** Deferred, home-only enhancement. No canvas or animation library runs on the visitor's device. */
export function enhanceLivingStory(root: HTMLElement) {
  const video = root.querySelector<HTMLVideoElement>("[data-story-video]");
  const play = root.querySelector<HTMLButtonElement>("[data-story-play]");
  const status = root.querySelector<HTMLElement>("[data-story-status]");
  const media = root.querySelector<HTMLElement>("[data-story-media]");
  if (!video || !play || !status || !media) return () => {};
  const stages = [...root.querySelectorAll<HTMLButtonElement>("[data-story-stage]")];
  const controls = [...root.querySelectorAll<HTMLElement>("[data-story-controls]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let visible = false, disposed = false, started = root.dataset.storyStarted === "true", wanted = false;
  let failed = root.dataset.storyFailed === "true", buffering = false;
  let pendingSeek: number | null = null;
  let request = 0;
  controls.forEach((el) => { el.hidden = false; });
  video.muted = true;

  function update() {
    if (!video || !play) return;
    const state = failed ? "error" : video.ended ? "ended" : !video.paused ? "playing" : "paused";
    root.dataset.storyState = state;
    status!.textContent = failed ? "A animação não carregou. Você pode tentar de novo ou seguir pelos links." : buffering ? "Carregando animação…" : "";
    play.textContent = failed ? "Tentar animação novamente" : video.ended ? "Rever animação" : !video.paused ? "Pausar animação" : "Reproduzir animação";
    const stage = video.currentTime < 4.8 ? 0 : video.currentTime < 8.8 ? 1 : 2;
    stages.forEach((button, i) => button.setAttribute("aria-pressed", String(i === stage)));
  }
  function stop() {
    request++;
    video!.pause();
    buffering = false;
    update();
  }
  function load() {
    if (!video!.hasAttribute("src") || failed) {
      failed = false;
      delete root.dataset.storyFailed;
      video!.src = video!.dataset.src!;
      video!.load();
    }
  }
  async function resume() {
    if (disposed || !visible || document.hidden || !wanted) return;
    load();
    buffering = true;
    update();
    const ownRequest = ++request;
    try {
      await video!.play();
      if (disposed || ownRequest !== request) return;
      buffering = false;
      if (!wanted || !visible || document.hidden) video!.pause();
    } catch {
      if (disposed || ownRequest !== request) return;
      wanted = false; // Autoplay may be refused; the explicit play control stays usable.
      buffering = false;
    }
    if (!disposed) update();
  }
  function toggle() {
    status!.textContent = "";
    if (wanted) { wanted = false; stop(); return; }
    started = true;
    root.dataset.storyStarted = "true";
    wanted = true;
    if (video!.ended) video!.currentTime = 0;
    void resume();
  }
  function seek(event: Event) {
    wanted = false;
    started = true;
    root.dataset.storyStarted = "true";
    stop();
    const button = event.currentTarget as HTMLButtonElement;
    pendingSeek = Number(button.dataset.time);
    status!.textContent = "";
    load();
    applySeek();
  }
  function applySeek() {
    if (pendingSeek === null || !video!.readyState) return;
    video!.currentTime = pendingSeek;
    pendingSeek = null;
    update();
  }
  function onVisibility() { if (document.hidden) stop(); else void resume(); }
  function onPreference() { if (reduced.matches) { wanted = false; stop(); } }
  function onEnd() { wanted = false; update(); }
  function onWaiting() { buffering = true; update(); }
  function onReady() { buffering = false; update(); }
  function onError() {
    failed = true;
    root.dataset.storyFailed = "true";
    wanted = false;
    status!.textContent = "A animação não carregou. Você pode tentar de novo ou seguir pelos links.";
    update();
  }
  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0);
    if (!visible) { stop(); return; }
    const autoplayVisible = entries.some((entry) => entry.intersectionRatio >= .25);
    if (autoplayVisible && !started && !reduced.matches && !connection?.saveData) { started = true; root.dataset.storyStarted = "true"; wanted = true; }
    void resume();
  }, { threshold: [0, .25] });
  observer.observe(media);
  play.addEventListener("click", toggle);
  stages.forEach((button) => button.addEventListener("click", seek));
  video.addEventListener("loadedmetadata", applySeek);
  video.addEventListener("timeupdate", update);
  video.addEventListener("play", update);
  video.addEventListener("pause", update);
  video.addEventListener("ended", onEnd);
  video.addEventListener("error", onError);
  video.addEventListener("waiting", onWaiting);
  video.addEventListener("seeking", onWaiting);
  video.addEventListener("playing", onReady);
  video.addEventListener("seeked", onReady);
  document.addEventListener("visibilitychange", onVisibility);
  reduced.addEventListener("change", onPreference);
  update();
  return () => {
    disposed = true;
    wanted = false;
    stop();
    observer.disconnect();
    play.removeEventListener("click", toggle);
    stages.forEach((button) => button.removeEventListener("click", seek));
    video.removeEventListener("loadedmetadata", applySeek);
    video.removeEventListener("timeupdate", update);
    video.removeEventListener("play", update);
    video.removeEventListener("pause", update);
    video.removeEventListener("ended", onEnd);
    video.removeEventListener("error", onError);
    video.removeEventListener("waiting", onWaiting);
    video.removeEventListener("seeking", onWaiting);
    video.removeEventListener("playing", onReady);
    video.removeEventListener("seeked", onReady);
    document.removeEventListener("visibilitychange", onVisibility);
    reduced.removeEventListener("change", onPreference);
    controls.forEach((el) => { el.hidden = true; });
  };
}
