#!/usr/bin/env bash
# Baixa de novo as fontes abertas e confere com fontes/SHA256SUMS.
#   scripts/fetch_sources.sh           -> só confere (baixa numa pasta temporária; não mexe em fontes/)
#   scripts/fetch_sources.sh --update  -> substitui os arquivos em fontes/ e regrava fontes/SHA256SUMS
# Sai com código 1 se algum arquivo mudou na origem (as fontes são atualizadas de tempos em tempos).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MODE=${1:-check}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
get() { mkdir -p "$TMP/$(dirname "$2")"; curl -sSfL --retry 2 -o "$TMP/$2" "$1"; }

EB=https://ebible.org/Scriptures
get "$EB/porbr2018_vpl.zip" blivre/porbr2018_vpl.zip
for id in porbrbsl poronbv porblt portft; do get "$EB/${id}_vpl.zip" "ebible/$id/${id}_vpl.zip"; done

OG=https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data
for f in ancient.jsonl modern.jsonl; do get "$OG/$f" "openbible-geo/$f"; done

TG=https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master
for f in books chapters verses people places events peopleGroups easton; do get "$TG/json/$f.json" "theographic/json/$f.json"; done
get "$TG/LICENSE" theographic/LICENSE
get "$TG/readme.md" theographic/readme.md

SB=https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master
TIPNR='TIPNR - Translators Individualised Proper Names with all References - STEPBible.org CC BY.txt'
get "$SB/Proper%20Nouns/${TIPNR// /%20}" "stepbible/$TIPNR"
get "$SB/README.md" stepbible/README.md

# Referências cruzadas: a cópia de trabalho fica em estudos/biblia-referencias/data/ (usada pelos vídeos).
get https://a.openbible.info/data/cross-references.zip openbible-crossrefs/cross-references.zip

changed=0
(cd "$TMP" && sha256sum -c --quiet "$ROOT/fontes/SHA256SUMS") || changed=1
xr_old=$(sha256sum "$ROOT/estudos/biblia-referencias/data/cross-references.zip" | cut -d' ' -f1)
xr_new=$(sha256sum "$TMP/openbible-crossrefs/cross-references.zip" | cut -d' ' -f1)
if [ "$xr_old" != "$xr_new" ]; then echo "openbible-crossrefs/cross-references.zip: mudou na origem"; changed=1; fi

if [ "$MODE" = "--update" ]; then
  rm -rf "$TMP/openbible-crossrefs"   # atualizar essa base mexe nos números dos vídeos: fazer à parte, de propósito
  cp -R "$TMP"/. "$ROOT/fontes/"
  (cd "$ROOT/fontes" && find . -type f ! -name SHA256SUMS ! -path './README.md' -print0 | sort -z | xargs -0 sha256sum | sed 's#  \./#  #' > SHA256SUMS)
  echo "fontes/ atualizado; revise o git diff e os números antes de commitar."
elif [ "$changed" -eq 0 ]; then
  echo "tudo igual às cópias em fontes/ (e à base de referências cruzadas dos estudos)"
fi
exit "$changed"
