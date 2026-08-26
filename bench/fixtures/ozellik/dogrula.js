#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const kok = path.resolve(process.argv[2] || '.');
const hatalar = [];

function bak(ad, islev) {
  try {
    const sonuc = islev();
    if (sonuc !== true) hatalar.push(ad + ': ' + sonuc);
  } catch (e) {
    hatalar.push(ad + ': ' + String((e && e.message) || e));
  }
}

bak('src/gecmis.js olusturulmus', () =>
  fs.existsSync(path.join(kok, 'src', 'gecmis.js')) ? true : 'dosya yok'
);

let m = null;
bak('src/index.js yuklenebiliyor', () => {
  m = require(path.join(kok, 'src', 'index.js'));
  return true;
});

bak('m birimi tabloda', () => {
  if (!m) return 'modul yuklenmedi';
  if (typeof m.cevir !== 'function') return 'cevir disari acilmamis';
  const d = m.cevir(2, 'm', 'cm');
  return d === 200 ? true : 'cevir(2, m, cm) = ' + d + ', beklenen 200';
});

bak('eski birimler bozulmamis', () => {
  if (!m) return 'modul yuklenmedi';
  const d = m.cevir(3, 'cm', 'mm');
  return d === 30 ? true : 'cevir(3, cm, mm) = ' + d + ', beklenen 30';
});

bak('gecmis index uzerinden okunuyor', () => {
  if (!m) return 'modul yuklenmedi';
  if (typeof m.liste !== 'function') return 'liste disari acilmamis';
  const once = m.liste().length;
  m.cevir(1, 'm', 'mm');
  const sonra = m.liste().length;
  return sonra === once + 1 ? true : 'liste uzunlugu ' + once + ' -> ' + sonra + ', beklenen +1';
});

if (hatalar.length) {
  process.stdout.write('KIRMIZI · ' + hatalar.join(' | ') + '\n');
  process.exit(1);
}
process.stdout.write('YESIL · ozellik\n');
