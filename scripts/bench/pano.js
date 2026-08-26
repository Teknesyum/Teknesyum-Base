#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');

const { GOREVLER, DURUMLAR, topla, verimSatirlari } = require('./topla.js');

const KOK = path.resolve(__dirname, '..', '..');
const KOS_JS = path.join(__dirname, 'kos.js');

const TIK_MS = 500;
const KARAKTER_PER_TOKEN = 3.6;

const RENK = {
  bekliyor: '\x1b[90m',
  kosuyor: '\x1b[36m',
  bitti: '\x1b[32m',
  kaldi: '\x1b[31m',
  tavan: '\x1b[33m',
  hata: '\x1b[31m',
  atlandi: '\x1b[90m',
};
const SIFIR = '\x1b[0m';

function tty() {
  return process.stdout.isTTY && !process.env.TBENCH_PANO_DUZ;
}

function boya(ad, metin) {
  return tty() ? (RENK[ad] || '') + metin + SIFIR : metin;
}

function sure(ms) {
  if (!ms || ms < 0) return '';
  const s = Math.round(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function kisalt(n) {
  if (n === null || n === undefined) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function jsonlBoyutu(dizin) {
  let toplam = 0;
  const yigin = [dizin];
  while (yigin.length > 0) {
    const d = yigin.pop();
    let girisler;
    try {
      girisler = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const g of girisler) {
      const tam = path.join(d, g.name);
      if (g.isDirectory()) yigin.push(tam);
      else if (g.name.endsWith('.jsonl')) {
        try {
          toplam += fs.statSync(tam).size;
        } catch {}
      }
    }
  }
  return toplam;
}

function bosHucre() {
  return { hal: 'bekliyor', basladi: null, bitti: null, token: 0, kesin: false, not: '' };
}

function pano() {
  const hucreler = new Map();
  for (const g of GOREVLER) for (const d of DURUMLAR) hucreler.set(`${g}__${d}`, bosHucre());
  return hucreler;
}

function tara(hucreler, benchKok) {
  if (!benchKok) return;
  for (const [anahtar, h] of hucreler) {
    if (h.hal === 'bitti' || h.hal === 'kaldi' || h.hal === 'hata' || h.hal === 'atlandi') continue;
    const konfig = path.join(benchKok, anahtar, 'konfig');
    if (!fs.existsSync(konfig)) continue;
    if (h.hal === 'bekliyor') {
      h.hal = 'kosuyor';
      h.basladi = Date.now();
    }
    const boyut = jsonlBoyutu(path.join(konfig, 'projects'));
    if (boyut > 0) h.token = Math.round(boyut / KARAKTER_PER_TOKEN);
  }
}

function satirlariKur(hucreler, benchKok, sonSatir, bittiSayisi) {
  const L = [];
  const genislik = 17;
  L.push(`madenci panosu · ${bittiSayisi}/${hucreler.size} kosu · kok: ${benchKok || '(bekleniyor)'}`);
  L.push('');
  L.push('gorev'.padEnd(10) + DURUMLAR.map((d) => d.padEnd(genislik)).join(''));
  for (const g of GOREVLER) {
    const ust = [];
    const alt = [];
    for (const d of DURUMLAR) {
      const h = hucreler.get(`${g}__${d}`);
      const gecen = h.basladi ? (h.bitti || Date.now()) - h.basladi : 0;
      ust.push(boya(h.hal, (h.hal === 'kosuyor' ? `${h.hal} ${sure(gecen)}` : h.hal).padEnd(genislik)));
      const tk = h.token ? `${h.kesin ? '' : '~'}${kisalt(h.token)} tok` : '';
      alt.push(`  ${(tk + (h.not ? ` ${h.not}` : '')).padEnd(genislik - 2)}`);
    }
    L.push(g.padEnd(10) + ust.join(''));
    L.push(' '.repeat(10) + alt.join(''));
  }
  L.push('');
  L.push(`son: ${(sonSatir || '').slice(0, 100)}`);
  return L;
}

function ciz(satirlar, oncekiYukseklik) {
  if (tty()) {
    if (oncekiYukseklik > 0) process.stdout.write(`\x1b[${oncekiYukseklik}A`);
    process.stdout.write(satirlar.map((s) => `\x1b[2K${s}\n`).join(''));
    return satirlar.length;
  }
  process.stdout.write(`${satirlar.join('\n')}\n\n`);
  return 0;
}

async function main() {
  const kosArgs = process.argv.slice(2);
  const hucreler = pano();
  let benchKok = null;
  let sonSatir = '';
  let yukseklik = 0;
  let bittiSayisi = 0;
  let duzSonCizim = 0;

  const cocuk = spawn(process.execPath, [KOS_JS, ...kosArgs], {
    cwd: KOK,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const rl = readline.createInterface({ input: cocuk.stdout, crlfDelay: Number.POSITIVE_INFINITY });
  let hataMetni = '';
  cocuk.stderr.on('data', (d) => {
    hataMetni += d;
  });

  rl.on('line', (satir) => {
    sonSatir = satir.trim();
    const kok = /^kosu koku:\s*(.+)$/.exec(sonSatir);
    if (kok) {
      benchKok = kok[1].trim();
      return;
    }
    const atlandi = /^atlandi \(sonuc var\):\s*(\S+)/.exec(sonSatir);
    if (atlandi && hucreler.has(atlandi[1])) {
      const h = hucreler.get(atlandi[1]);
      h.hal = 'atlandi';
      h.not = '';
      bittiSayisi++;
      return;
    }
    const bitti = /^bitti\s+(\S+)\s+(.*)$/.exec(sonSatir);
    if (bitti && hucreler.has(bitti[1])) {
      const h = hucreler.get(bitti[1]);
      const kuyruk = bitti[2];
      h.bitti = Date.now();
      if (!h.basladi) h.basladi = h.bitti;
      h.hal = /^HATA/.test(kuyruk)
        ? 'hata'
        : /TAVAN/.test(kuyruk)
          ? 'tavan'
          : /KALDI/.test(kuyruk)
            ? 'kaldi'
            : 'bitti';
      bittiSayisi++;
    }
  });

  const zaman = setInterval(() => {
    tara(hucreler, benchKok);
    const satirlar = satirlariKur(hucreler, benchKok, sonSatir, bittiSayisi);
    if (tty()) yukseklik = ciz(satirlar, yukseklik);
    else if (Date.now() - duzSonCizim > 5000) {
      duzSonCizim = Date.now();
      ciz(satirlar, 0);
    }
  }, TIK_MS);

  const kod = await new Promise((cozum) => cocuk.on('close', cozum));
  clearInterval(zaman);
  tara(hucreler, benchKok);
  ciz(satirlariKur(hucreler, benchKok, sonSatir, bittiSayisi), tty() ? yukseklik : 0);

  if (hataMetni.trim()) process.stdout.write(`\nkos.js stderr: ${hataMetni.trim().slice(0, 400)}\n`);

  process.stdout.write('\nverim\n');
  try {
    const kosular = await topla();
    const kesinlik = new Map(
      kosular.map((k) => [
        k.anahtar,
        k.toplamKalem ? k.toplamKalem.input + k.toplamKalem.cc + k.toplamKalem.out : null,
      ])
    );
    for (const [anahtar, h] of hucreler) {
      const t = kesinlik.get(anahtar);
      if (t !== null && t !== undefined) {
        h.token = t;
        h.kesin = true;
      }
    }
    // ÖLÇÜLDÜ 27.08 (konsey üyesi buldu): pano süzmeden, nihai rapor (`topla.js` main)
    // süzerek ortalama alıyordu — aynı girdiden iki farklı verim satırı. Geçersiz koşu
    // panoda ortalamaya giriyordu. Süzme kaynağı tek: `k.gecerli`.
    const gecerliler = kosular.filter((k) => k.gecerli);
    const elenen = kosular.length - gecerliler.length;
    if (elenen) process.stdout.write(`${elenen} koşu geçerlilik kapısında elendi, verim dışı\n`);
    for (const s of verimSatirlari(gecerliler)) process.stdout.write(`${s}\n`);
    process.stdout.write('\nkesin taze token — input+cache-create+output (transkriptten):\n');
    ciz(satirlariKur(hucreler, benchKok, 'kesin sayilar', bittiSayisi), 0);
    process.stdout.write('rapor icin: node scripts/bench/topla.js\n');
  } catch (e) {
    process.stdout.write(`verim hesaplanamadi: ${String((e && e.message) || e)}\n`);
  }
  process.exit(kod || 0);
}

if (require.main === module) main();
