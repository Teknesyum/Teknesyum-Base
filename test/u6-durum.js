'use strict';
const fs = require('fs');
const path = require('path');

const kok = path.resolve(__dirname, '..');
const skill = path.join(kok, 'teknesyum', 'skills', 'teknesyum-ui');
const refs = path.join(skill, 'references');
const assets = path.join(skill, 'assets');

const oku = (p) => fs.readFileSync(p, 'utf8');
const componentsMd = oku(path.join(refs, 'components.md'));
const durumlarMd = oku(path.join(refs, 'durumlar.md'));
const durumlarCss = oku(path.join(assets, 'durumlar.css'));
const durumlarXaml = oku(path.join(assets, 'Durumlar.xaml'));

const sorunlar = [];
const kontrol = (kosul, mesaj) => {
  if (!kosul) sorunlar.push(mesaj);
};

const DURUMLAR = ['duruk', 'hover', 'odak', 'basılı', 'devre dışı'];

// --- 1 · bileşen listesi components.md başlıklarından ÜRETİLİR, sabit yazılmaz ---

function bilesenler(md) {
  return md
    .split('\n')
    .filter((s) => /^## \S/.test(s))
    .map((s) => s.slice(3).trim());
}

function bolumler(md) {
  const cikti = new Map();
  const satirlar = md.split('\n');
  let ad = null;
  let govde = [];
  for (const s of satirlar) {
    if (/^### \S/.test(s)) {
      if (ad) cikti.set(ad, govde.join('\n'));
      ad = s.slice(4).trim();
      govde = [];
    } else if (ad) {
      govde.push(s);
    }
  }
  if (ad) cikti.set(ad, govde.join('\n'));
  return cikti;
}

function matrisDenetle(compMd, durMd) {
  const bulunanlar = [];
  const liste = bilesenler(compMd);
  const bols = bolumler(durMd);
  const adlar = [...bols.keys()];

  for (const b of liste) {
    const esler = adlar.filter((a) => a === b || a.startsWith(b + ' · '));
    if (!esler.length) {
      bulunanlar.push('durumlar.md matrisinde bölüm yok: "' + b + '"');
      continue;
    }
    for (const e of esler) {
      const govde = bols.get(e);
      const satirlar = govde
        .split('\n')
        .filter((s) => s.trim().startsWith('|'))
        .map((s) => s.split('|').map((h) => h.trim()));
      const durumSatirlari = satirlar.filter((h) => DURUMLAR.includes(h[1]));
      const sira = durumSatirlari.map((h) => h[1]);
      if (sira.join('>') !== DURUMLAR.join('>')) {
        bulunanlar.push('"' + e + '" beş durumu sırayla taşımıyor: [' + sira.join(', ') + ']');
        continue;
      }
      for (const h of durumSatirlari) {
        const deger = (h[2] || '').replace(/[*`]/g, '').trim();
        if (deger === '' || deger === '—' || deger === '-') {
          bulunanlar.push('"' + e + '" · ' + h[1] + ' hücresi boş — yasaklı boşluk');
          continue;
        }
        if (/^uygulanmaz/.test(deger)) {
          const gerekce = deger.replace(/^uygulanmaz\s*[—-]?\s*/, '');
          if (gerekce.length < 10) {
            bulunanlar.push('"' + e + '" · ' + h[1] + ' uygulanmaz diyor ama gerekçe yazmıyor');
          }
        }
      }
    }
  }
  return bulunanlar;
}

const liste = bilesenler(componentsMd);
kontrol(
  liste.length >= 12,
  'components.md başlık çıkarıcısı ' + liste.length + ' bileşen buldu — kaynak kaymış olmalı'
);

for (const s of matrisDenetle(componentsMd, durumlarMd)) kontrol(false, s);

// --- 2 · kanarya: denetim gerçekten çalışıyor mu ---
// Sentetik bir başlık eklenmiş bellek içi fikstür DÜŞMELİ. Düşmüyorsa denetim ölüdür.
const kanarya1 = matrisDenetle(componentsMd + '\n## Yeni Bileşen\n', durumlarMd);
if (!kanarya1.some((s) => s.includes('Yeni Bileşen'))) {
  console.error('KALDI');
  console.error('  - KANARYA DÜŞMEDİ: yeni bileşen başlığı eklendi, denetim fark etmedi.');
  console.error('    Bileşen çıkarıcı ya da matris denetimi ölü. Test burada durur.');
  process.exit(1);
}

// İkinci kanarya: boşaltılmış bir durum hücresi de yakalanmalı.
const bosaltilmis = durumlarMd.replace(/^\| hover \|[^\n]*$/m, '| hover |  | — |');
const kanarya2 = matrisDenetle(componentsMd, bosaltilmis);
if (!kanarya2.some((s) => s.includes('yasaklı boşluk'))) {
  console.error('KALDI');
  console.error('  - KANARYA DÜŞMEDİ: boş durum hücresi yakalanmadı. Test burada durur.');
  process.exit(1);
}

// --- 3 · durum katmanı yalnız yedi özellik yazar ---

const IZINLI = new Set([
  'color',
  'background-color',
  'border-color',
  'box-shadow',
  'cursor',
  'transform',
  'transition',
]);

const cssGovde = durumlarCss.replace(/\/\*[\s\S]*?\*\//g, '');

const kurallar = [];
{
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(cssGovde))) {
    const secici = m[1].trim();
    const bildirimler = m[2]
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const i = s.indexOf(':');
        return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
      });
    kurallar.push({ secici, bildirimler });
  }
}

kontrol(kurallar.length > 0, 'durumlar.css okunamadı ya da hiç kural taşımıyor');

for (const { secici, bildirimler } of kurallar) {
  for (const [ad, deger] of bildirimler) {
    kontrol(
      IZINLI.has(ad),
      'durumlar.css izinli yedi özelliğin dışına çıktı: "' + ad + '" (' + secici + ')'
    );
    kontrol(
      !ad.startsWith('--'),
      'durumlar.css yeni token tanımlıyor: "' + ad + '" (' + secici + ')'
    );
    if (ad === 'box-shadow') {
      kontrol(
        deger === 'none',
        'durumlar.css box-shadow yalnız "none" olabilir, "' + deger + '" yazılmış (' + secici + ')'
      );
    }
    kontrol(
      !/#[0-9a-fA-F]{3,8}\b/.test(deger),
      'durumlar.css ham hex yazıyor: ' + ad + ': ' + deger + ' (' + secici + ')'
    );
    kontrol(
      !/\b(rgba?|hsla?)\s*\(/.test(deger),
      'durumlar.css ham renk fonksiyonu yazıyor: ' + ad + ': ' + deger + ' (' + secici + ')'
    );
  }
}

kontrol(
  !/\bopacity\s*:/.test(cssGovde),
  'durumlar.css opacity değiştiriyor — hiçbir durumda değişmez'
);

// hover asla tek taşıyıcı olamaz: :hover taşıyan her seçici listesi :focus-visible de taşır.
// Tek istisna, hover'ı iptal eden devre dışı kuralıdır.
for (const { secici } of kurallar) {
  if (!secici.includes(':hover')) continue;
  const iptal = /disabled/.test(secici);
  kontrol(
    iptal || secici.includes(':focus-visible'),
    "durumlar.css hover'ı tek taşıyıcı bırakıyor, odak eşi yok: " + secici
  );
}

// basılı hâl transformdan bağımsız ikinci bir taşıyıcı taşır (azaltılmış hareket).
for (const { secici, bildirimler } of kurallar) {
  if (!secici.includes(':active')) continue;
  const adlar = bildirimler.map(([a]) => a);
  kontrol(
    adlar.some((a) => a === 'color' || a === 'background-color' || a === 'border-color'),
    'durumlar.css basılı hâli yalnız transform ile taşıyor: ' + secici
  );
}

// dört eksik durum gerçekten dolduruldu mu
for (const parca of [
  '.tk-toggle:disabled',
  '.tk-slider:hover',
  '.tk-slider:focus-visible',
  '.tk-slider:disabled',
  '.tk-cell[aria-disabled=',
  '.tk-btn-icon:active',
]) {
  kontrol(cssGovde.includes(parca), 'durumlar.css eksik durumu doldurmuyor: ' + parca);
}

// --- 4 · WPF paritesi ---

const xamlBloklar = {};
{
  const parcalar = durumlarXaml.split(/<Style x:Key="/).slice(1);
  for (const p of parcalar) {
    const ad = p.slice(0, p.indexOf('"'));
    xamlBloklar[ad] = p;
  }
}

const XAML_BEKLENEN = {
  TkToggle: ['IsMouseOver', 'IsKeyboardFocused', 'IsPressed'],
  TkSlider: ['IsMouseOver', 'IsKeyboardFocusWithin', 'IsMouseCaptureWithin'],
  TkCell: ['IsMouseOver', 'IsKeyboardFocused', 'IsPressed'],
  TkIconButton: ['IsMouseOver', 'IsKeyboardFocused', 'IsPressed'],
};
for (const [ad, kosullar] of Object.entries(XAML_BEKLENEN)) {
  const blok = xamlBloklar[ad];
  if (!blok) {
    kontrol(false, 'Durumlar.xaml stili yok: ' + ad);
    continue;
  }
  for (const k of kosullar) {
    kontrol(blok.includes(k), 'Durumlar.xaml ' + ad + ' durumu taşımıyor: ' + k);
  }
  kontrol(
    /Property="IsEnabled" Value="False"/.test(blok),
    'Durumlar.xaml ' + ad + ' devre dışı hâli taşımıyor'
  );
  kontrol(
    blok.includes('{StaticResource Disabled}'),
    'Durumlar.xaml ' + ad + ' devre dışı hâlde Disabled fırçasını yazmıyor'
  );
  kontrol(
    blok.includes('Cursor" Value="No"') || blok.includes('Cursor="No"'),
    'Durumlar.xaml ' + ad + ' devre dışı hâlde imleci değiştirmiyor'
  );
}
kontrol(!!xamlBloklar.TkValue, 'Durumlar.xaml salt okunur TkValue stilini taşımıyor');

kontrol(
  !/#[0-9a-fA-F]{6,8}/.test(durumlarXaml),
  'Durumlar.xaml ham hex yazıyor — bütün renkler Theme.xaml fırçalarından gelmeli'
);
kontrol(
  !/Storyboard\.TargetProperty="Opacity"/.test(durumlarXaml),
  'Durumlar.xaml opaklık animasyonluyor — hiçbir durumda opaklık değişmez'
);
// XAML yorumunda cift tire gecersizdir.
for (const y of durumlarXaml.match(/<!--[\s\S]*?-->/g) || []) {
  kontrol(
    !y.slice(4, -3).includes('--'),
    'Durumlar.xaml yorumunda çift tire var — XAML ayrıştırıcısı düşer'
  );
}

// --- 5 · ölçümler: yazılan oran gerçekten o mu ---

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (c) => {
  const s = c.map((v) => {
    const u = v / 255;
    return u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const oran = (a, b) => {
  const l1 = lum(a);
  const l2 = lum(b);
  const [y, d] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (y + 0.05) / (d + 0.05);
};
const uzerine = (fg, alfa, bg) => fg.map((v, i) => Math.round(v * alfa + bg[i] * (1 - alfa)));

const YUZEY = hex('#08090a');
const SIYAH = hex('#000000');
const MAVI = hex('#00f3ff');
const PEMBE = hex('#ff00ea');
const GRI = hex('#71717a');

const OLCUMLER = [
  ['devre dışı / yüzey', oran(GRI, YUZEY), 4.12],
  ['devre dışı / siyah', oran(GRI, SIYAH), 4.35],
  ['--tk-border / yüzey', oran(uzerine(MAVI, 0.5, YUZEY), YUZEY), 4.11],
  ['--tk-border-decorative / yüzey', oran(uzerine(MAVI, 0.3, YUZEY), YUZEY), 2.14],
  ['--tk-border-strong / yüzey', oran(uzerine(MAVI, 0.6, YUZEY), YUZEY), 5.49],
  ['pembe /10 / yüzey', oran(uzerine(PEMBE, 0.1, YUZEY), YUZEY), 1.06],
  ['pembe /30 / yüzey', oran(uzerine(PEMBE, 0.3, YUZEY), YUZEY), 1.42],
  ['pembe /50 / yüzey', oran(uzerine(PEMBE, 0.5, YUZEY), YUZEY), 2.17],
  ['pembe tam / yüzey', oran(PEMBE, YUZEY), 6.11],
  ['odak mavisi / yüzey', oran(MAVI, YUZEY), 14.49],
  ['odak mavisi / siyah', oran(MAVI, SIYAH), 15.26],
  ['#9a9a9a / yüzey', oran(hex('#9a9a9a'), YUZEY), 7.08],
  ['#999999 / yüzey', oran(hex('#999999'), YUZEY), 6.99],
];
for (const [ad, hesap, yazilan] of OLCUMLER) {
  kontrol(
    Math.abs(hesap - yazilan) < 0.01,
    'ölçüm tutmadı — ' + ad + ': hesap ' + hesap.toFixed(2) + ', yazılan ' + yazilan
  );
  kontrol(
    durumlarMd.includes(yazilan.toFixed(2)),
    'durumlar.md ölçümü kaybetti: ' + ad + ' = ' + yazilan.toFixed(2)
  );
}

// Devre dışı 3:1 taban eşiğini geçiyor, 7:1 metin eşiğini geçmiyor — muafiyetin sınırı.
kontrol(oran(GRI, YUZEY) > 3, 'devre dışı grisi 1.4.11 taban eşiğini taşımıyor');
kontrol(oran(GRI, YUZEY) < 7, 'devre dışı grisi 7:1 üstüne çıkmış — muafiyet gerekçesi düştü');
// Basılı ikon butonun çerçevesi eşiği geçer; taşıyıcı transform değil renktir.
kontrol(
  oran(PEMBE, YUZEY) > 3 && oran(uzerine(PEMBE, 0.5, YUZEY), YUZEY) < 3,
  'ikon buton basılı çerçevesinin 2.17 ile 6.11 sıçraması ölçümde doğrulanmadı'
);

// --- 6 · yazılı olması gereken kararlar ---

const METINLER = [
  "Toggle'ın kapalı hâli `--tk-disabled` grisini kullanır ve bu, tek gri kuralının tek",
  'data-tk-durum',
  'Tarayıcıda doğrulanmadı',
  '`box-shadow: none`',
  'yasaklı boşluk',
];
for (const m of METINLER) {
  kontrol(durumlarMd.includes(m), 'durumlar.md yazılı olması gereken maddeyi taşımıyor: ' + m);
}
for (const p of IZINLI) {
  kontrol(durumlarMd.includes('`' + p), 'durumlar.md izinli özelliği saymıyor: ' + p);
}

if (sorunlar.length) {
  console.error('KALDI');
  for (const s of sorunlar) console.error('  - ' + s);
  process.exit(1);
}
console.log('GEÇTİ');
