# Liturgia, menu e Jornada — evidências de 31/10/2026

## Escopo

Liturgia diária acolhedora, calendário e referências factuais com texto de estudo BLIVRE; menu central com catálogo completo; Jornada opcional sem cadastro, saldo no servidor, três atividades diárias e meta futura Mini Jesus da Bentô 3D Labs. A procedência do calendário é visível em uma seção própria, sem destaque denominacional na abertura. Compartilhamento por dia foi acrescentado após a primeira validação, a pedido de Alex.

As regras de licença e a atribuição do texto permanecem. Não houve edição de estudos/vídeos, chamadas de geração de IA, compra de serviço ou criação de banco pago. A Jornada reaproveita o Redis existente, em namespace separado do assistente. Nenhum prêmio está reservado ou disponível para resgate.

## Validação da base, anterior ao acréscimo do compartilhamento diário

- 878 testes em 62 arquivos passaram; compilação Next, TypeScript, lint e check-dist passaram. Check-dist conferiu 3.834 páginas prerenderizadas e a 404, números derivados, traduções e ausência dos trechos protegidos.
- 12 cenários de menu/liturgia: Chromium e WebKit, 375/1440 px, Dia/Noite, teclado/foco/Escape, no-JS, data inválida e repouso/retorno do menu em Arcos.
- Jornada: 12 cenários consolidados em `journey-verified/results.json`: oito telas, dois fallbacks sem JavaScript, indisponibilidade sem opt-in e integração com o serviço/Lua reais em Redis loopback.
- A integração cobriu navegação SPA, 180 segundos ativos na liturgia resultando em 40 pontos, pausa, rede interrompida, cache adulterado/data inválida, exclusão e perfil expirado. O relógio do servidor foi injetado pelo teste; não foram concedidos pontos em produção.
- 11 cenários do ledger executados em Redis real portátil, sem persistência ou serviço. Harness reproduzível em `site/scripts/check-journey-ledger.mjs`; testa concorrência, nonce, teto diário, virada de data, bônus, retenção e poda. O primeiro dia matematicamente possível para 4.800 pontos é o 68º; no 60º, o máximo é 4.240.
- Cinco cenários da API litúrgica conferiram datas e cada versículo com a base BLIVRE, incluindo livro ausente e recuperação de input inválido.
- Convite da home conferido em quatro combinações de tamanho/tema, sem overflow, IDs duplicados ou saldo paralelo das antigas perguntas.

## Desempenho da base

Teto inicial mantido em 168.960 B gzip9. Home 161.336 B, Arcos 167.232 B, Liturgia 144.268 B, Jornada 150.359 B. O menu acrescenta 982 B no primeiro clique. Esses valores são anteriores ao compartilhamento por dia; a medição final da publicação deve prevalecer.

O navegador também baixou scripts automaticamente: +40.145 B em Liturgia/Jornada e +56.149 B em Arcos. Total após menu em Arcos: 224.363 B. Adiamento não significa eliminação desses bytes. Antes do opt-in, não houve requisição à API da Jornada, chave local nem tracker; depois, +3.144 B e os pulsos esperados. Essa medição usou respostas locais interceptadas, sem nuvem.

## Artefatos e limites

Artefatos locais em `C:/Users/R2/.codex/visualizations/biblia-liturgia-20261031/`: logs de build/lint/orçamento, `release-layout/`, `journey-verified/`, `api-final.json`, `home-invite-results.json`, `rewards-repository-harness.json` e `PERFORMANCE-FINAL.md`. Prints mostrados ao Alex são renderizações reais locais. Execuções anteriores com falha de timing no harness foram preservadas e substituídas pela rodada consolidada.

WebKit automatizado não equivale a Safari em iPhone físico. FPS, bateria, LCP e carga concorrente de produção não foram medidos. A identificação anônima não oferece recuperação entre aparelhos; a nuvem confirma pontos, mas não prova leitura humana. Um resgate futuro exige identificação, estoque, regras e validação adicionais. Os textos da liturgia são estudo BLIVRE, não a redação oficial do lecionário.

## Publicação

Após o compartilhamento diário, 889 testes em 63 arquivos passaram. A compilação final e o check-dist passaram em 3.835 páginas; lint e orçamento passaram. Matriz de menu/liturgia repetida com 12/12 aprovações. Exclusão da Jornada com resposta atrasada e falha foi conferida novamente. O link `/dia` usa uma amostra de parâmetro válida para validar o shell no Next; leitura e metadados continuam em tempo de requisição.

Orçamento final local: Home 161.337 B; Arcos 167.233 B; Liturgia e rota de dia 145.448 B; Jornada 150.375 B gzip9. PNGs de 31/10 e Vigília Pascal foram renderizados e vistos em 1200×630 e 1080×1920, com domínio, referências reais, fonte e indicação dos recortes. A rota de data inválida usa o NotFound do Next: respostas já iniciadas por streaming podem ter HTTP 200 com noindex; isso não equivale a HTTP 404. A rota de imagem rejeita a data inválida.

Esta evidência de código registra a validação local. O PR de publicação deve registrar o commit integrado, o deploy READY e o smoke público; um push ou um build local não comprovam publicação.
