#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const kok = path.resolve(process.argv[2] || '.');
const temiz = path.join(__dirname, 'agac');
const ATLA = new Set(['.git', '.claude', 'node_modules']);
const hatalar = [];

function tara(dizin, on = '') {
  const cikti = new Map();
  for (const ad of fs.readdirSync(dizin).sort()) {
    if (ATLA.has(ad)) continue;
    const tam = path.join(dizin, ad);
    const goreli = on ? on + '/' + ad : ad;
    if (fs.statSync(tam).isDirectory()) for (const [k, v] of tara(tam, goreli)) cikti.set(k, v);
    else cikti.set(goreli, fs.readFileSync(tam, 'utf8').replace(/\r\n/g, '\n'));
  }
  return cikti;
}

const once = tara(temiz);
const sonra = tara(kok);

const surumMetni = sonra.get('surum.json');
if (surumMetni === undefined) hatalar.push('surum.json yok');
else {
  let j = null;
  try {
    j = JSON.parse(surumMetni);
  } catch (e) {
    hatalar.push('surum.json cozulemedi: ' + String((e && e.message) || e));
  }
  if (j) {
    if (j.surum !== '1.3.0') hatalar.push('surum = ' + JSON.stringify(j.surum) + ', beklenen 1.3.0');
    if (j.ad !== 'mini-arac') hatalar.push('ad alani degistirilmis: ' + JSON.stringify(j.ad));
    if (j.giris !== 'src/arac.js')
      hatalar.push('giris alani degistirilmis: ' + JSON.stringify(j.giris));
  }
}

const eklenen = [...sonra.keys()].filter((k) => !once.has(k));
const silinen = [...once.keys()].filter((k) => !sonra.has(k));
const degisen = [...once.keys()].filter(
  (k) => k !== 'surum.json' && sonra.has(k) && sonra.get(k) !== once.get(k)
);

if (eklenen.length) hatalar.push('kapsam disi yeni dosya: ' + eklenen.join(', '));
if (silinen.length) hatalar.push('silinen dosya: ' + silinen.join(', '));
if (degisen.length) hatalar.push('kapsam disi degisen dosya: ' + degisen.join(', '));

if (hatalar.length) {
  process.stdout.write('KIRMIZI · ' + hatalar.join(' | ') + '\n');
  process.exit(1);
}
process.stdout.write('YESIL · teksatir\n');
