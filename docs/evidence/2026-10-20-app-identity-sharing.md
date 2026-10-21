# Identidade do app e compartilhamento — 20/10/2026

Pedido: substituir o ícone automático com uma letra, fixar o nome na tela inicial, produzir capas coerentes para os links e orientar a instalação no iPhone.

## Implementação

- Marca vetorial própria com arco duplo, pontos e estrela; PNG Apple 180, Android 192/512, maskable 512 e favicon 32/48. Geração reproduzível por `npm run icons`.
- Nome completo Bíblia Conectada; nome curto/Apple Bíblia. Manifesto com identidade e escopo estáveis, abertura na home e atalhos de leitura, céu e mapa.
- Metadados específicos em 29 páginas/famílias, com URL HTTPS absoluta, Open Graph e Twitter. Canônico de versículo continua apontando ao capítulo conforme a política existente; `og:url` identifica o versículo.
- `/og` renderiza PNG 1200 × 630 de caminhos conhecidos, usando dados reais. BLIVRE identificada nas citações; trechos longos usam reticências. Fontes WOFF convertidas das OFL já presentes, sem requisições externas ou dependências novas de produção.
- Seleção do céu também fica em `?ref=...`, lida pelo servidor. Hashes antigos e `?v=` continuam aceitos; limpar a seleção remove as duas representações. Callbacks tardios não alteram outras rotas. Entradas inválidas têm capa genérica ou 404 conforme o tipo; texto arbitrário não vira capa.
- Aviso iOS/iPadOS adiado e dispensável por 30 dias, escondido em standalone ou durante diálogos. Tutorial local com Compartilhar → Adicionar à Tela de Início → Adicionar. Sem service worker, permissão de notificações ou alegação de funcionamento offline.

## Verificação

Primeira rodada completa: 634 testes em 42 arquivos, compilação Next 16.4.2, TypeScript e check-dist aprovados. O verificador conferiu 2.539 páginas pré-renderizadas, créditos, números e textos protegidos. Todos os arquivos de fontes OG constam no trace de implantação. ESLint aprovado nos arquivos implementados.

QA externo em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/app-identity-sharing/`: 145 respostas HTML (29 endereços × 5 user-agents), 29 PNGs com dimensões e hash estáveis entre requisições, ícones e manifesto, 12 telas (home/versículo/céu, 375/1440, Dia/Noite). Facebookexternalhit/WhatsApp/Twitter conferidos no head; Facebot é documentado separadamente como leitura do HTML completo.

O primeiro orçamento medido excedeu o teto de 165 KiB por 353 bytes na home e 558 bytes no céu. A entrega aguarda nova medição após adiar o menu de aparência e separar a detecção de instalação do restante da política. Build e QA finais, prévia e publicação serão registrados antes do encerramento.

## Evidência visual e limites

Ícone mestre, recorte maskable e PNGs OG de home, João 3:16, referência longa e conexão inspecionados pelo agente principal. O símbolo cabe na máscara e o texto não ultrapassa a imagem. Parecer auxiliar de Gemma via Ollama destacou cortes, caches e distinção entre nome instalado e título da página; as verificações reais, e não o parecer, sustentam o resultado.

Não foi feita instalação em iPhone físico nem enviado link a WhatsApp/Instagram. O site fornece os metadados e imagens; a apresentação final depende do aplicativo e de seus caches. Atalhos antigos podem precisar ser adicionados novamente.

Fontes oficiais: [Apple — app na tela inicial](https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios), [Apple — título e ícone](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html), [WebKit — precedência do Apple Touch Icon](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Open Graph Protocol](https://ogp.me/). Documentação Meta respondeu 429 na pesquisa; nenhuma garantia de prévia em todos os contextos do Instagram foi inferida.
