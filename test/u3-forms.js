#!/usr/bin/env node
// U3 — giriş, doğrulama, modal, toast.
//
// Dört katman:
//   A. DESEN BİRİM TESTİ. Aşağıdaki her regex, kullanılmadan önce bir pozitif ve bir
//      negatif fixture'a karşı koşulur. Regex bozulup hiç eşleşmez hâle gelirse test
//      A katmanında düşer — C katmanında sessizce "geçmez". U2'nin ölü testi tam bu
//      yüzden kaçtı: bozuk regex sıfır eşleşme verdi, `|| []` yuttu, kimse görmedi.
//      Bu dosyada `|| []` yoktur; sıfır eşleşme her yerde açıkça sınanır.
//   B. KONTRAST HESABI. Oran baştan hesaplanır, dizgi aranmaz. Hesabın kendisi önce
//      dış referanslara karşı sınanır (beyaz/siyah 21:1, #767676 beyazda 4.54:1),
//      yoksa yanlış sayı kendini doğrular.
//   C. DOSYA DENETİMİ. forms.css / Forms.xaml / forms.md — kural yazılı mı, sayı
//      etiketli mi, token mu okunuyor yoksa hex mi elden yazılmış.
//   D. XAML AYRIŞTIRMA. İyi biçimlilik, yorumda çift tire yok, her StaticResource
//      referansının bir tanımı var.
//
// Tek başına koşar:  node test/u3-forms.js

'use strict';

const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..');
const SKILL = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui');
const ASSET = path.join(SKILL, 'assets');

const CSS = fs.readFileSync(path.join(ASSET, 'forms.css'), 'utf8');
const XAML = fs.readFileSync(path.join(ASSET, 'Forms.xaml'), 'utf8');
const MD = fs.readFileSync(path.join(SKILL, 'references', 'forms.md'), 'utf8');
const TEMA = fs.readFileSync(path.join(ASSET, 'theme.css'), 'utf8');
const TEMAXAML = fs.readFileSync(path.join(ASSET, 'Theme.xaml'), 'utf8');

let gecen = 0;
const hatalar = [];

function onay(ad, kosul, detay) {
  if (kosul) {
    gecen++;
    return;
  }
  hatalar.push(detay ? `${ad} — ${detay}` : ad);
}
function esit(ad, a, b) {
  onay(ad, a === b, `beklenen ${JSON.stringify(b)}, çıkan ${JSON.stringify(a)}`);
}
function yakin(ad, a, b, tol) {
  onay(ad, Math.abs(a - b) <= tol, `beklenen ${b}, çıkan ${a} (tolerans ${tol})`);
}

// Türkçe/ASCII ve tire farklarını yutan katlama — aynı cümle üç dosyada üç yazımla
// duruyor (XAML ASCII, md ve css Türkçe).
function katla(s) {
  return s
    .toLocaleLowerCase('tr')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===========================================================================
// A. DESEN BİRİM TESTİ
// ===========================================================================

// Her desen: pozitif fixture'da EŞLEŞMELİ, negatif fixture'da EŞLEŞMEMELİ.
// `yeni()` her çağrıda taze bir regex verir; `g` bayrağının `lastIndex` durumu
// testler arasında sızmasın diye desen kaynak metin olarak tutuluyor.
const DESEN = {
  hataCercevesi: {
    kaynak: String.raw`\.tk-input-hata[^{]*\{[^}]*border-color:\s*var\(--tk-danger\)\s*;`,
    bayrak: '',
    pozitif: '.tk-input-hata {\n  border-color: var(--tk-danger);\n}',
    negatif: '.tk-input-hata {\n  border-color: rgba(255, 0, 234, 0.5);\n}',
  },
  hamSure: {
    kaynak: String.raw`(?:^|[\s:,(])\d+(?:\.\d+)?(?:ms|s)(?![a-zA-Z0-9-])`,
    bayrak: 'gm',
    pozitif: 'transition: opacity 200ms linear;',
    negatif: 'transition: opacity var(--tk-t-fast) var(--tk-e-out);',
  },
  gri: {
    kaynak: String.raw`#71717a|var\(--tk-disabled\)`,
    bayrak: 'i',
    pozitif: 'color: #71717A;',
    negatif: 'color: var(--tk-text);',
  },
  placeholderKurali: {
    kaynak: String.raw`::placeholder[^{]*\{([^}]*)\}`,
    bayrak: '',
    pozitif: '.tk-input::placeholder {\n  color: var(--tk-text);\n}',
    negatif: '.tk-input { color: var(--tk-text); }',
  },
  caret: {
    kaynak: String.raw`caret-color:\s*var\(--tk-blue\)\s*;`,
    bayrak: '',
    pozitif: '  caret-color: var(--tk-blue);',
    negatif: '  caret-color: auto;',
  },
  gecis: {
    kaynak: String.raw`transition:\s*([^;}]+)[;}]`,
    bayrak: 'g',
    pozitif: 'transition: opacity var(--tk-t-fast) var(--tk-e-out);',
    negatif: 'border-color: var(--tk-border);',
  },
  toastCesidi: {
    kaynak: String.raw`\.tk-toast-([a-z]+)\b`,
    bayrak: 'g',
    pozitif: '.tk-toast-success { border-color: var(--tk-success); }',
    negatif: '.tk-toast { padding: 12px; }',
  },
  xamlErrorTemplate: {
    kaynak: String.raw`<ControlTemplate x:Key="TkErrorTemplate">`,
    bayrak: '',
    pozitif: '  <ControlTemplate x:Key="TkErrorTemplate">',
    negatif: '  <ControlTemplate x:Key="Baska">',
  },
  xamlHelpText: {
    kaynak: String.raw`AutomationProperties\.HelpText`,
    bayrak: '',
    pozitif: 'AutomationProperties.HelpText="Ornek: 8080"',
    negatif: 'AutomationProperties.Name="Kapat"',
  },
  xamlCycle: {
    kaynak: String.raw`KeyboardNavigation\.TabNavigation"?\s*(?:Value=)?"Cycle"`,
    bayrak: 'g',
    pozitif: '<Setter Property="KeyboardNavigation.TabNavigation" Value="Cycle"/>',
    negatif: '<Setter Property="KeyboardNavigation.TabNavigation" Value="Continue"/>',
  },
  xamlBool: {
    kaynak: String.raw`<sys:Boolean x:Key="(\w+)">(\w+)</sys:Boolean>`,
    bayrak: 'g',
    pozitif: '<sys:Boolean x:Key="TkX">False</sys:Boolean>',
    negatif: '<sys:Int32 x:Key="TkX">6000</sys:Int32>',
  },
  xamlCornerRadius: {
    kaynak: String.raw`CornerRadius="(\d+)"`,
    bayrak: 'g',
    pozitif: 'CornerRadius="6"',
    negatif: 'CornerRadius="{TemplateBinding Radius}"',
  },
  xamlSetterSayi: {
    kaynak: String.raw`<Setter Property="(\w+)" Value="(\d+(?:\.\d+)?)"/>`,
    bayrak: 'g',
    pozitif: '<Setter Property="Width" Value="360"/>',
    negatif: '<Setter Property="Width" Value="{StaticResource W}"/>',
  },
  rootTokeni: {
    kaynak: String.raw`^\s*(--tk-[\w-]+):\s*([^;]+);`,
    bayrak: 'gm',
    pozitif: '  --tk-blue: #00f3ff;',
    negatif: '  color: #00f3ff;',
  },
  xamlAnahtar: {
    kaynak: String.raw`x:Key="([^"]+)"`,
    bayrak: 'g',
    pozitif: '<SolidColorBrush x:Key="Danger" Color="#FFFF00EA"/>',
    negatif: '<SolidColorBrush Color="#FFFF00EA"/>',
  },
  xamlKaynakRef: {
    kaynak: String.raw`\{(?:Static|Dynamic)Resource\s+([\w.:]+)\s*\}`,
    bayrak: 'g',
    pozitif: 'Value="{StaticResource Danger}"',
    negatif: 'Value="{TemplateBinding Background}"',
  },
};

function yeni(ad) {
  const d = DESEN[ad];
  if (!d) throw new Error(`tanımsız desen: ${ad}`);
  return new RegExp(d.kaynak, d.bayrak);
}

function katmanA() {
  const adlar = Object.keys(DESEN);
  onay('A0 desen listesi boş değil', adlar.length >= 15, `${adlar.length} desen`);
  for (const ad of adlar) {
    const d = DESEN[ad];
    onay(
      `A ${ad} · pozitif fixture eşleşiyor`,
      yeni(ad).test(d.pozitif),
      'desen ölü — hiçbir şeyle eşleşmiyor, aşağıdaki denetimleri sessizce geçirirdi'
    );
    onay(
      `A ${ad} · negatif fixture eşleşmiyor`,
      !yeni(ad).test(d.negatif),
      'desen fazla geniş — yanlış metni de kabul ediyor'
    );
  }
}

// ===========================================================================
// B. KONTRAST HESABI
// ===========================================================================

const kanal = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function parlaklik(hex) {
  const [r, g, b] = kanal(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a, b) {
  const x = parlaklik(a);
  const y = parlaklik(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// Yarı saydam rengin opak zemin üstündeki görünen rengi. `/50` merdiveni ham hex'e
// karşı değil bu kompozite karşı ölçülür.
function komposit(on, alfa, zemin) {
  const f = kanal(on);
  const z = kanal(zemin);
  return (
    '#' +
    f
      .map((v, i) =>
        Math.round(v * alfa + z[i] * (1 - alfa))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

// theme.css `:root` katmanını ayrıştır ve `var()` zincirlerini çöz.
function tokenlar() {
  const kok = TEMA.slice(TEMA.indexOf(':root'));
  const re = yeni('rootTokeni');
  const ham = {};
  let m;
  let sayi = 0;
  while ((m = re.exec(kok)) !== null) {
    ham[m[1]] = m[2].trim();
    sayi++;
  }
  onay('B0 theme.css :root tokenları okundu', sayi >= 30, `${sayi} token bulundu`);
  const coz = (ad, derinlik) => {
    if (derinlik > 8) return null;
    const v = ham[ad];
    if (v === undefined) return null;
    const iv = /^var\((--[\w-]+)\)$/.exec(v);
    return iv ? coz(iv[1], derinlik + 1) : v;
  };
  const cikti = {};
  for (const ad of Object.keys(ham)) cikti[ad] = coz(ad, 0);
  return cikti;
}

const T = tokenlar();
const YUZEY = '#08090a';

function katmanB() {
  // B1. Hesabın kendisi — dış referanslar. Bunlar düşerse aşağıdaki her sayı şüphelidir.
  yakin('B1 beyaz/siyah 21:1', kontrast('#ffffff', '#000000'), 21.0, 0.01);
  yakin('B1 #767676 beyazda 4.54:1', kontrast('#767676', '#ffffff'), 4.54, 0.01);
  yakin('B1 aynı renk 1:1', kontrast('#ff00ea', '#ff00ea'), 1.0, 0.001);
  // Negatif kontrol: hesap her şeye "geçti" demiyor.
  onay(
    'B1 negatif kontrol · #333 siyahta 7:1 vermiyor',
    kontrast('#333333', '#000000') < 7,
    `çıkan ${kontrast('#333333', '#000000').toFixed(2)}`
  );

  esit('B2 --tk-surface çözüldü', T['--tk-surface'], YUZEY);
  esit('B2 --tk-danger pembeye bağlı', T['--tk-danger'], '#ff00ea');
  esit('B2 --tk-danger-text pembe metne bağlı', T['--tk-danger-text'], '#ff54eb');

  // B3. forms.md tablosundaki HER sayı yeniden hesaplanır.
  const beklenen = [
    ['--tk-text', T['--tk-text'], 19.93, 7],
    ['--tk-danger-text', T['--tk-danger-text'], 7.33, 7],
    ['--tk-warning', T['--tk-warning'], 11.94, 7],
    ['--tk-success', T['--tk-success'], 10.37, 7],
    ['--tk-danger (çerçeve)', T['--tk-danger'], 6.11, 3],
  ];
  for (const [ad, hex, oran, esik] of beklenen) {
    onay(`B3 ${ad} hex çözüldü`, /^#[0-9a-f]{6}$/i.test(hex || ''), `çıkan ${hex}`);
    const o = kontrast(hex, YUZEY);
    yakin(`B3 ${ad} oranı`, Number(o.toFixed(2)), oran, 0.01);
    onay(`B3 ${ad} eşiği ${esik}:1 geçiyor`, o >= esik, `çıkan ${o.toFixed(2)}`);
    onay(`B3 ${ad} oranı forms.md'de yazılı`, MD.includes(`**${oran.toFixed(2)}**`));
  }

  // B4. HATA ÇERÇEVESİ: /50 pembe 3:1'i TAŞIMIYOR — kararın dayanağı, dizgi değil hesap.
  const pembe50 = komposit(T['--tk-danger'], 0.5, YUZEY);
  const o50 = kontrast(pembe50, YUZEY);
  yakin('B4 pembe /50 oranı', Number(o50.toFixed(2)), 2.17, 0.01);
  onay('B4 pembe /50 3:1 eşiğinin ALTINDA', o50 < 3, `çıkan ${o50.toFixed(2)}`);
  onay('B4 tam hex 3:1 eşiğinin ÜSTÜNDE', kontrast(T['--tk-danger'], YUZEY) >= 3);
  onay('B4 forms.md 2.17 sayısını yazıyor', MD.includes('**2.17**'));

  // B5. PLACEHOLDER: disabled grisi 7:1'i taşımıyor — placeholder'a verilemez.
  const gri = kontrast(T['--tk-disabled'], YUZEY);
  yakin('B5 --tk-disabled oranı', Number(gri.toFixed(2)), 4.12, 0.01);
  onay('B5 --tk-disabled 7:1 metin eşiğinin ALTINDA', gri < 7, `çıkan ${gri.toFixed(2)}`);
  onay('B5 --tk-text 7:1 eşiğini geçiyor', kontrast(T['--tk-text'], YUZEY) >= 7);

  // B6. Çerçeve tokenları 3:1 geçiyor mu (giriş varsayılan ve hover durumu).
  for (const [ad, oran] of [
    ['--tk-border', 4.11],
    ['--tk-border-strong', 5.49],
  ]) {
    const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(T[ad] || '');
    onay(`B6 ${ad} rgba olarak ayrıştı`, m !== null, `çıkan ${T[ad]}`);
    if (!m) continue;
    const hex =
      '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
    const o = kontrast(komposit(hex, Number(m[4]), YUZEY), YUZEY);
    yakin(`B6 ${ad} oranı`, Number(o.toFixed(2)), oran, 0.01);
    onay(`B6 ${ad} 3:1 geçiyor`, o >= 3, `çıkan ${o.toFixed(2)}`);
    onay(`B6 ${ad} oranı forms.md'de yazılı`, MD.includes(`**${oran.toFixed(2)}**`));
  }

  // B7. Toast uyarı çerçevesi — amber /50, tek 3:1'i taşıyan yarı saydam çerçeve.
  const amber = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(T['--tk-warning-border']);
  onay('B7 --tk-warning-border ayrıştı', amber !== null);
  if (amber) {
    const hex =
      '#' +
      [amber[1], amber[2], amber[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
    const o = kontrast(komposit(hex, Number(amber[4]), YUZEY), YUZEY);
    onay('B7 amber /50 çerçeve 3:1 geçiyor', o >= 3, `çıkan ${o.toFixed(2)}`);
    onay('B7 amber /50 pembe /50 den yüksek', o > o50);
  }
}

// ===========================================================================
// C. DOSYA DENETİMİ
// ===========================================================================

function cssYorumsuz() {
  return CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

function katmanC() {
  const govde = cssYorumsuz();

  // C1. Hata çerçevesi tam hex okuyor, /50 pembe geçmiyor.
  onay('C1 hata çerçevesi var(--tk-danger) okuyor', yeni('hataCercevesi').test(govde));
  onay(
    'C1 CSS gövdesinde pembe /50 yok',
    !/rgba\(\s*255\s*,\s*0\s*,\s*234\s*,\s*0?\.5\s*\)/.test(govde)
  );
  onay('C1 CSS gövdesinde elden yazılmış pembe hex yok', !/#ff00ea/i.test(govde));
  onay(
    'C1 XAML hata tetikleyicisi Danger fırçasını yazıyor',
    /Validation\.HasError"\s+Value="True">[\s\S]{0,200}StaticResource Danger\}/.test(XAML)
  );
  onay('C1 XAML gövdesinde pembe /50 fırçası yok', !/NeonPink50|PinkText50/.test(XAML));

  // C2. Placeholder kuralında gri yok.
  const ph = yeni('placeholderKurali').exec(govde);
  onay('C2 ::placeholder kuralı bulundu', ph !== null, 'kural yoksa "gri yok" denetimi boşa döner');
  if (ph) {
    onay('C2 placeholder kuralında gri yok', !yeni('gri').test(ph[1]), `içerik: ${ph[1].trim()}`);
    onay('C2 placeholder --tk-text yazıyor', /var\(--tk-text\)/.test(ph[1]));
  }
  // `AdornedElementPlaceholder` WPF'in hata şablonu düğümüdür, placeholder metni değil.
  onay(
    'C2 XAML placeholder/watermark stili yok',
    !/Watermark|Placeholder/i.test(
      XAML.replace(/<!--[\s\S]*?-->/g, ' ').replace(/AdornedElementPlaceholder/g, 'AE')
    )
  );
  onay(
    'C2 forms.md placeholder yerine ne konacağını yazıyor',
    katla(MD).includes('yerine ne konur') || katla(MD).includes('yardim metni')
  );

  // C3. Ham süre yok — sıfır eşleşme AÇIKÇA sınanıyor.
  const ham = govde.match(yeni('hamSure'));
  onay('C3 CSS gövdesinde ham süre yok', ham === null, ham ? `bulunan: ${ham.join(', ')}` : '');
  const gecisRe = yeni('gecis');
  const gecisler = [];
  let g;
  while ((g = gecisRe.exec(govde)) !== null) gecisler.push(g[1].trim());
  onay('C3 geçiş bildirimi sayısı', gecisler.length >= 8, `${gecisler.length} adet`);
  for (const t of gecisler) {
    onay(`C3 geçiş token okuyor · ${t.slice(0, 46)}`, t.includes('var(--tk-t-'));
  }

  // C4. Caret ve seçim.
  onay('C4 caret-color var(--tk-blue)', yeni('caret').test(govde));
  onay('C4 ::selection kuralı var', /::selection\s*\{/.test(govde));
  onay(
    'C4 XAML CaretBrush NeonBlue',
    /CaretBrush"\s+Value="\{StaticResource NeonBlue\}"/.test(XAML)
  );
  onay(
    'C4 XAML SelectionBrush tanımlı',
    /SelectionBrush"\s+Value="\{StaticResource TkSelection\}"/.test(XAML)
  );

  // C5. Renk paritesi — CSS'teki rgb değerleri token hex'iyle aynı mı.
  const mavi = /rgba\(\s*0\s*,\s*243\s*,\s*255\s*,\s*0\.3\s*\)/.test(govde);
  onay('C5 seçim rengi mavi /30', mavi);
  esit('C5 --tk-blue hex', T['--tk-blue'], '#00f3ff');
  const secim = /x:Key="TkSelection"\s+Color="#([0-9A-Fa-f]{2})([0-9A-Fa-f]{6})"/.exec(XAML);
  onay('C5 XAML TkSelection ayrıştı', secim !== null);
  if (secim) {
    esit('C5 XAML seçim rgb = --tk-blue', '#' + secim[2].toLowerCase(), T['--tk-blue']);
    yakin('C5 XAML seçim alfası = 0.30', parseInt(secim[1], 16) / 255, 0.3, 0.01);
  }
  const yuzeyCss = /rgba\(\s*8\s*,\s*9\s*,\s*10\s*,\s*0\.95\s*\)/.test(govde);
  onay('C5 panel yüzeyi rgba(8,9,10,.95)', yuzeyCss);
  esit('C5 --tk-surface = #08090a', T['--tk-surface'], YUZEY);

  // C6. Modal karartma paritesi — CSS alfası ile XAML alfa baytı aynı sayı.
  const perdeCss = /\.tk-modal-perde[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/.exec(govde);
  onay('C6 CSS perde alfası ayrıştı', perdeCss !== null);
  const perdeXaml = /x:Key="TkModalPerde"\s+Color="#([0-9A-Fa-f]{2})000000"/.exec(XAML);
  onay('C6 XAML perde rengi ayrıştı', perdeXaml !== null);
  if (perdeCss && perdeXaml) {
    yakin(
      'C6 karartma iki platformda aynı',
      parseInt(perdeXaml[1], 16) / 255,
      Number(perdeCss[1]),
      0.005
    );
    esit('C6 karartma değeri 0.6', Number(perdeCss[1]), 0.6);
  }

  // C7. Ölçü paritesi ve 24 DIP tabanı.
  const mh = /min-height:\s*(\d+)px/.exec(govde);
  onay('C7 CSS min-height ayrıştı', mh !== null);
  const mhx = /x:Key="TkInputMinHeight">(\d+)</.exec(XAML);
  onay('C7 XAML min-height ayrıştı', mhx !== null);
  if (mh && mhx) {
    esit('C7 min-height paritesi', Number(mh[1]), Number(mhx[1]));
    onay('C7 min-height 24 DIP tabanını aşıyor', Number(mh[1]) >= 24, `çıkan ${mh[1]}`);
    esit('C7 min-height 40', Number(mh[1]), 40);
  }
  const genisCss = /width:\s*min\((\d+)px,\s*90vw\)/.exec(govde);
  onay('C7 CSS modal genişliği ayrıştı', genisCss !== null);
  const setterRe = yeni('xamlSetterSayi');
  const setterlar = {};
  let s;
  while ((s = setterRe.exec(XAML)) !== null) {
    (setterlar[s[1]] = setterlar[s[1]] || []).push(Number(s[2]));
  }
  onay(
    'C7 XAML Width setterları okundu',
    Array.isArray(setterlar.Width),
    `bulunan anahtarlar: ${Object.keys(setterlar).join(', ')}`
  );
  if (genisCss && setterlar.Width) {
    onay(
      'C7 modal genişliği paritesi',
      setterlar.Width.includes(Number(genisCss[1])),
      `CSS ${genisCss[1]}, XAML ${setterlar.Width.join('/')}`
    );
  }
  const toastCss = /width:\s*min\((\d+)px,\s*calc\(100vw - 48px\)\)/.exec(govde);
  onay('C7 CSS toast genişliği ayrıştı', toastCss !== null);
  if (toastCss && setterlar.Width) {
    onay(
      'C7 toast genişliği paritesi',
      setterlar.Width.includes(Number(toastCss[1])),
      `CSS ${toastCss[1]}, XAML ${setterlar.Width.join('/')}`
    );
  }
  // Kapat çarpısı hedef alanı 24x24 (SKILL §5.3).
  onay(
    'C7 CSS kapat hedefi 24x24',
    /\.tk-toast-kapat\s*\{[^}]*width:\s*24px[^}]*height:\s*24px/.test(govde)
  );
  onay(
    'C7 XAML kapat hedefi 24x24',
    Array.isArray(setterlar.Width) &&
      setterlar.Width.includes(24) &&
      Array.isArray(setterlar.Height) &&
      setterlar.Height.includes(24)
  );

  // C8. Yarıçap tek: --tk-r ile XAML CornerRadius aynı sayı.
  const rTok = /^(\d+)px$/.exec((T['--tk-r'] || '').trim());
  onay('C8 --tk-r ayrıştı', rTok !== null, `çıkan ${T['--tk-r']}`);
  const crRe = yeni('xamlCornerRadius');
  const yaricaplar = new Set();
  let c;
  while ((c = crRe.exec(XAML)) !== null) yaricaplar.add(Number(c[1]));
  onay('C8 XAML CornerRadius bulundu', yaricaplar.size > 0);
  if (rTok) {
    onay(
      'C8 bütün yarıçaplar tek değer',
      yaricaplar.size === 1 && yaricaplar.has(Number(rTok[1])),
      `token ${rTok[1]}, XAML ${[...yaricaplar].join('/')}`
    );
  }
  onay('C8 CSS yarıçapı token okuyor', !/border-radius:\s*\d/.test(govde));

  // C9. Toast: TAM ÜÇ ÇEŞİT. Yeni bir çeşit (info) eklenirse bu test düşer.
  const cesitRe = yeni('toastCesidi');
  const yapisal = new Set(['yigin', 'ikon', 'baslik', 'govde', 'kapat', 'sayac']);
  const cesitler = new Set();
  let v;
  while ((v = cesitRe.exec(govde)) !== null) {
    if (!yapisal.has(v[1])) cesitler.add(v[1]);
  }
  esit('C9 toast çeşitleri', [...cesitler].sort().join(','), 'danger,success,warning');
  // Yorumda adı geçebilir (yokluğunun gerekçesi orada yazılı); gövdede geçemez.
  onay('C9 --tk-info tokenı CSS gövdesinde yok', !/--tk-info/.test(govde));
  onay('C9 Info fırçası XAML de yok', !/(?:Static|Dynamic)Resource\s+Info|x:Key="Info/.test(XAML));
  onay('C9 theme.css hâlâ --tk-info tanımlamıyor', !/^\s*--tk-info:/m.test(TEMA));
  const infoCumle = 'info toast yok, duz metin toast var - beyaz metin, mavi cerceve yok';
  for (const [ad, metin] of [
    ['forms.md', MD],
    ['forms.css', CSS],
    ['Forms.xaml', XAML],
  ]) {
    onay(`C9 info şerhi ${ad} de yazılı`, katla(metin).includes(infoCumle));
  }

  // C10. Ölçülmemiş sayılar etiketli. Etiket kaybolursa test düşer.
  const satirlar = MD.split(/\r?\n/);
  const etiket = 'varsayilan, olculmedi';
  const olculmemis = ['40px', 'rgba(0, 0, 0, 0.6)', '560px', '6 sn', '360px'];
  for (const sayi of olculmemis) {
    const yerler = satirlar.map((l, i) => (l.includes(sayi) ? i : -1)).filter((i) => i >= 0);
    onay(`C10 "${sayi}" forms.md de geçiyor`, yerler.length > 0);
    const etiketli = yerler.some((i) =>
      satirlar.slice(Math.max(0, i - 1), i + 2).some((l) => katla(l).includes(etiket))
    );
    onay(
      `C10 "${sayi}" (varsayılan, ölçülmedi) etiketi taşıyor`,
      etiketli,
      `geçtiği satırlar: ${yerler.map((i) => i + 1).join(', ')}`
    );
  }
  onay('C10 etiket CSS te de duruyor', katla(CSS).includes(etiket));
  onay('C10 etiket XAML de de duruyor', katla(XAML).includes(etiket));
  // Negatif kontrol: etiket dedektörü her şeye "var" demiyor.
  onay('C10 negatif kontrol · etiket dedektörü', !katla('duz bir cumle').includes(etiket));

  // C11. Arka plan tıklaması — iki tür, iki davranış.
  onay('C11 CSS onay modalı öznitelik taşıyor', /data-tk-modal='onay'/.test(CSS));
  onay(
    'C11 CSS bilgi modalı öznitelik taşıyor',
    /data-tk-modal="bilgi"|data-tk-modal='bilgi'/.test(CSS)
  );
  const boolRe = yeni('xamlBool');
  const boollar = {};
  let b;
  while ((b = boolRe.exec(XAML)) !== null) boollar[b[1]] = b[2];
  esit('C11 onay modalinde perde KAPATMAZ', boollar.TkModalOnayPerdeKapatir, 'False');
  esit('C11 bilgi modalinde perde KAPATIR', boollar.TkModalBilgiPerdeKapatir, 'True');
  onay(
    'C11 forms.md ayrımı tabloda yazıyor',
    katla(MD).includes('kapatmaz') && katla(MD).includes('arka plan tiklamasi')
  );

  // C12. Toast: hover'da sayaç durur, klavye odağında da durur.
  onay(
    'C12 CSS hover duraklatma kancası',
    /\.tk-toast:hover,\s*\.tk-toast:focus-within/.test(govde)
  );
  onay(
    'C12 XAML IsMouseOver tetikleyicisi',
    /IsMouseOver"\s+Value="True">[\s\S]{0,160}Value="durdu"/.test(XAML)
  );
  onay(
    'C12 XAML IsKeyboardFocusWithin tetikleyicisi',
    /IsKeyboardFocusWithin"\s+Value="True">[\s\S]{0,160}Value="durdu"/.test(XAML)
  );
  onay('C12 forms.md hover duraklatmayı yazıyor', katla(MD).includes("hover'da sayac durur"));

  // C13. Toast ömrü tek yerden: 6000 ms, iki dosyada aynı.
  const omurXaml = /x:Key="TkToastOmurMs">(\d+)</.exec(XAML);
  onay('C13 XAML toast ömrü ayrıştı', omurXaml !== null);
  onay('C13 CSS sabit adını yazıyor', /TK_TOAST_OMUR_MS = 6000/.test(CSS));
  if (omurXaml) esit('C13 ömür 6000 ms', Number(omurXaml[1]), 6000);
  onay('C13 hata toast ı kalıcı', katla(MD).includes('kalici'));

  // C14. Erişilebilirlik düğümleri.
  onay('C14 XAML Validation.ErrorTemplate tanımlı', yeni('xamlErrorTemplate').test(XAML));
  onay(
    'C14 XAML ErrorTemplate stile bağlı',
    /Validation\.ErrorTemplate"\s+Value="\{DynamicResource TkErrorTemplate\}"/.test(XAML)
  );
  onay('C14 XAML AutomationProperties.HelpText geçiyor', yeni('xamlHelpText').test(XAML));
  const cycle = XAML.match(yeni('xamlCycle'));
  onay(
    'C14 XAML TabNavigation Cycle',
    cycle !== null && cycle.length >= 2,
    cycle ? `${cycle.length} yer` : 'hiç yok'
  );
  onay(
    'C14 forms.md aria-invalid ve aria-describedby birlikte',
    MD.includes('aria-invalid="true"') && MD.includes('aria-describedby')
  );
  // Form hata örneğinde role="alert" YOK — yalnız kalıcı hata toast ında kullanılır.
  const hataOrnek = satirlar.filter((l) => l.includes('id="eposta-hata"'));
  onay('C14 hata örneği satırı bulundu', hataOrnek.length > 0);
  onay(
    'C14 form hata metninde role="alert" yok',
    hataOrnek.every((l) => !l.includes('role="alert"'))
  );
  onay('C14 aria-live polite yazılı', MD.includes('aria-live="polite"'));

  // C15. Renk tek başına anlam taşımaz — ikon ikinci taşıyıcı.
  onay('C15 CSS hata ikonu sınıfı var', /\.tk-error-ikon\s*\{/.test(govde));
  onay('C15 CSS toast ikonu sınıfı var', /\.tk-toast-ikon\s*\{/.test(govde));
  onay('C15 XAML hata şablonunda Path ikonu var', /TkErrorTemplate[\s\S]{0,900}<Path /.test(XAML));
  onay('C15 forms.md kuralı yazıyor', katla(MD).includes('renk tek basina anlam tasimaz'));

  // C16. Şerh ve devir listesi.
  onay(
    'C16 forms.md ilk satırlarında overlays şerhi',
    katla(satirlar.slice(0, 6).join(' ')).includes('overlays.md')
  );
  onay('C16 forms.css şerhi taşıyor', katla(CSS).includes('overlays.css'));
  onay('C16 Forms.xaml şerhi taşıyor', katla(XAML).includes('overlays.xaml'));
  const devir = MD.slice(MD.indexOf('## Devir listesi'));
  onay('C16 devir listesi bölümü var', MD.includes('## Devir listesi'));
  onay('C16 toast ömrü ölçümü U5 e devredildi', /toast ömrünün[\s\S]{0,40}U5/i.test(devir));
  onay('C16 ekran okuyucu doğrulaması U5 e devredildi', /ekran okuyucu[\s\S]{0,80}U5/i.test(devir));
  onay('C16 beş-durum entegrasyonu U6 ya devredildi', /beş-durum[\s\S]{0,90}U6/i.test(devir));

  // C17. Beş durum eksiksiz.
  for (const durum of ['hover', 'focus-visible', 'disabled', 'readonly']) {
    onay(
      `C17 CSS ${durum} durumu tanımlı`,
      new RegExp(`\\.tk-input(?:\\[[^\\]]*\\])?:${durum}|\\.tk-input\\[${durum}\\]`).test(govde)
    );
  }
  onay('C17 CSS hata durumu tanımlı', /\.tk-input-hata/.test(govde));
  for (const trig of [
    'IsMouseOver',
    'IsKeyboardFocused',
    'IsReadOnly',
    'IsEnabled',
    'Validation.HasError',
  ]) {
    onay(`C17 XAML ${trig} tetikleyicisi`, XAML.includes(`Property="${trig}"`));
  }
  onay('C17 devre dışıda not-allowed', /cursor:\s*not-allowed/.test(govde));
  onay('C17 XAML devre dışıda Cursor No', /Property="Cursor"\s+Value="No"/.test(XAML));
}

// ===========================================================================
// D. XAML AYRIŞTIRMA
// ===========================================================================

function katmanD() {
  // D1. Yorumda çift tire yok — XML yorumu `--` içeremez, WPF açılışta patlar.
  const yorumlar = XAML.match(/<!--[\s\S]*?-->/g);
  onay('D1 XAML yorumları bulundu', yorumlar !== null && yorumlar.length > 0);
  if (yorumlar) {
    for (let i = 0; i < yorumlar.length; i++) {
      const ic = yorumlar[i].slice(4, -3);
      onay(
        `D1 yorum ${i + 1} çift tire taşımıyor`,
        !ic.includes('--'),
        ic.slice(0, 60).replace(/\s+/g, ' ')
      );
    }
  }
  // Negatif kontrol: dedektör çalışıyor mu.
  onay('D1 negatif kontrol · çift tire dedektörü', '<!-- a -- b -->'.slice(4, -3).includes('--'));

  // D2. İyi biçimlilik — etiket yığınını yürüt.
  const govde = XAML.replace(/<!--[\s\S]*?-->/g, '');
  const etiketRe = /<(\/?)([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  const yigin = [];
  let m;
  let sayac = 0;
  let bozuk = null;
  let son = 0;
  while ((m = etiketRe.exec(govde)) !== null) {
    // Etiketler arası metinde başıboş '<' olmamalı.
    if (govde.slice(son, m.index).includes('<')) bozuk = bozuk || 'kapanmamış < işareti';
    son = etiketRe.lastIndex;
    sayac++;
    const [, kapanis, ad, oz, kendi] = m;
    if (kapanis) {
      if (yigin.pop() !== ad) {
        bozuk = bozuk || `eşleşmeyen kapanış </${ad}>`;
        break;
      }
    } else if (!kendi) {
      yigin.push(ad);
    }
    // Öznitelikler ad="değer" biçiminde mi.
    const kalan = oz.replace(/\s+[A-Za-z_][\w.:-]*\s*=\s*(?:"[^"]*"|'[^']*')/g, '').trim();
    if (kalan) bozuk = bozuk || `çözülemeyen öznitelik: ${kalan.slice(0, 40)}`;
  }
  onay('D2 XAML etiketleri okundu', sayac > 100, `${sayac} etiket`);
  onay(
    'D2 XAML iyi biçimli',
    bozuk === null && yigin.length === 0,
    bozuk || `kapanmamış: ${yigin.join(' > ')}`
  );
  esit(
    'D2 kök öğe ResourceDictionary',
    /<ResourceDictionary[\s>]/.test(govde) && /<\/ResourceDictionary>/.test(govde),
    true
  );

  // D3. Her StaticResource referansının bir tanımı var (Forms.xaml ya da Theme.xaml).
  const anahtarRe = yeni('xamlAnahtar');
  const tanimli = new Set();
  let a;
  while ((a = anahtarRe.exec(XAML)) !== null) tanimli.add(a[1]);
  const anahtarRe2 = yeni('xamlAnahtar');
  while ((a = anahtarRe2.exec(TEMAXAML)) !== null) tanimli.add(a[1]);
  onay('D3 tanımlı anahtar kümesi doldu', tanimli.size > 40, `${tanimli.size} anahtar`);

  const refRe = yeni('xamlKaynakRef');
  const refler = new Set();
  let r;
  while ((r = refRe.exec(govde)) !== null) refler.add(r[1]);
  onay('D3 kaynak referansları bulundu', refler.size >= 15, `${refler.size} referans`);
  for (const ref of [...refler].sort()) {
    onay(`D3 ${ref} tanımlı`, tanimli.has(ref), 'ne Forms.xaml ne Theme.xaml içinde');
  }
  // Negatif kontrol: uydurma bir ad gerçekten tanımsız görünüyor mu.
  onay('D3 negatif kontrol · tanımsız ad yakalanır', !tanimli.has('TkOlmayanFirca'));

  // D4. Hareket: her DoubleAnimation süre tokenı ve yumuşatma taşıyor, ham süre yok.
  const animler = govde.match(/<DoubleAnimation[\s\S]*?\/>/g);
  onay(
    'D4 DoubleAnimation bulundu',
    animler !== null && animler.length >= 8,
    animler ? `${animler.length} adet` : 'hiç yok'
  );
  if (animler) {
    for (let i = 0; i < animler.length; i++) {
      const t = animler[i].replace(/\s+/g, ' ');
      onay(
        `D4 anim ${i + 1} süre tokenı okuyor`,
        /Duration="\{StaticResource T(Instant|Fast|Base|Slow)\}"/.test(t),
        t.slice(0, 70)
      );
      onay(
        `D4 anim ${i + 1} yumuşatma taşıyor`,
        /EasingFunction="\{StaticResource E(Out|In)\}"/.test(t),
        t.slice(0, 70)
      );
      onay(
        `D4 anim ${i + 1} yalnız Opacity/Transform`,
        /TargetProperty="(Opacity|\(UIElement\.RenderTransform\))/.test(t),
        t.slice(0, 70)
      );
    }
  }
  onay('D4 XAML gövdesinde ham 0:0:x süresi yok', !/Duration="0:0:/.test(govde));
}

// ===========================================================================
// Koşum
// ===========================================================================

katmanA();
katmanB();
katmanC();
katmanD();

console.log(`U3 giriş/doğrulama/modal/toast — ${gecen} doğrulama geçti, ${hatalar.length} düştü.`);
if (hatalar.length) {
  for (const h of hatalar.slice(0, 40)) console.log(`  KALDI  ${h}`);
  if (hatalar.length > 40) console.log(`  ... ve ${hatalar.length - 40} tane daha`);
  console.log('KALDI');
  process.exit(1);
}
console.log('GEÇTİ');
