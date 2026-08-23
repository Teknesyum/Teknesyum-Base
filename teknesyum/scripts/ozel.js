#!/usr/bin/env node

// Özel dosya aynası. Depoya giremeyen kişisel dosyalar (makine ayarları, kural defteri,
// anahtarsız yerel yapılandırma) tek bir private depoda toplanır; her proje o deponun
// kendi klasörünü kullanır.
//
// Deponun tamamı indirilmez. Klon `--filter=blob:none` ile açılır — ağaç gelir, dosya
// içerikleri yalnız istenen klasör için çekilir — ve `sparse-checkout` yalnız o projenin
// klasörünü diske serer. On projenin dosyası aynı depoda dursa da bu makineye inen tek
// klasör bu projenin klasörüdür.
//
// Depo yoksa hiçbir komut hata vermez: kurulmamış ayna sessiz aynadır. Eklentiyi kuran
// başka biri `/ozel` çalıştırdığında karşısına kurulum yönergesi çıkar, benim depom değil.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { konfigKok, read, yaz } = require('../hooks/ortak.js');

const SURUM = '1.0.0';
const MANIFEST = 'ozel.json';

function dur(mesaj) {
  process.stderr.write(mesaj + '\n');
  process.exit(1);
}

function bas(satir) {
  process.stdout.write(satir.join('\n') + '\n');
}

function ayarYolu() {
  return path.join(konfigKok(), 'teknesyum-ozel.json');
}

function ayar() {
  const a = read(ayarYolu());
  return a && typeof a === 'object' ? a : null;
}

function ayarYaz(a) {
  a.surum = SURUM;
  yaz(ayarYolu(), a);
}

function klonYolu(a) {
  return (a && a.klon) || path.join(konfigKok(), 'teknesyum-ozel');
}

function evi() {
  return os.homedir();
}

// Kaynak yolları makineden makineye taşınabilir olsun diye iki önekle saklanır:
// `~/` ev dizini, `./` proje kökü. Mutlak yol saklanmaz — bu makinede çalışır,
// ötekinde sessizce yanlış yeri gösterir.
function coz(kaynak, kok) {
  if (kaynak.startsWith('~/')) return path.join(evi(), kaynak.slice(2));
  if (kaynak.startsWith('./')) return path.join(kok, kaynak.slice(2));
  return path.resolve(kok, kaynak);
}

function kisalt(mutlak, kok) {
  const n = (p) => path.resolve(p).replace(/\\/g, '/');
  const y = n(mutlak);
  const e = n(evi());
  const k = n(kok);
  if (y.toLowerCase().startsWith(k.toLowerCase() + '/')) return './' + y.slice(k.length + 1);
  if (y.toLowerCase().startsWith(e.toLowerCase() + '/')) return '~/' + y.slice(e.length + 1);
  return y;
}

// Depo içi hedef addan türetilir: ev dosyaları `ev/` altına, proje dosyaları `proje/`
// altına. İki proje aynı `~/.claude/teknesyum.json` dosyasını kaydederse çakışma olmaz —
// her projenin kendi klasörü var.
function hedefAdi(kaynak) {
  if (kaynak.startsWith('~/')) return 'ev/' + kaynak.slice(2);
  if (kaynak.startsWith('./')) return 'proje/' + kaynak.slice(2);
  return 'mutlak/' + kaynak.replace(/^[A-Za-z]:[\\/]/, '').replace(/\\/g, '/');
}

function git(klon, arg, sessiz) {
  try {
    return execFileSync('git', ['-C', klon].concat(arg), {
      encoding: 'utf8',
      stdio: sessiz ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'pipe', 'inherit'],
      timeout: 120000,
      windowsHide: true,
    });
  } catch (e) {
    if (sessiz) return null;
    throw e;
  }
}

// ÖLÇÜLDÜ: Windows'ta `os.tmpdir()` 8.3 kısa yol (`C:\Users\TEKNES~1\…`), `git rev-parse`
// ise uzun yol döndürüyor. İkisi `path.resolve` ile de eşitlenmiyor; ayar dosyasındaki
// proje anahtarı hangi yoldan yazıldığına göre değişirse eşleşme kaçar ve proje adı
// sessizce klasör adına düşer. Her iki uç `realpath` ile tek biçime getirilir.
function gercekYol(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}

// ÖLÇÜLDÜ (23.08.2026): `sparse-checkout set` desenleri doğru yazıyor ama daha önce
// dışarıda bırakılmış bir klasörü diske geri sermiyor — indeks dosyayı "var" (`H`)
// sayarken çalışma ağacında yok. `reapply` düzeltiyor, ama `set` ile aynı saniyede
// koşulduğunda indeksin stat önbelleği yüzünden bir kez yetmiyor; ikinci `reapply`
// serdi. Körlemesine iki kez çağırmak yerine sonuç ölçülür: istenen klasör `HEAD`'de
// varken diskte yoksa `reapply` bir kez daha koşulur.
function sparseAyarla(klon, klasorler) {
  git(klon, ['sparse-checkout', 'set'].concat(klasorler), true);
  git(klon, ['sparse-checkout', 'reapply'], true);
  const eksik = klasorler.filter(
    (k) => (git(klon, ['ls-tree', '-d', '--name-only', 'HEAD', k], true) || '').trim() &&
      !fs.existsSync(path.join(klon, k))
  );
  if (eksik.length) git(klon, ['sparse-checkout', 'reapply'], true);
}

function sparseListe(klon) {
  return (git(klon, ['sparse-checkout', 'list'], true) || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function projeKoku() {
  try {
    return gercekYol(
      execFileSync('git', ['rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        timeout: 15000,
        windowsHide: true,
      }).trim()
    );
  } catch {
    return gercekYol(process.cwd());
  }
}

function slug(ad) {
  return (
    ad
      .toLowerCase()
      .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'proje'
  );
}

function projeAdi(a, kok) {
  const kayit = (a && a.projeler) || {};
  const hedef = gercekYol(kok).toLowerCase();
  for (const k of Object.keys(kayit)) if (gercekYol(k).toLowerCase() === hedef) return kayit[k];
  return slug(path.basename(kok));
}

function manifestYolu(a, ad) {
  return path.join(klonYolu(a), ad, MANIFEST);
}

function manifest(a, ad) {
  const m = read(manifestYolu(a, ad));
  if (m && Array.isArray(m.dosyalar)) return m;
  return { surum: SURUM, proje: ad, dosyalar: [] };
}

function manifestYaz(a, ad, m) {
  m.surum = SURUM;
  m.proje = ad;
  fs.mkdirSync(path.dirname(manifestYolu(a, ad)), { recursive: true });
  fs.writeFileSync(manifestYolu(a, ad), JSON.stringify(m, null, 2) + '\n');
}

function oku(yol) {
  try {
    return fs.readFileSync(yol);
  } catch {
    return null;
  }
}

function ayni(a, b) {
  return a && b && a.length === b.length && a.equals(b);
}

// Üç durum: `yeni` depoda yok, `degisti` iki taraf farklı, `ayni` fark yok, `eksik`
// kaynak dosya silinmiş. `eksik` push'ta atlanır — dosyayı silmek ayrı bir karardır,
// yanlışlıkla taşınmış bir dosya yüzünden yedeği düşürmeyiz.
function fark(a, ad, kok) {
  const m = manifest(a, ad);
  const klon = klonYolu(a);
  return m.dosyalar.map((d) => {
    const kaynakYol = coz(d.kaynak, kok);
    const depoYol = path.join(klon, ad, d.ad);
    const s = oku(kaynakYol);
    const h = oku(depoYol);
    let durum = 'ayni';
    if (!s) durum = 'eksik';
    else if (!h) durum = 'yeni';
    else if (!ayni(s, h)) durum = 'degisti';
    return { ...d, kaynakYol, depoYol, durum, veri: s };
  });
}

function kuruluMu(a) {
  if (!a || !a.depo) return false;
  try {
    return fs.existsSync(path.join(klonYolu(a), '.git'));
  } catch {
    return false;
  }
}

function kurulumYonergesi() {
  return [
    'Özel dosya aynası bu makinede kurulu değil.',
    '',
    'Kişisel dosyaların (makine ayarları, kural defteri, yerel yapılandırma) hepsini tek',
    'bir private depoda toplar. Depodan yalnız bu projenin klasörü iner, tamamı değil.',
    '',
    '  /ozel kur <private-depo-url> [proje-adı]',
    '',
    'Depo yoksa önce aç:  gh repo create <ad> --private',
  ];
}

function kur(argv) {
  const url = argv[0];
  if (!url) dur('Depo adresi gerekli:  /ozel kur <private-depo-url> [proje-adı]');
  const kok = projeKoku();
  const a = ayar() || {};
  a.depo = url;
  a.klon = klonYolu(a);
  const ad = argv[1] || projeAdi(a, kok);
  a.projeler = a.projeler || {};
  a.projeler[gercekYol(kok)] = ad;

  const klon = a.klon;
  const satir = [];
  if (!fs.existsSync(path.join(klon, '.git'))) {
    fs.mkdirSync(path.dirname(klon), { recursive: true });
    // `--filter=blob:none` dosya içeriklerini geride bırakır, `--sparse` çalışma
    // ağacını kök dosyalarla açar. İkisi birlikte "deponun tamamı çekilmesin" demektir.
    execFileSync('git', ['clone', '--filter=blob:none', '--sparse', url, klon], {
      stdio: 'inherit',
      timeout: 300000,
      windowsHide: true,
    });
    satir.push('Klon açıldı (kısmi): ' + klon);
  } else {
    satir.push('Klon zaten var: ' + klon);
  }
  git(klon, ['sparse-checkout', 'init', '--cone'], true);
  const mevcut = sparseListe(klon);
  if (!mevcut.includes(ad)) mevcut.push(ad);
  sparseAyarla(klon, mevcut);
  ayarYaz(a);
  satir.push('İnen klasör: ' + mevcut.join(', ') + '  (deponun kalanı diske serilmez)');
  satir.push('Bu proje: ' + ad);
  satir.push('');
  satir.push('Sıradaki:  /ozel ekle ~/.claude/teknesyum.json   ·   /ozel pusla');
  bas(satir);
}

function ekle(argv) {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  if (!argv.length) dur('Dosya yolu gerekli:  /ozel ekle <yol> [yol...]');
  const kok = projeKoku();
  const ad = projeAdi(a, kok);
  const m = manifest(a, ad);
  const eklenen = [];
  const atlanan = [];
  for (const g of argv) {
    const kaynak = kisalt(coz(g.replace(/^~/, '~/').replace(/^~\/\//, '~/'), kok), kok);
    if (m.dosyalar.some((d) => d.kaynak === kaynak)) {
      atlanan.push(kaynak + ' — zaten kayıtlı');
      continue;
    }
    if (!fs.existsSync(coz(kaynak, kok))) {
      atlanan.push(kaynak + ' — dosya yok');
      continue;
    }
    m.dosyalar.push({ kaynak, ad: hedefAdi(kaynak) });
    eklenen.push(kaynak);
  }
  m.dosyalar.sort((x, y) => x.kaynak.localeCompare(y.kaynak));
  manifestYaz(a, ad, m);
  const satir = [];
  if (eklenen.length) satir.push('Eklendi: ' + eklenen.join(', '));
  for (const s of atlanan) satir.push('Atlandı: ' + s);
  satir.push('Kayıtlı dosya sayısı: ' + m.dosyalar.length + '  ·  aynaya yazmak için /ozel pusla');
  bas(satir);
}

function cikar(argv) {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  if (!argv.length) dur('Dosya yolu gerekli:  /ozel cikar <yol>');
  const kok = projeKoku();
  const ad = projeAdi(a, kok);
  const m = manifest(a, ad);
  const once = m.dosyalar.length;
  const hedef = argv.map((g) => kisalt(coz(g, kok), kok));
  m.dosyalar = m.dosyalar.filter((d) => !hedef.includes(d.kaynak));
  manifestYaz(a, ad, m);
  bas([
    'Kayıttan düşürüldü: ' + (once - m.dosyalar.length) + ' dosya',
    'Depodaki kopya duruyor; silmek için depoda elle sil ve /ozel pusla.',
  ]);
}

function durum() {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  const kok = projeKoku();
  const ad = projeAdi(a, kok);
  const f = fark(a, ad, kok);
  const satir = ['Özel ayna · ' + ad, 'depo: ' + a.depo, 'klon: ' + klonYolu(a) + '  (kısmi)'];
  satir.push('inen klasörler: ' + sparseListe(klonYolu(a)).join(', '));
  satir.push('');
  if (!f.length) {
    satir.push('Kayıtlı dosya yok.  /ozel ekle <yol>');
    return bas(satir);
  }
  const en = Math.max.apply(null, f.map((d) => d.kaynak.length));
  const ISARET = { ayni: 'aynı', degisti: 'değişti', yeni: 'yeni', eksik: 'kaynak yok' };
  for (const d of f) satir.push('  ' + d.kaynak.padEnd(en) + '   ' + ISARET[d.durum]);
  const bekleyen = f.filter((d) => d.durum === 'degisti' || d.durum === 'yeni').length;
  satir.push('');
  satir.push(
    bekleyen ? bekleyen + ' dosya aynaya yazılmayı bekliyor — /ozel pusla' : 'Ayna güncel.'
  );
  return bas(satir);
}

function projeler() {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  const klon = klonYolu(a);
  // `ls-tree` ağaçtan okur; dosya içeriği inmediği için bu liste depoyu çekmeden gelir.
  const c = git(klon, ['ls-tree', '-d', '--name-only', 'HEAD'], true);
  const hepsi = (c || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const inen = sparseListe(klon);
  if (!hepsi.length) return bas(['Depoda henüz proje klasörü yok.']);
  bas(
    ['Depodaki projeler (içerikleri inmedi, yalnız ağaç okundu):'].concat(
      hepsi.map((p) => '  ' + p + (inen.includes(p) ? '   ← bu makinede inen' : '')),
      ['', 'Başka bir projeyi de indirmek için:  /ozel ac <ad>']
    )
  );
}

function ac(argv) {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  if (!argv.length) dur('Proje adı gerekli:  /ozel ac <ad>');
  const klon = klonYolu(a);
  const mevcut = sparseListe(klon);
  for (const g of argv) if (!mevcut.includes(g)) mevcut.push(g);
  sparseAyarla(klon, mevcut);
  bas(['İnen klasörler: ' + mevcut.join(', ')]);
}

// Depodan diske. Kaynak dosya varsa üzerine yazılmaz — `--zorla` denmedikçe. Yedekten
// geri yükleme yıkıcı bir iştir, sessizce yapılmaz.
function cek(argv) {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  const zorla = argv.includes('--zorla') || argv.includes('zorla');
  const kok = projeKoku();
  const ad = projeAdi(a, kok);
  const klon = klonYolu(a);
  git(klon, ['pull', '--ff-only'], true);
  sparseAyarla(klon, sparseListe(klon));
  const m = manifest(a, ad);
  const yazilan = [];
  const korunan = [];
  for (const d of m.dosyalar) {
    const kaynakYol = coz(d.kaynak, kok);
    const veri = oku(path.join(klon, ad, d.ad));
    if (!veri) continue;
    if (fs.existsSync(kaynakYol) && !zorla) {
      if (!ayni(oku(kaynakYol), veri)) korunan.push(d.kaynak);
      continue;
    }
    fs.mkdirSync(path.dirname(kaynakYol), { recursive: true });
    fs.writeFileSync(kaynakYol, veri);
    yazilan.push(d.kaynak);
  }
  const satir = ['Aynadan çekildi: ' + yazilan.length + ' dosya'];
  for (const y of yazilan) satir.push('  yazıldı  ' + y);
  for (const y of korunan) satir.push('  korundu  ' + y + '  — yereldeki farklı, üzerine yazılmadı');
  if (korunan.length) satir.push('', 'Yereli aynadakiyle ezmek için:  /ozel cek --zorla');
  bas(satir);
}

// Diskten depoya. Değişen dosya yoksa commit açılmaz ve çıkış kodu yine 0'dır — `puşla`
// akışının içinden çağrıldığında sessiz kalması gerekir.
function pusla(argv) {
  const a = ayar();
  if (!kuruluMu(a)) {
    if (argv.includes('--sessiz')) return;
    return bas(kurulumYonergesi());
  }
  const kok = projeKoku();
  const ad = projeAdi(a, kok);
  const klon = klonYolu(a);
  const f = fark(a, ad, kok);
  const yazilacak = f.filter((d) => d.durum === 'degisti' || d.durum === 'yeni');
  const eksik = f.filter((d) => d.durum === 'eksik');
  if (!yazilacak.length) {
    if (argv.includes('--sessiz')) return;
    return bas(['Özel ayna güncel — yazılacak değişiklik yok.']);
  }
  for (const d of yazilacak) {
    fs.mkdirSync(path.dirname(d.depoYol), { recursive: true });
    fs.writeFileSync(d.depoYol, d.veri);
  }
  manifestYaz(a, ad, manifest(a, ad));
  git(klon, ['add', '--', ad], true);
  const mesaj = ad + ': ' + yazilacak.length + ' özel dosya güncellendi';
  git(klon, ['commit', '-m', mesaj], true);
  const p = git(klon, ['push'], true);
  const satir = ['Özel aynaya yazıldı — ' + yazilacak.length + ' dosya'];
  for (const d of yazilacak) satir.push('  ' + d.durum.padEnd(8) + d.kaynak);
  for (const d of eksik) satir.push('  atlandı  ' + d.kaynak + '  — kaynak dosya bulunamadı');
  satir.push(p === null ? 'Push başarısız — /ozel pusla ile yeniden dene.' : 'Push tamam.');
  bas(satir);
}

function yardim() {
  bas([
    'Özel dosya aynası — kişisel dosyalar tek private depoda, projeye göre bölünmüş.',
    '',
    '  /ozel                     durum: kayıtlı dosyalar, hangisi değişmiş',
    '  /ozel kur <url> [ad]      private depoyu kısmi klonla, bu projeyi bağla',
    '  /ozel ekle <yol>...       dosyayı aynaya kaydet (~/… ev, ./… proje kökü)',
    '  /ozel cikar <yol>...      kayıttan düşür (depodaki kopya durur)',
    '  /ozel pusla               değişenleri aynaya yaz, kaydet ve gönder',
    '  /ozel cek [--zorla]       aynadaki dosyaları diske geri yaz',
    '  /ozel projeler            depodaki bütün projeler (içerik indirmeden)',
    '  /ozel ac <ad>             başka bir projenin klasörünü de indir',
    '',
    'Deponun tamamı hiçbir zaman çekilmez: klon `--filter=blob:none`, çalışma ağacı',
    '`sparse-checkout` ile yalnız bağlı projelerin klasörüne açılır.',
  ]);
}

function main() {
  const argv = process.argv.slice(2).filter(Boolean);
  const k = (argv[0] || '').toLowerCase();
  const kalan = argv.slice(1);
  if (!k || k === 'durum' || k === 'status') return durum();
  if (k === 'yardim' || k === 'help') return yardim();
  if (k === 'kur' || k === 'init') return kur(kalan);
  if (k === 'ekle' || k === 'add') return ekle(kalan);
  if (k === 'cikar' || k === 'remove') return cikar(kalan);
  if (k === 'pusla' || k === 'push') return pusla(kalan);
  if (k === 'cek' || k === 'pull') return cek(kalan);
  if (k === 'projeler' || k === 'projects') return projeler();
  if (k === 'ac' || k === 'open') return ac(kalan);
  dur('Bilinmeyen alt komut: ' + k + '  —  /ozel yardim');
}

module.exports = { coz, kisalt, hedefAdi, slug, fark, manifest, manifestYaz, ayarYolu, klonYolu };

if (require.main === module) main();
