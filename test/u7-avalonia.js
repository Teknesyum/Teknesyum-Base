// U7 — Avalonia sablonu (Theme.axaml, Signature.axaml, references/avalonia.md).
//
// BU TEST GERCEK RENDER OLCMEZ. Node'dan Avalonia calistirilamaz; asagidaki hicbir
// madde "ekranda dogru gorunuyor" demez. Olculen sey metnin kendisidir: XML iyi
// bicimli mi, token adlari ve renk degerleri WPF surumuyle ayni mi, WPF'e ozgu
// artiklar kalmis mi, kullanilan her kaynak tanimli mi. Gorsel dogrulama ve sablonun
// gercekten derlendigi hala elle yapilir (references/avalonia.md, olcum notu).
//
// Tek basina kosar:  node test/u7-avalonia.js

const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const ASSETS = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui', 'assets');
const REFS = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui', 'references');

const YOL = {
  wpf: path.join(ASSETS, 'Theme.xaml'),
  tema: path.join(ASSETS, 'Theme.axaml'),
  imza: path.join(ASSETS, 'Signature.axaml'),
  belge: path.join(REFS, 'avalonia.md'),
};

// AppBgDonus'un Avalonia'da kaynak karsiligi yok: Animation bir kaynak olarak durup
// bir yere atanamaz ve gradient EndPoint'ini enterpole edecek animator bulunmuyor.
// Karsiligi "Window.anim Panel.appbg" kuralidir (avalonia.md §2, §5).
const KAYNAK_KARSILIGI_YOK = ['AppBgDonus'];

// Azaltilmis hareket ikamesinin sinif adi. Hem sablonda hem belgede gecmeli.
const HAREKET_SINIFI = 'anim';

let gecti = 0;
const kaldi = [];

function ol(ad, f) {
  try {
    f();
    gecti++;
    console.log('  ✓ ' + ad);
  } catch (e) {
    kaldi.push(ad);
    console.log('  ⨯ ' + ad + '\n      ' + e.message);
  }
}

function dogru(kosul, mesaj) {
  if (!kosul) throw new Error(mesaj);
}

// --- kucuk el yazmasi XML okuyucu -------------------------------------------
// Regex degil: yorum icerigi, tirnak icindeki isaretler ve kendinden kapanan
// etiketler regex'le guvenilir ayrilmiyor. Dondurdugu iki sey var:
//   ogeler  : {ad, oz, metin} listesi
//   yorumsuz: yorumlari bosluga cevrilmis kaynak (yasak dizgi taramasi icin)

function xmlOku(kaynak, dosyaAdi) {
  const ogeler = [];
  const yigin = [];
  let yorumsuz = '';
  let kok = 0;
  let i = 0;
  const n = kaynak.length;

  const satir = (k) => kaynak.slice(0, k).split('\n').length;
  const hata = (k, m) => {
    throw new Error(dosyaAdi + ':' + satir(k) + ' — ' + m);
  };

  while (i < n) {
    const ac = kaynak.indexOf('<', i);
    if (ac === -1) {
      const kalan = kaynak.slice(i);
      if (yigin.length) yigin[yigin.length - 1].metin += kalan;
      yorumsuz += kalan;
      break;
    }
    const metin = kaynak.slice(i, ac);
    if (yigin.length) yigin[yigin.length - 1].metin += metin;
    else if (metin.trim()) hata(i, 'kok disinda metin: ' + JSON.stringify(metin.trim()));
    yorumsuz += metin;

    // yorum
    if (kaynak.startsWith('<!--', ac)) {
      const kapa = kaynak.indexOf('-->', ac + 4);
      if (kapa === -1) hata(ac, 'kapanmamis yorum');
      const icerik = kaynak.slice(ac + 4, kapa);
      if (icerik.includes('--')) hata(ac, 'yorum icinde cift tire var, XML bunu kabul etmez');
      // yorumu ayni satir sayisini koruyacak sekilde bosluga cevir
      yorumsuz += kaynak.slice(ac, kapa + 3).replace(/[^\n]/g, ' ');
      i = kapa + 3;
      continue;
    }
    // islem yonergesi ve DOCTYPE
    if (kaynak.startsWith('<?', ac)) {
      const kapa = kaynak.indexOf('?>', ac + 2);
      if (kapa === -1) hata(ac, 'kapanmamis islem yonergesi');
      yorumsuz += kaynak.slice(ac, kapa + 2);
      i = kapa + 2;
      continue;
    }
    // kapanis etiketi
    if (kaynak.startsWith('</', ac)) {
      const kapa = kaynak.indexOf('>', ac);
      if (kapa === -1) hata(ac, 'kapanmamis kapanis etiketi');
      const ad = kaynak.slice(ac + 2, kapa).trim();
      const ust = yigin.pop();
      if (!ust) hata(ac, 'fazladan kapanis: </' + ad + '>');
      if (ust.ad !== ad) hata(ac, '<' + ust.ad + '> yerine </' + ad + '> ile kapatilmis');
      yorumsuz += kaynak.slice(ac, kapa + 1);
      i = kapa + 1;
      continue;
    }

    // acilis etiketi: tirnaklari sayarak sonunu bul
    let j = ac + 1;
    let tirnak = null;
    while (j < n) {
      const c = kaynak[j];
      if (tirnak) {
        if (c === tirnak) tirnak = null;
      } else if (c === '"' || c === "'") tirnak = c;
      else if (c === '>') break;
      j++;
    }
    if (j >= n) hata(ac, 'kapanmamis etiket');
    const govde = kaynak.slice(ac + 1, j);
    const kendindenKapanir = govde.trimEnd().endsWith('/');
    const temiz = kendindenKapanir ? govde.trimEnd().slice(0, -1) : govde;

    const adEsl = /^[\s]*([A-Za-z_][\w.:-]*)/.exec(temiz);
    if (!adEsl) hata(ac, 'etiket adi okunamadi');
    const ad = adEsl[1];

    // ozellikler
    const oz = {};
    const ozRe = /([A-Za-z_][\w.:-]*)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m;
    let kalan = temiz.slice(adEsl[0].length);
    while ((m = ozRe.exec(kalan)) !== null) {
      const ozAd = m[1];
      if (Object.prototype.hasOwnProperty.call(oz, ozAd)) hata(ac, 'ayni ozellik iki kez: ' + ozAd);
      oz[ozAd] = m[3] !== undefined ? m[3] : m[4];
    }
    // ozellik gibi gorunmeyen artik kaldi mi
    const artik = kalan.replace(ozRe, '').trim();
    if (artik) hata(ac, 'cozulemeyen ozellik metni: ' + JSON.stringify(artik));

    if (yigin.length === 0) {
      kok++;
      if (kok > 1) hata(ac, 'ikinci kok eleman: <' + ad + '>');
    }
    const oge = { ad, oz, metin: '' };
    ogeler.push(oge);
    if (!kendindenKapanir) yigin.push(oge);

    yorumsuz += kaynak.slice(ac, j + 1);
    i = j + 1;
  }

  if (yigin.length)
    throw new Error(dosyaAdi + ' — kapanmamis eleman: <' + yigin[yigin.length - 1].ad + '>');
  if (kok !== 1) throw new Error(dosyaAdi + ' — kok eleman sayisi ' + kok + ', 1 olmali');

  return { ogeler, yorumsuz };
}

// --- yardimcilar -------------------------------------------------------------

function anahtarlar(ogeler) {
  const h = new Map();
  for (const o of ogeler) {
    const k = o.oz['x:Key'];
    if (!k) continue;
    // {x:Static ...} gibi anahtar nesneleri duz ad degildir, kiyaslamaya girmez
    if (k.trim().startsWith('{')) continue;
    h.set(k, o);
  }
  return h;
}

function renkDegeri(oge) {
  if (oge.ad === 'Color') return oge.metin.trim().toUpperCase();
  if (oge.oz.Color && !oge.oz.Color.trim().startsWith('{'))
    return oge.oz.Color.trim().toUpperCase();
  return null;
}

function gradientDuraklari(kaynak, anahtar) {
  // AppBgGradient'in duraklarini sirayla topla: <GradientStop Offset= Color=>
  const ogeler = kaynak.ogeler;
  const bas = ogeler.findIndex((o) => o.oz['x:Key'] === anahtar);
  if (bas === -1) throw new Error(anahtar + ' bulunamadi');
  const out = [];
  for (let i = bas + 1; i < ogeler.length; i++) {
    if (ogeler[i].ad !== 'GradientStop') break;
    out.push(
      Number(ogeler[i].oz.Offset).toFixed(2) + '@' + ogeler[i].oz.Color.trim().toUpperCase()
    );
  }
  return out;
}

function staticResourceAdlari(yorumsuz) {
  const out = new Set();
  const re = /\{\s*StaticResource\s+([^}\s]+)\s*\}/g;
  let m;
  while ((m = re.exec(yorumsuz)) !== null) out.add(m[1]);
  return out;
}

// --- testler -----------------------------------------------------------------

console.log('U7 — Avalonia sablonu (gercek render olculmedi)\n');

const metin = {};
for (const [ad, p] of Object.entries(YOL)) {
  if (!fs.existsSync(p)) {
    console.log('  ⨯ dosya yok: ' + p);
    process.exit(1);
  }
  metin[ad] = fs.readFileSync(p, 'utf8');
}

let wpf = null;
let tema = null;
let imza = null;

// 1 — iyi bicimli XML
ol('1 · Theme.axaml iyi bicimli XML', () => {
  tema = xmlOku(metin.tema, 'Theme.axaml');
});
ol('1 · Signature.axaml iyi bicimli XML', () => {
  imza = xmlOku(metin.imza, 'Signature.axaml');
});
ol('1 · Theme.xaml (kaynak) iyi bicimli XML', () => {
  wpf = xmlOku(metin.wpf, 'Theme.xaml');
});

// 2 — token adlari birebir
ol('2 · WPF anahtarlarinin hepsi Avalonia surumunde var', () => {
  const a = anahtarlar(wpf.ogeler);
  const b = anahtarlar(tema.ogeler);
  const eksik = [...a.keys()].filter((k) => !b.has(k) && !KAYNAK_KARSILIGI_YOK.includes(k));
  dogru(eksik.length === 0, "Theme.axaml'da eksik anahtar: " + eksik.join(', '));
});

ol('2 · Avalonia surumunde fazladan anahtar yok', () => {
  const a = anahtarlar(wpf.ogeler);
  const b = anahtarlar(tema.ogeler);
  const fazla = [...b.keys()].filter((k) => !a.has(k));
  dogru(fazla.length === 0, "Theme.xaml'da olmayan anahtar: " + fazla.join(', '));
});

ol('2 · karsiligi olmayan anahtar listesi tam olarak beklenen', () => {
  const b = anahtarlar(tema.ogeler);
  const sapan = KAYNAK_KARSILIGI_YOK.filter((k) => b.has(k));
  dogru(
    sapan.length === 0,
    "istisna listesindeki anahtar Theme.axaml'da tanimli, liste guncellenmeli: " + sapan.join(', ')
  );
  // istisnanin karsiligi gercekten yazilmis mi
  dogru(
    tema.yorumsuz.includes('Window.anim Panel.appbg'),
    'AppBgDonus istisnasi var ama karsiligi olan "Window.anim Panel.appbg" kurali yok'
  );
});

// 3 — renk degerleri ayni
ol('3 · ortak anahtarlarin renk degerleri iki dosyada ayni', () => {
  const a = anahtarlar(wpf.ogeler);
  const b = anahtarlar(tema.ogeler);
  const fark = [];
  let bakilan = 0;
  for (const [k, oge] of a) {
    if (!b.has(k)) continue;
    const x = renkDegeri(oge);
    const y = renkDegeri(b.get(k));
    if (x === null && y === null) continue;
    bakilan++;
    if (x !== y) fark.push(k + ': ' + x + ' ≠ ' + y);
  }
  dogru(bakilan >= 30, 'renk tasiyan anahtar sayisi beklenenden az: ' + bakilan);
  dogru(fark.length === 0, fark.join(' · '));
});

ol('3 · zemin gradientinin 11 duragi birebir ayni', () => {
  const x = gradientDuraklari(wpf, 'AppBgGradient');
  const y = gradientDuraklari(tema, 'AppBgGradient');
  dogru(x.length === 11, 'Theme.xaml durak sayisi ' + x.length);
  dogru(
    x.join(' ') === y.join(' '),
    'duraklar ayrisiyor:\n      WPF: ' + x.join(' ') + '\n      AVA: ' + y.join(' ')
  );
});

// 4 — WPF artiklari
// SAPMA: konsey yasak listesine "DropShadowEffect" koymustu. Avalonia 11'de bu gercek
// bir API ve metne glow veren tek yol; yasak WPF artigini yakalamak icindi. Onun yerine
// WPF'e OZGU ve Avalonia'da hic bulunmayan dizgiler araniyor. Gerekce sozlesmenin
// Cikti bolumunde.
const YASAK = [
  'Style.Triggers',
  'ControlTemplate.Triggers',
  '<Trigger',
  'BeginStoryboard',
  '<Storyboard',
  'Storyboard.TargetProperty',
  'Storyboard.TargetName',
  'LineStackingStrategy',
  'ShadowDepth',
  'x:Shared',
  'Typography.',
  'SystemParameters',
  'WindowChrome',
  'clr-namespace:System.Windows',
  'schemas.microsoft.com/winfx/2006/xaml/presentation',
  'FocusVisualStyle',
  'RequestNavigate',
  '<Hyperlink',
];

for (const [ad, kay] of [
  ['Theme.axaml', () => tema],
  ['Signature.axaml', () => imza],
]) {
  ol('4 · ' + ad + ' WPF artigi tasimiyor', () => {
    const govde = kay().yorumsuz;
    const bulunan = YASAK.filter((y) => govde.includes(y));
    dogru(bulunan.length === 0, 'yasak dizgi: ' + bulunan.join(', '));
  });
}

ol('4 · hover ve basma keyframe degil Transition ile yazilmis', () => {
  const g = tema.yorumsuz;
  dogru(g.includes(':pointerover'), ':pointerover selector yok');
  dogru(g.includes(':pressed'), ':pressed selector yok');
  dogru(g.includes('TransformOperationsTransition'), 'TransformOperationsTransition yok');
  // Animation yalnizca zemin dongusunde olmali: dosyada tek Animation elemani
  const say = tema.ogeler.filter((o) => o.ad === 'Animation').length;
  dogru(say === 1, 'Animation eleman sayisi ' + say + ', yalniz zemin dongusu olmali');
});

ol('4 · RenderTransform hicbir yerde nesne olarak verilmiyor (U1 dersi)', () => {
  for (const [ad, kay] of [
    ['Theme.axaml', tema],
    ['Signature.axaml', imza],
  ]) {
    dogru(
      !kay.yorumsuz.includes('<ScaleTransform') && !kay.yorumsuz.includes('<TransformGroup'),
      ad + ' icinde transform nesnesi var; deger metin olmali ("scale(0.98)")'
    );
    for (const o of kay.ogeler) {
      if (o.ad === 'Setter' && o.oz.Property === 'RenderTransform' && o.oz.Value === undefined)
        throw new Error(ad + " — RenderTransform setter'i deger yerine nesne aliyor");
    }
  }
});

// 5 — kullanilan her kaynak tanimli
ol('5 · kullanilan her StaticResource tanimli', () => {
  const tanimli = new Set([...anahtarlar(tema.ogeler).keys(), ...anahtarlar(imza.ogeler).keys()]);
  const eksik = [];
  for (const [ad, kay] of [
    ['Theme.axaml', tema],
    ['Signature.axaml', imza],
  ]) {
    for (const k of staticResourceAdlari(kay.yorumsuz))
      if (!tanimli.has(k)) eksik.push(ad + ' → ' + k);
  }
  dogru(eksik.length === 0, 'tanimsiz kaynak: ' + eksik.join(', '));
});

ol('5 · Signature.axaml kendi iki temasini tanimliyor', () => {
  const a = anahtarlar(imza.ogeler);
  for (const k of ['SigChip', 'SigText']) dogru(a.has(k), 'Signature.axaml icinde ' + k + ' yok');
});

// 6 — azaltilmis hareket
ol('6 · azaltilmis hareket sinifi sablonda uygulanmis', () => {
  const g = tema.yorumsuz;
  dogru(
    g.includes('.' + HAREKET_SINIFI + ' '),
    'Theme.axaml\'da "' + HAREKET_SINIFI + '" sinifina bagli selector yok'
  );
  dogru(
    g.includes(':not(.' + HAREKET_SINIFI + ')'),
    'sinif dusunce hareketi iptal eden :not(.' + HAREKET_SINIFI + ') kurali yok'
  );
  // yalniz kural yazmak yetmez: dongu de sinifa bagli olmali
  const i = g.indexOf('<Animation');
  const oncesi = g.lastIndexOf('Selector=', i);
  dogru(
    oncesi !== -1 && g.slice(oncesi, i).includes('.' + HAREKET_SINIFI),
    'zemin dongusu "' + HAREKET_SINIFI + '" sinifina bagli degil'
  );
});

ol('6 · azaltilmis hareket sinifi ve okuma kodu belgede', () => {
  const b = metin.belge;
  dogru(b.includes('`' + HAREKET_SINIFI + '`'), 'avalonia.md sinif adini anmiyor');
  dogru(
    b.includes('SPI_GETCLIENTAREAANIMATION'),
    'avalonia.md tercihi okuyan ornek kodu tasimiyor'
  );
  dogru(
    b.includes('Classes.Add("' + HAREKET_SINIFI + '")'),
    'avalonia.md sinifi ekleyen satiri gostermiyor'
  );
});

ol('6 · belge cozemedigi isleri sakli tutmuyor', () => {
  const b = metin.belge;
  dogru(b.includes('(sürüm teyidi yapılmadı)'), 'surum teyidi etiketi yok');
  dogru(b.includes('ölçülmedi'), 'olculmemis deger etiketi yok');
});

console.log('\n' + gecti + ' gecti, ' + kaldi.length + ' kaldi');
if (kaldi.length) {
  console.log('KALDI: ' + kaldi.join(' · '));
  process.exit(1);
}
console.log('GEÇTİ');
