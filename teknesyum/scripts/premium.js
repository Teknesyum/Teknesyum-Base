#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { konfigKok } = require('../hooks/ortak.js');

const PROFIL = {
  standart: {
    auditor: { model: 'sonnet', effort: 'high', maxTurns: 30 },
    builder: { model: 'sonnet', effort: 'medium', maxTurns: 60 },
    planner: { model: 'sonnet', effort: 'high', maxTurns: 40 },
    scout: { model: 'sonnet', effort: 'high', maxTurns: 45 },
    scribe: { model: 'haiku', effort: 'low', maxTurns: 40 },
    'ui-builder': { model: 'sonnet', effort: 'medium', maxTurns: 60 },
  },
  premium: {
    auditor: { model: 'opus', effort: 'xhigh', maxTurns: 40 },
    builder: { model: 'opus', effort: 'xhigh', maxTurns: 80 },
    planner: { model: 'opus', effort: 'xhigh', maxTurns: 40 },
    scout: { model: 'opus', effort: 'high', maxTurns: 60 },
    scribe: { model: 'opus', effort: 'low', maxTurns: 40 },
    'ui-builder': { model: 'opus', effort: 'xhigh', maxTurns: 80 },
  },
};

const KONSEY = ['fable', 'opus'];
const GORUS = 'fable';

const DUGME = {
  standart: {
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
  },
  premium: {
    ask_threshold: 'critical',
    approval_gate: 'none',
    audit: 'every-contract',
    fix_ceiling: '8',
    model_escalation: 'off',
    parallel_width: '6',
    default_model: 'opus',
    worktree_isolation: 'on',
    report_length: 'detailed',
    briefing: 'every-step',
    plan_council: 'on',
    second_opinion: 'on',
    research_repos: '50',
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
function konfigYaz(deger) {
  const kok = konfigKok();
  const c = konfigOku();
  c.premium = deger;
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
  for (const ad of Object.keys(PROFIL.standart)) {
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
  for (const ad of ['premium', 'standart']) {
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
  konfigYaz(profil === 'premium');
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
        (d.second_opinion === 'on' ? GORUS : 'kapalı') +
        ' · ön araştırma: ' +
        d.research_repos +
        '+ depo',
      'değişen ajan dosyası: ' + (degisen.length ? degisen.join(', ') : 'yok, zaten uygundu'),
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
  const satir = [
    'konfig premium: ' + (c.premium === true ? 'açık' : 'kapalı'),
    'dosyalardaki profil: ' + p,
    'plan konseyi: ' +
      (konsey === 'on' ? KONSEY.join(' + ') : konsey || 'okunamadı') +
      ' · ikinci görüş: ' +
      (gorus === 'on' ? GORUS : gorus || 'okunamadı') +
      ' · ön araştırma: ' +
      (depo ? depo + '+ depo' : 'okunamadı'),
    ...Object.keys(simdi).map(
      (a) =>
        '  ' + a.padEnd(11) + simdi[a].model + '/' + simdi[a].effort + ' · tur ' + simdi[a].maxTurns
    ),
  ];
  const beklenen = c.premium === true ? 'premium' : 'standart';
  if (p !== beklenen) {
    satir.push(
      'UYUŞMAZLIK: konfig ' +
        beklenen +
        ' diyor, dosyalar ' +
        p +
        '. /premium ' +
        (beklenen === 'premium' ? 'aç' : 'kapat') +
        ' ile eşitle.'
    );
  }
  process.stdout.write(satir.join('\n') + '\n');
}

function yardim() {
  process.stdout.write(
    [
      'premium.js — Max 20x profilini açar ve kapatır',
      '',
      '  node premium.js ac      opus + xhigh + 6 paralel ajan + plan konseyi + ikinci görüş',
      '  node premium.js kapat   standart profile döner',
      '  node premium.js durum   hangi profilin yürürlükte olduğunu söyler',
      '',
      "Ajan frontmatter'ı, relay düğmeleri ve ~/.claude/teknesyum.json birlikte yazılır.",
      'Premiumda plan konseyi açılır (' +
        KONSEY.join(' + ') +
        ') ve ön araştırma tavanı 10 depodan 50 depoya çıkar.',
      'İkinci görüş de açılır: karar düğümünde ' +
        GORUS +
        ' üç başlıklı kısa bir görüş verir, karar T0’da kalır.',
      'Eklenti güncellemesi ajan dosyalarını geri alabilir; `durum` uyuşmazlığı söyler.',
    ].join('\n') + '\n'
  );
}

const komut = process.argv[2];
if (!komut || komut === '--help' || komut === '-h' || komut === 'yardim') yardim();
else if (komut === 'ac' || komut === 'aç' || komut === 'on') uygula('premium');
else if (komut === 'kapat' || komut === 'off') uygula('standart');
else if (komut === 'durum' || komut === 'status') durum();
else dur('bilinmeyen komut: ' + komut);
