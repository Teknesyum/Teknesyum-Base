param(
  [int]$Sadece = 0,
  [double]$Ara = 1.2
)

$sesler = @(
  @{ n = 1;  d = 'Windows Navigation Start.wav'; s = '0,06'; t = 'tik - neredeyse duyulmaz' },
  @{ n = 2;  d = 'Windows Information Bar.wav';  s = '0,13'; t = 'kisa tok vurus' },
  @{ n = 3;  d = 'Windows Menu Command.wav';     s = '0,15'; t = 'menu tiki' },
  @{ n = 4;  d = 'Windows Startup.wav';          s = '0,22'; t = 'yumusak cikis' },
  @{ n = 5;  d = 'ding.wav';                     s = '0,40'; t = 'klasik ding' },
  @{ n = 6;  d = 'Windows Default.wav';          s = '0,41'; t = 'varsayilan uyari' },
  @{ n = 7;  d = 'Windows Pop-up Blocked.wav';   s = '0,48'; t = 'bogum sesi' },
  @{ n = 8;  d = 'Windows Ringout.wav';          s = '0,50'; t = 'inen iki nota' },
  @{ n = 9;  d = 'chord.wav';                    s = '0,65'; t = 'akor' },
  @{ n = 10; d = 'Windows Hardware Insert.wav';  s = '0,65'; t = 'cikan iki nota' }
)

$kok = 'C:\Windows\Media\'

function Cal($ses) {
  $yol = $kok + $ses.d
  $etiket = '{0,2}) {1,-5}s  {2,-30} {3}' -f $ses.n, $ses.s, $ses.d, $ses.t
  if (-not (Test-Path -LiteralPath $yol)) {
    Write-Host "$etiket  [DOSYA YOK]" -ForegroundColor DarkGray
    return
  }
  Write-Host $etiket
  try {
    $p = New-Object Media.SoundPlayer $yol
    $p.PlaySync()
  } catch {
    Write-Host "     calinamadi: $($_.Exception.Message)" -ForegroundColor Red
  }
}

if ($Sadece -gt 0) {
  $ses = $sesler | Where-Object { $_.n -eq $Sadece }
  if (-not $ses) {
    Write-Host "1 ile 10 arasinda bir numara ver." -ForegroundColor Red
    exit 1
  }
  Cal $ses
  exit 0
}

Write-Host ''
Write-Host 'Teknesyum - ses secimi' -ForegroundColor Cyan
Write-Host ("-" * 60)
foreach ($ses in $sesler) {
  Cal $ses
  Start-Sleep -Milliseconds ([int]($Ara * 1000))
}
Write-Host ("-" * 60)
Write-Host 'Tek ses tekrar:  .\ses-sec.ps1 -Sadece 5'
Write-Host 'Arayi degistir:  .\ses-sec.ps1 -Ara 2'
Write-Host ''
