# Living story — derivado web da arte fornecida

Sequência de 12 segundos: **digital → portal → rede**, com o livro original, os mesmos fios, cores, câmera e tempos. São uma metáfora artística; não representam as referências cruzadas reais da Bíblia.

## Entrega

| Arquivo público | Uso | Tamanho |
| --- | --- | ---: |
| `site/public/living-story/story.mp4` | Vídeo H.264 High 3.1, 720×1080, 30 fps, 12 s, sem áudio | 2.540.919 bytes |
| `site/public/living-story/poster.webp` | Digital em 1,2 s | 159.986 bytes |
| `site/public/living-story/portal.webp` | Portal em 6,6 s | 108.696 bytes |
| `site/public/living-story/network.webp` | Rede em 11,4 s | 158.472 bytes |

O vídeo tem 2,54 MB decimais (2,42 MiB), próximo da meta de 2,5 MB e abaixo do limite de 4 MB. Foram comparados CRF23 (8,47 MB), CRF29 (3,49 MB) e CRF31 (entrega). A última opção conserva o desenho nos quadros inspecionados com menor transferência. Os candidatos permanecem fora do repositório, junto às evidências locais.

## Origem e preservação

Alex forneceu `Biblia_Conectada_Editavel` e autorizou a integração da obra no site. A origem externa e a licença da arte não foram declaradas no pacote; **não atribuímos licença CC**. O ZIP e as fontes editáveis permanecem preservados fora do repositório. O SHA-256 do ZIP, obtido pelo agente de integração no inventário de importação, é `6B21E60AA9A150DA37B2E65FE48C56746EC8BE9F35713D8CA93B2842B2BCA549`.

O pacote declara Hyperframes 0.8.198 e Three 0.180.0, com bibliotecas vendorizadas. Não havia MP4 no pacote extraído. A versão exata do CLI não estava no cache local; para evitar instalar ou substituir versões, `capture.cjs` usa o ponto de renderização determinístico **já existente** na obra: `window.renderFluidAt(t)`. Nenhum HTML, JS, configuração ou geometria da fonte foi editado. O renderer registrado é SwiftShader; a GPU de hardware não foi usada. Nenhum código Three/GSAP precisa ser distribuído com o componente web.

A fonte mede 1080×1920 e declara 60 fps. A captura amostra os mesmos 12 segundos a 30 fps, sem acelerar ou alterar a sequência. O áudio do pacote foi omitido para uso silencioso no site.

## Enquadramento

Todos os 360 quadros foram examinados. A união de pixels RGB diferentes de preto é `[0, 251, 1080, 1827]` (limites finais exclusivos). O recorte usa `x=0, y=228, largura=1080, altura=1620`: remove **somente margens pretas** e mantém todos os pixels da obra, inclusive o brilho fraco. Depois é reduzido proporcionalmente por Lanczos para 720×1080. O script interrompe se qualquer quadro tiver conteúdo fora desse recorte.

## Reprodução local

Executar da raiz do repositório, usando runtimes que já estejam instalados. Os diretórios de quadros/evidências devem ser novos; os scripts não substituem o MP4 nem as amostras verificadas existentes.

```powershell
$sourceDir = 'C:/Users/R2/.codex/visualizations/biblia-conectada-20261025/editable-import/Biblia_Conectada_Editavel'
$renderDir = 'C:/Users/R2/.codex/visualizations/biblia-conectada-20261025/living-story-reproduction'
$pythonExe = 'C:/Users/R2/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$ffmpegExe = 'D:/BentoLabs/00-Ferramentas/agent-stack/openmontage-remotion-runtime/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe'
$ffprobeExe = 'D:/BentoLabs/00-Ferramentas/agent-stack/openmontage-remotion-runtime/node_modules/@remotion/compositor-win32-x64-msvc/ffprobe.exe'
node design/living-story/capture.cjs $sourceDir "$renderDir/frames" frames
& $pythonExe design/living-story/prepare.py "$renderDir/frames" "$renderDir/web-frames" "$renderDir/assets" --crop 0 228 1080 1620 --size 720 1080
node design/living-story/encode.cjs $ffmpegExe "$renderDir/web-frames" "$renderDir/assets/story.mp4" 31
& $pythonExe design/living-story/verify.py $ffmpegExe $ffprobeExe "$renderDir/assets/story.mp4" "$renderDir/web-frames" "$renderDir/verified" "$renderDir/verification.json"
```

`capture.cjs` aceita `PLAYWRIGHT_PATH` e `CHROME_PATH` para instalações existentes. Esta execução usou Chrome 155.0.8059.85, Pillow 12.3.0, FFmpeg n7.1 e libx264 core165 r3222. Mudanças de versão podem alterar os bytes, portanto conferir novamente imagens, vídeo e hashes após reproduzir. Não usar `npx @latest` neste fluxo.

## Evidências

- `capture-report.json`: renderer, erros, hashes dos arquivos servidos, amostras dos vértices e câmera fixa `[0,0,10]`.
- `prepare-report.json`: limites e SHA-256 dos 360 quadros originais; nenhum pixel não preto removido.
- `ffprobe.json`: 360 quadros lidos, 12 s, 30 fps, H.264, yuv420p e um único stream de vídeo.
- `verification.json`: decodificação integral sem erros, `moov` antes de `mdat` (faststart), comparação das amostras com os quadros preparados e diferença entre quadros consecutivos nos três estágios.
- `manifest.json`: origem, limites de licença, parâmetros, preservação dos arquivos carregados e hashes dos quatro assets públicos.

Os três quadros decodificados da entrega foram inspecionados visualmente. Isso é QA do asset; não equivale a assistir continuamente à peça, validar a integração no navegador ou testar em um iPhone físico. A fonte editável preservada continua sendo o master.
