#!/usr/bin/env node
// U5 — §5.8 ekran okuyucu: isimsiz interaktif öğe yasağı, sr-only, aria-live,
// forced-colors, WPF AutomationProperties.
//
// Statik dosya denetimi, DOM yok. İki katman:
//   A. assets/a11y.css — sr-only clip kalıbı doğru mu, yasak kalıplar
//      (display:none, ham hex, ham süre) yok mu, forced-colors bloğu tam mı,
//      kullanılan her `var(--tk-*)` tokenı theme.css'te tanımlı mı.
//   B. references/a11y.md — yasak kural olarak mı yazılmış, her yasağın yanında
//      alternatifi var mı, web ve WPF ayrı ayrı karşılanmış mı, aria-live
//      tablosu ve forced-colors teslim kuralı yazılı mı.
//
// Tek başına koşar:  node test/u5-a11y.js

'use strict';

const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..');
const UI = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui');
const CSS = fs.readFileSync(path.join(UI, 'assets', 'a11y.css'), 'utf8');
const MD = fs.readFileSync(path.join(UI, 'references', 'a11y.md'), 'utf8');
const THEME = fs.readFileSync(path.join(UI, 'assets', 'theme.css'), 'utf8');

let gecen = 0;
const hatalar = [];

function onay(ad, kosul, detay) {
  if (kosul) {
    gecen++;
    return;
  }
  hatalar.push(detay ? `${ad} — ${detay}` : ad);
}

function blok(kaynak, baslangicRegex) {
  const m = kaynak.match(baslangicRegex);
  if (!m) return '';
  const acilis = kaynak.indexOf('{', m.index);
  if (acilis === -1) return '';
  let derinlik = 0;
  for (let i = acilis; i < kaynak.length; i++) {
    if (kaynak[i] === '{') derinlik++;
    if (kaynak[i] === '}') derinlik--;
    if (derinlik === 0) return kaynak.slice(acilis + 1, i);
  }
  return '';
}

const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

// ---------------------------------------------------------------------------
// A. a11y.css
// ---------------------------------------------------------------------------

function katmanA() {
  // A1. sr-only clip kalıbı — doğru teknik, yanlış teknik yok.
  const sr = blok(CSS, /\.tk-sr-only\s*\{/);
  onay('A1 .tk-sr-only var', sr.length > 0);
  onay('A1 position:absolute', /position:\s*absolute/.test(sr));
  onay('A1 1px kutu', /width:\s*1px/.test(sr) && /height:\s*1px/.test(sr));
  onay('A1 clip-path inset', /clip-path:\s*inset\(50%\)/.test(sr));
  onay('A1 overflow hidden', /overflow:\s*hidden/.test(sr));
  onay(
    'A1 display:none yasağı',
    !/display:\s*none/.test(sr) && !/visibility:\s*hidden/.test(sr),
    'sr-only display:none/visibility:hidden ile yapılmaz — okuyucu da göremez'
  );

  // A2. Odak alınca görünür varyant.
  onay('A2 .tk-sr-only-focusable var', /\.tk-sr-only-focusable:focus/.test(CSS));
  const foc = blok(CSS, /\.tk-sr-only-focusable:focus\b[^{]*\{/);
  onay('A2 focusable clip açılıyor', /clip:\s*auto/.test(foc) && /clip-path:\s*none/.test(foc));
  onay('A2 focus-within de kapsanıyor', /:focus-within/.test(CSS));

  // A3. Canlı bölge yardımcı sınıfı — boş bölge baştan durabilsin.
  onay('A3 .tk-live:empty var', /\.tk-live:empty/.test(CSS));

  // A4. forced-colors bloğu.
  const fc = blok(CSS, /@media\s*\(forced-colors:\s*active\)/);
  onay('A4 forced-colors bloğu var', fc.length > 0);
  onay('A4 odak Highlight', /outline:\s*2px\s+solid\s+Highlight/.test(fc));
  onay('A4 odak box-shadow silinir', /:focus-visible[^{]*\{[^}]*box-shadow:\s*none/.test(fc));
  onay('A4 hero filter kapanır', /\.tk-hero[\s\S]*?filter:\s*none/.test(fc));
  onay('A4 disabled GrayText', /:disabled[^{]*\{[^}]*GrayText/.test(fc));
  onay(
    'A4 disabled opaklıkla verilmez',
    /:disabled[^{]*\{[^}]*opacity:\s*1/.test(fc),
    'forced-colors altında devre dışı hâl opaklıkla verilemez'
  );
  onay('A4 durum noktası CanvasText', /\.tk-dot-on[\s\S]*?CanvasText/.test(fc));
  onay('A4 zemin Canvas', /body[\s\S]*?background:\s*Canvas\b/.test(fc));
  onay('A4 zemin animasyonu durur', /body[\s\S]*?animation:\s*none/.test(fc));

  // A5. forced-color-adjust yalnız renk yutucusunda, forced-colors bloğunun dışında
  // etkileşimli öğeye verilmemiş.
  const fca = yorumsuz(CSS).match(/forced-color-adjust:\s*none/g) || [];
  onay('A5 forced-color-adjust tek yerde', fca.length === 1, `${fca.length} kez geçiyor`);
  onay('A5 renk örneği sınıfında', /\.tk-renk-ornegi\s*\{[^}]*forced-color-adjust:\s*none/.test(CSS));

  // A6. Ham değer yasağı: hex renk yok, ham süre yok — sistem renkleri ve
  // tokenlar dışında renk tanımı bu dosyaya girmez.
  const temiz = yorumsuz(CSS);
  onay('A6 ham hex yok', !/#[0-9a-fA-F]{3,8}\b/.test(temiz), 'a11y.css ham hex taşımaz');
  onay('A6 ham süre yok', !/\b\d+(\.\d+)?m?s\b/.test(temiz), 'süre gerekirse --tk-t-* tokenı');

  // A7. Kullanılan her --tk-* tokenı theme.css'te tanımlı.
  const kullanilan = [...new Set([...temiz.matchAll(/var\((--tk-[a-z0-9-]+)/g)].map((m) => m[1]))];
  for (const t of kullanilan) {
    onay(`A7 ${t} theme.css'te tanımlı`, new RegExp(`${t}\\s*:`).test(THEME));
  }

  // A8. Dosya başı sözleşmesi: import sırası ve referans işareti.
  onay('A8 theme.css sonrası import notu', /theme\.css.?ten SONRA/i.test(CSS));
  onay('A8 references/a11y.md işareti', CSS.includes('references/a11y.md'));
  onay('A8 U10 şerhi', CSS.includes('U10'));
}

// ---------------------------------------------------------------------------
// B. a11y.md
// ---------------------------------------------------------------------------

function katmanB() {
  // B1. Yasak kural olarak yazılı — öneri değil (K2).
  onay('B1 isimsiz öğe yasağı başlıkta', /isimsiz interaktif öğe yasağı/i.test(MD));
  onay('B1 "Yasak, öneri değil"', MD.includes('Yasak, öneri değil'));
  onay('B1 WCAG 4.1.2 A seviyesi', /4\.1\.2/.test(MD) && /\*\*A\*\*/.test(MD));

  // B2. Web tarafı: ad sırası, title yetmezliği, boş ad, aria-hidden (K2).
  onay('B2 aria-label', MD.includes('aria-label='));
  onay('B2 aria-labelledby', MD.includes('aria-labelledby'));
  onay('B2 sr-only üçüncü yol', /tk-sr-only/.test(MD));
  onay('B2 title ad değildir', /`title` erişilebilir ad değildir/.test(MD));
  onay('B2 boş aria-label yasak', /aria-label=""/.test(MD));
  onay('B2 ikonda aria-hidden', /aria-hidden="true"/.test(MD));
  onay('B2 SVG focusable=false', /focusable="false"/.test(MD));
  onay('B2 ad locale sözlüğünden', /locale\//.test(MD));

  // B3. WPF tarafı (K6) — kontrole verilir, süs öğesi ada girmez.
  onay('B3 AutomationProperties.Name', MD.includes('AutomationProperties.Name'));
  onay('B3 kontrolün kendisine', /kontrolün\s+kendisine/.test(MD.replace(/\*\*/g, '')));
  onay('B3 XAML örneği', /<Button AutomationProperties\.Name=/.test(MD));
  onay('B3 süs öğesi kuralı', /automation peer|UIA ağacına adıyla girmez/.test(MD));
  onay('B3 loc:Str sözlük bağı', MD.includes('loc:Str'));

  // B4. aria-live tablosu (K4): seviye seçimi ve boş bölge kuralı.
  onay('B4 boş bölge baştan var', /DOM'da boş var olur/.test(MD.replace(/\*\*/g, '')));
  onay('B4 polite durum değişimi', /Durum değişimi[^|]*\|\s*`polite`/.test(MD));
  onay('B4 bildirim polite', /Bildirim[^|]*\|\s*`polite`/.test(MD));
  onay('B4 assertive yalnız hata', /Hata, veri kaybı[^|]*\|\s*`assertive`/.test(MD));
  onay('B4 ilerlemede live yok', /İlerleme[^|]*\|[^|]*live yok/.test(MD.replace(/\*\*/g, '')));
  onay('B4 progressbar alternatifi', /role="progressbar"/.test(MD) && /aria-valuenow/.test(MD));

  // B5. WPF canlı bölge (K6): LiveSetting + olay yükseltme.
  onay('B5 LiveSetting', MD.includes('AutomationProperties.LiveSetting'));
  onay('B5 LiveRegionChanged olayı', MD.includes('AutomationEvents.LiveRegionChanged'));
  onay('B5 LiveSetting tek başına yetmez', /`LiveSetting` tek başına yetmez/.test(MD));

  // B6. forced-colors (K5): teslim kuralı, tek halka kabulü, tablo.
  onay('B6 teslim kuralı', /neon teslim edilir/i.test(MD));
  onay('B6 halka teke düşer kabulü', /teke düşer/.test(MD.replace(/\*\*/g, '')));
  onay('B6 drop-shadow elle kapanır', /sistem silmez/.test(MD.replace(/\*\*/g, '')) && /filter: none/.test(MD));
  onay('B6 GrayText', MD.includes('GrayText'));
  onay('B6 forced-color-adjust istisnası', /forced-color-adjust: none.[\s\S]{0,80}yalnız renk yutucusu/i.test(MD.replace(/\*\*/g, '')));
  onay('B6 WPF HighContrast', MD.includes('SystemParameters.HighContrast'));
  onay('B6 WPF mod değişimi dinlenir', MD.includes('StaticPropertyChanged'));

  // B7. Alternatif sunmadan yasak yok (sözleşme kuralı): her yasağın satırında
  // "→" ile yerine ne konacağı yazılı.
  const hatalarBolumu = MD.split('## 4. Sık yapılan hatalar')[1] || '';
  onay('B7 sık hatalar bölümü var', hatalarBolumu.length > 0);
  const maddeler = hatalarBolumu.split('\n').filter((s) => s.trim().startsWith('- '));
  onay('B7 en az 10 madde', maddeler.length >= 10, `${maddeler.length} madde`);
  for (const m of maddeler) {
    onay(`B7 alternatifli: ${m.trim().slice(0, 40)}`, m.includes('→'));
  }

  // B8. CSS ile MD birbirini gösteriyor.
  onay('B8 md, a11y.css işaret ediyor', MD.includes('assets/a11y.css') || MD.includes('`a11y.css`'));
  onay('B8 md, §5.3 sınırını çiziyor', MD.includes('§5.3'));
}

// ---------------------------------------------------------------------------
// Koşum
// ---------------------------------------------------------------------------

katmanA();
katmanB();

console.log(`U5 ekran okuyucu — ${gecen} doğrulama geçti, ${hatalar.length} düştü.`);
if (hatalar.length) {
  for (const h of hatalar.slice(0, 40)) console.log(`  KALDI  ${h}`);
  if (hatalar.length > 40) console.log(`  ... ve ${hatalar.length - 40} tane daha`);
  console.log('KALDI');
  process.exit(1);
}
console.log('GEÇTİ');
