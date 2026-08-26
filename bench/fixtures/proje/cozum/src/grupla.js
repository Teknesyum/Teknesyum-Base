const { sayi } = require('./sayi.js');

function yuvarla(x) {
  return Math.round(x * 100) / 100;
}

function grupla(kayitlar, anahtar, ozetler) {
  const anahtarlar = Array.isArray(anahtar) ? anahtar : [anahtar];
  const kutular = new Map();
  for (const k of kayitlar) {
    const kimlik = JSON.stringify(
      anahtarlar.map((a) => (k[a] === undefined ? null : k[a]))
    );
    if (!kutular.has(kimlik)) kutular.set(kimlik, []);
    kutular.get(kimlik).push(k);
  }
  const cikti = [];
  for (const liste of kutular.values()) {
    const satir = {};
    for (const a of anahtarlar) satir[a] = liste[0][a] === undefined ? null : liste[0][a];
    for (const ad of Object.keys(ozetler || {})) {
      const o = ozetler[ad];
      if (o.islev === 'adet') {
        satir[ad] = liste.length;
        continue;
      }
      if (o.islev === 'farkli') {
        const kume = new Set();
        for (const k of liste) {
          const d = k[o.alan];
          if (d === null || d === undefined) continue;
          kume.add(String(d));
        }
        satir[ad] = kume.size;
        continue;
      }
      if (o.islev === 'ilk' || o.islev === 'son') {
        const k = o.islev === 'ilk' ? liste[0] : liste[liste.length - 1];
        satir[ad] = k[o.alan] === undefined ? null : k[o.alan];
        continue;
      }
      const degerler = liste.map((k) => sayi(k[o.alan])).filter((v) => v !== null);
      if (o.islev === 'ortanca') {
        if (!degerler.length) satir[ad] = null;
        else {
          const s = degerler.slice().sort((a, b) => a - b);
          const n = s.length;
          satir[ad] = yuvarla(n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2);
        }
        continue;
      }
      if (o.islev === 'toplam') satir[ad] = yuvarla(degerler.reduce((a, b) => a + b, 0));
      else if (o.islev === 'ortalama')
        satir[ad] = degerler.length
          ? yuvarla(degerler.reduce((a, b) => a + b, 0) / degerler.length)
          : null;
      else if (o.islev === 'enBuyuk')
        satir[ad] = degerler.length ? yuvarla(Math.max(...degerler)) : null;
      else if (o.islev === 'enKucuk')
        satir[ad] = degerler.length ? yuvarla(Math.min(...degerler)) : null;
      else satir[ad] = null;
    }
    cikti.push(satir);
  }
  return cikti;
}

module.exports = { grupla };
