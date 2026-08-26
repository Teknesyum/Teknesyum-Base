const { kaydet } = require('./gecmis');

const CARPAN = { mm: 1, cm: 10, m: 1000 };

function cevir(deger, kaynak, hedef) {
  if (!(kaynak in CARPAN)) throw new Error('bilinmeyen birim: ' + kaynak);
  if (!(hedef in CARPAN)) throw new Error('bilinmeyen birim: ' + hedef);
  const sonuc = (deger * CARPAN[kaynak]) / CARPAN[hedef];
  kaydet({ deger, kaynak, hedef, sonuc });
  return sonuc;
}

module.exports = { CARPAN, cevir };
