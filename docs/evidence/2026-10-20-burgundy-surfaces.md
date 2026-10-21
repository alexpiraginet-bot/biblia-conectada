# Céu arco-íris e palco neutro — 20/10/2026

Alex apontou uma faixa azul-esverdeada na home depois da adoção do bordô. Depois pediu um céu arco-íris, criticou a composição sépia e definiu o palco neutro, deixando bordô no entorno. A entrega segue essas correções mais recentes.

## Correção

- A nova faixa “Um universo. Tudo conectado.” usa Figtree, palco carvão nos dois temas, CTA dourado simples e três atalhos para passagens reais. O céu se move com a rolagem quando o navegador oferece essa animação; redução de movimento é respeitada.
- O pôster da faixa é escolhido por largura, com AVIF/WebP. O card menor importa a imagem estaticamente, com endereço derivado do conteúdo para invalidar a miniatura antiga no otimizador.
- `sculpture-ground`, o renderizador 3D e seus oito pôsteres coincidem: `#101014` em Noite e `#f5f5f7` em Dia. A interface externa mantém seus tokens bordô/marfim. A seleção escurece o próprio palco neutro.
- O padrão de cores do 3D agora é `livros`: espectro contínuo ao longo do eixo canônico, estável ao orbitar. Testamento e distância continuam disponíveis. Geometria, votos, relações, seleção e pulsos não mudam. O shader acrescenta cálculo de cor na base já armazenada em cache, sem novos passes, texturas ou draw calls.
- O céu plano e seus quatro pôsteres usam `sky`, `#190d17`. Sua paleta por distância e os quatro arquivos da camada dourada permanecem inalterados.
- Hover dos botões, tracejado decorativo da cronologia e molduras dos medalhões acompanham bordô, dourado e marfim.

## Evidências

Os 12 arquivos foram renderizados pelos scripts do próprio projeto, com dados reais e Chrome/SwiftShader, sem geração de conteúdo por IA. Os oito pôsteres 3D foram renderizados novamente com arco-íris e palco neutro. Mestres finais: `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/rainbow-posters/`. O relatório `burgundy-posters/verification.json` cobre a etapa anterior e a camada dourada inalterada, não as cores finais do 3D.

Pôsteres 3D em 854 × 610 e 2002 × 1430. AVIF Noite desktop: 151.698 bytes. O fallback WebP mantém qualidade 90 e fica em 316.418 bytes, 16.418 acima da meta indicativa de 300 kB; preservou-se a nitidez dos fios. O celular usa AVIF 28.495 bytes ou WebP 54.552 bytes, sem baixar o desktop.

Validação final de build e navegador registrada abaixo após a execução. Nenhuma mudança na IA, no orçamento, nas fontes bíblicas ou em `estudos/`. A voz por OpenAI aguarda seleção segura de conta/projeto; nenhuma chave foi criada ou chamada paga feita nesta etapa.
