# Liturgia diária: um ritmo de leitura

## O que a página oferece

`/liturgia` consulta a celebração informada para o dia civil de **America/Sao_Paulo**, sem depender da data do build. `?date=AAAA-MM-DD` permite consultar uma data escolhida. A página pode chamar `getDailyLiturgy` no servidor; `/api/liturgia` devolve o mesmo contrato para integrações futuras.

São apresentados a celebração, a cor e as referências bíblicas do serviço comunitário **Liturgia Diária**, de Dancrf. Para estudo, a página oferece **Bíblia Livre (BLIVRE)** e **Biblica® Open Nova Bíblia Viva™**, sem apresentar nenhuma delas como lecionário oficial. A abertura é acolhedora e sem destaque denominacional, por pedido de Alex. A seção expansível **Sobre as leituras e suas fontes** declara claramente a origem católica do calendário no Brasil e dá acesso à CNBB para conferir a redação, a seleção de versos, os refrãos, as orações e outras celebrações.

## Escolha da edição — 01/11/2026

- O seletor fica na própria página, com links acessíveis: **Bíblia Livre · Versículos para estudo** e **Open NBV · Capítulos para contexto**. Funciona sem um controlador de cliente adicional.
- Ausência de `edition` seleciona BLIVRE. `edition=blivre` e `edition=open-nbv` são aceitos em `/liturgia`, `/dia/AAAA-MM-DD` e `/api/liturgia`. Valores desconhecidos, vazios ou repetidos são recusados explicitamente, antes da consulta ao calendário; a API retorna 400. Não há substituição silenciosa por outra edição.
- A data e a edição seguem nos links anterior/seguinte/hoje, formulário, tentativa após falha, URL de compartilhamento, capa e QR. A aba aberta durante a virada do dia atualiza a mesma URL/edição.
- Na Open NBV, `verseAlignment: unreviewed` permanece. O analisador BLIVRE identifica **somente os capítulos seguros**, descartando sua seleção de números de versos; o servidor valida esses capítulos contra o catálogo da Open NBV e carrega **todos os versos originais do capítulo**, inclusive posições adicionais. Não há destaque nem equivalência automática entre versos de edições diferentes.
- A referência litúrgica original permanece no cabeçalho. Cada leitura avisa que o capítulo é contexto e não o recorte do lecionário. Capítulos ficam em disclosures nativos; o primeiro capítulo da primeira leitura abre inicialmente e os atalhos das leituras continuam disponíveis, evitando impor todos os capítulos longos na rolagem.
- Salmos exigem o número de capítulo explicitamente pareado entre parênteses. Daniel, Ester, livros ausentes e notações não resolvidas continuam no acesso oficial. Erro de integridade/carregamento da edição não recebe texto emprestado de outra Bíblia.
- IA e imagem de cada verso mantêm caminhos `/ler/open-nbv/...`. A Open NBV oferece **Conexões do capítulo na BLIVRE**, identificando a mudança de edição; não cria conexões exatas de versículos presumidamente equivalentes. Na BLIVRE, a ação **Conexões** abre o painel no mesmo contexto, preservando texto, IA, compartilhamento e retorno.
- Os créditos integrais existentes da Open NBV, aviso da fonte original, marca e licença CC BY-SA 4.0 ficam visíveis no rodapé da leitura NBV. Nenhuma nova fonte bíblica foi importada nesta etapa.

**Alternativas externas reais:** **Texto litúrgico · CNBB ↗** abre o site oficial; **Ave-Maria ↗ · leitura externa** abre <https://claretianos.com.br/biblia-ave-maria-online/>. A interface explica a abertura em outro site. Não há opção interna desabilitada, iframe, cópia da Canção Nova/CNBB/Ave-Maria, download de texto protegido ou promessa de licença adquirida. Os links são gerais; não inventam suporte a data ou versículo no destino.

Testes acrescentados: `liturgy-editions.test.ts` cobre escolha e recusa de edições, resposta da API, capítulos integrais, posições adicionais NBV, referências entre capítulos, salmos pareados, livros não alinhados, falhas sem fallback e preservação da seleção BLIVRE. `liturgy-share.test.ts` e `app-links.test.ts` cobrem a edição nas capas, metadados e no conteúdo decodificado do QR. Build completo e validação visual desta etapa são registrados separadamente antes de publicação.

## Fonte, direitos e limites

- Documentação primária: <https://github.com/Dancrf/liturgia-diaria/blob/main/docs/v2/README.md>.
- Endpoint público: <https://liturgia.up.railway.app/v2/>; data sempre explícita nos parâmetros `dia`, `mes`, `ano`.
- Lecionário oficial: <https://liturgiadiaria.edicoescnbb.com.br/>. O visitante deve selecionar a mesma data nessa página; não se presume que uma query seja aceita por ela.
- A CNBB descreve seu site como baseado na tradução oficial: <https://www.cnbb.org.br/novo-site-da-liturgia-diaria-o-igreja-em-oracao-conta-com-elementos-graficos-modernos-e-mais-intuitivos-para-o-usuario/>.

Não se encontrou autorização aberta para republicar o conteúdo textual litúrgico retornado pela API. Por isso, **somente fatos de calendário e referências bibliográficas** passam pela integração. Não se incorpora código de terceiros nem se usa licença de software como licença para textos. Não são importados `texto`, `titulo`, `refrao`, `oracoes` ou `antifonas`. A BLIVRE conserva sua licença CC BY 4.0 e os créditos globais existentes. A procedência desta consulta factual está em `fontes/liturgia/provenance.json`.

O serviço comunitário não é uma API oficial da CNBB e pode conter divergências. A versão 2 oferece uma celebração por data e grupos de leituras; não cobre necessariamente todas as missas do Natal, vigílias, memórias facultativas ou costumes diocesanos. A interface não deve prometer um missal completo nem apresentar os grupos como ordem ritual da celebração.

## Referências e versificação

- Listas descontínuas e intervalos entre capítulos são analisados e validados contra a grade BLIVRE; cada versículo exibido é lido do arquivo local original.
- Letras como `18b` produzem o versículo **inteiro**, com aviso de contexto. A API pode omitir essas letras; o aviso geral da edição e a seção de fontes esclarecem que redação e recortes podem diferir do lecionário. Não se repete o mesmo aviso em cada referência simples.
- `Sl 41(42)` aponta para o **capítulo 42 completo** da BLIVRE, explicitamente como contexto. Não se presume alinhamento dos números dos versos, pois títulos podem ser contados de modo diferente. Sem dupla numeração, não se inventa a equivalência.
- Referências de livros ausentes da BLIVRE permanecem visíveis com acesso à CNBB. Não se excluem os deuterocanônicos do calendário e não se fabricam os textos.
- Daniel e Ester também ficam no acesso oficial: as adições gregas impedem assumir um alinhamento pela numeração sozinha.
- Notação não suportada, intervalo inválido ou texto local ausente não são convertidos por IA nem substituídos por outro versículo.
- Os extras da Vigília podem conter ritos não bíblicos sem referência. Eles são excluídos; as leituras adicionais com referência permanecem como grupo. Forma longa/breve e cantos continuam identificados pela referência original.

## Rede, cache e falhas

O servidor aceita apenas datas ISO válidas de 2020 a 2100. Host externo fixo, redirecionamentos rejeitados, timeout de 8 segundos e limite de resposta de 500 KB. A data devolvida pelo provedor precisa ser exatamente a solicitada; resposta incompleta é recusada.

A requisição externa usa `cache: no-store`. Seu corpo não é gravado em disco, log, cache Next ou enviado ao cliente. Após extrair e validar os fatos permitidos, somente eles entram em `use cache` por data, com revalidação de 15 minutos e expiração de uma hora. A resposta HTTP do endpoint do app é `no-store`, impedindo que o dia anterior apareça como hoje por cache de navegador/CDN. Não há segredo nem chamada de IA.

Em indisponibilidade, a página mostra a data consultada, permite tentar novamente e aponta à CNBB. Não inventa leituras, não troca silenciosamente por ontem e não transforma erro em uma lista vazia de celebrações. Input inválido não chega ao provedor.

## Verificações do núcleo (31/10/2026)

`tests/liturgy.test.ts` cobre virada de dia UTC/Brasília, anos bissextos, input inválido, host/cache/timeout, limite de bytes, HTTP/JSON inválidos, data divergente, referências descontínuas, subversos, capítulos múltiplos, dupla numeração dos Salmos, ausência de livros, ausência de textos protegidos na saída e comparação de todos os versos devolvidos com os arquivos BLIVRE.

Consultas reais passaram para 31/10, Todos os Santos (01/11), Finados (02/11), Natal (25/12) e Vigília Pascal (04/04) de 2026. Na Vigília, os salmos sem dupla numeração e Baruc ficam explicitamente no acesso oficial. Esses checks não representam validação exaustiva do ano litúrgico nem revisão por uma comissão de liturgia.
