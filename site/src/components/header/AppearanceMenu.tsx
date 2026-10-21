"use client";

import { useEffect, type RefObject } from "react";
import { Icon } from "@/components/icons";
import { APPEARANCE_CHOICES as CHOICES } from "./appearance-choices";
import type { Choice } from "./theme";

type Props = {
  id: string;
  choice: Choice;
  root: RefObject<HTMLDivElement | null>;
  button: RefObject<HTMLButtonElement | null>;
  choose: (choice: Choice) => void;
  close: () => void;
};

/** The theme already applied before paint; only these menu interactions wait for its first opening. */
export default function AppearanceMenu({ id, choice, root, button, choose, close }: Props) {
  useEffect(() => {
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      button.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [root, button, close]);
  return <>
    <p className="appearance__title" id={`${id}-t`}>Aparência</p>
    <div className="bc-segmented" role="radiogroup" aria-labelledby={`${id}-t`} onKeyDown={(event) => {
      const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      event.preventDefault();
      const index = (CHOICES.findIndex((item) => item.value === choice) + step + CHOICES.length) % CHOICES.length;
      choose(CHOICES[index].value);
      (event.currentTarget.querySelectorAll("button")[index] as HTMLButtonElement | undefined)?.focus();
    }}>
      {CHOICES.map((item) => <button key={item.value} type="button" role="radio" aria-checked={item.value === choice}
        tabIndex={item.value === choice ? 0 : -1} onClick={() => choose(item.value)}>
        <Icon name={item.icon} />{item.label}
      </button>)}
    </div>
    <p className="appearance__note">{choice === "sistema" ? "Segue o ajuste claro ou escuro do aparelho." : "Guardado neste aparelho."}</p>
  </>;
}
