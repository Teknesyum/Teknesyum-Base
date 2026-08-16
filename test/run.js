const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KOK = path.join(__dirname, '..', 'teknesyum');
const IZLE = path.join(KOK, 'hooks', 'relay-watch.js');
const KORU = path.join(KOK, 'hooks', 'contract-guard.js');
const DURUM = path.join(KOK, 'scripts', 'statusline.js');

let gecti = 0;
const kaldi = [];

function ol(ad, f) {
  try { f(); gecti++; console.log('  ✓ ' + ad); }
  catch (e) { kaldi.push(ad); console.log('  ⨯ ' + ad + '\n      ' + e.message); }
}

function esit(a, b, not) {
  if (a !== b) throw new Error((not ? not + ': ' : '') + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
}
function icerir(s, p, not) {
  if (!String(s).includes(p)) throw new Error((not ? not + ': ' : '') + '"' + p + '" yok — gelen: ' + s);
}

function calistir(script, yuk, ek) {
  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify(yuk), encoding: 'utf8',
    env: { ...process.env, TEKNESYUM_SESSIZ: '', TEKNESYUM_TANI: '', ...(ek || {}) },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

function proje(sozlesme, biten) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-test-'));
  const relay = path.join(p, '.claude', 'relay');
  fs.mkdirSync(path.join(relay, 'contracts', 'done'), { recursive: true });
  for (let i = 0; i < sozlesme; i++) fs.writeFileSync(path.join(relay, 'contracts', 'T' + i + '.md'), '#');
  for (let i = 0; i < biten; i++) fs.writeFileSync(path.join(relay, 'contracts', 'done', 'D' + i + '.md'), '#');
  return { p, live: path.join(relay, 'live') };
}

const ort = (p) => ({ cwd: p, session_id: 'oturum-1', transcript_path: '/x/oturum-1.jsonl' });

// Açılış bildirimi kullanıcının ~/.claude'una bakar; test makineden bağımsız olsun diye
// sahte bir config dizini kurup CLAUDE_CONFIG_DIR ile gösteriyoruz.
function konfig(kurulu) {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-cfg-'));
  if (kurulu) {
    fs.writeFileSync(path.join(c, 'teknesyum-statusline.js'), '//');
    fs.writeFileSync(path.join(c, 'settings.json'), JSON.stringify({
      statusLine: { type: 'command', command: 'node "' + c + '/teknesyum-statusline.js"' },
    }));
  }
  return { CLAUDE_CONFIG_DIR: c };
}

console.log('\nPaketleme');

ol('plugin.json hooks anahtarı taşımıyor (taşırsa eklenti hiç yüklenmez)', () => {
  const m = JSON.parse(fs.readFileSync(path.join(KOK, '.claude-plugin', 'plugin.json'), 'utf8'));
  esit('hooks' in m, false);
  if (!/^\d+\.\d+\.\d+$/.test(m.version)) throw new Error('sürüm biçimi: ' + m.version);
});

ol('.lsp.json geçerli ve boşluksuz komut kullanıyor', () => {
  const l = JSON.parse(fs.readFileSync(path.join(KOK, '.lsp.json'), 'utf8'));
  const s = l.typescript;
  if (!s) throw new Error('typescript sunucusu yok');
  if (/\s/.test(s.command)) throw new Error('command boşluk içeriyor: ' + s.command);
  icerir(Object.keys(s.extensionToLanguage).join(','), '.tsx');
});

ol('hooks.json olayları bağlıyor ve koruma Bash\'i kapsıyor', () => {
  const h = JSON.parse(fs.readFileSync(path.join(KOK, 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const e of ['PreToolUse', 'PostToolUse', 'SessionStart', 'SubagentStart', 'SubagentStop']) {
    if (!h[e]) throw new Error(e + ' bağlı değil');
  }
  const koru = h.PreToolUse.find((x) => /contract-guard/.test(JSON.stringify(x)));
  icerir(koru.matcher, 'Bash');
});

ol('statusline köprüsü sürümden bağımsız', () => {
  const k = fs.readFileSync(path.join(KOK, 'scripts', 'bridge.js'), 'utf8');
  if (/\d+\.\d+\.\d+/.test(k.replace(/\\d\+\\\.\\d\+\\\.\\d\+/g, ''))) {
    throw new Error('köprüde sabit sürüm var');
  }
  icerir(fs.readFileSync(path.join(KOK, 'commands', 'setup.md'), 'utf8'), 'bridge.js');
});

ol('komut kümesi beş komut ve eski adlar hiçbir yerde geçmiyor', () => {
  const v = fs.readdirSync(path.join(KOK, 'commands')).filter((f) => f.endsWith('.md')).sort();
  esit(v.join(','), 'help.md,report.md,rule.md,setup.md,uisetup.md');
  const yuru = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.name === 'node_modules' || e.name.startsWith('.') ? []
      : e.isDirectory() ? yuru(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of yuru(path.join(__dirname, '..'))) {
    if (!/\.(md|js|json|tsx)$/.test(f) || f === __filename) continue;
    const s = fs.readFileSync(f, 'utf8');
    for (const eski of ['/iskele', '/durum', '/teknesyumui', '/huyekle', '/uiayar',
                        '/raporver', '/kurulum', '/devam', 'relay-izle', 'koru-sozlesme',
                        'kopru.js', 'protokol.md', 'AYAR.md', 'cok-oturum.md',
                        'teknesyum:usta', 'teknesyum:denetci', 'teknesyum:kayitci']) {
      if (s.includes(eski)) throw new Error(path.basename(f) + ' hâlâ "' + eski.trim() + '" içeriyor');
    }
  }
});

ol('kurulum komutu tarar, kararı belliyi yapar, kalanını sorar', () => {
  const s = fs.readFileSync(path.join(KOK, 'commands', 'setup.md'), 'utf8');
  icerir(s, 'Sormadan yapılacaklar');
  icerir(s, 'Sorulacaklar');
  icerir(s, 'allowed-tools');
});

ol('relay oturum açılışında sormadan sürdürür', () => {
  const s = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8');
  icerir(s, 'Oturum açılışı');
  icerir(s, 'sürdür');
});

ol('denetçinin yazma veya çalıştırma aracı yok', () => {
  const md = fs.readFileSync(path.join(KOK, 'agents', 'auditor.md'), 'utf8');
  const tools = (md.match(/^tools:\s*(.+)$/m) || [])[1] || '';
  for (const yasak of ['Write', 'Edit', 'Bash', 'NotebookEdit']) {
    if (new RegExp('\\b' + yasak + '\\b').test(tools)) throw new Error(yasak + ' hâlâ verilmiş: ' + tools);
  }
});

console.log('\nBildirim');

ol('SessionStart röle durumunu ve sözleşme sayacını bildirir', () => {
  const { p } = proje(2, 1);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(true));
  const m = JSON.parse(r.out).systemMessage;
  icerir(m, 'Adamantium ▸');
  icerir(m, '1/3 bitti');
  icerir(m, '2 açık');
  icerir(m, 'sürdürüyorum');
});

ol('röle kurulu değilse ve makine bağlıysa açılışta susar', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-bos-'));
  esit(calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(true)).out, '');
});

ol('statusline bağlı değilse açılışta kurulumu hatırlatır', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-bos-'));
  const m = JSON.parse(calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(false)).out);
  icerir(m.systemMessage, 'kurulum eksik');
});

ol('açılışta iki uyarı olsa da stdout tek JSON kalır', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(false));
  const m = JSON.parse(r.out).systemMessage;
  icerir(m, 'kurulum eksik');
  icerir(m, 'röle kurulu');
});

ol('görev dağıtımı rol, model ve açıklamayı bildirir', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, {
    ...ort(p), hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_input: { subagent_type: 'teknesyum:builder', model: 'sonnet', description: 'tab bileseni' },
  });
  const m = JSON.parse(r.out).systemMessage;
  icerir(m, 'görev veriliyor');
  icerir(m, 'builder');
  icerir(m, 'sonnet');
  icerir(m, 'tab bileseni');
  if (m.includes('teknesyum:')) throw new Error('rol öneki temizlenmemiş');
});

ol('ikinci ajanda kaç ajanın çalıştığı yazılır', () => {
  const { p } = proje(1, 0);
  const yuk = {
    ...ort(p), hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'a' },
  };
  calistir(IZLE, yuk);
  icerir(JSON.parse(calistir(IZLE, yuk).out).systemMessage, '[2 ajan çalışıyor]');
});

ol('ajan bitişi süreyle bildirilir', () => {
  const { p } = proje(1, 0);
  calistir(IZLE, {
    ...ort(p), hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'a' },
  });
  const r = calistir(IZLE, {
    ...ort(p), hook_event_name: 'SubagentStop', agent_id: 'a1', agent_type: 'builder',
    agent_transcript_path: '/x/a1.jsonl',
  });
  const m = JSON.parse(r.out).systemMessage;
  icerir(m, 'bitti');
  icerir(m, 'builder');
  icerir(m, 'sn');
});

ol('PostToolUse sessizdir (her araç çağrısında bildirim olmaz)', () => {
  const { p } = proje(1, 0);
  esit(calistir(IZLE, {
    ...ort(p), hook_event_name: 'PostToolUse', tool_name: 'Edit',
    agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl',
    tool_input: { file_path: path.join(p, 'src', 'A.jsx') },
  }).out, '');
});

ol('TEKNESYUM_SESSIZ=1 bildirimleri kapatır', () => {
  const { p } = proje(2, 1);
  esit(calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, { TEKNESYUM_SESSIZ: '1' }).out, '');
});

console.log('\nEşzamanlılık');

ol('paralel hook süreçleri birbirinin kaydını silmez', () => {
  const { p, live } = proje(1, 0);
  const yuk = (n) => JSON.stringify({ ...ort(p), hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'is-' + n } });
  const cocuk = [];
  for (let n = 0; n < 8; n++) {
    cocuk.push(spawnSync(process.execPath, [IZLE], { input: yuk(n), encoding: 'utf8' }));
  }
  const l = JSON.parse(fs.readFileSync(path.join(live, '_running.json'), 'utf8'));
  if (!Array.isArray(l)) throw new Error('liste bozulmuş');
  if (l.length < 1) throw new Error('kayıtların tamamı kaybolmuş');
});

ol('yazma atomik: yarım JSON okunmaz', () => {
  const { p, live } = proje(1, 0);
  const ek = { agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' };
  for (let n = 0; n < 20; n++) {
    calistir(IZLE, { ...ort(p), ...ek, hook_event_name: 'PostToolUse', tool_name: 'Read',
      tool_input: { file_path: path.join(p, 'src', 'f' + n + '.js') } });
    JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  }
  const artik = fs.readdirSync(live).filter((f) => f.endsWith('.tmp'));
  if (artik.length) throw new Error('geçici dosya sızdı: ' + artik.join(','));
});

ol('aynı tipten iki ajanda süre uydurulmaz', () => {
  const { p } = proje(1, 0);
  const y = { ...ort(p), hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'a' } };
  calistir(IZLE, y);
  calistir(IZLE, y);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SubagentStop',
    agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' });
  icerir(JSON.parse(r.out).systemMessage, 'süre belirsiz');
});

console.log('\nİz');

ol('genel iz temizliği az sayıda klasörde de çalışır', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-bos-'));
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-cfg-'));
  const kok = path.join(cfg, 'teknesyum', 'live');
  const bayat = path.join(kok, 'eski-oturum');
  fs.mkdirSync(bayat, { recursive: true });
  fs.writeFileSync(path.join(bayat, 'a1.json'), '{}');
  const gun = Date.now() - 30 * 60 * 60 * 1000;
  fs.utimesSync(bayat, gun / 1000, gun / 1000);
  calistir(IZLE, { ...ort(p), hook_event_name: 'SubagentStop', agent_id: 'a2',
    agent_type: 'builder', agent_transcript_path: '/x/a2.jsonl' }, { CLAUDE_CONFIG_DIR: cfg });
  esit(fs.existsSync(bayat), false, '30 saatlik iz hâlâ duruyor');
});

ol('teşhis dosyası varsayılanda yazılmaz, TEKNESYUM_TANI=1 ile yazılır', () => {
  const { p, live } = proje(1, 0);
  const yuk = { ...ort(p), hook_event_name: 'PostToolUse', tool_name: 'Read',
    agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl', tool_input: {} };
  calistir(IZLE, yuk);
  esit(fs.existsSync(path.join(live, '_hook-tani.json')), false, 'bayraksız');
  calistir(IZLE, yuk, { TEKNESYUM_TANI: '1' });
  esit(fs.existsSync(path.join(live, '_hook-tani.json')), true, 'bayraklı');
});

ol('ajan izine değişen dosya ve sözleşme numarası işlenir', () => {
  const { p, live } = proje(1, 0);
  const ek = { agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' };
  calistir(IZLE, { ...ort(p), ...ek, hook_event_name: 'PostToolUse', tool_name: 'Read',
    tool_input: { file_path: path.join(p, '.claude', 'relay', 'contracts', 'T3.md') } });
  calistir(IZLE, { ...ort(p), ...ek, hook_event_name: 'PostToolUse', tool_name: 'Edit',
    tool_input: { file_path: path.join(p, 'src', 'A.jsx') } });
  const s = JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  esit(s.contract, 'T3');
  esit(s.files.join(), 'src/A.jsx');
  esit(s.steps, 2);
});

ol('SubagentStop stop_reason yokken ölüm sayılmaz', () => {
  const { p, live } = proje(1, 0);
  calistir(IZLE, { ...ort(p), hook_event_name: 'SubagentStop', agent_id: 'a1',
    agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' });
  esit(JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8')).stop_reason, 'end_turn');
});

ol('röle yoksa iz genel dizine düşer, proje kirletilmez', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-bos-'));
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-cfg-'));
  calistir(IZLE, { ...ort(p), hook_event_name: 'SubagentStop', agent_id: 'a1',
    agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' }, { CLAUDE_CONFIG_DIR: cfg });
  esit(fs.existsSync(path.join(p, '.claude')), false, 'proje kirlenmiş');
  esit(fs.existsSync(path.join(cfg, 'teknesyum', 'live', 'oturum-1', 'a1.json')), true);
});

console.log('\nKoruma — done/ kapısı');

ol('done/ altına Edit engellenir', () => {
  const r = calistir(KORU, { tool_name: 'Edit',
    tool_input: { file_path: '/p/.claude/relay/contracts/done/T1.md' } });
  esit(r.kod, 2);
  icerir(r.err, 'ENGELLENDİ');
});

ol('göreli Windows yolu da engellenir (mutlak yol şartı bypass ediyordu)', () => {
  esit(calistir(KORU, { tool_name: 'Write',
    tool_input: { file_path: '.claude\\relay\\contracts\\done\\T1.md', content: '#' } }).kod, 2);
});

ol('mühürsüz Write engellenir, mühürlü Write geçer', () => {
  esit(calistir(KORU, { tool_name: 'Write',
    tool_input: { file_path: '/p/.claude/relay/contracts/done/T1.md',
      content: '---\nstatus: done\n---\n' } }).kod, 2, 'mühürsüz');
  esit(calistir(KORU, { tool_name: 'Write',
    tool_input: { file_path: '/p/.claude/relay/contracts/done/T1.md',
      content: '---\nstatus: done\naudit: passed\n---\n' } }).kod, 0, 'mühürlü');
});

ol('mühürlü dosyaya bile Edit yasak (bitmiş sözleşme değişmez)', () => {
  esit(calistir(KORU, { tool_name: 'Edit',
    tool_input: { file_path: '/p/.claude/relay/contracts/done/T1.md',
      new_string: 'audit: passed' } }).kod, 2);
});

ol('kabuktan done/ altına yazma engellenir', () => {
  for (const c of [
    'echo x > .claude/relay/contracts/done/T1.md',
    'mv .claude/relay/contracts/T1.md .claude/relay/contracts/done/T1.md',
    'Move-Item .claude\\relay\\contracts\\T1.md .claude\\relay\\contracts\\done\\',
    'rm .claude/relay/contracts/done/T1.md',
  ]) {
    esit(calistir(KORU, { tool_name: 'Bash', tool_input: { command: c } }).kod, 2, c);
  }
});

ol('kabuktan done/ okuma serbest', () => {
  esit(calistir(KORU, { tool_name: 'Bash',
    tool_input: { command: 'cat .claude/relay/contracts/done/T1.md' } }).kod, 0);
});

ol('mühürlü sözleşmenin kabuktan taşınması geçer', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'adamantium-muhur-'));
  const src = path.join(p, 'T1.md');
  fs.writeFileSync(src, '---\nstatus: done\naudit: passed\nverification: npm test → exit 0\n---\n');
  esit(calistir(KORU, { tool_name: 'Bash',
    tool_input: { command: 'mv ' + src.replace(/\\/g, '/') + ' /p/.claude/relay/contracts/done/T1.md' },
  }).kod, 0);
});

ol('açık sözleşmeye yazma serbest', () => {
  esit(calistir(KORU, { tool_name: 'Edit',
    tool_input: { file_path: '/p/.claude/relay/contracts/T1.md' } }).kod, 0);
});

ol('sözleşme şablonu mühür alanlarını taşıyor', () => {
  const t = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'assets', 'contract.template.md'), 'utf8');
  for (const alan of ['audit:', 'auditor_id:', 'diff:', 'verification:']) icerir(t, alan);
});

ol('hiçbir ajan sözleşmeyi done/ altına taşımakla görevlendirilmemiş', () => {
  for (const a of ['builder.md', 'ui-builder.md', 'scribe.md']) {
    const md = fs.readFileSync(path.join(KOK, 'agents', a), 'utf8');
    const gorev = md.split('\n').filter((l) => /^\d+\./.test(l.trim())).join('\n');
    if (/status:\s*done/.test(gorev)) throw new Error(a + ': ajana `status: done` yazdırılıyor');
    if (/`?contracts\/done\/`?'?a taşı/.test(gorev)) throw new Error(a + ': ajana taşıma yaptırılıyor');
    icerir(md, 'submitted', a);
  }
});

console.log('\nStatusline');

ol('çalışan ajan ve sözleşme ilerlemesi basılır', () => {
  const { p } = proje(2, 1);
  calistir(IZLE, { ...ort(p), hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_input: { subagent_type: 'teknesyum:auditor', description: 'T3 dogrulama' } });
  const r = calistir(DURUM, { cwd: p, session_id: 'oturum-1',
    model: { display_name: 'Opus' }, workspace: { current_dir: p } });
  icerir(r.out, 'auditor');
  icerir(r.out, '1/3');
});

ol('bayat çalışan kaydı gösterilmez (oturum ajan çalışırken düşerse)', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(path.join(live, '_running.json'), JSON.stringify([
    { type: 'builder', desc: 'bayat', start: Date.now() - 3 * 60 * 60 * 1000 },
    { type: 'auditor', desc: 'taze', start: Date.now() },
  ]));
  const r = calistir(DURUM, { cwd: p, session_id: 'oturum-1',
    model: { display_name: 'Opus' }, workspace: { current_dir: p } });
  icerir(r.out, 'auditor');
  if (r.out.includes('bayat')) throw new Error('3 saatlik kayıt hâlâ çalışıyor görünüyor');
});

ol('alt çizgili kayıtlar ajan sanılmaz (hayalet ⨯ satırı)', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(path.join(live, '_running.json'), '[]');
  fs.writeFileSync(path.join(live, '_hook-tani.json'), '{"toplam":3}');
  const r = calistir(DURUM, { cwd: p, session_id: 'oturum-1',
    model: { display_name: 'Opus' }, workspace: { current_dir: p } });
  if (/⨯/.test(r.out)) throw new Error('hayalet ölü ajan satırı: ' + r.out);
});

ol('dünkü ölü ajan gösterilmez', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  const eski = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const yeni = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.writeFileSync(path.join(live, 'a1.json'), JSON.stringify(
    { agent_id: 'a1', agent_type: 'builder', stop_reason: 'unknown', last_seen: eski }));
  let r = calistir(DURUM, { cwd: p, session_id: 'oturum-1',
    model: { display_name: 'Opus' }, workspace: { current_dir: p } });
  if (r.out.includes('builder')) throw new Error('30 saatlik ölü ajan hâlâ gösteriliyor');
  fs.writeFileSync(path.join(live, 'a1.json'), JSON.stringify(
    { agent_id: 'a1', agent_type: 'builder', stop_reason: 'max_tokens', last_seen: yeni }));
  r = calistir(DURUM, { cwd: p, session_id: 'oturum-1',
    model: { display_name: 'Opus' }, workspace: { current_dir: p } });
  icerir(r.out, 'bağlamı doldu', 'taze ölü ajan');
});

ol('alt klasörden açılan oturumda röle bulunur', () => {
  const { p } = proje(2, 1);
  const alt = path.join(p, 'src', 'backend');
  fs.mkdirSync(alt, { recursive: true });
  calistir(IZLE, { ...ort(alt), hook_event_name: 'PreToolUse', tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'derin' } });
  const r = calistir(DURUM, { cwd: alt, session_id: 'oturum-1',
    model: { display_name: 'Opus' }, workspace: { current_dir: alt } });
  icerir(r.out, '1/3', 'sözleşme ilerlemesi');
  icerir(r.out, 'builder', 'çalışan ajan');
});

ol('bozuk girdide çökmez', () => {
  const r = spawnSync(process.execPath, [DURUM], { input: 'bu json degil', encoding: 'utf8' });
  esit(r.status, 0);
});

console.log('\n' + (kaldi.length ? '⨯ KALDI' : '✓ GEÇTİ') + '  ' + gecti + '/' + (gecti + kaldi.length));
if (kaldi.length) { for (const k of kaldi) console.log('   - ' + k); process.exit(1); }
