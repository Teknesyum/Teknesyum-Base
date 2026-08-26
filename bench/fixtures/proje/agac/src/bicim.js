function bicimSayi(deger, basamak) {
  const b = basamak === undefined ? 2 : basamak;
  const n = Number(deger);
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: b, maximumFractionDigits: b });
}

function bicimYuzde(deger) {
  return '%' + bicimSayi(deger, 2);
}

function kisalt(metin, uzunluk) {
  const m = String(metin);
  if (m.length <= uzunluk) return m;
  return m.slice(0, uzunluk) + '...';
}

function doldur(metin, uzunluk, hiza) {
  const m = String(metin);
  return hiza === 'sag' ? m.padStart(uzunluk) : m.padEnd(uzunluk);
}

function guvenliAd(metin) {
  return String(metin)
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

module.exports = { bicimSayi, bicimYuzde, kisalt, doldur, guvenliAd };
