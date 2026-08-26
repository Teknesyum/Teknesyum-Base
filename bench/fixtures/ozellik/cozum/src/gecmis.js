const kayitlar = [];

function kaydet(kayit) {
  kayitlar.push(kayit);
  return kayit;
}

function liste() {
  return kayitlar.slice();
}

module.exports = { kaydet, liste };
