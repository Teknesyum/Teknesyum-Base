const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: dir, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8',
    }).trim();
  } catch { return null; }
}

// İzlerin yeri: röle kurulu projede proje içi, değilse oturuma özel genel dizin.
// Böylece üst klasörde açılan oturumda da ajanlar görünür.
function izDizini(dir, sessionId) {
  // Hook röleyi altı seviye yukarıya kadar arıyor; statusline sadece cwd'ye bakınca
  // depo kökü yerine `src/backend` altında açılan oturumda ikisi farklı kök buluyordu.
  const p = releKoku(dir);
  if (p) return p;
  if (!sessionId) return null;
  const ev = process.env.CLAUDE_CONFIG_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
  const ad = String(sessionId).replace(/[^a-zA-Z0-9._-]/g, '_');
  for (const k of ['live', 'canli']) {
    const g = path.join(ev, 'teknesyum', k, ad);
    if (fs.existsSync(g)) return g;
  }
  return null;
}

function releKoku(start) {
  let d = path.resolve(start || '.');
  for (let i = 0; i < 6; i++) {
    const c = path.join(d, '.claude', 'relay', 'live');
    if (fs.existsSync(c)) return c;
    const eski = path.join(d, '.claude', 'relay', 'canli');
    if (fs.existsSync(eski)) return eski;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
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
  } catch { return []; }
}

function sure(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? s + ' sn' : Math.round(s / 60) + ' dk';
}

function calisanSatiri(c) {
  const ad = (c.type || '?').replace(/^teknesyum:/, '');
  return C.blue + '⚙ ' + C.r + C.dim + ad + C.r + ' ' + C.hint +
         (c.ambiguous ? '—' : sure(c.start)) +
         (c.desc ? ' · ' + kisalt(c.desc, 34) : '') + C.r;
}

function ajanlar(live) {
  if (!live) return [];
  let out = [];
  try {
    for (const f of fs.readdirSync(live)) {
      if (!f.endsWith('.json') || f.startsWith('_')) continue;
      try { out.push(JSON.parse(fs.readFileSync(path.join(live, f), 'utf8'))); } catch {}
    }
  } catch { return []; }
  // Ölü ajan `/report` çağırır; dünkü ölü ajan için çağırmaz. Bir günü geçen izi gösterme,
  // yoksa kapanmış bir işin kalıntısı statusline'da kalıcı olur.
  out = out.filter((a) => !olu(a) || taze(a.last_seen));
  const rank = (a) => (olu(a) ? 1 : a.stop_reason === null ? 0 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || (b.last_seen || '').localeCompare(a.last_seen || ''));
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
  const ad = (a.contract ? a.contract + ' ' : '') + (a.agent_type || '?').replace(/^teknesyum:/, '');
  const ikon = olu(a) ? C.pink + '⨯' : C.ok + '✓';
  let s = ikon + ' ' + C.r + C.dim + ad + C.r;
  if (olu(a)) s += ' ' + C.pink + (a.stop_reason === null ? KAYIP : (OLUM_SEBEBI[a.stop_reason] || 'durdu')) + C.r;
  else if (a.last_word) s += ' ' + C.hint + kisalt(a.last_word, 40) + C.r;
  return s;
}

function kisalt(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function relay(dir) {
  const live = releKoku(dir);
  const base = live
    ? path.join(path.dirname(live), 'contracts')
    : path.join(dir, '.claude', 'relay', 'contracts');
  if (!fs.existsSync(base)) return null;
  const md = (d) => {
    try { return fs.readdirSync(d).filter((f) => f.endsWith('.md')); }
    catch { return []; }
  };
  const open = md(base);
  const done = md(path.join(base, 'done'));
  const total = open.length + done.length;
  if (total === 0) return null;

  let active = null, blocked = 0;
  for (const f of open) {
    let head = '';
    try { head = fs.readFileSync(path.join(base, f), 'utf8').slice(0, 400); } catch { continue; }
    const st = (head.match(/^status:\s*(\w+)/m) || [])[1];
    if (st === 'active' && !active) active = (head.match(/^id:\s*(\S+)/m) || [])[1] || f.replace('.md', '');
    if (st === 'blocked') blocked++;
  }
  return { done: done.length, total, active, blocked };
}

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try { j = JSON.parse(raw); } catch {}

  const dir = (j.workspace && j.workspace.current_dir) || j.cwd || process.cwd();
  const model = (j.model && j.model.display_name) || '?';
  const cw = j.context_window || {};
  const ctx = cw.used_percentage;
  const rl = j.rate_limits || {};

  const l1 = [
    C.blue + '⬢ ' + model + C.r,
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
  const t5 = limitTag('5s', fh); if (t5) l2.push(t5);
  const t7 = limitTag('7g', sd); if (t7) l2.push(t7);

  const r = relay(dir);
  if (r) {
    const pct = Math.round((r.done / r.total) * 100);
    let s = C.blue + '▸ ' + C.r + C.dim + (r.active || '—') + ' ' + bar(pct, 6) +
            ' ' + C.dim + r.done + '/' + r.total + C.r;
    if (r.blocked) s += ' ' + C.pink + '⨯' + r.blocked + C.r;
    l2.push(s);
  }

  const satirlar = [l1.join(C.hint + '  ·  ' + C.r), l2.join(C.hint + '   ' + C.r)];

  const live = izDizini(dir, j.session_id);
  const cs = calisanlar(live);
  for (const c of cs.slice(0, 3)) satirlar.push('  ' + calisanSatiri(c));
  if (cs.length > 3) satirlar.push('  ' + C.hint + '+' + (cs.length - 3) + ' ajan çalışıyor' + C.r);

  const ags = ajanlar(live);
  const olenler = ags.filter(olu).slice(0, 2);
  for (const a of olenler) satirlar.push('  ' + ajanSatiri(a));

  if (!cs.length && !olenler.length) {
    const biten = ags.filter((a) => a.stop_reason && !olu(a));
    const son = biten[0];
    if (son) satirlar.push('  ' + ajanSatiri(son) +
      (biten.length > 1 ? C.hint + '  +' + (biten.length - 1) + C.r : ''));
  }

  process.stdout.write(satirlar.join('\n'));
});
