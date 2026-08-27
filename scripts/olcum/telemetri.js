#!/usr/bin/env node

// Debug modunda biriken tur makbuzlarini okur. Veri kaynagi: gercek projelerde koşan
// oturumlar — sentetik bench degil, ek maliyeti olmayan gozlem.
//
// FABLE HUKMU (27.08.2026): bu veri "su ozellik su kadar tuketiyor" sorusunu DOGRUDAN
// cevaplamaz. Kanca gercek API tokenini gormez, transkript baytindan turetir; tek bir
// ozelligin baglam payi ayrilamaz. Cevaplanabilenler: hangi ozellik gercekten
// kullaniliyor, ajan sayisi ile maliyet nasil iliskileniyor, degisiklik oncesi/sonrasi
// egilim ne. Alt ajan basina maliyet tek gercek atiftir — ayri transkripti var.
// Kontrollu karsilastirma (premium vs native, ayni gorev) icin yine sentetik bench sart.

const fs = require('fs');
const path = require('path');
const os = require('os');

const TAVAN_GUN = 90;

function dosya() {
  const ev = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(ev, 'teknesyum-telemetri.jsonl');
}

function oku(yol) {
  let ham;
  try {
    ham = fs.readFileSync(yol, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const s of ham.split('\n')) {
    if (!s.trim()) continue;
    try {
      out.push(JSON.parse(s));
    } catch {}
  }
  return out;
}

function medyan(l) {
  if (!l.length) return 0;
  const s = l.slice().sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? s[o] : Math.round((s[o - 1] + s[o]) / 2);
}

function main() {
  const jsonMu = process.argv.includes('--json');
  const gunArg = (process.argv.find((a) => a.startsWith('--gun=')) || '').slice(6);
  const gun = Number(gunArg) || TAVAN_GUN;
  const yol = dosya();
  const esik = Date.now() - gun * 24 * 60 * 60 * 1000;

  const tur = oku(yol).filter((r) => {
    const t = Date.parse(r.ts);
    return Number.isFinite(t) && t >= esik;
  });

  if (!tur.length) {
    process.stdout.write(
      jsonMu
        ? JSON.stringify({ dosya: yol, tur: 0 }) + '\n'
        : 'Telemetri bos.\n\nDebug modu acik mi: `~/.claude/teknesyum.json` icinde "debug": true\n' +
            'Dosya: ' +
            yol +
            '\n'
    );
    return;
  }

  const proje = new Set(tur.map((r) => r.proje));
  const anaL = tur.map((r) => Number(r.tok_ana) || 0);
  const altL = tur.map((r) => Number(r.tok_alt) || 0);
  const toplamAna = anaL.reduce((a, b) => a + b, 0);
  const toplamAlt = altL.reduce((a, b) => a + b, 0);

  const arac = new Map();
  const skill = new Map();
  const ajan = new Map();
  let ajanliTur = 0;
  for (const r of tur) {
    for (const [ad, n] of Object.entries(r.arac || {})) arac.set(ad, (arac.get(ad) || 0) + n);
    for (const ad of r.skill || []) skill.set(ad, (skill.get(ad) || 0) + 1);
    for (const ad of r.ajan || []) ajan.set(ad, (ajan.get(ad) || 0) + 1);
    if ((r.ajan || []).length) ajanliTur++;
  }

  // Tek gercek atif: alt ajan basina maliyet. Ajanli ve ajansiz turlarin ana token
  // medyani ayrica verilir — karistiricilar serbest, bu bir korelasyondur, kanit degil.
  const ajanli = tur.filter((r) => (r.ajan || []).length);
  const ajansiz = tur.filter((r) => !(r.ajan || []).length);
  const ajanSayisi = ajanli.reduce((a, r) => a + r.ajan.length, 0);

  if (jsonMu) {
    process.stdout.write(
      JSON.stringify(
        {
          dosya: yol,
          gun,
          tur: tur.length,
          proje: proje.size,
          tok_ana_toplam: toplamAna,
          tok_alt_toplam: toplamAlt,
          tok_ana_medyan: medyan(anaL),
          tok_alt_medyan: medyan(altL),
          ajanli_tur: ajanliTur,
          ajan_basina_alt_token: ajanSayisi ? Math.round(toplamAlt / ajanSayisi) : 0,
          arac: Object.fromEntries([...arac].sort((a, b) => b[1] - a[1])),
          skill: Object.fromEntries([...skill].sort((a, b) => b[1] - a[1])),
          ajan: Object.fromEntries([...ajan].sort((a, b) => b[1] - a[1])),
        },
        null,
        2
      ) + '\n'
    );
    return;
  }

  const L = [];
  L.push('telemetri · son ' + gun + ' gun · ' + tur.length + ' tur · ' + proje.size + ' proje');
  L.push('');
  L.push('TOKEN');
  L.push('  ana oturum  toplam ' + toplamAna.toLocaleString('tr') + '  medyan ' + medyan(anaL));
  L.push('  alt ajanlar toplam ' + toplamAlt.toLocaleString('tr') + '  medyan ' + medyan(altL));
  L.push('');
  L.push('AJAN — tek gercek atif (alt ajanin ayri transkripti var)');
  L.push('  ajanli tur: ' + ajanliTur + '/' + tur.length + '  acilan ajan: ' + ajanSayisi);
  L.push('  ajan basina alt token: ' + (ajanSayisi ? Math.round(toplamAlt / ajanSayisi) : 0));
  L.push(
    '  ana token medyani — ajanli ' +
      medyan(ajanli.map((r) => Number(r.tok_ana) || 0)) +
      ' · ajansiz ' +
      medyan(ajansiz.map((r) => Number(r.tok_ana) || 0)) +
      '  (korelasyon, kanit degil)'
  );
  L.push('');
  L.push('KULLANIM — hangi ozellik gercekten cagriliyor');
  const sirali = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n);
  L.push('  skill : ' + (skill.size ? sirali(skill, 6).map((x) => x[0] + ' ' + x[1]).join(' · ') : 'hic'));
  L.push('  ajan  : ' + (ajan.size ? sirali(ajan, 6).map((x) => x[0] + ' ' + x[1]).join(' · ') : 'hic'));
  L.push('  arac  : ' + sirali(arac, 8).map((x) => x[0] + ' ' + x[1]).join(' · '));
  L.push('');
  L.push('Bu veri kontrollu karsilastirma yapmaz — gorevler farkli, karistirici serbest.');
  L.push('Premium vs native gibi kiyaslar icin sentetik bench sart.');
  process.stdout.write(L.join('\n') + '\n');
}

if (require.main === module) main();
module.exports = { oku, medyan };
