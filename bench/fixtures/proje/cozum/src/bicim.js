const { sayi, yuvarla } = require('./sayi.js');
const { ayristirTarih } = require('./tarih.js');

function binlik(tam) {
  let cikti = '';
  for (let i = 0; i < tam.length; i++) {
    if (i > 0 && (tam.length - i) % 3 === 0) cikti += '.';
    cikti += tam[i];
  }
  return cikti;
}

function bicimSayi(deger, basamak) {
  const b = basamak === undefined ? 2 : basamak;
  const n = sayi(deger);
  if (n === null) return '-';
  const y = yuvarla(n, b);
  const mutlak = Math.abs(y).toFixed(b);
  const parcalar = mutlak.split('.');
  const govde = binlik(parcalar[0]) + (parcalar[1] ? ',' + parcalar[1] : '');
  return (y < 0 ? '-' : '') + govde;
}

function bicimYuzde(deger) {
  if (sayi(deger) === null) return '-';
  return '%' + bicimSayi(deger, 2);
}

function bicimTarih(metin) {
  const t = ayristirTarih(metin);
  if (!t) return '-';
  return (
    String(t.gun).padStart(2, '0') + '.' + String(t.ay).padStart(2, '0') + '.' + String(t.yil)
  );
}

function kisalt(metin, uzunluk) {
  const m = String(metin === null || metin === undefined ? '' : metin);
  if (uzunluk <= 0) return '';
  if (m.length <= uzunluk) return m;
  if (uzunluk < 4) return m.slice(0, uzunluk);
  return m.slice(0, uzunluk - 3) + '...';
}

function doldur(metin, uzunluk, hiza, dolgu) {
  const m = String(metin === null || metin === undefined ? '' : metin);
  const d = dolgu === undefined || dolgu === '' ? ' ' : String(dolgu)[0];
  if (m.length >= uzunluk) return m;
  return hiza === 'sag' ? m.padStart(uzunluk, d) : m.padEnd(uzunluk, d);
}

function basHarf(metin) {
  const m = String(metin === null || metin === undefined ? '' : metin);
  let cikti = '';
  let bastayiz = true;
  for (const c of m) {
    if (c === ' ') {
      cikti += c;
      bastayiz = true;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) cikti += bastayiz ? c.toUpperCase() : c.toLowerCase();
    else cikti += c;
    bastayiz = false;
  }
  return cikti;
}

function guvenliAd(metin) {
  const m = String(metin === null || metin === undefined ? '' : metin);
  let cikti = '';
  for (const c of m) {
    if (c >= 'A' && c <= 'Z') cikti += c.toLowerCase();
    else if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) cikti += c;
    else if (c === ' ' || c === '-') cikti += '-';
  }
  return cikti.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

module.exports = { bicimSayi, bicimYuzde, bicimTarih, kisalt, doldur, basHarf, guvenliAd };
