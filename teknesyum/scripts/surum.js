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
const ETIKET_ZAMAN_ASIMI = 1000;
const GUNCELLEME_ZAMAN_ASIMI = 120000;
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

function etiketDurumu(dizin) {
  const depo = dizin || process.cwd();
  let surum = null;
  try {
    surum = ayikla(JSON.parse(fs.readFileSync(path.join(depo, 'package.json'), 'utf8')).version);
  } catch {
    return null;
  }
  if (!surum) return null;
  let cikti = '';
  try {
    cikti = execFileSync('git', ['-C', depo, 'tag', '--list'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: ETIKET_ZAMAN_ASIMI,
      windowsHide: true,
    });
  } catch {
    return null;
  }
  let en = null;
  for (const satir of cikti.split('\n')) {
    const s = ayikla(satir.trim());
    if (s && (!en || karsilastir(s, en) > 0)) en = s;
  }
  return { surum, etiket: en, etiketsiz: !en || karsilastir(surum, en) > 0 };
}

function etiketMetni(e) {
  if (!e || !e.etiketsiz) return null;
  if (!e.etiket)
    return 'Etiket   · depo ' + e.surum + ' · hiç sürüm etiketlenmemiş — güncelleme buraya ulaşmaz';
  return (
    'Etiket   · depo ' +
    e.surum +
    ' · en yeni etiket ' +
    e.etiket +
    ' — etiketlenmemiş sürüm, güncelleme buraya ulaşmaz'
  );
}

function guncelle(kok) {
  const once = durum(kok);
  let cikti = '';
  let sebep = null;
  try {
    cikti = String(
      execFileSync('claude', ['plugin', 'update', EKLENTI], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: GUNCELLEME_ZAMAN_ASIMI,
        windowsHide: true,
        shell: process.platform === 'win32',
      }) || ''
    ).trim();
  } catch (e) {
    sebep =
      String((e && (e.stderr || e.stdout)) || (e && e.message) || '').trim() ||
      'komut çalıştırılamadı';
  }
  const k = kurulu();
  const sonra = k ? k.surum : null;
  const hedef = once.uzak;
  const tuttu = !!(!sebep && sonra && hedef && karsilastir(sonra, hedef) >= 0);
  return {
    calisti: !sebep,
    sebep,
    cikti,
    komut: GUNCELLEME_KOMUTU,
    once: once.kurulu,
    hedef,
    sonra,
    tuttu,
  };
}

function guncelleMetni(g) {
  const s = [];
  if (!g.calisti) s.push('güncelleme çalışmadı · ' + g.sebep + ' · elle: ' + g.komut);
  else if (g.tuttu) s.push('güncellendi · ' + (g.once || '?') + ' → ' + g.sonra);
  else
    s.push(
      'güncelleme tutmadı · kurulu ' +
        (g.sonra || 'okunamadı') +
        ' · beklenen ' +
        (g.hedef || 'bilinmiyor') +
        ' — depo sürümü etiketlenmemiş olabilir'
    );
  if (g.calisti)
    s.push('Claude Code yeniden başlatılmalı — eklenti dosyaları çalışan oturumda eski kalır.');
  return s.join('\n');
}

function durum(kok, proje) {
  const k = kurulu();
  const u = uzak(kok);
  const fark = k && u ? karsilastir(u, k.surum) > 0 : false;
  return {
    kurulu: k ? k.surum : null,
    sha: k ? k.sha : null,
    uzak: u,
    yeni: fark,
    komut: GUNCELLEME_KOMUTU,
    etiket: etiketDurumu(proje),
  };
}

function metin(d) {
  const bas = !d.kurulu
    ? 'kurulu sürüm okunamadı — ' + path.join(konfigKok(), 'plugins')
    : !d.uzak
      ? 'kurulu ' + d.kurulu + ' · uzak sürüm sorulamadı'
      : d.yeni
        ? d.uzak + ' çıktı · kurulu ' + d.kurulu + ' · ' + d.komut
        : 'güncel · kurulu ' + d.kurulu + ' · uzakta en yeni ' + d.uzak;
  const e = etiketMetni(d.etiket);
  return e ? bas + '\n' + e : bas;
}

module.exports = {
  kurulu,
  uzak,
  karsilastir,
  ayikla,
  durum,
  metin,
  etiketDurumu,
  etiketMetni,
  guncelle,
  guncelleMetni,
  GUNCELLEME_KOMUTU,
};

if (require.main === module) {
  const json = process.argv.includes('--json');
  if (process.argv[2] === 'guncelle') {
    const g = guncelle();
    process.stdout.write((json ? JSON.stringify(g) : guncelleMetni(g)) + '\n');
  } else {
    const d = durum();
    process.stdout.write((json ? JSON.stringify(d) : metin(d)) + '\n');
  }
}
