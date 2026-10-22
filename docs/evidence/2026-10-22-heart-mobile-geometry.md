# Coração: geometria móvel e verificação da credencial de voz

Código revisado: `e77d527685fbeabf791d0c483628cdf9daddde7e`, PR #32. Pedido de Alex motivado por captura do iPhone: área vazia excessiva, sugestões cortadas e navegação sobre a área inferior da conversa.

## Alterações

- Altura da página calculada a partir da janela, cabeçalho, navegação flutuante e safe area; conversa flexível sem piso independente de 520px.
- Perguntas prontas empilhadas; rodapé abaixo da primeira janela. Em telas baixas, as ações substituem a apresentação repetida.
- Campo de escrita mais compacto no celular e dock oculto enquanto ele tem foco.
- Privacidade móvel em painel delimitado, sem consumir toda a altura do log; desktop conserva a expansão no fluxo.

## Evidência

Diretório externo `C:/Users/R2/.codex/visualizations/biblia-conectada-20261021/heart-geometry/`.

- Build de produção com 773 testes/56 arquivos, TypeScript e `check-dist` passou; orçamento de JS e lint conferidos separadamente.
- `geometry.json`: 16 casos Chromium, 375×667, 375×812, 393×852 e 1440×900, Dia/Noite, disponibilidade de voz simulada ligada/desligada. Sem overflow horizontal ou erro JS; compositor separado da navegação nos tamanhos principais. Nenhuma API paga nessa matriz.
- `webkit.json`: WebKit Windows com viewport móvel e redução para 450px, com foco no campo e retorno do dock após blur. Não representa o teclado de um iPhone físico.
- `agency-final-review.json`: revisão independente com perfis Agency UI Finish-Gate Reviewer e Accessibility Auditor. Em 375×667, três sugestões completas e 130px úteis no log ao abrir privacidade, contra zero antes; em 393×852, 299px úteis. Controle de fechamento alcançável por clique e Espaço com foco preservado. Desktop sem bloqueador no escopo. Respostas longas simuladas permitem rolar do início ao fim.
- `agency-perf.json`: amostra auxiliar anterior à última compactação, produção local Chromium393×852 sem throttling: LCP276ms, CLS0,043, 11,5–22,1ms entre interação e segundo frame nas alternâncias. Não é Lighthouse, INP ou desempenho em rede móvel; não extrapolar esses valores para a produção publicada.

## Voz: chave atualizada, ainda recusada pelo provedor

Metadados da Vercel confirmaram que `OPENAI_API_KEY` foi atualizada pelo usuário após o deploy de produção. Seu valor não foi lido nem registrado. Preview/Production estão marcados, mas isso não valida o conteúdo do segredo. Duas tentativas de redeploy sem mudança de fonte foram ignoradas pelo script do projeto; a prévia da alteração de layout fez um build novo com a configuração atual.

Prévia `dpl_AyLhv6CxfPvhwqd2XKTcrB75UFyx` READY. Primeira consulta falhou no validador de resposta textual; o diagnóstico está preservado em `voice-text-provider-failure.json`. Uma consulta mais específica retornou texto HTTP200 em7111ms. O áudio retornou HTTP502. Log permitido da função: `phase=connecting`, `reason=provider_event`, `durationMs=166`, `audioBytes=0`, `upstreamCode=invalid_api_key`. Nenhum áudio foi produzido; não há evidência de timbre, sotaque ou autoplay real.

Voz segue desabilitada em Production. Alex foi orientado a substituir Value pelo valor completo da chave secreta da OpenAI, sem enviá-la à conversa. O nome de apresentação “Bíblia” não é o segredo. Após substituição, realizar novo build de Preview e teste real antes de ativar Production. Não atribuir essa falha a saldo, modelo ou permissões sem evidência.

## Limites

Não houve teste de teclado físico, leitor de tela, modo silencioso ou reprodução em iPhone real. O app continua oferecendo texto quando a voz não está disponível. A montagem OpenMontage e instalação de ferramentas são entregas externas ao repositório, sem alterações nos pipelines `estudos/`.
