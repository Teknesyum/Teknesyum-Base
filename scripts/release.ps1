param(
  [switch]$BuildOnly,
  [string]$Notes = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$version = (Select-String -Path "src-tauri/Cargo.toml" -Pattern '^version\s*=\s*"([^"]+)"').Matches[0].Groups[1].Value
$out = Join-Path $root "tmp/release/$version"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$built = Join-Path $root "src-tauri/target/release/teknesyum-base.exe"
$env:RUSTUP_TOOLCHAIN = "stable-x86_64-pc-windows-msvc"

function Write-Sha($file) {
  $hash = (Get-FileHash -Algorithm SHA256 $file).Hash.ToLower()
  $name = Split-Path -Leaf $file
  Set-Content -Path "$file.sha256" -Value "$hash  $name" -Encoding Ascii -NoNewline
  "$name  $hash"
}

"Base $version"

node scripts/catalog-audit.cjs
if ($LASTEXITCODE -ne 0) { throw "catalog is out of date" }

npx tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { throw "normal build failed" }
$normal = Join-Path $out "Teknesyum-Base.exe"
Copy-Item $built $normal -Force
Write-Sha $normal

$keysFile = Join-Path $root "secrets/pro-anahtarlar.json"
if (-not (Test-Path $keysFile)) { throw "secrets/pro-anahtarlar.json not found" }
$keys = Get-Content -Raw -Encoding UTF8 $keysFile | ConvertFrom-Json
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class TkCred {
[StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct CRED { public int Flags; public int Type; public string TargetName; public string Comment; public long LastWritten; public int BlobSize; public IntPtr Blob; public int Persist; public int AttrCount; public IntPtr Attrs; public string Alias; public string User; }
[DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CredRead(string t, int type, int f, out IntPtr c);
[DllImport("advapi32.dll")] public static extern void CredFree(IntPtr c);
public static string Get(string t) { IntPtr p; if (!CredRead(t, 1, 0, out p)) return null; var c = (CRED)Marshal.PtrToStructure(p, typeof(CRED)); var s = Marshal.PtrToStringUni(c.Blob, c.BlobSize / 2); CredFree(p); return s; }
}
"@
$moved = @()
if (-not $keys.master) {
  $old = [TkCred]::Get("github-token.Teknesyum Base Pro")
  if (-not $old) { throw "Pro master key missing in secrets/pro-anahtarlar.json" }
  $keys.master = $old.Trim()
  $moved += "master"
}
foreach ($p in $keys.repos.PSObject.Properties) {
  if ("$($p.Value)".Trim()) { continue }
  $old = [TkCred]::Get("repo/$($p.Name.ToLower()).teknesyum-base-pro")
  if ($old -and $old.Trim()) { $p.Value = $old.Trim(); $moved += $p.Name }
}
$old = $null
if ($moved.Count) {
  [IO.File]::WriteAllText($keysFile, ($keys | ConvertTo-Json -Depth 3), (New-Object Text.UTF8Encoding $false))
  "Moved from Credential Manager into secrets/pro-anahtarlar.json: $($moved -join ', ')"
}
$env:TEKNESYUM_PRO_TOKEN = "$($keys.master)".Trim()
$repoKeys = @{}
$empty = @()
foreach ($p in $keys.repos.PSObject.Properties) {
  $v = "$($p.Value)".Trim()
  if ($v) { $repoKeys[$p.Name.ToLower()] = $v } else { $empty += $p.Name }
}
"Embedding $($repoKeys.Count) repository key(s): $(($repoKeys.Keys | Sort-Object) -join ', ')"
if ($empty.Count) { "No key yet: $($empty -join ', ')" }
$env:TEKNESYUM_REPO_KEYS = ($repoKeys | ConvertTo-Json -Compress)
$repoKeys = $null
$keys = $null
try {
  npx tauri build --no-bundle --features pro --config src-tauri/tauri.pro.conf.json
  if ($LASTEXITCODE -ne 0) { throw "pro build failed" }
} finally {
  Remove-Item Env:TEKNESYUM_PRO_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:TEKNESYUM_REPO_KEYS -ErrorAction SilentlyContinue
}
$pro = Join-Path $out "Teknesyum-Base-Pro.exe"
Copy-Item $built $pro -Force
Write-Sha $pro

if ($BuildOnly) { "Built into $out"; exit 0 }

if (-not $Notes) { $Notes = "Teknesyum Base $version" }
gh release create "v$version" $normal "$normal.sha256" --repo Teknesyum/Teknesyum-Base --title "Teknesyum Base $version" --notes $Notes
if ($LASTEXITCODE -ne 0) { throw "normal release failed" }
gh release create "base-pro-v$version" $pro "$pro.sha256" --repo Teknesyum/Teknesyum-Private --title "Teknesyum Base Pro $version" --notes $Notes
if ($LASTEXITCODE -ne 0) { throw "pro release failed" }
"Released $version"
