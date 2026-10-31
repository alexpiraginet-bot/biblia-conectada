$ErrorActionPreference = 'Stop'
$packageRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../platform'))
if (-not (Test-Path -LiteralPath (Join-Path $packageRoot 'package.json'))) {
    throw 'Extraia o pacote completo preservando as pastas deliverables e platform.'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Instale Node.js 24 LTS antes de iniciar o backend.'
}
Push-Location -LiteralPath $packageRoot
try {
    if (-not (Test-Path -LiteralPath (Join-Path $packageRoot 'node_modules'))) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as dependências.' }
    }
    & npm.cmd run setup
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar o banco local. Os dados existentes foram preservados.' }
    Write-Host ''
    Write-Host 'Proposta interativa: http://127.0.0.1:4318/projeto'
    Write-Host 'Console real:       http://127.0.0.1:4318/console'
    Write-Host 'Credenciais locais: platform/.local/demo-credentials.json (não compartilhar)'
    Write-Host 'Mantenha esta janela aberta. Ctrl+C encerra o servidor.'
    & npm.cmd run dev
} finally {
    Pop-Location
}
