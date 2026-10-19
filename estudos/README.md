# Estudos (os vídeos que deram origem ao site)

| Pasta | Vídeo | O que mostra |
|---|---|---|
| `biblia-referencias/` | **A Bíblia, conectada** (18/10/2026, 1080×1920, 30 fps, cerca de 53,5 s) | As 344.799 referências cruzadas como arcos. De 63.779 (Harrison & Römhild, 2007) até hoje. Isaías 9:6 é o versículo mais ligado (212) |
| `biblia-natal/` | **Antes do Natal, já estava escrito** (19/10/2026, 1080×1920, 24 fps, cerca de 63,9 s) | As profecias do nascimento num mapa 3D do relevo real, com recriações dos lugares |

**Números do vídeo 2:**
- 2.094 ligações do AT chegam aos 4 capítulos do nascimento (Mt 1–2 e Lc 1–2, 180 versículos).
- Elas vêm de 1.561 versículos do AT, em 38 dos 39 livros. Só Jonas fica de fora.

**Onde está o resto:**
- Cada pasta tem `PROJETO.md` (decisões, dados, pipeline), `LEGENDA.md` (legenda do post) e o código.
- `renders/` traz o vídeo final e a capa.
- Os intermediários pesados (`renders/.film/*`) estão na branch `film-intermediates`. Só `narr.json`, `keys.json` e `render.log` ficam no `main`.

## Rodar de novo

```bash
python3 -m venv .venv && . .venv/bin/activate && pip install -r estudos/requirements.txt
# ffmpeg 6.x no PATH
cd estudos/biblia-referencias && python3 -I tools/analyze.py && python3 film.py --still 3,20,44
cd ../biblia-natal && python3 film.py --still 1.0,31.5     # -> renders/.stills/
```

O pipeline completo de cada vídeo está no `PROJETO.md` da pasta.

**Cuidados:**
- `biblia-natal` lê `../biblia-referencias/data/`. As duas pastas precisam continuar lado a lado.
- **O mapa 3D (`biblia-natal/mapgl.py`) usa OpenGL 3.3 headless com `backend="egl"` (Linux + Mesa).** No macOS não existe EGL: lá é preciso trocar o backend (CGL) e testar. Uma sessão Linux, como a nuvem do Claude Code, roda sem mudança.
- `words.py` e `narration.py` usam `faster-whisper`, que baixa o modelo na primeira execução.
- **Render conferido em 19/10:** `film.py --still 1.0,50.0` rodou numa cópia deste repo que tinha só `narr.json` em `renders/.film/`.
  - Deu 6,7 s e 14,1 s por quadro.
  - O cache `full_dome.npy` foi recalculado em 13,6 s e saiu idêntico ao original.
  - O vídeo inteiro de `biblia-natal` leva cerca de 33 min em 2 CPUs.
