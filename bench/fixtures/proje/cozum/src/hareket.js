function ayristirHareket(metin) {
  const kayitlar = [];
  for (const ham of metin.split('\n')) {
    const satir = ham.replace(/\r$/, '');
    if (satir.trim() === '' || satir.trim().startsWith('#')) continue;
    const k = {};
    for (const parca of satir.split(';')) {
      const i = parca.indexOf('=');
      if (i < 0) continue;
      k[parca.slice(0, i).trim()] = parca.slice(i + 1).trim();
    }
    kayitlar.push(k);
  }
  return kayitlar;
}

module.exports = { ayristirHareket };
