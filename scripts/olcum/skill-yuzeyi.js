#!/usr/bin/env node

// Alt ajan baglamina giden TEK eklenti kalemi skill aciklamalaridir (27.08.2026
// sondasi: komut ve ajan tanimlari alt baglama gitmiyor, skill aciklamalari gidiyor).
// Bu betik o listeyi kaynagina gore ayirir: kaci bizim, kaci baska eklentiden.
//
// Kullanicinin kaldiraci burada: kullanilmayan eklentiyi kapatmak, kendi skillini
// kisaltmaktan daha cok kazandirir.

const fs = require('fs');
const path = require('path');
const os = require('os');

const KATSAYI = 2.492;

function frontmatterDescription(dosya) {
  let s;
  try {
    s = fs.readFileSync(dosya, 'utf8');
  } catch {
    return null;
  }
  if (!s.startsWith('---')) return null;
  const son = s.indexOf('\n---', 3);
  if (son < 0) return null;
  const bas = s.slice(0, son);
  const m = bas.match(/^description:[ \t]*(.*)$/im);
  if (!m) return null;
  let d = m[1].trim();
  // Cok satirli description: sonraki girintili satirlari da topla.
  const satirlar = bas.split('\n');
  const i = satirlar.findIndex((x) => /^description:/i.test(x));
  for (let j = i + 1; j < satirlar.length; j++) {
    if (/^\S/.test(satirlar[j])) break;
    d += ' ' + satirlar[j].trim();
  }
  return d.replace(/^["']|["']$/g, '');
}

function skillleriTara(kok, etiket, cikti) {
  let girdiler = [];
  try {
    girdiler = fs.readdirSync(kok, { withFileTypes: true });
  } catch {
    return;
  }
  for (const g of girdiler) {
    if (!g.isDirectory()) continue;
    const aday = path.join(kok, g.name, 'SKILL.md');
    if (fs.existsSync(aday)) {
      const d = frontmatterDescription(aday);
      if (d) cikti.push({ kaynak: etiket, ad: g.name, kar: d.length });
      continue;
    }
    skillleriTara(path.join(kok, g.name), etiket, cikti);
  }
}

function main() {
  const jsonMu = process.argv.includes('--json');
  const ev = os.homedir();
  const cache = path.join(ev, '.claude', 'plugins', 'cache');

  const liste = [];
  skillleriTara(path.join(ev, '.claude', 'skills'), 'kullanici', liste);

  let eklentiler = [];
  try {
    eklentiler = fs.readdirSync(cache, { withFileTypes: true }).filter((d) => d.isDirectory());
  } catch {}
  for (const e of eklentiler) skillleriTara(path.join(cache, e.name), e.name, liste);

  // Eklenti onbelleginde her surum icin ayri klasor duruyor; ayni skill bes kez
  // sayilabiliyor. Baglamda her skill BIR kez listelenir — ada gore tekillestir.
  const tekil = new Map();
  for (const s of liste) {
    const anahtar = s.kaynak + '/' + s.ad;
    const v = tekil.get(anahtar);
    if (!v || s.kar > v.kar) tekil.set(anahtar, s);
  }
  liste.length = 0;
  liste.push(...tekil.values());

  const gruplar = new Map();
  for (const s of liste) {
    const g = gruplar.get(s.kaynak) || { kaynak: s.kaynak, adet: 0, kar: 0, skiller: [] };
    g.adet++;
    g.kar += s.kar;
    g.skiller.push(s);
    gruplar.set(s.kaynak, g);
  }
  const sirali = Array.from(gruplar.values()).sort((a, b) => b.kar - a.kar);
  const toplamKar = sirali.reduce((t, g) => t + g.kar, 0);

  if (jsonMu) {
    process.stdout.write(
      JSON.stringify(
        {
          katsayi: KATSAYI,
          toplam: { adet: liste.length, kar: toplamKar, token: Math.round(toplamKar / KATSAYI) },
          gruplar: sirali.map((g) => ({
            kaynak: g.kaynak,
            adet: g.adet,
            kar: g.kar,
            token: Math.round(g.kar / KATSAYI),
          })),
          skiller: liste,
        },
        null,
        2
      ) + '\n'
    );
    return;
  }

  const L = [];
  L.push('skill yuzeyi · alt ajan baglamina giden tek eklenti kalemi');
  L.push('');
  L.push('KAYNAK'.padEnd(28) + 'skill'.padStart(6) + 'karakter'.padStart(10) + 'token'.padStart(8));
  L.push('-'.repeat(52));
  for (const g of sirali)
    L.push(
      g.kaynak.padEnd(28) +
        String(g.adet).padStart(6) +
        String(g.kar).padStart(10) +
        String(Math.round(g.kar / KATSAYI)).padStart(8)
    );
  L.push('-'.repeat(52));
  L.push(
    'TOPLAM'.padEnd(28) +
      String(liste.length).padStart(6) +
      String(toplamKar).padStart(10) +
      String(Math.round(toplamKar / KATSAYI)).padStart(8)
  );
  L.push('');
  const bizim = sirali.find((g) => g.kaynak === 'teknesyum');
  if (bizim) {
    const pay = ((bizim.kar / toplamKar) * 100).toFixed(1);
    L.push(
      'Bizim payimiz: %' +
        pay +
        ' (' +
        Math.round(bizim.kar / KATSAYI) +
        ' token). Geri kalan ' +
        Math.round((toplamKar - bizim.kar) / KATSAYI) +
        ' token baska eklentilerden geliyor'
    );
    L.push('ve her alt ajan baglaminda yeniden yaziliyor. Kaldirac: kullanilmayan eklentiyi kapat.');
  }
  L.push('');
  L.push('En uzun bes aciklama:');
  for (const s of liste.sort((a, b) => b.kar - a.kar).slice(0, 5))
    L.push('  ' + String(s.kar).padStart(5) + ' kar  ' + s.kaynak + ' → ' + s.ad);
  process.stdout.write(L.join('\n') + '\n');
}

if (require.main === module) main();
module.exports = { frontmatterDescription };
