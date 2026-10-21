"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icons";
import styles from "./HomeGuide.module.css";

type Step = { label: string; title: string; text: string; hint: string; href: string; action: string };

/** Only the tab interactions run in the browser; explanatory copy is supplied by the server. */
export function HomeTour({ steps }: { steps: readonly Step[] }) {
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabList = useRef<HTMLDivElement>(null);
  const step = steps[active];
  const panelId = `${uid}-panel`;

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number;
    if (event.key === "ArrowRight") next = (active + 1) % steps.length;
    else if (event.key === "ArrowLeft") next = (active - 1 + steps.length) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabList.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }


  return (
        <div className={styles.tourBody}>
          <div className={styles.tabs} role="tablist" aria-label="Experiências da Bíblia Conectada" ref={tabList} onKeyDown={onTabKeyDown}>
            {steps.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="tab"
                id={`${uid}-tab-${index}`}
                aria-label={`${index + 1}. ${item.label}`}
                aria-selected={active === index}
                aria-controls={panelId}
                tabIndex={active === index ? 0 : -1}
                onClick={() => setActive(index)}
              >
                <span aria-hidden="true">0{index + 1}</span>
                <span className={styles.tabLabel}>{item.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.stage} id={panelId} role="tabpanel" aria-labelledby={`${uid}-tab-${active}`} tabIndex={0}>
            <span className={styles.stageNumber} aria-hidden="true">0{active + 1}</span>
            <div className={styles.stageCopy}>
              <p className={styles.stageLabel}>{step.label}</p>
              <h3>{step.title}</h3>
              <p className={styles.description}>{step.text}</p>
              <p className={styles.hint}>{step.hint}</p>
              <Link className={styles.destination} href={step.href} prefetch={false}>{step.action}<Icon name="out" /></Link>
            </div>
          </div>

          <div className={styles.controls}>
            <button type="button" onClick={() => setActive(active - 1)} disabled={active === 0}><Icon name="chev-l" /><span>Anterior</span></button>
            <p role="status" aria-live="polite" aria-atomic="true"><span className={styles.srOnly}>{step.label}. Etapa </span>{active + 1} <span>de</span> {steps.length}</p>
            <button type="button" onClick={() => setActive((active + 1) % steps.length)}><span>{active === steps.length - 1 ? "Recomeçar" : "Próxima"}</span><Icon name="chev-r" /></button>
          </div>
        </div>
  );
}
