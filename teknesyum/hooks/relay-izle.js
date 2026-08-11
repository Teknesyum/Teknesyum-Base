const fs = require('fs');
const path = require('path');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  try { run(JSON.parse(raw)); } catch {}
  process.exit(0);
});

function run(j) {
  const root = findRelay(j.cwd || process.cwd());
  if (!root) return;

  const live = path.join(root, 'canli');
  try { fs.mkdirSync(live, { recursive: true }); } catch { return; }

  iz(live, j);

  const agentId = j.agent_id;
  if (!agentId) return;

  const file = path.join(live, safe(agentId) + '.json');
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  let s = read(file) || {
    agent_id: agentId,
    agent_type: j.agent_type || '?',
    contract: null,
    started: now,
    last_seen: now,
    steps: 0,
    last_action: '—',
    files: [],
    stop_reason: null,
  };

  s.agent_type = j.agent_type || s.agent_type;
  s.last_seen = now;

  switch (j.hook_event_name) {
    case 'SubagentStart':
      s.started = now;
      s.stop_reason = null;
      break;

    case 'PostToolUse': {
      s.steps++;
      const t = j.tool_input || {};
      const target = t.file_path || t.notebook_path || '';
      s.last_action = (j.tool_name || '?') + (target ? ' ' + short(target, root) : '');

      if (target) {
        const n = norm(target);
        const m = n.match(/\/relay\/contracts\/(?:done\/)?(T[^/]+)\.md$/i);
        if (m && !s.contract) s.contract = m[1];
        if (!m && /^(Write|Edit|NotebookEdit)$/.test(j.tool_name || '')) {
          const rel = short(target, root);
          if (!s.files.includes(rel)) s.files.push(rel);
        }
      }
      break;
    }

    case 'SubagentStop':
      s.stop_reason = j.stop_reason || 'unknown';
      s.ended = now;
      if (j.last_assistant_message) s.son_soz = String(j.last_assistant_message).slice(0, 300);
      break;
  }

  try { fs.writeFileSync(file, JSON.stringify(s, null, 2)); } catch {}
}

function iz(live, j) {
  const f = path.join(live, '_hook-tani.json');
  let d = read(f) || { toplam: 0, ajanli: 0, olaylar: {}, ilk: null, son: null, ornek_alanlar: null };
  d.toplam++;
  if (j.agent_id) d.ajanli++;
  const ev = j.hook_event_name || '?';
  d.olaylar[ev] = (d.olaylar[ev] || 0) + 1;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (!d.ilk) d.ilk = now;
  d.son = now;
  if (!d.ornek_alanlar) d.ornek_alanlar = Object.keys(j).sort();
  try { fs.writeFileSync(f, JSON.stringify(d, null, 2)); } catch {}
}

function findRelay(start) {
  let d = path.resolve(start);
  for (let i = 0; i < 6; i++) {
    const c = path.join(d, '.claude', 'relay');
    if (fs.existsSync(c)) return c;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
}

function read(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function norm(p) { return path.normalize(p).replace(/\\/g, '/'); }
function safe(s) { return String(s).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80); }
function short(p, relayRoot) {
  const proj = path.dirname(path.dirname(relayRoot));
  const n = norm(p);
  const pn = norm(proj) + '/';
  return n.startsWith(pn) ? n.slice(pn.length) : path.basename(n);
}
