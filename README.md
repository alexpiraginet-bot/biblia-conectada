# Intermediários de render (branch `film-intermediates`)

Branch órfã, sem histórico em comum com `main`. Guarda os intermediários de render dos dois estudos, que são grandes demais para ficar no `main`. Um clone raso do `main` (`--depth 1`) e os deploys da Vercel não baixam esta branch.

**O que tem:** são 84 arquivos, cerca de 530 MB.
- `video.mp4`: o master sem áudio (CRF 16). Re-renderizar leva cerca de 33 min em 2 CPUs e precisa de OpenGL via EGL.
- Mixagens: `score.wav`, `mix.wav`, `narr.wav` e as falas cortadas (`line*.wav`).
- Arrays: `*.npy`.
- `a.m4a`, `video2.mp4` e os stills de conferência.

Com o `video.mp4` dá pra trocar só o áudio sem renderizar de novo. Por exemplo, numa troca de voz que preserve o tempo das falas: `score.py` → `finalize.py`.

Os arquivos com mais de 45 MB foram divididos em partes (`*.part-aa`, `*.part-ab`, …), para ficarem abaixo do limite de 100 MB por arquivo do GitHub.

## Como restaurar

```bash
git clone --branch film-intermediates --single-branch https://github.com/alexpiraginet-bot/biblia-conectada film-intermediates
cd film-intermediates
for d in biblia-natal biblia-referencias; do
  for p in $d/*.part-aa; do [ -e "$p" ] || continue; f=${p%.part-aa}; cat "$f".part-* > "$f" && rm "$f".part-*; done
done
sha256sum -c SHA256SUMS            # todos devem dar OK
# depois copie biblia-natal/* para estudos/biblia-natal/renders/.film/ (idem biblia-referencias) no clone do main
```
