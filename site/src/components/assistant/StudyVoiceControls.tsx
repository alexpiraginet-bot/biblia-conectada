"use client";
import type { StudyVoiceController } from "./use-study-voice";
import styles from "./StudyVoiceControls.module.css";

export function StudyVoiceControls({ voice }: { voice: StudyVoiceController }) {
  if (!voice.available) return null;
  const { state } = voice;
  const active = ["waiting", "generating", "playing"].includes(state.status);
  return <div className={styles.voice}>
    <div className={styles.actions}>
      <button type="button" aria-pressed={voice.enabled} onClick={() => voice.setEnabled(!voice.enabled)}>{voice.enabled ? "Voz ligada" : "Voz desligada"}</button>
      {active && <button type="button" onClick={voice.stop}>Parar áudio</button>}
      {(state.status === "blocked" || state.status === "ready") && <button type="button" onClick={() => voice.replay()}>Ouvir resposta</button>}
    </div>
    <small role="status">{state.partial && <span>Trecho inicial em áudio · </span>}{voice.enabled || state.status !== "idle" ? state.message : "Ative para ouvir as próximas respostas · Voz gerada por IA"}</small>
  </div>;
}
