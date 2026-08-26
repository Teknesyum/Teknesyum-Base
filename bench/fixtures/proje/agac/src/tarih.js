function ayristirTarih(metin) {
  const p = String(metin === null || metin === undefined ? '' : metin).trim().split('-');
  if (p.length !== 3) return null;
  return { yil: Number(p[0]), ay: Number(p[1]), gun: Number(p[2]) };
}

function donem(metin, birim) {
  const d = new Date(metin);
  if (birim === 'yil') return String(d.getFullYear());
  return d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0');
}

module.exports = { ayristirTarih, donem };
