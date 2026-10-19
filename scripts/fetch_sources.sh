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
for id in porbrbsl poronbv porblt portft hebwlc grcsbl grctr grclxx latVUC eng-kjv2006 engwebp engbsb eng-asv engylt spaRV1909; do
  get "$EB/${id}_vpl.zip" "ebible/$id/${id}_vpl.zip"
done

OG=https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data
for f in ancient.jsonl modern.jsonl; do get "$OG/$f" "openbible-geo/$f"; done

TG=https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master
for f in books chapters verses people places events peopleGroups easton; do get "$TG/json/$f.json" "theographic/json/$f.json"; done
get "$TG/LICENSE" theographic/LICENSE
get "$TG/readme.md" theographic/readme.md

# Repositórios git: baixados no commit registrado em fontes/<pasta>/COMMIT (blobless + sparse checkout)
gitget() {  # gitget <repo> <pasta destino> <commit> <sparse patterns...>
  local repo=$1 dst=$2 commit=$3; shift 3
  local d="$TMP/_git_$(basename "$dst")"
  git clone -q --filter=blob:none --no-checkout "https://github.com/$repo" "$d" 2>/dev/null
  (cd "$d" && git sparse-checkout set --no-cone "$@" >/dev/null 2>&1 && git checkout -q "$commit" 2>/dev/null)
  mkdir -p "$TMP/$dst"; (cd "$d" && find . -path ./.git -prune -o -type f -print0 | xargs -0 -I{} cp --parents {} "$TMP/$dst/")
  echo "$commit" > "$TMP/$dst/COMMIT"; rm -rf "$d"
}
gitget STEPBible/STEPBible-Data stepbible "$(cat "$ROOT/fontes/stepbible/COMMIT")" "Lexicons" "Morphology codes" "Proper Nouns" \
  "Translators Amalgamated OT+NT/TAGNT*" "Translators Amalgamated OT+NT/TAHOT*" "Versification" "README.md"
gitget openscriptures/morphhb oshb "$(cat "$ROOT/fontes/oshb/COMMIT")" "wlc/*" "parsing/*" "LICENSE.md" "README.md"
gitget morphgnt/sblgnt morphgnt "$(cat "$ROOT/fontes/morphgnt/COMMIT")" "*-morphgnt.txt" "README.md"
gitget openscriptures/strongs _strongs "$(cat "$ROOT/fontes/strongs/COMMIT")" "hebrew/StrongHebrewG.xml" "greek/StrongsGreekDictionaryXML_1.4/*.xml" "greek/StrongsGreekDictionaryXML_1.4/README.txt"
mkdir -p "$TMP/strongs/hebrew" "$TMP/strongs/greek"
mv "$TMP/_strongs/hebrew/StrongHebrewG.xml" "$TMP/strongs/hebrew/"; mv "$TMP/_strongs/greek/StrongsGreekDictionaryXML_1.4/"* "$TMP/strongs/greek/"
mv "$TMP/_strongs/COMMIT" "$TMP/strongs/"; rm -rf "$TMP/_strongs"

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
  (cd "$ROOT/fontes" && find . -type f ! -name SHA256SUMS ! -path './README.md' ! -path './catalogo.json' -print0 | sort -z | xargs -0 sha256sum | sed 's#  \./#  #' > SHA256SUMS)
  echo "fontes/ atualizado; revise o git diff e os números antes de commitar."
elif [ "$changed" -eq 0 ]; then
  echo "tudo igual às cópias em fontes/ (e à base de referências cruzadas dos estudos)"
fi
exit "$changed"
