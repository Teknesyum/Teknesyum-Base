#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { kosuOzeti, gecerlilik, pearson, DURUMLAR, TUREV_ESIGI } = require('./topla.js');

const KOK = path.resolve(__dirname, '..', '..');
const SONUC_KOK = path.join(KOK, 'bench', 'sonuc');
const CIKTI_JSON = path.join(SONUC_KOK, 'proje-istatistik.json');

const GOREV = 'proje';
const METRIKLER = [
  { ad: 'sureSn', baslik: 'sure (sn)' },
  { ad: 'tazeToken', baslik: 'taze token' },
  { ad: 'kusur', baslik: 'kusur' },
  { ad: 'tur', baslik: 'tur' },
  { ad: 'ajan', baslik: 'ajan' },
];
const TUREV_ADAYLARI = [
  { ad: 'cacheRead', baslik: 'cache-read' },
  { ad: 'tazeToken', baslik: 'taze token' },
  { ad: 'sureSn', baslik: 'sure (sn)' },
  { ad: 'kusur', baslik: 'kusur' },
  { ad: 'ajan', baslik: 'ajan' },
];
const KARSILASTIRILAN = ['sureSn', 'tazeToken', 'kusur'];

const TAM_SAYIM_TAVANI = 20000;
const ORNEKLEM = 10000;
const TOHUM = 20260826;
const ALFA = 0.05;
const EPS = 1e-12;

function bayrak(ad) {
  return process.argv.includes('--' + ad);
}

function deger(ad) {
  const on = '--' + ad + '=';
  const s = process.argv.find((a) => a.startsWith(on));
  return s ? s.slice(on.length) : null;
}

function prng(tohum) {
  let a = tohum >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function say(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

function yuvarla(x, basamak) {
  if (x === null) return null;
  const c = Math.pow(10, basamak === undefined ? 2 : basamak);
  return Math.round(x * c) / c;
}

async function kosulariOku(kaynak) {
  if (!fs.existsSync(kaynak)) throw new Error('kaynak dizin yok: ' + kaynak);
  const dosyalar = fs
    .readdirSync(kaynak)
    .filter((f) => /^proje__[a-z]+__r\d+\.json$/.test(f))
    .map((f) => path.join(kaynak, f))
    .sort();
  const kosular = [];
  for (const d of dosyalar) {
    const ham = JSON.parse(fs.readFileSync(d, 'utf8'));
    const k = await kosuOzeti(d);
    const g = gecerlilik(ham);
    const kalem = k.toplamKalem || ham.toplamKalem || null;
    kosular.push({
      dosya: path.basename(d),
      gorev: ham.gorev || GOREV,
      durum: ham.durum,
      tekrar: say(ham.tekrar),
      hata: ham.hata || null,
      gecerli: g.gecerli,
      gecersizNedeni: g.gecersizNedeni,
      sureSn: k.sureMs ? k.sureMs / 1000 : say(ham.sureMs) === null ? null : ham.sureMs / 1000,
      tazeToken: kalem ? kalem.input + kalem.cc + kalem.out : null,
      cacheRead: kalem ? kalem.cr : null,
      // Gecersiz kosuda kusur bilinmiyor: 0 da 27 de degil, null.
      kusur: g.gecerli ? (say(ham.kusurSayisi) !== null ? ham.kusurSayisi : k.kusur) : null,
      tur: say(k.tur) !== null ? k.tur : say(ham.bildirilenTur),
      ajan: say(k.ajanSayisi) !== null ? k.ajanSayisi : say(ham.ajanSayisi),
    });
  }
  return kosular;
}

function betimle(dizi) {
  const v = dizi.filter((x) => say(x) !== null).slice().sort((a, b) => a - b);
  const n = v.length;
  if (!n) return { n: 0, ortalama: null, ss: null, medyan: null, min: null, maks: null };
  const ort = v.reduce((a, b) => a + b, 0) / n;
  const ss =
    n > 1 ? Math.sqrt(v.reduce((t, x) => t + (x - ort) * (x - ort), 0) / (n - 1)) : null;
  const medyan = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  return {
    n,
    ortalama: yuvarla(ort, 3),
    ss: ss === null ? null : yuvarla(ss, 3),
    medyan: yuvarla(medyan, 3),
    min: v[0],
    maks: v[n - 1],
  };
}

// Blok ici isaret degis-tokuslu eslemeli permutasyon testi. n kucukse tam sayim,
// buyukse sabit tohumlu orneklem — iki yolda da ayni girdi ayni p'yi verir.
function permutasyon(farklar) {
  const n = farklar.length;
  if (!n) return null;
  const gozlenen = Math.abs(farklar.reduce((a, b) => a + b, 0) / n);
  const kombinasyon = Math.pow(2, n);
  if (kombinasyon <= TAM_SAYIM_TAVANI) {
    let sayac = 0;
    for (let m = 0; m < kombinasyon; m++) {
      let t = 0;
      for (let i = 0; i < n; i++) t += (m >> i) & 1 ? -farklar[i] : farklar[i];
      if (Math.abs(t / n) >= gozlenen - EPS) sayac++;
    }
    return { p: sayac / kombinasyon, yontem: 'tam sayim', orneklem: kombinasyon };
  }
  const rast = prng(TOHUM);
  let sayac = 0;
  for (let m = 0; m < ORNEKLEM; m++) {
    let t = 0;
    for (let i = 0; i < n; i++) t += rast() < 0.5 ? -farklar[i] : farklar[i];
    if (Math.abs(t / n) >= gozlenen - EPS) sayac++;
  }
  return { p: (sayac + 1) / (ORNEKLEM + 1), yontem: 'orneklem', orneklem: ORNEKLEM };
}

function cliffDelta(a, b) {
  if (!a.length || !b.length) return null;
  let buyuk = 0;
  let kucuk = 0;
  for (const x of a)
    for (const y of b) {
      if (x > y) buyuk++;
      else if (x < y) kucuk++;
    }
  return yuvarla((buyuk - kucuk) / (a.length * b.length), 3);
}

function esleTut(kosular, durum, metrik) {
  const h = new Map();
  for (const k of kosular) {
    if (k.durum !== durum) continue;
    if (say(k[metrik]) === null) continue;
    h.set(k.tekrar, k[metrik]);
  }
  return h;
}

function ciftKarsilastir(kosular, a, b, metrik) {
  const ha = esleTut(kosular, a, metrik);
  const hb = esleTut(kosular, b, metrik);
  const bloklar = [...ha.keys()].filter((t) => hb.has(t)).sort((x, y) => x - y);
  const farklar = bloklar.map((t) => ha.get(t) - hb.get(t));
  const n = farklar.length;
  if (!n) {
    return { a, b, metrik, n: 0, etiket: 'veri yok', p: null };
  }
  const ortA = bloklar.reduce((t, x) => t + ha.get(x), 0) / n;
  const ortB = bloklar.reduce((t, x) => t + hb.get(x), 0) / n;
  const perm = permutasyon(farklar);
  const enKucukP = Math.pow(2, 1 - n);
  return {
    a,
    b,
    metrik,
    n,
    bloklar,
    ortalamaA: yuvarla(ortA, 3),
    ortalamaB: yuvarla(ortB, 3),
    ortalamaFark: yuvarla(ortA - ortB, 3),
    yuzdeFark: ortB === 0 ? null : yuvarla(((ortA - ortB) / Math.abs(ortB)) * 100, 2),
    cliffDelta: cliffDelta(bloklar.map((t) => ha.get(t)), bloklar.map((t) => hb.get(t))),
    p: yuvarla(perm.p, 5),
    yontem: perm.yontem,
    orneklem: perm.orneklem,
    enKucukP: yuvarla(enKucukP, 5),
    etiket: null,
  };
}

function etiketle(karsilastirmalar) {
  const esik = ALFA / Math.max(1, karsilastirmalar.filter((c) => c.n > 0).length);
  for (const c of karsilastirmalar) {
    if (!c.n) continue;
    c.bonferroniEsigi = yuvarla(esik, 5);
    if (c.ortalamaFark === 0) c.etiket = 'ayirt edilemedi';
    else if (c.p < esik) c.etiket = 'fark var';
    else if (c.p < ALFA) c.etiket = 'sinirda, coklu karsilastirma esigini gecmiyor';
    else c.etiket = 'ayirt edilemedi';
  }
  return esik;
}

// Tur sayisiyla |r| > 0,9 olan metrik turev damgasi alir; birincil tabloda ve
// karsilastirmalarda kullanilmaz. Tek gorev sinifi oldugu icin merkezleme gerekmez.
function turevTaramasi(kosular) {
  const tur = kosular.map((k) => k.tur);
  return TUREV_ADAYLARI.map((m) => {
    const r = pearson(
      kosular.map((k) => k[m.ad]),
      tur
    );
    return { ad: m.ad, baslik: m.baslik, r, turev: r !== null && Math.abs(r) > TUREV_ESIGI };
  });
}

function analiz(hepsi) {
  const kosular = hepsi.filter((k) => k.gecerli !== false);
  const elenenler = hepsi.filter((k) => k.gecerli === false);
  const durumlar = DURUMLAR.filter((d) => kosular.some((k) => k.durum === d));
  // Yaptirim: "turev metrikler kullanilmaz" cumlesi statik listeleri kismiyordu.
  // Tarama once kosar, damgali metrik birincil tablodan ve karsilastirmadan dusurulur.
  const turevler = turevTaramasi(kosular);
  const damgali = new Set(turevler.filter((t) => t.turev).map((t) => t.ad));
  const metrikler = METRIKLER.filter((m) => !damgali.has(m.ad));
  const karsilastirilan = KARSILASTIRILAN.filter((m) => !damgali.has(m));
  const dusurulen = {
    metrik: METRIKLER.filter((m) => damgali.has(m.ad)).map((m) => m.ad),
    karsilastirma: KARSILASTIRILAN.filter((m) => damgali.has(m)),
  };
  const ozet = {};
  for (const d of durumlar) {
    ozet[d] = {};
    for (const m of metrikler) ozet[d][m.ad] = betimle(kosular.filter((k) => k.durum === d).map((k) => k[m.ad]));
  }
  const karsilastirmalar = [];
  for (let i = 0; i < durumlar.length; i++)
    for (let j = i + 1; j < durumlar.length; j++)
      for (const m of karsilastirilan)
        karsilastirmalar.push(ciftKarsilastir(kosular, durumlar[i], durumlar[j], m));
  const esik = etiketle(karsilastirmalar);
  const blokSayisi = new Set(kosular.map((k) => k.tekrar)).size;
  return {
    durumlar,
    metrikler,
    karsilastirilan,
    dusurulen,
    ozet,
    karsilastirmalar,
    turevler,
    elenenler,
    gecerliSayisi: kosular.length,
    bonferroniEsigi: yuvarla(esik, 5),
    blokSayisi,
  };
}

function rapor(kosular, a) {
  const L = [];
  L.push(
    'proje bench istatistigi — ' + a.gecerliSayisi + ' gecerli kosu (' + a.elenenler.length +
      ' elendi), ' + a.durumlar.length + ' kosul, ' + a.blokSayisi + ' blok'
  );
  L.push('');
  L.push('## Elenen kosular');
  L.push('');
  if (!a.elenenler.length) {
    L.push('Elenen kosu yok.');
  } else {
    L.push(
      'Cikis kodu, tavan, is_error ya da oturum limiti imzasi tasiyan kosular gecersiz ' +
        'damgalandi. Asagidaki hicbir betimleyiciye ve teste girmiyorlar; kusur alanlari ' +
        '0 degil BILINMIYOR. Sessiz dusurme yok, hepsi burada:'
    );
    L.push('');
    for (const k of a.elenenler) L.push('- ' + k.dosya + ' — ' + k.gecersizNedeni);
  }
  L.push('');
  L.push('## Kosul basina betimleyici');
  L.push('');
  L.push(
    'kosul'.padEnd(10) + 'metrik'.padEnd(13) + 'n'.padEnd(4) + 'ortalama'.padStart(12) +
      'ss'.padStart(12) + 'medyan'.padStart(12) + 'min'.padStart(12) + 'maks'.padStart(12)
  );
  for (const d of a.durumlar) {
    for (const m of a.metrikler) {
      const b = a.ozet[d][m.ad];
      L.push(
        d.padEnd(10) + m.baslik.padEnd(13) + String(b.n).padEnd(4) +
          String(b.ortalama ?? '-').padStart(12) + String(b.ss ?? '-').padStart(12) +
          String(b.medyan ?? '-').padStart(12) + String(b.min ?? '-').padStart(12) +
          String(b.maks ?? '-').padStart(12)
      );
    }
  }
  L.push('');
  L.push('## Eslemeli permutasyon testi');
  L.push('');
  L.push(
    'Bloklar tekrar indisine gore eslendi; blok ici isaret degis-tokusu ile iki yonlu p. ' +
      'Coklu karsilastirma: ' + a.karsilastirmalar.filter((c) => c.n > 0).length +
      ' test, Bonferroni esigi p < ' + a.bonferroniEsigi + '.'
  );
  L.push('');
  L.push(
    'cift'.padEnd(20) + 'metrik'.padEnd(12) + 'n'.padEnd(4) + 'ort fark'.padStart(12) +
      '% fark'.padStart(10) + 'delta'.padStart(8) + 'p'.padStart(10) + '  yorum'
  );
  for (const c of a.karsilastirmalar) {
    if (!c.n) {
      L.push((c.a + ' - ' + c.b).padEnd(20) + c.metrik.padEnd(12) + '0'.padEnd(4) + '  veri yok');
      continue;
    }
    L.push(
      (c.a + ' - ' + c.b).padEnd(20) + c.metrik.padEnd(12) + String(c.n).padEnd(4) +
        String(c.ortalamaFark).padStart(12) + String(c.yuzdeFark ?? '-').padStart(10) +
        String(c.cliffDelta ?? '-').padStart(8) + String(c.p).padStart(10) + '  ' + c.etiket
    );
  }
  L.push('');
  L.push('## Turev metrikler');
  L.push('');
  L.push(
    'Her metrigin tur sayisiyla Pearson korelasyonu. |r| > ' + TUREV_ESIGI + ' olan metrik ' +
      'bagimsiz bilgi tasimaz — tur sayisini baska birimle tekrar yazar — ve turev damgasi ' +
      'alir. Turev metrikler birincil tabloda ve karsilastirmalarda kullanilmaz.'
  );
  L.push('');
  L.push('metrik'.padEnd(14) + 'r(tur)'.padStart(10) + '  damga');
  for (const t of a.turevler)
    L.push(t.baslik.padEnd(14) + String(t.r ?? '-').padStart(10) + '  ' + (t.turev ? 'TUREV' : 'birincil'));
  L.push('');
  const damgali = a.turevler.filter((t) => t.turev).map((t) => t.ad);
  L.push(
    'Yaptirim — damgali metrik: ' + (damgali.join(', ') || 'yok') +
      ' · betimleyici tablodan dusurulen: ' + (a.dusurulen.metrik.join(', ') || 'yok') +
      ' · karsilastirmadan dusurulen: ' + (a.dusurulen.karsilastirma.join(', ') || 'yok') +
      ' · birincil kalan: ' + a.metrikler.map((m) => m.ad).join(', ') + '.'
  );
  L.push('');
  L.push('## Durustluk serhi');
  L.push('');
  const n = a.blokSayisi;
  const enKucuk = Math.pow(2, 1 - n);
  L.push('- Blok sayisi n = ' + n + '. Eslemeli isaret degis-tokusunda ulasilabilecek en kucuk iki yonlu p = ' + yuvarla(enKucuk, 5) + '.');
  if (enKucuk > ALFA)
    L.push(
      '- Bu n ile HICBIR karsilastirma p < ' + ALFA + ' veremez. Yukaridaki tabloda "fark var" yazan satir yoktur; ' +
        'en kucuk p tam ayrisma demektir, istatistiksel anlamlilik demek degildir.'
    );
  else if (enKucuk > a.bonferroniEsigi)
    L.push(
      '- Bu n tek basina alfa esigini gecebilir ama Bonferroni esigini (' + a.bonferroniEsigi +
        ') gecemez; "sinirda" etiketleri boyle okunmalidir.'
    );
  L.push('- Ortalama fark ve % fark blok eslemeli hesaplandi; Cliff deltasi eslemesiz sira karsilastirmasidir.');
  L.push('- Anlamli cikmayan hicbir aralik "fark" diye adlandirilmadi; etiketi "ayirt edilemedi" olan satirlar sonuc tasimaz.');
  if (a.elenenler.length)
    L.push(
      '- ' + a.elenenler.length + ' kosu gecersiz kapisinda elendi. Blok esleme yalnizca iki ' +
        'kosulun da gecerli kosu verdigi bloklarda kurulur; elenen bloklar n sayisini dusurur, ' +
        'guc buna gore okunmalidir.'
    );
  const eksik = [];
  for (const d of a.durumlar)
    for (const m of a.metrikler)
      if (a.ozet[d][m.ad].n === 0) eksik.push(d + '/' + m.baslik);
  if (eksik.length) L.push('- Olculemeyen metrikler (transkript yok ya da alan bos): ' + eksik.join(', ') + '.');
  L.push('');
  return L.join('\n');
}

function sentetikYaz(dizin, tanim) {
  fs.rmSync(dizin, { recursive: true, force: true });
  fs.mkdirSync(dizin, { recursive: true });
  for (const [durum, satirlar] of Object.entries(tanim)) {
    satirlar.forEach((v, i) => {
      const s = {
        anahtar: 'proje__' + durum,
        dosyaAdi: 'proje__' + durum + '__r' + (i + 1),
        gorev: 'proje',
        durum,
        tekrar: i + 1,
        sureMs: v.sureSn * 1000,
        kusurSayisi: v.kusur,
        bildirilenTur: v.tur,
        ajanSayisi: 1,
        toplamKalem: { input: v.taze, cc: 0, cr: v.cr, out: 0 },
        dogrulama: { gecti: v.kusur === 0, cikti: '' },
        transkript: null,
        hata: null,
      };
      fs.writeFileSync(path.join(dizin, s.dosyaAdi + '.json'), JSON.stringify(s, null, 2) + '\n', 'utf8');
    });
  }
}

function satir(sureSn, taze, kusur) {
  return { sureSn, taze, cr: 1000, kusur, tur: 10 };
}

async function kendiTesti() {
  const iddialar = [];
  const onay = (ad, kosul, gorulen) => iddialar.push({ ad, gecti: !!kosul, gorulen });

  const dizinA = path.join(os.tmpdir(), 'tbench-istatistik', 'a');
  sentetikYaz(dizinA, {
    premium: [satir(100, 1000, 0), satir(110, 1100, 0), satir(120, 1200, 0)],
    normal: [satir(150, 1500, 2), satir(160, 1600, 2), satir(170, 1700, 2)],
    eco: [satir(150, 1500, 2), satir(160, 1600, 2), satir(170, 1700, 2)],
    native: [satir(200, 2000, 4), satir(210, 2100, 4), satir(220, 2200, 4)],
  });
  const a = analiz(await kosulariOku(dizinA));
  const bul = (x, y, m) => a.karsilastirmalar.find((c) => c.a === x && c.b === y && c.metrik === m);

  const pn = bul('premium', 'native', 'sureSn');
  onay('4x3 bilinen fark: yon negatif', pn.ortalamaFark === -100, pn.ortalamaFark);
  onay('4x3 bilinen fark: % fark -47.62', pn.yuzdeFark === -47.62, pn.yuzdeFark);
  onay('4x3 bilinen fark: cliff delta -1', pn.cliffDelta === -1, pn.cliffDelta);
  onay('4x3 bilinen fark: p n=3 tabaninda', pn.p === 0.25 && pn.enKucukP === 0.25, pn.p);
  onay('4x3 bilinen fark: n=3 anlamli sayilmadi', pn.etiket === 'ayirt edilemedi', pn.etiket);
  onay('4x3 tam sayim kullanildi', pn.yontem === 'tam sayim', pn.yontem);

  const pk = bul('premium', 'native', 'kusur');
  onay('kusur farki yonu negatif', pk.ortalamaFark === -4, pk.ortalamaFark);
  onay('kusur cliff delta -1', pk.cliffDelta === -1, pk.cliffDelta);

  const pt = bul('premium', 'native', 'tazeToken');
  onay('taze token farki yonu negatif', pt.ortalamaFark === -1000, pt.ortalamaFark);

  const ne = bul('normal', 'eco', 'sureSn');
  onay('ozdes set: p = 1', ne.p === 1, ne.p);
  onay('ozdes set: ortalama fark 0', ne.ortalamaFark === 0, ne.ortalamaFark);
  onay('ozdes set: cliff delta 0', ne.cliffDelta === 0, ne.cliffDelta);
  onay('ozdes set: ayirt edilemedi', ne.etiket === 'ayirt edilemedi', ne.etiket);

  const metin = rapor(await kosulariOku(dizinA), a);
  onay('rapor n serhini yaziyor', metin.includes('HICBIR karsilastirma'), '');
  onay('raporda fark iddiasi yok', !metin.includes('  fark var'), '');

  const dizinB = path.join(os.tmpdir(), 'tbench-istatistik', 'b');
  const yavas = [];
  const hizli = [];
  for (let i = 0; i < 8; i++) {
    hizli.push(satir(100 + i, 1000 + i, 0));
    yavas.push(satir(200 + i, 2000 + i, 4));
  }
  sentetikYaz(dizinB, { premium: hizli, native: yavas });
  const b = analiz(await kosulariOku(dizinB));
  const pb = b.karsilastirmalar.find((c) => c.a === 'premium' && c.b === 'native' && c.metrik === 'sureSn');
  onay('n=8 tam ayrisma p tabani 0.0078', pb.p === yuvarla(Math.pow(2, -7), 5), pb.p);
  onay('n=8 fark var etiketi', pb.etiket === 'fark var', pb.etiket);

  const dizinC = path.join(os.tmpdir(), 'tbench-istatistik', 'c');
  const sure = [300, 100, 400, 200, 350, 150, 450, 250];
  const tam = (turler, kayma) =>
    turler.map((t, i) => ({ sureSn: sure[i * 2 + kayma], taze: t * 1000, cr: 1000, kusur: 0, tur: t }));
  sentetikYaz(dizinC, { premium: tam([10, 12, 14, 16], 0), native: tam([11, 13, 15, 17], 1) });
  const c2 = analiz(await kosulariOku(dizinC));
  onay(
    'taze token tur ile bire bir: turev damgasi',
    c2.turevler.find((t) => t.ad === 'tazeToken').turev === true,
    c2.turevler.find((t) => t.ad === 'tazeToken').r
  );
  onay(
    'turev metrik betimleyici tablodan dusuruldu',
    !c2.metrikler.some((m) => m.ad === 'tazeToken') && c2.dusurulen.metrik.includes('tazeToken'),
    c2.metrikler.map((m) => m.ad).join()
  );
  onay(
    'turev metrik karsilastirmadan dusuruldu',
    !c2.karsilastirmalar.some((x) => x.metrik === 'tazeToken'),
    c2.karsilastirmalar.map((x) => x.metrik).join()
  );
  onay(
    'birincil metrik karsilastirmada kaldi',
    c2.karsilastirmalar.some((x) => x.metrik === 'sureSn'),
    c2.karsilastirilan.join()
  );
  onay(
    'yaptirim satiri raporda',
    /Yaptirim — damgali metrik: cacheRead|Yaptirim — damgali metrik: .*tazeToken/.test(
      rapor(await kosulariOku(dizinC), c2)
    ),
    ''
  );

  fs.rmSync(path.join(os.tmpdir(), 'tbench-istatistik'), { recursive: true, force: true });
  let hepsi = true;
  for (const i of iddialar) {
    if (!i.gecti) hepsi = false;
    process.stdout.write((i.gecti ? 'TAMAM ' : 'BOZUK ') + i.ad + (i.gecti ? '' : ' — gorulen: ' + i.gorulen) + '\n');
  }
  process.stdout.write((hepsi ? 'kendi testi GECTI' : 'kendi testi KALDI') + ' · ' + iddialar.length + ' iddia\n');
  return hepsi;
}

async function main() {
  if (bayrak('kendi-testi')) {
    process.exit((await kendiTesti()) ? 0 : 1);
  }
  const kaynak = deger('kaynak') || SONUC_KOK;
  const kosular = await kosulariOku(kaynak);
  if (!kosular.length) {
    process.stderr.write('proje tekrar sonucu bulunamadi: ' + kaynak + '/proje__<durum>__r<i>.json\n');
    process.exit(1);
  }
  const a = analiz(kosular);
  const metin = rapor(kosular, a);
  process.stdout.write(metin + '\n');
  const cikti = deger('cikti') || CIKTI_JSON;
  fs.mkdirSync(path.dirname(cikti), { recursive: true });
  fs.writeFileSync(
    cikti,
    JSON.stringify({ uretim: new Date().toISOString(), kaynak, kosular, ...a }, null, 2) + '\n',
    'utf8'
  );
  process.stdout.write('ham istatistik: ' + cikti + '\n');
}

module.exports = { betimle, permutasyon, cliffDelta, analiz, kosulariOku };

if (require.main === module) main();
