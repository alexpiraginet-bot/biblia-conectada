#!/bin/bash
# Read-only checks. Does not accept Apple agreements, install tools, or print credentials.
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf '%s\n' 'Este diagnóstico precisa rodar no Mac. Nenhuma configuração foi alterada.' >&2
  exit 2
fi

missing=0
printf 'macOS: %s (%s)\n' "$(sw_vers -productVersion)" "$(uname -m)"
if command -v xcodebuild >/dev/null 2>&1; then
  if ! xcodebuild -version; then missing=1; fi
else
  printf '%s\n' 'PENDENTE: instalar o Xcode completo.'
  missing=1
fi
if ! xcrun --find mcpbridge >/dev/null 2>&1; then
  printf '%s\n' 'PENDENTE: selecionar Xcode compatível com MCP (26.3 ou posterior).'
  missing=1
fi
if ! xcrun --find simctl >/dev/null 2>&1; then
  printf '%s\n' 'PENDENTE: ferramentas do Simulator no Xcode selecionado.'
  missing=1
fi
if command -v node >/dev/null 2>&1; then
  node --version
  if ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
    printf '%s\n' 'PENDENTE: Node.js 22 ou posterior.'
    missing=1
  fi
else
  printf '%s\n' 'PENDENTE: Node.js 22 ou posterior.'
  missing=1
fi
if ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' 'PENDENTE: npm para instalar o lockfile das ferramentas.'
  missing=1
fi
if command -v codex >/dev/null 2>&1; then
  codex --version
else
  printf '%s\n' 'Codex CLI não encontrado. A configuração local também pode ser aberta no app Codex; confirmar reconhecimento do MCP.'
fi
printf '%s\n' 'Apple Team, assinatura, runtimes instalados e conexão MCP real serão verificados na sessão do Mac.'
exit "$missing"
