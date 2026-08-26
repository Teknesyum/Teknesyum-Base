function satirlara(metin) {
  return metin.split('\n').map((s) => s.replace(/\r$/, ''));
}

function anlamliSatirlar(metin) {
  return satirlara(metin).filter((s) => s.trim() !== '' && !s.trim().startsWith('#'));
}

function csvSatirAyir(satir) {
  const alanlar = [];
  let cari = '';
  let tirnakli = false;
  for (let i = 0; i < satir.length; i++) {
    const c = satir[i];
    if (tirnakli) {
      if (c === '"') {
        if (satir[i + 1] === '"') {
          cari += '"';
          i++;
        } else tirnakli = false;
      } else cari += c;
    } else if (c === '"') tirnakli = true;
    else if (c === ',') {
      alanlar.push(cari);
      cari = '';
    } else cari += c;
  }
  alanlar.push(cari);
  return alanlar;
}

function ayristirCsv(metin) {
  const satirlar = anlamliSatirlar(metin);
  if (!satirlar.length) return [];
  const basliklar = csvSatirAyir(satirlar[0]).map((b) => b.trim());
  const kayitlar = [];
  for (let i = 1; i < satirlar.length; i++) {
    const alanlar = csvSatirAyir(satirlar[i]);
    const k = {};
    basliklar.forEach((b, j) => {
      k[b] = alanlar[j] === undefined ? '' : alanlar[j];
    });
    kayitlar.push(k);
  }
  return kayitlar;
}

function ayristirJsonl(metin) {
  const kayitlar = [];
  const satirlar = satirlara(metin);
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i];
    if (s.trim() === '') continue;
    try {
      kayitlar.push(JSON.parse(s));
    } catch {
      throw new Error('satir ' + (i + 1) + ': gecersiz json');
    }
  }
  return kayitlar;
}

module.exports = { ayristirCsv, ayristirJsonl };
