#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const kok = path.resolve(process.argv[2] || '.');
const dosya = path.join(kok, 'cevap.md');
const hatalar = [];

const ANAHTARLAR = [
  'ayar.js',
  'kuyruk.js',
  'yazici.js',
  'denemeSayisi',
  'bekle',
  'olusuz',
  '250',
  '3',
];

if (!fs.existsSync(dosya)) {
  process.stdout.write('KIRMIZI · cevap.md yok\n');
  process.exit(1);
}

const metin = fs.readFileSync(dosya, 'utf8');
const kucuk = metin.toLowerCase();

if (metin.trim().length < 150) hatalar.push('cevap 150 karakterden kisa');

const eksik = ANAHTARLAR.filter((a) => !kucuk.includes(a.toLowerCase()));
if (eksik.length) hatalar.push('eksik anahtar: ' + eksik.join(', '));

if (hatalar.length) {
  process.stdout.write('KIRMIZI · ' + hatalar.join(' | ') + '\n');
  process.exit(1);
}
process.stdout.write('YESIL · rapor\n');
