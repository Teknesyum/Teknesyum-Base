const GECISLER = {
  yok: { olustur: 'yeni' },
  yeni: { onayla: 'onayli', iptal: 'iptal' },
  onayli: { gonder: 'gonderildi' },
  gonderildi: { teslim: 'teslim' },
};

function gecis(durum, olay) {
  const tablo = GECISLER[durum];
  if (!tablo) return null;
  return tablo[olay] || null;
}

function oynat(olaylar) {
  let durum = 'yok';
  let adim = 0;
  let hata = null;
  for (const o of olaylar) {
    const yeni = gecis(durum, o.olay);
    if (yeni === null) {
      hata = o.olay + ': gecersiz gecis';
      continue;
    }
    durum = yeni;
    adim++;
  }
  return { durum, adim, hata };
}

module.exports = { gecis, oynat };
