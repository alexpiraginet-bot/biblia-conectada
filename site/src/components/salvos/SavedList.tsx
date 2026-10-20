"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DownloadIcon, Icon } from "@/components/icons";
import { formatInt } from "@/lib/canon/text";
import { exportSalvos, parseSalvos, readRaw, removeSalvo, type Salvo, subscribeSalvos, writeSalvos } from "@/lib/salvos";
import styles from "./salvos.module.css";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

/** The passages saved on this device, read from localStorage after the page loads (the static page has none). */
export function SavedList() {
  // the snapshot is the stored string, which compares by value; null on the server and before hydration
  const raw = useSyncExternalStore(subscribeSalvos, () => readRaw() ?? "", () => null);
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState("");
  // focus never falls to the page when the button that had it goes away
  const focusTo = useRef<"cancel" | "clear" | "top" | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const clearRef = useRef<HTMLButtonElement>(null);
  const topRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const to = focusTo.current;
    if (!to) return;
    focusTo.current = null;
    ({ cancel: cancelRef, clear: clearRef, top: topRef })[to].current?.focus();
  });
  const setFocusTo = (to: "cancel" | "clear" | "top") => {
    focusTo.current = to;
  };
  if (raw === null) return <div className={styles.loading} aria-busy="true" />;
  const list = parseSalvos(raw);

  const remove = (s: Salvo) => {
    setStatus(writeSalvos(removeSalvo(list, s.id)) ? `${s.ref} apagado.` : "Este navegador não deixou apagar.");
    setFocusTo("top");
  };
  const clearAll = () => {
    setConfirming(false);
    setStatus(writeSalvos([]) ? "Todos os trechos foram apagados deste aparelho." : "Este navegador não deixou apagar.");
    setFocusTo("top");
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([exportSalvos(list, new Date())], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "salvos-biblia-conectada.json";
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <p className="visually-hidden" role="status">
        {status}
      </p>
      <h2 ref={topRef} tabIndex={-1} className="visually-hidden">
        Trechos salvos
      </h2>
      {list.length === 0 ? (
        <div className={styles.empty}>
          <Icon name="bookmark" className={`bc-icon ${styles.emptyIcon}`} />
          <p className={styles.emptyTitle}>Nenhum trecho salvo neste aparelho.</p>
          <p className={styles.emptyText}>
            Num capítulo, selecione um trecho do texto e escolha “Salvar”. Ele aparece aqui, com a referência e o dia.
          </p>
          <div className={styles.actions}>
            <Link href="/genesis/1" className="bc-button bc-button--primary">
              Abrir Gênesis 1
            </Link>
            <Link href="/ler" className="bc-button bc-button--secondary">
              Ver os livros
            </Link>
          </div>
        </div>
      ) : (
        <>
          <h3 className="bc-section-title">
            {list.length === 1 ? "1 trecho salvo" : `${formatInt(list.length)} trechos salvos`}
            <small>do mais recente ao mais antigo</small>
          </h3>
          <ol className={styles.list}>
            {list.map((s) => (
              <li key={s.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <Link href={s.path} className={styles.ref}>
                    {s.ref}
                  </Link>
                  <button type="button" className={`bc-button bc-button--ghost ${styles.remove}`} onClick={() => remove(s)} aria-label={`Apagar ${s.ref}`}>
                    Apagar
                  </button>
                </div>
                <blockquote className={styles.quote}>{s.texto}</blockquote>
                <p className={`bc-meta ${styles.when}`}>Salvo em {dateFmt.format(new Date(s.salvoEm))} · Bíblia Livre</p>
              </li>
            ))}
          </ol>
          <div className={styles.tools}>
            <button type="button" className="bc-button bc-button--secondary" onClick={download}>
              <DownloadIcon />
              Baixar (JSON)
            </button>
            {confirming ? (
              <span className={styles.confirm} role="group" aria-label="Confirmar">
                <span className={styles.confirmText}>
                  Apagar {list.length === 1 ? "o trecho salvo" : `os ${formatInt(list.length)} trechos salvos`}?
                </span>
                <button type="button" className={`bc-button bc-button--secondary ${styles.danger}`} onClick={clearAll}>
                  Apagar tudo
                </button>
                <button
                  ref={cancelRef}
                  type="button"
                  className="bc-button bc-button--secondary"
                  onClick={() => {
                    setConfirming(false);
                    setFocusTo("clear");
                  }}
                >
                  Cancelar
                </button>
              </span>
            ) : (
              <button
                ref={clearRef}
                type="button"
                className="bc-button bc-button--secondary"
                onClick={() => {
                  setConfirming(true);
                  setFocusTo("cancel");
                }}
              >
                Apagar tudo deste aparelho
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
