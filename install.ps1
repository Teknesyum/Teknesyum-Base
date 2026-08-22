# Teknesyum Base
# Install:  irm https://raw.githubusercontent.com/Teknesyum/teknesyum-base/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$repo = 'Teknesyum/teknesyum-base'
$raw  = "https://raw.githubusercontent.com/$repo/main"

Write-Host ""
Write-Host "  Teknesyum Base" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "  Claude Code not found. Install it first in PowerShell: irm https://claude.ai/install.ps1 | iex" -ForegroundColor Red
    return
}

Write-Host "  [1/3] Adding marketplace..."
claude plugin marketplace add $repo

Write-Host "  [2/3] Installing plugin..."
claude plugin install teknesyum@teknesyum

Write-Host "  [3/3] Linking statusline and habits file..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "teknesyum-post-install.js"
    Invoke-WebRequest -Uri "$raw/scripts/post-install.js" -OutFile $tmp -UseBasicParsing
    node $tmp
    Remove-Item $tmp -ErrorAction SilentlyContinue
} else {
    Write-Host "  Node.js missing - install it first in PowerShell: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host "  Then run this again, or run /teknesyum:setup inside Claude Code." -ForegroundColor Yellow
}
