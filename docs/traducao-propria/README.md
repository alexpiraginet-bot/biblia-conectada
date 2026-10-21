# Tradução Conectada — fundação editorial

Estado em 21/10/2026: **proposta e piloto assistido por IA, sem revisão especializada e fora do texto principal do app**. O nome é provisório; não é marca registrada nem tradução concluída. Esta etapa não substitui a Bíblia Livre na produção.

## Uma Bíblia completa para usar agora

A recomendação entre as cópias abertas já presentes no repositório é a **Biblica® Open Nova Bíblia Viva™**. Ela tem os 66 livros e licença CC BY-SA 4.0. **Não é a Nova Versão Internacional (NVI)**. Uma edição existente deve aparecer com seu próprio nome e créditos, nunca como tradução original do Bíblia Conectada.

| Opção | Situação da cópia local | Uso possível |
|---|---|---|
| Open Nova Bíblia Viva | Completa, CC BY-SA 4.0 | Candidata a uma opção de leitura integral; preservar texto, título, créditos e licença |
| Bíblia Portuguesa Mundial | Domínio público, rascunho em revisão; inclui livros além dos 66 atuais | Avaliar editorialmente e tratar seu cânon/versificação explicitamente |
| Bíblia Livre Para Todos | Novo Testamento, CC BY-SA 4.0 | Opção parcial, identificada como NT |
| Tradução para Tradutores | Novo Testamento, CC BY-SA 4.0; numeração agrupada em passagens | Opção parcial com alinhamento próprio |
| NVI em português | Tradução protegida; não incorporada integralmente | Somente com permissão expressa compatível com o produto e sua distribuição |

O [inventário reproduzível](source-audit.json) registra arquivos, hashes, contagens e diferenças de numeração. Ele verifica integridade e estrutura; não certifica a qualidade da tradução.

Para a Open NBV, a [licença da edição específica](https://ebible.org/poronbv/copyright.htm) permite redistribuição e adaptação sob suas condições. Uma adaptação precisa ser identificada, manter os créditos aplicáveis e a licença; não ganha exclusividade sobre o material original. Usar esta edição aberta é uma decisão diferente de contratar a NVI.

## Qual é a mais usada?

Não foi encontrada nesta pesquisa uma contagem comparável de leitores de todas as traduções, em todas as línguas. A editora apresenta a **NIV como a tradução moderna em inglês mais popular mundialmente** em [seu site oficial](https://www.thenivbible.com/). Isso não estabelece a mais usada no mundo entre todas as línguas, nem prova que a NVI em português seja a mais usada no Brasil. Popularidade, vendas recentes e quantidade histórica de exemplares são medidas diferentes.

## NVI: crédito não substitui autorização

As [permissões da Biblica](https://www.biblica.com/permissions/) distinguem citações limitadas de reprodução integral e exigem autorização expressa para usos com IA. A autorização padrão descrita para apps/sites não cobre um produto com funcionalidades de IA/ML como o nosso.

Antes de qualquer incorporação integral, seria necessário confirmar por escrito: edição/idioma; texto completo; site e aplicativo; distribuição em repositório público e downloads; cache/offline; busca; imagens de compartilhamento; áudio/TTS; envio de passagens ao assistente, recuperação de conteúdo e outros usos com IA. Uma licença de leitura não deve ser presumida como autorização para todos esses usos. A política informa ainda que licenciamento de Bíblia/NT completos é oferecido a pessoas jurídicas registradas. Nenhum pedido foi enviado e nenhum contrato foi celebrado nesta etapa.

Copiar uma tradução protegida e trocar suas palavras não elimina os direitos da obra de origem. Não extraímos a NVI nem criamos uma versão disfarçada dela. A regra atual do repositório continua sendo publicar apenas fontes abertas autorizadas.

## Tradução própria: fonte e método

1. **Base textual definida:** Westminster Leningrad Codex para o hebraico/aramaico do AT (domínio público) e SBLGNT para o grego do NT (CC BY 4.0). São edições específicas, não autógrafos originais recuperados. A opção final e o tratamento de variantes precisam de revisão especializada.
2. **Rascunho direto:** produzir português brasileiro a partir da edição-base, com contexto da passagem. Não usar uma tradução comercial como texto a ser reescrito. Tradução, paráfrase infantil, aplicação cotidiana e comentário da IA serão camadas distintas.
3. **Notas editoriais curtas e verificáveis:** registrar termo, alternativas relevantes, escolha provisória, fonte e pendência. Não pedir nem arquivar raciocínio interno de modelos. O glossário controla consistência sem impor a mesma palavra em contextos diferentes.
4. **Revisão humana independente:** revisão por pessoa qualificada em hebraico/aramaico ou grego bíblico, seguida de revisão de português e leitura contextual. Divergências textuais/interpretativas devem permanecer visíveis; não harmonizar os evangelhos silenciosamente.
5. **Controle por passagem:** `draft` → `language-reviewed` → `editorially-approved`. Registrar autoria humana efetiva, revisão, data e versão. Uma sugestão de IA não aprova o próprio texto.
6. **Publicação gradual:** somente unidades aprovadas entram na leitura principal. Enquanto a tradução própria não estiver completa e revisada, identificar claramente sua cobertura e manter outra edição autorizada disponível.

Fontes: [WLC](https://ebible.org/hebwlc/copyright.htm), [SBLGNT](https://sblgnt.com/license/), [créditos locais](../../ATTRIBUTION.md). O formato VPL local elimina notas, introduções e divisões de parágrafo; **não contém o aparato crítico necessário para resolver variantes**. A revisão terá de consultar materiais adicionais com licença adequada antes de fechar decisões desse tipo.

## Piloto entregue

[João 1:1–5](piloto-joao-1.md) e [dados estruturados](piloto-joao-1.json). Rascunho novo produzido a partir do grego local, com status não aprovado, proveniência e pontos de revisão. Não é exemplo de texto pronto para substituir uma edição completa. A unidade 3–4 foi mantida agrupada devido à ligação sintática na edição-base; não foi forçada uma correspondência artificial de frases por número de versículo.

O modelo local Gemma ajudou a criticar o processo editorial, sem receber texto de tradução comercial. Foram aproveitadas as sugestões de glossário e registro de decisões. Pareceres de modelos são auxiliares: não substituem revisão humana nem comprovam exatidão filológica.

## Direitos e identificação

O texto antigo em domínio público, a edição moderna de base, a tradução, a análise morfológica e a marca são objetos distintos. Manter os créditos de cada um. A licença MIT do código do app não é a licença do texto bíblico.

O piloto e seus dados são disponibilizados sob **CC BY-SA 4.0, na medida dos direitos aplicáveis**, em continuidade com a política de dados do projeto. O texto grego SBLGNT conserva sua própria licença CC BY 4.0. Não se declara direito exclusivo sobre material de terceiros, domínio público ou uma saída automática de IA. A autoria e os direitos de contribuições humanas futuras deverão ser documentados; isso não equivale a registro de copyright ou de marca.

Crédito que acompanha o piloto: “Tradução Conectada — rascunho editorial assistido por IA, não revisado. Base: SBLGNT © 2010 Society of Biblical Literature and Logos Bible Software, CC BY 4.0. Tradução para português e notas novas; sem endosso dos titulares da fonte.” Links das licenças: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) e [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br).

A [Lei 9.610/98](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm) trata de autoria, traduções e autorizações, inclusive nos arts. 11, 14, 18 e 29. Esta documentação registra o tratamento adotado no projeto; não concede direitos que os colaboradores não possuem.

## O que o REA fez nesta análise

O [REA](https://github.com/morluto/rea) é uma ferramenta MCP/CLI para engenharia reversa de software, interfaces e comportamento de aplicações. Não é um motor de tradução bíblica. Seu README, licença e skill foram inspecionados; **o programa não foi instalado nem executado**. A técnica aproveitada foi a conferência de artefato, proveniência, comportamento observado e lacunas. A análise dos textos-fonte usa leitura normal dos arquivos abertos, adequada quando o conteúdo já está disponível.

A [licença MIT do REA](https://github.com/morluto/rea/blob/main/LICENSE) cobre o código do REA; não autoriza copiar obras de terceiros. Não houve extração de Bíblia protegida, quebra de acesso ou renomeação de tradução comercial.

## Integração futura no app

Esta entrega é documental. Não há seletor de tradução nem texto novo publicado nesta rodada. Para integrar uma segunda edição completa com segurança:

- Introduzir um catálogo de traduções com identificador, edição, licença, crédito, cobertura e estado editorial.
- Separar os identificadores do grafo dos identificadores da tradução. A Open NBV tem posições adicionais em Jz 5:32, 1Sm 20:43 e 3Jo 1:15. Examinar o contexto e o mapeamento de todas as passagens afetadas; nunca descartar texto ou presumir equivalência só porque o número coincide.
- Carregar texto por capítulo sob demanda, sem colocar outra Bíblia no JavaScript inicial. Incluir a tradução nas chaves de cache, busca, leitura, IA, áudio, links e imagens compartilhadas.
- Mostrar sempre o nome da edição; fontes da IA precisam citar a mesma edição apresentada ao leitor. Quando não houver alinhamento validado, informar a lacuna em vez de mostrar a passagem errada.
- Testar completude, preservação do texto, alinhamento, créditos, cache entre edições e navegação. Ao mudar a interface, repetir build, orçamento e QA móvel/desktop, Dia/Noite.

O repositório já contém a Open NBV completa. O trabalho restante é integrar e validar sua leitura; uma tradução própria completa e revisada é um projeto editorial separado.

## Reproduzir a conferência

Da raiz do repositório:

```powershell
python docs/traducao-propria/verify_sources.py
```

O comando é somente leitura: confere SHA-256 contra `fontes/SHA256SUMS`, examina as linhas VPL, verifica o grego e o estado do piloto e compara o resultado ao inventário salvo. Não acessa APIs nem gera texto bíblico.
