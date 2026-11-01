# Túnel em vídeo — 1 segundo

Alex forneceu `fish-f3085c2211e5d9f3f5ad32784a37bf52.mp4` para uso nas transições e autorizou acelerá-lo. O original de 4.036.251 bytes foi preservado. SHA-256: `6539ec6b9ea730d8d883719396a42674206bb13edd4cb12350bb10db8ad40926`.

A sessão de Motion preparou os derivados via FFmpeg local. O percurso inteiro de 124 quadros/24fps foi acelerado **5,166667×**, reamostrado em 30 quadros/30fps, com duração exata de um segundo, sem áudio. H.264, yuv420p, faststart. Fonte e comandos em [manifesto](tunnel-user-v1.json). Não se trata de cena histórica ou prova de ligação bíblica; é uma transição artística sobreposta às referências reais do app.

| Arquivo | Dimensões | Bytes |
| --- | --- | ---: |
| `tunnel-mobile-1s.mp4` | 720×1260 | 351807 |
| `tunnel-desktop-1s.mp4` | 768×1344 | 392399 |
| `tunnel-mobile-poster.webp` | 720×1260 | 38836 |
| `tunnel-desktop-poster.webp` | 768×1344 | 42500 |

O alvo ideal de 250 KB não foi forçado: a compressão adicional piorava cristal e nuvens. A integração mantém um único decoder e faz enquadramento central (`cover`, 50%/48%) para preencher a tela sem distorção e sem faixas vazias. Recorta somente o cenário periférico; o ponto de fuga e a referência nativa permanecem no centro. O manifesto do render recomenda `contain` para preservar o quadro inteiro; o enquadramento do site foi ajustado após revisão em celular e desktop.

Download especulativo após a abertura estabilizar ou por intenção de toque/foco. Não há espera pela rede no clique. Reprodução muda/inline, fallback em poster e partículas nativas se o vídeo falhar. Navegação começa em 125 ms, efeito termina em 1000 ms, Pular/Escape funcionam. Redução de movimento, documento oculto, economia de dados e 2G pulam a viagem. O vídeo é pausado e o decoder liberado no encerramento.

O Motion narrado é mantido em sessão separada; esta alteração não modifica sua voz, roteiro ou trilha.
