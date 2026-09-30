param(
  [string]$Exe = "",
  [int]$Width = 1440,
  [int]$Height = 926
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
if (-not $Exe) {
  $version = (Select-String -Path "src-tauri/Cargo.toml" -Pattern '^version\s*=\s*"([^"]+)"').Matches[0].Groups[1].Value
  $Exe = Join-Path $root "tmp/release/$version/Teknesyum-Base.exe"
}
if (-not (Test-Path $Exe)) { throw "Exe not found: $Exe" }

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class TkWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint f);
}
"@

$running = Get-Process -Name "Teknesyum Base", "Teknesyum-Base" -ErrorAction SilentlyContinue
$restart = $running | Select-Object -First 1 -ExpandProperty Path
$running | Stop-Process -Force
Start-Sleep -Seconds 1

function Save-Jpg($bmp, $path, $w, $h) {
  $out = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($bmp, 0, 0, $w, $h)
  $g.Dispose()
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 90L
  $out.Save($path, $codec, $ep)
  $out.Dispose()
}

function Get-Frame($view) {
  $p = Start-Process -FilePath $Exe -ArgumentList "--kare=$view" -PassThru
  $h = [IntPtr]::Zero
  for ($i = 0; $i -lt 60 -and $h -eq [IntPtr]::Zero; $i++) {
    Start-Sleep -Milliseconds 500
    $p.Refresh()
    $h = $p.MainWindowHandle
  }
  if ($h -eq [IntPtr]::Zero) { $p | Stop-Process -Force; throw "No window for $view" }
  [TkWin]::ShowWindow($h, 9) | Out-Null
  [TkWin]::SetWindowPos($h, [IntPtr]::Zero, 40, 40, $Width, $Height, 0x0040) | Out-Null
  Start-Sleep -Seconds 8
  $r = New-Object TkWin+RECT
  [TkWin]::GetWindowRect($h, [ref]$r) | Out-Null
  $bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $dc = $g.GetHdc()
  [TkWin]::PrintWindow($h, $dc, 2) | Out-Null
  $g.ReleaseHdc($dc)
  $g.Dispose()
  $p | Stop-Process -Force
  Start-Sleep -Seconds 1
  $bmp
}

$views = [ordered]@{ "library" = "library"; "detail:Teknesyum-Base" = "detail"; "installed" = "installed"; "settings" = "settings" }
foreach ($lang in "en", "tr") {
  foreach ($view in $views.Keys) {
    $bmp = Get-Frame "$view@$lang"
    $file = "assets/screens/$($views[$view])$(if ($lang -eq 'tr') { '.tr' }).png"
    $bmp.Save((Join-Path $root $file), [System.Drawing.Imaging.ImageFormat]::Png)
    if ($view -eq "library" -and $lang -eq "en") {
      Save-Jpg $bmp (Join-Path $root ".teknesyum/full.jpg") $bmp.Width $bmp.Height
      Save-Jpg $bmp (Join-Path $root ".teknesyum/shot.jpg") 640 ([int](640 * $bmp.Height / $bmp.Width))
    }
    "$view@$lang -> $file ($($bmp.Width)x$($bmp.Height))"
    $bmp.Dispose()
  }
}
Copy-Item (Join-Path $root "src-tauri/icons/128x128.png") (Join-Path $root ".teknesyum/icon.png") -Force

if ($restart) { Start-Process -FilePath $restart }
