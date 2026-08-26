function grupla(kayitlar, anahtar, ozetler) {
  const kutular = new Map();
  for (const k of kayitlar) {
    const d = k[anahtar];
    if (!kutular.has(d)) kutular.set(d, []);
    kutular.get(d).push(k);
  }
  const cikti = [];
  for (const [d, liste] of kutular) {
    const satir = {};
    satir[anahtar] = d;
    for (const ad of Object.keys(ozetler)) {
      const o = ozetler[ad];
      const degerler = liste.map((k) => Number(k[o.alan]) || 0);
      if (o.islev === 'toplam') satir[ad] = degerler.reduce((a, b) => a + b, 0);
      else if (o.islev === 'ortalama')
        satir[ad] = degerler.reduce((a, b) => a + b, 0) / kayitlar.length;
      else satir[ad] = null;
    }
    cikti.push(satir);
  }
  return cikti;
}

module.exports = { grupla };
