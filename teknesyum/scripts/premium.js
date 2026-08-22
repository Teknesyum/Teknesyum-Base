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
  yaz(yol, { profil, pid: process.pid, ts: Date.now(), cwd: process.cwd() });
  return yol;
}

function ajanYolu(kok, ad) {
  return path.join(kok, 'agents', ad + '.md');
}

// Taban `normal`: ajan dosyaları ve `SETTINGS.md` bu profilin değerlerinde donar, hiçbir
// koşuda yazılmaz. Profilin oturuma taşıdığı tek şey tabandan **sapan** düğmelerdir;
// tam liste her isteme yazılırsa enjeksiyon kendi ölçtüğü kalemi büyütür.
const TABAN = 'normal';

function sapmalar(profil) {
  const t = DUGME[TABAN];
  const d = DUGME[profil] || t;
  const s = {};
  for (const k of Object.keys(d)) if (d[k] !== t[k]) s[k] = d[k];
  return s;
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
  const s = sapmalar(profil);
  const anahtar = Object.keys(s);
  return anahtar.length ? anahtar.map((k) => k + ' ' + s[k]).join(' · ') : 'yok — taban profil';
}

function uygula(profil) {
  const sid = oturumKimligi();
  const kayit = sid ? oturumYaz(sid, profil) : path.join(konfigKok(), 'teknesyum.json');
  if (!sid) konfigYaz(profil);
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
    ].join('\n') + '\n'
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
    ...Object.keys(simdi).map(
      (a) =>
        '  ' + a.padEnd(11) + p[a].model + '/' + simdi[a].effort + ' · tur ' + simdi[a].maxTurns
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
      '  node premium.js eco      haiku · 1 paralel ajan · 1 depo · denetim critical',
      '  node premium.js normal   sonnet · 2 paralel ajan · 10 depo · her sözleşme denetlenir',
      '  node premium.js premium  opus/xhigh · 20 paralel ajan · 50 depo · her sözleşme denetlenir',
      '  node premium.js durum    hangi profilin yürürlükte olduğunu söyler',
      '',
      'Hiçbiri depo dosyası yazmaz. Ajan frontmatter’ı ve relay `SETTINGS.md` makine',
      'tabanıdır ve `' + TABAN + '` profilin değerlerinde donar; profilin tabandan sapan düğmeleri',
      'oturumun kanca enjeksiyonuyla gider. Profil kaydı oturuma iner: oturum kimliği varsa',
      '~/.claude/teknesyum/oturumlar/<oturum>.json yazılır ve ~/.claude/teknesyum.json',
      'değişmez; kimlik yoksa makine varsayılanı yazılır. Eski çağrılar durur: `ac` premium,',
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
      'Dosya yazılmadığı için eklenti güncellemesiyle profil arasında uyuşmazlık da oluşmaz.',
    ].join('\n') + '\n'
  );
}

function main() {
  const komut = process.argv[2];
  const secilen = TAKMA[komut] || (PROFILLER.includes(komut) ? komut : '');
  if (!komut || komut === '--help' || komut === '-h' || komut === 'yardim') yardim();
  else if (secilen) uygula(secilen);
  else if (komut === 'durum' || komut === 'status') durum();
  else dur('bilinmeyen komut: ' + komut);
}

module.exports = { PROFIL, DUGME, TABAN, sapmalar };

if (require.main === module) main();
