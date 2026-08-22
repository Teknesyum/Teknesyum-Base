#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { s: ceviri } = require('../hooks/dil.js');

const UI_UZANTILARI = new Set([
  '.tsx',
  '.jsx',
  '.vue',
  '.svelte',
  '.html',
  '.css',
  '.scss',
  '.xaml',
  '.cs',
]);
const TOKEN_UZANTILARI = new Set([
  '.json',
  '.yaml',
  '.yml',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.xaml',
]);
const ATLANAN_ADLAR = new Set(['node_modules', '.git', 'build', 'dist', 'bin', 'obj']);

function hata(mesaj, kod = 1) {
  process.stderr.write(`${mesaj}\n`);
  process.exitCode = kod;
}

function girdiOku() {
  const argumanlar = process.argv.slice(2);
  const hedefArgumani = argumanlar.find((arguman) => !arguman.startsWith('-'));
  const hedefBayragi = argumanlar.indexOf('--target');
  if (hedefBayragi >= 0 && argumanlar[hedefBayragi + 1])
    return { target: argumanlar[hedefBayragi + 1] };
  if (hedefArgumani) return { target: hedefArgumani };
  if (process.stdin.isTTY) return {};
  try {
    const deger = fs.readFileSync(0, 'utf8').trim();
    return deger ? JSON.parse(deger) : {};
  } catch {
    throw new Error('stdin JSON okunamadı');
  }
}

function hedefCoz(deger) {
  if (typeof deger !== 'string' || deger.trim() === '') throw new Error('target gerekli');
  const mutlak = path.resolve(deger);
  const durum = fs.lstatSync(mutlak);
  if (durum.isSymbolicLink() || !durum.isDirectory())
    throw new Error('target gerçek bir klasör olmalı');
  return fs.realpathSync.native(mutlak);
}

function gizliMi(ad) {
  return ad.startsWith('.');
}

function tokenDosyasiMi(ad, uzanti) {
  if (!TOKEN_UZANTILARI.has(uzanti)) return false;
  return (
    /(^|[._-])(tokens?|theme|variables?)([._-]|$)/i.test(ad) || /(^|[/\\])tokens?([/\\])/i.test(ad)
  );
}

function dosyalariTopla(kok) {
  const dosyalar = [];
  function gez(klasor) {
    let girdiler = fs.readdirSync(klasor, { withFileTypes: true });
    girdiler = girdiler.sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.name.localeCompare(b.name)
    );
    for (const girdi of girdiler) {
      if (gizliMi(girdi.name) || ATLANAN_ADLAR.has(girdi.name)) continue;
      const mutlak = path.join(klasor, girdi.name);
      const durum = fs.lstatSync(mutlak);
      if (durum.isSymbolicLink()) continue;
      if (durum.isDirectory()) {
        gez(mutlak);
        continue;
      }
      if (!durum.isFile()) continue;
      const uzanti = path.extname(girdi.name).toLowerCase();
      if (!UI_UZANTILARI.has(uzanti) && !tokenDosyasiMi(girdi.name, uzanti)) continue;
      const gorece = path.relative(kok, mutlak).split(path.sep).join('/');
      dosyalar.push({ mutlak, gorece, kind: UI_UZANTILARI.has(uzanti) ? 'ui' : 'token' });
    }
  }
  gez(kok);
  return dosyalar.sort(
    (a, b) =>
      a.gorece.localeCompare(b.gorece, 'en', { sensitivity: 'base' }) ||
      a.gorece.localeCompare(b.gorece)
  );
}

function katalogKoku() {
  const adaylar = [
    path.resolve(__dirname, '..', 'skills', 'teknesyum-ui'),
    path.resolve(__dirname, '..', '..', 'skills', 'teknesyum-ui'),
  ];
  for (const aday of adaylar) {
    if (fs.existsSync(path.join(aday, 'SKILL.md'))) return aday;
  }
  throw new Error('teknesyum-ui katalogu bulunamadı');
}

function katalogOku() {
  const kok = katalogKoku();
  const yollar = ['SKILL.md'];
  const referanslar = path.join(kok, 'references');
  if (fs.existsSync(referanslar)) {
    for (const ad of fs.readdirSync(referanslar).sort((a, b) => a.localeCompare(b))) {
      const mutlak = path.join(referanslar, ad);
      if (fs.lstatSync(mutlak).isFile() && path.extname(ad).toLowerCase() === '.md')
        yollar.push(path.join('references', ad));
    }
  }
  const belgeler = yollar.map((gorece) => ({
    path: gorece.split(path.sep).join('/'),
    content: fs.readFileSync(path.join(kok, gorece), 'utf8'),
  }));
  const kurallar = [];
  for (const belge of belgeler) {
    const satirlar = belge.content.split(/\r?\n/);
    satirlar.forEach((satirMetni, sira) => {
      const eslesme = satirMetni.match(/^#{2,4}\s+(.+?)\s*$/);
      if (!eslesme) return;
      const baslik = eslesme[1].replace(/[`*_]/g, '').trim();
      const slug = baslik
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      kurallar.push({
        id: slug || `section-${kurallar.length + 1}`,
        title: baslik,
        source: belge.path,
        line: sira + 1,
      });
    });
  }
  kurallar.sort(
    (a, b) => a.source.localeCompare(b.source) || a.line - b.line || a.id.localeCompare(b.id)
  );
  const kaynak = belgeler.map((belge) => `${belge.path}\n${belge.content}`).join('\n');
  return {
    root: kok,
    documents: belgeler,
    rules: kurallar,
    digest: crypto.createHash('sha256').update(kaynak).digest('hex'),
  };
}

function kuralBul(katalog, terimler, yedek) {
  const bulunan = katalog.rules.find((kural) =>
    terimler.some((terim) => kural.title.toLowerCase().includes(terim))
  );
  if (bulunan) return bulunan.id;
  const bolum = katalog.rules.find((kural) => kural.id.startsWith(yedek));
  return bolum ? bolum.id : yedek;
}

function bulguYap(dosya, satir, kural, severity, oneri) {
  return { file: dosya, line: satir, rule: kural, severity, suggestion: oneri };
}

const PALET = new Set([
  '#00f3ff',
  '#ff00ea',
  '#b026ff',
  '#34d399',
  '#000000',
  '#0a0a0c',
  '#ffffff',
  '#71717a',
]);
const PUNTO = new Set([10, 13, 14, 18, 24]);
const BULGU_TAVANI = 200;
const BUYUK = '[A-ZÇĞİÖŞÜ]';
const BUYUK_HARF_DIZISI = new RegExp('(^|[^p{L}])' + BUYUK + '{3,}([^p{L}]|$)', 'u');
const GORUNEN_NITELIK =
  /\b(?:Content|Text|Header|ToolTip|title|label|placeholder|alt|aria-label)\s*=\s*["']([^"']+)["']/gi;
const RENK = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g;
const BEYAZ_ZEMIN =
  /\b(?:background|background-color|Background)\s*[:=]\s*["']?\s*(#fff(?:fff)?\b|white\b)/i;

function gorunenParcalar(satirMetni) {
  const cikti = [];
  for (const m of satirMetni.matchAll(/>([^<>{}]+)</g)) cikti.push(m[1]);
  for (const m of satirMetni.matchAll(GORUNEN_NITELIK)) cikti.push(m[1]);
  return cikti.filter((parca) => /\p{L}/u.test(parca));
}

function hexNormal(deger) {
  const v = deger.toLowerCase();
  if (!v.startsWith('#')) return v.replace(/\s+/g, '');
  if (v.length === 4) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  if (v.length === 9 && v.endsWith('ff')) return v.slice(0, 7);
  return v;
}

function paletDisi(deger) {
  const v = hexNormal(deger);
  if (v === 'transparent' || /^rgba?\([^)]*,\s*0\s*\)$/.test(v)) return false;
  if (v.startsWith('#')) return !PALET.has(v);
  return true;
}

function puntoBulgusu(satirMetni) {
  const cikti = [];
  for (const m of satirMetni.matchAll(/font-size\s*:\s*([\d.]+)px/gi)) cikti.push(Number(m[1]));
  for (const m of satirMetni.matchAll(/FontSize\s*=\s*"([\d.]+)"/g)) cikti.push(Number(m[1]));
  return cikti.filter((n) => Number.isFinite(n) && !PUNTO.has(n));
}

function denetle(dosya, metin, katalog) {
  const satirlar = metin.split(/\r?\n/);
  const bulgular = [];
  const harfKurali = kuralBul(katalog, ['uppercase', 'büyük harf'], 'text-case');
  const renkKurali = kuralBul(katalog, ['palet', 'palette', 'renk'], 'color-palette');
  const zeminKurali = kuralBul(katalog, ['zemin', 'ground', 'background'], 'color-palette');
  const puntoKurali = kuralBul(katalog, ['punto', 'tipografi', 'type scale'], 'typography');
  const hareketKurali = kuralBul(
    katalog,
    ['width', 'height', 'box-shadow', 'animasyonlanır'],
    'motion-properties'
  );
  satirlar.forEach((satirMetni, sira) => {
    const satir = sira + 1;
    // ÖLÇÜLDÜ: kural her satırdaki büyük harf dizisini yakalıyordu — sabit adı, HTTP,
    // sınıf adı, hepsi bulguydu ve çıktı okunmaz oluyordu. Kural görünen metne aittir:
    // JSX metin düğümü ve etiketli nitelik. Kodun kendi adlandırması bu kuralın dışı.
    if (gorunenParcalar(satirMetni).some((parca) => BUYUK_HARF_DIZISI.test(parca)))
      bulgular.push(bulguYap(dosya, satir, harfKurali, 'warning', ceviri('uiBuyukHarf')));
    if (BEYAZ_ZEMIN.test(satirMetni))
      bulgular.push(bulguYap(dosya, satir, zeminKurali, 'error', ceviri('uiZemin')));
    // ÖLÇÜLDÜ: üç gri sabiti aranıyordu; paletin dışındaki diğer bütün renkler sessizce
    // geçiyordu. Ölçüt listede olmak değil, palette olmaktır.
    else
      for (const m of satirMetni.match(RENK) || []) {
        if (!paletDisi(m)) continue;
        bulgular.push(bulguYap(dosya, satir, renkKurali, 'warning', ceviri('uiPalet')));
        break;
      }
    if (puntoBulgusu(satirMetni).length)
      bulgular.push(bulguYap(dosya, satir, puntoKurali, 'warning', ceviri('uiPunto')));
    if (
      /\b(?:transition|animation)\s*:[^;]*(?:width|height|top|left|margin|box-shadow|filter)\b/i.test(
        satirMetni
      )
    )
      bulgular.push(bulguYap(dosya, satir, hareketKurali, 'error', ceviri('uiHareket')));
  });
  return bulgular;
}

function tara(girdi) {
  const kok = hedefCoz(girdi.target || girdi.path);
  const katalog = katalogOku();
  const dosyalar = dosyalariTopla(kok);
  const bulgular = [];
  const kayitlar = [];
  for (const dosya of dosyalar) {
    const icerik = fs.readFileSync(dosya.mutlak);
    const metin = icerik.toString('utf8');
    kayitlar.push({
      file: dosya.gorece,
      kind: dosya.kind,
      digest: crypto.createHash('sha256').update(icerik).digest('hex'),
    });
    bulgular.push(...denetle(dosya.gorece, metin, katalog));
  }
  bulgular.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.rule.localeCompare(b.rule) ||
      a.severity.localeCompare(b.severity) ||
      a.suggestion.localeCompare(b.suggestion)
  );
  // ÖLÇÜLDÜ: tarama tüm kataloğu (60+ başlık) ve sınırsız bulguyu basıyordu; orta boy
  // bir araydüzde çıktı model bağlamının büyük bölümünü yiyordu. Tavanın üstü `truncated`
  // alanında sayı olarak durur; atlanan bulgu gizlenmez, sayılır.
  const kesilen = Math.max(0, bulgular.length - BULGU_TAVANI);
  const gosterilen = bulgular.slice(0, BULGU_TAVANI);
  const atif = new Set(gosterilen.map((f) => f.rule));
  const cikti = {
    target: kok,
    catalog: {
      digest: katalog.digest,
      rules: katalog.rules.filter((kural) => atif.has(kural.id)),
    },
    files: kayitlar,
    findings: gosterilen,
    truncated: kesilen,
  };
  const kanonik = JSON.stringify(cikti);
  cikti.digest = crypto.createHash('sha256').update(kanonik).digest('hex');
  return cikti;
}

try {
  process.stdout.write(`${JSON.stringify(tara(girdiOku()))}\n`);
} catch (error) {
  hata(error instanceof Error ? error.message : String(error));
}
