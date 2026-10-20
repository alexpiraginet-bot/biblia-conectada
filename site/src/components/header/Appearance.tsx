"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon, type IconName } from "@/components/icons";
import { type Choice, THEME_COLOR, THEME_KEY } from "./theme";

const CHOICES: { value: Choice; label: string; icon: IconName }[] = [
  { value: "sistema", label: "Sistema", icon: "device" },
  { value: "dia", label: "Dia", icon: "sun" },
  { value: "noite", label: "Noite", icon: "moon" },
];
const CHANGE = "bc:appearance";

function stored(): Choice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "dia" || t === "sistema" ? t : "noite";
  } catch {
    return "noite";
  }
}

/** The choice goes on <html> and on <body>: the [data-theme] rules then match <body> itself, so the browser recomputes
 *  it and everything that inherits from it, rather than trusting values it inherited before the switch (iPhone, 19/10). */
function apply(c: Choice) {
  for (const el of [document.documentElement, document.body]) {
    el.setAttribute("data-theme", c);
  }
  // the browser chrome: each meta keeps its own scheme under "sistema", else both take the chosen ground
  for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const light = (m.getAttribute("media") ?? "").includes("light");
    m.content = c === "sistema" ? THEME_COLOR[light ? "dia" : "noite"] : THEME_COLOR[c];
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE, cb);
  };
}

export function Appearance() {
  const choice = useSyncExternalStore<Choice>(subscribe, stored, () => "noite");
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // A document rendered on the client never ran THEME_SCRIPT: Next.js sends the 404 of a reading route ("/x") as an
  // empty shell that the browser fills in. Apply the stored choice there too, before the first paint.
  useLayoutEffect(() => apply(stored()), [choice]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = (c: Choice) => {
    try {
      localStorage.setItem(THEME_KEY, c);
    } catch {}
    apply(c);
    window.dispatchEvent(new Event(CHANGE));
  };
  const current = CHOICES.find((c) => c.value === choice) ?? CHOICES[0];

  return (
    <div className="appearance" ref={root}>
      <button
        ref={button}
        type="button"
        className="bc-icon-button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Aparência: ${current.label === "Sistema" ? "seguindo o aparelho" : current.label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={current.icon} />
      </button>
      <div id={id} className="appearance__menu" hidden={!open}>
        <p className="appearance__title" id={`${id}-t`}>
          Aparência
        </p>
        <div
          className="bc-segmented"
          role="radiogroup"
          aria-labelledby={`${id}-t`}
          onKeyDown={(e) => {
            const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const i = (CHOICES.indexOf(current) + step + CHOICES.length) % CHOICES.length;
            choose(CHOICES[i].value);
            (e.currentTarget.querySelectorAll("button")[i] as HTMLButtonElement | undefined)?.focus();
          }}
        >
          {CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={c.value === choice}
              tabIndex={c.value === choice ? 0 : -1}
              onClick={() => choose(c.value)}
            >
              <Icon name={c.icon} />
              {c.label}
            </button>
          ))}
        </div>
        <p className="appearance__note">
          {choice === "sistema" ? "Segue o ajuste claro ou escuro do aparelho." : "Guardado neste aparelho."}
        </p>
      </div>
    </div>
  );
}
