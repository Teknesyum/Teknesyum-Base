const AY_GUN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function artikMi(yil) {
  return (yil % 4 === 0 && yil % 100 !== 0) || yil % 400 === 0;
}

function ayGunu(yil, ay) {
  return ay === 2 && artikMi(yil) ? 29 : AY_GUN[ay - 1];
}

function ayristirTarih(metin) {
  if (metin === null || metin === undefined) return null;
  const p = String(metin).trim().split('-');
  if (p.length !== 3) return null;
  if (!/^\d{4}$/.test(p[0]) || !/^\d{1,2}$/.test(p[1]) || !/^\d{1,2}$/.test(p[2])) return null;
  const yil = Number(p[0]);
  const ay = Number(p[1]);
  const gun = Number(p[2]);
  if (ay < 1 || ay > 12) return null;
  if (gun < 1 || gun > ayGunu(yil, ay)) return null;
  return { yil, ay, gun };
}

function donem(metin, birim) {
  const t = ayristirTarih(metin);
  if (!t) return null;
  const ay = String(t.ay).padStart(2, '0');
  if (birim === 'yil') return String(t.yil);
  if (birim === 'ay') return t.yil + '-' + ay;
  if (birim === 'gun') return t.yil + '-' + ay + '-' + String(t.gun).padStart(2, '0');
  if (birim === 'ceyrek') return t.yil + '-C' + String(Math.floor((t.ay - 1) / 3) + 1);
  return null;
}

function gunSayisi(metin) {
  const t = ayristirTarih(metin);
  if (!t) return null;
  let gun = 0;
  if (t.yil >= 1970) {
    for (let y = 1970; y < t.yil; y++) gun += artikMi(y) ? 366 : 365;
  } else {
    for (let y = t.yil; y < 1970; y++) gun -= artikMi(y) ? 366 : 365;
  }
  for (let a = 1; a < t.ay; a++) gun += ayGunu(t.yil, a);
  return gun + t.gun - 1;
}

function gunFarki(a, b) {
  const x = gunSayisi(a);
  const y = gunSayisi(b);
  return x === null || y === null ? null : y - x;
}

module.exports = { ayristirTarih, donem, gunSayisi, gunFarki };
