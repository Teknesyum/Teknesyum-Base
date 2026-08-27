#!/usr/bin/env node
// U9 — pembe/mor renk körlüğü simülasyonu.
//
// Bu dosya iki iş birden yapar:
//   1. Simülasyonu ve ΔE2000'i baştan hesaplar (aşağıdaki fonksiyonlar).
//   2. docs/olcumler/renk-korlugu.md içindeki HER sayıyı bu hesapla karşılaştırır.
//
// Neden böyle: yalnız belgedeki sayıları sabit olarak doğrulayan bir test yanlış
// güvence verir — yanlış sayı kendini doğrular. Bu yüzden önce hesabın kendisi
// dış kaynaklı referanslara karşı doğrulanır, sonra belge o hesaba karşı.
//
// Tek başına koşar:  node test/u9-renkkorlugu.js

const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..');
const BELGE = path.join(KOK, 'docs', 'olcumler', 'renk-korlugu.md');

let gecen = 0;
const hatalar = [];

function onay(ad, kosul, detay) {
  if (kosul) {
    gecen++;
    return;
  }
  hatalar.push(detay ? `${ad} — ${detay}` : ad);
}
function yakin(ad, a, b, tol) {
  onay(ad, Math.abs(a - b) <= tol, `beklenen ${b}, çıkan ${a} (tolerans ${tol})`);
}

// ---------------------------------------------------------------------------
// 1. Matris yardımcıları
// ---------------------------------------------------------------------------

const mul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const uygula = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);

function ters(a) {
  const d =
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const c = [
    [
      a[1][1] * a[2][2] - a[1][2] * a[2][1],
      -(a[0][1] * a[2][2] - a[0][2] * a[2][1]),
      a[0][1] * a[1][2] - a[0][2] * a[1][1],
    ],
    [
      -(a[1][0] * a[2][2] - a[1][2] * a[2][0]),
      a[0][0] * a[2][2] - a[0][2] * a[2][0],
      -(a[0][0] * a[1][2] - a[0][2] * a[1][0]),
    ],
    [
      a[1][0] * a[2][1] - a[1][1] * a[2][0],
      -(a[0][0] * a[2][1] - a[0][1] * a[2][0]),
      a[0][0] * a[1][1] - a[0][1] * a[1][0],
    ],
  ];
  return c.map((r) => r.map((v) => v / d));
}

// ---------------------------------------------------------------------------
// 2. sRGB
// ---------------------------------------------------------------------------
// IEC 61966-2-1 aktarım eğrisi. libDaltonLens.c ile aynı eşikler.

const linerle = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linerBoz = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
const kirp = (v) => Math.min(1, Math.max(0, v));

function hexAyir(h) {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
}
function hexYap(rgb) {
  return (
    '#' +
    rgb
      .map((v) =>
        Math.round(kirp(v) * 255)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}
const hexLiner = (h) => hexAyir(h).map(linerle);
const linerHex = (v) => hexYap(v.map((x) => linerBoz(kirp(x))));

// ---------------------------------------------------------------------------
// 3. Viénot 1999 dikromasi simülasyonu
// ---------------------------------------------------------------------------
// KAYNAK A — önceden hesaplanmış tek matris, lineer sRGB üzerinde çalışır.
// libDaltonLens (kamu malı, DaltonLens/libDaltonLens, libDaltonLens.c),
// `dl_vienot_protan_rgbCvd_from_rgb` ve `dl_vienot_deutan_rgbCvd_from_rgb`.
// Kaynağın kendisi Viénot, Brettel & Mollon 1999, "Digital video colourmaps for
// checking the legibility of displays by dichromats", Color Res. Appl. 24(4).

const VIENOT_PROTAN_YAYIN = [
  [0.11238, 0.88762, 0.0],
  [0.11238, 0.88762, 0.0],
  [0.00401, -0.00401, 1.0],
];
const VIENOT_DEUTAN_YAYIN = [
  [0.29275, 0.70725, 0.0],
  [0.29275, 0.70725, 0.0],
  [-0.02234, 0.02234, 1.0],
];

// KAYNAK B — aynı matrisin tam boru hattından türetilmesi.
// LMS_from_linearRGB (Smith & Pokorny 1975 koni temelli), DaltonLens
// "Understanding LMS-based Color Blindness Simulations" ve DaltonLens-Python
// convert.py içinde birebir bu sayılarla veriliyor.
const LMS_LINER_RGB = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];
// Viénot 1999'un dikromat düzlemine izdüşümü: protanopta L kanalı M ve S'den,
// deuteranopta M kanalı L ve S'den yeniden kurulur.
const IZDUSUM_PROTAN = [
  [0, 2.02344, -2.52581],
  [0, 1, 0],
  [0, 0, 1],
];
const IZDUSUM_DEUTAN = [
  [1, 0, 0],
  [0.494207, 0, 1.24827],
  [0, 0, 1],
];

const LMS_TERS = ters(LMS_LINER_RGB);
const VIENOT_PROTAN_TUREV = mul(mul(LMS_TERS, IZDUSUM_PROTAN), LMS_LINER_RGB);
const VIENOT_DEUTAN_TUREV = mul(mul(LMS_TERS, IZDUSUM_DEUTAN), LMS_LINER_RGB);

const MATRIS = {
  normal: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  protanopi: VIENOT_PROTAN_YAYIN,
  deuteranopi: VIENOT_DEUTAN_YAYIN,
};

/** hex → o hexin verilen görme tipindeki karşılığı (hex). */
function simule(hex, tip) {
  if (tip === 'normal') return hex.toLowerCase();
  return linerHex(uygula(MATRIS[tip], hexLiner(hex)));
}

// ---------------------------------------------------------------------------
// 4. CIELab ve ΔE2000
// ---------------------------------------------------------------------------
// sRGB→XYZ matrisi ezberden yazılmıyor: sRGB'nin tanımı olan birincil
// kromatiklerden ve D65 beyaz noktasından türetiliyor (IEC 61966-2-1).

function rgbXyzMatrisi() {
  const [xr, yr] = [0.64, 0.33];
  const [xg, yg] = [0.3, 0.6];
  const [xb, yb] = [0.15, 0.06];
  const [xw, yw] = [0.3127, 0.329];
  const M = [
    [xr / yr, xg / yg, xb / yb],
    [1, 1, 1],
    [(1 - xr - yr) / yr, (1 - xg - yg) / yg, (1 - xb - yb) / yb],
  ];
  const W = [xw / yw, 1, (1 - xw - yw) / yw];
  const S = uygula(ters(M), W);
  return M.map((r) => r.map((v, j) => v * S[j]));
}
const RGB_XYZ = rgbXyzMatrisi();
const BEYAZ = uygula(RGB_XYZ, [1, 1, 1]);

function hexLab(hex) {
  const xyz = uygula(RGB_XYZ, hexLiner(hex));
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [fx, fy, fz] = [f(xyz[0] / BEYAZ[0]), f(xyz[1] / BEYAZ[1]), f(xyz[2] / BEYAZ[2])];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** CIEDE2000. Sharma, Wu & Dalal 2005 uygulama notlarındaki biçim. kL=kC=kH=1. */
function deltaE2000(lab1, lab2) {
  const [L1, a1, b1] = lab1,
    [L2, a2, b2] = lab2;
  const C1 = Math.hypot(a1, b1),
    C2 = Math.hypot(a2, b2);
  const Cort = (C1 + C2) / 2;
  const C7 = Cort ** 7;
  const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + 25 ** 7)));
  const ap1 = (1 + G) * a1,
    ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1),
    Cp2 = Math.hypot(ap2, b2);
  const aci = (b, a) => {
    if (b === 0 && a === 0) return 0;
    const h = Math.atan2(b, a) * DEG;
    return h < 0 ? h + 360 : h;
  };
  const hp1 = aci(b1, ap1),
    hp2 = aci(b2, ap2);

  const dLp = L2 - L1;
  const dCp = Cp2 - Cp1;
  let dhp;
  if (Cp1 * Cp2 === 0) dhp = 0;
  else if (Math.abs(hp2 - hp1) <= 180) dhp = hp2 - hp1;
  else if (hp2 - hp1 > 180) dhp = hp2 - hp1 - 360;
  else dhp = hp2 - hp1 + 360;
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dhp / 2) * RAD);

  const Lort = (L1 + L2) / 2;
  const Cport = (Cp1 + Cp2) / 2;
  let hort;
  if (Cp1 * Cp2 === 0) hort = hp1 + hp2;
  else if (Math.abs(hp1 - hp2) <= 180) hort = (hp1 + hp2) / 2;
  else if (hp1 + hp2 < 360) hort = (hp1 + hp2 + 360) / 2;
  else hort = (hp1 + hp2 - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos((hort - 30) * RAD) +
    0.24 * Math.cos(2 * hort * RAD) +
    0.32 * Math.cos((3 * hort + 6) * RAD) -
    0.2 * Math.cos((4 * hort - 63) * RAD);

  const dTeta = 30 * Math.exp(-(((hort - 275) / 25) ** 2));
  const Cp7 = Cport ** 7;
  const RC = 2 * Math.sqrt(Cp7 / (Cp7 + 25 ** 7));
  const L50 = (Lort - 50) ** 2;
  const SL = 1 + (0.015 * L50) / Math.sqrt(20 + L50);
  const SC = 1 + 0.045 * Cport;
  const SH = 1 + 0.015 * Cport * T;
  const RT = -Math.sin(2 * dTeta * RAD) * RC;

  return Math.sqrt(
    (dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH)
  );
}

const dEHex = (h1, h2) => deltaE2000(hexLab(h1), hexLab(h2));

/** WCAG bağıl parlaklık ve kontrast oranı — yalnız metin/zemin sütunu için. */
const parlaklik = (hex) => {
  const [r, g, b] = hexLiner(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function kontrast(h1, h2) {
  const [a, b] = [parlaklik(h1), parlaklik(h2)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

// ---------------------------------------------------------------------------
// 5. Palet, çiftler, eşikler
// ---------------------------------------------------------------------------

const PALET = {
  'neon-blue': '#00f3ff',
  'neon-pink': '#ff00ea',
  'neon-purple': '#b026ff',
  'pink-text': '#ff54eb',
  'purple-text': '#c67eff',
  success: '#34d399',
  amber: '#fbbf24',
};
const ZEMINLER = { bg: '#000000', surface: '#08090a' };

const CIFTLER = [
  ['pembe / mor', '#ff00ea', '#b026ff'],
  ['pembe-metin / mor-metin', '#ff54eb', '#c67eff'],
  ['amber / success', '#fbbf24', '#34d399'],
  ['amber / pembe', '#fbbf24', '#ff00ea'],
  ['mavi / success', '#00f3ff', '#34d399'],
  ['mavi / mor', '#00f3ff', '#b026ff'],
];
const TIPLER = ['normal', 'protanopi', 'deuteranopi'];

/** Eşikler pratiktir, WCAG karşılığı yoktur. */
function yorum(dE) {
  if (dE < 10) return 'ayırt edilemez';
  if (dE <= 20) return 'zayıf';
  return 'yeterli';
}

// ---------------------------------------------------------------------------
// 6. Hesap — belgeye giren bütün sayılar burada üretilir
// ---------------------------------------------------------------------------

function hesapla() {
  const simTablo = {};
  for (const [ad, hex] of Object.entries(PALET)) {
    simTablo[ad] = {
      hex,
      protanopi: simule(hex, 'protanopi'),
      deuteranopi: simule(hex, 'deuteranopi'),
    };
  }
  const ciftTablo = CIFTLER.map(([ad, a, b]) => {
    const satir = { ad, a, b };
    for (const t of TIPLER) {
      const dE = dEHex(simule(a, t), simule(b, t));
      satir[t] = { dE, yorum: yorum(dE) };
    }
    return satir;
  });
  const metinTablo = ['pink-text', 'purple-text', 'neon-blue', 'success'].map((ad) => {
    const satir = { ad, hex: PALET[ad] };
    for (const t of TIPLER) {
      const s = simule(PALET[ad], t);
      satir[t] = { hex: s, bg: kontrast(s, ZEMINLER.bg), surface: kontrast(s, ZEMINLER.surface) };
    }
    return satir;
  });
  return { simTablo, ciftTablo, metinTablo };
}

// ---------------------------------------------------------------------------
// 7. Doğrulama katmanı A — hesabın kendisi dış kaynaklara karşı
// ---------------------------------------------------------------------------

function katmanA() {
  // A1. İki bağımsız yol aynı matrisi vermeli.
  //     Yol A: libDaltonLens'in yayımladığı önceden hesaplanmış matris.
  //     Yol B: Smith & Pokorny LMS matrisi + Viénot izdüşümü ile yeniden türetme.
  //     Matris yanlış yazılmışsa iki yol örtüşmez.
  for (const [ad, A, B] of [
    ['protan', VIENOT_PROTAN_YAYIN, VIENOT_PROTAN_TUREV],
    ['deutan', VIENOT_DEUTAN_YAYIN, VIENOT_DEUTAN_TUREV],
  ]) {
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        yakin(`A1 ${ad} matris [${i}][${j}]`, B[i][j], A[i][j], 1e-4);
      }
  }

  // A2. Yapısal değişmezler — matrisin yanlış yerleştirilmesini yakalar.
  for (const [ad, M] of [
    ['protan', VIENOT_PROTAN_YAYIN],
    ['deutan', VIENOT_DEUTAN_YAYIN],
  ]) {
    // Satır toplamı 1: beyaz beyaz kalır.
    for (let i = 0; i < 3; i++)
      yakin(
        `A2 ${ad} satır ${i} toplamı`,
        M[i].reduce((s, v) => s + v, 0),
        1,
        1e-5
      );
    // İzdüşüm eşgüçlüdür: M·M = M. Devrik yazılırsa bu düşer.
    const MM = mul(M, M);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        yakin(`A2 ${ad} eşgüçlülük [${i}][${j}]`, MM[i][j], M[i][j], 1e-4);
      }
    // Dikromatta kırmızı-yeşil ekseni çöker: R ve G çıkışı eşit olur.
    const c = uygula(M, hexLiner('#ff0000'));
    yakin(`A2 ${ad} kırmızıda R=G`, c[0], c[1], 1e-6);
  }

  // A3. Uçtan uca demirler.
  onay('A3 beyaz protanopide sabit', simule('#ffffff', 'protanopi') === '#ffffff');
  onay('A3 beyaz deuteranopide sabit', simule('#ffffff', 'deuteranopi') === '#ffffff');
  onay('A3 siyah protanopide sabit', simule('#000000', 'protanopi') === '#000000');
  onay('A3 siyah deuteranopide sabit', simule('#000000', 'deuteranopi') === '#000000');
  // Saf mavi S konisiyle taşınır, dikromatta kırmızı-yeşil katkısı yoktur.
  onay('A3 saf mavi protanopide sabit', simule('#0000ff', 'protanopi') === '#0000ff');

  // A4. Lab demirleri.
  yakin('A4 beyaz L*', hexLab('#ffffff')[0], 100, 1e-6);
  yakin('A4 beyaz a*', hexLab('#ffffff')[1], 0, 1e-6);
  yakin('A4 beyaz b*', hexLab('#ffffff')[2], 0, 1e-6);
  yakin('A4 siyah L*', hexLab('#000000')[0], 0, 1e-9);

  // A5. ΔE2000 — Sharma, Wu & Dalal 2005, Color Res. Appl. 30(1), Tablo I.
  //     34 çiftin tamamı. Formülün arctan, ortalama hue ve RT terimleri buradan
  //     doğrulanır; yanlış bir uygulama en az bir çiftte düşer.
  const SHARMA = [
    [50.0, 2.6772, -79.7751, 50.0, 0.0, -82.7485, 2.0425],
    [50.0, 3.1571, -77.2803, 50.0, 0.0, -82.7485, 2.8615],
    [50.0, 2.8361, -74.02, 50.0, 0.0, -82.7485, 3.4412],
    [50.0, -1.3802, -84.2814, 50.0, 0.0, -82.7485, 1.0],
    [50.0, -1.1848, -84.8006, 50.0, 0.0, -82.7485, 1.0],
    [50.0, -0.9009, -85.5211, 50.0, 0.0, -82.7485, 1.0],
    [50.0, 0.0, 0.0, 50.0, -1.0, 2.0, 2.3669],
    [50.0, -1.0, 2.0, 50.0, 0.0, 0.0, 2.3669],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.0009, 7.1792],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.001, 7.1792],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.0011, 7.2195],
    [50.0, 2.49, -0.001, 50.0, -2.49, 0.0012, 7.2195],
    [50.0, -0.001, 2.49, 50.0, 0.0009, -2.49, 4.8045],
    [50.0, -0.001, 2.49, 50.0, 0.001, -2.49, 4.8045],
    [50.0, -0.001, 2.49, 50.0, 0.0011, -2.49, 4.7461],
    [50.0, 2.5, 0.0, 50.0, 0.0, -2.5, 4.3065],
    [50.0, 2.5, 0.0, 73.0, 25.0, -18.0, 27.1492],
    [50.0, 2.5, 0.0, 61.0, -5.0, 29.0, 22.8977],
    [50.0, 2.5, 0.0, 56.0, -27.0, -3.0, 31.903],
    [50.0, 2.5, 0.0, 58.0, 24.0, 15.0, 19.4535],
    [50.0, 2.5, 0.0, 50.0, 3.1736, 0.5854, 1.0],
    [50.0, 2.5, 0.0, 50.0, 3.2972, 0.0, 1.0],
    [50.0, 2.5, 0.0, 50.0, 1.8634, 0.5757, 1.0],
    [50.0, 2.5, 0.0, 50.0, 3.2592, 0.335, 1.0],
    [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
    [63.0109, -31.0961, -5.8663, 62.8187, -29.7946, -4.0864, 1.263],
    [61.2901, 3.7196, -5.3901, 61.4292, 2.248, -4.962, 1.8731],
    [35.0831, -44.1164, 3.7933, 35.0232, -40.0716, 1.5901, 1.8645],
    [22.7233, 20.0904, -46.694, 23.0331, 14.973, -42.5619, 2.0373],
    [36.4612, 47.858, 18.3852, 36.2715, 50.5065, 21.2231, 1.4146],
    [90.8027, -2.0831, 1.441, 91.1528, -1.6435, 0.0447, 1.4441],
    [90.9257, -0.5406, -0.9208, 88.6381, -0.8985, -0.7239, 1.5381],
    [6.7747, -0.2908, -2.4247, 5.8714, -0.0985, -2.2286, 0.6377],
    [2.0776, 0.0795, -1.135, 0.9033, -0.0636, -0.5514, 0.9082],
  ];
  onay('A5 Sharma çift sayısı 34', SHARMA.length === 34, `${SHARMA.length} satır var`);
  SHARMA.forEach((s, i) => {
    const ileri = deltaE2000([s[0], s[1], s[2]], [s[3], s[4], s[5]]);
    const geri = deltaE2000([s[3], s[4], s[5]], [s[0], s[1], s[2]]);
    yakin(`A5 Sharma çift ${i + 1}`, Number(ileri.toFixed(4)), s[6], 1e-4);
    yakin(`A5 Sharma çift ${i + 1} bakışımlı`, geri, ileri, 1e-10);
  });
}

// ---------------------------------------------------------------------------
// 8. Doğrulama katmanı B — belge hesaba karşı
// ---------------------------------------------------------------------------

function belgeSatirlari(metin, baslik) {
  const bolum = metin.split(/^## /m).find((b) => b.startsWith(baslik));
  if (!bolum) return null;
  return bolum
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !/^\|[\s:|-]+\|$/.test(l.trim()))
    .map((l) =>
      l
        .trim()
        .slice(1, -1)
        .split('|')
        .map((h) => h.trim())
    )
    .slice(1); // başlık satırı
}
const say = (s) =>
  Number(
    String(s)
      .replace(/\*\*/g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '')
  );
const hx = (s) => (String(s).match(/#[0-9a-fA-F]{6}/) || [''])[0].toLowerCase();

function katmanB(h) {
  if (!fs.existsSync(BELGE)) {
    hatalar.push(`B0 belge yok: ${BELGE}`);
    return;
  }
  const metin = fs.readFileSync(BELGE, 'utf8');

  // B1. Simüle edilmiş palet hexleri.
  const s1 = belgeSatirlari(metin, 'Simüle edilmiş palet');
  onay('B1 palet tablosu bulundu', !!s1);
  if (s1) {
    onay(
      'B1 satır sayısı',
      s1.length === Object.keys(PALET).length,
      `${s1.length} satır, ${Object.keys(PALET).length} bekleniyordu`
    );
    for (const satir of s1) {
      const ad = satir[0].replace(/[`*]/g, '');
      const b = h.simTablo[ad];
      onay(`B1 ${ad} tanınıyor`, !!b);
      if (!b) continue;
      onay(`B1 ${ad} kaynak hex`, hx(satir[1]) === b.hex, `belge ${hx(satir[1])}, hesap ${b.hex}`);
      onay(
        `B1 ${ad} protanopi`,
        hx(satir[2]) === b.protanopi,
        `belge ${hx(satir[2])}, hesap ${b.protanopi}`
      );
      onay(
        `B1 ${ad} deuteranopi`,
        hx(satir[3]) === b.deuteranopi,
        `belge ${hx(satir[3])}, hesap ${b.deuteranopi}`
      );
    }
  }

  // B2. ΔE2000 çift tablosu.
  const s2 = belgeSatirlari(metin, 'Ölçüm — ΔE2000');
  onay('B2 ΔE tablosu bulundu', !!s2);
  if (s2) {
    onay(
      'B2 satır sayısı',
      s2.length === CIFTLER.length,
      `${s2.length} satır, ${CIFTLER.length} bekleniyordu`
    );
    for (const satir of s2) {
      const ad = satir[0].replace(/[`*]/g, '');
      const b = h.ciftTablo.find((c) => c.ad === ad);
      onay(`B2 ${ad} tanınıyor`, !!b);
      if (!b) continue;
      onay(
        `B2 ${ad} hexler`,
        hx(satir[1]) === b.a && hx(satir[2]) === b.b,
        `belge ${hx(satir[1])}/${hx(satir[2])}, hesap ${b.a}/${b.b}`
      );
      TIPLER.forEach((t, i) => {
        yakin(`B2 ${ad} ${t} ΔE`, say(satir[3 + i]), Number(b[t].dE.toFixed(1)), 0.05);
      });
      onay(
        `B2 ${ad} yorum`,
        satir[6].replace(/[`*]/g, '') === yorum(Math.min(...TIPLER.map((t) => b[t].dE))),
        `belge "${satir[6]}", hesap "${yorum(Math.min(...TIPLER.map((t) => b[t].dE)))}"`
      );
    }
  }

  // B3. Metin rolü kontrast tablosu.
  const s3 = belgeSatirlari(metin, 'Kontrast');
  onay('B3 kontrast tablosu bulundu', !!s3);
  if (s3) {
    for (const satir of s3) {
      const ad = satir[0].replace(/[`*]/g, '');
      const b = h.metinTablo.find((m) => m.ad === ad);
      onay(`B3 ${ad} tanınıyor`, !!b);
      if (!b) continue;
      const tip = satir[1].replace(/[`*]/g, '');
      onay(`B3 ${ad} tip geçerli`, TIPLER.includes(tip), `"${tip}"`);
      if (!TIPLER.includes(tip)) continue;
      onay(
        `B3 ${ad}/${tip} hex`,
        hx(satir[2]) === b[tip].hex,
        `belge ${hx(satir[2])}, hesap ${b[tip].hex}`
      );
      yakin(`B3 ${ad}/${tip} #000000`, say(satir[3]), Number(b[tip].bg.toFixed(2)), 0.005);
      yakin(`B3 ${ad}/${tip} #08090a`, say(satir[4]), Number(b[tip].surface.toFixed(2)), 0.005);
    }
  }

  // B4. Belge kaynağını yazmak zorunda — kaynaksız sayı ölçülmemiş sayılır.
  for (const iz of ['Viénot', 'libDaltonLens', 'Sharma', 'Smith', 'WCAG karşılığı yoktur']) {
    onay(`B4 belgede "${iz}" geçiyor`, metin.includes(iz));
  }
}

// ---------------------------------------------------------------------------
// 9. Koşum
// ---------------------------------------------------------------------------

const hesap = hesapla();

if (process.argv.includes('--dok')) {
  // Belgeyi yazarken kullanılan çıktı. Testin kendisi bunu kullanmaz.
  console.log(JSON.stringify(hesap, null, 2));
  process.exit(0);
}

katmanA();
katmanB(hesap);

console.log(`U9 renk körlüğü — ${gecen} doğrulama geçti, ${hatalar.length} düştü.`);
if (hatalar.length) {
  for (const h of hatalar.slice(0, 40)) console.log(`  KALDI  ${h}`);
  if (hatalar.length > 40) console.log(`  ... ve ${hatalar.length - 40} tane daha`);
  console.log('KALDI');
  process.exit(1);
}
console.log('GEÇTİ');
