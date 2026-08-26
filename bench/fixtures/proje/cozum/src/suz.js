const { sayi } = require('./sayi.js');

function metin(d) {
  return String(d === null || d === undefined ? '' : d);
}

function suz(kayitlar, olcut) {
  let sonuc = kayitlar.slice();
  if (!olcut) return sonuc;
  if (olcut.esit) {
    for (const alan of Object.keys(olcut.esit)) {
      sonuc = sonuc.filter((k) => String(k[alan]) === String(olcut.esit[alan]));
    }
  }
  if (olcut.degil) {
    for (const alan of Object.keys(olcut.degil)) {
      sonuc = sonuc.filter((k) => String(k[alan]) !== String(olcut.degil[alan]));
    }
  }
  if (olcut.enAz) {
    for (const alan of Object.keys(olcut.enAz)) {
      const s = sayi(olcut.enAz[alan]);
      sonuc = sonuc.filter((k) => {
        const d = sayi(k[alan]);
        return d !== null && s !== null && d >= s;
      });
    }
  }
  if (olcut.enCok) {
    for (const alan of Object.keys(olcut.enCok)) {
      const s = sayi(olcut.enCok[alan]);
      sonuc = sonuc.filter((k) => {
        const d = sayi(k[alan]);
        return d !== null && s !== null && d <= s;
      });
    }
  }
  if (olcut.arasinda) {
    for (const alan of Object.keys(olcut.arasinda)) {
      const alt = sayi(olcut.arasinda[alan][0]);
      const ust = sayi(olcut.arasinda[alan][1]);
      sonuc = sonuc.filter((k) => {
        const d = sayi(k[alan]);
        return d !== null && alt !== null && ust !== null && d >= alt && d <= ust;
      });
    }
  }
  if (olcut.icerir) {
    for (const alan of Object.keys(olcut.icerir)) {
      const p = String(olcut.icerir[alan]).toLowerCase();
      sonuc = sonuc.filter((k) => metin(k[alan]).toLowerCase().includes(p));
    }
  }
  if (olcut.baslar) {
    for (const alan of Object.keys(olcut.baslar)) {
      const p = String(olcut.baslar[alan]).toLowerCase();
      sonuc = sonuc.filter((k) => metin(k[alan]).toLowerCase().startsWith(p));
    }
  }
  return sonuc;
}

module.exports = { suz };
