const { sayi, yuvarla } = require('./sayi.js');

function mutabakat(hareketler, satislar) {
  const kutular = new Map();
  const kutu = (kod) => {
    if (!kutular.has(kod)) kutular.set(kod, { kod, giris: 0, cikis: 0, satisAdedi: 0 });
    return kutular.get(kod);
  };
  for (const h of hareketler) {
    const k = kutu(h.kod);
    const m = sayi(h.miktar);
    if (m === null) continue;
    if (h.tur === 'giris') k.giris += m;
    else if (h.tur === 'cikis') k.cikis += m;
  }
  for (const s of satislar) {
    const k = kutu(s.urunKodu);
    const m = sayi(s.adet);
    if (m !== null) k.satisAdedi += m;
  }
  const cikti = [];
  for (const k of kutular.values()) {
    cikti.push({
      kod: k.kod,
      giris: yuvarla(k.giris),
      cikis: yuvarla(k.cikis),
      stok: yuvarla(k.giris - k.cikis),
      satisAdedi: yuvarla(k.satisAdedi),
      fark: yuvarla(k.cikis - k.satisAdedi),
    });
  }
  return cikti;
}

module.exports = { mutabakat };
