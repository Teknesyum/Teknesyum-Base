function yuvarlaDerin(deger) {
  if (typeof deger === 'number') return Math.round(deger * 100) / 100;
  if (Array.isArray(deger)) return deger.map(yuvarlaDerin);
  if (deger && typeof deger === 'object') {
    const yeni = {};
    for (const alan of Object.keys(deger)) yeni[alan] = yuvarlaDerin(deger[alan]);
    return yeni;
  }
  return deger;
}

function jsonRapor(deger) {
  return JSON.stringify(yuvarlaDerin(deger), null, 2);
}

module.exports = { jsonRapor };
