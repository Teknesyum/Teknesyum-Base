# Teknesyum Base
# Kurulum:  irm https://raw.githubusercontent.com/Teknesyum/teknesyum-base/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$repo = 'Teknesyum/teknesyum-base'
$raw  = "https://raw.githubusercontent.com/$repo/main"

Write-Host ""
Write-Host "  Teknesyum Base" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "  Claude Code bulunamadi. Once PowerShell'de kur: irm https://claude.ai/install.ps1 | iex" -ForegroundColor Red
    return
}

Write-Host "  [1/3] Marketplace ekleniyor..."
claude plugin marketplace add $repo

Write-Host "  [2/3] Plugin kuruluyor..."
claude plugin install teknesyum@teknesyum

Write-Host "  [3/3] Statusline ve huy dosyasi baglaniyor..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) "teknesyum-post-install.js"
    Invoke-WebRequest -Uri "$raw/scripts/post-install.js" -OutFile $tmp -UseBasicParsing
    node $tmp
    Remove-Item $tmp -ErrorAction SilentlyContinue
} else {
    Write-Host "  Node.js yok - once PowerShell'de kur: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host "  Sonra tekrar calistir veya Claude Code icinde /teknesyum:setup calistir." -ForegroundColor Yellow
}
