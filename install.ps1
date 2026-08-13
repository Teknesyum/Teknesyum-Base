# Teknesyum — Claude Code Adamantium Base
# Kurulum:  irm https://raw.githubusercontent.com/Teknesyum/claude-code-adamantium-base/main/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$repo = 'Teknesyum/claude-code-adamantium-base'
$raw  = "https://raw.githubusercontent.com/$repo/main"

Write-Host ""
Write-Host "  Teknesyum - Claude Code Adamantium Base" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "  Claude Code bulunamadi. Once kur: https://claude.com/code" -ForegroundColor Red
    return
}

Write-Host "  [1/3] Marketplace ekleniyor..."
claude plugin marketplace add $repo

Write-Host "  [2/3] Plugin kuruluyor..."
claude plugin install teknesyum@teknesyum

Write-Host "  [3/3] Statusline ve huy dosyasi baglaniyor..."
if (Get-Command node -ErrorAction SilentlyContinue) {
    $tmp = Join-Path $env:TEMP "teknesyum-post-install.js"
    Invoke-WebRequest -Uri "$raw/scripts/post-install.js" -OutFile $tmp -UseBasicParsing
    node $tmp
    Remove-Item $tmp -ErrorAction SilentlyContinue
} else {
    Write-Host "  Node.js yok - statusline atlandi. Claude Code icinde /teknesyum:kurulum calistir." -ForegroundColor Yellow
}
