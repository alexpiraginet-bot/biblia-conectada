#!/bin/bash
# Installs only pinned development tooling and project-local MCP configuration on macOS.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

bash "$script_dir/preflight.sh"
cd "$repo_root/tools/ios-mcp"
# Package integrity is checked against package-lock.json. Lifecycle hooks are not needed.
npm ci --ignore-scripts --no-audit --no-fund
export MOBILEBUILDMCP_SENTRY_DISABLED=true
node node_modules/mobilebuildmcp/build/cli.js --version
node "$script_dir/configure-mcp.mjs" "$repo_root"

printf '%s\n' \
  'Preparado: MCP oficial do Xcode + MobileBuildMCP 2.7.1, somente neste projeto.' \
  'No Xcode: Settings > Intelligence > Allow external agents to use Xcode tools.' \
  'Abra o projeto Xcode quando criado e recarregue a sessão Codex nesta raiz.' \
  'Confirme as ferramentas e um build real; configuração gravada não prova conexão.'
