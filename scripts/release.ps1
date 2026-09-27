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

npx tauri build --no-bundle
if ($LASTEXITCODE -ne 0) { throw "normal build failed" }
$normal = Join-Path $out "Teknesyum-Base.exe"
Copy-Item $built $normal -Force
Write-Sha $normal

Add-Type @"
using System; using System.Runtime.InteropServices;
public static class TkCred {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct CRED { public int Flags; public int Type; public string TargetName; public string Comment; public long LastWritten; public int BlobSize; public IntPtr Blob; public int Persist; public int AttrCount; public IntPtr Attrs; public string Alias; public string User; }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CredRead(string t, int type, int f, out IntPtr c);
  [DllImport("advapi32.dll")] public static extern void CredFree(IntPtr c);
  public static string Get(string t) { IntPtr p; if (!CredRead(t, 1, 0, out p)) return null; var c = (CRED)Marshal.PtrToStructure(p, typeof(CRED)); var s = Marshal.PtrToStringUni(c.Blob, c.BlobSize / 2); CredFree(p); return s; }
}
"@
$token = [TkCred]::Get("github-token.Teknesyum Base Pro")
if (-not $token) { throw "Pro token not found in Credential Manager" }
$env:TEKNESYUM_PRO_TOKEN = $token.Trim()
$token = $null
try {
  npx tauri build --no-bundle --features pro --config src-tauri/tauri.pro.conf.json
  if ($LASTEXITCODE -ne 0) { throw "pro build failed" }
} finally {
  Remove-Item Env:TEKNESYUM_PRO_TOKEN -ErrorAction SilentlyContinue
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
