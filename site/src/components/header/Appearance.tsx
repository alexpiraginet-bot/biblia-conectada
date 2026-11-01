"use client";

import { lazy, Suspense, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { APPEARANCE_CHOICES as CHOICES } from "./appearance-choices";
import { type Choice, THEME_COLOR, THEME_KEY } from "./theme";

const AppearanceMenu = lazy(() => import("./AppearanceMenu"));
const CHANGE = "bc:appearance";

function stored(): Choice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "dia" || t === "noite" ? t : "sistema";
  } catch {
    return "sistema";
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
  const choice = useSyncExternalStore<Choice>(subscribe, stored, () => "sistema");
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // A document rendered on the client never ran THEME_SCRIPT: Next.js sends the 404 of a reading route ("/x") as an
  // empty shell that the browser fills in. Apply the stored choice there too, before the first paint.
  useLayoutEffect(() => apply(stored()), [choice]);

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
        {open && <Suspense fallback={<p role="status">Abrindo aparência…</p>}>
          <AppearanceMenu id={id} choice={choice} root={root} button={button} choose={choose} close={() => setOpen(false)} />
        </Suspense>}
      </div>
    </div>
  );
}
