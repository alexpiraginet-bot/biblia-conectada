# CLAUDE.md: biblia-conectada

**Antes de qualquer tarefa, leia `HANDOFF.md` inteiro.** Ele tem o pedido, o estado, as decisões e o plano. Depois leia `design/README.md` e `fontes/README.md`.

Fale com o Alex em PT-BR. Código, identificadores e mensagens de commit em inglês. Textos do site em PT-BR.

## Regras do projeto (não negociar sem o Alex)

1. **Só fontes livres:** domínio público, CC BY ou CC BY-SA.
   - O texto completo de traduções protegidas (ACF, NVI, ARA, AA, NTLH, NAA…) nunca entra no repositório nem no site. Motivo: Lei 9.610/98, arts. 7º, XI e 14 (ver `ATTRIBUTION.md`).
   - Citação curta com a fonte é aceitável (art. 46, III).
   - Antes de adicionar uma fonte nova, confira a licença no arquivo da própria fonte e registre em `fontes/README.md` e `fontes/SHA256SUMS`.
2. **Créditos visíveis no site:** página "Sobre / Créditos" e um resumo no rodapé, com o texto exato do `ATTRIBUTION.md`.
   - Dados derivados de bases CC BY-SA (Theographic, NBV Open, BLT, TFT) saem sob CC BY-SA 4.0.
3. **Todo número que aparece no site vem de código**, a partir de `fontes/` e `estudos/*/data/`, com teste que confere. Nada digitado à mão.
   - Afirmações tipo "maior do mundo" só com evidência.
4. **Nomes em português de lugares e pessoas saem do texto da BLIVRE** dos versículos onde aparecem, com revisão nos mais citados. Nunca traduza de cabeça.
5. **Deploy:** Vercel em subdomínio gratuito `*.vercel.app`. Comprar domínio ou mudar de plano só com aprovação explícita do Alex.
6. **Não mexa em `estudos/`** (pipelines dos vídeos) sem pedido. O site só lê os dados de lá.
   - Não baixe a branch `film-intermediates` (530 MB) sem necessidade.
7. **Segredos:** nada de `.env`, chave ou token no repositório nem em log.
   - O comando de instalação do 21st.dev usa `API_KEY_21ST`, que fica fora do repo.
8. **Imagens:** sem rostos de crianças. Recriações sempre marcadas como "Recriação".
9. **"Pronto" só com evidência:** build passando, testes passando e screenshot conferido em 375 px e 1440 px, temas Noite e Dia. Sem isso, diga o que não foi verificado.

## Comandos

```bash
scripts/fetch_sources.sh            # confere as fontes contra fontes/SHA256SUMS (--update para atualizar)
pip install -r estudos/requirements.txt   # só para mexer nos vídeos (EGL/Linux para o mapa 3D)
# site/ ainda não existe. Ao criar, documente aqui: npm ci / npm run dev / npm run build / npm test
```

## Mapa do repositório

- `HANDOFF.md`: plano e estado.
- `ATTRIBUTION.md`: licenças e créditos.
- `design/`: direção visual e referências.
- `fontes/`: bases abertas com SHA-256.
- `estudos/biblia-referencias/data/`: `xref.npz`, `stats.json` e a base de referências cruzadas.
- `estudos/biblia-natal/data/`: `natal-stats.json`, `places.json`, `verses.json` (citações).
- `scripts/`: utilitários.
- `site/`: o site, a criar.
