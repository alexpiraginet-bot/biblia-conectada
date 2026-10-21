import type { IconName } from "@/components/icons";
import type { Choice } from "./theme";

export const APPEARANCE_CHOICES: { value: Choice; label: string; icon: IconName }[] = [
  { value: "sistema", label: "Sistema", icon: "device" },
  { value: "dia", label: "Dia", icon: "sun" },
  { value: "noite", label: "Noite", icon: "moon" },
];
