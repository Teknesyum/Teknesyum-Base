#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { konfigKok } = require('../hooks/ortak.js');

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
    advisor: { model: 'sonnet', effort: 'low', maxTurns: 15 },
    auditor: { model: 'sonnet', effort: 'high', maxTurns: 30 },
    builder: { model: 'sonnet', effort: 'medium', maxTurns: 60 },
    planner: { model: 'sonnet', effort: 'high', maxTurns: 40 },
    scout: { model: 'sonnet', effort: 'high', maxTurns: 45 },
    scribe: { model: 'haiku', effort: 'low', maxTurns: 40 },
    'ui-builder': { model: 'sonnet', effort: 'medium', maxTurns: 60 },
  },
  premium: {
    advisor: { model: 'fable', effort: 'low', maxTurns: 20 },
    auditor: { model: 'opus', effort: 'xhigh', maxTurns: 40 },
    builder: { model: 'opus', effort: 'xhigh', maxTurns: 80 },
    planner: { model: 'opus', effort: 'xhigh', maxTurns: 40 },
    scout: { model: 'opus', effort: 'high', maxTurns: 60 },
    scribe: { model: 'opus', effort: 'low', maxTurns: 40 },
    'ui-builder': { model: 'opus', effort: 'xhigh', maxTurns: 80 },
  },
};

const PROFILLER = ['eco', 'normal', 'premium'];

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
    ask_threshold: 'critical',
    approval_gate: 'none',
    audit: 'critical',
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
    ask_threshold: 'critical',
    approval_gate: 'none',
    audit: 'every-contract',
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
    ask_threshold: 'critical',
    approval_gate: 'none',
    audit: 'every-contract',
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

function ajanYolu(kok, ad) {
  return path.join(kok, 'agents', ad + '.md');
}

function alanYaz(metin, anahtar, deger) {
  const d = new RegExp('^(' + anahtar + ':[ \\t]*)(.+)$', 'm');
  if (!d.test(metin)) return metin;
  return metin.replace(d, (_, bas) => bas + deger);
}

function ajanlariYaz(kok, profil) {
  const p = PROFIL[profil];
  const degisen = [];
  for (const ad of Object.keys(p)) {
    const yol = ajanYolu(kok, ad);
    if (!fs.existsSync(yol)) dur('ajan dosyası yok: ' + yol);
    const eski = fs.readFileSync(yol, 'utf8');
    let yeni = alanYaz(eski, 'model', p[ad].model);
    yeni = alanYaz(yeni, 'effort', p[ad].effort);
    yeni = alanYaz(yeni, 'maxTurns', String(p[ad].maxTurns));
    if (yeni !== eski) {
      fs.writeFileSync(yol, yeni, 'utf8');
      degisen.push(ad);
    }
  }
  return degisen;
}

function ayarYolu(kok) {
  return path.join(kok, 'skills', 'relay', 'SETTINGS.md');
}

function dugmeleriYaz(kok, profil) {
  const yol = ayarYolu(kok);
  if (!fs.existsSync(yol)) dur('SETTINGS.md yok: ' + yol);
  let metin = fs.readFileSync(yol, 'utf8');
  const d = DUGME[profil];
  for (const anahtar of Object.keys(d)) {
    const kalip = new RegExp('^([ \\t]*' + anahtar + '[ \\t]*:[ \\t]*)(\\S+)([ \\t]*)(#.*)?$', 'm');
    metin = metin.replace(kalip, (satir, bas, eski, bosluk, not) => {
      if (!not) return bas + d[anahtar];
      const sutun = satir.indexOf('#');
      return (bas + d[anahtar]).padEnd(sutun) + not;
    });
  }
  fs.writeFileSync(yol, metin, 'utf8');
}

function dugmeOku(kok, anahtar) {
  try {
    const metin = fs.readFileSync(ayarYolu(kok), 'utf8');
    const m = metin.match(new RegExp('^[ \\t]*' + anahtar + '[ \\t]*:[ \\t]*(\\S+)', 'm'));
    return m ? m[1] : '';
  } catch {
    return '';
  }
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
    sonuc[ad] = { model: al('model'), effort: al('effort'), maxTurns: al('maxTurns') };
  }
  return sonuc;
}

function profilAdi(kok) {
  const simdi = ajanProfili(kok);
  for (const ad of ['premium', 'normal', 'eco']) {
    const bekle = PROFIL[ad];
    const tam = Object.keys(bekle).every(
      (a) =>
        simdi[a] &&
        simdi[a].model === bekle[a].model &&
        simdi[a].effort === bekle[a].effort &&
        simdi[a].maxTurns === String(bekle[a].maxTurns)
    );
    if (tam) return ad;
  }
  return 'karışık';
}

function uygula(profil) {
  const kok = eklentiKok();
  const degisen = ajanlariYaz(kok, profil);
  dugmeleriYaz(kok, profil);
  konfigYaz(profil);
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
      'değişen ajan dosyası: ' + (degisen.length ? degisen.join(', ') : 'yok, zaten uygundu'),
      ...(profil === 'eco'
        ? ['/save ham transkripti gzipli yazar (ham.jsonl.gz), /loadall tek satıra iner']
        : []),
      'konfig: ' + path.join(konfigKok(), 'teknesyum.json'),
    ].join('\n') + '\n'
  );
}

function durum() {
  const kok = eklentiKok();
  const c = konfigOku();
  const p = profilAdi(kok);
  const simdi = ajanProfili(kok);
  const konsey = dugmeOku(kok, 'plan_council');
  const gorus = dugmeOku(kok, 'second_opinion');
  const depo = dugmeOku(kok, 'research_repos');
  const paralel = dugmeOku(kok, 'parallel_width');
  const denetim = dugmeOku(kok, 'audit');
  const beklenen = konfigProfili(c);
  const satir = [
    'yürürlükteki profil: ' + p,
    'konfig profili: ' + beklenen + (c.profil === undefined ? ' (eski premium alanından)' : ''),
    'paralel: ' +
      (paralel ? paralel + ' ajan' : 'okunamadı') +
      ' · ön araştırma: ' +
      (depo ? depo + '+ depo' : 'okunamadı') +
      ' · denetim: ' +
      (denetim || 'okunamadı'),
    'plan konseyi: ' +
      (konsey === 'on' ? KONSEY.join(' + ') : konsey || 'okunamadı') +
      ' · ikinci görüş: ' +
      (gorus === 'on' ? (simdi.advisor || {}).model || GORUS : gorus || 'okunamadı'),
    ...Object.keys(simdi).map(
      (a) =>
        '  ' + a.padEnd(11) + simdi[a].model + '/' + simdi[a].effort + ' · tur ' + simdi[a].maxTurns
    ),
  ];
  if (p !== beklenen) {
    satir.push(
      'UYUŞMAZLIK: konfig ' +
        beklenen +
        ' diyor, dosyalar ' +
        p +
        '. /premium ' +
        beklenen +
        ' ile eşitle.'
    );
  }
  process.stdout.write(satir.join('\n') + '\n');
}

function yardim() {
  process.stdout.write(
    [
      'premium.js — üç profil arasında geçiş yapar',
      '',
      '  node premium.js eco      haiku · 1 paralel ajan · 1 depo · denetim critical',
      '  node premium.js normal   sonnet · 2 paralel ajan · 10 depo · her sözleşme denetlenir',
      '  node premium.js premium  opus/xhigh · 20 paralel ajan · 50 depo · her sözleşme denetlenir',
      '  node premium.js durum    hangi profilin yürürlükte olduğunu söyler',
      '',
      'Üçü de aynı üç yeri yazar: ajan frontmatter’ı, relay düğmeleri ve',
      '~/.claude/teknesyum.json içindeki `profil` alanı. Eski çağrılar durur: `ac` premium,',
      '`kapat` normal demektir.',
      '',
      'eco — token kısıtken. Her rol ' +
        PROFIL.eco.builder.model +
        ', kod yazan ve denetleyen roller `medium` eforda kalır; denetim yalnız kritik',
      '  sözleşmede açılır. `/save` ham transkripti gzipli yazar (ham.jsonl.gz), `/loadall`',
      '  proje başına tek satır basar — devam promptu ikisinde de kısalmaz.',
      'normal — varsayılan. ' +
        PROFIL.normal.builder.model +
        ', iki paralel ajan, her sözleşme denetlenir; konsey ve görüş kapalı.',
      'premium — hız ve kalite öncelikli. ' +
        PROFIL.premium.builder.model +
        ', 20 paralel ajan, worktree izolasyonu açık. Plan konseyi açılır (' +
        KONSEY.join(' + ') +
        ')',
      '  ve karar düğümünde ' +
        GORUS +
        ' modelindeki `advisor` ajanı üç başlıklı kısa bir görüş verir; karar T0’da kalır.',
      '',
      'Eklenti güncellemesi ajan dosyalarını geri alabilir; `durum` uyuşmazlığı söyler.',
    ].join('\n') + '\n'
  );
}

const komut = process.argv[2];
const secilen = TAKMA[komut] || (PROFILLER.includes(komut) ? komut : '');
if (!komut || komut === '--help' || komut === '-h' || komut === 'yardim') yardim();
else if (secilen) uygula(secilen);
else if (komut === 'durum' || komut === 'status') durum();
else dur('bilinmeyen komut: ' + komut);
