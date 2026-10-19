# Product

<!-- impeccable:product-schema 1 -->

Registro de produto da skill impeccable (`/impeccable shape`, 19/10/2026). Os detalhes e o plano estão em `HANDOFF.md`; a direção visual, em `design/README.md`.

## Platform

web

## Stack

Next.js 16 (App Router) na Vercel, subdomínio gratuito `*.vercel.app`. Escolha do Alex em 19/10/2026 (a recomendação anterior era Astro).

## Users

- Gente que chega pelos Reels dos dois vídeos ("A Bíblia, conectada" e "Antes do Natal, já estava escrito"), no celular, com 4G, em PT-BR.
- Estudantes e curiosos que querem seguir as ligações de um texto.

## Product Purpose

Abrir qualquer versículo e seguir as ligações dele (referências cruzadas, depois lugares, pessoas e eventos), no modelo de notas do Obsidian: ligações de saída e de entrada, grafo local e prévia. Sucesso é a pessoa ir de um versículo a outro e entender por que estão ligados.

## Positioning

Os arcos dos vídeos viram algo que se toca: os 301.539 pares de versículos ligados, navegáveis, em português, montadas só com fontes livres e com todo número calculado por código a partir delas.

## Operating Context

- Chegada típica: um link de versículo vindo de um post, aberto no celular.
- Leitura longa do texto bíblico (BLIVRE) e saltos curtos entre versículos ligados.
- Visões pesadas (céu de ligações, grafo, arcos, mapa) só sob demanda.

## Capabilities and Constraints

- Texto principal: Bíblia Livre (BLIVRE, CC BY 4.0). Traduções protegidas nunca entram (Lei 9.610/98).
- Grade canônica KJV/OpenBible: 66 livros, 1.189 capítulos, 31.102 versículos.
- Créditos visíveis no rodapé e em `/sobre`, com o texto exato do `ATTRIBUTION.md`.
- Todo número do site vem do pipeline (`site/scripts/build-data.ts`) e tem teste.
- Imagens: sem rostos de crianças; recriações marcadas como "Recriação".
- Comprar domínio ou mudar de plano só com aprovação do Alex.

## Brand Commitments

- A cara dos vídeos: ouro `#FFCC6B`, céu noturno, arcos em vitral, Space Grotesk / Space Mono / Cormorant (OFL). Quem vem do Reels precisa reconhecer.
- O que faria o site parecer errado, mesmo bem acabado (respostas do Alex em 19/10):
  - app devocional genérico (fundo creme, ornamentos, versículo do dia, tom de pregação);
  - dashboard tech frio (neon, grade de cards, cara de ferramenta de dev);
  - perder a cara dos vídeos;
  - lento ou pesado no celular.
- Tom proposto, ainda não confirmado: claro, de estudo, sem jargão, sem "maior do mundo" sem prova.

## Evidence on Hand

- Os dois vídeos, capas e números em `estudos/` (`stats.json`, `natal-stats.json`).
- As bases livres em `fontes/` (com SHA-256) e as referências cruzadas OpenBible.info.
- Não existem depoimentos, métricas de uso ou imprensa: não inventar.

## Product Principles

1. O texto vem primeiro: a leitura funciona sem JavaScript e sem esperar as visões pesadas.
2. Toda ligação mostra o número em texto e diz qual definição usa.
3. Um momento memorável só (o céu de ligações); o resto é quieto e preciso.
4. Só fontes livres, com crédito; na dúvida, fica fora.

## Accessibility & Inclusion

O checklist de `design/README.md` §8: contraste AA conferido por código, foco visível, navegação completa por teclado, alternativa em lista para grafo, arcos e mapa, `prefers-reduced-motion` respeitado, alvos de toque de 44 px. Critério da Fase 2: Lighthouse acessibilidade ≥ 95.
