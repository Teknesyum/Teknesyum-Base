#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { konfigKok, oturumKimligi, oturumProfilYolu, read, yaz } = require('../hooks/ortak.js');
const { s, oturumProfili, PROFILLER, BAYAT_MS } = require('../hooks/dil.js');

const PROFIL = {
  eco: {
    advisor: { model: 'haiku', effort: 'low', maxTurns: 12 },
    auditor: { model: 'haiku', effort: 'medium', maxTurns: 20 },
    builder: { model: 'haiku', effort: 'medium', maxTurns: 40 },
    planner: { model: 'haiku', effort: 'low', maxTurns: 30 },
    scout: { model: 'haiku', effort: 'low', maxTurns: 25 },
    scribe: { model: 'haiku', effort: 'low', maxTurns: 30 },
    'ui-builder': { model: 'haiku', effort: 'medium', maxTurns: 40 },
  },
  normal: {
    advisor: { model: 'sonnet', effort: 'medium', maxTurns: 15 },
    auditor: { model: 'sonnet', effort: 'high', maxTurns: 30 },
    builder: { model: 'sonnet', effort: 'medium', maxTurns: 60 },
    planner: { model: 'sonnet', effort: 'medium', maxTurns: 40 },
    scout: { model: 'sonnet', effort: 'high', maxTurns: 45 },
    scribe: { model: 'haiku', effort: 'low', maxTurns: 40 },
    'ui-builder': { model: 'sonnet', effort: 'medium', maxTurns: 60 },
  },
  premium: {
    advisor: { model: 'fable', effort: 'medium', maxTurns: 20 },
    auditor: { model: 'opus', effort: 'xhigh', maxTurns: 40 },
    builder: { model: 'opus', effort: 'xhigh', maxTurns: 80 },
    planner: { model: 'opus', kabul: ['fable'], effort: 'medium', maxTurns: 40 },
    scout: { model: 'opus', effort: 'high', maxTurns: 60 },
    scribe: { model: 'opus', effort: 'low', maxTurns: 40 },
    'ui-builder': { model: 'opus', effort: 'xhigh', maxTurns: 80 },
  },
};

const TAKMA = {
  ac: 'premium',
  aç: 'premium',
  on: 'premium',
  kapat: 'normal',
  off: 'normal',
  standart: 'normal',
};

const KONSEY = ['fable', 'opus'];
const GORUS = 'fable';

const DUGME = {
  eco: {
    autocompact: '150000',
    ask_threshold: 'critical',
    approval_gate: 'none',
    audit: 'very-critical',
    fix_ceiling: '3',
    model_escalation: 'on',
    parallel_width: '1',
    default_model: 'haiku',
    worktree_isolation: 'off',
    report_length: 'short',
    briefing: 'quiet',
    plan_council: 'off',
    second_opinion: 'off',
    research_repos: '1',
    agent_stall: '10',
    agent_loop: '5',
  },
  normal: {
    autocompact: 'auto',
    ask_threshold: 'critical',
    approval_gate: 'none',
    audit: 'critical',
    fix_ceiling: '5',
    model_escalation: 'on',
    parallel_width: '2',
    default_model: 'sonnet',
    worktree_isolation: 'off',
    report_length: 'short',
    briefing: 'milestone',
    plan_council: 'off',
    second_opinion: 'off',
    research_repos: '10',
    agent_stall: '10',
    agent_loop: '5',
  },
  premium: {
    autocompact: '500000',
    ask_threshold: 'critical',
    approval_gate: 'none',
    audit: 'high',
    fix_ceiling: '8',
    model_escalation: 'off',
    parallel_width: '20',
    default_model: 'opus',
    worktree_isolation: 'on',
    report_length: 'detailed',
    briefing: 'every-step',
    plan_council: 'on',
    second_opinion: 'on',
    research_repos: '50',
    agent_stall: '10',
    agent_loop: '5',
  },
};

function arg(ad, varsayilan) {
  const i = process.argv.indexOf('--' + ad);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : varsayilan;
}
function dur(mesaj) {
  process.stderr.write(mesaj + '\n');
  process.exit(1);
}

function eklentiKok() {
  return path.resolve(arg('kok', path.join(__dirname, '..')));
}

function konfigOku() {
  try {
    return JSON.parse(fs.readFileSync(path.join(konfigKok(), 'teknesyum.json'), 'utf8'));
  } catch {
    return {};
  }
}
function konfigProfili(c) {
  if (PROFILLER.includes(c.profil)) return c.profil;
  if (c.premium === true) return 'premium';
  return 'normal';
}

function konfigYaz(profil) {
  const kok = konfigKok();
  const c = konfigOku();
  c.profil = profil;
  c.premium = profil === 'premium';
  fs.mkdirSync(kok, { recursive: true });
  fs.writeFileSync(path.join(kok, 'teknesyum.json'), JSON.stringify(c, null, 2) + '\n', 'utf8');
}

function ayarYolu() {
  return path.join(konfigKok(), 'settings.json');
}

const AC_ALT = 100000;
const AC_UST = 1000000;
const AC_EZEN = 'CLAUDE_CODE_AUTO_COMPACT_WINDOW';

function acEzenNotu() {
  const e = process.env[AC_EZEN];
  return e ? AC_EZEN + '=' + e + ' ortam değişkeni ayarı eziyor; kaldırmadan etkisi yok\n' : '';
}

// `settings.json` oturum açılışında okunur. Değeri yazıp susmak, komutun işe yaramadığı
// izlenimini veriyor: kullanıcı `/premium premium` diyor, çıktı "1000000 yazıldı" diyor,
// ekranın üstündeki pencere aynı kalıyor. İki ayrı sebep var ve ikisi de söylenmeli —
// biri geçici (yeniden başlatma), öteki kalıcı (modelin bağlam tavanı).
function acYururlukNotu(degisti) {
  if (!degisti) return [];
  return [
    'Bu oturumda henüz yürürlükte değil: settings.json oturum açılışında okunur,',
    'yeni pencere Claude Code yeniden başlayınca geçerli olur.',
  ];
}

// `1000000` bir tavandır, garanti değil — fiili pencere modelin bağlam penceresi kadardır.
//
// DÜZELTME (23.08.2026, `docs/openlogs/kapali/HATA-200k-baglam-penceresi-iddiasi.md`): burada bir
// dönem "Opus'ta ~200k" yazıyordu ve **yanlıştı**. Opus 4.7'nin ve Sonnet 5'in yerel
// penceresi **1M**; 200k bugün varsayılan değil, **kapatılmış hâlin** sonucu. Üç yoldan
// biriyle doğar: `CLAUDE_CODE_DISABLE_1M_CONTEXT` set edilmiştir,
// `CLAUDE_CODE_MAX_CONTEXT_TOKENS` elle kısılmıştır, ya da model 1M taşımıyordur.
//
// Bu yüzden not artık sabit bir sayı söylemiyor — **ölçüyor**: kısıtlayan bir değişken
// varsa onu adıyla söyler, yoksa yalnız "tavan, garanti değil" der.
const KISITLAYAN = ['CLAUDE_CODE_DISABLE_1M_CONTEXT', 'CLAUDE_CODE_MAX_CONTEXT_TOKENS'];

function acTavanNotu(deger) {
  if (typeof deger !== 'number' || deger <= 200000) return '';
  const kisit = KISITLAYAN.filter((k) => process.env[k]);
  if (kisit.length)
    return (
      ' · tavan, garanti değil — pencere ' + kisit.join(' ve ') + ' ile kısılmış, o kadar açılır'
    );
  return ' · tavan, garanti değil — fiili pencere modelin bağlam penceresi kadar';
}

function acYaz(yol, deger) {
  let a = {};
  try {
    a = JSON.parse(fs.readFileSync(yol, 'utf8'));
  } catch {}
  const simdi = typeof a.autoCompactWindow === 'number' ? a.autoCompactWindow : 'auto';
  if (simdi === deger) return { yol, deger, degisti: false };
  if (deger === 'auto') delete a.autoCompactWindow;
  else a.autoCompactWindow = deger;
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(yol, JSON.stringify(a, null, 2) + '\n', 'utf8');
  return { yol, deger, degisti: true };
}

function autocompactYaz(profil) {
  const ham = DUGME[profil].autocompact;
  return acYaz(ayarYolu(), ham === 'auto' ? 'auto' : Number(ham));
}

function bayatSil(dizin) {
  let liste = [];
  try {
    liste = fs.readdirSync(dizin);
  } catch {
    return;
  }
  for (const f of liste) {
    if (!f.endsWith('.json')) continue;
    const yol = path.join(dizin, f);
    const k = read(yol);
    if (!k) continue;
    const ts = Number(k.ts);
    if (!Number.isFinite(ts) || Date.now() - ts <= BAYAT_MS) continue;
    try {
      fs.unlinkSync(yol);
    } catch {}
  }
}

function oturumYaz(sid, profil) {
  const yol = oturumProfilYolu(sid);
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  bayatSil(path.dirname(yol));
  const eski = read(yol) || {};
  yaz(yol, { ...eski, profil, pid: process.pid, ts: Date.now(), cwd: process.cwd() });
  return yol;
}

const OTURUM_DEFTER = ['pid', 'ts', 'cwd'];

function oturumSil(sid, anahtar) {
  const yol = oturumProfilYolu(sid);
  const k = read(yol);
  if (!k) return { yol, vardi: false };
  const vardi = k[anahtar] !== undefined;
  delete k[anahtar];
  const kalan = Object.keys(k).filter((a) => !OTURUM_DEFTER.includes(a));
  try {
    if (kalan.length) yaz(yol, k);
    else fs.unlinkSync(yol);
  } catch {}
  return { yol, vardi };
}

function ajanYolu(kok, ad) {
  return path.join(kok, 'agents', ad + '.md');
}

const TABAN = 'normal';

const KANCA_DUGME = ['agent_stall', 'agent_loop', 'autocompact'];

function sapmalar(profil) {
  const t = DUGME[TABAN];
  const d = DUGME[profil] || t;
  const s = {};
  for (const k of Object.keys(d)) if (d[k] !== t[k]) s[k] = d[k];
  return s;
}

function sapmaSatiri(profil) {
  const s = sapmalar(profil);
  return Object.keys(s)
    .filter((k) => !KANCA_DUGME.includes(k))
    .map((k) => k + ' ' + s[k])
    .join(' · ');
}

function ajanProfili(kok) {
  const sonuc = {};
  for (const ad of Object.keys(PROFIL.normal)) {
    const yol = ajanYolu(kok, ad);
    if (!fs.existsSync(yol)) continue;
    const m = fs.readFileSync(yol, 'utf8');
    const al = (a) => {
      const b = m.match(new RegExp('^' + a + ':[ \\t]*(.+)$', 'm'));
      return b ? b[1].trim() : '';
    };
    sonuc[ad] = { effort: al('effort'), maxTurns: al('maxTurns') };
  }
  return sonuc;
}

function sapmaMetni(profil) {
  return sapmaSatiri(profil) || 'yok — taban profil';
}

// Kapsam sözleşmesi (docs/ROTA-kapsam-this.md): çıplak komut makine varsayılanını yazar,
// `this` eklenince yalnız içinde bulunulan oturumu yazar. Eskiden tersiydi ve sessizce
// geri alınan ayar üretiyordu: kullanıcı profili seçiyor, sohbet kapanıyor, varsayılan
// geri düşüyordu. Nadir olan açıkça istenir, sık olan yazılmaz.
function uygula(profil, oturuma) {
  const kimlik = oturumKimligi();
  if (oturuma && !kimlik)
    dur('`this` bir oturum kimliği ister; bu koşumda CLAUDE_CODE_SESSION_ID yok');
  const sid = oturuma ? kimlik : '';
  const golge = sid ? null : kimlik && oturumProfili(kimlik);
  const kayit = sid ? oturumYaz(sid, profil) : path.join(konfigKok(), 'teknesyum.json');
  if (!sid) konfigYaz(profil);
  const ac = sid ? null : autocompactYaz(profil);
  const p = PROFIL[profil];
  const d = DUGME[profil];
  process.stdout.write(
    [
      'profil: ' + profil,
      'ajanlar: ' +
        Object.keys(p)
          .map((a) => a + ' ' + p[a].model + '/' + p[a].effort)
          .join(' · '),
      'paralel: ' + d.parallel_width + ' · varsayılan model: ' + d.default_model,
      'denetim: ' + d.audit + ' · worktree: ' + d.worktree_isolation,
      'plan konseyi: ' +
        (d.plan_council === 'on' ? KONSEY.join(' + ') : 'kapalı') +
        ' · ikinci görüş: ' +
        (d.second_opinion === 'on' ? p.advisor.model : 'kapalı') +
        ' · ön araştırma: ' +
        d.research_repos +
        '+ depo',
      'sapan düğme: ' + sapmaMetni(profil),
      'dosya yazılmadı: ajan frontmatter’ı ve SETTINGS.md makine tabanıdır',
      ...(profil === 'eco'
        ? ['/save ham transkripti gzipli yazar (ham.jsonl.gz), /loadall tek satıra iner']
        : []),
      'kayıt: ' + (sid ? 'oturum' : 'makine') + ' · ' + kayit,
      ...(ac
        ? [
            'autoCompactWindow: ' +
              ac.deger +
              (ac.degisti ? ' yazıldı' : ' zaten böyleydi') +
              acTavanNotu(ac.deger),
            ...acYururlukNotu(ac.degisti),
          ]
        : ['autoCompactWindow: dokunulmadı — oturum profili makine ayarını taşımaz']),
      ...golgeUyarisi(profil, golge),
    ].join('\n') + '\n'
  );
}

// ÖLÇÜLDÜ değil, tasarımdan gelen tek gerçek bedel (ROTA-kapsam-this.md §5): oturum
// kaydı okuma sırasında makine varsayılanının üstündedir. Bu sohbette `this` ile ayar
// yapılmışsa çıplak komut geneli değiştirir ama burada hiçbir şey değişmez. Söylenmezse
// kullanıcı komutun çalışmadığını sanır.
function golgeUyarisi(yazilan, golge) {
  if (!golge || golge === yazilan) return [];
  return [
    '',
    'Makine varsayılanı ' + yazilan + ' oldu.',
    'Bu sohbette ' + golge + ' yürürlükte — oturuma özel ayar üstte kalır.',
    'Bu sohbeti de geneline döndürmek için: /premium this sil',
  ];
}

function oturumTemizle() {
  const sid = oturumKimligi();
  if (!sid) dur('`this sil` bir oturum kimliği ister; bu koşumda CLAUDE_CODE_SESSION_ID yok');
  const r = oturumSil(sid, 'profil');
  const c = konfigOku();
  process.stdout.write(
    [
      r.vardi
        ? 'oturuma özel profil silindi · ' + r.yol
        : 'bu sohbette oturuma özel profil zaten yoktu',
      'yürürlükteki profil: ' + konfigProfili(c) + ' (makine)',
    ].join('\n') + '\n'
  );
}

function acDurum(beklenen) {
  const ham = DUGME[beklenen].autocompact;
  const hedef = ham === 'auto' ? 'auto' : Number(ham);
  let ayar = null;
  try {
    ayar = JSON.parse(fs.readFileSync(ayarYolu(), 'utf8')).autoCompactWindow;
  } catch {}
  const simdi = typeof ayar === 'number' ? ayar : 'auto';
  const not = process.env[AC_EZEN] ? ' · ' + AC_EZEN + ' eziyor' : '';
  if (simdi === hedef) return simdi + ' · profille uyumlu' + acTavanNotu(simdi) + not;
  return (
    simdi +
    ' · ' +
    beklenen +
    ' profili ' +
    hedef +
    ' ister — makine geneli, oturum profili taşımaz; /autocompact ile bağla' +
    not
  );
}

function durum() {
  const kok = eklentiKok();
  const c = konfigOku();
  const simdi = ajanProfili(kok);
  const sid = oturumKimligi();
  const oturum = sid ? oturumProfili(sid) : null;
  const beklenen = oturum || konfigProfili(c);
  const p = PROFIL[beklenen];
  const d = DUGME[beklenen];
  const satir = [
    'yürürlükteki profil: ' + beklenen + ' (kaynak: ' + (oturum ? 'oturum' : 'makine') + ')',
    'sapan düğme: ' + sapmaMetni(beklenen),
    'düğme tabanı: SETTINGS.md — makine varsayılanı, profil onu ezmez',
    'konfig profili: ' +
      konfigProfili(c) +
      (c.profil === undefined ? ' (eski premium alanından)' : ''),
    'paralel: ' +
      d.parallel_width +
      ' ajan · ön araştırma: ' +
      d.research_repos +
      '+ depo · denetim: ' +
      d.audit,
    'plan konseyi: ' +
      (d.plan_council === 'on' ? KONSEY.join(' + ') : 'off') +
      ' · ikinci görüş: ' +
      (d.second_opinion === 'on' ? p.advisor.model : 'off'),
    'sıkıştırma penceresi: ' + acDurum(beklenen),
    ...Object.keys(simdi).map(
      (a) =>
        '  ' +
        a.padEnd(11) +
        'çağrı ' +
        p[a].model +
        ' · efor ' +
        simdi[a].effort +
        ' · tur ' +
        simdi[a].maxTurns
    ),
    s('eforIzole'),
  ];
  process.stdout.write(satir.join('\n') + '\n');
}

function yardim() {
  process.stdout.write(
    [
      'premium.js — üç profil arasında geçiş yapar',
      '',
      '  node premium.js eco      haiku · 1 paralel ajan · 1 depo · denetim very-critical',
      '  node premium.js normal   sonnet · 2 paralel ajan · 10 depo · denetim critical',
      '  node premium.js premium  opus/xhigh · 20 paralel ajan · 50 depo · denetim high',
      '  node premium.js durum    hangi profilin yürürlükte olduğunu söyler',
      '  node premium.js <profil> this      yalnız bu oturumu yazar, makineye dokunmaz',
      '  node premium.js this sil           bu oturuma özel profili siler, geneline döner',
      '  node premium.js autocompact [sayı] pencereyi profilden türetir ya da elle yazar',
      '',
      'Hiçbiri depo dosyası yazmaz. Ajan frontmatter’ı ve relay `SETTINGS.md` makine',
      'tabanıdır ve `' + TABAN + '` profilin değerlerinde donar; profilin tabandan sapan düğmeleri',
      'oturumun kanca enjeksiyonuyla gider. Kapsam sözleşmesi tek cümledir: çıplak komut',
      'makine varsayılanını (~/.claude/teknesyum.json) yazar, sonuna `this` eklenirse yalnız',
      'içinde bulunulan oturumu (~/.claude/teknesyum/oturumlar/<oturum>.json) yazar. Okuma',
      'sırası değişmez ve oturum kaydı üstte kalır: TEKNESYUM_PREMIUM → oturum → makine →',
      'normal. Yani makine varsayılanı premium olsa da tek bir sohbette `eco this` serbesttir.',
      'Oturuma özel ayarı geri almanın yolu `this sil`. Eski çağrılar durur: `ac` premium,',
      '`kapat` normal, `--genel` çıplak komutla aynı şey demektir.',
      '',
      'eco — token kısıtken. Her rol ' +
        PROFIL.eco.builder.model +
        ', kod yazan ve denetleyen roller `medium` eforda kalır; denetim yalnız geri',
      '  dönüşü en pahalı sözleşmede açılır. `/save` ham transkripti gzipli yazar',
      '  (ham.jsonl.gz), `/loadall`',
      '  proje başına tek satır basar — devam promptu ikisinde de kısalmaz.',
      'normal — varsayılan. ' +
        PROFIL.normal.builder.model +
        ', iki paralel ajan, denetim kritik eşiğinde; konsey ve görüş kapalı.',
      'premium — hız ve kalite öncelikli. ' +
        PROFIL.premium.builder.model +
        ', 20 paralel ajan, worktree izolasyonu açık. Plan konseyi açılır (' +
        KONSEY.join(' + ') +
        ')',
      '  ve karar düğümünde ' +
        GORUS +
        ' modelindeki `advisor` ajanı üç başlıklı kısa bir görüş verir; karar T0’da kalır.',
      '',
      'Tek istisna `autoCompactWindow`: o `settings.json` dosyasına yazılır, çünkü koşum',
      'ortamı onu oturum açılışında okur. Bu yüzden yalnız çıplak (makine) yazımda',
      'güncellenir; `this` ile yapılan oturum yazımı ona dokunmaz.',
      '',
      'Dosya yazılmadığı için eklenti güncellemesiyle profil arasında uyuşmazlık da oluşmaz.',
    ].join('\n') + '\n'
  );
}

function pozisyonelHepsi(bas) {
  const g = process.argv.slice(bas);
  const c = [];
  for (let i = 0; i < g.length; i++) {
    if (g[i].startsWith('--')) {
      if (g[i + 1] && !g[i + 1].startsWith('--')) i++;
      continue;
    }
    c.push(g[i]);
  }
  return c;
}

// `this` sözlüğün parçası değil, sözlüğün üstüne binen tek kelimelik kapsam ekidir.
// Yeri hep sonda: ya son kelime, ya `sil` alt komutundan hemen önce. Ortada geçen bir
// `this` kapsam eki değil argümandır — dosya adı olabilir, düşürülmez.
function kapsamAyir(arg) {
  const a = arg.slice();
  let oturuma = false;
  const son = a.length - 1;
  if (a[son] === 'this') {
    a.pop();
    oturuma = true;
  } else if (son >= 1 && a[son] === 'sil' && a[son - 1] === 'this') {
    a.splice(son - 1, 1);
    oturuma = true;
  }
  return { arg: a, oturuma };
}

function autocompact(arg) {
  const istek = (arg || pozisyonelHepsi(3))[0];
  if (istek === undefined) {
    const c = konfigOku();
    const profil = konfigProfili(c);
    const r = autocompactYaz(profil);
    process.stdout.write(
      'profil: ' +
        profil +
        ' (makine)\nautoCompactWindow: ' +
        r.deger +
        (r.degisti ? ' yazıldı' : ' zaten böyleydi') +
        acTavanNotu(r.deger) +
        '\n' +
        [...acYururlukNotu(r.degisti), r.yol].join('\n') +
        '\n' +
        acEzenNotu()
    );
    return;
  }
  if (istek !== 'auto' && !/^\d+$/.test(istek))
    dur('autocompact `auto` ya da bir sayı ister: node premium.js autocompact 400000');
  if (istek !== 'auto' && (Number(istek) < AC_ALT || Number(istek) > AC_UST))
    dur(
      'autoCompactWindow ' +
        AC_ALT +
        '–' +
        AC_UST +
        ' aralığında olmalı; dışını Claude Code sessizce yok sayar ve `auto` çalışır'
    );
  const r = acYaz(ayarYolu(), istek === 'auto' ? 'auto' : Number(istek));
  process.stdout.write(
    'autoCompactWindow: ' +
      r.deger +
      ' yazıldı (elle)' +
      acTavanNotu(r.deger) +
      '\n' +
      [...acYururlukNotu(r.degisti), r.yol].join('\n') +
      '\n' +
      acEzenNotu()
  );
}

function main() {
  const { arg, oturuma } = kapsamAyir(pozisyonelHepsi(2));
  const komut = arg[0];
  const secilen = TAKMA[komut] || (PROFILLER.includes(komut) ? komut : '');
  if (process.argv.includes('--help') || process.argv.includes('-h')) yardim();
  else if (komut === undefined && oturuma) uygula('premium', true);
  else if (!komut || komut === 'yardim') yardim();
  else if (komut === 'sil' && oturuma) oturumTemizle();
  else if (komut === 'autocompact') autocompact(arg.slice(1));
  else if (secilen) uygula(secilen, oturuma);
  else if (komut === 'durum' || komut === 'status') durum();
  else dur('bilinmeyen komut: ' + komut);
}

module.exports = { PROFIL, DUGME, TABAN, KANCA_DUGME, sapmalar, sapmaSatiri, autocompactYaz };

if (require.main === module) main();
