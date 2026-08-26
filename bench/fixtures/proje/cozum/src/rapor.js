function metin(deger) {
  return deger === null || deger === undefined ? '' : String(deger);
}

function tabloYaz(satirlar, sutunlar) {
  const genislik = sutunlar.map((s) => {
    let g = s.baslik.length;
    for (const r of satirlar) g = Math.max(g, metin(r[s.alan]).length);
    return g;
  });
  const hizala = (m, i) =>
    sutunlar[i].hiza === 'sag' ? m.padStart(genislik[i]) : m.padEnd(genislik[i]);
  const L = [];
  L.push(sutunlar.map((s, i) => hizala(s.baslik, i)).join(' | '));
  L.push(genislik.map((g) => '-'.repeat(g)).join('-+-'));
  for (const r of satirlar) L.push(sutunlar.map((s, i) => hizala(metin(r[s.alan]), i)).join(' | '));
  return L.map((s) => s.replace(/\s+$/, '')).join('\n');
}

function csvHucre(deger) {
  const m = metin(deger);
  if (m.includes(',') || m.includes('"') || m.includes('\n')) {
    return '"' + m.split('"').join('""') + '"';
  }
  return m;
}

function csvYaz(satirlar, sutunlar) {
  const L = [sutunlar.map((s) => csvHucre(s.baslik)).join(',')];
  for (const r of satirlar) L.push(sutunlar.map((s) => csvHucre(r[s.alan])).join(','));
  return L.join('\n');
}

module.exports = { tabloYaz, csvYaz };
