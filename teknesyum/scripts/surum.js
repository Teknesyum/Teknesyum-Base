#!/usr/bin/env node

// Kurulu sürümü uzaktaki en yüksek etiketle karşılaştırır. Hem kanca `require` eder
// (açılış satırı) hem kullanıcı doğrudan çalıştırır (`/update`).
//
// Uzak sorgu marketplace kopyasının git deposu üzerinden gider: kopya zaten klonlanmış
// bir depodur, `ls-remote` tek atımlık ve klonu tazelemeye gerek bırakmaz. Marketplace
// önbelleğine bakmak yetmezdi — `claude plugin marketplace update` çalışmadan kopya
// eskide kalır, depoda yeni etiket varken cache eski sürümü gösterir.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { konfigKok } = require('../hooks/ortak.js');

const EKLENTI = 'teknesyum@teknesyum';
const PAZAR = 'teknesyum';
const UZAK_ZAMAN_ASIMI = 2000;
const GUNCELLEME_KOMUTU = 'claude plugin update ' + EKLENTI;

function pazarYolu() {
  return path.join(konfigKok(), 'plugins', 'marketplaces', PAZAR);
}

function kurulu() {
  try {
    const j = JSON.parse(
      fs.readFileSync(path.join(konfigKok(), 'plugins', 'installed_plugins.json'), 'utf8')
    );
    const k = j.plugins && j.plugins[EKLENTI] && j.plugins[EKLENTI][0];
    if (!k || !ayikla(k.version)) return null;
    return { surum: ayikla(k.version), sha: k.gitCommitSha || null };
  } catch {
    return null;
  }
}

// Ağ yoksa, git yoksa, depo yoksa, uzak erişilemezse `null`. Çağıran taraf sessiz kalır:
// "kontrol edemedim" cümlesi her oturumda tekrarlanınca bilgi değil gürültü olur.
function uzak(kok) {
  const depo = kok || pazarYolu();
  if (!fs.existsSync(path.join(depo, '.git'))) return null;
  let cikti = '';
  try {
    cikti = execFileSync('git', ['-C', depo, 'ls-remote', '--tags', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: UZAK_ZAMAN_ASIMI,
      windowsHide: true,
    });
  } catch {
    return null;
  }
  let en = null;
  for (const satir of cikti.split('\n')) {
    const m = satir.match(/refs\/tags\/(\S+?)(?:\^\{\})?$/);
    const s = m && ayikla(m[1]);
    if (s && (!en || karsilastir(s, en) > 0)) en = s;
  }
  return en;
}

function ayikla(etiket) {
  const m = String(etiket || '').match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return m ? m[1] + '.' + m[2] + '.' + m[3] : null;
}

// Dizgi karşılaştırması `2.10.0`'ı `2.9.0`'ın altına koyuyor; parça parça sayısal bakılır.
function karsilastir(a, b) {
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0) ? -1 : 1;
  }
  return 0;
}

function durum(kok) {
  const k = kurulu();
  const u = uzak(kok);
  const fark = k && u ? karsilastir(u, k.surum) > 0 : false;
  return {
    kurulu: k ? k.surum : null,
    sha: k ? k.sha : null,
    uzak: u,
    yeni: fark,
    komut: GUNCELLEME_KOMUTU,
  };
}

function metin(d) {
  if (!d.kurulu) return 'kurulu sürüm okunamadı — ' + path.join(konfigKok(), 'plugins');
  if (!d.uzak) return 'kurulu ' + d.kurulu + ' · uzak sürüm sorulamadı';
  if (d.yeni) return d.uzak + ' çıktı · kurulu ' + d.kurulu + ' · ' + d.komut;
  return 'güncel · kurulu ' + d.kurulu + ' · uzakta en yeni ' + d.uzak;
}

module.exports = { kurulu, uzak, karsilastir, ayikla, durum, GUNCELLEME_KOMUTU };

if (require.main === module) {
  const d = durum();
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(d) + '\n');
  else process.stdout.write(metin(d) + '\n');
}
