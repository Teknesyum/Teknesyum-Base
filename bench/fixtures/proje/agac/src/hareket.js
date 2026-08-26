function ayristirHareket(metin) {
  const kayitlar = [];
  for (const satir of metin.split('\n')) {
    const s = satir.replace(/\r$/, '');
    if (s.trim() === '') continue;
    const k = {};
    for (const parca of s.split(';')) {
      const p = parca.split('=');
      k[p[0]] = p[1];
    }
    kayitlar.push(k);
  }
  return kayitlar;
}

module.exports = { ayristirHareket };
