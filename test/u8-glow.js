#!/usr/bin/env node
// U8 — glow performans kuralının makinece denetimi.
//
// Bu dosya YAPI ölçer, düz yazı değil. Kaydırmadaki kare süresi Node'dan ölçülemez
// (WPF çalıştırılamıyor, başsız tarayıcı yok); o yüzden 16 ms burada kabul kriteri
// değildir — reçetesi `references/motion.md` M15'tedir. Burada ölçülen dört şey:
//
//   1. Glow tokenları tanımlı ve değerleri değişmemiş (CSS ↔ XAML tutarlı).
//   2. Hiçbir glow bildirimi tekrar eden öğe seçicisine düşmüyor.
//   3. `transition`/`animation` bildirimlerinde `box-shadow`/`filter` geçmiyor (M6).
//   4. `backdrop-filter` sayısı ≤ 1.
//
// Sayılar sabit yazılmaz, her koşuda yeniden sayılır. Her desen için "hiç eşleşmezse"
// hâli ayrıca denetlenir: sıfır eşleşme sessizce geçmez, testi düşürür — yoksa bozuk
// bir regex kendini "geçti" diye raporlar.
//
// Tek başına koşar:  node test/u8-glow.js

'use strict';

const fs = require('fs');
const path = require('path');

const KOK = path.resolve(__dirname, '..');
const CSS = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui', 'assets', 'theme.css');
const XAML = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui', 'assets', 'Theme.xaml');
const MOTION = path.join(KOK, 'teknesyum', 'skills', 'teknesyum-ui', 'references', 'motion.md');

let gecen = 0;
const hatalar = [];
const envanter = [];

function onay(ad, kosul, detay) {
  if (kosul) {
    gecen++;
    return true;
  }
  hatalar.push(detay ? `${ad} — ${detay}` : ad);
  return false;
}
function oku(yol) {
  if (!fs.existsSync(yol)) {
    hatalar.push(`dosya yok: ${yol}`);
    return null;
  }
  return fs.readFileSync(yol, 'utf8');
}

// ---------------------------------------------------------------------------
// 1. Küçük CSS ayrıştırıcı
// ---------------------------------------------------------------------------
// Kurallar seçici + bildirim listesi olarak çıkar. `@media`/`@supports` içine
// girilir, `@keyframes` içine girilip adımlar işaretlenir (keyframe içinde gölge
// değiştirmek de gölge animasyonudur).

function yorumsuz(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function ayikla(css, kf) {
  const cikti = [];
  let onek = '';
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      let d = 1;
      let j = i + 1;
      while (j < css.length && d > 0) {
        if (css[j] === '{') d++;
        else if (css[j] === '}') d--;
        j++;
      }
      const govde = css.slice(i + 1, j - 1);
      const secici = onek.trim().replace(/\s+/g, ' ');
      if (/^@(media|supports|layer|container|scope)\b/.test(secici)) {
        cikti.push(...ayikla(govde, kf));
      } else if (/^@keyframes\b/.test(secici)) {
        cikti.push(...ayikla(govde, secici));
      } else if (secici.startsWith('@')) {
        cikti.push({ secici, govde, keyframe: kf || null });
      } else {
        cikti.push({ secici, govde, keyframe: kf || null });
      }
      onek = '';
      i = j;
      continue;
    }
    if (c === '}') {
      onek = '';
      i++;
      continue;
    }
    onek += c;
    i++;
  }
  return cikti;
}

/** Bir kural gövdesindeki bildirimler. İç bloklar varsa atılır. */
function bildirimler(govde) {
  const duz = govde.replace(/\{[^{}]*\}/g, '');
  return duz
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const k = s.indexOf(':');
      if (k < 0) return null;
      return {
        ozellik: s.slice(0, k).trim().toLowerCase(),
        deger: s
          .slice(k + 1)
          .trim()
          .replace(/\s+/g, ' '),
      };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// 2. Glow tanımı
// ---------------------------------------------------------------------------
// Glow = bulanıklığı sıfırdan büyük ve rengi siyah olmayan gölge. `0 0 0 2px #000`
// (odak halkası) glow değildir; `0 0 40px rgba(0,0,0,.8)` (panel derinliği) de değil.

// Ofset ve yayılma birimsiz `0` olabilir (`0 0 10px ...`); bulanıklığın kendisi de.
const GOLGE_DESEN =
  /(?:inset\s+)?-?[\d.]+(?:px)?\s+-?[\d.]+(?:px)?\s+([\d.]+)(?:px)?(?:\s+-?[\d.]+(?:px)?)?\s+(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|var\(\s*--[\w-]+\s*\)|[a-zA-Z]+)/g;

function siyahMi(renk) {
  const r = renk.toLowerCase().replace(/\s+/g, '');
  if (r === 'black' || r === 'transparent' || r === 'currentcolor') return true;
  if (/^#(0{3}|0{4}|0{6}|0{8})$/.test(r)) return true;
  if (/^rgba?\(0,0,0/.test(r)) return true;
  if (/^var\(--[\w-]*(bg|black|siyah|shadow)/.test(r)) return true;
  return false;
}

/** Bildirim bir glow taşıyor mu? */
function glowMu(b) {
  const p = b.ozellik;
  if (!/^(-webkit-)?(box-shadow|filter)$/.test(p)) return false;
  if (b.deger.includes('--tk-glow-')) return true;
  if (/filter$/.test(p) && !/drop-shadow\s*\(/.test(b.deger)) return false;
  GOLGE_DESEN.lastIndex = 0;
  let m;
  while ((m = GOLGE_DESEN.exec(b.deger))) {
    if (Number(m[1]) > 0 && !siyahMi(m[2])) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 3. Tekrar eden öğe seçicisi
// ---------------------------------------------------------------------------
// Kapsam: aynı şablondan üretilen, sayısı veriyle değişen kardeş öğe.

const ELEMAN = /(^|[\s>+~])(tr|td|th|li|option|dd|dt)(\b|[.:\[#])/i;
const SINIF = /[-_](row|cell|item|entry|node|satir|hucre|oge)\b/i;
const ROL = /\[role\s*=\s*["']?(row|gridcell|cell|listitem|treeitem|option)["']?\]/i;
const NTH = /:nth-(child|of-type)\b/i;
const WPF = /(ItemsControl|DataGridRow|ListViewItem|ListBoxItem|TreeViewItem)/;

function tekrarEdenMi(secici) {
  return (
    ELEMAN.test(secici) ||
    SINIF.test(secici) ||
    ROL.test(secici) ||
    NTH.test(secici) ||
    WPF.test(secici)
  );
}

// ---------------------------------------------------------------------------
// 4. Denetimler
// ---------------------------------------------------------------------------

const cssHam = oku(CSS);
const xamlHam = oku(XAML);
const motionHam = oku(MOTION);

let kurallar = [];
let tumBildirim = [];

function s0_ayristiriciSaglam() {
  if (!cssHam) return;
  onay('S1 theme.css boş değil', cssHam.length > 2000, `${cssHam.length} karakter`);
  kurallar = ayikla(yorumsuz(cssHam));
  for (const k of kurallar) {
    for (const b of bildirimler(k.govde)) tumBildirim.push({ ...b, kural: k });
  }
  // Ayrıştırıcının kendisi çalışıyor mu: iki demir. Bunlar düşerse aşağıdaki
  // bütün "ihlal bulunamadı" sonuçları anlamsızdır.
  onay('S2 kural sayısı makul', kurallar.length >= 20, `${kurallar.length} kural bulundu`);
  onay(
    'S3 bildirim sayısı makul',
    tumBildirim.length >= 100,
    `${tumBildirim.length} bildirim bulundu`
  );
  const kok = kurallar.find((k) => k.secici === ':root');
  onay('S4 :root bloğu ayrıştırıldı', !!kok && kok.govde.includes('--tk-glow-blue'));
  const kfSayi = kurallar.filter((k) => k.keyframe).length;
  onay('S5 @keyframes adımları ayrıştırıldı', kfSayi >= 1, `${kfSayi} adım bulundu`);
  envanter.push(
    `kural: ${kurallar.length}, bildirim: ${tumBildirim.length}, keyframe adımı: ${kfSayi}`
  );
}

// --- 1. Glow tokenları -----------------------------------------------------

const BEKLENEN_TOKEN = {
  '--tk-glow-blue': '0 0 20px rgba(0, 243, 255, 0.3)',
  '--tk-glow-pink': '0 0 20px rgba(255, 0, 234, 0.3)',
  '--tk-glow-purple': '0 0 20px rgba(176, 38, 255, 0.3)',
  '--tk-glow-hero': '0 0 8px rgba(0, 243, 255, 0.8)',
};

function t1_tokenlar() {
  if (!kurallar.length) return;
  const bulunan = {};
  for (const b of tumBildirim) {
    if (b.ozellik.startsWith('--tk-glow-')) bulunan[b.ozellik] = b.deger;
  }
  const adlar = Object.keys(bulunan).sort();
  onay('T1.0 glow tokenı bulundu', adlar.length > 0, 'hiç `--tk-glow-*` tanımı yok');
  onay(
    'T1.1 token kümesi birebir aynı',
    adlar.join(',') === Object.keys(BEKLENEN_TOKEN).sort().join(','),
    `bulunan: ${adlar.join(', ') || '(yok)'}`
  );
  for (const [ad, deger] of Object.entries(BEKLENEN_TOKEN)) {
    onay(
      `T1.2 ${ad} değeri değişmemiş`,
      bulunan[ad] === deger,
      `beklenen "${deger}", bulunan "${bulunan[ad] || '(yok)'}"`
    );
  }
  envanter.push(`glow tokenı: ${adlar.length} (${adlar.join(', ')})`);

  // CSS ↔ XAML: hero glow iki platformda aynı yoğunlukta olmalı (SKILL §2).
  // İki dosyadan da makinece okunur, sabit sayı karşılaştırılmaz.
  if (!xamlHam) return;
  const hero = bulunan['--tk-glow-hero'] || '';
  const hm = hero.match(/([\d.]+)px\s+rgba?\([^)]*?([\d.]+)\s*\)/);
  onay('T1.3 hero tokenı okunabildi', !!hm, `"${hero}"`);
  const xm = xamlHam.match(/x:Key="HeroGlow"[\s\S]{0,400}?\/>/);
  onay('T1.4 XAML HeroGlow bulundu', !!xm);
  if (hm && xm) {
    const xb = xm[0].match(/BlurRadius="([\d.]+)"/);
    const xo = xm[0].match(/Opacity="([\d.]+)"/);
    onay(
      'T1.5 XAML blur = CSS blur',
      !!xb && Number(xb[1]) === Number(hm[1]),
      `XAML ${xb && xb[1]}, CSS ${hm[1]}`
    );
    onay(
      'T1.6 XAML opaklık = CSS alfa',
      !!xo && Number(xo[1]) === Number(hm[2]),
      `XAML ${xo && xo[1]}, CSS ${hm[2]}`
    );
  }
}

// --- 2. Glow tekrar eden öğeye düşmüyor ------------------------------------

/** `glowMu`'nun kendi birim testi. Bu olmadan bozuk bir desen "ihlal yok" der. */
function t2a_glowTanimi() {
  const glow = [
    ['box-shadow', 'var(--tk-glow-blue)'],
    ['filter', 'drop-shadow(var(--tk-glow-hero))'],
    ['box-shadow', '0 0 10px var(--tk-purple)'],
    ['box-shadow', '0 0 20px rgba(0, 243, 255, 0.3)'],
    ['box-shadow', 'inset 0 0 8px #00f3ff'],
    ['filter', 'drop-shadow(0 0 5px #ff00ea)'],
    ['-webkit-box-shadow', '0 0 12px var(--tk-pink)'],
  ];
  const glowDegil = [
    ['box-shadow', '0 0 0 2px #000000'], // odak halkası — bulanıklık yok
    ['box-shadow', '0 0 40px rgba(0, 0, 0, 0.8)'], // panel derinliği — siyah
    ['box-shadow', 'none'],
    ['filter', 'blur(4px)'], // drop-shadow değil
    ['background', '0 0 20px #00f3ff'], // gölge özelliği değil
    ['transition', 'box-shadow 240ms'], // T3'ün işi, glow değil
  ];
  for (const [p, v] of glow) {
    onay(`T2a glow sayılmalı: ${p}: ${v}`, glowMu({ ozellik: p, deger: v }));
  }
  for (const [p, v] of glowDegil) {
    onay(`T2a glow sayılmamalı: ${p}: ${v}`, !glowMu({ ozellik: p, deger: v }));
  }
}

function t2_tekrarEdenOge() {
  if (!kurallar.length) return;
  const glowlu = tumBildirim.filter(glowMu);
  // Bozuk desen sessizce geçmesin: bu temada glow VARDIR, sıfır bulmak hatadır.
  if (
    !onay(
      'T2.0 glow bildirimi bulundu',
      glowlu.length > 0,
      "hiç glow bulunamadı — desen bozuk ya da tema glow'suz kalmış"
    )
  )
    return;

  const seciciler = [];
  for (const b of glowlu) {
    const s = b.kural.secici;
    if (!seciciler.includes(s)) seciciler.push(s);
    for (const parca of s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)) {
      onay(
        `T2.1 "${parca}" tekrar eden öğe değil`,
        !tekrarEdenMi(parca),
        `glow tekrar eden öğeye verilmiş (${b.ozellik}: ${b.deger}) — glow kapsayıcı panele taşınır, satır kenarlık ve /20→/30 dolgu ile ayrılır (M15)`
      );
    }
  }
  // Deseni de denetle: bilinen ihlal örnekleri yakalanmalı, bilinen temiz
  // seçiciler yakalanmamalı. Bu olmadan `tekrarEdenMi` hep false dönerek geçer.
  for (const k of [
    '.log-row',
    'tbody tr',
    '.tk-table td',
    'li.item',
    '.grid-cell',
    '[role="row"]',
    '.list li:nth-child(2)',
    'ListBoxItem',
  ]) {
    onay(`T2.2 desen "${k}" yakalanıyor`, tekrarEdenMi(k));
  }
  for (const k of [
    '.tk-panel',
    '.tk-btn-primary',
    '.tk-hero',
    '::-webkit-scrollbar-thumb',
    ':focus-visible',
    '.tk-titlebar',
  ]) {
    onay(`T2.3 desen "${k}" yanlış yakalanmıyor`, !tekrarEdenMi(k));
  }
  envanter.push(`glow taşıyan seçici: ${seciciler.length} (${seciciler.join(' | ')})`);
}

// --- 3. M6: gölge ve filtre animasyonu -------------------------------------

function t3_golgeAnimasyonu() {
  if (!kurallar.length) return;
  const gecisler = tumBildirim.filter((b) =>
    /^(-webkit-)?(transition|transition-property|animation|animation-name)$/.test(b.ozellik)
  );
  if (
    !onay(
      'T3.0 geçiş bildirimi bulundu',
      gecisler.length > 0,
      'hiç `transition`/`animation` yok — desen bozuk ya da tema durgun kalmış'
    )
  )
    return;

  for (const b of gecisler) {
    const v = b.deger.toLowerCase();
    onay(
      `T3.1 "${b.kural.secici}" geçişinde box-shadow yok`,
      !/\bbox-shadow\b/.test(v),
      `${b.ozellik}: ${b.deger} — gölge animasyonu yerine renk/opaklık geçişi (M6)`
    );
    onay(
      `T3.2 "${b.kural.secici}" geçişinde filter yok`,
      !/\bfilter\b/.test(v),
      `${b.ozellik}: ${b.deger} — filtre animasyonu yerine opacity/transform (M6)`
    );
    onay(
      `T3.3 "${b.kural.secici}" geçişi "all" değil`,
      !/(^|[\s,])all([\s,]|$)/.test(v),
      `${b.ozellik}: ${b.deger} — "all" gölgeyi de kapsar; özellikler tek tek yazılır (M6)`
    );
  }
  // Keyframe içinde gölge/filtre değiştirmek de gölge animasyonudur.
  for (const b of tumBildirim) {
    if (!b.kural.keyframe) continue;
    onay(
      `T3.4 ${b.kural.keyframe} adımında box-shadow/filter yok`,
      !/^(-webkit-)?(box-shadow|filter)$/.test(b.ozellik),
      `${b.ozellik}: ${b.deger}`
    );
  }
  // Desen denetimi: ihlal metni gerçekten yakalanıyor mu?
  onay(
    'T3.5 desen ihlali yakalıyor',
    /\bbox-shadow\b/.test('box-shadow 240ms ease') && /(^|[\s,])all([\s,]|$)/.test('all 240ms')
  );
  envanter.push(`geçiş bildirimi: ${gecisler.length}`);
}

// --- 4. backdrop-filter yığılması ------------------------------------------

function t4_backdropFilter() {
  if (!kurallar.length) return;
  const bf = tumBildirim.filter(
    (b) => /^(-webkit-)?backdrop-filter$/.test(b.ozellik) && b.deger.toLowerCase() !== 'none'
  );
  const seciciler = bf.map((b) => b.kural.secici);
  onay(
    'T4.1 backdrop-filter sayısı ≤ 1',
    bf.length <= 1,
    `${bf.length} bulundu: ${seciciler.join(' | ')} — ikinci bulanık yüzey yerine opak zemin (M15)`
  );
  envanter.push(
    `backdrop-filter: ${bf.length}${seciciler.length ? ' (' + seciciler.join(' | ') + ')' : ''}`
  );
}

// --- 5. M15 belgede yerinde mi (tek başına yeterli değil) -------------------

function t5_motionM15() {
  if (!motionHam) return;
  const bolumler = motionHam.split(/^## /m);
  const m15 = bolumler.find((b) => b.startsWith('M15'));
  if (!onay('T5.1 motion.md M15 başlığı var', !!m15)) return;
  onay('T5.2 M15 gövdesi dolu', m15.length > 800, `${m15.length} karakter`);
  onay("T5.3 M15 gölge animasyonunu M6'ya havale ediyor", /\bM6\b/.test(m15));
  onay(
    'T5.4 M15 WPF DropShadowEffect yasağını taşıyor',
    /DropShadowEffect/.test(m15) && /yasak/i.test(m15)
  );
  onay('T5.5 M15 yasağın alternatifini yazıyor', /Yerine ne konur|Yerine:/.test(m15));
  onay('T5.6 M15 16 ms ölçütünü taşıyor', /16\s?ms/.test(m15));
  onay(
    'T5.7 M15 ölçüm reçetesi veriyor',
    /CompositionTarget\.Rendering/.test(m15) && /Performance/.test(m15)
  );
  onay('T5.8 M15 ölçülmediğini söylüyor', /ölçülmez|ölçülmedi/.test(m15));
  onay("T5.9 giriş atıf aralığı M15'i kapsıyor", /`M1`\s*…\s*`M15`/.test(motionHam));
}

// ---------------------------------------------------------------------------
// 5. Koşum
// ---------------------------------------------------------------------------

s0_ayristiriciSaglam();
t1_tokenlar();
t2a_glowTanimi();
t2_tekrarEdenOge();
t3_golgeAnimasyonu();
t4_backdropFilter();
t5_motionM15();

console.log('U8 glow — envanter (her koşuda yeniden sayılır):');
for (const e of envanter) console.log(`  · ${e}`);
console.log("  · kare süresi: ölçülmedi — Node'dan ölçülemez, reçetesi motion.md M15'te");
console.log(`U8 glow — ${gecen} doğrulama geçti, ${hatalar.length} düştü.`);

if (hatalar.length) {
  for (const h of hatalar.slice(0, 40)) console.log(`  KALDI  ${h}`);
  if (hatalar.length > 40) console.log(`  ... ve ${hatalar.length - 40} tane daha`);
  console.log('KALDI');
  process.exit(1);
}
console.log('GEÇTİ');
