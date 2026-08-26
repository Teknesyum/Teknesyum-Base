const { sayi } = require('./sayi.js');
const { ayristirTarih } = require('./tarih.js');

function bos(d) {
  if (d === null || d === undefined) return true;
  return typeof d === 'string' && d.trim() === '';
}

function denetle(kayit, sema) {
  const hatalar = [];
  for (const alan of Object.keys(sema || {})) {
    const kural = sema[alan];
    const d = kayit ? kayit[alan] : undefined;
    if (bos(d)) {
      if (kural.zorunlu) hatalar.push(alan + ': zorunlu alan bos');
      continue;
    }
    if (kural.tur === 'sayi' && sayi(d) === null) hatalar.push(alan + ': sayi degil');
    else if (kural.tur === 'tarih' && ayristirTarih(d) === null)
      hatalar.push(alan + ': tarih degil');
  }
  return hatalar;
}

module.exports = { denetle };
