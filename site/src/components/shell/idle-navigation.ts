/** Let the mobile reading surface breathe without moving its text or consuming the waking gesture. */
export function idleNavigation(bar: HTMLElement) {
  const mobile = window.matchMedia("(max-width: 63.99rem)");
  let timer = 0;
  let pressed = false;
  let frame = 0;
  function wake(event?: Event) {
    if (event?.type === "pointerdown") {
      pressed = true;
      if (bar.hasAttribute("data-idle")) bar.dataset.waking = "";
    }
    if (event?.type === "pointerup" || event?.type === "pointercancel") {
      pressed = false;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { delete bar.dataset.waking; });
    }
    delete bar.dataset.idle;
    window.clearTimeout(timer);
    if (!mobile.matches) return;
    timer = window.setTimeout(() => {
      // A disclosure, held gesture or keyboard user must never lose their controls.
      if (!pressed && !bar.querySelector("details[open], :focus-visible")) bar.dataset.idle = "";
    }, 1500);
  }
  const events = ["pointerdown", "pointermove", "pointerup", "pointercancel", "scroll", "keydown", "focusin"];
  const options = { capture: true, passive: true };
  for (const name of events) document.addEventListener(name, wake, options);
  mobile.addEventListener("change", wake);
  wake();
  return () => {
    window.clearTimeout(timer);
    cancelAnimationFrame(frame);
    for (const name of events) document.removeEventListener(name, wake, options);
    mobile.removeEventListener("change", wake);
    delete bar.dataset.idle;
    delete bar.dataset.waking;
  };
}
