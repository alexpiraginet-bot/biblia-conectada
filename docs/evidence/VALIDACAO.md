# Validação da experiência viva

Data: 20/10/2026. Base: `5bbb11aeab592ba21dbf918cabe2eae56b0b9837`.

## Compilação e dados

- `npm run build`: sucesso, incluindo geração dos dados, **30 arquivos / 502 testes**, TypeScript, Next e verificação da distribuição.
- A verificação final conferiu 2.538 páginas pré-renderizadas e a página 404, números do atlas, livros, capítulos, versículos, conexões, créditos e busca.
- `npm run lint`: sucesso, sem mensagens de erro.
- `npm run budget`: todas as famílias de páginas abaixo do limite proposto de 165 KiB de JavaScript gzip. Capa: **157,2 KiB**; caminhos: **154,4 KiB**; cronologia: **153,0 KiB**; arcos: **163,4 KiB**.
- Oito WebPs: **987.000 bytes no total**. Hashes conferidos contra os registros de geração em `journey-assets.json`.
- Sem alterações nos textos de origem em `fontes/` ou `estudos/`.
- Logs completos: `final-build.log`, `final-budget.log`, `final-lint.log`.

## Navegação e apresentação

- Desktop 1440 × 1000 e telas estreitas de 375/390 px, temas Dia e Noite.
- Sem transbordamento horizontal nas rotas novas.
- Capa: navegação para os caminhos pelo botão principal, entrada das seções ao rolar e links de leitura.
- Grafo: seleção por clique e toque, vizinhos destacados, teclado, zoom e retorno à visão inicial. A seleção pelo toque usa o ponto visível mais próximo, corrigindo a sobreposição de alvos no celular.
- Mapa: seleção e restauração por hash, navegação entre paradas por teclado, zoom e retorno ao mapa, passagens e conexões reais.
- Cronologia: navegação entre momentos, seleção de evangelho, comparação simultânea dos quatro relatos disponíveis, estados de ausência e imagens carregadas.
- Leitor: navegar da cronologia para um versículo exibe a navegação de leitura; voltar restaura a navegação da jornada. Conferido na versão compilada.
- Voz: acionamento e interrupção conferidos na interface. A qualidade de pronúncia não foi auditada.
- Jornada: persistência, tentativas e pontuação única cobertas por testes; verificação interativa registrada adicionalmente na captura do percurso.

## Evidências visuais

- `home-desktop.png`: capa da versão compilada.
- `discover-desktop.png`: entradas para mapa, céu e cronologia.
- `chronology-mobile.png`: Caná em tela estreita, tema Dia.
- `graph-mobile-fixed.png`: grafo após a correção de toque.

## Limites

Revisão em Chromium nesta máquina. Não foram executados Safari/iPhone físico ou leitor de tela real. O percurso ilustrado é uma seleção inicial de dez momentos do Novo Testamento; o mapa reúne oito paradas, sem alegar uma reconstituição completa ou uma rota arqueológica exata. A pontuação é local ao navegador.

A execução dos testes do PR #8 do Claude e uma integração entre as branches não fazem parte destes resultados. A comparação de arquivos e os estados remotos estão em `../claude-coordination.md`.
