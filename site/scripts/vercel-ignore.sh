#!/usr/bin/env bash
# Vercel "Ignored Build Step" (site/vercel.json): exit 0 skips the build, exit 1 builds.
# Skips only when nothing the site reads changed since the last successful deployment of this branch
# (site/, fontes/, the studies' data/ and ATTRIBUTION.md). Builds whenever that cannot be told for sure.
set -u
prev=${VERCEL_GIT_PREVIOUS_SHA:-}
[ -z "$prev" ] && exit 1
git cat-file -e "${prev}^{commit}" 2>/dev/null || exit 1
if git diff --quiet "$prev" HEAD -- . ../fontes ../estudos/biblia-referencias/data ../estudos/biblia-natal/data ../ATTRIBUTION.md; then
  echo "No change in site/, fontes/, estudos/*/data or ATTRIBUTION.md since $prev: skipping build."
  exit 0
fi
exit 1
