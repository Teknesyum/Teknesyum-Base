function mutabakat(hareketler, satislar) {
  const kutular = new Map();
  for (const h of hareketler) {
    if (!kutular.has(h.kod)) kutular.set(h.kod, { kod: h.kod, giris: 0, cikis: 0, satisAdedi: 0 });
    const k = kutular.get(h.kod);
    const m = Number(h.miktar) || 0;
    if (h.tur === 'giris') k.giris += m;
    else k.cikis += m;
  }
  for (const s of satislar) {
    const k = kutular.get(s.urunKodu);
    if (!k) continue;
    k.satisAdedi += Number(s.adet) || 0;
  }
  const cikti = [];
  for (const k of kutular.values()) {
    cikti.push({
      kod: k.kod,
      giris: k.giris,
      cikis: k.cikis,
      stok: k.giris - k.cikis,
      satisAdedi: k.satisAdedi,
      fark: k.satisAdedi - k.cikis,
    });
  }
  return cikti;
}

module.exports = { mutabakat };
