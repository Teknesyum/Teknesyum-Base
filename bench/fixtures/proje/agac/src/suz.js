function suz(kayitlar, olcut) {
  let sonuc = kayitlar;
  if (olcut && olcut.esit) {
    for (const alan of Object.keys(olcut.esit)) {
      sonuc = sonuc.filter((k) => String(k[alan]) === String(olcut.esit[alan]));
    }
  }
  if (olcut && olcut.enAz) {
    for (const alan of Object.keys(olcut.enAz)) {
      sonuc = sonuc.filter((k) => k[alan] >= olcut.enAz[alan]);
    }
  }
  return sonuc;
}

module.exports = { suz };
