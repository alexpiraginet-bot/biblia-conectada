type SpeechState = { owner: string | null; failedOwner: string | null };
const idle: SpeechState = { owner: null, failedOwner: null };
let state = idle;
let active: SpeechSynthesisUtterance | null = null;
const listeners = new Set<() => void>();

export const speechSupport = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
export const speechSnapshot = () => state;
export const speechServerSnapshot = () => idle;
export function subscribeSpeech(notify: () => void) { listeners.add(notify); return () => { listeners.delete(notify); }; }

function publish(owner: string | null, failedOwner: string | null = null) {
  state = { owner, failedOwner };
  listeners.forEach((notify) => notify());
}

/** Ownership prevents an old player or its unmount from stopping a newer reading. */
export function stopStudySpeech(owner?: string) {
  if (owner !== undefined && state.owner !== owner) return;
  if (active) { active.onend = null; active.onerror = null; }
  active = null;
  if (speechSupport()) window.speechSynthesis.cancel();
  publish(null);
}

export function speakStudyText(owner: string, text: string) {
  stopStudySpeech();
  if (!speechSupport()) { publish(null, owner); return; }
  try {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = .94;
    const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase() === "pt-br");
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (active !== utterance) return;
      active = null;
      publish(null);
    };
    utterance.onerror = (event) => {
      if (active !== utterance) return;
      active = null;
      publish(null, event.error === "canceled" || event.error === "interrupted" ? null : owner);
    };
    active = utterance;
    publish(owner);
    window.speechSynthesis.speak(utterance);
  } catch {
    if (active) { active.onend = null; active.onerror = null; }
    active = null;
    publish(null, owner);
  }
}
