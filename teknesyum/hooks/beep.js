#!/usr/bin/env node

// Sesli bildirim. Ses işletim sisteminin bildirim sistemine hiç uğramaz, doğrudan ses
// aygıtına gider — odaklanma modu toast'ı yutar, sesi yutmaz.
//
// ÖLÇÜLDÜ (23.08.2026): bu makinede `[console]::beep(880,200)` çıkış kodu 0 döndü ve
// hiçbir ses duyulmadı. Sistem hoparlörü sürücüsü yoksa `Beep()` sessizce başarılı
// döner; sessizce başarısız olan bildirim mekanizması en kötü hâldir. Varsayılan yol o
// yüzden `Media.SoundPlayer` + kısa wav: dosyayı adıyla çalar, ses şemasına bakmaz.
//
// Bu betik hiçbir koşulda sıfırdan farklı dönmez ve hiçbir koşulda ekrana yazmaz.
// Bildirim mekanizmasının kendisi turu düşüremez.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { konfigKok, oturumKimligi, oturumProfilYolu, read } = require('./ortak.js');

const OLAYLAR = ['bekleme', 'bitti', 'hata'];

const KANCA_OLAY = { Notification: 'bekleme', Stop: 'bitti', StopFailure: 'hata' };

// Süreler `C:\Windows\Media` altındaki 70 dosyanın wav başlıklarından ölçüldü; üçü de
// yarım saniyenin altında ve birbirinden ayırt edilebilir. Uzun ses iki gün içinde
// kapatılır, kapatılan bildirim bildirim değildir.
const VARSAYILAN = {
  bekleme: { kapali: false, dosya: 'Windows Startup.wav' },
  bitti: { kapali: false, dosya: 'ding.wav' },
  hata: { kapali: false, dosya: 'Windows Default.wav' },
};

const OLCULEN_SURE = {
  'Windows Startup.wav': '0,22 s',
  'ding.wav': '0,40 s',
  'Windows Default.wav': '0,41 s',
};

const MAC_VARSAYILAN = {
  bekleme: '/System/Library/Sounds/Tink.aiff',
  bitti: '/System/Library/Sounds/Pop.aiff',
  hata: '/System/Library/Sounds/Basso.aiff',
};

const BAYAT_MS = 7 * 24 * 60 * 60 * 1000;

function medyaKoku() {
  if (process.platform === 'win32')
    return path.join(process.env.SystemRoot || 'C:\\Windows', 'Media');
  if (process.platform === 'darwin') return '/System/Library/Sounds';
  return '/usr/share/sounds';
}

function makineDosyasi() {
  return path.join(konfigKok(), 'teknesyum-beep.json');
}

function projeDosyasi(cwd) {
  return path.join(path.resolve(cwd || '.'), '.claude', 'teknesyum-beep.json');
}

function oturumKatmani(sid) {
  if (!sid) return null;
  const k = read(oturumProfilYolu(sid));
  if (!k || !k.beep) return null;
  const ts = Number(k.ts);
  if (!Number.isFinite(ts) || Date.now() - ts > BAYAT_MS) return null;
  return k.beep;
}

// Katmanlar üstten alta: proje → oturum → makine → varsayılan. Her alan ayrı ayrı
// çözülür; üst katmanın yalnız `bitti` olayına dokunması ötekileri düşürmez.
function katmanlar(cwd, sid) {
  return [
    { ad: 'proje', veri: read(projeDosyasi(cwd)) },
    { ad: 'oturum', veri: oturumKatmani(sid) },
    { ad: 'makine', veri: read(makineDosyasi()) },
  ].filter((k) => k.veri && typeof k.veri === 'object');
}

function coz(cwd, sid) {
  const yigin = katmanlar(cwd, sid);
  const sonuc = {};
  let toptan = { deger: false, kaynak: 'varsayılan' };
  for (const k of yigin)
    if (typeof k.veri.kapali === 'boolean' && toptan.kaynak === 'varsayılan')
      toptan = { deger: k.veri.kapali, kaynak: k.ad };
  for (const olay of OLAYLAR) {
    const v = VARSAYILAN[olay];
    const alan = {
      kapali: v.kapali,
      dosya: v.dosya,
      hz: 0,
      ms: 0,
      kaynak: 'varsayılan',
      kapaliKaynak: '',
      sesKaynak: '',
    };
    for (const k of yigin) {
      const o = (k.veri.olaylar || {})[olay];
      if (!o || typeof o !== 'object') continue;
      if (typeof o.kapali === 'boolean' && !alan.kapaliKaynak) {
        alan.kapali = o.kapali;
        alan.kapaliKaynak = k.ad;
      }
      if (!alan.sesKaynak && (o.dosya || (o.hz && o.ms))) {
        if (o.hz && o.ms) {
          alan.hz = Number(o.hz);
          alan.ms = Number(o.ms);
          alan.dosya = '';
        } else {
          alan.dosya = String(o.dosya);
        }
        alan.sesKaynak = k.ad;
      }
    }
    alan.kaynak = alan.kapaliKaynak || alan.sesKaynak || 'varsayılan';
    sonuc[olay] = alan;
  }
  return { toptan, olaylar: sonuc };
}

// Çıplak ad `C:\Windows\Media` altında aranır, mutlak yol doğrudan kullanılır. Dosya
// yoksa o olayın varsayılanına düşülür; o da yoksa ses çalınmaz ve hata basılmaz.
function sesYolu(olay, dosya) {
  const aday = [];
  if (dosya) aday.push(path.isAbsolute(dosya) ? dosya : path.join(medyaKoku(), dosya));
  if (process.platform === 'darwin') aday.push(MAC_VARSAYILAN[olay]);
  aday.push(path.join(medyaKoku(), VARSAYILAN[olay].dosya));
  for (const y of aday) {
    try {
      if (y && fs.existsSync(y)) return y;
    } catch {}
  }
  return null;
}

function calistir(kmt, arg) {
  try {
    spawnSync(kmt, arg, { stdio: 'ignore', timeout: 8000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function bulunur(kmt) {
  try {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [kmt], {
      stdio: 'ignore',
      timeout: 3000,
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

// `TEKNESYUM_BEEP_SESSIZ` yalnız test koşumu içindir: takım her çalıştığında makinede
// ses patlamasın diye çalma adımı atlanır, çözümleme ve yazma yolları aynen ölçülür.
function cal(alan, olay) {
  if (process.env.TEKNESYUM_BEEP_SESSIZ) return false;
  try {
    if (process.platform === 'win32' && alan.hz && alan.ms)
      return calistir('powershell', [
        '-NoProfile',
        '-Command',
        '[console]::beep(' + Math.round(alan.hz) + ',' + Math.round(alan.ms) + ')',
      ]);
    const yol = sesYolu(olay, alan.dosya);
    if (!yol) return false;
    if (process.platform === 'win32')
      return calistir('powershell', [
        '-NoProfile',
        '-Command',
        "(New-Object Media.SoundPlayer '" + yol.replace(/'/g, "''") + "').PlaySync()",
      ]);
    if (process.platform === 'darwin') return calistir('afplay', [yol]);
    if (bulunur('paplay')) return calistir('paplay', [yol]);
    if (bulunur('aplay')) return calistir('aplay', ['-q', yol]);
    try {
      process.stderr.write('\u0007');
    } catch {}
    return true;
  } catch {
    return false;
  }
}

// ÖLÇÜLDÜ (24.08.2026, kullanıcı bildirdi): zil arka arkaya 5-10 kez çalıyordu.
// `Notification` tek bir bekleyişte tekrar tekrar geliyor — izin istemi, boşta kalma,
// arka plan görevi hepsi aynı olayı üretiyor. Her biri ayrı ses demek, bildirimi
// gürültüye çeviriyor: art arda çalan zil bilgi taşımaz, yalnız rahatsız eder.
//
// Pencere olay başına ayrı: bekleyiş uzun sürer, aynı bekleyiş içinde ikinci zile gerek
// yok. Bitiş ve hata kısa pencerede tutulur — arka arkaya gerçekten iki iş bitebilir.
const PENCERE = { bekleme: 60000, bitti: 10000, hata: 10000 };

function damgaDosyasi() {
  return path.join(konfigKok(), 'teknesyum-beep-son.json');
}

// Yazma başarısızsa ses **çalar**. Damga bir bastırma mekanizması; kendi hatası sesi
// yutmamalı — susan bildirim, fazla çalan bildirimden kötüdür.
function yakindaCaldi(olay, simdi) {
  const f = damgaDosyasi();
  const d = read(f) || {};
  const son = Number(d[olay]) || 0;
  if (son && simdi - son < (PENCERE[olay] || 0)) return true;
  d[olay] = simdi;
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(d));
  } catch {}
  return false;
}

function run(j) {
  const olay = KANCA_OLAY[j.hook_event_name];
  if (!olay) return;
  const ayar = coz(j.cwd, j.session_id || oturumKimligi());
  if (ayar.toptan.deger) return;
  const alan = ayar.olaylar[olay];
  if (!alan || alan.kapali) return;
  if (yakindaCaldi(olay, Date.now())) return;
  cal(alan, olay);
}

module.exports = {
  OLAYLAR,
  KANCA_OLAY,
  VARSAYILAN,
  OLCULEN_SURE,
  MAC_VARSAYILAN,
  medyaKoku,
  makineDosyasi,
  projeDosyasi,
  coz,
  cal,
  sesYolu,
  PENCERE,
  damgaDosyasi,
  yakindaCaldi,
};

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (d) => (raw += d));
  process.stdin.on('end', () => {
    try {
      run(JSON.parse(raw));
    } catch {}
    process.exit(0);
  });
  process.stdin.on('error', () => process.exit(0));
}
