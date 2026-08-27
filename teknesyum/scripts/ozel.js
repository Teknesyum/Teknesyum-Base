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
const { execFileSync, spawnSync } = require('child_process');
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

// ÖLÇÜLDÜ (25.08.2026, dış denetim TB-007): `git(..., true)` her hatayı `null` yapıyordu
// ve `pusla` yalnız push'un sonucuna bakıyordu. Git kimliği yoksa commit sessizce
// başarısız oluyor, push "Everything up-to-date" dönüyor ve komut **"Push tamam."**
// yazıyordu — dosya depoya hiç gitmemişken. Aşama başına sonuç okunur.
function gitSonuc(klon, arg) {
  const r = spawnSync('git', ['-C', klon].concat(arg), {
    encoding: 'utf8',
    timeout: 120000,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    ok: !r.error && r.status === 0,
    status: r.status,
    stdout: String(r.stdout || ''),
    stderr: String(r.stderr || '') + (r.error ? String(r.error.message) : ''),
  };
}

// Ad depo içinde bir klasör adı olarak kullanılıyor (`path.join(klon, ad, ...)`).
// Politikadan geçmeyen ad reddedilir: `.` ve `..`, sürücü harfi, UNC, ayraç ve
// denetim karakteri klon dışına yazma sınıfı üretir.
const AD_POLITIKASI = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function adDenetle(ad) {
  if (!AD_POLITIKASI.test(String(ad)) || ad === '.' || ad === '..') {
    dur(
      'Proje adı kabul edilmedi: ' +
        JSON.stringify(ad) +
        '\nHarf ya da rakamla başlamalı; harf, rakam, nokta, alt çizgi ve tire içerebilir; en çok 64 karakter.'
    );
  }
  return ad;
}

// Çözülen yolun izinli kökün altında kaldığını kanıtlar. Metin karşılaştırması yetmez:
// symlink ve junction başka yere bakabilir, `realpath` ikisini de açar. Hedef henüz
// yoksa var olan en yakın üst dizin `realpath` ile açılır ve kalan parçalar üstüne
// eklenir — symlink'li bir üst dizin üzerinden kaçış hedef oluşmadan da yakalanır.
function enYakinGercek(p) {
  let yol = path.resolve(p);
  const kuyruk = [];
  for (;;) {
    try {
      const g = fs.realpathSync(yol);
      return kuyruk.length ? path.join.apply(path, [g].concat(kuyruk.reverse())) : g;
    } catch {
      const ust = path.dirname(yol);
      if (ust === yol)
        return kuyruk.length ? path.join.apply(path, [yol].concat(kuyruk.reverse())) : yol;
      kuyruk.push(path.basename(yol));
      yol = ust;
    }
  }
}

function icerideMi(hedef, kok) {
  const h = enYakinGercek(hedef);
  const k = enYakinGercek(kok);
  const bagil = path.relative(k, h);
  return (
    Boolean(bagil) &&
    bagil !== '..' &&
    !bagil.startsWith('..' + path.sep) &&
    !path.isAbsolute(bagil)
  );
}

// Manifest depodan gelir ve bozuk olabilir; alanları da ad politikası gibi kapıdan
// geçer. `kaynak` yalnız `~/` ya da `./` önekiyle kabul edilir — mutlak ve UNC yol
// izinli kök kavramının dışındadır. `ad` depo içi göreli yoldur: mutlak olamaz,
// ayracı `/`'dir, hiçbir parçası boş, `.` ya da `..` olamaz.
function manifestAlaniGecerli(d) {
  if (!d || typeof d.ad !== 'string' || typeof d.kaynak !== 'string') return false;
  if ([...(d.ad + d.kaynak)].some((c) => c.charCodeAt(0) < 32)) return false;
  if (!d.kaynak.startsWith('~/') && !d.kaynak.startsWith('./')) return false;
  if (d.ad.includes('\\') || path.isAbsolute(d.ad) || /^[A-Za-z]:/.test(d.ad)) return false;
  return d.ad.split('/').every((p) => p && p !== '.' && p !== '..');
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
    (k) =>
      (git(klon, ['ls-tree', '-d', '--name-only', 'HEAD', k], true) || '').trim() &&
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
      // `'İ'.toLowerCase()` `i` + birleşen nokta veriyor; NFD ayrıştırıp işareti atmazsak
      // ad `i-kinci` gibi bölünüyor (log.js'de ölçüldü).
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
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
  return m.dosyalar.map((girdi) => {
    const d = girdi && typeof girdi === 'object' ? girdi : {};
    const kaynak = typeof d.kaynak === 'string' ? d.kaynak : String(d.kaynak || '?');
    if (!manifestAlaniGecerli(d))
      return { ...d, kaynak, kaynakYol: null, depoYol: null, durum: 'disari', veri: null };
    const kaynakYol = coz(d.kaynak, kok);
    const depoYol = path.join(klon, ad, d.ad);
    const izinliKok = d.kaynak.startsWith('~/') ? evi() : kok;
    if (!icerideMi(depoYol, path.join(klon, ad)) || !icerideMi(kaynakYol, izinliKok))
      return { ...d, kaynak, kaynakYol, depoYol, durum: 'disari', veri: null };
    const s = oku(kaynakYol);
    const h = oku(depoYol);
    let durum = 'ayni';
    if (!s) durum = 'eksik';
    else if (!h) durum = 'yeni';
    else if (!ayni(s, h)) durum = 'degisti';
    return { ...d, kaynak, kaynakYol, depoYol, durum, veri: s };
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
    '  node <eklenti>/scripts/ozel.js kur <private-depo-url> [proje-adı]',
    '',
    'Depo yoksa önce aç:  gh repo create <ad> --private',
  ];
}

function kur(argv) {
  const url = argv[0];
  if (!url) dur('Depo adresi gerekli:  node <eklenti>/scripts/ozel.js kur <private-depo-url> [proje-adı]');
  const kok = projeKoku();
  const a = ayar() || {};
  a.depo = url;
  a.klon = klonYolu(a);
  const ad = adDenetle(argv[1] || projeAdi(a, kok));
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
  satir.push('Sıradaki:  node <eklenti>/scripts/ozel.js ekle ~/.claude/teknesyum.json   ·   node <eklenti>/scripts/ozel.js pusla');
  bas(satir);
}

function ekle(argv) {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  if (!argv.length) dur('Dosya yolu gerekli:  node <eklenti>/scripts/ozel.js ekle <yol> [yol...]');
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
    if (!kaynak.startsWith('~/') && !kaynak.startsWith('./')) {
      atlanan.push(
        kaynak + ' — proje ve ev dizininin dışında; ayna yalnız bu ikisinin altını taşır'
      );
      continue;
    }
    const tam = coz(kaynak, kok);
    if (!fs.existsSync(tam)) {
      atlanan.push(kaynak + ' — dosya yok');
      continue;
    }
    // Klasör kapıda reddedilir. `existsSync` klasör için de doğru döndüğü için kayıt
    // kabul ediliyor, `/ozel pusla` ise kopyalama anında "kaynak dosya bulunamadı" deyip
    // atlıyordu: kullanıcı klasörü yedeklenmiş sanıyordu (CodeXray, 24.08.2026).
    // Klasörü dosyalarına açmak da çözüm değil — liste donar, sonradan eklenen dosya
    // sessizce dışarıda kalır. Reddetmek tek dürüst davranıştır.
    if (fs.statSync(tam).isDirectory()) {
      atlanan.push(kaynak + ' — klasör; ayna dosya tutar, içindeki dosyaları tek tek ekle');
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
  satir.push('Kayıtlı dosya sayısı: ' + m.dosyalar.length + '  ·  aynaya yazmak için node <eklenti>/scripts/ozel.js pusla');
  bas(satir);
}

function cikar(argv) {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  if (!argv.length) dur('Dosya yolu gerekli:  node <eklenti>/scripts/ozel.js cikar <yol>');
  const kok = projeKoku();
  const ad = projeAdi(a, kok);
  const m = manifest(a, ad);
  const once = m.dosyalar.length;
  const hedef = argv.map((g) => kisalt(coz(g, kok), kok));
  m.dosyalar = m.dosyalar.filter((d) => !hedef.includes(d.kaynak));
  manifestYaz(a, ad, m);
  bas([
    'Kayıttan düşürüldü: ' + (once - m.dosyalar.length) + ' dosya',
    'Depodaki kopya duruyor; silmek için depoda elle sil ve node <eklenti>/scripts/ozel.js pusla.',
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
    satir.push('Kayıtlı dosya yok.  node <eklenti>/scripts/ozel.js ekle <yol>');
    return bas(satir);
  }
  const en = Math.max.apply(
    null,
    f.map((d) => d.kaynak.length)
  );
  const ISARET = {
    ayni: 'aynı',
    degisti: 'değişti',
    yeni: 'yeni',
    eksik: 'kaynak yok',
    disari: 'sınır dışı',
  };
  for (const d of f) satir.push('  ' + d.kaynak.padEnd(en) + '   ' + ISARET[d.durum]);
  const bekleyen = f.filter((d) => d.durum === 'degisti' || d.durum === 'yeni').length;
  satir.push('');
  satir.push(
    bekleyen ? bekleyen + ' dosya aynaya yazılmayı bekliyor — node <eklenti>/scripts/ozel.js pusla' : 'Ayna güncel.'
  );
  return bas(satir);
}

function projeler() {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  const klon = klonYolu(a);
  // `ls-tree` ağaçtan okur; dosya içeriği inmediği için bu liste depoyu çekmeden gelir.
  const c = git(klon, ['ls-tree', '-d', '--name-only', 'HEAD'], true);
  const hepsi = (c || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const inen = sparseListe(klon);
  if (!hepsi.length) return bas(['Depoda henüz proje klasörü yok.']);
  bas(
    ['Depodaki projeler (içerikleri inmedi, yalnız ağaç okundu):'].concat(
      hepsi.map((p) => '  ' + p + (inen.includes(p) ? '   ← bu makinede inen' : '')),
      ['', 'Başka bir projeyi de indirmek için:  node <eklenti>/scripts/ozel.js ac <ad>']
    )
  );
}

function ac(argv) {
  const a = ayar();
  if (!kuruluMu(a)) return bas(kurulumYonergesi());
  if (!argv.length) dur('Proje adı gerekli:  node <eklenti>/scripts/ozel.js ac <ad>');
  const klon = klonYolu(a);
  const mevcut = sparseListe(klon);
  for (const g of argv) if (!mevcut.includes(adDenetle(g))) mevcut.push(g);
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
  // Sonucu yok saymak bayat cache'i taze göstermekti: pull düşerse çekilen dosyalar
  // aynanın son hali değil, en son başarılı çekimin halidir. Uyarı yazılır, akış durmaz.
  const cekildi = gitSonuc(klon, ['pull', '--ff-only']);
  sparseAyarla(klon, sparseListe(klon));
  const m = manifest(a, ad);
  const yazilan = [];
  const korunan = [];
  const disari = [];
  for (const girdi of m.dosyalar) {
    const d = girdi && typeof girdi === 'object' ? girdi : {};
    const etiket = typeof d.kaynak === 'string' ? d.kaynak : String(d.kaynak || '?');
    // Manifest depodan gelir ve bozuk olabilir. `--zorla` ile birlikte sınırsız bir
    // `kaynak` alanı proje ve ev dışına yazma sınıfı üretir; alanlar politikadan
    // geçmiyorsa ya da çözülen uçlardan biri izinli kökün altında değilse dosya
    // yazılmaz, atlandığı söylenir.
    if (!manifestAlaniGecerli(d)) {
      disari.push(etiket);
      continue;
    }
    const kaynakYol = coz(d.kaynak, kok);
    const depoYol = path.join(klon, ad, d.ad);
    const izinliKok = d.kaynak.startsWith('~/') ? evi() : kok;
    if (!icerideMi(depoYol, path.join(klon, ad)) || !icerideMi(kaynakYol, izinliKok)) {
      disari.push(etiket);
      continue;
    }
    const veri = oku(depoYol);
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
  if (!cekildi.ok)
    satir.push(
      '  uyarı    uzaktan güncellenemedi, yerel kopya kullanıldı: ' + tekSatir(cekildi.stderr)
    );
  for (const y of yazilan) satir.push('  yazıldı  ' + y);
  for (const y of korunan)
    satir.push('  korundu  ' + y + '  — yereldeki farklı, üzerine yazılmadı');
  for (const y of disari)
    satir.push('  atlandı  ' + y + '  — hedef proje ve ev dizininin dışına düşüyor');
  if (korunan.length) satir.push('', 'Yereli aynadakiyle ezmek için:  node <eklenti>/scripts/ozel.js cek --zorla');
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
  const disari = f.filter((d) => d.durum === 'disari');
  if (!yazilacak.length) {
    if (argv.includes('--sessiz')) return;
    const satir = ['Özel ayna güncel — yazılacak değişiklik yok.'];
    for (const d of disari)
      satir.push('  atlandı  ' + d.kaynak + '  — izinli kökün dışına düşüyor, aynaya alınmadı');
    return bas(satir);
  }
  for (const d of yazilacak) {
    fs.mkdirSync(path.dirname(d.depoYol), { recursive: true });
    fs.writeFileSync(d.depoYol, d.veri);
  }
  manifestYaz(a, ad, manifest(a, ad));
  const satir = ['Özel aynaya yazıldı — ' + yazilacak.length + ' dosya'];
  for (const d of yazilacak) satir.push('  ' + d.durum.padEnd(8) + d.kaynak);
  for (const d of eksik) satir.push('  atlandı  ' + d.kaynak + '  — kaynak dosya bulunamadı');
  for (const d of disari)
    satir.push('  atlandı  ' + d.kaynak + '  — izinli kökün dışına düşüyor, aynaya alınmadı');
  const sonuc = gonder(klon, ad + ': ' + yazilacak.length + ' özel dosya güncellendi');
  bas(satir.concat(sonuc.satir));
  if (!sonuc.ok) process.exitCode = 1;
}

// Her aşama ayrı ayrı okunur ve başarı cümlesi ancak uzak dalın beklenen commit'i
// taşıdığı görüldükten sonra yazılır. "Değişiklik yok" ile gerçek commit hatası ayrı
// şeylerdir; ilki sessizce geçilir, ikincisi sebebiyle birlikte söylenir.
function gonder(klon, mesaj) {
  const ekle = gitSonuc(klon, ['add', '--all', '--']);
  if (!ekle.ok) return { ok: false, satir: ['Kaydedilemedi (git add): ' + tekSatir(ekle.stderr)] };

  const commit = gitSonuc(klon, ['commit', '-m', mesaj]);
  const degisiklikYok = /nothing to commit|working tree clean|no changes added/i.test(
    commit.stdout + commit.stderr
  );
  if (!commit.ok && !degisiklikYok)
    return { ok: false, satir: ['Commit açılamadı: ' + tekSatir(commit.stderr || commit.stdout)] };

  const sha = (gitSonuc(klon, ['rev-parse', 'HEAD']).stdout || '').trim();
  const dal = (gitSonuc(klon, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout || '').trim();
  if (!dal || dal === 'HEAD')
    return {
      ok: false,
      satir: [
        'Push yapılamadı: klon detached HEAD durumunda, gönderilecek dal yok.',
        '  git -C ' + klon + ' checkout main  ile düzeltip node <eklenti>/scripts/ozel.js pusla ile yeniden dene.',
      ],
    };
  const ustAkim = gitSonuc(klon, ['rev-parse', '--abbrev-ref', '@{upstream}']).ok;
  const push = ustAkim
    ? gitSonuc(klon, ['push'])
    : gitSonuc(klon, ['push', '--set-upstream', 'origin', dal]);
  if (!push.ok)
    return {
      ok: false,
      satir: ['Push başarısız: ' + tekSatir(push.stderr), 'node <eklenti>/scripts/ozel.js pusla ile yeniden dene.'],
    };

  // Push'un çıkış kodu 0 olması yetmez: commit hiç açılmamışsa "Everything up-to-date"
  // de 0 döner. Uzak ucun gerçekten bu commit'te olduğu sorulur.
  const uzak = gitSonuc(klon, ['rev-parse', 'origin/' + dal]);
  if (!uzak.ok || uzak.stdout.trim() !== sha)
    return {
      ok: false,
      satir: [
        'Push sonrası uzak uç beklenen commit’te değil — dosya depoya gitmemiş olabilir.',
        '  beklenen: ' +
          (sha.slice(0, 8) || '?') +
          '  ·  uzak: ' +
          (uzak.stdout.trim().slice(0, 8) || '?'),
      ],
    };
  return { ok: true, satir: ['Push tamam — ' + dal + ' @ ' + sha.slice(0, 8)] };
}

function tekSatir(s) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > 200 ? t.slice(0, 199) + '…' : t || 'sebep bildirilmedi';
}

function yardim() {
  bas([
    'Özel dosya aynası — kişisel dosyalar tek private depoda, projeye göre bölünmüş.',
    '',
    'Çağrı: node <eklenti>/scripts/ozel.js <altkomut>',
    '<eklenti> = ${CLAUDE_PLUGIN_ROOT}, çözülmezse ~/.claude/plugins/**/teknesyum.',
    '',
    '  (altkomutsuz)      durum: kayıtlı dosyalar, hangisi değişmiş',
    '  kur <url> [ad]     private depoyu kısmi klonla, bu projeyi bağla',
    '  ekle <yol>...      dosyayı aynaya kaydet (~/… ev, ./… proje kökü)',
    '  cikar <yol>...     kayıttan düşür (depodaki kopya durur)',
    '  pusla              değişenleri aynaya yaz, kaydet ve gönder',
    '  cek [--zorla]      aynadaki dosyaları diske geri yaz',
    '  projeler           depodaki bütün projeler (içerik indirmeden)',
    '  ac <ad>            başka bir projenin klasörünü de indir',
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
  dur('Bilinmeyen alt komut: ' + k + '  —  node <eklenti>/scripts/ozel.js yardim');
}

// Açılış bildirimi için tek soruluk durum. Ayna kurulu ve projeye bağlıyken kayıtlı
// dosya yoksa oturum "dokunulmaz dosyalar yedekli" sanıyordu; kimse bunu sormadığı için
// de sessizce öyle kalıyordu (CodeXray, 24.08.2026). Kanca içinden çağrılır: disk
// erişimi iki okumayla sınırlı, hata yutulur — açılış bildirimini hiçbir koşulda düşürmez.
function aynaDurumu(kok) {
  try {
    const a = ayar();
    if (!kuruluMu(a) || !kok) return null;
    const ad = projeAdi(a, kok);
    const m = manifest(a, ad);
    return { ad, sayi: ((m && m.dosyalar) || []).length };
  } catch {
    return null;
  }
}

module.exports = {
  coz,
  kisalt,
  hedefAdi,
  slug,
  fark,
  manifest,
  manifestYaz,
  ayarYolu,
  klonYolu,
  aynaDurumu,
};

if (require.main === module) main();
