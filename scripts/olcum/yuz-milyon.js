#!/usr/bin/env node


const path = require('path');
const { execFileSync } = require('child_process');

const KOK = path.join(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// Girdiler. Hicbiri tahmin degil: her biri bu depoda olculmus bir sayidan gelir.
// Kaynagi belirsiz olan tek sey OTURUM SEKLI (tur/alt ajan sayisi) - o da girdi
// olarak disaridan verilir, cunku projeden projeye degisir.
// ---------------------------------------------------------------------------

const FIYAT = {
  girdi: 15 / 1e6,
  cikti: 75 / 1e6,
  onbellekYaz: 18.75 / 1e6,
  onbellekOku: 1.5 / 1e6,
};

const OLCUM = {
  // scripts/olcum/istem-yuku.js --json, 27.08.2026
  sabitYuzey: 1396,
  // dil.js enjeksiyonu, oturum toplami (tur 1-3, sonrasi sifir).
  // Y7 (27.08): premiumNotu 838 -> 149 token, gerekce references/premium.md govdesine
  // indi. 1005 - (838 - 149) = 316.
  enjeksiyon: 316,
  // bench 64 kosu: premium cr/tur - native cr/tur
  surenYukTur: 1067,
  // bench 64 kosu: premium cc - native cc
  ilkYukCc: 1370,
  katsayi: 2.492,
};

// Oturum sekli. Varsayilan degerler bench'in olctugu mikro kosudan degil,
// bu projedeki gercek kullanimdan: uzun oturum, cok alt ajan.
const SEKIL = {
  turPerOturum: Number(bayrak('tur') || 60),
  altAjanPerOturum: Number(bayrak('ajan') || 6),
  altAjanTurPerAjan: Number(bayrak('ajantur') || 12),
};

function bayrak(ad) {
  const on = '--' + ad + '=';
  const s = process.argv.find((a) => a.startsWith(on));
  const bosluklu = process.argv.indexOf('--' + ad);
  if (!s && bosluklu >= 0) {
    process.stderr.write('--' + ad + ' degeri esitlikle verilir: --' + ad + '=<sayi>\n');
    process.exit(2);
  }
  return s ? s.slice(on.length) : null;
}

function kalemler() {
  const cikti = execFileSync(
    process.execPath,
    [path.join(KOK, 'scripts', 'olcum', 'ozellik-maliyeti.js'), '--json'],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
  );
  const j = JSON.parse(cikti);
  return { kalemler: j.sabitYuzey.kalemler };
}

// ---------------------------------------------------------------------------
// Model
//
// Bir kalemin (ornegin bir ajan tanimi) omur boyu maliyeti uc yerden gelir:
//
//   1. ANA BAGLAM ILK YAZIM  - oturum basina bir kez, cache-create fiyatiyla
//   2. ANA BAGLAM HER TUR    - her turda yeniden okunur, cache-read fiyatiyla
//   3. ALT AJAN BAGLAMI      - her alt ajan kendi baglamina bastan yazar,
//                              sonra kendi turlarinda yeniden okur
//
// 3. kalem projede en cok gozden kacan yerdir: 6 alt ajanli bir oturumda sabit
// yuzey yedi kez yaziliyor, bir kez degil.
// ---------------------------------------------------------------------------

// OLCULDU 27.08.2026 (alt baglam sondasi): alt ajan baglamina sabit yuzeyin TAMAMI
// gitmiyor. Sonda iki ajanda kosuldu ve `altBaglamda` degeri buna gore ayarlandi.
// Bu ayrim onemli: yanlis varsayim alt ajan carpanini kat kat abartiyordu.
function oturumMaliyeti(token, altBaglamda) {
  const anaYaz = token;
  const anaOku = token * SEKIL.turPerOturum;
  const altYaz = altBaglamda ? token * SEKIL.altAjanPerOturum : 0;
  const altOku = altBaglamda ? token * SEKIL.altAjanPerOturum * SEKIL.altAjanTurPerAjan : 0;
  return {
    yaz: anaYaz + altYaz,
    oku: anaOku + altOku,
    toplam: anaYaz + anaOku + altYaz + altOku,
    usd: (anaYaz + altYaz) * FIYAT.onbellekYaz + (anaOku + altOku) * FIYAT.onbellekOku,
  };
}

function bin(n) {
  return Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

function usd(n) {
  return '$' + Number(n).toFixed(4);
}

function main() {
  const jsonMu = process.argv.includes('--json');
  const k = kalemler();

  const oturumToplamToken = 100e6;

  // Bir oturumun eklentisiz taban tuketimi: bench'ten cr/tur ~34.555 native.
  // Oturum basina toplam token = tur x (cr + cc payi + cikti). Kaba ama tek
  // ihtiyacimiz olan sey oturum SAYISI, o da toplami taban tuketime bolerek.
  const taban = {
    crTur: 34555,
    ciktiTur: 1294 / 4,
  };
  const oturumBasinaTaban =
    SEKIL.turPerOturum * taban.crTur +
    SEKIL.altAjanPerOturum * SEKIL.altAjanTurPerAjan * taban.crTur;
  const oturumSayisi = oturumToplamToken / oturumBasinaTaban;

  // Sondanin bulgusu: alt ajan baglaminda SKILL aciklamalari var, komut ve ajan
  // tanimlari yok. Tek bir yerde tanimli olsun ki degisince her yer duzelsin.
  const ALT_BAGLAMDA = { skill: true, komut: false, ajan: false };

  const satirlar = [];
  for (const kalem of k.kalemler) {
    const m = oturumMaliyeti(kalem.token, ALT_BAGLAMDA[kalem.tip]);
    satirlar.push({
      tip: kalem.tip,
      ad: kalem.ad,
      token: kalem.token,
      cagri: kalem.cagri,
      oturumToken: m.toplam,
      yuzMilyonToken: m.toplam * oturumSayisi,
      yuzMilyonUsd: m.usd * oturumSayisi,
      cagriPer100m: kalem.cagri,
    });
  }
  satirlar.sort((a, b) => b.yuzMilyonToken - a.yuzMilyonToken);

  const enjeksiyon = {
    ad: 'enjeksiyon (dil.js, tur 1-3)',
    token: OLCUM.enjeksiyon,
  };
  // Enjeksiyon alt ajana gitmez ve tur 3'ten sonra sifirdir: oturum basina bir
  // kez yazilir, kalan turlarda okunur.
  const enjM = {
    yaz: enjeksiyon.token,
    oku: enjeksiyon.token * (SEKIL.turPerOturum - 1),
    usd:
      enjeksiyon.token * FIYAT.onbellekYaz +
      enjeksiyon.token * (SEKIL.turPerOturum - 1) * FIYAT.onbellekOku,
  };
  enjM.toplam = enjM.yaz + enjM.oku;

  const yuzeyToplam = { toplam: satirlar.reduce((t, r) => t + r.oturumToken, 0), usd: satirlar.reduce((t, r) => t + r.yuzMilyonUsd, 0) / oturumSayisi };
  const rapor = {
    varsayim: SEKIL,
    oturumSayisi100m: oturumSayisi,
    sabitYuzey: {
      token: OLCUM.sabitYuzey,
      oturumToken: yuzeyToplam.toplam,
      yuzMilyonToken: yuzeyToplam.toplam * oturumSayisi,
      yuzMilyonUsd: yuzeyToplam.usd * oturumSayisi,
      pay: (yuzeyToplam.toplam * oturumSayisi) / oturumToplamToken,
    },
    enjeksiyon: {
      token: enjeksiyon.token,
      oturumToken: enjM.toplam,
      yuzMilyonToken: enjM.toplam * oturumSayisi,
      yuzMilyonUsd: enjM.usd * oturumSayisi,
    },
    kalemler: satirlar,
  };

  if (jsonMu) {
    process.stdout.write(JSON.stringify(rapor, null, 2) + '\n');
    return;
  }

  const s = [];
  s.push('100M token projeksiyonu · ' + new Date().toISOString().slice(0, 10));
  s.push('');
  s.push(
    'Oturum sekli: ' +
      SEKIL.turPerOturum +
      ' tur · ' +
      SEKIL.altAjanPerOturum +
      ' alt ajan × ' +
      SEKIL.altAjanTurPerAjan +
      ' tur'
  );
  s.push('100M token ≈ ' + bin(oturumSayisi) + ' oturum (native taban tuketimiyle)');
  s.push('');
  s.push('KALEM                        token   oturumda   100M icinde      USD  cagri  USD/cagri');
  s.push('-'.repeat(90));
  const yaz = (ad, tok, otu, yuz, dolar, cagri) =>
    s.push(
      ad.padEnd(28) +
        String(tok).padStart(6) +
        bin(otu).padStart(11) +
        bin(yuz).padStart(14) +
        usd(dolar).padStart(12) +
        (cagri === undefined ? '' : String(cagri).padStart(7)) +
        (cagri === undefined ? '' : (cagri ? usd(dolar / cagri) : 'HIC').padStart(11))
    );
  yaz(
    'SABIT YUZEY (tumu)',
    OLCUM.sabitYuzey,
    rapor.sabitYuzey.oturumToken,
    rapor.sabitYuzey.yuzMilyonToken,
    rapor.sabitYuzey.yuzMilyonUsd
  );
  yaz(
    'enjeksiyon (dil.js)',
    enjeksiyon.token,
    enjM.toplam,
    rapor.enjeksiyon.yuzMilyonToken,
    rapor.enjeksiyon.yuzMilyonUsd
  );
  s.push('-'.repeat(90));
  for (const r of satirlar)
    yaz(r.tip + ' ' + r.ad, r.token, r.oturumToken, r.yuzMilyonToken, r.yuzMilyonUsd, r.cagri);
  s.push('');
  s.push(
    'Sabit yuzeyin 100M icindeki payi: %' + (rapor.sabitYuzey.pay * 100).toFixed(2)
  );

  const hic = satirlar.filter((r) => !r.cagri);
  const hicUsd = hic.reduce((t, r) => t + r.yuzMilyonUsd, 0);
  const hicToken = hic.reduce((t, r) => t + r.token, 0);
  s.push('');
  s.push(
    'HIC CAGRILMAYAN ' +
      hic.length +
      ' tanim: ' +
      hicToken +
      ' token · 100M icinde ' +
      usd(hicUsd) +
      ' — ' +
      hic.map((r) => r.ad).join(', ')
  );
  const enPahali = satirlar.filter((r) => r.cagri).sort((a, b) => b.yuzMilyonUsd / b.cagri - a.yuzMilyonUsd / a.cagri);
  s.push(
    'CAGRI BASINA EN PAHALI: ' +
      enPahali
        .slice(0, 3)
        .map((r) => r.ad + ' ' + usd(r.yuzMilyonUsd / r.cagri))
        .join(' · ')
  );
  // -------------------------------------------------------------------------
  // Senaryolar. Soru "neyi cikarabiliriz" degil, "cikarinca ne kazanirsin".
  // Her satir 100M token icinde kazanilan dolar.
  // -------------------------------------------------------------------------
  const ajanToplam = satirlar
    .filter((r) => r.tip === 'ajan')
    .reduce((t, r) => t + r.token, 0);
  const skillToplam = satirlar
    .filter((r) => r.tip === 'skill')
    .reduce((t, r) => t + r.token, 0);

  const altPayi = (token) => {
    // yalniz alt baglama giden kalemler icin anlamli
    const yaz = token * SEKIL.altAjanPerOturum;
    const oku = token * SEKIL.altAjanPerOturum * SEKIL.altAjanTurPerAjan;
    return (yaz * FIYAT.onbellekYaz + oku * FIYAT.onbellekOku) * oturumSayisi;
  };
  const tamPayi = (token) => oturumMaliyeti(token).usd * oturumSayisi;

  const senaryo = [
    ['hic cagrilmayan 6 tanim cikar', tamPayi(hicToken), 'yonlendirme kaybi riski dusuk'],
    ['skill aciklamalari %50 kisalt', tamPayi(skillToplam / 2), 'relay tetiklenmesi riskte'],
    ['skill aciklamalari alt baglama gitmesin', altPayi(skillToplam), 'ust sinir — alt ajan relay/ui skillini goremez'],
    ['TUM komut tanimlari cikarilsa', tamPayi(satirlar.filter((r) => r.tip === 'komut').reduce((t, r) => t + r.token, 0)), 'eklenti komutsuz kalir — kiyas icin'],
    ['TUM ajan tanimlari cikarilsa', tamPayi(ajanToplam), 'alt baglama zaten gitmiyorlar — kiyas icin'],
    ['enjeksiyon tamamen kapansin', rapor.enjeksiyon.yuzMilyonUsd, 'dil/profil talimati kaybolur'],
  ];
  const yuzeyUsd = rapor.sabitYuzey.yuzMilyonUsd + rapor.enjeksiyon.yuzMilyonUsd;
  s.push('');
  s.push('SENARYO — 100M token icinde kazanc');
  s.push('-'.repeat(90));
  for (const [ad, kazanc, not] of senaryo)
    s.push(
      ad.padEnd(42) +
        usd(kazanc).padStart(10) +
        ('%' + ((kazanc / yuzeyUsd) * 100).toFixed(1)).padStart(8) +
        '  ' +
        not
    );
  s.push('');
  s.push('Eklentinin 100M icindeki toplam yuku: ' + usd(yuzeyUsd) + ' (yuzey + enjeksiyon)');

  process.stdout.write(s.join('\n') + '\n');
}

if (require.main === module) main();
module.exports = { oturumMaliyeti, FIYAT, OLCUM };
