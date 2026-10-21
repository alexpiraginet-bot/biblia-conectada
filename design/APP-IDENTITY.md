# Identidade de instalação e compartilhamento

Direção aprovada por Alex em 20/10/2026: bordô no entorno, céu neutro, dourado, marca reconhecível e imagens próprias para os links.

## Nome e símbolo

- Nome completo e nome padrão na tela inicial: **Bíblia Conectada**, por pedido de Alex em 21/10/2026. O sistema operacional pode abreviar visualmente o rótulo conforme o espaço disponível.
- Símbolo: dois arcos unidos por uma linha, pontos de conexão e estrela. O vetor mestre é `site/src/app/icon.svg`; o cabeçalho e as capas sociais usam o mesmo desenho.
- Fundo opaco bordô, dourado e marfim; sem letra automática, transparência ou cantos externos pré-recortados. O sistema operacional aplica a máscara do ícone.
- `npm run icons`, em `site/`, reproduz os PNGs de 192 e 512 pixels, a versão maskable de 512, o Apple Touch Icon de 180 e o favicon ICO de 32/48 a partir do vetor. O mesmo PNG Apple também está nos caminhos padrão `/apple-touch-icon.png` e `/apple-touch-icon-precomposed.png`. O símbolo fica dentro do círculo seguro central de 80%.
- Manifesto com identidade estável `/`, abertura na home, modo standalone, idioma PT-BR e atalhos de leitura, céu e mapa. Não há promessa de leitura offline.
- Nome, ícone e manifesto entram no `<head>` estático, inclusive nas páginas com seleção dinâmica, sem depender de JavaScript. Somente essa identidade invariável é explícita no layout, sem duplicatas na API de metadados. Os metadados próprios da passagem continuam na API do Next e podem chegar por streaming; o comportamento padrão dos crawlers é preservado. Não usamos bloqueio global de metadados, pois ele também desativa o cache de página da Vercel.
- No navegador do iPhone/iPad, um aviso adiado oferece instruções para adicionar à tela inicial. É dispensável, não aparece no modo standalone e não pede permissão de notificações. Os passos mostram Compartilhar, Adicionar à Tela de Início e Adicionar; a escolha de abrir como app web depende do Safari.

## Capas dos links

Todas as famílias de páginas usam metadados próprios e a mesma composição: marca, categoria, título, contexto e caminho de descoberta. Nas passagens, o trecho vem da Bíblia Livre; cortes são indicados por reticências e a fonte aparece na imagem.

- Imagem PNG, 1200 × 630, produzida no servidor por `/og?path=...`.
- Moldura bordô, palco carvão `#101014`, ouro `#e5c48c` e marfim `#fff5e6`. Tipografia Figtree e Newsreader, das fontes OFL já adotadas pelo site.
- O motivo de arcos nas capas é ornamental. Ele não simula um grafo de referências da passagem.
- O endpoint aceita somente caminhos conhecidos e referências válidas; não busca imagens externas nem aceita títulos arbitrários.
- URLs absolutas no domínio público, informações Open Graph e cartão grande do Twitter/X. Nenhuma imagem é gerada em massa para os versículos durante o build.
- A seleção de uma passagem no céu é representada também na query do endereço, porque fragmentos `#` não são enviados ao servidor nem lidos pelos crawlers.

A apresentação final do link depende do aplicativo receptor e do cache dele. As tags e imagens não publicam nada em redes sociais. Atalhos antigos do iPhone podem manter a imagem anterior; conferir criando um novo atalho pelo Safari antes de remover o antigo, preservando os dados locais.
