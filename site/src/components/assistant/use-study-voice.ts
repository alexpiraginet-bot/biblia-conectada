"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { AssistantAudio } from "@/lib/assistant/types";
import { StudyVoice } from "./study-voice";

export function useStudyVoice() {
  const [player] = useState(() => new StudyVoice());
  const state = useSyncExternalStore(player.subscribe, player.snapshot, player.serverSnapshot);
  const [available, setAvailable] = useState(false);
  const [enabled, setVoiceEnabled] = useState(true);
  useEffect(() => () => player.dispose(), [player]);
  return {
    state, available, setAvailable, enabled,
    setEnabled(value: boolean) { setVoiceEnabled(value); if (!value) player.stop(); },
    prepare(requestId: string) { if (enabled) player.prepare(requestId); else player.stop(); },
    receive(requestId: string, audio?: AssistantAudio) { if (enabled) player.receive(requestId, audio); },
    replay: player.replay, stop: player.stop,
  };
}
export type StudyVoiceController = ReturnType<typeof useStudyVoice>;
