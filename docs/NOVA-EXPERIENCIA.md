# Bíblia Conectada — uma história viva

Direção solicitada por Alex em 20/10/2026: uma Bíblia moderna, encantadora, interativa, ilustrada e acessível também para quem está começando. As passagens, os lugares, a cronologia e as referências cruzadas devem formar uma experiência contínua. Pontos recompensam o aprendizado; o texto permanece o centro da experiência.

## Entrega desta versão

- **Capa:** tipografia expressiva, floresta/menta/papel, constelação de capítulos reais, caminhos visuais para explorar e revelações suaves no scroll.
- **Constelação:** recorte calculado do grafo real de capítulos, destaque dos vizinhos, zoom, arrasto, foco por teclado e lista equivalente. O toque é resolvido pela posição do ponto visível, para não selecionar outro botão sobreposto no celular.
- **`/caminhos`:** oito paradas pelos relatos dos evangelhos, mapa SVG próprio com coordenadas documentadas, seleção por URL, texto BLIVRE, paralelos e conexões verificadas. A linha é um roteiro de leitura ilustrativo; não representa uma rota arqueologicamente comprovada.
- **`/cronologia`:** dez momentos da vida de Jesus, seleção e comparação dos quatro evangelhos. Episódios ausentes e passagens apenas relacionadas são identificados. Datas dos acontecimentos e propostas de composição dos evangelhos ficam em camadas distintas.
- **Escuta:** “Ouvir passagem” usa a voz disponível no aparelho, apenas após clicar. Mudar a seleção ou sair interrompe a leitura. A disponibilidade e a qualidade dependem do navegador/sistema.
- **Descobertas:** três desafios iniciais, 20 pontos por acerto na primeira tentativa, níveis e distintivo. Conclusões e tentativas são salvas no navegador, sem cadastro. Recarregar não permite repetir a pontuação.
- **Ilustrações:** produção local FLUX/ComfyUI, imagens otimizadas, carregamento sob demanda e identificação como recriações artísticas.
- **Leitura existente:** os livros completos, busca, salvos, Ponte, atlas e céu de conexões continuam disponíveis. O atlas de Isaías 9 fica em uma seção expansível da capa.

Esta primeira seleção ilustrada cobre momentos do Novo Testamento. Ela não se apresenta como cronologia integral de toda a Bíblia ou catálogo completo das viagens de Jesus.

## Direção visual e referências

As referências foram estudadas como padrões de interação; o código desta entrega foi escrito para a base existente, sem importar uma biblioteca de componentes.

- [21st — Container Scroll Animation](https://preview.21st.dev/@manuarora700/components/container-scroll-animation): composição narrativa ligada ao scroll, adaptada com CSS e IntersectionObserver.
- [21st — Spotlight Card](https://mcp.21st.dev/@preetsuthar17/components/spotlight-card): resposta sutil à posição do ponteiro.
- [21st — Text Reveal](https://mcp.21st.dev/@dillionverma/components/text-reveal): entrada progressiva das seções.
- [21st — Interactive Hover Button](https://preview.21st.dev/@dillionverma/components/interactive-hover-button): botões com deslocamento curto e direção clara.
- [Obsidian — Graph view](https://obsidian.md/help/plugins/graph): explorar vizinhanças, acender conexões e reduzir o ruído ao focar um ponto.

Fontes já licenciadas e hospedadas pelo projeto: Space Grotesk, Newsreader e Literata. Movimento reduzido é respeitado. Não há rolagem capturada, áudio automático, modal de cadastro ou animação sobre o texto em leitura.

## Continuidade com o Claude

Base inicial: `main` em `5bbb11aeab592ba21dbf918cabe2eae56b0b9837`, merge do PR #7. Trabalho desta entrega na branch `codex/experiencia-viva`.

Durante a implementação foi identificado o [PR #8](https://github.com/alexpiraginet-bot/biblia-conectada/pull/8), do Claude, com correção do carregamento da leitura contínua. Acompanhamento detalhado em `claude-coordination.md`. Essa correção e seus arquivos foram preservados; nenhum merge em produção foi realizado por esta entrega.

Os documentos do Claude `HANDOFF.md` e `design/README.md` não foram reescritos. Este documento registra a nova direção sem substituir o histórico.

## Implementação e integridade

- Componentes interativos pequenos, mantendo os textos montados no servidor e usando os dados existentes.
- As fontes em `fontes/` e `estudos/` foram comparadas com os blobs Git. Nenhum texto de origem foi reescrito.
- `.gitattributes` mantém os bytes dos insumos que são verificados por SHA-256.
- Corrigidos separadores de caminho nas verificações e no processamento de dados para permitir validação no Windows.
- O fundo da escultura `/arcos` usa um token próprio, preservando a correspondência com seus pôsteres e renderizador.
- O shell usa o pathname real para decidir a navegação. Não depende de páginas antigas que o roteador pode manter escondidas no DOM.
- Sem dependências adicionais para a interface, o mapa, a gamificação ou a voz.

## Evidências e revisão

Testes de dados verificam os textos diretamente contra BLIVRE, a origem das conexões e a consistência das etapas. Testes de jornada cobrem tentativas, pontuação única e armazenamento. A revisão visual inclui tela estreita, desktop, temas claro/escuro e navegação entre rotas.

Uma crítica local com Gemma e Qwen foi usada como apoio. Apontamentos foram conferidos com código, testes e navegador; não foram tratados como prova. O problema confirmado de alvos sobrepostos no grafo foi reproduzido e corrigido, incluindo teste de toque emulado.

Capturas e resultados finais ficam em `docs/evidence/`. Critérios históricos detalhados e fontes estão em `cronologia-fontes.md`. Prompts, sementes e hashes das imagens ficam em `design/local-flux/`.

Limites da verificação: testes em navegadores Chromium nesta máquina; Safari/iPhone físico e leitor de tela real não foram executados. O funcionamento do botão de voz foi conferido, mas não houve auditoria humana da pronúncia.
