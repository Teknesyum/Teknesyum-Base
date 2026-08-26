function satirlara(metin) {
  return metin
    .split('\n')
    .map((s) => s.replace(/\r$/, ''))
    .filter((s) => s.trim() !== '');
}

function ayristirCsv(metin) {
  const satirlar = satirlara(metin);
  if (!satirlar.length) return [];
  const basliklar = satirlar[0].split(',');
  const kayitlar = [];
  for (let i = 1; i < satirlar.length; i++) {
    const alanlar = satirlar[i].split(',');
    const k = {};
    basliklar.forEach((b, j) => {
      k[b] = alanlar[j] === undefined ? '' : alanlar[j];
    });
    kayitlar.push(k);
  }
  return kayitlar;
}

module.exports = { ayristirCsv };
