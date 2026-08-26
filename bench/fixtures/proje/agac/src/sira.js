function sirala(kayitlar, olcutler) {
  const o = olcutler[0];
  return kayitlar.sort((a, b) => {
    const x = String(a[o.alan]);
    const y = String(b[o.alan]);
    return o.yon === 'azalan' ? y.localeCompare(x) : x.localeCompare(y);
  });
}

module.exports = { sirala };
