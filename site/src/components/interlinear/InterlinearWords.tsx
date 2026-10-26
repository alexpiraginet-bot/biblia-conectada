"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { InterlinearPassage, InterlinearToken } from "@/lib/interlinear/types";
import styles from "./interlinear.module.css";

function WordDetail({ token, language, onClose }: { token: InterlinearToken; language: InterlinearPassage["language"]; onClose?: () => void }) {
  return <div className={styles.wordDetail} dir="ltr" onKeyDown={(event) => { if (event.key === "Escape") onClose?.(); }}>
    <div className={styles.detailTop}><span className={styles.eyebrow}>Um olhar mais perto</span>
      {onClose && <button className={styles.close} type="button" onClick={onClose} aria-label="Fechar detalhes da palavra">×</button>}
    </div>
    <p className={styles.detailOriginal} lang={language} dir={language === "he" ? "rtl" : "ltr"}>{token.original}</p>
    <p className={styles.detailGloss}>{token.gloss}</p>
    {token.note && <p className={styles.wordNote}>{token.note}</p>}
    <dl className={styles.wordFacts}>
      <div><dt>Forma de dicionário</dt><dd><bdi lang={language}>{token.lemma}</bdi></dd></div>
      {token.transliteration && <div><dt>Transliteração</dt><dd><bdi>{token.transliteration}</bdi></dd></div>}
      {token.grammarLabel && <div><dt>Nesta frase</dt><dd>{token.grammarLabel}</dd></div>}
      <div><dt>Referência de Strong</dt><dd>{token.strongs.length ? token.strongs.join(" · ") : "Sem número nesta unidade"}</dd></div>
    </dl>
    <details className={styles.sourceDetail}>
      <summary>Conferir os dados da fonte</summary>
      <p><span>Morfologia</span><code>{token.morphology}</code></p>
      <p><span>Glosa da fonte, em inglês</span><bdi lang="en">{token.sourceGloss}</bdi></p>
      {token.sourceMeaningVariant && <p><span>Outra indicação de sentido na fonte</span><bdi lang="en">{token.sourceMeaningVariant}</bdi></p>}
      {token.sourceSpellingVariant && <p><span>Observação de grafia na fonte</span><bdi>{token.sourceSpellingVariant}</bdi></p>}
      <p className={styles.sourceHint}>A glosa em português acompanha o contexto desta passagem. O número de Strong identifica um verbete; não substitui a leitura da frase.</p>
    </details>
  </div>;
}

/** Only this study view hydrates; the original text and contextual glosses are server-rendered. */
export function InterlinearWords({ passage }: { passage: InterlinearPassage }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transliteration, setTransliteration] = useState(false);
  const wordButtons = useRef(new Map<string, HTMLButtonElement>());
  const mobileDetail = useRef<HTMLLIElement>(null);
  const selected = passage.tokens.find((token) => token.id === selectedId);
  useEffect(() => {
    if (!selectedId || !window.matchMedia("(max-width: 760px)").matches || !mobileDetail.current) return;
    // The shared document already has scroll-padding. Offset explicitly so it is not applied twice.
    const headerHeight = document.querySelector(".site-topbar")?.getBoundingClientRect().height ?? 64;
    const top = window.scrollY + mobileDetail.current.getBoundingClientRect().top - headerHeight - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [selectedId]);
  const clearSelection = () => {
    const button = selectedId ? wordButtons.current.get(selectedId) : undefined;
    setSelectedId(null);
    requestAnimationFrame(() => {
      button?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width: 760px)").matches) button?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
  };
  return <section aria-label={`Estudo palavra por palavra de ${passage.reference}`} data-interlinear-study="">
    <div className={styles.toolbar}>
      <div><span className={styles.eyebrow}>Sentido neste trecho</span><p>Toque numa palavra para conhecer seus detalhes.</p></div>
      <button type="button" className={styles.option} aria-pressed={transliteration} onClick={() => setTransliteration((value) => !value)}>
        <span aria-hidden="true">Aa</span> Transliteração <span className={styles.switch} aria-hidden="true" />
      </button>
    </div>
    <p className={styles.direction}>
      <span aria-hidden="true">{passage.direction === "rtl" ? "←" : "→"}</span>
      {passage.direction === "rtl" ? "Leia o hebraico da direita para a esquerda." : "Leia o grego da esquerda para a direita."}
      <span>O português acompanha cada unidade.</span>
    </p>
    <div className={styles.wordWorkspace}>
      <div className={styles.wordsColumn}>
        <ol className={styles.words} dir={passage.direction} aria-label="Palavras na ordem do texto-base" data-interlinear-words="">
          {passage.tokens.map((token) => <Fragment key={token.id}>
            <li className={styles.wordUnit}>
              <button type="button" className={styles.word} aria-pressed={selectedId === token.id}
                ref={(element) => { if (element) wordButtons.current.set(token.id, element); else wordButtons.current.delete(token.id); }}
                aria-label={`${token.original}: ${token.gloss}. Ver detalhes`}
                onClick={() => setSelectedId((current) => current === token.id ? null : token.id)}
                onKeyDown={(event) => { if (event.key === "Escape") clearSelection(); }} data-token-id={token.id}>
                <span className={styles.original} lang={passage.language} dir={passage.direction}>{token.original}</span>
                {transliteration && <bdi className={styles.transliteration} dir="ltr">{token.transliteration}</bdi>}
                <bdi className={styles.gloss} dir="ltr">{token.gloss}</bdi>
                <span className={styles.wordMark} aria-hidden="true" />
              </button>
            </li>
            {selectedId === token.id && <li className={styles.mobileDetail} ref={mobileDetail}>
              <WordDetail token={token} language={passage.language} onClose={clearSelection} />
            </li>}
          </Fragment>)}
        </ol>
        <p className={styles.contextHint}>Palavras se esclarecem na frase. Leia os sentidos próximos e compare com o texto completo abaixo.</p>
      </div>
      <aside className={styles.desktopDetail} aria-label="Detalhes da palavra selecionada">
        {selected ? <WordDetail token={selected} language={passage.language} onClose={clearSelection} />
          : <div className={styles.emptyDetail}><span aria-hidden="true" className={styles.emptyGlyph}>↗</span><h2>Uma palavra.<br /><em>Mais contexto.</em></h2><p>Escolha uma palavra para ver sua forma, função e observações de sentido.</p><span className={styles.emptyLine} aria-hidden="true" /></div>}
      </aside>
    </div>
    <span className="visually-hidden" role="status">{selected ? `Selecionada: ${selected.original}, ${selected.gloss}.` : "Nenhuma palavra selecionada."}</span>
    <noscript><details className={styles.noScript}><summary>Consultar os detalhes das palavras</summary>
      <p>O texto e os sentidos estão disponíveis. Com JavaScript desativado, consulte os detalhes nesta lista.</p>
      {passage.tokens.map((token) => <WordDetail key={token.id} token={token} language={passage.language} />)}
    </details></noscript>
  </section>;
}
