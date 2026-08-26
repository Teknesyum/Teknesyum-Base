const ayar = require('./ayar');
const yazici = require('./yazici');

function bekle(ms) {
  return new Promise((coz) => setTimeout(coz, ms));
}

async function dene(is) {
  let gecikme = ayar.ilkBekleme;
  for (let n = 1; n <= ayar.denemeSayisi; n++) {
    try {
      return await is.calistir();
    } catch (e) {
      if (n === ayar.denemeSayisi) {
        yazici.olusuz({ ad: is.ad, hata: String((e && e.message) || e) });
        return null;
      }
      await bekle(gecikme);
      gecikme = gecikme * 2;
    }
  }
  return null;
}

module.exports = { dene, bekle };
