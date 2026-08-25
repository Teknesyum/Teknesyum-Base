# Teknesyum Base
# Install:  irm https://raw.githubusercontent.com/Teknesyum/teknesyum-base/v2.62.0/install.ps1 | iex

$ErrorActionPreference = 'Stop'
$repo = 'Teknesyum/teknesyum-base'
$cfg  = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }

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
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  Node.js missing - install it first in PowerShell: winget install OpenJS.NodeJS.LTS" -ForegroundColor Yellow
    Write-Host "  Then run this again, or run /teknesyum:setup inside Claude Code." -ForegroundColor Yellow
    return
}

# The post-install step runs from the package that was just installed, never from a
# separately downloaded copy: a tagged plugin used to pull whatever `main` held that day.
$post = $null
foreach ($base in @((Join-Path $cfg 'plugins\cache\teknesyum\teknesyum'), (Join-Path $cfg 'plugins\teknesyum\teknesyum'))) {
    if (-not (Test-Path $base)) { continue }
    $ver = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } |
        Sort-Object { [version]$_.Name } |
        Select-Object -Last 1
    if ($null -eq $ver) { continue }
    $aday = Join-Path $ver.FullName 'scripts\post-install.js'
    if (Test-Path $aday) { $post = $aday; break }
}

if ($post) {
    node $post
} else {
    Write-Host "  Installed plugin not found on disk - run /teknesyum:setup inside Claude Code." -ForegroundColor Yellow
}
