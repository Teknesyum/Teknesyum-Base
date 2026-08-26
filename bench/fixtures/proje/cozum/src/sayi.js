function sayi(deger) {
  if (typeof deger === 'number') return Number.isNaN(deger) ? null : deger;
  if (deger === null || deger === undefined) return null;
  const m = String(deger).trim().replace(',', '.');
  if (m === '') return null;
  const n = Number(m);
  return Number.isNaN(n) ? null : n;
}

function yuvarla(deger, basamak) {
  const n = sayi(deger);
  if (n === null) return null;
  const b = basamak === undefined ? 2 : basamak;
  const c = Math.pow(10, b);
  const isaret = n < 0 ? -1 : 1;
  return (isaret * Math.round(Math.abs(n) * c)) / c;
}

function yuzde(pay, payda) {
  const a = sayi(pay);
  const b = sayi(payda);
  if (a === null || b === null || b === 0) return null;
  return yuvarla((a / b) * 100, 2);
}

module.exports = { sayi, yuvarla, yuzde };
