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

const TUR_TAVANI = { usta: 60, 'usta-arayuz': 60, denetci: 30, kayitci: 40 };

function ajanlar(dir) {
  const live = path.join(dir, '.claude', 'relay', 'canli');
  if (!fs.existsSync(live)) return [];
  let out = [];
  try {
    for (const f of fs.readdirSync(live)) {
      if (!f.endsWith('.json')) continue;
      try { out.push(JSON.parse(fs.readFileSync(path.join(live, f), 'utf8'))); } catch {}
    }
  } catch { return []; }
  const rank = (a) => (a.stop_reason === null ? 0 : olu(a) ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || (b.last_seen || '').localeCompare(a.last_seen || ''));
}

function olu(a) {
  return a.stop_reason !== null && a.stop_reason !== 'end_turn';
}

function ajanSatiri(a) {
  const tavan = TUR_TAVANI[a.agent_type] || 50;
  const pct = Math.min(100, ((a.steps || 0) / tavan) * 100);
  const ad = (a.contract || '?') + ' ' + (a.agent_type || '?');
  let ikon, renk;
  if (a.stop_reason === null) { ikon = '⚙'; renk = C.blue; }
  else if (olu(a)) { ikon = '⨯'; renk = C.pink; }
  else { ikon = '✓'; renk = C.ok; }
  let s = renk + ikon + ' ' + C.r + C.dim + ad + C.r + ' ' + bar(pct, 8) +
          ' ' + C.hint + (a.steps || 0) + '/' + tavan + C.r;
  if (olu(a)) s += ' ' + C.pink + a.stop_reason + C.r;
  else if (a.stop_reason === null && a.last_action) s += ' ' + C.hint + kisalt(a.last_action, 34) + C.r;
  return s;
}

function kisalt(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function relay(dir) {
  const base = path.join(dir, '.claude', 'relay', 'contracts');
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

  const ags = ajanlar(dir);
  const canliOlan = ags.filter((a) => a.stop_reason === null || olu(a)).slice(0, 3);
  for (const a of canliOlan) satirlar.push('  ' + ajanSatiri(a));
  const kalan = ags.length - canliOlan.length;
  if (kalan > 0) satirlar.push('  ' + C.hint + '+' + kalan + ' ajan (bitti)' + C.r);

  process.stdout.write(satirlar.join('\n'));
});
