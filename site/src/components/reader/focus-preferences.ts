export type ReadingPaper = "paper" | "sepia" | "night";
export type FocusPreferences = { paper: ReadingPaper; size: number };
export const FOCUS_PREFERENCES_KEY = "bc:reading-focus:v1";
export const DEFAULT_FOCUS_PREFERENCES: FocusPreferences = { paper: "paper", size: 21 };

export function parseFocusPreferences(raw: string | null): FocusPreferences {
  try {
    const value = JSON.parse(raw ?? "null");
    return {
      paper: ["paper", "sepia", "night"].includes(value?.paper) ? value.paper : "paper",
      size: Number.isInteger(value?.size) && value.size >= 18 && value.size <= 28 ? value.size : 21,
    };
  } catch { return DEFAULT_FOCUS_PREFERENCES; }
}
