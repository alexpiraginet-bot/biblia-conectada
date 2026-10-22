#!/usr/bin/env bash
# Vercel "Ignored Build Step" (site/vercel.json): exit 0 skips the build, exit 1 builds.
# Skips only when nothing the site reads changed since the last successful deployment of this branch
# (site/, fontes/, the studies' data/ and ATTRIBUTION.md). Builds whenever that cannot be told for sure.
set -u
prev=${VERCEL_GIT_PREVIOUS_SHA:-}
[ -z "$prev" ] && exit 1
git cat-file -e "${prev}^{commit}" 2>/dev/null || exit 1
# A redeploy of the same commit can refresh environment variables or project settings.
# File diffs cannot detect those changes; only skip a distinct, source-irrelevant commit.
if [ "$(git rev-parse "${prev}^{commit}")" = "$(git rev-parse HEAD)" ]; then
  echo "Redeploying the current commit: rebuilding to refresh deployment configuration."
  exit 1
fi
if git diff --quiet "$prev" HEAD -- . ../fontes ../estudos/biblia-referencias/data ../estudos/biblia-natal/data ../ATTRIBUTION.md; then
  echo "No change in site/, fontes/, estudos/*/data or ATTRIBUTION.md since $prev: skipping build."
  exit 0
fi
exit 1
