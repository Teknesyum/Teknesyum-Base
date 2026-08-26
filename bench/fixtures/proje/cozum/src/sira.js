const { sayi } = require('./sayi.js');

function anahtarDegeri(kayit, olcut) {
  if (olcut.tur === 'sayi') return sayi(kayit[olcut.alan]);
  const d = kayit[olcut.alan];
  return d === null || d === undefined ? null : String(d);
}

function sirala(kayitlar, olcutler) {
  const liste = kayitlar.map((k, i) => ({ k, i }));
  const o = olcutler || [];
  liste.sort((a, b) => {
    for (const olcut of o) {
      const x = anahtarDegeri(a.k, olcut);
      const y = anahtarDegeri(b.k, olcut);
      if (x === null && y === null) continue;
      if (x === null) return 1;
      if (y === null) return -1;
      if (x === y) continue;
      const yon = olcut.yon === 'azalan' ? -1 : 1;
      return (x < y ? -1 : 1) * yon;
    }
    return a.i - b.i;
  });
  return liste.map((e) => e.k);
}

module.exports = { sirala };
