"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icons";
import styles from "./HomeGuide.module.css";

const STEPS = [
  {
    label: "Leitura",
    title: "Comece pelo texto.",
    text: "Escolha um livro e um capítulo. Leia a passagem no seu ritmo e siga as referências quando quiser aprofundar a leitura.",
    hint: "Um bom começo: ler o trecho inteiro antes de seguir uma conexão.",
    href: "/ler",
    action: "Abrir a Bíblia",
  },
  {
    label: "Constelação",
    title: "Uma passagem encontra outra.",
    text: "Toque num ponto da constelação desta página para destacar suas ligações. Abra uma referência e confira o que os textos dizem juntos.",
    hint: "As linhas mostram referências cruzadas. A interpretação começa com a leitura.",
    href: "#atlas-vivo",
    action: "Explorar a constelação",
  },
  {
    label: "Céu em 3D",
    title: "Veja a Bíblia de outro ângulo.",
    text: "Navegue pelo céu de ligações, aproxime a visão e selecione uma passagem para acompanhar suas conexões.",
    hint: "Você pode pausar as luzes e usar as opções de leitura da experiência.",
    href: "/arcos",
    action: "Entrar no céu em 3D",
  },
  {
    label: "Mapa de Jesus",
    title: "A história também tem lugares.",
    text: "Explore uma seleção de lugares e episódios dos evangelhos. Toque numa parada do mapa para conhecer o relato e abrir a passagem.",
    hint: "O mapa é um guia de leitura; algumas localizações são aproximadas.",
    href: "/caminhos",
    action: "Pelos caminhos de Jesus",
  },
  {
    label: "Cronologia",
    title: "Acompanhe a história de perto.",
    text: "Siga um percurso de leitura pela vida de Jesus e compare os relatos disponíveis nos evangelhos para cada episódio.",
    hint: "A sequência organiza a leitura, sem estabelecer datas exatas para cada acontecimento.",
    href: "/cronologia",
    action: "Abrir a cronologia",
  },
  {
    label: "Desafios",
    title: "Uma pergunta para olhar de novo.",
    text: "Leia o trecho, responda aos desafios desta página e acompanhe suas descobertas. O progresso fica guardado neste navegador.",
    hint: "A resposta vem do texto: você pode voltar à passagem antes de escolher.",
    href: "#sua-jornada",
    action: "Experimentar os desafios",
  },
  {
    label: "Estudo com IA",
    title: "Leve suas perguntas ao texto.",
    text: "Toque em Entender com IA junto a um versículo. Peça uma explicação bem simples, contexto bíblico ou uma reflexão para o dia a dia. Leia ou ouça a resposta, com referências à vista.",
    hint: "A IA apoia o estudo cristão e pode errar. As cenas usam ilustrações do acervo; não são vídeos gerados.",
    href: "/assistente",
    action: "Estudar com IA",
  },
  {
    label: "Salvos",
    title: "Guarde um caminho para voltar.",
    text: "Salve as passagens que deseja reler e encontre-as reunidas em Salvos. A lista fica neste aparelho, guardada pelo navegador.",
    hint: "Limpar os dados do site apaga os salvos e o progresso local.",
    href: "/salvos",
    action: "Ver meus salvos",
  },
] as const;

const MODES = [
  ["Entenda a passagem", "Contexto e palavras, com clareza."],
  ["Explore comigo", "Perguntas e conexões para seguir."],
  ["Conte a história", "Leitura em cenas ilustradas."],
] as const;

/** Home-only introduction. Availability is confirmed on /assistente, never inferred here. */
export function HomeGuide() {
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabList = useRef<HTMLDivElement>(null);
  const step = STEPS[active];
  const panelId = `${uid}-panel`;

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    let next: number;
    if (event.key === "ArrowRight") next = (active + 1) % STEPS.length;
    else if (event.key === "ArrowLeft") next = (active - 1 + STEPS.length) % STEPS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = STEPS.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabList.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <section className={styles.guide} id="estudar-com-ia" aria-labelledby={`${uid}-title`}>
      <div className={styles.companion}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Seu companheiro de estudo · IA</p>
          <h2 id={`${uid}-title`}>Uma boa pergunta<br />leva mais longe.</h2>
          <p className={styles.lead}>Ajuda em cada versículo: palavras simples, contexto bíblico ou reflexões para o dia a dia. Em texto e na voz do seu aparelho.</p>
          <Link className={styles.primary} href="/assistente" prefetch={false}>
            Estudar com IA <Icon name="out" />
          </Link>
        </div>
        <div className={styles.modes}>
          <p className={styles.modeHeading}>Escolha como aprofundar</p>
          <ol>
            {MODES.map(([title, description], index) => (
              <li key={title}>
                <span className={styles.modeNumber} aria-hidden="true">0{index + 1}</span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ol>
          <p className={styles.sourceNote}>Leia as referências e confira cada interpretação.</p>
        </div>
      </div>

      <details className={styles.tour} id="como-funciona">
        <summary>
          <span><span className={styles.summaryEyebrow}>Um pequeno guia</span><span className={styles.summaryTitle}>Como nossa Bíblia funciona</span></span>
          <span className={styles.expand} aria-hidden="true">+</span>
        </summary>
        <div className={styles.tourBody}>
          <div className={styles.tabs} role="tablist" aria-label="Experiências da Bíblia Conectada" ref={tabList} onKeyDown={onTabKeyDown}>
            {STEPS.map((item, index) => (
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
            <p role="status" aria-live="polite" aria-atomic="true"><span className={styles.srOnly}>{step.label}. Etapa </span>{active + 1} <span>de</span> {STEPS.length}</p>
            <button type="button" onClick={() => setActive((active + 1) % STEPS.length)}><span>{active === STEPS.length - 1 ? "Recomeçar" : "Próxima"}</span><Icon name="chev-r" /></button>
          </div>
        </div>
      </details>
    </section>
  );
}
