#!/usr/bin/env node

// Açık hata günlükleri. Bir işlev düzgün çalışmıyorsa, onu gören oturum bir günlük bırakır;
// Teknesyum Base'i açan oturum o günlüğü okuyup çözer.
//
// İki yer var ve ikisi de bilerek ayrı:
//   makara  `~/.claude/teknesyum/openlogs/`  — herhangi bir projedeki oturum buraya yazar
//   depo    `<base>/docs/openlogs/`          — üstünde çalışılan, sürüm kontrolündeki günlük
//
// Makara makine genelindedir; başka bir projedeki oturumun Teknesyum Base'in nerede
// durduğunu bilmesi gerekmez, bilmesi gerekseydi yol bulunamadığında günlük hiç yazılmazdı.
// Günlük ele alınırken `al` ile depoya taşınır ve oradan sürüm kontrolüne girer.
//
// Kapanış iki türlüdür: sorun tamamen gittiyse `kapat` siler, ileride lazım olacak bir
// ölçüm ya da karar taşıyorsa `arsivle` `docs/openlogs/kapali/` altına taşır.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { konfigKok } = require('../hooks/ortak.js');

const SURUM = '1.0.0';
const ONEK = 'HATA-';

function dur(mesaj) {
  process.stderr.write(mesaj + '\n');
  process.exit(1);
}

function bas(satir) {
  process.stdout.write(satir.join('\n') + '\n');
}

function makaraKoku() {
  return path.join(konfigKok(), 'teknesyum', 'openlogs');
}

// Depo kökü üç yerden aranır. Bulunamazsa günlük makarada kalır — kaybolmaz, yalnız
// sürüm kontrolüne girmez ve `durum` bunu söyler.
function depoKoku() {
  const aday = [];
  if (process.env.TEKNESYUM_BASE) aday.push(process.env.TEKNESYUM_BASE);
  try {
    const a = JSON.parse(fs.readFileSync(path.join(konfigKok(), 'teknesyum-ozel.json'), 'utf8'));
    for (const [yol, ad] of Object.entries(a.projeler || {}))
      if (String(ad).includes('teknesyum-base')) aday.push(yol);
  } catch {}
  try {
    aday.push(
      execFileSync('git', ['rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        timeout: 15000,
        windowsHide: true,
      }).trim()
    );
  } catch {}
  for (const y of aday) {
    try {
      if (y && fs.existsSync(path.join(y, 'teknesyum', '.claude-plugin', 'plugin.json'))) return y;
    } catch {}
  }
  return null;
}

function depoDizini() {
  const k = depoKoku();
  return k ? path.join(k, 'docs', 'openlogs') : null;
}

function arsivDizini() {
  const d = depoDizini();
  return d ? path.join(d, 'kapali') : null;
}

// ÖLÇÜLDÜ: `'İkinci'.toLowerCase()` `i` + birleşen nokta (U+0307) veriyor, tek `i` değil.
// Nokta harf sayılmadığı için ad `i-kinci` çıkıyor ve `/log kapat ikinci` hiçbir şeyle
// eşleşmiyordu. NFD ayrıştırıp birleşen işaretleri atmak bunu ve aksanlı bütün harfleri
// tek seferde çözüyor.
function slug(metin) {
  return (
    String(metin)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'kayit'
  );
}

function dosyalar(dizin, kaynak) {
  let liste = [];
  try {
    liste = fs.readdirSync(dizin);
  } catch {
    return [];
  }
  return liste
    .filter((f) => f.startsWith(ONEK) && f.endsWith('.md'))
    .map((f) => {
      const yol = path.join(dizin, f);
      let st = null;
      try {
        st = fs.statSync(yol);
      } catch {}
      return {
        id: f.slice(ONEK.length, -3),
        dosya: f,
        yol,
        kaynak,
        ms: st ? st.mtimeMs : 0,
        baslik: baslikOku(yol),
      };
    })
    .sort((a, b) => b.ms - a.ms);
}

function baslikOku(yol) {
  try {
    const ilk = fs.readFileSync(yol, 'utf8').split(/\r?\n/).find((s) => s.startsWith('# '));
    return ilk ? ilk.slice(2).trim() : '';
  } catch {
    return '';
  }
}

function hepsi() {
  const d = depoDizini();
  return dosyalar(makaraKoku(), 'makara').concat(d ? dosyalar(d, 'depo') : []);
}

// Kısmi ad yeter; iki günlük birden eşleşirse hangi ikisi olduğu söylenip durulur.
function bul(id) {
  if (!id) dur('Günlük adı gerekli:  /log oku <ad>');
  const h = hepsi();
  const tam = h.filter((g) => g.id === id);
  const kismi = tam.length ? tam : h.filter((g) => g.id.includes(id));
  if (!kismi.length) dur('Böyle bir günlük yok: ' + id + '  —  /log ile listeye bak');
  if (kismi.length > 1)
    dur('Birden çok günlük eşleşti: ' + kismi.map((g) => g.id).join(', ') + '  — adı tam yaz');
  return kismi[0];
}

function gun(ms) {
  if (!ms) return '';
  const g = Math.floor((Date.now() - ms) / 86400000);
  return g <= 0 ? 'bugün' : g + ' gün önce';
}

function durum() {
  const h = hepsi();
  const d = depoDizini();
  const satir = [];
  if (!h.length) {
    satir.push('Açık günlük yok.');
    satir.push('makara: ' + makaraKoku());
    satir.push('depo:   ' + (d || 'bulunamadı — günlükler makarada kalır'));
    return bas(satir);
  }
  satir.push(h.length + ' açık günlük:');
  satir.push('');
  const en = Math.max.apply(null, h.map((g) => g.id.length));
  for (const g of h)
    satir.push(
      '  ' + g.id.padEnd(en) + '  ' + g.kaynak.padEnd(7) + gun(g.ms).padEnd(12) + g.baslik
    );
  satir.push('');
  satir.push('Oku: /log oku <ad>  ·  Depoya taşı: /log al <ad>');
  satir.push('Bitince: /log kapat <ad>  (sorun tamamen gitti)  ya da  /log arsivle <ad>');
  if (!d) satir.push('Depo kökü bulunamadı; günlükler makarada duruyor, kaybolmadı.');
  bas(satir);
}

function oku(argv) {
  const g = bul(argv[0]);
  process.stdout.write(fs.readFileSync(g.yol, 'utf8'));
  process.stdout.write('\n--- ' + g.kaynak + ' · ' + g.yol + '\n');
}

function bayrak(argv, ad) {
  const i = argv.indexOf('--' + ad);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : '';
}

// Başka projedeki oturum bunu çağırır. Depo yolunu bilmesi gerekmez; makaraya yazar.
function yaz(argv) {
  const baslik = bayrak(argv, 'baslik');
  if (!baslik) dur('Başlık gerekli:  /log yaz --baslik "..." --belirti "..." --kaynak "..."');
  const belirti = bayrak(argv, 'belirti');
  const kaynak = bayrak(argv, 'kaynak');
  const proje = bayrak(argv, 'proje') || path.basename(process.cwd());
  const dizin = makaraKoku();
  fs.mkdirSync(dizin, { recursive: true });
  const yol = path.join(dizin, ONEK + slug(baslik) + '.md');
  if (fs.existsSync(yol))
    return bas(['Bu başlıkta günlük zaten var, üzerine yazılmadı: ' + yol]);
  const govde = [
    '# Hata: ' + baslik,
    '',
    '**Durum:** açık.',
    '**Belirti:** ' + (belirti || '(yazılmadı)'),
    '**Kaynak:** ' + (kaynak || '(bilinmiyor)'),
    '**Görüldüğü proje:** ' + proje,
    '',
    '---',
    '',
    '## 1. Ne oldu',
    '',
    '(Bu bölümü günlüğü yazan oturum doldurur: ne yapıldı, ne bekleniyordu, ne oldu.',
    'Tekrar üretme adımları ve varsa ölçüm buraya.)',
    '',
    '## 2. Ölçü',
    '',
    '(Bu hatanın kapandığını gösteren tek şey ne? Yazılmazsa günlük kapatılamaz.)',
    '',
  ].join('\n');
  fs.writeFileSync(yol, govde);
  bas([
    'Günlük açıldı: ' + yol,
    'Teknesyum Base açıldığında `/log` bunu listeler ve çözülür.',
    'Gövdeyi şimdi doldur — boş günlük çözülemez.',
  ]);
}

function al(argv) {
  const g = bul(argv[0]);
  const d = depoDizini();
  if (!d) dur('Depo kökü bulunamadı; `al` yalnız Teknesyum Base deposu içinden çalışır');
  if (g.kaynak === 'depo') return bas(['Zaten depoda: ' + g.yol]);
  fs.mkdirSync(d, { recursive: true });
  const hedef = path.join(d, g.dosya);
  fs.renameSync(g.yol, hedef);
  bas(['Depoya taşındı: ' + hedef, 'Artık sürüm kontrolünde; çözülünce /log kapat ya da /log arsivle.']);
}

function kapat(argv) {
  const g = bul(argv[0]);
  fs.unlinkSync(g.yol);
  bas([
    'Silindi: ' + g.dosya,
    'Sorun tamamen gitmediyse bunun yerine /log arsivle kullanılmalıydı.',
  ]);
}

function arsivle(argv) {
  const g = bul(argv[0]);
  const a = arsivDizini();
  if (!a) dur('Arşiv dizini yok; önce /log al ile günlüğü depoya taşı');
  fs.mkdirSync(a, { recursive: true });
  const hedef = path.join(a, g.dosya);
  fs.renameSync(g.yol, hedef);
  bas(['Arşivlendi: ' + hedef, 'Açık listeden düştü, içeriği duruyor.']);
}

function sayi() {
  process.stdout.write(String(hepsi().length) + '\n');
}

function yardim() {
  bas([
    'Açık hata günlükleri — bozuk işlev görüldüğü yerde yazılır, Teknesyum Base\'de çözülür.',
    '',
    '  /log                      açık günlükleri listele',
    '  /log oku <ad>             bir günlüğü tam oku',
    '  /log al <ad>              makaradaki günlüğü depoya taşı (sürüm kontrolüne girer)',
    '  /log kapat <ad>           sil — sorun tamamen gitti, saklanacak bir şey yok',
    '  /log arsivle <ad>         docs/openlogs/kapali/ altına taşı — ölçüm/karar saklanacak',
    '  /log yaz --baslik "..." --belirti "..." --kaynak "..."',
    '                            başka bir projeden günlük bırak',
    '',
    'makara: ' + makaraKoku(),
    'depo:   ' + (depoDizini() || 'bulunamadı'),
  ]);
}

function main() {
  const argv = process.argv.slice(2).filter(Boolean);
  const k = (argv[0] || '').toLowerCase();
  const kalan = argv.slice(1);
  if (!k || k === 'durum' || k === 'status') return durum();
  if (k === 'yardim' || k === 'help') return yardim();
  if (k === 'oku' || k === 'read') return oku(kalan);
  if (k === 'yaz' || k === 'write') return yaz(kalan);
  if (k === 'al' || k === 'take') return al(kalan);
  if (k === 'kapat' || k === 'close') return kapat(kalan);
  if (k === 'arsivle' || k === 'archive') return arsivle(kalan);
  if (k === 'sayi' || k === 'count') return sayi();
  dur('Bilinmeyen alt komut: ' + k + '  —  /log yardim');
}

module.exports = { SURUM, ONEK, makaraKoku, depoKoku, depoDizini, arsivDizini, hepsi, slug };

if (require.main === module) main();
