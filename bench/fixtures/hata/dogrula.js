#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const kok = path.resolve(process.argv[2] || '.');
const temiz = path.join(__dirname, 'agac');
const testYolu = path.join('test', 'aralik.test.js');

const hatalar = [];

const beklenen = fs.readFileSync(path.join(temiz, testYolu), 'utf8');
const simdiki = fs.existsSync(path.join(kok, testYolu))
  ? fs.readFileSync(path.join(kok, testYolu), 'utf8')
  : null;
if (simdiki === null) hatalar.push('test dosyasi silinmis: ' + testYolu);
else if (simdiki.replace(/\r\n/g, '\n') !== beklenen.replace(/\r\n/g, '\n'))
  hatalar.push('test dosyasi degistirilmis: ' + testYolu);

const r = spawnSync(process.execPath, [testYolu], { cwd: kok, encoding: 'utf8' });
if (r.status !== 0)
  hatalar.push(
    'test kirmizi (kod ' + r.status + '): ' + String(r.stderr || r.stdout).trim().split('\n')[0]
  );

if (hatalar.length) {
  process.stdout.write('KIRMIZI · ' + hatalar.join(' | ') + '\n');
  process.exit(1);
}
process.stdout.write('YESIL · hata\n');
