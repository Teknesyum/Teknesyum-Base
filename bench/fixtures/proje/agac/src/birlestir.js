function birlestir(sol, sag, solAnahtar, sagAnahtar) {
  for (const s of sol) {
    const e = sag.find((r) => String(r[sagAnahtar]) === String(s[solAnahtar]));
    if (e) {
      for (const alan of Object.keys(e)) {
        if (alan === sagAnahtar) continue;
        s[alan] = e[alan];
      }
    }
  }
  return sol;
}

module.exports = { birlestir };
