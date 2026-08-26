const CARPAN = { mm: 1, cm: 10 };

function cevir(deger, kaynak, hedef) {
  if (!(kaynak in CARPAN)) throw new Error('bilinmeyen birim: ' + kaynak);
  if (!(hedef in CARPAN)) throw new Error('bilinmeyen birim: ' + hedef);
  return (deger * CARPAN[kaynak]) / CARPAN[hedef];
}

module.exports = { CARPAN, cevir };
