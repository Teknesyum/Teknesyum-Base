#!/usr/bin/env node
// U4 — anlamsal renk katmanı: danger, warning, success.
//
// Bu dosya iki katman doğrular:
//   A. Kontrast hesabını baştan yapar ve sözleşmedeki HER sayıyı ona karşılar.
//      Önce hesabın kendisi dış referanslara karşı sınanır (beyaz/siyah 21:1,
//      #767676 beyazda 4.54:1) — yoksa yanlış sayı kendini doğrular.
//   B. Üç asset dosyasını okur: rol tokenları var mı, hex'ler üç dosyada bire
//      bir aynı mı, `theme.css`in İKİ katmanı (`@theme` ve `:root`) uyuşuyor mu,
//      ANSI sabiti rol renklerini taşıyor mu, kısıt metni yazılı mı, `info`
//      gerçekten yok mu.
//
// B'nin `@theme` kontrolü bilerek var: `--color-*` ile `--tk-*` ayrı iki
// katmandır ve birini güncelleyip ötekini bırakmak bu işin en büyük riski.
//
// Tek başına koşar:  node test/u4-renk.js

'use strict';

const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..');
const ASSET = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui', 'assets');
const CSS = fs.readFileSync(path.join(ASSET, 'theme.css'), 'utf8');
const XAML = fs.readFileSync(path.join(ASSET, 'Theme.xaml'), 'utf8');
const CS = fs.readFileSync(path.join(ASSET, 'Palette.cs'), 'utf8');

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

// ---------------------------------------------------------------------------
// 1. Kontrast hesabı — WCAG 2.x görece parlaklık ve kontrast oranı
// ---------------------------------------------------------------------------

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

// Yarı saydam bir rengin opak zemin üstündeki gerçek görünen rengi. `/50`
// merdiveni ölçülürken kontrast bu komposite karşı ölçülür, ham hex'e değil.
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

const yuvarla = (n) => Number(n.toFixed(2));

const BG = '#000000';
const SURFACE = '#08090a';
const AMBER = '#fbbf24';
const PEMBE = '#ff00ea';
const PEMBE_METIN = '#ff54eb';
const MOR = '#b026ff';
const YESIL = '#34d399';

// ---------------------------------------------------------------------------
// 2. Katman A — sayılar
// ---------------------------------------------------------------------------

function katmanA() {
  // A0. Hesabın kendisi. Bu üç değer dış referanstır; tutmuyorsa aşağıdaki
  // hiçbir sayıya güvenilmez.
  yakin('A0 beyaz/siyah 21:1', yuvarla(kontrast('#ffffff', '#000000')), 21, 0.005);
  yakin('A0 #767676 beyazda 4.54:1', yuvarla(kontrast('#767676', '#ffffff')), 4.54, 0.005);
  yakin('A0 aynı renk 1:1', yuvarla(kontrast(AMBER, AMBER)), 1, 0.005);

  // A1. Amber metin olarak — 7:1 eşiğini iki zeminde de geçmek zorunda (§2).
  yakin('A1 amber / #000000', yuvarla(kontrast(AMBER, BG)), 12.58, 0.005);
  yakin('A1 amber / #08090a', yuvarla(kontrast(AMBER, SURFACE)), 11.94, 0.005);
  onay('A1 amber metin 7:1 geçiyor', kontrast(AMBER, SURFACE) >= 7);

  // A2. Amber DOLGU yasağının gerekçesi. Beyaz metin çöküyor; siyah metin
  // geçerdi ama dolguya izin veren kalıp yazının rengini her seferinde yeniden
  // tartışmaya açar, o yüzden dolgu tümden yasak (SKILL §2, `success` kalıbı).
  yakin('A2 amber üstüne beyaz metin', yuvarla(kontrast('#ffffff', AMBER)), 1.67, 0.005);
  onay('A2 beyaz metin 4.5:1 eşiğini bile geçemiyor', kontrast('#ffffff', AMBER) < 4.5);
  yakin('A2 amber üstüne siyah metin', yuvarla(kontrast('#000000', AMBER)), 12.58, 0.005);

  // A3. `/50` çerçeve merdiveni. 1.4.11 dolgu/çerçeve için 3:1 istiyor.
  const amber50 = komposit(AMBER, 0.5, SURFACE);
  esit('A3 amber/50 kompoziti', amber50, '#826417');
  yakin('A3 amber/50 çerçeve, #08090a üstünde', yuvarla(kontrast(amber50, SURFACE)), 3.59, 0.005);
  onay('A3 amber/50 çerçeve 3:1 geçiyor', kontrast(amber50, SURFACE) >= 3);

  // A4. Fark yazılı olsun: pembe ve mor bu merdiveni TAŞIMIYORDU, amber taşıyor.
  const pembe50 = komposit(PEMBE, 0.5, SURFACE);
  const mor50 = komposit(MOR, 0.5, SURFACE);
  yakin('A4 pembe/50, #08090a üstünde', yuvarla(kontrast(pembe50, SURFACE)), 2.17, 0.01);
  yakin('A4 mor/50, #08090a üstünde', yuvarla(kontrast(mor50, SURFACE)), 1.83, 0.005);
  onay('A4 pembe/50 3:1 altında', kontrast(pembe50, SURFACE) < 3);
  onay('A4 mor/50 3:1 altında', kontrast(mor50, SURFACE) < 3);

  // A5. `danger`ın metin/dolgu ayrımı. Dolgu hex'i metinde 7:1'i geçemiyor;
  // rol katmanında ayrı bir metin tokeni bu yüzden var.
  yakin('A5 pembe dolgu metin olarak, #08090a', yuvarla(kontrast(PEMBE, SURFACE)), 6.11, 0.01);
  onay('A5 pembe dolgu 7:1 altında', kontrast(PEMBE, SURFACE) < 7);
  yakin('A5 pink-text, #08090a', yuvarla(kontrast(PEMBE_METIN, SURFACE)), 7.33, 0.01);
  onay('A5 pink-text 7:1 geçiyor', kontrast(PEMBE_METIN, SURFACE) >= 7);

  // A6. `success` değişmedi; rol katmanı onu bozmadı.
  yakin('A6 success / #08090a', yuvarla(kontrast(YESIL, SURFACE)), 10.37, 0.01);
}

// ---------------------------------------------------------------------------
// 3. Katman B — üç dosya
// ---------------------------------------------------------------------------

// XAML ve C# yorumları ASCII'ye katlanmış yazılıyor; metin ararken aksanı düşür.
const katla = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[çÇ]/g, 'c')
    .replace(/[öÖ]/g, 'o')
    .replace(/[üÜ]/g, 'u')
    .toUpperCase();

function csDeger(ad) {
  const m = CSS.match(new RegExp(`^\\s*${ad}\\s*:\\s*([^;]+);`, 'm'));
  return m ? m[1].trim() : null;
}
function xamlFirca(ad) {
  const m = XAML.match(new RegExp(`x:Key="${ad}"\\s+Color="(#[0-9A-Fa-f]{8})"`));
  return m ? m[1].toUpperCase() : null;
}

function katmanB() {
  // B1. `:root` rol katmanı. Takma adlar `var()` ile bağlı — hex elden yazılmaz.
  esit('B1 --tk-danger', csDeger('--tk-danger'), 'var(--tk-pink)');
  esit('B1 --tk-danger-text', csDeger('--tk-danger-text'), 'var(--tk-pink-text)');
  esit('B1 --tk-warning', csDeger('--tk-warning'), '#fbbf24');
  esit('B1 --tk-warning-border', csDeger('--tk-warning-border'), 'rgba(251, 191, 36, 0.5)');
  esit('B1 --tk-success yerinde', csDeger('--tk-success'), '#34d399');

  // `--tk-warning-border` gerçekten amberin /50'si mi — üçüncü bir hex olmasın.
  const rgba = csDeger('--tk-warning-border').match(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/);
  const amberKanal = kanal(AMBER);
  esit(
    'B1 çerçeve amberin kendisi',
    [+rgba[1], +rgba[2], +rgba[3]].join(','),
    amberKanal.join(',')
  );
  esit('B1 çerçeve alfası /50', rgba[4], '0.5');

  // B2. EN BÜYÜK RİSK: `@theme` katmanı. `:root` güncellenip burası unutulursa
  // Tailwind tarafı eski hex'te kalır. İki katman hex düzeyinde karşılaştırılır.
  const tema = CSS.match(/@theme\s*\{([\s\S]*?)\n\}/);
  onay('B2 @theme bloğu duruyor', !!tema);
  const T = tema ? tema[1] : '';
  onay('B2 @theme --color-danger', /--color-danger:\s*#ff00ea;/.test(T));
  onay('B2 @theme --color-danger-text', /--color-danger-text:\s*#ff54eb;/.test(T));
  onay('B2 @theme --color-warning', /--color-warning:\s*#fbbf24;/.test(T));
  // Karşılık: `--tk-danger` markaya bağlı, marka hex'i `@theme`dekiyle aynı olmalı.
  esit('B2 danger iki katmanda aynı', csDeger('--tk-pink'), '#ff00ea');
  esit('B2 danger-text iki katmanda aynı', csDeger('--tk-pink-text'), '#ff54eb');
  esit('B2 warning iki katmanda aynı', csDeger('--tk-warning'), '#fbbf24');

  // B3. `info` gerçekten yok — üç dosyada da. Kullanılmayan token borçtur.
  // Yorumlar düşülür: yokluğun gerekçesi yorumda `--tk-info` adını GEÇMEK
  // zorunda, tanım olarak geçmemek zorunda. İkisi ayrılmazsa gerekçe yazan
  // kişi testi kırar.
  const cssKod = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  onay('B3 CSS --tk-info tanımı yok', !/--tk-info\s*:/.test(cssKod));
  onay('B3 CSS --tk-info kullanımı yok', !/var\(--tk-info/.test(cssKod));
  onay('B3 CSS --color-info yok', !/--color-info\s*:/.test(cssKod));
  onay('B3 XAML Info fırçası yok', !/x:Key="Info[A-Za-z0-9]*"/.test(XAML));
  onay('B3 Palette Info alanı yok', !/\bColor\s+Info\s*=/.test(CS));
  // Yokluğun gerekçesi ve açılırsa ne olacağı yazılı olmalı; sessiz eksik değil.
  for (const [ad, m] of [
    ['CSS', CSS],
    ['XAML', XAML],
    ['Palette', CS],
  ]) {
    onay(`B3 ${ad} info notu yazılı`, katla(m).includes('BILEREK YOK'));
    onay(`B3 ${ad} info açılırsa maviye bağlanır`, katla(m).includes('MAVIYE BAGLANIR'));
  }

  // B4. Rol kazanır: durum bildiren bileşenler rol tokenına geçti.
  onay(
    'B4 .tk-btn-danger rol tokenı yazıyor',
    /\.tk-btn-danger\s*\{[^}]*background:\s*var\(--tk-danger\)/.test(CSS)
  );
  onay(
    'B4 .tk-btn-danger ham pembe yazmıyor',
    !/\.tk-btn-danger\s*\{[^}]*background:\s*var\(--tk-pink\)/.test(CSS)
  );
  onay('B4 .tk-dot-off rol tokenı yazıyor', /\.tk-dot-off\s*\{[^}]*var\(--tk-danger\)/.test(CSS));
  onay('B4 .tk-dot-on rol tokenı yazıyor', /\.tk-dot-on\s*\{[^}]*var\(--tk-success\)/.test(CSS));
  // Dekor marka tokenında KALIR — rol her yeri yutmasın.
  onay(
    'B4 scrollbar marka tokenında',
    /::-webkit-scrollbar-thumb\s*\{[^}]*var\(--tk-purple\)/.test(CSS)
  );
  onay(
    'B4 danger halesi marka tokenında',
    /\.tk-btn-danger\s*\{[^}]*var\(--tk-glow-pink\)/.test(CSS)
  );

  // B5. XAML rol fırçaları.
  esit('B5 XAML Danger', xamlFirca('Danger'), '#FFFF00EA');
  esit('B5 XAML DangerText', xamlFirca('DangerText'), '#FFFF54EB');
  esit('B5 XAML Warning', xamlFirca('Warning'), '#FFFBBF24');
  esit('B5 XAML Warning50', xamlFirca('Warning50'), '#80FBBF24');
  esit('B5 XAML Success', xamlFirca('Success'), '#FF34D399');
  onay('B5 NeonSuccess adı kalktı', !/x:Key="NeonSuccess"/.test(XAML));
  onay('B5 uyarı yüzeyi stili var', /x:Key="WarningPanel"/.test(XAML));
  onay('B5 uyarı metni stili var', /x:Key="WarningBody"/.test(XAML));
  onay('B5 hata metni stili var', /x:Key="DangerBody"/.test(XAML));
  // XAML yorumunda çift tire yasak — dosyayı sessizce bozar.
  const yorumlar = XAML.match(/<!--[\s\S]*?-->/g) || [];
  onay(
    'B5 XAML yorumlarında çift tire yok',
    yorumlar.every((y) => !y.slice(4, -3).includes('--')),
    'bir yorum gövdesinde "--" var'
  );

  // B6. Palette.cs — takma ad düz atama, hex kopyalanmıyor.
  onay('B6 Danger = NeonPink', /Color\s+Danger\s*=\s*NeonPink;/.test(CS));
  onay('B6 DangerText = PinkText', /Color\s+DangerText\s*=\s*PinkText;/.test(CS));
  onay('B6 Warning hex', /Color\s+Warning\s*=\s*ColorTranslator\.FromHtml\("#FBBF24"\);/.test(CS));
  onay(
    'B6 Warning50 = amber /50',
    /Color\s+Warning50\s*=\s*Color\.FromArgb\(0x80,\s*0xFB,\s*0xBF,\s*0x24\);/.test(CS)
  );
  onay(
    'B6 Success duruyor',
    /Color\s+Success\s*=\s*ColorTranslator\.FromHtml\("#34D399"\);/.test(CS)
  );
  // Rol alanı marka alanından SONRA tanımlanmalı — C# statik ilklendirme sırası.
  onay('B6 NeonPink Dangerdan önce', CS.indexOf('Color NeonPink') < CS.indexOf('Color Danger '));
  onay(
    'B6 PinkText DangerTextten önce',
    CS.indexOf('Color PinkText') < CS.indexOf('Color DangerText')
  );

  // B7. ANSI sabiti. Unutulursa terminal çıktısı paletten kopar.
  const ESC = '\u001b';
  const ansi = CS.slice(CS.indexOf('class Ansi'));
  onay('B7 Ansi.Danger = Pink', /string\s+Danger\s*=\s*Pink;/.test(ansi));
  onay('B7 Ansi.DangerText = PinkText', /string\s+DangerText\s*=\s*PinkText;/.test(ansi));
  onay(
    'B7 Ansi.Warning amber SGR',
    ansi.includes(`Warning    = "${ESC}[38;2;251;191;36m"`),
    'amberin RGB kanalları 251;191;36 olmalı'
  );
  onay('B7 Ansi.Success duruyor', ansi.includes(`${ESC}[38;2;52;211;153m`));
  // ANSI kanalları hex ile aynı sayıyı söylüyor mu.
  const sgr = ansi.match(new RegExp(`Warning\\s*=\\s*"${ESC}\\[38;2;(\\d+);(\\d+);(\\d+)m"`));
  esit(
    'B7 ANSI kanalları amberle aynı',
    sgr.slice(1, 4).map(Number).join(','),
    amberKanal.join(',')
  );

  // B8. Kısıt metni üç dosyada da yazılı. Kısıt yazılı değilse token serbesttir.
  onay('B8 CSS dolgu yasağı', katla(CSS).includes('DOLGU VE BUTON YOK'));
  onay('B8 XAML dolgu yasağı', katla(XAML).includes('DOLGU VE DUGME YOK'));
  onay('B8 Palette dolgu yasağı', katla(CS).includes('DOLGU VE DUGME YOK'));
  for (const [ad, m] of [
    ['CSS', CSS],
    ['XAML', XAML],
    ['Palette', CS],
  ]) {
    onay(`B8 ${ad} yalnız uyarı yüzeyi`, katla(m).includes('YALNIZCA UYARI YUZEYI'));
    onay(`B8 ${ad} alternatif yazılı`, katla(m).includes('YERINE NE KONUR'));
    onay(`B8 ${ad} beyaz metin gerekçesi`, katla(m).includes('1.67'));
    onay(
      `B8 ${ad} renk tek başına anlam taşımaz`,
      katla(m).includes('RENK TEK BASINA ANLAM TASIMAZ')
    );
    onay(`B8 ${ad} U9 şerhi`, katla(m).includes('U9'));
  }

  // B9. Üç dosya aynı rolleri aynı adla taşıyor.
  for (const rol of ['danger', 'warning', 'success']) {
    const buyuk = rol[0].toUpperCase() + rol.slice(1);
    onay(`B9 ${rol} · CSS`, CSS.includes(`--tk-${rol}`));
    onay(`B9 ${rol} · XAML`, XAML.includes(`x:Key="${buyuk}"`));
    onay(`B9 ${rol} · Palette`, new RegExp(`Color\\s+${buyuk}\\s*=`).test(CS));
  }
}

// ---------------------------------------------------------------------------
// 4. Koşum
// ---------------------------------------------------------------------------

katmanA();
katmanB();

console.log(`U4 anlamsal renk — ${gecen} doğrulama geçti, ${hatalar.length} düştü.`);
if (hatalar.length) {
  for (const h of hatalar.slice(0, 40)) console.log(`  KALDI  ${h}`);
  if (hatalar.length > 40) console.log(`  ... ve ${hatalar.length - 40} tane daha`);
  console.log('KALDI');
  process.exit(1);
}
console.log('GEÇTİ');
