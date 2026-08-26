const { sayi, yuvarla } = require('./sayi.js');

function kosanToplam(satirlar, alan, ciktiAlani) {
  let toplam = 0;
  return satirlar.map((s) => {
    const d = sayi(s[alan]);
    toplam += d === null ? 0 : d;
    const yeni = { ...s };
    yeni[ciktiAlani] = yuvarla(toplam);
    return yeni;
  });
}

function hareketliOrtalama(satirlar, alan, ciktiAlani, pencere) {
  return satirlar.map((s, i) => {
    const bas = Math.max(0, i - pencere + 1);
    const dilim = satirlar
      .slice(bas, i + 1)
      .map((x) => sayi(x[alan]))
      .filter((v) => v !== null);
    const yeni = { ...s };
    yeni[ciktiAlani] = dilim.length
      ? yuvarla(dilim.reduce((a, b) => a + b, 0) / dilim.length)
      : null;
    return yeni;
  });
}

module.exports = { kosanToplam, hareketliOrtalama };
