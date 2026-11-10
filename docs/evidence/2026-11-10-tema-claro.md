# Tema claro como padrão — 10/11/2026

Quarta rodada na branch `claude/melhorias-app-cristao-hio0um`, sobre `1e1bc5f`. Pedido do Alex: "Tem como por padrão o tema claro para o app? Escuro só se cliente mudar".

## O que mudou

- **O app abre no tema claro (Dia) para todo mundo**, mesmo num aparelho configurado para escuro. Noite e Sistema (seguir o aparelho) são escolhas de quem lê, no controle de aparência, guardadas no aparelho.
- Quem já tinha escolhido Dia, Noite ou Sistema continua com a escolha. Quem nunca escolheu, e vinha vendo Noite por causa da trava de 01/11, passa a ver Dia.
- A trava `NIGHT_MODE_ONLY` foi desligada, não removida: voltar a ela é mudar uma linha em `site/src/components/header/theme.ts`.
- O tema do primeiro HTML, do script que roda antes da pintura, da página de instalação, das cores da barra do navegador e do manifesto do app instalado saem todos de um lugar só (`DEFAULT_CHOICE` e `FIRST_THEME`).

## Comandos e resultados

Em `site/`, sobre o código final:

| Comando | Resultado |
| --- | --- |
| `npm run typecheck` | saída 0 |
| `npm run lint` | saída 0 |
| `npm run build` | saída 0: 85 arquivos, 1.395 testes passaram, 2 ignorados; 3.905 páginas estáticas; `check-dist` em 3.858 páginas |
| `npm run budget` | saída 0; `/arcos` 168.917 B de 168.960 (**43 B de margem**, eram 55); capa 164.102 B; capítulo 153.454 B; versículo 162.454 B |

`tests/theme-default.test.ts` foi reescrito para a regra nova: sem nada guardado, com valor desconhecido ou com armazenamento bloqueado, o tema é Dia; `dia`, `noite` e `sistema` guardados são respeitados; o manifesto sai com o fundo claro.

## Navegador (build de produção local, Chromium)

### Como o tema é escolhido: 27 verificações, nenhuma falha

Em 375 × 812 e 1440 × 900, num aparelho emulado com preferência **escura**:

- Primeira visita: `data-theme="dia"` e fundo claro já quando `DOMContentLoaded` dispara, nada guardado, e as duas cores da barra do navegador claras. Depois da hidratação, o mesmo em `<html>` e `<body>`.
- O controle de aparência diz "Dia" e oferece Sistema, Dia e Noite, com Dia marcado.
- Escolher **Noite**: aplicado na hora, guardado, barra do navegador escura; a página seguinte já abre escura antes de terminar de carregar.
- Escolher **Sistema** num aparelho escuro: escuro, guardado como escolha. Escolher **Dia**: claro, guardado.
- Um valor guardado que não é uma escolha, o armazenamento bloqueado e o JavaScript desligado: claro. A página de instalação sem JavaScript: clara.
- O manifesto do app instalado: fundo e barra claros.

### O tema claro, área por área: 70 verificações, nenhuma falha

35 rotas em cada largura (capa, leitura nas duas edições, versículo, interlinear, liturgia, coração, assistente, busca, explorar, céu 3D e 2D, mapa, cronologia, linha do tempo, temas, palavras, lado a lado, jornada, ponte, trilhas, mesa, caderno, salvos, planos, apoie, QR, dados, sobre, instalar). Todas abrem claras e sem rolagem lateral.

Contraste de cada texto visível contra a cor sólida pintada atrás dele (4,5:1; 3:1 para texto grande):

| Largura | Textos medidos | Abaixo da regra | Textos sobre imagem ou degradê (não medidos por este método) |
| --- | --- | --- | --- |
| 375 px | 10.522 | 0 | 67 |
| 1440 px | 11.044 | 0 | 67 |

Dos textos sobre imagem, 33 por largura são da capa; o título e a frase do hero foram medidos à parte, sobre a imagem pintada, na rodada anterior ([evidência](2026-11-10-hero-contexto-revisao.md)): em Dia, de 4,39:1 (segunda linha do título, texto grande) a 7,88:1.

As 70 capturas da varredura (35 rotas nas duas larguras) foram conferidas em folhas de contato. As janelas do céu continuam noturnas nos dois temas, de propósito (design §3): nas capturas, o céu 2D, a linha do tempo, a trilha "Antes do Natal", a Ponte e o painel de ligações do capítulo e do versículo.

### Regressão: os roteiros das rodadas anteriores, no mesmo build

| Roteiro | Verificações | Falhas |
| --- | --- | --- |
| Tema: escolha e varredura | 97 | 0 |
| Hero e contexto do versículo | 127 | 0 |
| Planos de leitura | 256 | 0 |
| Modo de leitura e tamanho do texto | 138 | 0 |
| Regressões da revisão | 19 | 0 |
| Diálogo de anotação | 36 | 0 |
| Caderno | 236 | 0 |
| **Total** | **909** | **0** |

Mudança no método: o contexto "Noite" dos roteiros passou a guardar a escolha `noite` antes de cada carga, como o controle de aparência faz, e o contexto "Dia" é o padrão. Nas rodadas anteriores era o contrário (Noite era o padrão e Dia era aplicado por cima depois da carga).

## Não verificado

- **Safari/WebKit, Firefox e aparelho físico.** Em especial a cor da barra de status e da tela de abertura do app instalado no iPhone e no Android, que dependem do manifesto e das metas.
- **Leitor de tela** e **Lighthouse**.
- **Texto sobre imagem** fora do hero da capa (67 textos por largura): este método não lê a cor de uma imagem.
- **O motivo da trava de 01/11.** O commit que a criou (`91570eb`, "stabilize night mode and unify reading contrast") não lista o que faltava no tema claro. A varredura acima não achou texto abaixo da regra, mas não substitui a auditoria que estava prevista.
- **Estados internos** de cada área no tema claro (menus abertos, diálogos, erros, o céu 3D em uso): a varredura olha a primeira tela de cada rota; os roteiros de regressão cobrem os fluxos do Caderno, da leitura, dos planos, do hero e do contexto nos dois temas.
- **Prévia e produção na Vercel** deste commit.
