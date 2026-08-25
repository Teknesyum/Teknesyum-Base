'use strict';
const fs = require('fs');
const path = require('path');
const kok = __dirname;
const tokenYolu = process.argv[2] ? path.resolve(process.argv[2]) : path.join(kok, 'theme.tokens.json');
const T = JSON.parse(fs.readFileSync(tokenYolu, 'utf8'));

function bul(ad) {
  for (const grup of ['marka', 'rol', 'turetilmis']) {
    if (T[grup] && T[grup][ad]) return T[grup][ad];
  }
  throw new Error('token yok: ' + ad);
}

function coz(ad, iz) {
  iz = iz || [];
  if (iz.includes(ad)) throw new Error('ref dongusu: ' + iz.concat(ad).join(' -> '));
  const t = bul(ad);
  if (t.deger !== undefined) {
    const x6 = t.deger.slice(1);
    return {
      r: parseInt(x6.slice(0, 2), 16),
      g: parseInt(x6.slice(2, 4), 16),
      b: parseInt(x6.slice(4, 6), 16),
      a: t.alpha !== undefined ? t.alpha : 1
    };
  }
  const alt = coz(t.ref, iz.concat(ad));
  return { r: alt.r, g: alt.g, b: alt.b, a: t.alpha !== undefined ? t.alpha : alt.a };
}

const hk = n => n.toString(16).padStart(2, '0');
const HK = n => hk(n).toUpperCase();

function h(ad) { const c = coz(ad); return '#' + hk(c.r) + hk(c.g) + hk(c.b); }
function rgba(ad, alfa) {
  const c = coz(ad);
  const a = alfa !== undefined ? alfa : c.a;
  return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + a + ')';
}
function x(ad) { const c = coz(ad); return '#FF' + HK(c.r) + HK(c.g) + HK(c.b); }
function xa(ad, alfa) {
  const c = coz(ad);
  const a = alfa !== undefined ? alfa : c.a;
  return '#' + HK(Math.round(a * 255)) + HK(c.r) + HK(c.g) + HK(c.b);
}
function csx(ad) { const c = coz(ad); return '#' + HK(c.r) + HK(c.g) + HK(c.b); }
function argb(ad, alfa) {
  const c = coz(ad);
  const a = alfa !== undefined ? alfa : c.a;
  return '0x' + HK(Math.round(a * 255)) + ', 0x' + HK(c.r) + ', 0x' + HK(c.g) + ', 0x' + HK(c.b);
}
function ansi(ad) { const c = coz(ad); return '\x1b[38;2;' + c.r + ';' + c.g + ';' + c.b + 'm'; }

function gradDuraklar() {
  const g = T.turetilmis['bg-gradient'];
  const a = coz(g.from), b = coz(g.to);
  const dizi = [];
  for (let i = 0; i < g.durak; i++) {
    const t = i / (g.durak - 1);
    dizi.push({
      t,
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    });
  }
  return dizi;
}
function gradCss() {
  const d = gradDuraklar();
  return d.map((s, i) =>
    '    #' + hk(s.r) + hk(s.g) + hk(s.b) + ' ' + Math.round(s.t * 100) + '%' + (i < d.length - 1 ? ',' : '')
  ).join('\n');
}
function gradXaml(girinti) {
  return gradDuraklar().map(s =>
    girinti + '<GradientStop Offset="' + s.t.toFixed(1) + '" Color="#FF' + HK(s.r) + HK(s.g) + HK(s.b) + '"/>'
  ).join('\n');
}

const xamlAd = { blue: 'NeonBlue', pink: 'NeonPink', purple: 'NeonPurple', 'pink-text': 'PinkText', 'purple-text': 'PurpleText' };
function merdivenXaml(girinti) {
  const m = T.turetilmis['ton-merdiveni'];
  const mt = T.turetilmis['metin-merdiveni'];
  const satir = (taban, adim) => {
    const anahtar = '"' + xamlAd[taban] + adim + '"';
    return girinti + '<SolidColorBrush x:Key=' + anahtar.padEnd(15) + 'Color="' + xa(taban, adim / 100) + '"/>';
  };
  const gruplar = m.tabanlar.map(taban => m.adimlar.map(adim => satir(taban, adim)).join('\n'));
  gruplar.push(mt.tabanlar.map(taban => mt.adimlar.map(adim => satir(taban, adim)).join('\n')).join('\n'));
  return gruplar.join('\n\n');
}

function glowCss(taban) {
  const g = T.turetilmis.glow;
  return '0 0 ' + g.blur + 'px ' + rgba(taban, g.alpha);
}
function glowCssHero() {
  const g = T.turetilmis['glow-hero'];
  return '0 0 ' + g.blur + 'px ' + rgba(g.ref, g.alpha);
}
function gx(ad) { const g = T.turetilmis[ad]; return xa(g.ref, g.alpha); }

function fontCss(ad) {
  const f = T.font[ad];
  const z = f['css-tirnak'] ? f.zincir.map(s => "'" + s + "'") : f.zincir;
  return z.join(', ') + ', ' + f['css-yedek'];
}
function fontCssGovde(ad) {
  const f = T.font[ad];
  return f.zincir.map(s => "'" + s + "'").join(', ') + ', ' + f['css-govde-yedek'];
}
function fontXaml(ad) { return T.font[ad].zincir.join(', '); }
function csAile(ad) { return T.font[ad].zincir.map(s => '"' + s + '"').join(', '); }

function sureCss(ad) {
  const ms = T.sure[ad].ms;
  return ms >= 1000 && ms % 1000 === 0 ? (ms / 1000) + 's' : ms + 'ms';
}
function sureXaml(ad) { return '0:0:' + (T.sure[ad].ms / 1000); }
function bez(ad) { return 'cubic-bezier(' + T.easing[ad].bezier.join(', ') + ')'; }
function splineAx(ad) {
  const b = T.easing[ad].bezier;
  return 'X1="' + b[0] + '" Y1="' + b[1] + '" X2="' + b[2] + '" Y2="' + b[3] + '"';
}


function cssUret() {
  return `/* Teknesyum Neon — tek kaynak. Değerleri projede override etme. */

@theme {
  --color-neon-blue: ${h('blue')};
  --color-neon-pink: ${h('pink')};
  --color-neon-purple: ${h('purple')};
  --color-neon-success: ${h('success')};
  --color-pink-text: ${h('pink-text')};
  --color-purple-text: ${h('purple-text')};
  --color-surface: ${h('surface')};
  --color-dark-glass: ${rgba('glass')};

  /* Anlamsal rol katmanı — Tailwind tarafı. \`--tk-*\` katmanı ile bu katman
     AYRI iki katmandır; birini güncelleyip ötekini bırakan \`bg-danger\` gibi bir
     yardımcı sınıfın eski hex'te kalmasına yol açar. İkisi birlikte gezilir ve
     denetimde eşitlikleri ölçülür (\`test/u4-renk.js\`).
     Rolün Tailwind karşılığı marka adını değil rol adını taşır: \`text-danger\`,
     \`border-warning\`. \`--color-neon-success\` rol adına çevrilmedi çünkü
     \`references/components.md\` ona adıyla bağlı; rol adı \`--tk-success\`'tedir. */
  --color-danger: ${h('danger')};
  --color-danger-text: ${h('danger-text')};
  --color-warning: ${h('warning')};

  /* Zincirin tek kaynağı SKILL §3'tür; buradaki sıra oradaki sırayla aynıdır.
     Atkinson Hyperlegible Next varsayılandır ve projeye gömülür, sistemde var
     sayılmaz. Gömülü değilse zincir Segoe UI'ye düşer — bu bir kabul değil, bir
     eksikliktir; gömme işi teslimin parçasıdır. */
  --font-sans: ${fontCss('sans')};
  --font-mono: ${fontCss('mono')};
}

:root {
  --tk-blue: ${h('blue')};
  --tk-pink: ${h('pink')};
  --tk-purple: ${h('purple')};
  --tk-success: ${h('success')};
  --tk-surface: ${h('surface')};
  --tk-bg-donus: ${sureCss('bg-donus')};
  --tk-bg-from: ${h('black')};
  --tk-bg-to: ${h('surface')};
  --tk-bg: linear-gradient(
    var(--tk-bg-aci, 160deg),
${gradCss()}
  );
  --tk-glass: ${rgba('glass')};

  --tk-pink-text: ${h('pink-text')};
  --tk-purple-text: ${h('purple-text')};

  /* --- anlamsal rol katmanı (SKILL §2) ---
     ROL KAZANIR. Durum bildiren her bileşen — hata metni, form doğrulama,
     uyarı kutusu, durum noktası, tehlike butonu — bu katmanı yazar. Marka ve
     dekor (glow, scrollbar, hero, başlık) marka tokenını yazmayı sürdürür.
     Rol tokenı marka tokenının DEĞERİNİ izler, kopyasını değil: hex elden
     yazılmaz, \`var()\` ile bağlanır. Tek istisna \`--tk-warning\` — marka
     üçlüsünde karşılığı yok, kendi hex'ini taşır.
     \`--tk-success\` yukarıda tanımlı ve zaten rol tokenıdır; ikinci ad
     verilmedi, çünkü iki adı olan tek değer er geç ayrışır.
     \`--tk-info\` BİLEREK YOK: bilgi kutusu bugün yok ve kullanılmayan token
     borçtur. Açılırsa maviye bağlanır (\`var(--tk-blue)\`) ve birincil butonla
     aynı ekranda info dolgusu kullanılmaz — ikisi de mavi dolgu olur, kullanıcı
     tıklanabilir olanı ayırt edemez. */
  --tk-danger: var(--tk-pink);
  /* Tehlikenin METİN rolü. Dolgu hex'i \`#ff00ea\` metinde 6.11:1 verir ve §2'nin
     7:1 eşiğinin altındadır; hata metni bu yüzden dolgu tokenını değil bunu
     yazar (7.33:1). Pembe/mor'un dolgu-metin ayrımı rol katmanında da sürer. */
  --tk-danger-text: var(--tk-pink-text);

  /* \`warning #fbbf24\` — YALNIZCA UYARI YÜZEYİ: metin, çerçeve, ikon.
     Dolgu ve buton yok. Kısıt \`success\`in kalıbının aynısıdır, yeni kalıp değil.
     Yasağın gerekçesi ölçüldü: amber dolgu üstünde beyaz metin 1.67:1 — çöker.
     Siyah metin 12.58:1 verirdi, ama dolguya izin veren bir kalıp yazının
     rengini her seferinde yeniden tartışmaya açar; uyarı yüzeyi metin, çerçeve
     ve ikonla kurulur.
     YERİNE NE KONUR: uyarı metni \`--tk-warning\` (12.58:1 / 11.94:1), çerçeve
     \`--tk-warning-border\` (\`#08090a\` üstünde 3.59:1 — 1.4.11'in 3:1 eşiğini
     geçer; pembe /50 2.17, mor /50 1.82 ile bu merdiveni TAŞIMIYORDU, amber
     taşıyor), ikon aynı renk. Eylem gerekiyorsa buton birincil (mavi) ya da
     \`danger\` (pembe) olur — uyarı rengi butona girmez.
     RENK TEK BAŞINA ANLAM TAŞIMAZ, amber için de baştan: amber ile \`success\`
     protanopide ΔE2000 15.2 ile ayrışmıyor (\`docs/olcumler/renk-korlugu.md\`).
     Uyarı satırı renge ek olarak ikon ya da metin taşır — istisnası yok.
     ŞERH: \`warning\` hex'i \`U9\` ΔE ölçümüne tabidir. Kötü çıkarsa değişecek olan
     bu iki satırdır; rol adı ve kısıt değişmez. */
  --tk-warning: ${h('warning')};
  --tk-warning-border: ${rgba('warning-border')};

  --tk-text: ${h('text')};
  --tk-text-label: ${h('text-label')};
  /* Devre dışı kontrol 7:1'den muaftır (SKILL §2) ve bu muafiyetin bedeli vardır:
     renk körü kullanıcı griyi göremez. Bu yüzden \`--tk-disabled\` tek başına
     kullanılmaz — devre dışı her kontrol griliğe ek olarak bir işaret taşır:
     \`title\`/\`ToolTip\` metni zorunludur, yanına \`cursor: not-allowed\` ve mümkünse
     bir ikon konur. Yalnız soluklaştırılmış kontrol eksik teslimdir. */
  --tk-disabled: ${h('disabled')};

  --tk-border: ${rgba('border')};
  --tk-border-strong: ${rgba('border-strong')};
  --tk-border-decorative: ${rgba('border-decorative')};

  /* Yarıçap tektir: 6px. Çelişki 23.08.2026'da \`layout.md\` lehine kapatıldı —
     yuvarlatılmış dikdörtgen daha küçük köşe alır (SKILL §5). Eski 16/12/8/6
     merdiveni kaldırıldı; aşağıdaki dört ad geriye dönük uyumluluk için durur ve
     hepsi aynı tek değere bakar. Tek istisna dairedir (\`?\` rozeti, slider thumb,
     durum noktası) — orada \`border-radius: 50%\`. */
  --tk-r: 6px;
  --tk-r-box: var(--tk-r);
  --tk-r-btn: var(--tk-r);
  --tk-r-cell: var(--tk-r);
  --tk-r-chip: var(--tk-r);

  /* Tipografi ölçeği — 1.25 major third, beş basamak. Ara boyut ekleme;
     gerekiyorsa ölçeğin kendisi tartışılır, tek bir kullanım yeri değil. */
  --tk-fs-1: 14px;
  --tk-fs-2: 16px;
  --tk-fs-3: 20px;
  --tk-fs-4: 24px;
  --tk-fs-5: 30px;

  --tk-lh-body: 1.5;
  --tk-lh-heading: 1.2;
  --tk-lh-mono: 1.4;
  --tk-measure: 65ch;

  --tk-tr-label: 0.15em;
  --tk-tr-h3: 0.05em;
  --tk-tr-h2: 0.02em;
  --tk-tr-hero: -0.01em;

  --tk-t-instant: ${sureCss('instant')};
  --tk-t-fast: ${sureCss('fast')};
  --tk-t-base: ${sureCss('base')};
  --tk-t-slow: ${sureCss('slow')};
  --tk-e-out: ${bez('out')};
  --tk-e-in: ${bez('in')};
  --tk-e-spring: ${bez('spring')};

  --tk-glow-blue: ${glowCss('blue')};
  --tk-glow-pink: ${glowCss('pink')};
  --tk-glow-purple: ${glowCss('purple')};
  /* Hero glow'u tek tokendır ve iki platformda aynı yoğunluğu verir:
     blur 8, opaklık 0.8. XAML karşılığı \`HeroGlow\` (Theme.xaml). */
  --tk-glow-hero: ${glowCssHero()};
}

@property --tk-bg-aci {
  syntax: '<angle>';
  inherits: false;
  initial-value: 160deg;
}

@keyframes tk-bg-donus {
  from { --tk-bg-aci: 150deg; }
  to   { --tk-bg-aci: 170deg; }
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-sans, ${fontCssGovde('sans')});
  font-size: var(--tk-fs-2);
  line-height: var(--tk-lh-body);
  /* Cümle içi sayı sans kalır ama hizalanır; veri sayısı \`.tk-mono\`'ya gider (§3). */
  font-variant-numeric: tabular-nums;
  color: var(--tk-text);
  background: var(--tk-bg);
  background-attachment: fixed;
  animation: tk-bg-donus var(--tk-bg-donus) linear infinite alternate;
}

/* --- tipografi --- */
.tk-h2 {
  font-size: var(--tk-fs-4); font-weight: 600;
  line-height: var(--tk-lh-heading); letter-spacing: var(--tk-tr-h2);
  color: var(--tk-blue);
}
.tk-h3 {
  font-size: var(--tk-fs-3); font-weight: 600;
  line-height: var(--tk-lh-heading); letter-spacing: var(--tk-tr-h3);
  color: var(--tk-text-label);
}
.tk-label {
  font-size: var(--tk-fs-1); font-weight: 600;
  line-height: var(--tk-lh-heading); letter-spacing: var(--tk-tr-label);
  color: var(--tk-text-label);
}
.tk-mono {
  font-family: var(--font-mono, monospace);
  font-size: var(--tk-fs-2); font-weight: 600;
  line-height: var(--tk-lh-mono);
  color: var(--tk-pink-text);
}
.tk-hero {
  font-family: var(--font-mono, monospace);
  font-size: var(--tk-fs-5); font-weight: 900;
  line-height: var(--tk-lh-heading); letter-spacing: var(--tk-tr-hero);
  color: var(--tk-blue); filter: drop-shadow(var(--tk-glow-hero));
}
.tk-hint {
  font-size: var(--tk-fs-1); line-height: var(--tk-lh-body); color: var(--tk-text);
}
/* Okunabilir satır uzunluğu. Uzun metin bloğu bu sınıfa sarılır (§3.2). */
.tk-prose { max-width: var(--tk-measure); line-height: var(--tk-lh-body); }
/* h3'ü etiketten ayıran ikinci sinyal — boyut yetmediğinde (§3). */
.tk-h3-rule { border-bottom: 1px solid var(--tk-border-decorative); padding-bottom: 8px; }

/* --- yüzeyler --- */
.tk-panel {
  background: ${rgba('panel')};
  backdrop-filter: blur(16px);
  border: 1px solid var(--tk-border);
  border-radius: var(--tk-r);
  padding: 24px;
  box-shadow: 0 0 40px ${rgba('black', 0.8)};
}
.tk-divider { border: 0; border-top: 1px solid var(--tk-border-decorative); margin: 24px 0; }

/* --- odak: cift katman, gecissiz, yalniz klavye modalitesinde --- */
:focus-visible {
  outline: 2px solid var(--tk-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px ${h('black')};
  transition: none;
}
:focus:not(:focus-visible) { outline: none; }
[data-tk-scroll-target] { scroll-margin-top: 40px; scroll-margin-bottom: 24px; }

/* --- butonlar --- */
.tk-btn {
  font-weight: 600; letter-spacing: var(--tk-tr-h2);
  font-size: var(--tk-fs-2); line-height: var(--tk-lh-heading);
  padding: 14px 20px; border-radius: var(--tk-r);
  border: 1px solid transparent; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 12px;
  transition: transform var(--tk-t-instant) var(--tk-e-out),
              background-color var(--tk-t-instant) var(--tk-e-out),
              border-color var(--tk-t-instant) var(--tk-e-out);
}
.tk-btn:hover { transform: scale(1.02); }
.tk-btn:active { transform: scale(0.98); transition-duration: var(--tk-t-instant); }
.tk-btn-primary   { background: var(--tk-blue);   color: #000; box-shadow: var(--tk-glow-blue); }
.tk-btn-primary:hover   { background: ${rgba('blue', 0.8)}; }
/* Sınıf adı zaten rol dilindeydi; içi de rol tokenına geçti. Hale marka
   tokenında kalır — glow dekordur, durum bildirmez. */
.tk-btn-danger    { background: var(--tk-danger); color: #000; box-shadow: var(--tk-glow-pink); }
.tk-btn-danger:hover    { background: ${rgba('pink', 0.8)}; }
.tk-btn-ghost {
  background: ${rgba('purple', 0.1)};
  border-color: var(--tk-purple-text);
  color: var(--tk-purple-text);
}
.tk-btn-ghost:hover { background: ${rgba('purple', 0.2)}; }
/* Devre dışı hâl yalnız solmakla bitmez: \`title\` metni zorunludur (§2). */
.tk-btn:disabled {
  color: var(--tk-disabled);
  background: transparent;
  border-color: var(--tk-disabled);
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* --- scrollbar --- */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: ${rgba('black', 0.3)}; border-radius: 4px; }
::-webkit-scrollbar-thumb {
  background: var(--tk-purple); border-radius: 4px;
  box-shadow: 0 0 10px var(--tk-purple);
  /* §5.4 \`box-shadow\` animasyonunu adıyla yasaklıyor ve istisnası yok; hale duruk
     kalır, yalnız dolgu rengi geçer. Denetimde ölçüldü (23.08.2026). */
  transition: background-color var(--tk-t-instant) var(--tk-e-out);
}
::-webkit-scrollbar-thumb:hover {
  background: var(--tk-pink); box-shadow: 0 0 10px var(--tk-pink);
}

/* --- baslik cubugu ve imza (§4) --- */
.tk-titlebar { -webkit-app-region: drag; }
.tk-titlebar a,
.tk-titlebar button,
.tk-no-drag { -webkit-app-region: no-drag; }

/* --- durum noktasi: renk tek basina anlam tasimaz (WCAG 1.4.1, §2) --- */
.tk-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.tk-dot-on  { background: var(--tk-success); border: 0; }
/* Durum bildiriyor, marka değil — rol tokenı yazar. Şekil farkı (dolu daire /
   halka) rengin yanındaki ikinci taşıyıcıdır; renk kalksa da bilgi durur. */
.tk-dot-off { background: transparent; border: 2px solid var(--tk-danger); }

/* --- uyari yuzeyi (§2) ---
   \`.tk-panel\` uzerine modifier olarak kullanilir: <div class="tk-panel tk-warn">.
   DOLGU YOK — panel zemini \`surface\` kalir, degisen sey cerceve ve metin rengi.
   Kutu renge ek olarak bir ikon ya da "Uyari" metni tasimak zorunda; amber ile
   success protanopide ayrismiyor (yukaridaki olcum). */
.tk-warn { border-color: var(--tk-warning-border); color: var(--tk-warning); }
/* Uyari metni tek basina, kutusuz da kullanilabilir. Glow yok: metne glow
   verilmez (§2), tek istisna hero sayidir. */
.tk-warn-text { color: var(--tk-warning); }
/* Hata metni dolgu pembesini degil metin pembesini yazar — 7:1 esigi. */
.tk-danger-text { color: var(--tk-danger-text); }

/* --- hareket: azaltilmis hareket ayari (ayrinti: references/motion.md) --- */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-property: opacity !important;
    transition-duration: var(--tk-t-instant) !important;
  }
  *, *::before, *::after { transform: none !important; }
}
`;
}

function xamlUret() {
  return `<!-- Teknesyum Neon — WPF. App.xaml > Application.Resources > MergedDictionaries içine ekle. -->
<ResourceDictionary xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
                    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml">

  <Color x:Key="NeonBlueColor">${x('blue')}</Color>
  <Color x:Key="NeonPinkColor">${x('pink')}</Color>
  <Color x:Key="NeonPurpleColor">${x('purple')}</Color>
  <Color x:Key="PinkTextColor">${x('pink-text')}</Color>
  <Color x:Key="PurpleTextColor">${x('purple-text')}</Color>

  <SolidColorBrush x:Key="NeonBlue"    Color="${x('blue')}"/>
  <SolidColorBrush x:Key="NeonPink"    Color="${x('pink')}"/>
  <SolidColorBrush x:Key="NeonPurple"  Color="${x('purple')}"/>
  <SolidColorBrush x:Key="Success"     Color="${x('success')}"/>
  <SolidColorBrush x:Key="Surface"     Color="${xa('panel')}"/>
  <SolidColorBrush x:Key="AppBg"       Color="${x('black')}"/>

  <!-- Pencere zemini: duz renk degil, 11 durakli yumusak gradient (SKILL §2). -->
  <LinearGradientBrush x:Key="AppBgGradient" x:Shared="False"
                       StartPoint="0,0" EndPoint="0.6,1"
                       ColorInterpolationMode="ScRgbLinearInterpolation">
${gradXaml('    ')}
  </LinearGradientBrush>

  <Storyboard x:Key="AppBgDonus" RepeatBehavior="Forever" AutoReverse="True">
    <PointAnimation Storyboard.TargetProperty="Background.EndPoint"
                    From="0.5,1" To="0.7,1" Duration="${sureXaml('bg-donus')}"/>
  </Storyboard>

  <SolidColorBrush x:Key="PinkText"   Color="${x('pink-text')}"/>
  <SolidColorBrush x:Key="PurpleText" Color="${x('purple-text')}"/>

  <!-- ANLAMSAL ROL KATMANI (SKILL §2).
       ROL KAZANIR: durum bildiren her kontrol (hata metni, form dogrulama,
       uyari kutusu, durum noktasi, tehlike dugmesi) bu fircalari yazar. Marka
       ve dekor (glow, scrollbar, hero, baslik) marka fircasini yazmayi surdurur.
       XAML'da takma ad yoktur; her rol AYRI bir firca nesnesidir ve marka
       fircasiyla ayni hex'i tasir. Tek dogruluk kaynagi hex tablosudur, hex
       elden degistirilmez; esitlik denetimde olculur (test/u4-renk.js).
       \`Success\` fircasi 23.08.2026'da \`NeonSuccess\` adindan cevrildi: success bir
       marka rengi degil, bir roldur. Ayni cevrim Theme.axaml'da da yapilmali
       (U7'nin dosyasi).
       \`Info\` BILEREK YOK: bilgi kutusu bugun yok, kullanilmayan token borctur.
       Acilirsa maviye baglanir ve birincil dugmeyle ayni ekranda info dolgusu
       kullanilmaz. -->
  <SolidColorBrush x:Key="Danger"     Color="${x('danger')}"/>
  <!-- Tehlikenin METIN rolu. Dolgu hex'i metinde 6.11:1 verir, 7:1 esiginin
       altinda; hata metni bu fircayi yazar (7.33:1). -->
  <SolidColorBrush x:Key="DangerText" Color="${x('danger-text')}"/>

  <!-- warning #FBBF24 — YALNIZCA UYARI YUZEYI: metin, cerceve, ikon.
       DOLGU VE DUGME YOK. Kisit success'in kalibinin aynisidir.
       Yasagin gerekcesi olculdu: amber dolgu ustunde beyaz metin 1.67:1, coker.
       YERINE NE KONUR: uyari metni \`Warning\` (12.58:1 / 11.94:1), cerceve
       \`Warning50\` (#08090a ustunde 3.59:1, 3:1 esigini gecer), ikon ayni renk.
       Eylem gerekiyorsa dugme birincil (mavi) ya da \`Danger\` (pembe) olur.
       RENK TEK BASINA ANLAM TASIMAZ, amber icin de bastan: amber ile success
       protanopide dE2000 15.2 ile ayrismiyor (docs/olcumler/renk-korlugu.md).
       Uyari satiri renge ek olarak ikon ya da metin tasir.
       SERH: bu hex U9 dE olcumune tabidir. -->
  <SolidColorBrush x:Key="Warning"    Color="${x('warning')}"/>
  <SolidColorBrush x:Key="Warning50"  Color="${xa('warning-border')}"/>

  <SolidColorBrush x:Key="TextBody"  Color="${x('text')}"/>
  <SolidColorBrush x:Key="TextLabel" Color="${x('text-label')}"/>
  <!-- Devre disi kontrol 7:1'den muaftir (SKILL §2) ve bedeli vardir: renk koru
       kullanici griyi goremez. Bu firca tek basina kullanilmaz — devre disi her
       kontrol grilige ek bir isaret tasir: ToolTip metni ZORUNLU, yaninda
       Cursor="No" ve mumkunse bir ikon. Yalniz soluklastirilmis kontrol eksik
       teslimdir. "Soluk metin" fircasi 23.08.2026'da silindi: beyazla birebir ayni
       degeri tasiyordu ve iki adi olan tek deger er gec ayrisir. Ikincil metin
       icin cozum gri degil, metni silmektir (SKILL §2, "ara gri yok"). -->
  <SolidColorBrush x:Key="Disabled"  Color="${x('disabled')}"/>

${merdivenXaml('  ')}

  <SolidColorBrush x:Key="BorderDefault"    Color="${xa('border')}"/>
  <SolidColorBrush x:Key="BorderStrong"     Color="${xa('border-strong')}"/>
  <SolidColorBrush x:Key="BorderDecorative" Color="${xa('border-decorative')}"/>

  <!-- Zincirin tek kaynagi SKILL §3'tur; sira orayla ayni. Atkinson Hyperlegible
       Next varsayilandir ve projeye GOMULUR (pack URI), sistemde var sayilmaz. -->
  <FontFamily x:Key="FontSans">${fontXaml('sans')}</FontFamily>
  <FontFamily x:Key="FontMono">${fontXaml('mono')}</FontFamily>

  <Duration x:Key="TInstant">${sureXaml('instant')}</Duration>
  <Duration x:Key="TFast">${sureXaml('fast')}</Duration>
  <Duration x:Key="TBase">${sureXaml('base')}</Duration>
  <Duration x:Key="TSlow">${sureXaml('slow')}</Duration>
  <!-- Hero glow: CSS tokeni \`tk-glow-hero\` ile ayni yogunluk — blur 8, opaklik 0.8. -->
  <DropShadowEffect x:Key="HeroGlow" x:Shared="False" Color="${x('blue')}"
                    BlurRadius="${T.turetilmis['glow-hero'].blur}" ShadowDepth="0" Opacity="${T.turetilmis['glow-hero'].alpha}"/>

  <CubicEase x:Key="EOut" EasingMode="EaseOut"/>
  <CubicEase x:Key="EIn" EasingMode="EaseIn"/>

  <Style x:Key="{x:Static SystemParameters.FocusVisualStyleKey}">
    <Setter Property="Control.Template">
      <Setter.Value>
        <ControlTemplate>
          <Grid Margin="-5" SnapsToDevicePixels="True" UseLayoutRounding="True">
            <!-- Yaricap 6 DIP tabanindan turetildi: ic katman ogenin 1 DIP disinda
                 (6+1=7), dis katman 3 DIP disinda (6+3=9). Elle secilmis sayi degil. -->
            <Rectangle Margin="4" RadiusX="7" RadiusY="7"
                       Stroke="${x('black')}" StrokeThickness="2"/>
            <Rectangle Margin="2" RadiusX="9" RadiusY="9"
                       Stroke="${x('blue')}" StrokeThickness="2"/>
          </Grid>
        </ControlTemplate>
      </Setter.Value>
    </Setter>
  </Style>

  <!-- Olcek 1.25 major third: 14 / 16 / 20 / 24 / 30 DIP. Satir yuksekligi
       LineHeight + LineStackingStrategy="BlockLineHeight" ile kurulur; ikincisi
       yazilmazsa WPF satir kutusunu en uzun harfe gore buyutur ve CSS'ten ayrisir.
       Agirlik: baslik ve etiket SemiBold (600), yalniz hero Black (900).
       TRACKING TELAFISI: WPF'te harf araligi yok. CSS h2 0.02em, h3 0.05em, etiket
       0.15em uygular; burada uygulanamaz. Telafi SKILL §3'te yazili — WPF'te etiketi
       govdeden ayiran sey boyut, agirlik ve renktir, aralik degil. Attached behavior
       yazilirsa telafi kalkar ve CSS degerleri birebir kullanilir. -->

  <Style x:Key="H2" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
    <Setter Property="FontSize" Value="24"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="LineHeight" Value="29"/>
    <Setter Property="LineStackingStrategy" Value="BlockLineHeight"/>
    <Setter Property="Foreground" Value="{StaticResource NeonBlue}"/>
  </Style>

  <Style x:Key="H3" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
    <Setter Property="FontSize" Value="20"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="LineHeight" Value="24"/>
    <Setter Property="LineStackingStrategy" Value="BlockLineHeight"/>
    <Setter Property="Foreground" Value="{StaticResource TextLabel}"/>
  </Style>

  <Style x:Key="Label" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
    <Setter Property="FontSize" Value="14"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="LineHeight" Value="17"/>
    <Setter Property="LineStackingStrategy" Value="BlockLineHeight"/>
    <Setter Property="Foreground" Value="{StaticResource TextLabel}"/>
  </Style>

  <Style x:Key="Body" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
    <Setter Property="FontSize" Value="16"/>
    <Setter Property="LineHeight" Value="24"/>
    <Setter Property="LineStackingStrategy" Value="BlockLineHeight"/>
    <Setter Property="Typography.NumeralAlignment" Value="Tabular"/>
    <Setter Property="Foreground" Value="{StaticResource TextBody}"/>
  </Style>

  <!-- Yardim / ipucu metni. CSS karsiligi .tk-hint. -->
  <Style x:Key="Hint" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
    <Setter Property="FontSize" Value="14"/>
    <Setter Property="LineHeight" Value="21"/>
    <Setter Property="LineStackingStrategy" Value="BlockLineHeight"/>
    <Setter Property="Typography.NumeralAlignment" Value="Tabular"/>
    <Setter Property="TextWrapping" Value="Wrap"/>
    <Setter Property="Foreground" Value="{StaticResource TextBody}"/>
  </Style>

  <Style x:Key="Hero" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource FontMono}"/>
    <Setter Property="FontSize" Value="30"/>
    <Setter Property="FontWeight" Value="Black"/>
    <Setter Property="LineHeight" Value="36"/>
    <Setter Property="LineStackingStrategy" Value="BlockLineHeight"/>
    <Setter Property="Foreground" Value="{StaticResource NeonBlue}"/>
    <Setter Property="Effect" Value="{StaticResource HeroGlow}"/>
  </Style>

  <Style x:Key="MonoValue" TargetType="TextBlock">
    <Setter Property="FontFamily" Value="{StaticResource FontMono}"/>
    <Setter Property="FontSize" Value="16"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="LineHeight" Value="22"/>
    <Setter Property="LineStackingStrategy" Value="BlockLineHeight"/>
    <Setter Property="Foreground" Value="{StaticResource PinkText}"/>
  </Style>

  <Style x:Key="Panel" TargetType="Border">
    <Setter Property="Background" Value="{StaticResource Surface}"/>
    <Setter Property="BorderBrush" Value="{StaticResource BorderDefault}"/>
    <Setter Property="BorderThickness" Value="1"/>
    <Setter Property="CornerRadius" Value="6"/>
    <Setter Property="Padding" Value="24"/>
  </Style>

  <!-- Uyari yuzeyi. \`Panel\`den turer, degisen tek sey cercevedir: zemin
       \`Surface\` kalir cunku amber dolgu yasaktir. Kutunun icine renge ek olarak
       bir ikon ya da "Uyari" metni konur. -->
  <Style x:Key="WarningPanel" TargetType="Border" BasedOn="{StaticResource Panel}">
    <Setter Property="BorderBrush" Value="{StaticResource Warning50}"/>
  </Style>

  <!-- Uyari metni. Glow yok: metne glow verilmez (SKILL §2), tek istisna hero. -->
  <Style x:Key="WarningBody" TargetType="TextBlock" BasedOn="{StaticResource Body}">
    <Setter Property="Foreground" Value="{StaticResource Warning}"/>
  </Style>

  <!-- Hata metni dolgu pembesini degil metin pembesini yazar — 7:1 esigi. -->
  <Style x:Key="DangerBody" TargetType="TextBlock" BasedOn="{StaticResource Body}">
    <Setter Property="Foreground" Value="{StaticResource DangerText}"/>
  </Style>

  <Style x:Key="PrimaryButton" TargetType="Button">
    <Setter Property="Background" Value="{StaticResource NeonBlue}"/>
    <Setter Property="Foreground" Value="Black"/>
    <Setter Property="FontWeight" Value="SemiBold"/>
    <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
    <Setter Property="Padding" Value="20,14"/>
    <Setter Property="BorderThickness" Value="0"/>
    <Setter Property="Cursor" Value="Hand"/>
    <Setter Property="Template">
      <Setter.Value>
        <ControlTemplate TargetType="Button">
          <Border x:Name="bd" Background="{TemplateBinding Background}" CornerRadius="6"
                  Padding="{TemplateBinding Padding}" RenderTransformOrigin="0.5,0.5">
            <Border.RenderTransform>
              <ScaleTransform ScaleX="1" ScaleY="1"/>
            </Border.RenderTransform>
            <Border.Effect>
              <DropShadowEffect Color="{StaticResource NeonBlueColor}" BlurRadius="${T.turetilmis['glow-buton'].blur}" ShadowDepth="0" Opacity="${T.turetilmis['glow-buton'].alpha}"/>
            </Border.Effect>
            <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
          </Border>
          <ControlTemplate.Triggers>
            <Trigger Property="IsMouseOver" Value="True">
              <Trigger.EnterActions>
                <BeginStoryboard>
                  <Storyboard>
                    <DoubleAnimation Storyboard.TargetName="bd" Storyboard.TargetProperty="Opacity"
                                     To="0.85" Duration="{StaticResource TInstant}"
                                     EasingFunction="{StaticResource EOut}"/>
                  </Storyboard>
                </BeginStoryboard>
              </Trigger.EnterActions>
              <Trigger.ExitActions>
                <BeginStoryboard>
                  <Storyboard>
                    <DoubleAnimation Storyboard.TargetName="bd" Storyboard.TargetProperty="Opacity"
                                     To="1" Duration="{StaticResource TInstant}"
                                     EasingFunction="{StaticResource EIn}"/>
                  </Storyboard>
                </BeginStoryboard>
              </Trigger.ExitActions>
            </Trigger>
            <Trigger Property="IsPressed" Value="True">
              <Trigger.EnterActions>
                <BeginStoryboard>
                  <Storyboard>
                    <DoubleAnimation Storyboard.TargetName="bd" To="0.98" Duration="{StaticResource TInstant}"
                                     Storyboard.TargetProperty="(UIElement.RenderTransform).(ScaleTransform.ScaleX)"/>
                    <DoubleAnimation Storyboard.TargetName="bd" To="0.98" Duration="{StaticResource TInstant}"
                                     Storyboard.TargetProperty="(UIElement.RenderTransform).(ScaleTransform.ScaleY)"/>
                  </Storyboard>
                </BeginStoryboard>
              </Trigger.EnterActions>
              <Trigger.ExitActions>
                <BeginStoryboard>
                  <Storyboard>
                    <DoubleAnimation Storyboard.TargetName="bd" To="1" Duration="{StaticResource TInstant}"
                                     Storyboard.TargetProperty="(UIElement.RenderTransform).(ScaleTransform.ScaleX)"/>
                    <DoubleAnimation Storyboard.TargetName="bd" To="1" Duration="{StaticResource TInstant}"
                                     Storyboard.TargetProperty="(UIElement.RenderTransform).(ScaleTransform.ScaleY)"/>
                  </Storyboard>
                </BeginStoryboard>
              </Trigger.ExitActions>
            </Trigger>
            <Trigger Property="IsEnabled" Value="False">
              <Setter TargetName="bd" Property="Background" Value="Transparent"/>
              <Setter TargetName="bd" Property="BorderBrush" Value="{StaticResource Disabled}"/>
              <Setter TargetName="bd" Property="BorderThickness" Value="1"/>
              <Setter TargetName="bd" Property="Effect" Value="{x:Null}"/>
              <Setter Property="Foreground" Value="{StaticResource Disabled}"/>
              <Setter Property="Cursor" Value="No"/>
            </Trigger>
          </ControlTemplate.Triggers>
        </ControlTemplate>
      </Setter.Value>
    </Setter>
  </Style>

</ResourceDictionary>
`;
}

function axamlUret() {
  return `<!-- Teknesyum Neon, Avalonia 11. Kok eleman Styles'tir, ResourceDictionary degil:
     kaynaklar Styles.Resources icinde, genel kurallar Style Selector olarak asagida.
     Baglama:
       <Application.Styles>
         <FluentTheme/>
         <StyleInclude Source="avares://Uygulama/Assets/Theme.axaml"/>
       </Application.Styles>
     Kullanim: Theme="{StaticResource H2}" (WPF'teki Style="{StaticResource H2}" yerine).
     Ayrinti ve kural gerekcesi: references/avalonia.md -->
<Styles xmlns="https://github.com/avaloniaui"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:sys="clr-namespace:System;assembly=netstandard">

  <Styles.Resources>

    <Color x:Key="NeonBlueColor">${x('blue')}</Color>
    <Color x:Key="NeonPinkColor">${x('pink')}</Color>
    <Color x:Key="NeonPurpleColor">${x('purple')}</Color>
    <Color x:Key="PinkTextColor">${x('pink-text')}</Color>
    <Color x:Key="PurpleTextColor">${x('purple-text')}</Color>

    <SolidColorBrush x:Key="NeonBlue"    Color="${x('blue')}"/>
    <SolidColorBrush x:Key="NeonPink"    Color="${x('pink')}"/>
    <SolidColorBrush x:Key="NeonPurple"  Color="${x('purple')}"/>
    <SolidColorBrush x:Key="Success"     Color="${x('success')}"/>
    <SolidColorBrush x:Key="Surface"     Color="${xa('panel')}"/>
    <SolidColorBrush x:Key="AppBg"       Color="${x('black')}"/>

    <!-- Pencere zemini: duz renk degil, 11 durakli yumusak gradient (SKILL §2).
         Iki fark var, ikisi de bilincli:
         1) Avalonia'da x:Shared yok. Kaynak tek ornek olarak paylasilir; asagidaki
            zemin animasyonu fircayi degil katmanin RenderTransform'unu oynattigi icin
            paylasim sorun cikarmaz.
         2) Avalonia'da ColorInterpolationMode yok, sRGB enterpolasyonu zorunlu.
            WPF ScRgbLinearInterpolation ile birebir ayni degil; 11 durak zaten
            bantlasmayi kapatmak icin var, gorunur fark olcumlenmedi
            (varsayilan, olculmedi). -->
    <LinearGradientBrush x:Key="AppBgGradient"
                         StartPoint="0%,0%" EndPoint="60%,100%">
${gradXaml('      ')}
    </LinearGradientBrush>

    <!-- WPF'teki AppBgDonus storyboard'unun kaynak karsiligi YOK, bilerek yok.
         Avalonia'da Animation bir kaynak degil, Style.Animations icinde yasar ve
         bir firca alt ozelligini (Background.EndPoint) enterpole edecek animator
         bulunmuyor. Karsiligi asagidaki "Window.anim Panel.appbg" kuralidir. -->

    <SolidColorBrush x:Key="PinkText"   Color="${x('pink-text')}"/>
    <SolidColorBrush x:Key="PurpleText" Color="${x('purple-text')}"/>

    <!-- ANLAMSAL ROL KATMANI (SKILL §2). Theme.xaml ile birebir ayni, gerekcesi
         orada yazili ve burada tekrar edilmiyor; hex tek dogruluk kaynagindan
         gelir, elden degistirilmez. Success fircasi 23.08.2026'da NeonSuccess
         adindan cevrildi ve bu dosya cevrilmis adi tasiyor. -->
    <SolidColorBrush x:Key="Danger"     Color="${x('danger')}"/>
    <SolidColorBrush x:Key="DangerText" Color="${x('danger-text')}"/>
    <SolidColorBrush x:Key="Warning"    Color="${x('warning')}"/>
    <SolidColorBrush x:Key="Warning50"  Color="${xa('warning-border')}"/>

    <SolidColorBrush x:Key="TextBody"  Color="${x('text')}"/>
    <SolidColorBrush x:Key="TextLabel" Color="${x('text-label')}"/>
    <!-- Devre disi kontrol 7:1'den muaftir (SKILL §2) ve bedeli vardir: renk koru
         kullanici griyi goremez. Bu firca tek basina kullanilmaz; devre disi her
         kontrol grilige ek bir isaret tasir: ToolTip.Tip metni ZORUNLU, yaninda
         Cursor="No" ve mumkunse bir ikon. Yalniz soluklastirilmis kontrol eksik
         teslimdir. Ikincil metin icin cozum gri degil, metni silmektir. -->
    <SolidColorBrush x:Key="Disabled"  Color="${x('disabled')}"/>

${merdivenXaml('    ')}

    <SolidColorBrush x:Key="BorderDefault"    Color="${xa('border')}"/>
    <SolidColorBrush x:Key="BorderStrong"     Color="${xa('border-strong')}"/>
    <SolidColorBrush x:Key="BorderDecorative" Color="${xa('border-decorative')}"/>

    <!-- Zincirin tek kaynagi SKILL §3'tur; sira orayla ayni. Atkinson Hyperlegible
         Next varsayilandir ve projeye GOMULUR, sistemde var sayilmaz. Avalonia'da
         gomme yolu pack URI degil avares URI'dir; ornek references/avalonia.md'de. -->
    <FontFamily x:Key="FontSans">${fontXaml('sans')}</FontFamily>
    <FontFamily x:Key="FontMono">${fontXaml('mono')}</FontFamily>

    <!-- Avalonia'da Duration diye bir kaynak tipi yok; Transition.Duration ve
         Animation.Duration TimeSpan alir. Ad birebir korundu, tip degisti. -->
    <sys:TimeSpan x:Key="TInstant">${sureXaml('instant')}</sys:TimeSpan>
    <sys:TimeSpan x:Key="TFast">${sureXaml('fast')}</sys:TimeSpan>
    <sys:TimeSpan x:Key="TBase">${sureXaml('base')}</sys:TimeSpan>
    <sys:TimeSpan x:Key="TSlow">${sureXaml('slow')}</sys:TimeSpan>

    <!-- Hero glow: CSS tokeni tk-glow-hero ile ayni yogunluk, blur 8, opaklik 0.8.
         Konsey bu adi yasak dizgi listesine koymustu; gerekcesi WPF artigi
         yakalamakti. Avalonia 11'de DropShadowEffect gercek bir API ve metne glow
         veren tek yol bu. Sapma sozlesmenin Cikti bolumunde yazili. WPF'e ozgu
         ShadowDepth ozelligi burada YOK ve test onu ariyor. -->
    <DropShadowEffect x:Key="HeroGlow" Color="${x('blue')}"
                      BlurRadius="${T.turetilmis['glow-hero'].blur}" OffsetX="0" OffsetY="0" Opacity="${T.turetilmis['glow-hero'].alpha}"/>

    <!-- SKILL §5.4 tokenlari: e-out cubic-bezier(0.2,0,0,1), e-in (0.4,0,1,1).
         SplineEasing CSS egrisini birebir tasir. Surumunuzde SplineEasing yoksa
         karsiligi <CubicEaseOut/> ve <CubicEaseIn/> olur, egri yaklasik kalir. -->
    <SplineEasing x:Key="EOut" ${splineAx('out')}/>
    <SplineEasing x:Key="EIn"  ${splineAx('in')}/>

    <!-- Olcek 1.25 major third: 14 / 16 / 20 / 24 / 30 DIP.
         LineStackingStrategy Avalonia'da yok ve gerekmiyor: LineHeight burada
         zaten kutu yuksekligi gibi davraniyor, WPF'in aksine CSS'e yakin.
         Agirlik: baslik ve etiket SemiBold (600), yalniz hero Black (900).
         TRACKING TELAFISI: Avalonia'da harf araligi VAR (TextBlock.LetterSpacing,
         DIP cinsinden, em degil). CSS h2 0.02em, h3 0.05em, etiket 0.15em uygular.
         Buraya YAZILMADI: em'den DIP'e cevrim punto basina degisir (etiket 14px
         icin 0.15em = 2.1 DIP) ve bu deger olculmeden konursa uc platform ayrisir.
         WPF telafisi (boyut, agirlik, renk) burada da gecerli; LetterSpacing eklemek
         isteyen once SKILL §3'u guncellesin, sonra uc sablonu birlikte gezsin. -->

    <ControlTheme x:Key="H2" TargetType="TextBlock">
      <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
      <Setter Property="FontSize" Value="24"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="LineHeight" Value="29"/>
      <Setter Property="Foreground" Value="{StaticResource NeonBlue}"/>
    </ControlTheme>

    <ControlTheme x:Key="H3" TargetType="TextBlock">
      <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
      <Setter Property="FontSize" Value="20"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="LineHeight" Value="24"/>
      <Setter Property="Foreground" Value="{StaticResource TextLabel}"/>
    </ControlTheme>

    <ControlTheme x:Key="Label" TargetType="TextBlock">
      <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="LineHeight" Value="17"/>
      <Setter Property="Foreground" Value="{StaticResource TextLabel}"/>
    </ControlTheme>

    <!-- Tabular rakam: WPF Typography.NumeralAlignment="Tabular" karsiligi
         FontFeatures="+tnum" (Avalonia 11.1+). SURUM TEYIDI YAPILMADI, bu yuzden
         satir KAPALI birakildi: ozellik yoksa XAML hic yuklenmez ve tema tumden
         duser. Secilen ikame mono: hizalanmasi gereken her sayi MonoValue temasiyla
         yazilir (SKILL §3, "her sayi mono"). Hedef surumu dogruladiysan asagidaki
         satiri Body ve Hint icinde ac:
           <Setter Property="FontFeatures" Value="+tnum"/> -->

    <ControlTheme x:Key="Body" TargetType="TextBlock">
      <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
      <Setter Property="FontSize" Value="16"/>
      <Setter Property="LineHeight" Value="24"/>
      <Setter Property="Foreground" Value="{StaticResource TextBody}"/>
    </ControlTheme>

    <!-- Yardim / ipucu metni. CSS karsiligi .tk-hint. -->
    <ControlTheme x:Key="Hint" TargetType="TextBlock">
      <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
      <Setter Property="FontSize" Value="14"/>
      <Setter Property="LineHeight" Value="21"/>
      <Setter Property="TextWrapping" Value="Wrap"/>
      <Setter Property="Foreground" Value="{StaticResource TextBody}"/>
    </ControlTheme>

    <ControlTheme x:Key="Hero" TargetType="TextBlock">
      <Setter Property="FontFamily" Value="{StaticResource FontMono}"/>
      <Setter Property="FontSize" Value="30"/>
      <Setter Property="FontWeight" Value="Black"/>
      <Setter Property="LineHeight" Value="36"/>
      <Setter Property="Foreground" Value="{StaticResource NeonBlue}"/>
      <!-- Metne glow verilen tek rol budur (SKILL §2). -->
      <Setter Property="Effect" Value="{StaticResource HeroGlow}"/>
    </ControlTheme>

    <ControlTheme x:Key="MonoValue" TargetType="TextBlock">
      <Setter Property="FontFamily" Value="{StaticResource FontMono}"/>
      <Setter Property="FontSize" Value="16"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="LineHeight" Value="22"/>
      <Setter Property="Foreground" Value="{StaticResource PinkText}"/>
    </ControlTheme>

    <ControlTheme x:Key="Panel" TargetType="Border">
      <Setter Property="Background" Value="{StaticResource Surface}"/>
      <Setter Property="BorderBrush" Value="{StaticResource BorderDefault}"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="CornerRadius" Value="6"/>
      <Setter Property="Padding" Value="24"/>
    </ControlTheme>

    <!-- Uyari yuzeyi. Panel'den turer, degisen tek sey cercevedir: zemin Surface
         kalir cunku amber dolgu yasaktir. Kutunun icine renge ek olarak bir ikon
         ya da "Uyari" metni konur. Avalonia'da BasedOn ControlTheme'de de var. -->
    <ControlTheme x:Key="WarningPanel" TargetType="Border"
                  BasedOn="{StaticResource Panel}">
      <Setter Property="BorderBrush" Value="{StaticResource Warning50}"/>
    </ControlTheme>

    <!-- Uyari metni. Glow yok: metne glow verilmez (SKILL §2), tek istisna hero. -->
    <ControlTheme x:Key="WarningBody" TargetType="TextBlock"
                  BasedOn="{StaticResource Body}">
      <Setter Property="Foreground" Value="{StaticResource Warning}"/>
    </ControlTheme>

    <!-- Hata metni dolgu pembesini degil metin pembesini yazar, 7:1 esigi. -->
    <ControlTheme x:Key="DangerBody" TargetType="TextBlock"
                  BasedOn="{StaticResource Body}">
      <Setter Property="Foreground" Value="{StaticResource DangerText}"/>
    </ControlTheme>

    <!-- U1 DERSININ AVALONIA KARSILIGI.
         WPF'te ScaleTransform'u Style Setter degeri olarak vermek iki hataya yol
         acmisti: nesne butun ornekler arasinda paylasilir ve muhurlenince yazilamaz.
         Avalonia'da Freezable ve muhurleme yok, yani o tuzak yok; ama akrabasi var,
         Setter degeri olarak verilen bir transform nesnesi yine paylasilir.
         Kacinma dogal: bu dosyada RenderTransform'a HICBIR YERDE nesne verilmiyor.
         Deger her zaman metindir ("scale(0.98)", "none") ve TransformOperations
         olarak her ogeye ayri ayri cozulur. Ayni kural sana da gecerli:
         <Setter Property="RenderTransform"><ScaleTransform .../></Setter> yazma. -->
    <ControlTheme x:Key="PrimaryButton" TargetType="Button">
      <Setter Property="Background" Value="{StaticResource NeonBlue}"/>
      <Setter Property="Foreground" Value="Black"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="FontFamily" Value="{StaticResource FontSans}"/>
      <Setter Property="Padding" Value="20,14"/>
      <Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="HorizontalContentAlignment" Value="Center"/>
      <Setter Property="VerticalContentAlignment" Value="Center"/>
      <Setter Property="Template">
        <ControlTemplate TargetType="Button">
          <!-- Glow kutuya verilir (SKILL §2). WPF karsiligi DropShadowEffect
               BlurRadius=20 Opacity=0.35; BoxShadow'da opaklik ayri ozellik degil,
               renk alfasidir: 0.35 * 255 = 89 = 0x59. Cevrim hesaplandi, olculmedi. -->
          <Border Name="bd"
                  Background="{TemplateBinding Background}"
                  BorderBrush="{TemplateBinding BorderBrush}"
                  BorderThickness="{TemplateBinding BorderThickness}"
                  Padding="{TemplateBinding Padding}"
                  CornerRadius="6"
                  RenderTransformOrigin="50%,50%"
                  BoxShadow="0 0 ${T.turetilmis['glow-buton'].blur} 0 ${gx('glow-buton')}">
            <!-- Hover ve basma icin keyframe animasyonu YAZILMAZ. Avalonia bir
                 pseudo-class'tan cikarken keyframe'i geri sarmaz; dugme son karede
                 takili kalir. Dogru arac Transitions, cift yonlu calisir. -->
            <Border.Transitions>
              <Transitions>
                <DoubleTransition Property="Opacity"
                                  Duration="{StaticResource TInstant}"
                                  Easing="{StaticResource EOut}"/>
                <TransformOperationsTransition Property="RenderTransform"
                                               Duration="{StaticResource TInstant}"
                                               Easing="{StaticResource EOut}"/>
              </Transitions>
            </Border.Transitions>
            <ContentPresenter Name="PART_ContentPresenter"
                              Content="{TemplateBinding Content}"
                              ContentTemplate="{TemplateBinding ContentTemplate}"
                              HorizontalContentAlignment="Center"
                              VerticalContentAlignment="Center"/>
          </Border>
        </ControlTemplate>
      </Setter>

      <!-- Transitions cift yonlu oldugu icin WPF'in EIn/EOut ayrimi tek Easing'e
           iniyor. Girise ve cikisa ayri egri verilemiyor; kabul edilen sadelesme,
           sozlesmenin Cikti bolumune not dusuldu. -->
      <Style Selector="^:pointerover /template/ Border#bd">
        <Setter Property="Opacity" Value="0.85"/>
      </Style>

      <Style Selector="^:pressed /template/ Border#bd">
        <Setter Property="RenderTransform" Value="scale(0.98)"/>
      </Style>

      <Style Selector="^:disabled /template/ Border#bd">
        <Setter Property="Background" Value="Transparent"/>
        <Setter Property="BorderBrush" Value="{StaticResource Disabled}"/>
        <Setter Property="BorderThickness" Value="1"/>
        <Setter Property="BoxShadow" Value="none"/>
      </Style>
      <Style Selector="^:disabled">
        <Setter Property="Foreground" Value="{StaticResource Disabled}"/>
        <Setter Property="Cursor" Value="No"/>
      </Style>
    </ControlTheme>

  </Styles.Resources>

  <!-- ODAK HALKASI, uygulama geneli.
       WPF'te bu is {x:Static SystemParameters.FocusVisualStyleKey} anahtarli bir
       stille yapiliyordu; Avalonia'da o anahtar yok, karsiligi Control uzerindeki
       FocusAdorner ozelligidir. Avalonia halkayi zaten yalniz klavye modalitesinde
       cizer, CSS'teki :focus-visible karsiligi hazir gelir.
       Yaricap 6 DIP tabanindan turetildi: ic katman ogenin 1 DIP disinda (6+1=7),
       dis katman 3 DIP disinda (6+3=9). Elle secilmis sayi degil. -->
  <Style Selector="Control">
    <Setter Property="FocusAdorner">
      <FocusAdornerTemplate>
        <Panel Margin="-5" UseLayoutRounding="True">
          <Rectangle Margin="4" RadiusX="7" RadiusY="7"
                     Stroke="${x('black')}" StrokeThickness="2"/>
          <Rectangle Margin="2" RadiusX="9" RadiusY="9"
                     Stroke="${x('blue')}" StrokeThickness="2"/>
        </Panel>
      </FocusAdornerTemplate>
    </Setter>
  </Style>

  <!-- UYGULAMA ZEMINI.
       Pencerenin kendi Background'i degil, pencereyi dolduran BOS bir Panel:
       <Panel Classes="appbg"/> icerigin arkasinda kardes olarak durur.
       Panel'in icine cocuk koyma, donen katman cocuklarini da dondurur. -->
  <Style Selector="Panel.appbg">
    <Setter Property="Background" Value="{StaticResource AppBgGradient}"/>
    <Setter Property="RenderTransformOrigin" Value="50%,50%"/>
    <Setter Property="IsHitTestVisible" Value="False"/>
  </Style>

  <!-- ZEMIN DONUSU, sonsuz dongu yasaginin adi konmus tek istisnasi (SKILL §5.4).
       WPF'te EndPoint 0.5,1'den 0.7,1'e kayiyordu, duruk deger 0.6,1'di. Avalonia bir
       gradient fircasinin alt ozelligini enterpole edemez (firca animatoru yalniz duz
       rengi tasir), bu yuzden ayni gorunum katmanin cok yavas donmesiyle uretiliyor.
       Aci hesabi, dikeyden sapma: atan(0.5)=26.57, atan(0.6)=30.96, atan(0.7)=34.99
       derece. Duruk 0.6'ya gore uclar -4.39 ve +4.03 derece; toplam oynama 8.42
       derece, motion.md M10 tavani olan 20 derecenin altinda.
       Donen dikdortgenin kose bosluk birakmamasi icin olcek 1.12; 16:9 pencerede
       8.42 derece icin gereken en kucuk olcek 1.09 hesaplandi, 1.12 pay birakir.
       Butun bu sayilar hesaplandi, ekranda olculmedi (varsayilan, olculmedi). -->
  <Style Selector="Window.anim Panel.appbg">
    <Style.Animations>
      <Animation Duration="${sureXaml('bg-donus')}" IterationCount="Infinite"
                 PlaybackDirection="Alternate" Easing="SineEaseInOut">
        <KeyFrame Cue="0%">
          <Setter Property="RenderTransform" Value="scale(1.12) rotate(-4.39deg)"/>
        </KeyFrame>
        <KeyFrame Cue="100%">
          <Setter Property="RenderTransform" Value="scale(1.12) rotate(4.03deg)"/>
        </KeyFrame>
      </Animation>
    </Style.Animations>
  </Style>

  <!-- AZALTILMIS HAREKET, sablonda uygulanir.
       Kuralin dosyada yazili olup sablonun uygulamamasi bu standardin en sinsi hata
       sinifi (motion.md M4); WPF tarafinda tam bu olmustu. Avalonia'da hazir bir API
       yok, o yuzden mekanizma sudur:

         Pencere acilirken azaltilmis hareket tercihi okunur.
         Tercih KAPALIYSA Window'a "anim" sinifi eklenir, aciksa EKLENMEZ.

       Sinif tek yerde durur, pencerenin kendisinde; asagidaki kurallar ona bakar.
       Okuma kodu references/avalonia.md'de, kopyalanmaya hazir.
       "anim" sinifi yoksa iki sey birden duser:
         1) "Window.anim Panel.appbg" eslesmez, zemin dongusu hic baslamaz.
         2) Asagidaki kural basma olcegini iptal eder.
       Opaklik gecisi kalir; arayuz cansizlasmaz ama bas dondurmez (M4). -->
  <Style Selector="Window:not(.anim) Button:pressed /template/ Border#bd">
    <Setter Property="RenderTransform" Value="none"/>
  </Style>

  <!-- Ayni iptal, imza cipleri icin (Signature.axaml, Classes="sigchip"). Kural
       burada duruyor cunku Signature.axaml'in kendi Styles koleksiyonu yalniz kendi
       alt agacini gorur, ustundeki Window'u goremez. -->
  <Style Selector="Window:not(.anim) Button.sigchip:pointerover /template/ Border#bd">
    <Setter Property="RenderTransform" Value="none"/>
  </Style>

</Styles>
`;
}

function paletteUret() {
  return `using System.Drawing;
using System.Drawing.Text;
using System.Linq;

namespace Teknesyum.Theme;

/// Teknesyum Neon — WinForms/konsol paleti. Değerleri değiştirme.
public static class Palette
{
    public static readonly Color NeonBlue   = ColorTranslator.FromHtml("${csx('blue')}");
    public static readonly Color NeonPink   = ColorTranslator.FromHtml("${csx('pink')}");
    public static readonly Color NeonPurple = ColorTranslator.FromHtml("${csx('purple')}");
    public static readonly Color Success    = ColorTranslator.FromHtml("${csx('success')}");

    public static readonly Color PinkText   = ColorTranslator.FromHtml("${csx('pink-text')}");
    public static readonly Color PurpleText = ColorTranslator.FromHtml("${csx('purple-text')}");

    // --- anlamsal rol katmanı (SKILL §2) ---
    //
    // ROL KAZANIR. Durum bildiren her kontrol — hata metni, form doğrulama,
    // uyarı kutusu, durum noktası, tehlike düğmesi — bu alanları yazar. Marka ve
    // dekor (glow, scrollbar, hero, başlık) marka alanını yazmayı sürdürür.
    // C#'ta takma ad düz atamadır: rol alanı marka alanının DEĞERİNİ alır, hex'i
    // kopyalanmaz. Tek istisna \`Warning\` — marka üçlüsünde karşılığı yok, kendi
    // hex'ini taşır. Eşitlik denetimde ölçülür (\`test/u4-renk.js\`).
    //
    // \`Success\` yukarıda tanımlı ve zaten rol alanıdır; ikinci ad verilmedi.
    // \`Info\` BİLEREK YOK: bilgi kutusu bugün yok, kullanılmayan token borçtur.
    // Açılırsa maviye bağlanır ve birincil düğmeyle aynı ekranda info dolgusu
    // kullanılmaz.
    public static readonly Color Danger     = NeonPink;

    /// Tehlikenin METİN rolü. Dolgu hex'i \`#FF00EA\` metinde 6.11:1 verir ve §2'nin
    /// 7:1 eşiğinin altındadır; hata metni dolgu alanını değil bunu yazar (7.33:1).
    public static readonly Color DangerText = PinkText;

    /// \`warning #FBBF24\` — YALNIZCA UYARI YÜZEYİ: metin, çerçeve, ikon.
    /// DOLGU VE DÜĞME YOK. Kısıt \`Success\`in kalıbının aynısıdır, yeni kalıp değil.
    ///
    /// Yasağın gerekçesi ölçüldü: amber dolgu üstünde beyaz metin 1.67:1 — çöker.
    /// YERİNE NE KONUR: uyarı metni \`Warning\` (12.58:1 / 11.94:1), çerçeve
    /// \`Warning50\` (\`#08090A\` üstünde 3.59:1, 1.4.11'in 3:1 eşiğini geçer — pembe
    /// /50 2.17 ve mor /50 1.82 ile bu merdiveni taşımıyordu, amber taşıyor),
    /// ikon aynı renk. Eylem gerekiyorsa düğme birincil (mavi) ya da \`Danger\`
    /// (pembe) olur; uyarı rengi düğmeye girmez.
    ///
    /// RENK TEK BAŞINA ANLAM TAŞIMAZ, amber için de baştan: amber ile \`Success\`
    /// protanopide ΔE2000 15.2 ile ayrışmıyor (\`docs/olcumler/renk-korlugu.md\`).
    /// Uyarı satırı renge ek olarak ikon ya da metin taşır.
    ///
    /// ŞERH: bu hex \`U9\` ΔE ölçümüne tabidir.
    public static readonly Color Warning    = ColorTranslator.FromHtml("${csx('warning')}");
    public static readonly Color Warning50  = Color.FromArgb(${argb('warning-border')});

    public static readonly Color Surface    = ColorTranslator.FromHtml("${csx('surface')}");
    public static readonly Color AppBg      = ColorTranslator.FromHtml("${csx('black')}");
    public static readonly Color AppBgFrom  = ColorTranslator.FromHtml("${csx('black')}");
    public static readonly Color AppBgTo    = ColorTranslator.FromHtml("${csx('surface')}");

    public static readonly Color BorderDefault    = Color.FromArgb(${argb('border')});
    public static readonly Color BorderStrong     = Color.FromArgb(${argb('border-strong')});
    public static readonly Color BorderDecorative = Color.FromArgb(${argb('border-decorative')});

    public static readonly Color FocusRing      = ColorTranslator.FromHtml("${csx('blue')}");
    public static readonly Color FocusRingInner = ColorTranslator.FromHtml("${csx('black')}");

    public static readonly Color TextBody   = ColorTranslator.FromHtml("${csx('text')}");
    public static readonly Color TextLabel  = ColorTranslator.FromHtml("${csx('text-label')}");

    /// Devre dışı kontrol 7:1'den muaftır (SKILL §2) ve bedeli vardır: renk körü
    /// kullanıcı griyi göremez. Bu renk tek başına kullanılmaz — devre dışı her
    /// kontrol griliğe ek bir işaret taşır: \`ToolTip\` metni ZORUNLU, yanında
    /// \`Cursor = Cursors.No\` ve mümkünse bir ikon. Yalnız soluklaştırılmış kontrol
    /// eksik teslimdir.
    ///
    /// "Soluk metin" rolü 23.08.2026'da tamamen silindi: \`TextBody\` ile birebir aynı
    /// değeri taşıyordu ve iki adı olan tek değer er geç ayrışır. İkincil metin için
    /// çözüm gri vermek değil, metni silmektir (SKILL §2, "ara gri yok").
    public static readonly Color Disabled   = ColorTranslator.FromHtml("${csx('disabled')}");

    /// Yarıçap tektir: 6 DIP (SKILL §5, \`layout.md\` §5.1). Kart, panel, düğme ve
    /// hücre aynı değeri alır. Tek istisna dairedir: \`?\` rozeti, slider thumb,
    /// durum noktası.
    public const int Radius = 6;

    /// Zincirin tek kaynağı SKILL §3'tür. WinForms \`Font\` yedek zincir almaz, bu
    /// yüzden kurulu olan ilk aile seçilir. Atkinson Hyperlegible Next varsayılandır
    /// ve projeye gömülür (\`PrivateFontCollection\`); gömülmediyse Segoe UI'ye düşer —
    /// bu bir kabul değil, eksik teslimdir.
    public static string Aile(params string[] adaylar)
    {
        using var kurulu = new InstalledFontCollection();
        var adlar = kurulu.Families.Select(f => f.Name).ToHashSet();
        return adaylar.FirstOrDefault(adlar.Contains) ?? adaylar[^1];
    }

    public static readonly string SansAdi = Aile(${csAile('sans')});
    public static readonly string MonoAdi = Aile(${csAile('mono')});

    // Ölçek 1.25 major third — 14 / 16 / 20 / 24 / 30 DIP. Punto karşılığı 96 dpi'de
    // DIP × 0.75'tir: 10.5 / 12 / 15 / 18 / 22.5.
    //
    // AĞIRLIK TELAFİSİ: SKILL §3 başlık ve etikette 600 (SemiBold) istiyor;
    // \`FontStyle\` yalnız Regular ve Bold tanıyor, ara ağırlık yok. Başlıklar burada
    // Bold kalır ve fark boyutla kurulur (h2 18pt, h3 15pt, etiket 10.5pt) — üç
    // seviye boyutla ayrıştığı için ağırlığın tek başına hiyerarşi taşıması
    // gerekmiyor. Gerçek 600 isteniyorsa \`GDI+\` yerine \`PrivateFontCollection\` ile
    // variable font'un SemiBold kesiti yüklenir; o zaman bu telafi kalkar.
    //
    // Satır yüksekliği de WinForms \`Font\` üzerinden verilemez; \`TextRenderer\` çizim
    // yaparken satır aralığı elle 1.5 (gövde) / 1.2 (başlık) katsayısıyla kurulur.
    public static readonly Font  H2         = new(SansAdi, 18f, FontStyle.Bold);
    public static readonly Font  H3         = new(SansAdi, 15f, FontStyle.Bold);
    public static readonly Font  LabelFont  = new(SansAdi, 10.5f, FontStyle.Bold);
    public static readonly Font  Body       = new(SansAdi, 12f);
    public static readonly Font  Hint       = new(SansAdi, 10.5f);
    public static readonly Font  Mono       = new(MonoAdi, 12f, FontStyle.Bold);
    public static readonly Font  Hero       = new(MonoAdi, 22.5f, FontStyle.Bold);

    public const string Author     = "Teknesyum";
    public const string GitHubUrl  = "https://github.com/Teknesyum";
    public const string SponsorUrl = "https://github.com/sponsors/Teknesyum";
    public const bool   SponsorActive = true;
}

/// ANSI konsol renkleri (Runly gibi CLI projeleri için).
public static class Ansi
{
    public const string Blue       = "${ansi('blue')}";
    public const string Pink       = "${ansi('pink')}";
    public const string Purple     = "${ansi('purple')}";
    public const string PinkText   = "${ansi('pink-text')}";
    public const string PurpleText = "${ansi('purple-text')}";
    public const string Success    = "${ansi('success')}";
    // Rol renkleri ANSI'ye de girer; girmezse terminal ciktisi paletten kopar.
    // Danger ve DangerText marka sabitinin degerini alir, hex kopyalanmaz.
    public const string Danger     = Pink;
    public const string DangerText = PinkText;
    // Warning: yalniz uyari metni. Terminalde dolgu zaten yok, kisit kendiliginden tutar.
    public const string Warning    = "${ansi('warning')}";
    public const string Disabled   = "${ansi('disabled')}";
    public const string Bold       = "\x1b[1m";
    public const string Reset      = "\x1b[0m";
}
`;
}

const ciktilar = [
  ['theme.css', cssUret()],
  ['Theme.xaml', xamlUret()],
  ['Theme.axaml', axamlUret()],
  ['Palette.cs', paletteUret()]
];
// ÖLÇÜLDÜ (25.08.2026, CI): satır sonu sabitlenince yalnız yazıldığı platform tutar —
// autocrlf Windows'ta CRLF, Unix'te LF çeker; dört dosyada her satır farklı görünür.
// EOL hedef dosyanın o anki halinden alınır, dosya yoksa LF.
for (const [ad, icerik] of ciktilar) {
  const hedef = path.join(kok, ad);
  let eol = '\n';
  try {
    if (fs.readFileSync(hedef, 'utf8').includes('\r\n')) eol = '\r\n';
  } catch {}
  fs.writeFileSync(hedef, eol === '\n' ? icerik : icerik.replace(/\n/g, '\r\n'), 'utf8');
}
console.log('uretildi: ' + ciktilar.map(c => c[0]).join(', ') + ' <- ' + path.basename(tokenYolu));
