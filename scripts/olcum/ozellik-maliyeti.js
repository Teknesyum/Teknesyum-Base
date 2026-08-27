#!/usr/bin/env node

// Ozellik basina baglam maliyeti. Elle yazilan MALIYET-ENVANTERI.md'nin yerine gecer:
// o dosya bir defa dogruydu, bu betik her kosuda dogru.
//
// Uc kalem olculur:
//   sabitYuzey  — komut/ajan/skill tanimlari; her oturumda ve her alt ajanda yuklenir
//   enjeksiyon  — kancanin istem basina yazdigi metin (istem-yuku.js olcer)
//   kullanim    — ozelligin gercekte kac kez cagrildigi (kancanin sayaci)
//
// Bunlarin carpimindan "cagri basina maliyet" cikar: hic cagrilmayan bir tanim
// bolen sifir oldugu icin sonsuz pahalidir ve tabloda en uste cikar.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const KOK = path.resolve(__dirname, '..', '..');
// istem-yuku.js disa aktarim yapmiyor ve require edilirse tum olcumu kosturur.
// Katsayiyi metinden okuyoruz: tek kaynak orasi, kopya sabit birakmiyoruz.
const K = (() => {
  const m = /^const KATSAYI = ([0-9.]+);/m.exec(
    fs.readFileSync(path.join(__dirname, 'istem-yuku.js'), 'utf8')
  );
  if (!m) throw new Error('istem-yuku.js icinde KATSAYI bulunamadi');
  return Number(m[1]);
})();

function tok(s) {
  return Math.round(String(s).length / K);
}

function frontmatter(dosya) {
  let s;
  try {
    s = fs.readFileSync(dosya, 'utf8');
  } catch {
    return null;
  }
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(s);
  if (!m) return null;
  const d = /^description:\s*([\s\S]*?)$/m.exec(m[1]);
  return { desc: d ? d[1].trim() : '', govde: s.length };
}

function yuzey() {
  const kalemler = [];
  const komutDizin = path.join(KOK, 'teknesyum', 'commands');
  for (const f of fs.readdirSync(komutDizin).filter((x) => x.endsWith('.md'))) {
    const fm = frontmatter(path.join(komutDizin, f));
    if (fm) kalemler.push({ tip: 'komut', ad: path.basename(f, '.md'), kar: fm.desc.length });
  }
  const ajanDizin = path.join(KOK, 'teknesyum', 'agents');
  for (const f of fs.readdirSync(ajanDizin).filter((x) => x.endsWith('.md'))) {
    const fm = frontmatter(path.join(ajanDizin, f));
    if (fm) kalemler.push({ tip: 'ajan', ad: path.basename(f, '.md'), kar: fm.desc.length });
  }
  const skillDizin = path.join(KOK, 'teknesyum', 'skills');
  for (const d of fs.readdirSync(skillDizin)) {
    const fm = frontmatter(path.join(skillDizin, d, 'SKILL.md'));
    if (fm) kalemler.push({ tip: 'skill', ad: d, kar: fm.desc.length });
  }
  for (const k of kalemler) k.token = tok('x'.repeat(k.kar));
  return kalemler;
}

function kullanim() {
  const yollar = [
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'teknesyum', 'canli', 'kullanim.json'),
    path.join(KOK, '.claude', 'relay', 'live', 'kullanim.json'),
  ];
  for (const y of yollar) {
    try {
      return JSON.parse(fs.readFileSync(y, 'utf8'));
    } catch {}
  }
  return {};
}

function enjeksiyon() {
  try {
    const ham = execFileSync(process.execPath, [path.join(__dirname, 'istem-yuku.js'), '--json'], {
      cwd: KOK,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 16 * 1024 * 1024,
    });
    return JSON.parse(ham);
  } catch (e) {
    return { hata: String((e && e.message) || e) };
  }
}

function main() {
  const jsonMu = process.argv.includes('--json');
  const kalemler = yuzey();
  const k = kullanim();
  const enj = enjeksiyon();

  // Ayni ad hem komut hem skill olarak sayilabiliyor (/log komutu skill:log'u tetikler).
  // Tek anahtara bakmak 'hic cagrilmadi' yanilgisi uretiyordu; ada ait butun anahtarlar
  // toplanir.
  for (const x of kalemler) {
    const adaylar = [
      x.tip + ':teknesyum:' + x.ad,
      x.tip + ':' + x.ad,
      'komut:teknesyum:' + x.ad,
      'skill:teknesyum:' + x.ad,
      'ajan:' + x.ad,
    ];
    const gorulen = new Set();
    x.cagri = 0;
    for (const a of adaylar) {
      if (gorulen.has(a) || !k[a]) continue;
      gorulen.add(a);
      x.cagri += k[a].n || 0;
    }
  }

  const toplam = {
    komut: kalemler.filter((x) => x.tip === 'komut').reduce((a, b) => a + b.token, 0),
    ajan: kalemler.filter((x) => x.tip === 'ajan').reduce((a, b) => a + b.token, 0),
    skill: kalemler.filter((x) => x.tip === 'skill').reduce((a, b) => a + b.token, 0),
  };
  toplam.hepsi = toplam.komut + toplam.ajan + toplam.skill;

  const sonuc = {
    katsayi: K,
    tarih: new Date().toISOString().slice(0, 10),
    sabitYuzey: { kalemler, toplam },
    enjeksiyon: enj.hata
      ? enj
      : {
          oturumdaBirKez: enj.oturumdaBirKez,
          enjeksiyonOturumToplami: enj.enjeksiyonOturumToplami,
          oturumToplami: enj.oturumToplami,
        },
    sifirCagrili: kalemler.filter((x) => !x.cagri).map((x) => x.tip + ':' + x.ad),
  };
  sonuc.sifirCagriliToken = kalemler.filter((x) => !x.cagri).reduce((a, b) => a + b.token, 0);

  if (jsonMu) {
    process.stdout.write(JSON.stringify(sonuc, null, 2) + '\n');
    return;
  }

  const L = [];
  L.push('ozellik maliyeti · katsayi ' + K + ' karakter/token · ' + sonuc.tarih);
  L.push('');
  L.push('tip     ad                        token  cagri  cagri basina');
  for (const x of kalemler.slice().sort((a, b) => b.token - a.token)) {
    L.push(
      x.tip.padEnd(7) +
        x.ad.padEnd(26) +
        String(x.token).padStart(5) +
        String(x.cagri).padStart(7) +
        (x.cagri ? (x.token / x.cagri).toFixed(1) : '  hic').padStart(14)
    );
  }
  L.push('');
  // Yukaridaki kalem token'lari YALNIZ description alanini sayar; siralama icin dogru,
  // toplam icin degil. Gercek baglam maliyeti iskeleti de icerir (ad, onek, (Tools: ...)).
  // Tek yetkili sayi istem-yuku.js'in olctugu oturumdaBirKez'dir.
  L.push('description toplami: komut ' + toplam.komut + ' · ajan ' + toplam.ajan + ' · skill ' + toplam.skill + ' = ' + toplam.hepsi + ' token');
  if (!enj.hata)
    L.push('SABIT YUZEY (iskelet dahil, yetkili olcu): ' + enj.oturumdaBirKez.token + ' token');
  L.push('hic cagrilmayan ' + sonuc.sifirCagrili.length + ' tanim = ' + sonuc.sifirCagriliToken + ' token');
  if (!enj.hata) {
    L.push('enjeksiyon oturum toplami: ' + enj.enjeksiyonOturumToplami.token + ' token (yazan tur ' + enj.enjeksiyonOturumToplami.yazanTur + ')');
    L.push('oturum toplami (yuzey + enjeksiyon): ' + enj.oturumToplami.token + ' token');
  } else {
    L.push('enjeksiyon olculemedi: ' + enj.hata);
  }
  process.stdout.write(L.join('\n') + '\n');
}

if (require.main === module) main();
module.exports = { yuzey, kullanim };
