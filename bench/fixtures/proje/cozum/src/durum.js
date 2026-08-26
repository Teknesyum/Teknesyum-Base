const { sayi } = require('./sayi.js');

const GECISLER = {
  yok: { olustur: 'yeni' },
  yeni: { onayla: 'onayli', iptal: 'iptal' },
  onayli: { gonder: 'gonderildi', iptal: 'iptal' },
  gonderildi: { teslim: 'teslim' },
  teslim: {},
  iptal: {},
};

function gecis(durum, olay) {
  const tablo = GECISLER[durum];
  if (!tablo) return null;
  return tablo[olay] === undefined ? null : tablo[olay];
}

function oynat(olaylar) {
  const sirali = (olaylar || [])
    .map((o, i) => ({ o, i }))
    .sort((a, b) => {
      const x = sayi(a.o.sira);
      const y = sayi(b.o.sira);
      if (x === null && y === null) return a.i - b.i;
      if (x === null) return 1;
      if (y === null) return -1;
      return x === y ? a.i - b.i : x - y;
    })
    .map((e) => e.o);
  let durum = 'yok';
  let adim = 0;
  for (const o of sirali) {
    const yeni = gecis(durum, o.olay);
    if (yeni === null) {
      return { durum, adim, hata: o.olay + ': gecersiz gecis (' + durum + ')' };
    }
    durum = yeni;
    adim++;
  }
  return { durum, adim, hata: null };
}

module.exports = { gecis, oynat };
