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

  // Alt ajanın içinden gelen PostToolUse olaylarında `agent_id` YOK — ölçüldü, varsayım
  // değil. Bu yüzden ikinci bir kimlik kanalı gerekiyor: her ajanın kendi transcript
  // dosyası vardır ve adı ana oturumun session_id'sinden farklıdır.
  const agentId = j.agent_id || transcriptKimligi(j);
  if (!agentId) return;

  const file = path.join(live, safe(agentId) + '.json');
  if (j.agent_id) birlestir(live, file, transcriptKimligi(j));
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

  s.agent_id = agentId;
  s.agent_type = j.agent_type || s.agent_type;
  s.last_seen = now;
  s.kimlik = j.agent_id ? 'agent_id' : 'transcript';

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
      // Ölçüldü: bu olayın payload'ında `stop_reason` alanı YOK. Eksikliği ölüm sanma —
      // aksi halde normal biten her ajan statusline'da ⨯ görünür.
      s.stop_reason = j.stop_reason || 'end_turn';
      s.ended = now;
      if (j.last_assistant_message) s.son_soz = String(j.last_assistant_message).slice(0, 300);
      break;
  }

  try { fs.writeFileSync(file, JSON.stringify(s, null, 2)); } catch {}
}

// Ana oturumun transcript dosyası session_id ile aynı adı taşır; alt ajanınki taşımaz.
// Ayrım buradan çıkar — ana oturum olaylarını ajan sanma.
function transcriptKimligi(j) {
  const tp = j.agent_transcript_path || j.transcript_path;
  if (!tp) return null;
  const base = path.basename(String(tp)).replace(/\.jsonl$/i, '');
  if (!base || base === j.session_id) return null;
  return base;
}

// agent_id sonradan geldiğinde (SubagentStart/Stop) transcript adıyla biriken adımları
// gerçek kimliğe taşı; yoksa aynı ajan iki dosyada görünür.
function birlestir(live, hedef, gecici) {
  if (!gecici) return;
  const gf = path.join(live, safe(gecici) + '.json');
  if (gf === hedef || !fs.existsSync(gf)) return;
  const g = read(gf);
  const h = read(hedef);
  if (g && h) {
    h.steps = Math.max(h.steps || 0, g.steps || 0);
    if (g.contract && !h.contract) h.contract = g.contract;
    if (g.last_action && h.last_action === '—') h.last_action = g.last_action;
    for (const f of g.files || []) if (!h.files.includes(f)) h.files.push(f);
    try { fs.writeFileSync(hedef, JSON.stringify(h, null, 2)); } catch {}
  } else if (g && !h) {
    try { fs.writeFileSync(hedef, JSON.stringify(g, null, 2)); } catch {}
  }
  try { fs.unlinkSync(gf); } catch {}
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
  d.ornek_alanlar = d.ornek_alanlar || Object.keys(j).sort();
  d.alanlar = d.alanlar || {};
  d.alanlar[ev] = Object.keys(j).sort().join(',');
  if (ev === 'PostToolUse') {
    d.ptu_ajanli = (d.ptu_ajanli || 0) + (j.agent_id || j.agent_transcript_path ? 1 : 0);
  }
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
