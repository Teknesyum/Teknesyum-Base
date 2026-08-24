const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { konfigKok, roleKoku, izKoku } = require('../hooks/ortak.js');

const C = {
  blue: '\x1b[38;2;0;243;255m',
  pink: '\x1b[38;2;255;0;234m',
  purple: '\x1b[38;2;176;38;255m',
  ok: '\x1b[38;2;52;211;153m',
  dim: '\x1b[38;2;107;114;128m',
  hint: '\x1b[38;2;75;85;99m',
  r: '\x1b[0m',
};

function bar(pct, width) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const filled = Math.round((p / 100) * width);
  const color = p < 60 ? C.blue : p < 85 ? C.pink : C.purple;
  return color + '█'.repeat(filled) + C.hint + '░'.repeat(width - filled) + C.r;
}

function gitBranch(dir) {
  try {
    // ÖLÇÜLDÜ: timeout yoktu. Ag surucusunde ya da `.git/index.lock` varken git
    // suresiz bekliyor ve statusline ile birlikte tum satir donuyordu.
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
      timeout: 400,
    }).trim();
  } catch {
    return null;
  }
}

// İzlerin yeri: röle kurulu projede proje içi, değilse oturuma özel genel dizin.
// Böylece üst klasörde açılan oturumda da ajanlar görünür.
function izDizini(dir, sessionId) {
  // Hook röleyi altı seviye yukarıya kadar arıyor; statusline sadece cwd'ye bakınca
  // depo kökü yerine `src/backend` altında açılan oturumda ikisi farklı kök buluyordu.
  const p = releKoku(dir);
  if (p) return p;
  if (!sessionId) return null;
  const ad = String(sessionId).replace(/[^a-zA-Z0-9._-]/g, '_');
  for (const k of ['live', 'canli']) {
    const g = path.join(konfigKok(), 'teknesyum', k, ad);
    if (fs.existsSync(g)) return g;
  }
  return null;
}

// Statusline her istemde yeniden koşuyor: röle kökü dosya sisteminde aranır, git'e
// sorulmaz. Bir `git rev-parse` süreci Windows'ta 20-60 ms ve buradaki gecikme
// doğrudan kullanıcının gördüğü satıra biniyor.
function releKoku(start) {
  const r = roleKoku(start || '.', { git: false });
  return r ? izKoku(r.relay) : null;
}

// Adım sayacı yok: alt ajanın araç kullanımları hook'a yansımıyor (ölçüldü).
// Gösterilebilen tek şey çalışıyor/bitti ve geçen süre.
function calisanlar(live) {
  if (!live) return [];
  try {
    const l = JSON.parse(fs.readFileSync(path.join(live, '_running.json'), 'utf8'));
    if (!Array.isArray(l)) return [];
    // Oturum ajan çalışırken düşerse SubagentStop hiç gelmez ve kayıt sonsuza kadar
    // "çalışıyor" görünür. 2 saati geçeni düşür — hiçbir ajan o kadar sürmüyor.
    return l.filter((c) => Date.now() - (c.start || 0) < 2 * 60 * 60 * 1000);
  } catch {
    return [];
  }
}

function sure(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? s + ' sn' : Math.round(s / 60) + ' dk';
}

// Tur makbuzu. Hesabı kanca yapar (`relay-watch.js` → `turBitir`), burada tek satır
// okunur ve basılır — iki yerde hesap iki farklı sayı demektir.
//
// Akışa basılmıyor olmasının sebebi ölçülmüş: kanca `systemMessage` ile yazdığında
// render katmanı satırın önüne `Stop says:` koyuyor ve o önek hiçbir ayarla
// kaldırılamıyor. Statusline bizim betiğimiz, önek üretmiyor.
//
// Yaşlanınca düşer: makbuz bir sonraki tur açılana kadar durur, ama takılı kalırsa
// dünkü sayı bugünün satırında görünmesin diye iki saatlik tavan var.
const MAKBUZ_TAVANI = 2 * 60 * 60 * 1000;

function makbuz(live) {
  if (!live) return '';
  try {
    const m = JSON.parse(fs.readFileSync(path.join(live, '_makbuz.json'), 'utf8'));
    if (!m || !m.metin) return '';
    if (Date.now() - (Number(m.ts) || 0) > MAKBUZ_TAVANI) return '';
    return String(m.metin);
  } catch {
    return '';
  }
}

function aciktaSayisi(live) {
  if (!live) return 0;
  try {
    const d = JSON.parse(fs.readFileSync(path.join(live, '_acik.json'), 'utf8'));
    return Array.isArray(d && d.acikta) ? d.acikta.length : 0;
  } catch {
    return 0;
  }
}

function calisanSatiri(c) {
  const ad = (c.type || '?').replace(/^teknesyum:/, '');
  return (
    C.blue +
    '⚙ ' +
    C.r +
    C.dim +
    ad +
    C.r +
    ' ' +
    C.hint +
    (c.ambiguous ? '—' : sure(c.start)) +
    (c.desc ? ' · ' + kisalt(c.desc, 34) : '') +
    C.r
  );
}

function ajanlar(live) {
  if (!live) return [];
  let out = [];
  try {
    for (const f of fs.readdirSync(live)) {
      if (!f.endsWith('.json') || f.startsWith('_')) continue;
      try {
        out.push(JSON.parse(fs.readFileSync(path.join(live, f), 'utf8')));
      } catch {}
    }
  } catch {
    return [];
  }
  // Ölü ajan `/report` çağırır; dünkü ölü ajan için çağırmaz. Bir günü geçen izi gösterme,
  // yoksa kapanmış bir işin kalıntısı statusline'da kalıcı olur.
  //
  // ÖLÇÜLDÜ (24.08.2026): tazelik yalnız ölülere uygulanıyordu. `stop_reason: 'end_turn'`
  // ile biten kayıt hiçbir zaman `olu` sayılmadığı için süzgeçten muaftı ve klasörde
  // birikiyordu — sayaç `ajan 0/202` diyordu, son satır da günler önce bitmiş bir ajanın
  // metnini basıyordu. Tazelik artık uçuştaki ajan dışında herkese uygulanır.
  out = out.filter((a) => (a.stop_reason === null && !olu(a)) || taze(a.last_seen));
  const rank = (a) => (olu(a) ? 1 : a.stop_reason === null ? 0 : 2);
  return out.sort(
    (a, b) => rank(a) - rank(b) || (b.last_seen || '').localeCompare(a.last_seen || '')
  );
}

function taze(iso) {
  const t = Date.parse(String(iso || '').replace(' ', 'T') + 'Z');
  return !isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000;
}

function olu(a) {
  if (a.stop_reason !== null && a.stop_reason !== 'end_turn') return true;
  // ÖLÇÜLDÜ: arka planda düşen ajan `SubagentStop` üretmiyor — kayıt sonsuza kadar
  // `stop_reason: null` kalıyor ve ölü ajan "çalışıyor" görünüyor. On dakikadır olay
  // gelmeyen ve bitmemiş ajanı kayıp say.
  return a.stop_reason === null && !a.ended && sessiz(a.last_seen);
}

const SESSIZLIK = 10 * 60 * 1000;

function sessiz(iso) {
  const t = Date.parse(String(iso || '').replace(' ', 'T') + 'Z');
  return !isNaN(t) && Date.now() - t > SESSIZLIK;
}

const OLUM_SEBEBI = {
  max_tokens: 'bağlamı doldu',
  max_turns: 'tur bütçesi bitti',
  refusal: 'reddetti',
  error: 'hata aldı',
  api_error: 'hata aldı',
  aborted: 'iptal edildi',
  canceled: 'iptal edildi',
};

// `stop_reason` hiç gelmediyse ölüm sebebi de yok; satırda bunu söyleriz.
const KAYIP = 'yanıt yok';

function ajanSatiri(a) {
  const ad =
    (a.contract ? a.contract + ' ' : '') + (a.agent_type || '?').replace(/^teknesyum:/, '');
  const ikon = olu(a) ? C.pink + '⨯' : C.ok + '✓';
  let s = ikon + ' ' + C.r + C.dim + ad + C.r;
  if (a.model) {
    s +=
      ' ' +
      C.hint +
      String(a.model)
        .replace(/^claude-/, '')
        .replace(/-\d{8}$/, '') +
      (a.effort ? '·' + a.effort : '') +
      C.r;
  }
  if (olu(a))
    s +=
      ' ' + C.pink + (a.stop_reason === null ? KAYIP : OLUM_SEBEBI[a.stop_reason] || 'durdu') + C.r;
  else if (a.last_word) s += ' ' + C.hint + kisalt(a.last_word, 40) + C.r;
  return s;
}

// Statusline tek satırdır. `last_word` transkriptten geliyor ve içinde satır sonu,
// etiket ve girinti taşıyabiliyor; ham kesilirse satır sayısını şişirir ve makbuzu
// aşağı iter. Önce boşluk düzleştirilir, sonra kesilir.
function kisalt(s, n) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function relay(dir) {
  const live = releKoku(dir);
  const base = live
    ? path.join(path.dirname(live), 'contracts')
    : path.join(dir, '.claude', 'relay', 'contracts');
  if (!fs.existsSync(base)) return null;
  const md = (d) => {
    try {
      return fs.readdirSync(d).filter((f) => f.endsWith('.md'));
    } catch {
      return [];
    }
  };
  const open = md(base);
  const done = md(path.join(base, 'done'));
  const total = open.length + done.length;
  if (total === 0) return null;

  let active = null,
    blocked = 0;
  for (const f of open) {
    let head = '';
    try {
      head = fs.readFileSync(path.join(base, f), 'utf8').slice(0, 400);
    } catch {
      continue;
    }
    const st = (head.match(/^status:\s*(\w+)/m) || [])[1];
    if (st === 'active' && !active)
      active = (head.match(/^id:\s*(\S+)/m) || [])[1] || f.replace('.md', '');
    if (st === 'blocked') blocked++;
  }
  return { done: done.length, total, active, blocked };
}

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try {
    j = JSON.parse(raw);
  } catch {}

  const dir = (j.workspace && j.workspace.current_dir) || j.cwd || process.cwd();
  const model = (j.model && j.model.display_name) || '?';
  const efor = (j.effort && j.effort.level) || null;
  const cw = j.context_window || {};
  const ctx = cw.used_percentage;
  const rl = j.rate_limits || {};

  const l1 = [
    C.blue + '⬢ ' + model + (efor ? C.hint + '·' + efor : '') + C.r,
    C.dim + path.basename(dir) + C.r,
  ];
  const br = gitBranch(dir);
  if (br) l1.push(C.purple + '⎇ ' + br + C.r);

  const l2 = [];
  if (ctx !== null && ctx !== undefined) {
    l2.push('ctx ' + bar(ctx, 10) + ' ' + C.dim + Math.round(ctx) + '%' + C.r);
  } else {
    l2.push(C.hint + 'ctx ░░░░░░░░░░  --' + C.r);
  }

  const fh = rl.five_hour && rl.five_hour.used_percentage;
  const sd = rl.seven_day && rl.seven_day.used_percentage;
  const limitTag = (label, v) => {
    if (v === null || v === undefined) return null;
    const c = v < 60 ? C.ok : v < 85 ? C.pink : C.purple;
    return C.hint + label + ' ' + c + Math.round(v) + '%' + C.r;
  };
  const t5 = limitTag('5s', fh);
  if (t5) l2.push(t5);
  const t7 = limitTag('7g', sd);
  if (t7) l2.push(t7);

  const live = izDizini(dir, j.session_id);
  const cs = calisanlar(live);
  const ags = ajanlar(live);
  const n = aciktaSayisi(live);
  const toplam = Math.max(ags.length, cs.length);
  const kuyruk = [];
  if (n) kuyruk.push('açıkta ' + n);
  if (toplam) kuyruk.push('ajan ' + cs.length + '/' + toplam);
  if (kuyruk.length) l2.push(C.pink + kuyruk.join(' · ') + C.r);

  const r = relay(dir);
  if (r) {
    const pct = Math.round((r.done / r.total) * 100);
    let s =
      C.blue +
      '▸ ' +
      C.r +
      C.dim +
      (r.active || '—') +
      ' ' +
      bar(pct, 6) +
      ' ' +
      C.dim +
      r.done +
      '/' +
      r.total +
      C.r;
    if (r.blocked) s += ' ' + C.pink + '⨯' + r.blocked + C.r;
    l2.push(s);
  }

  const satirlar = [l1.join(C.hint + '  ·  ' + C.r), l2.join(C.hint + '   ' + C.r)];

  // Makbuz yalnız her şey bittiğinde anlamlıdır ve kanca zaten öyle yazıyor; ajan
  // çalışırken satır gösterilse eski turun sayısı yeni turun üstünde durur.
  const mk = cs.length ? '' : makbuz(live);
  // `hint` ayraç rengidir; makbuz onunla basılınca satır ayraç gibi okunuyor ve
  // "makbuz yok" diye rapor ediliyordu. Bir kademe yukarı, `dim`e alındı.
  if (mk) satirlar.push('  ' + C.dim + mk + C.r);
  for (const c of cs.slice(0, 3)) satirlar.push('  ' + calisanSatiri(c));
  if (cs.length > 3) satirlar.push('  ' + C.hint + '+' + (cs.length - 3) + ' ajan çalışıyor' + C.r);

  const olenler = ags.filter(olu).slice(0, 2);
  for (const a of olenler) satirlar.push('  ' + ajanSatiri(a));

  if (!cs.length && !olenler.length) {
    const biten = ags.filter((a) => a.stop_reason && !olu(a));
    const son = biten[0];
    if (son)
      satirlar.push(
        '  ' + ajanSatiri(son) + (biten.length > 1 ? C.hint + '  +' + (biten.length - 1) + C.r : '')
      );
  }

  process.stdout.write(satirlar.join('\n'));
});
