# Liturgia diária: um ritmo de leitura

## O que a página oferece

`/liturgia` consulta a celebração informada para o dia civil de **America/Sao_Paulo**, sem depender da data do build. `?date=AAAA-MM-DD` permite consultar uma data escolhida. A página pode chamar `getDailyLiturgy` no servidor; `/api/liturgia` devolve o mesmo contrato para integrações futuras.

São apresentados a celebração, a cor e as referências bíblicas do serviço comunitário **Liturgia Diária**, de Dancrf. Para estudo, o app carrega o texto exato da **Bíblia Livre (BLIVRE)** que já possui. O texto BLIVRE não é o lecionário oficial da Missa. A abertura é acolhedora e sem destaque denominacional, por pedido de Alex. A seção expansível **Sobre as leituras e suas fontes** declara claramente a origem católica do calendário no Brasil e dá acesso à CNBB para conferir a redação, a seleção de versos, os refrãos, as orações e outras celebrações.

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
