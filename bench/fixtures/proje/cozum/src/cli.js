const fs = require('node:fs');
const path = require('node:path');

const { ayristirCsv, ayristirJsonl } = require('./ayristir.js');
const { ayristirHareket } = require('./hareket.js');
const { sayi, yuvarla } = require('./sayi.js');
const { donem } = require('./tarih.js');
const { denetle } = require('./dogrulama.js');
const { suz } = require('./suz.js');
const { sirala } = require('./sira.js');
const { grupla } = require('./grupla.js');
const { birlestir, birlestirCok } = require('./birlestir.js');
const { kosanToplam } = require('./birikim.js');
const { oynat } = require('./durum.js');
const { mutabakat } = require('./mutabakat.js');
const { tabloYaz, csvYaz } = require('./rapor.js');
const { jsonRapor } = require('./jsonrapor.js');

const VERI = path.join(__dirname, '..', 'veri');
const KOMUTLAR = ['rapor', 'ozet', 'json', 'denetim', 'mutabakat', 'durum', 'hareket'];

const OZETLER = {
  adet: { islev: 'toplam', alan: 'adet' },
  ciro: { islev: 'toplam', alan: 'ciro' },
  ortCiro: { islev: 'ortalama', alan: 'ciro' },
  satir: { islev: 'adet' },
};

const SUTUNLAR = [
  { alan: 'adet', baslik: 'Adet', hiza: 'sag' },
  { alan: 'ciro', baslik: 'Ciro', hiza: 'sag' },
  { alan: 'ortCiro', baslik: 'Ort', hiza: 'sag' },
  { alan: 'satir', baslik: 'Satir', hiza: 'sag' },
];

const MUTABAKAT_SUTUN = [
  { alan: 'kod', baslik: 'Kod', hiza: 'sol' },
  { alan: 'giris', baslik: 'Giris', hiza: 'sag' },
  { alan: 'cikis', baslik: 'Cikis', hiza: 'sag' },
  { alan: 'stok', baslik: 'Stok', hiza: 'sag' },
  { alan: 'satisAdedi', baslik: 'Satis', hiza: 'sag' },
  { alan: 'fark', baslik: 'Fark', hiza: 'sag' },
];

const DURUM_SUTUN = [
  { alan: 'siparisId', baslik: 'Siparis', hiza: 'sol' },
  { alan: 'durum', baslik: 'Durum', hiza: 'sol' },
  { alan: 'adim', baslik: 'Adim', hiza: 'sag' },
  { alan: 'hata', baslik: 'Hata', hiza: 'sol' },
];

const HAREKET_SUTUN = [
  { alan: 'tur', baslik: 'Tur', hiza: 'sol' },
  { alan: 'kayit', baslik: 'Kayit', hiza: 'sag' },
  { alan: 'miktar', baslik: 'Miktar', hiza: 'sag' },
];

const SATIS_SEMA = {
  satisId: { tur: 'metin', zorunlu: true },
  tarih: { tur: 'tarih', zorunlu: true },
  urunKodu: { tur: 'metin', zorunlu: true },
  adet: { tur: 'sayi', zorunlu: true },
  birimFiyat: { tur: 'sayi', zorunlu: true },
};

const IADE_SEMA = {
  iadeId: { tur: 'metin', zorunlu: true },
  satisId: { tur: 'metin', zorunlu: true },
  adet: { tur: 'sayi', zorunlu: true },
};

function deger(ad) {
  const on = '--' + ad + '=';
  const s = process.argv.find((a) => a.startsWith(on));
  return s ? s.slice(on.length) : null;
}

function veriOku() {
  const satislar = ayristirCsv(fs.readFileSync(path.join(VERI, 'satis.csv'), 'utf8'));
  const urunler = ayristirJsonl(fs.readFileSync(path.join(VERI, 'urun.jsonl'), 'utf8'));
  const iadeler = ayristirCsv(fs.readFileSync(path.join(VERI, 'iade.csv'), 'utf8'));
  const hareketler = ayristirHareket(fs.readFileSync(path.join(VERI, 'hareket.log'), 'utf8'));
  const olaylar = ayristirCsv(fs.readFileSync(path.join(VERI, 'durum.csv'), 'utf8'));
  const birim = deger('donem');
  const birlesik = birlestir(satislar, urunler, 'urunKodu', 'kod').map((k) => ({
    ...k,
    ciro: sayi(k.adet) * sayi(k.birimFiyat),
    donem: birim === null ? null : donem(k.tarih, birim),
  }));
  return { satislar, urunler, iadeler, hareketler, olaylar, birlesik };
}

function yaz(metin) {
  const cikti = deger('cikti');
  if (cikti !== null) fs.writeFileSync(cikti, metin + '\n', 'utf8');
  else process.stdout.write(metin + '\n');
}

function tablo(satirlar, sutunlar) {
  yaz(deger('bicim') === 'csv' ? csvYaz(satirlar, sutunlar) : tabloYaz(satirlar, sutunlar));
}

function siparisDurumlari(olaylar) {
  const kimlikler = [];
  for (const o of olaylar) if (!kimlikler.includes(o.siparisId)) kimlikler.push(o.siparisId);
  return kimlikler.map((id) => {
    const s = oynat(olaylar.filter((o) => o.siparisId === id));
    return { siparisId: id, durum: s.durum, adim: s.adim, hata: s.hata };
  });
}

function raporKomutu(birlesik) {
  let kayitlar = birlesik;
  const kategori = deger('kategori');
  if (kategori !== null) kayitlar = suz(kayitlar, { esit: { kategori } });
  const enAz = deger('enAz');
  if (enAz !== null) kayitlar = suz(kayitlar, { enAz: { adet: enAz } });

  const birim = deger('donem');
  const anahtar = birim === null ? 'kategori' : 'donem';
  const basSutun =
    birim === null
      ? { alan: 'kategori', baslik: 'Kategori', hiza: 'sol' }
      : { alan: 'donem', baslik: 'Donem', hiza: 'sol' };
  let satirlar = grupla(kayitlar, anahtar, OZETLER);

  const siralaBayragi = deger('sirala');
  if (siralaBayragi !== null) {
    const [alan, yon] = siralaBayragi.split(':');
    satirlar = sirala(satirlar, [
      {
        alan,
        yon: yon === 'azalan' ? 'azalan' : 'artan',
        tur: alan === 'kategori' || alan === 'donem' ? 'metin' : 'sayi',
      },
    ]);
  }
  tablo(satirlar, [basSutun].concat(SUTUNLAR));
}

function ozetKomutu(v) {
  const kategoriler = [];
  for (const k of v.birlesik) if (!kategoriler.includes(k.kategori)) kategoriler.push(k.kategori);
  const siparisler = [];
  for (const o of v.olaylar) if (!siparisler.includes(o.siparisId)) siparisler.push(o.siparisId);
  const toplam = v.birlesik.reduce((t, k) => t + (sayi(k.ciro) || 0), 0);
  yaz(
    JSON.stringify({
      satis: v.satislar.length,
      urun: v.urunler.length,
      iade: v.iadeler.length,
      hareket: v.hareketler.length,
      siparis: siparisler.length,
      kategori: kategoriler.length,
      toplamCiro: yuvarla(toplam),
    })
  );
}

function jsonKomutu(v) {
  const aylik = v.birlesik.map((k) => ({ ...k, donem: donem(k.tarih, 'ay') }));
  const donemler = kosanToplam(
    grupla(aylik, 'donem', { ciro: { islev: 'toplam', alan: 'ciro' } }),
    'ciro',
    'birikimliCiro'
  );
  const enCok = sirala(v.birlesik, [{ alan: 'adet', yon: 'azalan', tur: 'sayi' }])[0];
  const iadeli = birlestirCok(v.satislar, v.iadeler, 'satisId', 'satisId', 'iadeler')
    .filter((s) => s.iadeler.length)
    .map((s) => ({
      satisId: s.satisId,
      iadeAdedi: s.iadeler.length,
      iadeToplami: yuvarla(s.iadeler.reduce((t, i) => t + (sayi(i.adet) || 0), 0)),
    }));
  yaz(
    jsonRapor({
      kaynak: {
        satis: v.satislar.length,
        urun: v.urunler.length,
        iade: v.iadeler.length,
        hareket: v.hareketler.length,
      },
      kategoriler: grupla(v.birlesik, 'kategori', OZETLER),
      donemler,
      enCokSatan: enCok
        ? { urunKodu: enCok.urunKodu, ad: enCok.ad, adet: sayi(enCok.adet) }
        : null,
      iadeliSatislar: iadeli,
      mutabakat: mutabakat(v.hareketler, v.satislar),
      siparisler: siparisDurumlari(v.olaylar),
    })
  );
}

function denetimKomutu(satislar, iadeler) {
  const satirlar = [];
  for (const s of satislar) {
    for (const m of denetle(s, SATIS_SEMA)) satirlar.push('satis.csv ' + s.satisId + ': ' + m);
  }
  const kimlikler = satislar.map((s) => String(s.satisId));
  for (const i of iadeler) {
    for (const m of denetle(i, IADE_SEMA)) satirlar.push('iade.csv ' + i.iadeId + ': ' + m);
    if (!kimlikler.includes(String(i.satisId)))
      satirlar.push('iade.csv ' + i.iadeId + ': satisId: eslesmeyen satis');
  }
  if (!satirlar.length) {
    yaz('denetim temiz');
    return 0;
  }
  yaz(satirlar.join('\n'));
  return 2;
}

function main() {
  const komut = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'rapor';
  if (!KOMUTLAR.includes(komut)) {
    process.stderr.write('bilinmeyen komut: ' + komut + '\n');
    process.exit(1);
  }
  const v = veriOku();
  if (komut === 'rapor') return raporKomutu(v.birlesik);
  if (komut === 'ozet') return ozetKomutu(v);
  if (komut === 'json') return jsonKomutu(v);
  if (komut === 'mutabakat') return tablo(mutabakat(v.hareketler, v.satislar), MUTABAKAT_SUTUN);
  if (komut === 'durum') return tablo(siparisDurumlari(v.olaylar), DURUM_SUTUN);
  if (komut === 'hareket')
    return tablo(
      grupla(v.hareketler, 'tur', {
        kayit: { islev: 'adet' },
        miktar: { islev: 'toplam', alan: 'miktar' },
      }),
      HAREKET_SUTUN
    );
  process.exit(denetimKomutu(v.satislar, v.iadeler));
}

main();
