# Céu dourado e violeta — refinamento de 20/10/2026

Depois da PR20, Alex forneceu duas referências e pediu um meio-termo mais discreto: dourado, violeta e azul, com estrelas e profundidade; fundo neutro, bordô no entorno.

## Implementação

- O modo de distância abre por padrão, com nome “Dourado e violeta”. A extensão das conexões reais determina as cores: azul/violeta, rosa e champagne/dourado. Arco-íris por livros e testamento permanecem disponíveis.
- O compositor existente desenha duas camadas esparsas de estrelas. A direção da câmera produz uma paralaxe pequena; não há relógio, loop de animação, buffer ou passe adicional. Estrelas ficam mais discretas sob a luz das conexões e não são nós do grafo.
- Palcos `#101014` e `#f5f5f7`, interface bordô/marfim, conteúdo bíblico, geometria, seleção e pulsos mantidos.
- Oito pôsteres AVIF/WebP em 854 × 610 e 2002 × 1430 foram renderizados dos dados reais com o mesmo código WebGL da página. Mestres em `C:/Users/R2/.codex/visualizations/biblia-conectada-20261020/celestial-posters/`.
- Renderizações Noite: AVIF 25,5/142,6 kB e WebP 46,2/268,0 kB, celular/desktop; todas abaixo das metas do script. As quatro renderizações passaram pelos checks de dimensão, fundo e presença de cores quentes/frias.

As capturas `rainbow-motion/` da PR20 são intermediárias e não devem ser usadas como aparência final do novo Motion. A produção audiovisual continua na sessão separada. Nenhuma chamada paga ou mudança de credenciais foi feita nesta etapa.
