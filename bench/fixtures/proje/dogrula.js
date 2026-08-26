#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const kok = path.resolve(process.argv[2] || '.');
const hatalar = [];

function tekSatir(m) {
  return String(m).split('|').join('/').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function bak(ad, islev) {
  try {
    const sonuc = islev();
    if (sonuc !== true) hatalar.push(ad + ': ' + tekSatir(sonuc));
  } catch (e) {
    hatalar.push(ad + ': ' + tekSatir((e && e.message) || e));
  }
}

function duz(m) {
  return String(m).split('\r\n').join('\n');
}

function cli(args) {
  return duz(
    execFileSync(process.execPath, [path.join(kok, 'src', 'cli.js')].concat(args), {
      cwd: kok,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  );
}

const M = {};
const MODULLER = [
  ['ayristir.js', ['ayristirCsv', 'ayristirJsonl']],
  ['hareket.js', ['ayristirHareket']],
  ['sayi.js', ['sayi', 'yuvarla', 'yuzde']],
  ['tarih.js', ['ayristirTarih', 'donem', 'gunSayisi', 'gunFarki']],
  ['bicim.js', ['bicimSayi', 'bicimYuzde', 'bicimTarih', 'kisalt', 'doldur', 'basHarf', 'guvenliAd']],
  ['dogrulama.js', ['denetle']],
  ['suz.js', ['suz']],
  ['sira.js', ['sirala']],
  ['grupla.js', ['grupla']],
  ['birlestir.js', ['birlestir', 'birlestirCok']],
  ['birikim.js', ['kosanToplam', 'hareketliOrtalama']],
  ['durum.js', ['gecis', 'oynat']],
  ['mutabakat.js', ['mutabakat']],
  ['rapor.js', ['tabloYaz', 'csvYaz']],
  ['jsonrapor.js', ['jsonRapor']],
];

for (const [dosya, islevler] of MODULLER) {
  bak(dosya + ' yuklenebiliyor', () => {
    M[dosya] = require(path.join(kok, 'src', dosya));
    const eksik = islevler.filter((i) => typeof M[dosya][i] !== 'function');
    return eksik.length ? 'disari acilmamis: ' + eksik.join(', ') : true;
  });
}

function f(dosya, ad) {
  const m = M[dosya];
  if (!m || typeof m[ad] !== 'function') throw new Error('modul ya da islev yok: ' + ad);
  return m[ad];
}

const esit = (gorulen, beklenen, etiket) =>
  gorulen === beklenen ? true : (etiket || 'sonuc') + ' ' + JSON.stringify(gorulen);
const esitJson = (gorulen, beklenen, etiket) =>
  JSON.stringify(gorulen) === JSON.stringify(beklenen)
    ? true
    : (etiket || 'sonuc') + ' ' + JSON.stringify(gorulen);

// --- A. ayristir -----------------------------------------------------------

const CSV = '# yorum\na, b ,c\n1,"x,y",z\n2,"cift ""tirnak""",w\n3,duz,"son"\n';

bak('csv yorum satiri atlanir', () => {
  const k = f('ayristir.js', 'ayristirCsv')(CSV);
  return k.length === 3 ? true : 'kayit sayisi ' + k.length + ', beklenen 3';
});
bak('csv baslik bosluklari kirpilir', () => {
  const k = f('ayristir.js', 'ayristirCsv')(CSV);
  return esitJson(Object.keys(k[0]), ['a', 'b', 'c'], 'basliklar');
});
bak('csv tirnak icindeki virgul ayrac degil', () =>
  esit(f('ayristir.js', 'ayristirCsv')(CSV)[0].b, 'x,y', 'b alani'));
bak('csv cift tirnak kacisi', () =>
  esit(f('ayristir.js', 'ayristirCsv')(CSV)[1].b, 'cift "tirnak"', 'b alani'));
bak('csv tirnak ciktiya tasinmaz', () =>
  esit(f('ayristir.js', 'ayristirCsv')(CSV)[2].c, 'son', 'c alani'));
bak('csv deger bosluklari kirpilmaz', () => {
  const k = f('ayristir.js', 'ayristirCsv')('a,b\n x , y \n');
  return esit(k[0].a, ' x ', 'a alani');
});
bak('csv bos metin', () => {
  const k = f('ayristir.js', 'ayristirCsv')('');
  return Array.isArray(k) && k.length === 0 ? true : 'bos dizi vermedi';
});
bak('csv yalniz yorumdan olusan metin', () => {
  const k = f('ayristir.js', 'ayristirCsv')('# a\n#b\n');
  return Array.isArray(k) && k.length === 0 ? true : 'bos dizi vermedi';
});
bak('csv crlf ve bos satir', () => {
  const k = f('ayristir.js', 'ayristirCsv')('a,b\r\n1,2\r\n\r\n3,4\r\n');
  return k.length === 2 && k[1].a === '3' ? true : 'crlf ya da bos satir isleme yanlis';
});
bak('csv eksik alan bos dize', () =>
  esit(f('ayristir.js', 'ayristirCsv')('a,b,c\n1,2\n')[0].c, '', 'eksik alan'));
bak('csv icerideki yorum satiri atlanir', () => {
  const k = f('ayristir.js', 'ayristirCsv')('a\n1\n  # ara yorum\n2\n');
  return k.length === 2 && k[1].a === '2' ? true : 'kayit sayisi ' + k.length;
});

bak('jsonl bos satirlari atlar', () => {
  const k = f('ayristir.js', 'ayristirJsonl')('{"a":1}\n\n{"a":2}\n');
  return k.length === 2 && k[1].a === 2 ? true : 'kayit sayisi ' + k.length;
});
bak('jsonl bozuk satirda hata', () => {
  try {
    f('ayristir.js', 'ayristirJsonl')('{"a":1}\n{bozuk\n');
  } catch (e) {
    return String(e.message).startsWith('satir 2: gecersiz json') ? true : 'mesaj ' + e.message;
  }
  return 'hata firlatilmadi';
});
bak('jsonl satir numarasi bos satirlari sayar', () => {
  try {
    f('ayristir.js', 'ayristirJsonl')('{"a":1}\n\n\nbozuk\n');
  } catch (e) {
    return String(e.message).startsWith('satir 4: gecersiz json') ? true : 'mesaj ' + e.message;
  }
  return 'hata firlatilmadi';
});
bak('jsonl diyez yorum degil', () => {
  try {
    f('ayristir.js', 'ayristirJsonl')('# yorum\n');
  } catch (e) {
    return String(e.message).startsWith('satir 1: gecersiz json') ? true : 'mesaj ' + e.message;
  }
  return 'hata firlatilmadi';
});
bak('jsonl bos metin', () => {
  const k = f('ayristir.js', 'ayristirJsonl')('');
  return Array.isArray(k) && k.length === 0 ? true : 'bos dizi vermedi';
});

// --- B. hareket ------------------------------------------------------------

const LOG = '# yorum\ntarih=2026-01-02;tur=giris;kod=U1;miktar=120;not=ilk parti\n\ntarih=2026-02-10;tur=giris;kod=U2;miktar=25;not=fatura no=A-77\nbozuk parca;kod=U3\n';

bak('hareket kayit sayisi', () => {
  const k = f('hareket.js', 'ayristirHareket')(LOG);
  return k.length === 3 ? true : 'kayit sayisi ' + k.length + ', beklenen 3';
});
bak('hareket temel alanlar', () => {
  const k = f('hareket.js', 'ayristirHareket')(LOG);
  return esitJson(k[0], { tarih: '2026-01-02', tur: 'giris', kod: 'U1', miktar: '120', not: 'ilk parti' });
});
bak('hareket degerdeki esittir korunur', () =>
  esit(f('hareket.js', 'ayristirHareket')(LOG)[1].not, 'fatura no=A-77', 'not alani'));
bak('hareket esittir icermeyen parca atlanir', () =>
  esitJson(f('hareket.js', 'ayristirHareket')(LOG)[2], { kod: 'U3' }));
bak('hareket yorum satiri atlanir', () => {
  const k = f('hareket.js', 'ayristirHareket')('# a=b\nkod=U1\n');
  return k.length === 1 ? true : 'kayit sayisi ' + k.length;
});
bak('hareket anahtar ve deger kirpilir', () =>
  esitJson(f('hareket.js', 'ayristirHareket')(' kod = U1 ; tur = giris \n')[0], {
    kod: 'U1',
    tur: 'giris',
  }));

// --- C. sayi ---------------------------------------------------------------

bak('sayi virgullu ondalik', () => esit(f('sayi.js', 'sayi')('19,90'), 19.9));
bak('sayi bosluk kirpma', () => esit(f('sayi.js', 'sayi')(' 5 '), 5));
bak('sayi bos deger null', () => {
  const s = f('sayi.js', 'sayi');
  return s('') === null && s(null) === null && s(undefined) === null ? true : 'null donmedi';
});
bak('sayi gecersiz metin null', () => esit(f('sayi.js', 'sayi')('abc'), null));
bak('sayi yarim okunan metin null', () => esit(f('sayi.js', 'sayi')('12abc'), null));
bak('sayi sayiyi aynen dondurur', () => {
  const s = f('sayi.js', 'sayi');
  return s(7.5) === 7.5 && s(0) === 0 ? true : 'sonuc ' + s(7.5) + ' ve ' + s(0);
});
bak('sayi NaN icin null', () => esit(f('sayi.js', 'sayi')(NaN), null));
bak('yuvarla varsayilan iki basamak', () => esit(f('sayi.js', 'yuvarla')(1.23456), 1.23));
bak('yuvarla basamak parametresi', () => esit(f('sayi.js', 'yuvarla')(1.23456, 3), 1.235));
bak('yuvarla sifir basamak', () => esit(f('sayi.js', 'yuvarla')(2.5, 0), 3));
bak('yuvarla negatif sifirdan uzaga', () => esit(f('sayi.js', 'yuvarla')(-2.345, 2), -2.35));
bak('yuvarla negatif sifir basamak', () => esit(f('sayi.js', 'yuvarla')(-2.5, 0), -3));
bak('yuvarla gecersiz deger null', () => esit(f('sayi.js', 'yuvarla')('abc'), null));
bak('yuzde temel', () => esit(f('sayi.js', 'yuzde')(1, 3), 33.33));
bak('yuzde payda sifir null', () => esit(f('sayi.js', 'yuzde')(1, 0), null));
bak('yuzde gecersiz null', () => esit(f('sayi.js', 'yuzde')('x', 3), null));

// --- D. tarih --------------------------------------------------------------

bak('ayristirTarih temel', () =>
  esitJson(f('tarih.js', 'ayristirTarih')('2026-03-07'), { yil: 2026, ay: 3, gun: 7 }));
bak('ayristirTarih tek haneli ay gun', () =>
  esitJson(f('tarih.js', 'ayristirTarih')('2026-3-7'), { yil: 2026, ay: 3, gun: 7 }));
bak('ayristirTarih bozuk bicim null', () => {
  const g = f('tarih.js', 'ayristirTarih');
  return g('2026/03/07') === null && g('abc') === null && g('') === null ? true : 'null donmedi';
});
bak('ayristirTarih ay siniri', () => {
  const g = f('tarih.js', 'ayristirTarih');
  return g('2026-13-01') === null && g('2026-00-05') === null ? true : 'ay siniri denetlenmiyor';
});
bak('ayristirTarih ay uzunlugu', () => {
  const g = f('tarih.js', 'ayristirTarih');
  return g('2026-02-29') === null && g('2026-04-31') === null
    ? true
    : 'ay uzunlugu denetlenmiyor';
});
bak('ayristirTarih artik yil', () => {
  const g = f('tarih.js', 'ayristirTarih');
  return g('2024-02-29') !== null && g('2000-02-29') !== null && g('1900-02-29') === null
    ? true
    : 'artik yil kurali yanlis';
});
bak('donem gun', () => esit(f('tarih.js', 'donem')('2026-3-7', 'gun'), '2026-03-07'));
bak('donem ay', () => esit(f('tarih.js', 'donem')('2026-03-07', 'ay'), '2026-03'));
bak('donem ay nisan', () => esit(f('tarih.js', 'donem')('2026-04-01', 'ay'), '2026-04'));
bak('donem ay aralik', () => esit(f('tarih.js', 'donem')('2026-12-31', 'ay'), '2026-12'));
bak('donem ceyrek ilk', () => esit(f('tarih.js', 'donem')('2026-01-15', 'ceyrek'), '2026-C1'));
bak('donem ceyrek son', () => esit(f('tarih.js', 'donem')('2026-12-31', 'ceyrek'), '2026-C4'));
bak('donem ceyrek sinir', () => esit(f('tarih.js', 'donem')('2026-04-01', 'ceyrek'), '2026-C2'));
bak('donem yil', () => esit(f('tarih.js', 'donem')('2026-03-07', 'yil'), '2026'));
bak('donem gecersiz girdi null', () => {
  const g = f('tarih.js', 'donem');
  return g('bozuk', 'ay') === null && g('2026-03-07', 'hafta') === null ? true : 'null donmedi';
});
bak('gunSayisi baslangic', () => esit(f('tarih.js', 'gunSayisi')('1970-01-01'), 0));
bak('gunSayisi ileri tarih', () => esit(f('tarih.js', 'gunSayisi')('2026-01-15'), 20468));
bak('gunSayisi artik yil sonrasi', () => esit(f('tarih.js', 'gunSayisi')('2024-03-01'), 19783));
bak('gunSayisi gecersiz null', () => esit(f('tarih.js', 'gunSayisi')('2026-02-30'), null));
bak('gunFarki ileri', () => esit(f('tarih.js', 'gunFarki')('2026-01-15', '2026-03-07'), 51));
bak('gunFarki geri', () => esit(f('tarih.js', 'gunFarki')('2026-03-07', '2026-01-15'), -51));
bak('gunFarki gecersiz null', () => esit(f('tarih.js', 'gunFarki')('x', '2026-01-15'), null));

// --- E. bicim --------------------------------------------------------------

bak('bicimSayi binlik ayraci', () => esit(f('bicim.js', 'bicimSayi')(1234567.5), '1.234.567,50'));
bak('bicimSayi negatif', () => esit(f('bicim.js', 'bicimSayi')(-1234.5), '-1.234,50'));
bak('bicimSayi kucuk deger', () => esit(f('bicim.js', 'bicimSayi')(0.005), '0,01'));
bak('bicimSayi sifir basamak', () => esit(f('bicim.js', 'bicimSayi')(12, 0), '12'));
bak('bicimSayi tasma yuvarlamasi', () => esit(f('bicim.js', 'bicimSayi')(999.999), '1.000,00'));
bak('bicimSayi uc basamak', () => esit(f('bicim.js', 'bicimSayi')(1.5, 3), '1,500'));
bak('bicimSayi gecersiz tire', () => esit(f('bicim.js', 'bicimSayi')('abc'), '-'));
bak('bicimSayi metin girdi', () => esit(f('bicim.js', 'bicimSayi')('19,90'), '19,90'));
bak('bicimYuzde temel', () => esit(f('bicim.js', 'bicimYuzde')(12.5), '%12,50'));
bak('bicimYuzde gecersiz tire', () => esit(f('bicim.js', 'bicimYuzde')(null), '-'));
bak('bicimTarih temel', () => esit(f('bicim.js', 'bicimTarih')('2026-04-01'), '01.04.2026'));
bak('bicimTarih tek haneli', () => esit(f('bicim.js', 'bicimTarih')('2026-3-7'), '07.03.2026'));
bak('bicimTarih gecersiz tire', () => esit(f('bicim.js', 'bicimTarih')('2026-02-30'), '-'));
bak('kisalt toplam uzunluk korunur', () => esit(f('bicim.js', 'kisalt')('abcdefghij', 6), 'abc...'));
bak('kisalt kisa metin aynen', () => esit(f('bicim.js', 'kisalt')('abc', 6), 'abc'));
bak('kisalt tam sinirda aynen', () => esit(f('bicim.js', 'kisalt')('abcdef', 6), 'abcdef'));
bak('kisalt kisa uzunlukta nokta yok', () => esit(f('bicim.js', 'kisalt')('abcdef', 3), 'abc'));
bak('kisalt sifir uzunluk', () => esit(f('bicim.js', 'kisalt')('abc', 0), ''));
bak('doldur ozel dolgu', () => esit(f('bicim.js', 'doldur')('ab', 5, 'sag', '0'), '000ab'));
bak('doldur varsayilan bosluk', () => esit(f('bicim.js', 'doldur')('ab', 5, 'sol'), 'ab   '));
bak('doldur uzun metin kirpilmaz', () => esit(f('bicim.js', 'doldur')('abcdef', 3, 'sag'), 'abcdef'));
bak('doldur dolgunun ilk karakteri', () => esit(f('bicim.js', 'doldur')('a', 4, 'sag', 'xy'), 'xxxa'));
bak('basHarf temel', () => esit(f('bicim.js', 'basHarf')('ali  veli 3x kAn'), 'Ali  Veli 3x Kan'));
bak('basHarf ascii disi degismez', () => esit(f('bicim.js', 'basHarf')('çilek Ürün'), 'çilek Ürün'));
bak('guvenliAd temel', () => esit(f('bicim.js', 'guvenliAd')('  Vida  (A) --- 12 '), 'vida-a-12'));
bak('guvenliAd ascii disi atilir', () => esit(f('bicim.js', 'guvenliAd')('Ürün 7'), 'rn-7'));
bak('guvenliAd bos sonuc', () => esit(f('bicim.js', 'guvenliAd')('---'), ''));

// --- F. dogrulama ----------------------------------------------------------

const SEMA = {
  kod: { tur: 'metin', zorunlu: true },
  tarih: { tur: 'tarih', zorunlu: true },
  adet: { tur: 'sayi', zorunlu: true },
  not: { tur: 'metin', zorunlu: false },
};

bak('denetle gecerli kayit bos dizi', () =>
  esitJson(f('dogrulama.js', 'denetle')({ kod: 'K1', tarih: '2026-01-05', adet: '3' }, SEMA), []));
bak('denetle sifir dolu deger sayilir', () =>
  esitJson(f('dogrulama.js', 'denetle')({ kod: 'K1', tarih: '2026-01-05', adet: '0' }, SEMA), []));
bak('denetle sayisal sifir dolu deger sayilir', () =>
  esitJson(f('dogrulama.js', 'denetle')({ kod: 'K1', tarih: '2026-01-05', adet: 0 }, SEMA), []));
bak('denetle zorunlu bos alan', () =>
  esitJson(f('dogrulama.js', 'denetle')({ kod: '  ', tarih: '2026-01-05', adet: '3' }, SEMA), [
    'kod: zorunlu alan bos',
  ]));
bak('denetle sayi degil', () =>
  esitJson(f('dogrulama.js', 'denetle')({ kod: 'K1', tarih: '2026-01-05', adet: 'yok' }, SEMA), [
    'adet: sayi degil',
  ]));
bak('denetle tarih degil', () =>
  esitJson(f('dogrulama.js', 'denetle')({ kod: 'K1', tarih: '05.01.2026', adet: '3' }, SEMA), [
    'tarih: tarih degil',
  ]));
bak('denetle mesaj sirasi semadan', () =>
  esitJson(f('dogrulama.js', 'denetle')({ kod: '', tarih: 'x', adet: 'y' }, SEMA), [
    'kod: zorunlu alan bos',
    'tarih: tarih degil',
    'adet: sayi degil',
  ]));
bak('denetle zorunlu olmayan bos alan sessiz', () =>
  esitJson(
    f('dogrulama.js', 'denetle')({ kod: 'K1', tarih: '2026-01-05', adet: '3', not: null }, SEMA),
    []
  ));
bak('denetle alan basina tek mesaj', () => {
  const h = f('dogrulama.js', 'denetle')({ kod: 'K1', tarih: '', adet: '1' }, SEMA);
  return h.length === 1 ? true : 'mesaj sayisi ' + h.length;
});

// --- G. suz ----------------------------------------------------------------

const K = [
  { ad: 'a', tur: 'x', adet: '9', not: 'Kirmizi buyuk' },
  { ad: 'b', tur: 'x', adet: '100', not: 'toptan' },
  { ad: 'c', tur: 'y', adet: '20', not: 'KIRMIZI kucuk' },
  { ad: 'd', tur: 'y', adet: 'yok', not: 'bos' },
];
const adlar = (r) => r.map((x) => x.ad).join('');
const suzTest = (olcut, beklenen) => {
  const r = f('suz.js', 'suz')(K, olcut);
  return adlar(r) === beklenen ? true : 'gelen ' + adlar(r) + ', beklenen ' + beklenen;
};

bak('suz esit', () => suzTest({ esit: { tur: 'y' } }, 'cd'));
bak('suz degil', () => suzTest({ degil: { tur: 'y' } }, 'ab'));
bak('suz enAz sayisal', () => suzTest({ enAz: { adet: 10 } }, 'bc'));
bak('suz enAz metin olcutu sayisal karsilastirir', () => suzTest({ enAz: { adet: '10' } }, 'bc'));
bak('suz enCok sayisal', () => suzTest({ enCok: { adet: 20 } }, 'ac'));
bak('suz arasinda iki uc dahil', () => suzTest({ arasinda: { adet: [9, 20] } }, 'ac'));
bak('suz arasinda dar aralik', () => suzTest({ arasinda: { adet: [10, 19] } }, ''));
bak('suz icerir buyuk kucuk harf duyarsiz', () => suzTest({ icerir: { not: 'kirmizi' } }, 'ac'));
bak('suz baslar on ek', () => suzTest({ baslar: { not: 'KIR' } }, 'ac'));
bak('suz baslar ortadaki metni tutmaz', () => suzTest({ baslar: { not: 'buyuk' } }, ''));
bak('suz olcutleri ve ile birlesir', () =>
  suzTest({ esit: { tur: 'x' }, enAz: { adet: 10 } }, 'b'));
bak('suz bos olcut hepsini dondurur', () => suzTest({}, 'abcd'));
bak('suz olcutsuz cagri', () => {
  const r = f('suz.js', 'suz')(K);
  return adlar(r) === 'abcd' ? true : 'gelen ' + adlar(r);
});
bak('suz girdiyi degistirmez', () => {
  f('suz.js', 'suz')(K, { enAz: { adet: 10 } });
  return K.length === 4 ? true : 'girdi uzunlugu ' + K.length;
});

// --- H. sira ---------------------------------------------------------------

const SK = [
  { ad: 'p', s: '10', m: 'b', g: 1 },
  { ad: 'q', s: '9', m: 'A', g: 1 },
  { ad: 'r', s: 'yok', m: 'z', g: 2 },
  { ad: 's', s: '100', m: 'a', g: 2 },
  { ad: 't', s: '9', m: 'B', g: 1 },
];
const siraTest = (olcutler, beklenen) => {
  const r = f('sira.js', 'sirala')(SK, olcutler);
  return adlar(r) === beklenen ? true : 'gelen ' + adlar(r) + ', beklenen ' + beklenen;
};

bak('sirala sayi artan', () => siraTest([{ alan: 's', tur: 'sayi', yon: 'artan' }], 'qtpsr'));
bak('sirala sayi azalan', () => siraTest([{ alan: 's', tur: 'sayi', yon: 'azalan' }], 'spqtr'));
bak('sirala bos deger yonden bagimsiz sona', () => {
  const a = f('sira.js', 'sirala')(SK, [{ alan: 's', tur: 'sayi', yon: 'artan' }]);
  const b = f('sira.js', 'sirala')(SK, [{ alan: 's', tur: 'sayi', yon: 'azalan' }]);
  return a[4].ad === 'r' && b[4].ad === 'r' ? true : 'son kayitlar ' + a[4].ad + ' ve ' + b[4].ad;
});
bak('sirala metin kod birimi sirasi', () => siraTest([{ alan: 'm', tur: 'metin' }], 'qtspr'));
bak('sirala metin azalan', () => siraTest([{ alan: 'm', tur: 'metin', yon: 'azalan' }], 'rpstq'));
bak('sirala yerel ayardan bagimsiz', () => {
  const veri = [{ ad: 'x', m: 'z' }, { ad: 'y', m: 'i' }, { ad: 'z', m: 'ı' }];
  const r = f('sira.js', 'sirala')(veri, [{ alan: 'm', tur: 'metin' }]);
  return adlar(r) === 'yxz' ? true : 'gelen ' + adlar(r) + ', beklenen yxz';
});
bak('sirala kararli', () => siraTest([{ alan: 'g', tur: 'sayi', yon: 'artan' }], 'pqtrs'));
bak('sirala cok anahtarli', () =>
  siraTest(
    [{ alan: 'g', tur: 'sayi', yon: 'artan' }, { alan: 'm', tur: 'metin', yon: 'artan' }],
    'qtpsr'
  ));
bak('sirala varsayilan tur metin', () => siraTest([{ alan: 'm' }], 'qtspr'));
bak('sirala bos olcut listesi girdi sirasi', () => siraTest([], 'pqrst'));
bak('sirala girdiyi degistirmez', () => {
  f('sira.js', 'sirala')(SK, [{ alan: 's', tur: 'sayi', yon: 'azalan' }]);
  return adlar(SK) === 'pqrst' ? true : 'girdi sirasi bozuldu: ' + adlar(SK);
});

// --- I. grupla -------------------------------------------------------------

const GK = [
  { g: 'p', h: 'u', v: '10', w: '1,5' },
  { g: 'q', h: 'u', v: '4', w: '2' },
  { g: 'p', h: 'v', v: '5', w: 'yok' },
  { g: 'q', h: 'u', v: '2', w: '3' },
];
const grup = (anahtar, ozetler, veri) => f('grupla.js', 'grupla')(veri || GK, anahtar, ozetler);

bak('grupla toplam', () => {
  const r = grup('g', { t: { islev: 'toplam', alan: 'v' } });
  return r.length === 2 && r[0].t === 15 && r[1].t === 6 ? true : JSON.stringify(r);
});
bak('grupla ortalama grup icinde', () => {
  const r = grup('g', { o: { islev: 'ortalama', alan: 'v' } });
  return r[0].o === 7.5 && r[1].o === 3 ? true : JSON.stringify(r);
});
bak('grupla ortanca tek sayi', () => {
  const r = grup('g', { o: { islev: 'ortanca', alan: 'v' } }, [
    { g: 'z', v: '5' },
    { g: 'z', v: '1' },
    { g: 'z', v: '3' },
  ]);
  return esit(r[0].o, 3, 'ortanca');
});
bak('grupla ortanca cift sayi', () => {
  const r = grup('g', { o: { islev: 'ortanca', alan: 'v' } });
  return r[0].o === 7.5 && r[1].o === 3 ? true : JSON.stringify(r);
});
bak('grupla adet islevi', () => {
  const r = grup('g', { n: { islev: 'adet' } });
  return r[0].n === 2 && r[1].n === 2 ? true : JSON.stringify(r);
});
bak('grupla enBuyuk islevi', () => {
  const r = grup('g', { m: { islev: 'enBuyuk', alan: 'v' } });
  return r[0].m === 10 && r[1].m === 4 ? true : JSON.stringify(r);
});
bak('grupla enKucuk islevi', () => {
  const r = grup('g', { m: { islev: 'enKucuk', alan: 'v' } });
  return r[0].m === 5 && r[1].m === 2 ? true : JSON.stringify(r);
});
bak('grupla farkli islevi', () => {
  const r = grup('g', { f: { islev: 'farkli', alan: 'h' } });
  return r[0].f === 2 && r[1].f === 1 ? true : JSON.stringify(r);
});
bak('grupla ilk islevi', () => {
  const r = grup('g', { i: { islev: 'ilk', alan: 'v' } });
  return r[0].i === '10' && r[1].i === '4' ? true : JSON.stringify(r);
});
bak('grupla son islevi', () => {
  const r = grup('g', { s: { islev: 'son', alan: 'v' } });
  return r[0].s === '5' && r[1].s === '2' ? true : JSON.stringify(r);
});
bak('grupla sayisal olmayan degeri atar', () => {
  const r = grup('g', { o: { islev: 'ortalama', alan: 'w' } });
  return r[0].o === 1.5 && r[1].o === 2.5 ? true : JSON.stringify(r);
});
bak('grupla sayisal deger yoksa null', () => {
  const r = grup(
    'g',
    {
      t: { islev: 'toplam', alan: 'v' },
      o: { islev: 'ortalama', alan: 'v' },
      m: { islev: 'enBuyuk', alan: 'v' },
      c: { islev: 'ortanca', alan: 'v' },
    },
    [{ g: 'z', v: 'yok' }]
  );
  return r[0].t === 0 && r[0].o === null && r[0].m === null && r[0].c === null
    ? true
    : JSON.stringify(r);
});
bak('grupla yuvarlama iki ondalik', () => {
  const r = grup('g', { o: { islev: 'ortalama', alan: 'v' } }, [
    { g: 'z', v: '1' },
    { g: 'z', v: '2' },
    { g: 'z', v: '2' },
  ]);
  return esit(r[0].o, 1.67, 'ortalama');
});
bak('grupla sirasi ilk gorulme', () => {
  const r = grup('g', { n: { islev: 'adet' } });
  return r[0].g === 'p' && r[1].g === 'q' ? true : 'sira ' + r.map((x) => x.g).join('');
});
bak('grupla cok anahtarli', () => {
  const r = grup(['g', 'h'], { n: { islev: 'adet' } });
  return r.length === 3 && r[0].g === 'p' && r[0].h === 'u' && r[1].h === 'u' && r[2].h === 'v'
    ? true
    : JSON.stringify(r);
});
bak('grupla bos girdi bos dizi', () => esitJson(grup('g', { n: { islev: 'adet' } }, []), []));
bak('grupla alan sirasi', () => {
  const r = grup('g', { n: { islev: 'adet' }, t: { islev: 'toplam', alan: 'v' } });
  return esitJson(Object.keys(r[0]), ['g', 'n', 't'], 'alanlar');
});

// --- J. birlestir ----------------------------------------------------------

const SOL = [{ k: 'U1', x: 1 }, { k: 'U9', x: 2 }];
const SAG = [
  { kod: 'U1', ad: 'bir', tip: 't1' },
  { kod: 'U1', ad: 'eski', tip: 't9' },
  { kod: 'U2', ad: 'iki', tip: 't2' },
];
const bir = () => f('birlestir.js', 'birlestir')(SOL, SAG, 'k', 'kod');
const birCok = () => f('birlestir.js', 'birlestirCok')(SOL, SAG, 'k', 'kod', 'sagKayitlar');

bak('birlestir eslesen kayit', () => esit(bir()[0].ad, 'bir', 'ad'));
bak('birlestir eslesmeyende null', () => {
  const r = bir();
  return r[1].ad === null && r[1].tip === null ? true : JSON.stringify(r[1]);
});
bak('birlestir ilk eslesme kazanir', () => esit(bir()[0].tip, 't1', 'tip'));
bak('birlestir sag anahtari tasimaz', () =>
  !('kod' in bir()[0]) ? true : 'kod alani tasinmis');
bak('birlestir sol alanlari korunur', () => esit(bir()[0].x, 1, 'x'));
bak('birlestir girdiyi degistirmez', () => {
  bir();
  const ikinci = bir();
  return !('ad' in SOL[0]) && ikinci[1].ad === null ? true : 'girdi kirlendi';
});
bak('birlestirCok tum eslesmeler', () => {
  const r = birCok();
  return r[0].sagKayitlar.length === 2 && r[0].sagKayitlar[1].ad === 'eski'
    ? true
    : JSON.stringify(r[0].sagKayitlar);
});
bak('birlestirCok sag anahtari korunur', () =>
  esit(birCok()[0].sagKayitlar[0].kod, 'U1', 'kod'));
bak('birlestirCok eslesmeyende bos dizi', () => esitJson(birCok()[1].sagKayitlar, []));
bak('birlestirCok girdiyi degistirmez', () => {
  birCok();
  return !('sagKayitlar' in SOL[0]) ? true : 'girdi kirlendi';
});

// --- K. birikim ------------------------------------------------------------

bak('kosanToplam kumulatif', () => {
  const r = f('birikim.js', 'kosanToplam')([{ v: '1,5' }, { v: '2' }, { v: '0,25' }], 'v', 'b');
  return r[0].b === 1.5 && r[1].b === 3.5 && r[2].b === 3.75 ? true : JSON.stringify(r);
});
bak('kosanToplam cevrilemeyen deger sifir', () => {
  const r = f('birikim.js', 'kosanToplam')([{ v: '1' }, { v: 'yok' }, { v: '2' }], 'v', 'b');
  return r[1].b === 1 && r[2].b === 3 ? true : JSON.stringify(r);
});
bak('kosanToplam girdiyi degistirmez', () => {
  const veri = [{ v: '1' }];
  f('birikim.js', 'kosanToplam')(veri, 'v', 'b');
  return !('b' in veri[0]) ? true : 'girdi kirlendi';
});
bak('hareketliOrtalama kismi pencere', () => {
  const r = f('birikim.js', 'hareketliOrtalama')(
    [{ v: '1' }, { v: '2' }, { v: '3' }, { v: '4' }],
    'v',
    'o',
    3
  );
  return r[0].o === 1 && r[1].o === 1.5 && r[2].o === 2 && r[3].o === 3
    ? true
    : JSON.stringify(r.map((x) => x.o));
});
bak('hareketliOrtalama gecersiz deger atlanir', () => {
  const r = f('birikim.js', 'hareketliOrtalama')([{ v: 'yok' }, { v: '4' }], 'v', 'o', 2);
  return r[0].o === null && r[1].o === 4 ? true : JSON.stringify(r.map((x) => x.o));
});
bak('hareketliOrtalama girdiyi degistirmez', () => {
  const veri = [{ v: '1' }];
  f('birikim.js', 'hareketliOrtalama')(veri, 'v', 'o', 2);
  return !('o' in veri[0]) ? true : 'girdi kirlendi';
});

// --- L. durum --------------------------------------------------------------

bak('gecis olustur', () => esit(f('durum.js', 'gecis')('yok', 'olustur'), 'yeni'));
bak('gecis onayla', () => esit(f('durum.js', 'gecis')('yeni', 'onayla'), 'onayli'));
bak('gecis yeniden iptal', () => esit(f('durum.js', 'gecis')('yeni', 'iptal'), 'iptal'));
bak('gecis onaylidan iptal', () => esit(f('durum.js', 'gecis')('onayli', 'iptal'), 'iptal'));
bak('gecis gonder', () => esit(f('durum.js', 'gecis')('onayli', 'gonder'), 'gonderildi'));
bak('gecis teslim', () => esit(f('durum.js', 'gecis')('gonderildi', 'teslim'), 'teslim'));
bak('gecis son durumdan cikis yok', () => {
  const g = f('durum.js', 'gecis');
  return g('teslim', 'iptal') === null && g('iptal', 'olustur') === null ? true : 'null donmedi';
});
bak('gecis bilinmeyen olay null', () => esit(f('durum.js', 'gecis')('yeni', 'sasir'), null));
bak('gecis bilinmeyen durum null', () => esit(f('durum.js', 'gecis')('sasir', 'olustur'), null));
bak('oynat siraya gore duzenler', () =>
  esitJson(
    f('durum.js', 'oynat')([
      { sira: '1', olay: 'olustur' },
      { sira: '3', olay: 'gonder' },
      { sira: '2', olay: 'onayla' },
    ]),
    { durum: 'gonderildi', adim: 3, hata: null }
  ));
bak('oynat sayisal sira metin degil', () =>
  esitJson(
    f('durum.js', 'oynat')([
      { sira: '10', olay: 'gonder' },
      { sira: '9', olay: 'onayla' },
      { sira: '1', olay: 'olustur' },
    ]),
    { durum: 'gonderildi', adim: 3, hata: null }
  ));
bak('oynat ilk hatada durur', () =>
  esitJson(
    f('durum.js', 'oynat')([
      { sira: 1, olay: 'olustur' },
      { sira: 2, olay: 'gonder' },
      { sira: 3, olay: 'onayla' },
    ]),
    { durum: 'yeni', adim: 1, hata: 'gonder: gecersiz gecis (yeni)' }
  ));
bak('oynat bas durumda hata', () =>
  esitJson(f('durum.js', 'oynat')([{ sira: 1, olay: 'onayla' }]), {
    durum: 'yok',
    adim: 0,
    hata: 'onayla: gecersiz gecis (yok)',
  }));
bak('oynat bos liste', () =>
  esitJson(f('durum.js', 'oynat')([]), { durum: 'yok', adim: 0, hata: null }));
bak('oynat esit sirada girdi sirasi', () =>
  esitJson(
    f('durum.js', 'oynat')([
      { sira: 1, olay: 'olustur' },
      { sira: 2, olay: 'onayla' },
      { sira: 2, olay: 'iptal' },
    ]),
    { durum: 'iptal', adim: 3, hata: null }
  ));

// --- M. mutabakat ----------------------------------------------------------

const HAR = [
  { tur: 'giris', kod: 'A', miktar: '10' },
  { tur: 'cikis', kod: 'A', miktar: '4' },
  { tur: 'giris', kod: 'B', miktar: '5' },
  { tur: 'devir', kod: 'B', miktar: '99' },
];
const SAT = [{ urunKodu: 'A', adet: '3' }, { urunKodu: 'C', adet: '7' }];

bak('mutabakat giris cikis toplami', () => {
  const r = f('mutabakat.js', 'mutabakat')(HAR, SAT);
  return esitJson(r[0], { kod: 'A', giris: 10, cikis: 4, stok: 6, satisAdedi: 3, fark: 1 });
});
bak('mutabakat bilinmeyen tur sayilmaz', () => {
  const r = f('mutabakat.js', 'mutabakat')(HAR, SAT);
  return esitJson(r[1], { kod: 'B', giris: 5, cikis: 0, stok: 5, satisAdedi: 0, fark: 0 });
});
bak('mutabakat yalniz satista gecen urun', () => {
  const r = f('mutabakat.js', 'mutabakat')(HAR, SAT);
  return esitJson(r[2], { kod: 'C', giris: 0, cikis: 0, stok: 0, satisAdedi: 7, fark: -7 });
});
bak('mutabakat satir sayisi ve sirasi', () => {
  const r = f('mutabakat.js', 'mutabakat')(HAR, SAT);
  return esitJson(r.map((x) => x.kod), ['A', 'B', 'C'], 'sira');
});
bak('mutabakat bos girdi', () => esitJson(f('mutabakat.js', 'mutabakat')([], []), []));

// --- N. rapor --------------------------------------------------------------

const TS = [{ a: 'uzunca', b: 5 }, { a: 'kisa', b: 120 }];
const TC = [
  { alan: 'a', baslik: 'A', hiza: 'sol' },
  { alan: 'b', baslik: 'BB', hiza: 'sag' },
];

bak('tabloYaz bicimi', () =>
  esit(
    f('rapor.js', 'tabloYaz')(TS, TC),
    ['A      |  BB', '-------+----', 'uzunca |   5', 'kisa   | 120'].join('\n'),
    'tablo'
  ));
bak('tabloYaz bos deger ve satir sonu kirpma', () =>
  esit(
    f('rapor.js', 'tabloYaz')([{ a: null }], [{ alan: 'a', baslik: 'Bas', hiza: 'sol' }]),
    'Bas\n---\n',
    'cikti'
  ));
bak('tabloYaz sonda satir sonu yok', () =>
  esit(f('rapor.js', 'tabloYaz')([{ a: 'x' }], [{ alan: 'a', baslik: 'A' }]), 'A\n-\nx', 'cikti'));
bak('tabloYaz bos satir listesi', () =>
  esit(
    f('rapor.js', 'tabloYaz')([], [{ alan: 'a', baslik: 'AB' }, { alan: 'b', baslik: 'C', hiza: 'sag' }]),
    'AB | C\n---+--',
    'cikti'
  ));
bak('csvYaz bicimi', () =>
  esit(f('rapor.js', 'csvYaz')(TS, TC), 'A,BB\nuzunca,5\nkisa,120', 'cikti'));
bak('csvYaz virgullu hucre tirnaklanir', () =>
  esit(
    f('rapor.js', 'csvYaz')([{ a: 'x,y', b: 1 }], TC),
    'A,BB\n"x,y",1',
    'cikti'
  ));
bak('csvYaz tirnak ikilenir', () =>
  esit(f('rapor.js', 'csvYaz')([{ a: 'a"b', b: 1 }], TC), 'A,BB\n"a""b",1', 'cikti'));
bak('csvYaz bos deger', () =>
  esit(f('rapor.js', 'csvYaz')([{ a: null, b: 1 }], TC), 'A,BB\n,1', 'cikti'));
bak('csvYaz bos satir listesi', () => esit(f('rapor.js', 'csvYaz')([], TC), 'A,BB', 'cikti'));

// --- O. jsonrapor ----------------------------------------------------------

bak('jsonRapor derin yuvarlama', () =>
  esit(
    f('jsonrapor.js', 'jsonRapor')({ a: 1.23456, b: [2.567, { c: 3.9999 }] }),
    '{\n  "a": 1.23,\n  "b": [\n    2.57,\n    {\n      "c": 4\n    }\n  ]\n}',
    'cikti'
  ));
bak('jsonRapor alan sirasi korunur', () => {
  const t = f('jsonrapor.js', 'jsonRapor')({ z: 1, a: 2 });
  return t.indexOf('"z"') < t.indexOf('"a"') ? true : 'alan sirasi degismis';
});
bak('jsonRapor sonda satir sonu yok', () => {
  const t = f('jsonrapor.js', 'jsonRapor')({ a: 1 });
  return t.slice(-1) === '}' ? true : 'cikti sonu ' + JSON.stringify(t.slice(-5));
});
bak('jsonRapor metin degismez', () =>
  esit(f('jsonrapor.js', 'jsonRapor')({ a: '1.23456' }), '{\n  "a": "1.23456"\n}', 'cikti'));

// --- P. cli ----------------------------------------------------------------

const RAPOR = [
  'Kategori | Adet |    Ciro |    Ort | Satir',
  '---------+------+---------+--------+------',
  'donanim  |  124 |    2175 |    435 |     5',
  'takim    |   34 | 1286.25 | 643.13 |     2',
  '         |   40 |      70 |     70 |     1',
  '',
].join('\n');

const RAPOR_TAKIM = [
  'Kategori | Adet |    Ciro |    Ort | Satir',
  '---------+------+---------+--------+------',
  'takim    |   34 | 1286.25 | 643.13 |     2',
  '',
].join('\n');

const RAPOR_ENAZ = [
  'Kategori | Adet |   Ciro |    Ort | Satir',
  '---------+------+--------+--------+------',
  'donanim  |  112 |   2044 |   1022 |     2',
  'takim    |   25 | 206.25 | 206.25 |     1',
  '         |   40 |     70 |     70 |     1',
  '',
].join('\n');

const RAPOR_AY = [
  'Donem   | Adet |   Ciro |   Ort | Satir',
  '--------+------+--------+-------+------',
  '2026-01 |   15 |  113.7 | 56.85 |     2',
  '2026-02 |  109 |   3070 |  1535 |     2',
  '2026-03 |   34 | 277.55 | 92.52 |     3',
  '2026-04 |   40 |     70 |    70 |     1',
  '',
].join('\n');

const RAPOR_AY_SIRALI = [
  'Donem   | Adet |   Ciro |   Ort | Satir',
  '--------+------+--------+-------+------',
  '2026-02 |  109 |   3070 |  1535 |     2',
  '2026-03 |   34 | 277.55 | 92.52 |     3',
  '2026-01 |   15 |  113.7 | 56.85 |     2',
  '2026-04 |   40 |     70 |    70 |     1',
  '',
].join('\n');

const RAPOR_SIRALI_ADET = [
  'Kategori | Adet |    Ciro |    Ort | Satir',
  '---------+------+---------+--------+------',
  'takim    |   34 | 1286.25 | 643.13 |     2',
  '         |   40 |      70 |     70 |     1',
  'donanim  |  124 |    2175 |    435 |     5',
  '',
].join('\n');

const RAPOR_CEYREK = [
  'Donem   | Adet |    Ciro |    Ort | Satir',
  '--------+------+---------+--------+------',
  '2026-C1 |  158 | 3461.25 | 494.46 |     7',
  '2026-C2 |   40 |      70 |     70 |     1',
  '',
].join('\n');

const RAPOR_CSV = [
  'Kategori,Adet,Ciro,Ort,Satir',
  'donanim,124,2175,435,5',
  'takim,34,1286.25,643.13,2',
  ',40,70,70,1',
  '',
].join('\n');

const MUTABAKAT = [
  'Kod | Giris | Cikis | Stok | Satis | Fark',
  '----+-------+-------+------+-------+-----',
  'U1  |   120 |   105 |   15 |   105 |    0',
  'U2  |    25 |    19 |    6 |    19 |    0',
  'U6  |    10 |     0 |   10 |     0 |    0',
  'U4  |     0 |    20 |  -20 |    25 |   -5',
  'U5  |    40 |    40 |    0 |    40 |    0',
  'U3  |     0 |     0 |    0 |     9 |   -9',
  '',
].join('\n');

const DURUM = [
  'Siparis | Durum  | Adim | Hata',
  '--------+--------+------+------------------------------',
  'O1      | teslim |    4 |',
  'O2      | iptal  |    3 |',
  'O3      | yeni   |    1 | gonder: gecersiz gecis (yeni)',
  'O4      | yok    |    0 | onayla: gecersiz gecis (yok)',
  '',
].join('\n');

const HAREKET = [
  'Tur   | Kayit | Miktar',
  '------+-------+-------',
  'giris |     4 |    195',
  'cikis |     6 |    184',
  '',
].join('\n');

const OZET =
  '{"satis":8,"urun":5,"iade":4,"hareket":10,"siparis":4,"kategori":3,"toplamCiro":3531.25}\n';

const cliEsit = (args, beklenen) =>
  cli(args) === beklenen ? true : 'cikti beklenenden farkli';

bak('cli rapor ciktisi', () => cliEsit(['rapor'], RAPOR));
bak('cli komutsuz cagri rapor', () => cliEsit([], RAPOR));
bak('cli bayrakla baslayan cagri rapor', () => cliEsit(['--kategori=takim'], RAPOR_TAKIM));
bak('cli rapor kategori suzgeci', () => cliEsit(['rapor', '--kategori=takim'], RAPOR_TAKIM));
bak('cli rapor enAz suzgeci', () => cliEsit(['rapor', '--enAz=10'], RAPOR_ENAZ));
bak('cli rapor donem ay', () => cliEsit(['rapor', '--donem=ay'], RAPOR_AY));
bak('cli rapor donem ceyrek', () => cliEsit(['rapor', '--donem=ceyrek'], RAPOR_CEYREK));
bak('cli rapor donem ay ve siralama', () =>
  cliEsit(['rapor', '--donem=ay', '--sirala=ciro:azalan'], RAPOR_AY_SIRALI));
bak('cli rapor sayisal siralama', () => cliEsit(['rapor', '--sirala=adet:artan'], RAPOR_SIRALI_ADET));
bak('cli rapor csv bicimi', () => cliEsit(['rapor', '--bicim=csv'], RAPOR_CSV));
bak('cli mutabakat ciktisi', () => cliEsit(['mutabakat'], MUTABAKAT));
bak('cli durum ciktisi', () => cliEsit(['durum'], DURUM));
bak('cli hareket ciktisi', () => cliEsit(['hareket'], HAREKET));
bak('cli ozet ciktisi', () => cliEsit(['ozet'], OZET));
bak('cli ozet bicim bayragindan etkilenmez', () => cliEsit(['ozet', '--bicim=csv'], OZET));
bak('cli cikti bayragi', () => {
  const hedef = path.join(os.tmpdir(), 'proje-cikti-' + process.pid + '.txt');
  const c = cli(['rapor', '--cikti=' + hedef]);
  if (c !== '') return 'stdout bos degil';
  const d = duz(fs.readFileSync(hedef, 'utf8'));
  fs.rmSync(hedef, { force: true });
  return d === RAPOR ? true : 'dosya icerigi beklenenden farkli';
});
bak('cli mutabakat cikti bayragi', () => {
  const hedef = path.join(os.tmpdir(), 'proje-mut-' + process.pid + '.txt');
  const c = cli(['mutabakat', '--cikti=' + hedef]);
  if (c !== '') return 'stdout bos degil';
  const d = duz(fs.readFileSync(hedef, 'utf8'));
  fs.rmSync(hedef, { force: true });
  return d === MUTABAKAT ? true : 'dosya icerigi beklenenden farkli';
});
bak('cli bilinmeyen komut', () => {
  try {
    cli(['saskin']);
  } catch (e) {
    return e.status === 1 ? true : 'cikis kodu ' + e.status;
  }
  return 'hata vermedi';
});
bak('cli denetim capraz hata ve cikis kodu', () => {
  try {
    cli(['denetim']);
  } catch (e) {
    const c = duz(e.stdout || '');
    return c === 'iade.csv I4: satisId: eslesmeyen satis\n' && e.status === 2
      ? true
      : 'cikti ' + JSON.stringify(c) + ' kod ' + e.status;
  }
  return 'cikis kodu 2 olmadi';
});

function jsonCikti() {
  const c = cli(['json']);
  if (c.slice(-1) !== '\n') throw new Error('json ciktisi satir sonu ile bitmiyor');
  return JSON.parse(c);
}

bak('cli json kaynak sayilari', () =>
  esitJson(jsonCikti().kaynak, { satis: 8, urun: 5, iade: 4, hareket: 10 }));
bak('cli json kategoriler', () =>
  esitJson(jsonCikti().kategoriler, [
    { kategori: 'donanim', adet: 124, ciro: 2175, ortCiro: 435, satir: 5 },
    { kategori: 'takim', adet: 34, ciro: 1286.25, ortCiro: 643.13, satir: 2 },
    { kategori: null, adet: 40, ciro: 70, ortCiro: 70, satir: 1 },
  ]));
bak('cli json donemler ve birikim', () =>
  esitJson(jsonCikti().donemler, [
    { donem: '2026-01', ciro: 113.7, birikimliCiro: 113.7 },
    { donem: '2026-02', ciro: 3070, birikimliCiro: 3183.7 },
    { donem: '2026-03', ciro: 277.55, birikimliCiro: 3461.25 },
    { donem: '2026-04', ciro: 70, birikimliCiro: 3531.25 },
  ]));
bak('cli json enCokSatan', () =>
  esitJson(jsonCikti().enCokSatan, { urunKodu: 'U1', ad: 'Vida', adet: 100 }));
bak('cli json iadeliSatislar', () =>
  esitJson(jsonCikti().iadeliSatislar, [
    { satisId: 'S3', iadeAdedi: 2, iadeToplami: 15 },
    { satisId: 'S6', iadeAdedi: 1, iadeToplami: 0 },
  ]));
bak('cli json mutabakat bolumu', () =>
  esitJson(jsonCikti().mutabakat, [
    { kod: 'U1', giris: 120, cikis: 105, stok: 15, satisAdedi: 105, fark: 0 },
    { kod: 'U2', giris: 25, cikis: 19, stok: 6, satisAdedi: 19, fark: 0 },
    { kod: 'U6', giris: 10, cikis: 0, stok: 10, satisAdedi: 0, fark: 0 },
    { kod: 'U4', giris: 0, cikis: 20, stok: -20, satisAdedi: 25, fark: -5 },
    { kod: 'U5', giris: 40, cikis: 40, stok: 0, satisAdedi: 40, fark: 0 },
    { kod: 'U3', giris: 0, cikis: 0, stok: 0, satisAdedi: 9, fark: -9 },
  ]));
bak('cli json siparisler bolumu', () =>
  esitJson(jsonCikti().siparisler, [
    { siparisId: 'O1', durum: 'teslim', adim: 4, hata: null },
    { siparisId: 'O2', durum: 'iptal', adim: 3, hata: null },
    { siparisId: 'O3', durum: 'yeni', adim: 1, hata: 'gonder: gecersiz gecis (yeni)' },
    { siparisId: 'O4', durum: 'yok', adim: 0, hata: 'onayla: gecersiz gecis (yok)' },
  ]));
bak('cli json alan sirasi', () =>
  esitJson(
    Object.keys(jsonCikti()),
    ['kaynak', 'kategoriler', 'donemler', 'enCokSatan', 'iadeliSatislar', 'mutabakat', 'siparisler'],
    'alanlar'
  ));

bak('uctan uca senaryo', () => {
  const dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'proje-e2e-'));
  const t = path.join(dizin, 'tablo.txt');
  const c = path.join(dizin, 'tablo.csv');
  const jd = path.join(dizin, 'rapor.json');
  let denetimKod = 0;
  try {
    cli(['denetim']);
  } catch (e) {
    denetimKod = e.status;
  }
  cli(['rapor', '--donem=ay', '--sirala=ciro:azalan', '--cikti=' + t]);
  cli(['mutabakat', '--bicim=csv', '--cikti=' + c]);
  cli(['json', '--cikti=' + jd]);
  const tablo = duz(fs.readFileSync(t, 'utf8'));
  const csv = duz(fs.readFileSync(c, 'utf8'));
  const j = JSON.parse(duz(fs.readFileSync(jd, 'utf8')));
  const ozet = cli(['ozet']);
  fs.rmSync(dizin, { recursive: true, force: true });
  if (denetimKod !== 2) return 'denetim cikis kodu ' + denetimKod;
  if (tablo !== RAPOR_AY_SIRALI) return 'dosyaya yazilan tablo beklenenden farkli';
  if (csv.split('\n')[0] !== 'Kod,Giris,Cikis,Stok,Satis,Fark') return 'csv basligi farkli';
  if (csv.split('\n')[4] !== 'U4,0,20,-20,25,-5') return 'csv satiri farkli';
  if (j.donemler[3].birikimliCiro !== 3531.25) return 'birikim ' + j.donemler[3].birikimliCiro;
  if (j.siparisler[2].hata !== 'gonder: gecersiz gecis (yeni)') return 'siparis hatasi farkli';
  if (ozet !== OZET) return 'ozet beklenenden farkli';
  return true;
});

if (hatalar.length) {
  process.stdout.write('KIRMIZI · ' + hatalar.join(' | ') + '\n');
  process.exit(1);
}
process.stdout.write('YESIL · proje\n');
