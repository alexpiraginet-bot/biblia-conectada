"use client";

import { useState } from "react";
import { clearDevice } from "@/lib/community/store";
import styles from "./community.module.css";

// One line on every community page: what it keeps stays on this device, and one button erases it (two taps).
export function DeviceNote({ children = "O progresso fica só neste aparelho: sem conta, sem servidor." }: { children?: React.ReactNode }) {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  return (
    <div className={styles.device}>
      <p>{children}</p>
      {step === "confirm" ? (
        <>
          <button
            type="button"
            className="bc-button bc-button--ghost"
            onClick={() => {
              clearDevice();
              setStep("done");
            }}
          >
            Confirmar: apagar tudo
          </button>
          <button type="button" className="bc-button bc-button--ghost" onClick={() => setStep("idle")}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="bc-button bc-button--ghost" onClick={() => setStep("confirm")}>
          Apagar tudo deste aparelho
        </button>
      )}
      <p role="status" className={styles.status}>
        {step === "done" ? "Apagado. Nada da Ponte, da trilha ou da mesa ficou neste aparelho." : ""}
      </p>
    </div>
  );
}
