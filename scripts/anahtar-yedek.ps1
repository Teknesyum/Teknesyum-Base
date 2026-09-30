param([switch]$Restore)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$file = Join-Path $root "secrets/pro-anahtarlar.json"
$repo = "Teknesyum/Teknesyum-Private"
$path = "teknesyum-base/secrets/pro-anahtarlar.json"

if ($Restore) {
  $body = gh api "repos/$repo/contents/$path" -H "Accept: application/vnd.github.raw" 2>$null
  if ($LASTEXITCODE -ne 0) { throw "No backup in $repo/$path" }
  New-Item -ItemType Directory -Force -Path (Split-Path $file) | Out-Null
  [IO.File]::WriteAllText($file, (($body | Out-String).TrimEnd() + "`n"), (New-Object Text.UTF8Encoding $false))
  "Restored from $repo/$path"
  exit 0
}

if (-not (Test-Path $file)) { throw "secrets/pro-anahtarlar.json not found" }
$sha = gh api "repos/$repo/contents/$path" --jq .sha 2>$null
if ($LASTEXITCODE -ne 0) { $sha = $null }
if ($sha) {
  $remote = (gh api "repos/$repo/contents/$path" -H "Accept: application/vnd.github.raw" 2>$null | Out-String).Trim()
  $same = $remote -eq ([IO.File]::ReadAllText($file)).Trim()
  $remote = $null
  if ($same) { "Backup already current in $repo"; exit 0 }
}
$content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($file))
$ghArgs = @("api", "-X", "PUT", "repos/$repo/contents/$path", "-f", "message=Back up Teknesyum Base Pro keys", "-f", "content=$content", "--jq", ".commit.sha")
if ($sha) { $ghArgs += @("-f", "sha=$sha") }
$commit = & gh @ghArgs
$content = $null
if ($LASTEXITCODE -ne 0) { throw "Backup to $repo failed" }
"Backed up to $repo/$path ($commit)"
