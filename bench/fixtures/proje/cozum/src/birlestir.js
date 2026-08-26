function sagAlanlar(sag, sagAnahtar) {
  const adlar = [];
  for (const r of sag) {
    for (const alan of Object.keys(r)) {
      if (alan === sagAnahtar) continue;
      if (!adlar.includes(alan)) adlar.push(alan);
    }
  }
  return adlar;
}

function birlestir(sol, sag, solAnahtar, sagAnahtar) {
  const adlar = sagAlanlar(sag, sagAnahtar);
  return sol.map((s) => {
    const yeni = { ...s };
    const e = sag.find((r) => String(r[sagAnahtar]) === String(s[solAnahtar]));
    for (const alan of adlar) {
      yeni[alan] = e && e[alan] !== undefined ? e[alan] : null;
    }
    return yeni;
  });
}

function birlestirCok(sol, sag, solAnahtar, sagAnahtar, alanAdi) {
  return sol.map((s) => {
    const yeni = { ...s };
    yeni[alanAdi] = sag.filter((r) => String(r[sagAnahtar]) === String(s[solAnahtar]));
    return yeni;
  });
}

module.exports = { birlestir, birlestirCok };
