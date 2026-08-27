const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const BETIK = path.join(KOK, 'scripts', 'olcum', 'istem-yuku.js');
const ESIK = 1400;
const OLMAYAN = ['ozel', 'beep', 'autocompact', 'report', 'rcall', 'rcadvanced'];

const r = spawnSync(process.execPath, [BETIK, '--dogrula'], { encoding: 'utf8' });

if (r.error) {
  console.error('ölçüm doğrulaması çalıştırılamadı: ' + r.error.message);
  process.exit(1);
}

process.stdout.write(r.stdout || '');
if (r.stderr) process.stderr.write(r.stderr);

let dustu = r.status !== 0;
if (dustu) console.error('\nÖlçüm doğrulaması — KALDI (çıkış ' + r.status + ')');

const j = spawnSync(process.execPath, [BETIK, '--json'], { encoding: 'utf8' });
if (j.error || j.status !== 0) {
  console.error(
    'eşik testi: --json çıktısı alınamadı — çıkış ' +
      j.status +
      (j.error ? ' · ' + j.error.message : '') +
      (j.stderr ? '\n' + j.stderr : '')
  );
  process.exit(1);
}

let veri;
try {
  veri = JSON.parse(j.stdout);
} catch (e) {
  console.error('eşik testi: --json çözümlenemedi — ' + e.message);
  process.exit(1);
}

const token = veri && veri.oturumdaBirKez && veri.oturumdaBirKez.token;
if (typeof token !== 'number') {
  console.error('eşik testi: oturumdaBirKez.token bulunamadı');
  process.exit(1);
}

if (token > ESIK) {
  let enUzun = null;
  for (const grup of Object.keys(veri.gruplar || {})) {
    if (grup.indexOf('enjeksiyon') !== -1) continue;
    for (const kayit of veri.gruplar[grup] || []) {
      if (!enUzun || kayit.token > enUzun.token) {
        enUzun = { grup: grup, ad: kayit.ad, token: kayit.token };
      }
    }
  }
  console.error(
    '\nSabit yüzey eşiği — KALDI: oturumdaBirKez.token ' +
      token +
      ', eşik ' +
      ESIK +
      ' (' +
      (token - ESIK) +
      ' token aşıldı).'
  );
  if (enUzun) {
    console.error(
      'En uzun tanım: ' +
        enUzun.grup +
        ' → ' +
        enUzun.ad +
        ' (' +
        enUzun.token +
        ' token). Önce oraya bak.'
    );
  }
  dustu = true;
} else {
  console.log('Sabit yüzey eşiği — GEÇTİ (' + token + ' ≤ ' + ESIK + ')');
}

function dosyalar(dizin, biriktir) {
  let girdiler;
  try {
    girdiler = fs.readdirSync(dizin, { withFileTypes: true });
  } catch (e) {
    return biriktir;
  }
  for (const g of girdiler) {
    if (g.name === 'trash' || g.name === 'node_modules') continue;
    const tam = path.join(dizin, g.name);
    if (g.isDirectory()) dosyalar(tam, biriktir);
    else if (/\.(js|md|json)$/.test(g.name)) biriktir.push(tam);
  }
  return biriktir;
}

const yorumMu = (s) =>
  s.startsWith('//') || s.startsWith('*') || s.startsWith('/*') || s.startsWith('#');
const kalip = new RegExp('/(' + OLMAYAN.join('|') + ')(?!\\.js)(?![\\w-])');

const bulunan = [];
for (const dizin of [
  path.join(KOK, 'teknesyum', 'scripts'),
  path.join(KOK, 'teknesyum', 'skills'),
]) {
  for (const dosya of dosyalar(dizin, [])) {
    const satirlar = fs.readFileSync(dosya, 'utf8').split(/\r?\n/);
    satirlar.forEach((satir, i) => {
      const kirp = satir.trim();
      if (yorumMu(kirp)) return;
      const m = kalip.exec(satir);
      if (!m) return;
      if (/(require|from)\s*\(?\s*['"]/.test(satir)) return;
      bulunan.push(path.relative(KOK, dosya) + ':' + (i + 1) + ' → ' + m[0]);
    });
  }
}

if (bulunan.length) {
  console.error(
    '\nOlmayan komut adı — KALDI: aşağıdaki satırlar kullanıcıya yüklenmeyen bir slash komutunu' +
      ' talimat olarak veriyor. Doğru çağrı yolunu yaz (help.md tablosu).'
  );
  for (const b of bulunan) console.error('  ' + b);
  dustu = true;
} else {
  console.log('Olmayan komut adı — GEÇTİ (scripts/ ve skills/ temiz)');
}

if (dustu) process.exit(1);

console.log('Ölçüm doğrulaması — GEÇTİ');
