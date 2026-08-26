function denetle(kayit, sema) {
  const hatalar = [];
  for (const alan of Object.keys(sema)) {
    const kural = sema[alan];
    const d = kural.tur === 'sayi' ? Number(kayit[alan]) : kayit[alan];
    if (kural.zorunlu && !d) {
      hatalar.push(alan + ': zorunlu alan bos');
      continue;
    }
    if (kural.tur === 'sayi' && Number.isNaN(d)) hatalar.push(alan + ': sayi degil');
  }
  return hatalar;
}

module.exports = { denetle };
