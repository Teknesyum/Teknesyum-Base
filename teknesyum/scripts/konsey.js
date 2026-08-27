#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { roleKoku } = require('../hooks/ortak.js');

const TAVAN = 3;
const KARARLAR = ['uzat', 'yeterli'];
const YONLER = ['ayni', 'ayri'];

const argv = process.argv.slice(2);

function arg(ad) {
  const on = '--' + ad + '=';
  const esitlikli = argv.find((a) => a.startsWith(on));
  if (esitlikli) return esitlikli.slice(on.length);
  const i = argv.indexOf('--' + ad);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
}

function bas(satir, kod) {
  process.stdout.write(satir.join('\n') + '\n');
  process.exitCode = kod || 0;
}

function dur(satir) {
  return bas(satir, 2);
}

function kokBul() {
  const r = roleKoku(arg('kok') || process.cwd());
  if (!r) return null;
  return { relay: r.relay, kok: path.dirname(path.dirname(r.relay)) };
}

function halYolu(relay) {
  return path.join(relay, 'live', 'konsey.json');
}

function halOku(relay) {
  try {
    return JSON.parse(fs.readFileSync(halYolu(relay), 'utf8'));
  } catch {
    return null;
  }
}

function halYaz(relay, h) {
  const d = path.join(relay, 'live');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(halYolu(relay), JSON.stringify(h, null, 2) + '\n', 'utf8');
}

function dolu(p, kok) {
  const tam = path.isAbsolute(p) ? p : path.join(kok, p);
  try {
    return fs.statSync(tam).size > 200 ? tam : null;
  } catch {
    return null;
  }
}

function ozet(h) {
  const L = [`konsey: ${h.konu}`, `tur ${h.tur}/${TAVAN} · durum: ${h.durum}`];
  for (const k of h.kayitlar) {
    L.push(
      `  tur ${k.tur}: uye=${k.uyeMetni || '—'}` +
        (k.karar
          ? ` · karar=${k.karar} uye_yonu=${k.uyeYonu}${k.nesne ? ` · nesne: ${k.nesne}` : ''}`
          : '')
    );
  }
  return L;
}

function main() {
  const b = kokBul();
  if (!b) return dur(['role koku bulunamadi']);
  const komut = argv[0];

  if (komut === 'ac') {
    const konu = arg('konu');
    if (!konu) return dur(['--konu sart']);
    const eski = halOku(b.relay);
    if (eski && eski.durum !== 'kapali')
      return dur(['acik konsey var, once kapat:', ...ozet(eski)]);
    halYaz(b.relay, { konu, tur: 1, durum: 'uye-bekleniyor', kayitlar: [] });
    return bas([
      `konsey acildi: ${konu}`,
      'siradaki: iki taraf BAGIMSIZ yazar. Uyenin metni dosyaya kaydedilir, sonra:',
      '  node teknesyum/scripts/konsey.js uye --dosya docs/konsey/arsiv/<...>.md',
    ]);
  }

  const h = halOku(b.relay);
  if (!h || h.durum === 'kapali') return dur(['acik konsey yok — once "ac"']);

  if (komut === 'durum') return bas(ozet(h));

  if (komut === 'uye') {
    if (h.durum !== 'uye-bekleniyor') return dur([`bu asamada degil (durum: ${h.durum})`]);
    const p = arg('dosya');
    if (!p) return dur(['--dosya sart — uyenin metni BIREBIR arsivlenmeden baskana gidemez']);
    const tam = dolu(p, b.kok);
    if (!tam) return dur([`dosya yok ya da 200 karakterden kisa: ${p}`]);
    h.kayitlar.push({ tur: h.tur, uyeMetni: p });
    h.durum = 'baskan-bekleniyor';
    halYaz(b.relay, h);
    return bas([
      `tur ${h.tur} uye metni kayitli: ${p}`,
      'siradaki: bu dosyayi BASKANA ver. Baskan kapatacagindan emin olsa bile once okur.',
      '  node teknesyum/scripts/konsey.js karar --karar uzat|yeterli --uye-yonu ayni|ayri --dosya <baskanin metni> [--nesne "..."]',
    ]);
  }

  if (komut === 'karar') {
    if (h.durum !== 'baskan-bekleniyor')
      return dur([
        `bu asamada degil (durum: ${h.durum})`,
        'baskan uyenin metnini gormeden karar veremez — once "uye --dosya"',
      ]);
    const karar = arg('karar');
    if (!KARARLAR.includes(karar))
      return dur([`--karar ${KARARLAR.join(' | ')} olmali (ucuncu deger yok)`]);
    const yon = arg('uye-yonu');
    if (!YONLER.includes(yon)) return dur([`--uye-yonu ${YONLER.join(' | ')} olmali`]);
    const p = arg('dosya');
    const tam = p && dolu(p, b.kok);
    if (!tam) return dur(['--dosya sart: baskanin kendi metni arsivlenir, T0 sentez yazmaz']);
    const nesne = arg('nesne');
    if (karar === 'uzat' && !nesne)
      return dur(['nesnesiz uzatma sayilmaz — --nesne ile ne konusulacagini yaz']);
    if (karar === 'uzat' && h.tur >= TAVAN) return dur([`tavan ${TAVAN} tur, uzatilamaz`]);

    const kayit = h.kayitlar[h.kayitlar.length - 1];
    kayit.karar = karar;
    kayit.uyeYonu = yon;
    kayit.nesne = nesne || null;
    kayit.baskanMetni = p;

    if (karar === 'yeterli') {
      h.durum = 'kapali';
      halYaz(b.relay, h);
      return bas([`konsey kapandi · ${h.tur} tur`, ...ozet(h)]);
    }
    h.tur += 1;
    h.durum = 'uye-bekleniyor';
    halYaz(b.relay, h);
    return bas([
      `uzatildi · tur ${h.tur}/${TAVAN} · nesne: ${nesne}`,
      'oturumlar KAPATILMAZ, surdurulur — brifing tekrarlanmaz.',
    ]);
  }

  return dur(['kullanim: konsey.js ac|uye|karar|durum']);
}

main();
