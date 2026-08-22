const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KOK = path.join(__dirname, '..', 'teknesyum');
const IZLE = path.join(KOK, 'hooks', 'relay-watch.js');
const KORU = path.join(KOK, 'hooks', 'contract-guard.js');
const DURUM = path.join(KOK, 'scripts', 'statusline.js');
const OTURUM = path.join(KOK, 'scripts', 'oturum.js');

let gecti = 0;
const kaldi = [];

function ol(ad, f) {
  try {
    f();
    gecti++;
    console.log('  ✓ ' + ad);
  } catch (e) {
    kaldi.push(ad);
    console.log('  ⨯ ' + ad + '\n      ' + e.message);
  }
}

function esit(a, b, not) {
  if (a !== b)
    throw new Error((not ? not + ': ' : '') + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));
}
function icerir(s, p, not) {
  if (!String(s).includes(p))
    throw new Error((not ? not + ': ' : '') + '"' + p + '" yok — gelen: ' + s);
}

// Testler kullanıcının gerçek `~/.claude` klasörünü okumamalı. Okurlarsa makinedeki
// bir ayar (örn. `debug: true`) testi geçirir ya da düşürür; sonuç makineye bağlı olur.
const BOS_CFG = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-cfg-'));

function calistir(script, yuk, ek) {
  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify(yuk),
    encoding: 'utf8',
    env: {
      ...process.env,
      TEKNESYUM_SESSIZ: '',
      TEKNESYUM_DEBUG: '',
      TEKNESYUM_DIL: 'tr',
      CLAUDE_CONFIG_DIR: BOS_CFG,
      ...(ek || {}),
    },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

function proje(sozlesme, biten) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-test-'));
  const relay = path.join(p, '.claude', 'relay');
  fs.mkdirSync(path.join(relay, 'contracts', 'done'), { recursive: true });
  for (let i = 0; i < sozlesme; i++)
    fs.writeFileSync(path.join(relay, 'contracts', 'T' + i + '.md'), '#');
  for (let i = 0; i < biten; i++)
    fs.writeFileSync(path.join(relay, 'contracts', 'done', 'D' + i + '.md'), '#');
  return { p, live: path.join(relay, 'live') };
}

const ort = (p) => ({ cwd: p, session_id: 'oturum-1', transcript_path: '/x/oturum-1.jsonl' });

// Açılış bildirimi kullanıcının ~/.claude'una bakar; test makineden bağımsız olsun diye
// sahte bir config dizini kurup CLAUDE_CONFIG_DIR ile gösteriyoruz.
function konfig(kurulu) {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  if (kurulu) {
    fs.writeFileSync(path.join(c, 'teknesyum-statusline.js'), '//');
    fs.writeFileSync(
      path.join(c, 'settings.json'),
      JSON.stringify({
        statusLine: { type: 'command', command: 'node "' + c + '/teknesyum-statusline.js"' },
      })
    );
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

ol("hooks.json olayları bağlıyor ve koruma Bash'i kapsıyor", () => {
  const h = JSON.parse(fs.readFileSync(path.join(KOK, 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const e of [
    'PreToolUse',
    'PostToolUse',
    'SessionStart',
    'SubagentStart',
    'SubagentStop',
    'UserPromptSubmit',
    'Stop',
    'PostCompact',
    'SessionEnd',
    'StopFailure',
    'PostToolUseFailure',
  ]) {
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

ol('komut kümesi eksiksiz ve eski adlar hiçbir yerde geçmiyor', () => {
  const v = fs
    .readdirSync(path.join(KOK, 'commands'))
    .filter((f) => f.endsWith('.md'))
    .sort();
  esit(
    v.join(','),
    'help.md,load.md,loadall.md,premium.md,rc.md,rcadvanced.md,rcall.md,report.md,rule.md,save.md,saveall.md,setup.md,uicheckup.md,uisetup.md'
  );
  const yuru = (d) =>
    fs
      .readdirSync(d, { withFileTypes: true })
      .flatMap((e) =>
        e.name === 'node_modules' || e.name.startsWith('.')
          ? []
          : e.isDirectory()
            ? yuru(path.join(d, e.name))
            : [path.join(d, e.name)]
      );
  for (const f of yuru(path.join(__dirname, '..'))) {
    if (!/\.(md|js|json|tsx)$/.test(f) || f === __filename) continue;
    const s = fs.readFileSync(f, 'utf8');
    for (const eski of [
      '/iskele',
      '/durum',
      '/teknesyumui',
      '/huyekle',
      '/uiayar',
      '/raporver',
      '/kurulum',
      '/devam',
      'relay-izle',
      'koru-sozlesme',
      'kopru.js',
      'protokol.md',
      'AYAR.md',
      'cok-oturum.md',
      'teknesyum:usta',
      'teknesyum:denetci',
      'teknesyum:kayitci',
    ]) {
      if (s.includes(eski))
        throw new Error(path.basename(f) + ' hâlâ "' + eski.trim() + '" içeriyor');
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
    if (new RegExp('\\b' + yasak + '\\b').test(tools))
      throw new Error(yasak + ' hâlâ verilmiş: ' + tools);
  }
});

console.log('\nBildirim');

ol('SessionStart röle durumunu ve sözleşme sayacını bildirir', () => {
  const { p } = proje(2, 1);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(true));
  const m = JSON.parse(r.out).systemMessage;
  icerir(m, 'Teknesyum ▸');
  icerir(m, '1/3 bitti');
  icerir(m, '2 açık');
  icerir(m, 'sürdürüyorum');
});

ol('UserPromptSubmit her istekte ölçü satırını zorunlu kılar', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'şunu yap' },
    konfig(true)
  );
  const o = JSON.parse(r.out);
  esit(o.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  icerir(o.hookSpecificOutput.additionalContext, 'Ölçü ▸');
  icerir(o.hookSpecificOutput.additionalContext, 'ters tırnak içinde');
});

ol('UserPromptSubmit röle kurulu olmayan klasörde iz bırakmaz', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'x' }, konfig(true));
  if (fs.existsSync(path.join(p, '.claude'))) throw new Error('boş klasörde .claude açıldı');
});

function transcript(metin) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-tr-'));
  const f = path.join(d, 'oturum.jsonl');
  fs.writeFileSync(
    f,
    [
      JSON.stringify({ message: { role: 'user', content: 'paketi ver' } }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'text', text: metin }] } }),
    ].join('\n') + '\n'
  );
  return f;
}

const PAKET_BLOK =
  '```\n# GÖREV: VidShrink v0.2\n\nDepo: C:/x/vidshrink\n' +
  'Yığın: .NET 8 / WPF\n' +
  '- madde\n'.repeat(25) +
  '```';

ol("sohbete basılan görev paketi Stop hook'unda engellenir", () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'Stop',
      transcript_path: transcript('İşte paket:\n\n' + PAKET_BLOK),
    },
    konfig(true)
  );
  const o = JSON.parse(r.out);
  esit(o.decision, 'block');
  icerir(o.reason, '.claude/relay/G');
});

ol('normal kod bloğu ve tek satırlık teslim engellenmez', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const bos = (m) =>
    calistir(
      IZLE,
      { ...ort(p), hook_event_name: 'Stop', transcript_path: transcript(m) },
      konfig(true)
    ).out;
  esit(bos('`.claude/relay/G2.md` oku ve içindeki görevi eksiksiz uygula.'), '', 'tek satır');
  esit(bos('```js\n' + 'const a = 1;\n'.repeat(40) + '```'), '', 'uzun kod bloğu');
  esit(bos('```\n# GÖREV: kısa\nDepo: x\n```'), '', 'kısa blok');
});

ol('sohbete basılan rapor gövdesi engellenir', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const blok = '```\n## Rapor\n' + '- yapıldı\n'.repeat(30) + '```';
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'Stop', transcript_path: transcript('G2 bitti:\n\n' + blok) },
    konfig(true)
  );
  const o = JSON.parse(r.out);
  esit(o.decision, 'block');
  icerir(o.reason, '5.1');
});

ol('kopyalanmak için sunulan uzun blok engellenir', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const uzun = '---\n' + 'satır\n'.repeat(30) + '---\n';
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'Stop',
      transcript_path: transcript('Aşağıdaki bloğu olduğu gibi kopyala:\n\n' + uzun),
    },
    konfig(true)
  );
  const o = JSON.parse(r.out);
  esit(o.decision, 'block');
  icerir(o.reason, 'dosyada');
});

ol('kopyalama emri olmadan `---` ayraçlı uzun cevap engellenmez', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const uzun = '---\n' + 'satır\n'.repeat(30) + '---\n';
  esit(
    calistir(
      IZLE,
      { ...ort(p), hook_event_name: 'Stop', transcript_path: transcript('Bulgular:\n\n' + uzun) },
      konfig(true)
    ).out,
    ''
  );
});

ol('SubagentStop ajanın modelini ve eforunu ize yazar', () => {
  const { p, live } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ajantr-'));
  const at = path.join(d, 'agent-a1.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({
      type: 'assistant',
      effort: 'low',
      message: { model: 'claude-haiku-4-5' },
    }) + '\n'
  );
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'a1',
      agent_type: 'scribe',
      agent_transcript_path: at,
      effort: { level: 'high' },
    },
    konfig(true)
  );
  const a = JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  esit(a.model, 'claude-haiku-4-5', 'model');
  esit(a.effort, 'low', 'efor');
});

ol('PostCompact acik sozlesmeyi ve rotayi baglama geri verir', () => {
  const { p } = proje(2, 0);
  fs.mkdirSync(path.join(p, 'docs'), { recursive: true });
  fs.writeFileSync(
    path.join(p, 'docs', 'ROTA-tarama.md'),
    '# Rota\n\n**Kaldığım yer:** D4 (sürüyor)\n'
  );
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'PostCompact' }, konfig(true));
  icerir(r.out, 'T0');
  icerir(r.out, 'ROTA-tarama.md');
  icerir(r.out, 'D4');
});

ol('SessionEnd bitmemis ajan kaydini muhurler', () => {
  const { p, live } = proje(1, 0);
  const ek = { agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' };
  calistir(IZLE, {
    ...ort(p),
    ...ek,
    hook_event_name: 'PostToolUse',
    tool_name: 'Read',
    tool_input: { file_path: path.join(p, 'a.js') },
  });
  calistir(IZLE, { ...ort(p), hook_event_name: 'SessionEnd', reason: 'other' }, konfig(true));
  const a = JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  esit(a.stop_reason, 'session_end');
  if (!a.ended) throw new Error('ended yazilmadi');
});

ol('StopFailure kesinti kaydi acar', () => {
  const { p, live } = proje(1, 0);
  calistir(IZLE, { ...ort(p), hook_event_name: 'StopFailure', error: 'rate_limit' }, konfig(true));
  const k = JSON.parse(fs.readFileSync(path.join(live, '_kesinti.json'), 'utf8'));
  esit(k.length, 1);
  esit(k[0].sebep, 'rate_limit');
});

ol('basarisiz arac adim saymaz, hata olarak yazilir', () => {
  const { p, live } = proje(1, 0);
  const ek = { agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' };
  calistir(IZLE, {
    ...ort(p),
    ...ek,
    hook_event_name: 'PostToolUse',
    tool_name: 'Read',
    tool_input: { file_path: path.join(p, 'a.js') },
  });
  const once = JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8')).steps;
  calistir(IZLE, {
    ...ort(p),
    ...ek,
    hook_event_name: 'PostToolUseFailure',
    tool_name: 'Edit',
    error_type: 'string_not_found',
  });
  const a = JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  esit(a.steps, once, 'adim artmamali');
  icerir(a.last_error, 'string_not_found');
});

ol('Stop döngüye girmez (stop_hook_active)', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  esit(
    calistir(
      IZLE,
      {
        ...ort(p),
        hook_event_name: 'Stop',
        stop_hook_active: true,
        transcript_path: transcript('İşte paket:\n\n' + PAKET_BLOK),
      },
      konfig(true)
    ).out,
    ''
  );
});

ol('röle kurulu değilse ve makine bağlıysa açılışta susar', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  esit(calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(true)).out, '');
});

ol('statusline bağlı değilse açılışta kurulumu hatırlatır', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const m = JSON.parse(
    calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(false)).out
  );
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
    ...ort(p),
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: {
      subagent_type: 'teknesyum:builder',
      model: 'sonnet',
      description: 'tab bileseni',
    },
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
    ...ort(p),
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'a' },
  };
  calistir(IZLE, yuk);
  icerir(JSON.parse(calistir(IZLE, yuk).out).systemMessage, '[2 ajan çalışıyor]');
});

ol('ajan bitişi süreyle bildirilir', () => {
  const { p } = proje(1, 0);
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'a' },
  });
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'SubagentStop',
    agent_id: 'a1',
    agent_type: 'builder',
    agent_transcript_path: '/x/a1.jsonl',
  });
  const m = JSON.parse(r.out).systemMessage;
  icerir(m, 'bitti');
  icerir(m, 'builder');
  icerir(m, 'sn');
});

ol('PostToolUse sessizdir (her araç çağrısında bildirim olmaz)', () => {
  const { p } = proje(1, 0);
  esit(
    calistir(IZLE, {
      ...ort(p),
      hook_event_name: 'PostToolUse',
      tool_name: 'Edit',
      agent_id: 'a1',
      agent_type: 'builder',
      agent_transcript_path: '/x/a1.jsonl',
      tool_input: { file_path: path.join(p, 'src', 'A.jsx') },
    }).out,
    ''
  );
});

ol('TEKNESYUM_SESSIZ=1 bildirimleri kapatır', () => {
  const { p } = proje(2, 1);
  esit(
    calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, { TEKNESYUM_SESSIZ: '1' }).out,
    ''
  );
});

ol('steering=0 bütün Teknesyum satırlarını susturur', () => {
  const { p } = proje(2, 1);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ steering: 0 }));
  const ek = { CLAUDE_CONFIG_DIR: cfg };
  esit(calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, ek).out, '');
  esit(
    calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'bir modül yaz' }, ek)
      .out,
    ''
  );
});

ol('varsayılan seviye 1: temel yönlenme var, fark satırı yok', () => {
  const { p } = proje(2, 1);
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'UserPromptSubmit',
    prompt: 'yeni bir modül yaz ve testlerini kur',
  }).out;
  icerir(r, 'Teknesyum Base');
  if (r.includes('Fark ▸')) throw new Error('seviye 1 fark satırı istemiyor: ' + r);
});

ol('steering=2 fark satırlarını ister', () => {
  const { p } = proje(2, 1);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg2-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ steering: 2 }));
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'yeni bir modül yaz' },
    { CLAUDE_CONFIG_DIR: cfg }
  ).out;
  icerir(r, 'Fark ▸');
  icerir(r, 'seviyesi 2');
});

ol('TEKNESYUM_STEERING ortam değişkeni dosyayı ezer', () => {
  const { p } = proje(2, 1);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg3-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ steering: 2 }));
  esit(
    calistir(
      IZLE,
      { ...ort(p), hook_event_name: 'SessionStart' },
      { CLAUDE_CONFIG_DIR: cfg, TEKNESYUM_STEERING: '0' }
    ).out,
    ''
  );
});

function yonlendirmeProje(sozlesmeler) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-yonlendirme-'));
  const c = path.join(p, '.claude', 'relay', 'contracts');
  fs.mkdirSync(c, { recursive: true });
  for (const s of sozlesmeler) {
    fs.writeFileSync(
      path.join(c, s.id + '.md'),
      '---\nid: ' +
        s.id +
        '\ntitle: ' +
        s.title +
        '\nstatus: active\nowns: [' +
        s.owns.join(', ') +
        ']\n---\n'
    );
  }
  return p;
}

ol('başlığı yakın sözleşme yeni işi üstlenmez', () => {
  const p = yonlendirmeProje([{ id: 'T9', title: 'UI mesaj dili', owns: ['README.md'] }]);
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      session_id: 'support-ui-1',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'Support UI panelini düzelt',
    },
    konfig(true)
  );
  icerir(r.out, 'Yeni iş öncelikli');
  if (r.out.includes('T9 sürdürülür')) throw new Error('başlık benzerliği sözleşme seçti');
  if (r.out.includes('blocked')) throw new Error('ilgisiz sözleşme yeni işi engelledi');
});

ol('hook metninde tek oturumun sözleşme kimliği gömülü değil', () => {
  const src = fs.readFileSync(IZLE, 'utf8');
  const m = src.match(/["'`][^"'`\n]*\bT(5|9)\b[^"'`\n]*["'`]/);
  if (m) throw new Error('projeye özgü sözleşme kimliği hook metninde: ' + m[0]);
});

ol('ilgisiz açık sözleşme yeni işi önceliklendirir', () => {
  const p = yonlendirmeProje([{ id: 'T2', title: 'API', owns: ['src/api.js'] }]);
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      session_id: 'unrelated-1',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'src/ui.js dosyasında yeni ekran yap',
    },
    konfig(true)
  );
  icerir(r.out, 'Yeni iş öncelikli');
  icerir(r.out, 'yeni sözleşme veya ajan açılır');
});

ol('uygun owns eşleşmesi açık sözleşmeye yönlendirir', () => {
  const p = yonlendirmeProje([{ id: 'T4', title: 'UI', owns: ['src/ui.js'] }]);
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      session_id: 'matching-1',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'src/ui.js dosyasını güncelle',
    },
    konfig(true)
  );
  icerir(r.out, 'Owns eşleşmesi · T4 sürdürülür');
});

ol('iki paralel ajan aynı yeni işte görünür', () => {
  const p = yonlendirmeProje([{ id: 'T2', title: 'API', owns: ['src/api.js'] }]);
  const y = {
    ...ort(p),
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'Support UI işi' },
  };
  const a = calistir(IZLE, y);
  const b = calistir(IZLE, y);
  icerir(a.out, 'görev veriliyor');
  icerir(b.out, '[2 ajan çalışıyor]');
});

ol('çakışan owns sahipliği ikinci sözleşmeye bırakılmaz', () => {
  const p = yonlendirmeProje([
    { id: 'T2', title: 'API one', owns: ['src/shared.js'] },
    { id: 'T3', title: 'API two', owns: ['src/shared.js'] },
  ]);
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      session_id: 'conflict-1',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'src/shared.js dosyasını güncelle',
    },
    konfig(true)
  );
  icerir(r.out, 'Sahiplik çakışması');
  icerir(r.out, 'T0 kararı gerekir');
});

ol('varsayilan dil ingilizce', () => {
  const { p } = proje(2, 1);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, { TEKNESYUM_DIL: '' });
  icerir(r.out, 'relay ready');
  if (r.out.includes('röle kurulu')) throw new Error('varsayilan dil turkce donmus');
});

ol('dil ayari teknesyum.json dosyasindan okunur', () => {
  const { p } = proje(2, 1);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-dil-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ dil: 'tr' }));
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'SessionStart' },
    { TEKNESYUM_DIL: '', CLAUDE_CONFIG_DIR: cfg }
  );
  icerir(r.out, 'röle kurulu');
});

ol('gecersiz dil degeri ingilizceye duser', () => {
  const { p } = proje(2, 1);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-dil2-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ dil: 'de' }));
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'SessionStart' },
    { TEKNESYUM_DIL: '', CLAUDE_CONFIG_DIR: cfg }
  );
  icerir(r.out, 'relay ready');
});

ol('ingilizce kurulumda ajan yonergesi de ingilizce', () => {
  const { p } = proje(2, 1);
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      session_id: 'dil-en',
      hook_event_name: 'UserPromptSubmit',
      prompt: 'yeni bir modül yaz',
    },
    { TEKNESYUM_DIL: 'en' }
  );
  icerir(r.out, 'to other agents in English');
  if (r.out.includes('Türkçe yaz')) throw new Error('karisik dil');
});

ol('turkce kurulumda ajanlara turkce yazma talimati gider', () => {
  const { p } = proje(2, 1);
  const r = calistir(IZLE, {
    ...ort(p),
    session_id: 'dil-tr',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'yeni bir modül yaz',
  });
  icerir(r.out, 'Türkçe yaz');
});

ol('birikmis worktree acilista bir kez bildirilir', () => {
  const { p } = proje(1, 0);
  const w = path.join(p, '.claude', 'worktrees');
  for (const ad of ['a', 'b', 'c']) fs.mkdirSync(path.join(w, ad), { recursive: true });
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' });
  icerir(r.out, '3 ajan worktree');
});

ol('worktree yoksa birikim uyarisi cikmaz', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' });
  if (r.out.includes('worktree')) throw new Error('gereksiz uyari');
});

ol('platform notu olmayan depoda model tek soru sormaya yonlendirilir', () => {
  const { p } = proje(1, 0);
  fs.mkdirSync(path.join(p, '.git'), { recursive: true });
  const r = calistir(IZLE, {
    ...ort(p),
    session_id: 'platform-1',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'bir modul yaz',
  });
  icerir(r.out, 'platform notu yok');
});

ol('platform notu yazilmissa soru tekrarlanmaz', () => {
  const { p } = proje(1, 0);
  fs.mkdirSync(path.join(p, '.git'), { recursive: true });
  fs.mkdirSync(path.join(p, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(p, '.claude', 'teknesyum.json'),
    JSON.stringify({ platformlar: ['windows'], platformNeden: 'oyun eklentisi' })
  );
  const r = calistir(IZLE, {
    ...ort(p),
    session_id: 'platform-2',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'bir modul yaz',
  });
  if (r.out.includes('platform notu yok')) throw new Error('not varken sorulmus');
});

ol('depo olmayan klasorde platform sorusu sorulmaz', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, {
    ...ort(p),
    session_id: 'platform-3',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'bir modul yaz',
  });
  if (r.out.includes('platform notu yok')) throw new Error('gecici klasorde sorulmus');
});

ol('basarisiz arac cagrisi sorun gunlugune yazilir', () => {
  const { p, live } = proje(1, 0);
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'PostToolUseFailure',
    agent_id: 'a1',
    tool_name: 'Read',
    tool_input: { file_path: '.claude/relay/SETTINGS.md' },
    error: 'ENOENT: no such file',
  });
  const g = fs.readFileSync(path.join(live, '_sorun.log'), 'utf8');
  icerir(g, 'SETTINGS.md');
  icerir(g, 'ENOENT');
  icerir(g, 'a1');
});

ol('sorun gunlugu debug kapaliyken de tutulur', () => {
  const { p, live } = proje(1, 0);
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'PostToolUseFailure',
      tool_name: 'Bash',
      tool_input: { command: 'npm test' },
      error: 'exit 1',
    },
    { TEKNESYUM_DEBUG: '' }
  );
  icerir(fs.readFileSync(path.join(live, '_sorun.log'), 'utf8'), 'npm test');
});

ol('birikmis sorun acilista bildirilir', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(path.join(live, '_sorun.log'), 'x | y\nz | t\n');
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' });
  icerir(r.out, '2 ajan sorunu');
});

ol('sorun yoksa acilis sessiz kalir', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' });
  if (r.out.includes('ajan sorunu')) throw new Error('gereksiz sorun bildirimi');
});

ol('ajan yonergelerinde yalin dil ve sorun kaydi kurali var', () => {
  for (const a of ['auditor', 'builder', 'scout', 'scribe', 'ui-builder']) {
    const m = fs.readFileSync(path.join(KOK, 'agents', a + '.md'), 'utf8');
    icerir(m, 'Yalın yaz');
    icerir(m, '_sorun.log');
  }
});

ol('kanca engelleri secili dilde konusur', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-engel-dil-'));
  const c = path.join(p, '.claude', 'relay', 'contracts');
  fs.mkdirSync(c, { recursive: true });
  const f = path.join(c, 'T1.md');
  fs.writeFileSync(f, '---\nstatus: active\n---\n');
  const yuk = {
    hook_event_name: 'PreToolUse',
    cwd: p,
    tool_name: 'Write',
    tool_input: { file_path: f, content: '---\nstatus: open\n---\n' },
  };
  icerir(calistir(KORU, yuk, { TEKNESYUM_DIL: 'en' }).err, 'cannot move backwards');
  icerir(calistir(KORU, yuk).err, 'geriye alınamaz');
});

ol('open durumundan dogrudan submitted engellenir', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-basamak-'));
  const c = path.join(p, '.claude', 'relay', 'contracts');
  fs.mkdirSync(c, { recursive: true });
  const f = path.join(c, 'T1.md');
  fs.writeFileSync(f, '---\nstatus: open\n---\n');
  const r = calistir(KORU, {
    hook_event_name: 'PreToolUse',
    cwd: p,
    tool_name: 'Write',
    tool_input: { file_path: f, content: '---\nstatus: submitted\n---\n' },
  });
  icerir(r.err, 'Basamak atlan');
});

ol('open durumundan active serbest', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-basamak2-'));
  const c = path.join(p, '.claude', 'relay', 'contracts');
  fs.mkdirSync(c, { recursive: true });
  const f = path.join(c, 'T1.md');
  fs.writeFileSync(f, '---\nstatus: open\n---\n');
  const r = calistir(KORU, {
    hook_event_name: 'PreToolUse',
    cwd: p,
    tool_name: 'Write',
    tool_input: { file_path: f, content: '---\nstatus: active\n---\n' },
  });
  esit(r.err, '', 'gecerli gecis engellendi');
});

ol('duraklama bildiren mesaj senden bolumu olmadan kapanmaz', () => {
  const { p } = proje(0, 0);
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
    '---\nstatus: active\n---\n'
  );
  const m = 'T3 oturum limitine takildi, isi guvenli noktada durdurdum.\nRapor: PLAN.md';
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'Stop',
    transcript_path: transcript(m),
  });
  const o = JSON.parse(r.out);
  esit(o.decision, 'block');
  icerir(o.reason, 'Senden istediklerim');
});

ol('senden bolumu varsa duraklama serbest', () => {
  const { p } = proje(0, 0);
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
    '---\nstatus: active\n---\n'
  );
  const m =
    'T3 oturum limitine takildi.\nRapor: PLAN.md\n\n## Senden istediklerim\n\n1. Limit donunce yaz: `T3 devam`';
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'Stop',
    transcript_path: transcript(m),
  });
  esit(r.out, '', 'gecerli duraklama engellendi');
});

ol('duraklama yoksa senden bolumu istenmez', () => {
  const { p } = proje(0, 0);
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
    '---\nstatus: active\n---\n'
  );
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'Stop',
    transcript_path: transcript('T3 uzerinde calisiyorum, band olcumu suruyor.'),
  });
  esit(r.out, '', 'gereksiz engel');
});

ol('bayat kayit noktasiyla duzeltme turu acilmaz', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bayat-'));
  const c = path.join(d, '.claude', 'relay', 'contracts');
  fs.mkdirSync(c, { recursive: true });
  const f = path.join(c, 'T1.md');
  fs.writeFileSync(
    f,
    '---\nstatus: submitted\n---\n\n## Kayit noktasi\n\nTamamlandi. Test 69/69.\n'
  );
  const yuk = {
    hook_event_name: 'PreToolUse',
    cwd: d,
    tool_name: 'Edit',
    tool_input: { file_path: f, new_string: 'status: active' },
  };
  icerir(calistir(KORU, yuk).err, 'kayıt noktasını güncelle');
  fs.writeFileSync(
    f,
    '---\nstatus: submitted\n---\n\n## Kayit noktasi\n\nTur 2. Acik: tavan payi, deneme paylasimi.\n'
  );
  esit(calistir(KORU, yuk).err, '', 'taze kayit noktasi engellendi');
});

ol('yeni proje niyetinde on arastirma hatirlatilir', () => {
  const { p } = proje(0, 0);
  const r = calistir(IZLE, {
    ...ort(p),
    session_id: 'arastirma-1',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'VideoEdit diye bir klasör oluştur, plan yap, işe girişme',
  });
  icerir(r.out, 'en az 10 depo');
});

ol('taramalar varsa hatirlatma cikmaz', () => {
  const { p } = proje(0, 0);
  fs.mkdirSync(path.join(p, 'docs', 'taramalar'), { recursive: true });
  const r = calistir(IZLE, {
    ...ort(p),
    session_id: 'arastirma-2',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'sıfırdan bir uygulama yapacağız',
  });
  if (r.out.includes('en az 10 depo')) throw new Error('gereksiz hatirlatma');
});

ol('siradan istekte arastirma hatirlatmasi cikmaz', () => {
  const { p } = proje(0, 0);
  const r = calistir(IZLE, {
    ...ort(p),
    session_id: 'arastirma-3',
    hook_event_name: 'UserPromptSubmit',
    prompt: 'su fonksiyondaki hatayi duzelt',
  });
  if (r.out.includes('en az 10 depo')) throw new Error('gureltu');
});

ol('yeni projede PLAN.md yazimi arastirma kapisina takilir', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-plankapi-'));
  fs.mkdirSync(path.join(d, '.claude', 'relay', 'contracts', 'done'), { recursive: true });
  const r = calistir(KORU, {
    hook_event_name: 'PreToolUse',
    cwd: d,
    tool_name: 'Write',
    tool_input: { file_path: path.join(d, '.claude', 'relay', 'PLAN.md'), content: '# Plan' },
  });
  icerir(r.err, 'n araştırma');
});

console.log('\nEşzamanlılık');

ol('paralel hook süreçleri birbirinin kaydını silmez', () => {
  const { p, live } = proje(1, 0);
  const yuk = (n) =>
    JSON.stringify({
      ...ort(p),
      hook_event_name: 'PreToolUse',
      tool_name: 'Agent',
      tool_input: { subagent_type: 'builder', description: 'is-' + n },
    });
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
    calistir(IZLE, {
      ...ort(p),
      ...ek,
      hook_event_name: 'PostToolUse',
      tool_name: 'Read',
      tool_input: { file_path: path.join(p, 'src', 'f' + n + '.js') },
    });
    JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  }
  const artik = fs.readdirSync(live).filter((f) => f.endsWith('.tmp'));
  if (artik.length) throw new Error('geçici dosya sızdı: ' + artik.join(','));
});

ol('aynı tipten iki ajanda süre uydurulmaz', () => {
  const { p } = proje(1, 0);
  const y = {
    ...ort(p),
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'a' },
  };
  calistir(IZLE, y);
  calistir(IZLE, y);
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'SubagentStop',
    agent_id: 'a1',
    agent_type: 'builder',
    agent_transcript_path: '/x/a1.jsonl',
  });
  icerir(JSON.parse(r.out).systemMessage, 'süre belirsiz');
});

console.log('\nİz');

ol('genel iz temizliği az sayıda klasörde de çalışır', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  const kok = path.join(cfg, 'teknesyum', 'live');
  const bayat = path.join(kok, 'eski-oturum');
  fs.mkdirSync(bayat, { recursive: true });
  fs.writeFileSync(path.join(bayat, 'a1.json'), '{}');
  const gun = Date.now() - 30 * 60 * 60 * 1000;
  fs.utimesSync(bayat, gun / 1000, gun / 1000);
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'a2',
      agent_type: 'builder',
      agent_transcript_path: '/x/a2.jsonl',
    },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  esit(fs.existsSync(bayat), false, '30 saatlik iz hâlâ duruyor');
});

ol('debug dosyası varsayılanda yazılmaz, TEKNESYUM_DEBUG=1 ile yazılır', () => {
  const { p, live } = proje(1, 0);
  const yuk = {
    ...ort(p),
    hook_event_name: 'PostToolUse',
    tool_name: 'Read',
    agent_id: 'a1',
    agent_type: 'builder',
    agent_transcript_path: '/x/a1.jsonl',
    tool_input: {},
  };
  calistir(IZLE, yuk);
  esit(fs.existsSync(path.join(live, '_hook-debug.json')), false, 'bayraksız');
  calistir(IZLE, yuk, { TEKNESYUM_DEBUG: '1' });
  esit(fs.existsSync(path.join(live, '_hook-debug.json')), true, 'bayraklı');
});

ol('ajan izine değişen dosya ve sözleşme numarası işlenir', () => {
  const { p, live } = proje(1, 0);
  const ek = { agent_id: 'a1', agent_type: 'builder', agent_transcript_path: '/x/a1.jsonl' };
  calistir(IZLE, {
    ...ort(p),
    ...ek,
    hook_event_name: 'PostToolUse',
    tool_name: 'Read',
    tool_input: { file_path: path.join(p, '.claude', 'relay', 'contracts', 'T3.md') },
  });
  calistir(IZLE, {
    ...ort(p),
    ...ek,
    hook_event_name: 'PostToolUse',
    tool_name: 'Edit',
    tool_input: { file_path: path.join(p, 'src', 'A.jsx') },
  });
  const s = JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  esit(s.contract, 'T3');
  esit(s.files.join(), 'src/A.jsx');
  esit(s.steps, 2);
});

ol('SubagentStop stop_reason yokken ölüm sayılmaz', () => {
  const { p, live } = proje(1, 0);
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'SubagentStop',
    agent_id: 'a1',
    agent_type: 'builder',
    agent_transcript_path: '/x/a1.jsonl',
  });
  esit(JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8')).stop_reason, 'end_turn');
});

ol('birlestirme onceki ajanin yasam dongusu alanlarini tasimaz', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(
    path.join(live, 'a1.json'),
    JSON.stringify({
      agent_id: 'a1',
      agent_type: 'builder',
      started: '2026-01-01 08:00:00',
      last_seen: '2026-01-01 08:05:00',
      steps: 7,
      last_action: 'Bash',
      files: ['x.cs'],
      stop_reason: 'end_turn',
      ended: '2026-01-01 08:05:00',
      last_word: 'eski ajan',
    })
  );
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'SubagentStart',
    agent_id: 'a2',
    agent_type: 'builder',
    agent_transcript_path: '/x/a1.jsonl',
  });
  const s = JSON.parse(fs.readFileSync(path.join(live, 'a2.json'), 'utf8'));
  esit(s.steps, 7);
  if (s.ended) throw new Error('onceki ajanin ended alani tasindi');
  if (s.last_word) throw new Error('onceki ajanin last_word alani tasindi');
});

ol('bitmis sayilan ajandan yeni olay gelirse kayit geri acilir', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(
    path.join(live, 'a1.json'),
    JSON.stringify({
      agent_id: 'a1',
      agent_type: 'builder',
      started: '2026-01-01 08:00:00',
      last_seen: '2026-01-01 08:05:00',
      steps: 3,
      last_action: 'Bash',
      files: [],
      stop_reason: 'end_turn',
      ended: '2026-01-01 08:05:00',
    })
  );
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'PostToolUse',
    agent_id: 'a1',
    agent_type: 'builder',
    tool_name: 'Bash',
    tool_input: {},
  });
  const s = JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8'));
  esit(s.ended, null);
  esit(s.stop_reason, null);
});

ol('TEKNESYUM_DEBUG olay gunlugu yazar, varsayilanda yazmaz', () => {
  const { p, live } = proje(1, 0);
  const yuk = {
    ...ort(p),
    hook_event_name: 'PostToolUse',
    agent_id: 'a1',
    agent_type: 'builder',
    tool_name: 'Bash',
    tool_input: {},
  };
  calistir(IZLE, yuk);
  if (fs.existsSync(path.join(live, '_hook-debug.log')))
    throw new Error('varsayilanda gunluk yazildi');
  calistir(IZLE, yuk, { TEKNESYUM_DEBUG: '1' });
  const g = fs.readFileSync(path.join(live, '_hook-debug.log'), 'utf8');
  icerir(g, 'id:a1', 'gunluk kimligi');
  icerir(g, 'PostToolUse', 'gunluk olayi');
});

ol('debug ayar dosyasindan da acilir, ortam degiskeni gerekmez', () => {
  const { p, live } = proje(1, 0);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  const yuk = {
    ...ort(p),
    hook_event_name: 'PostToolUse',
    agent_id: 'a1',
    agent_type: 'builder',
    tool_name: 'Bash',
    tool_input: {},
  };
  calistir(IZLE, yuk, { CLAUDE_CONFIG_DIR: cfg });
  esit(fs.existsSync(path.join(live, '_hook-debug.json')), false, 'ayarsiz');
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ debug: true }));
  calistir(IZLE, yuk, { CLAUDE_CONFIG_DIR: cfg });
  esit(fs.existsSync(path.join(live, '_hook-debug.json')), true, 'debug:true');
});

ol('röle yoksa iz genel dizine düşer, proje kirletilmez', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'a1',
      agent_type: 'builder',
      agent_transcript_path: '/x/a1.jsonl',
    },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  esit(fs.existsSync(path.join(p, '.claude')), false, 'proje kirlenmiş');
  esit(fs.existsSync(path.join(cfg, 'teknesyum', 'live', 'oturum-1', 'a1.json')), true);
});

console.log('\nKoruma — done/ kapısı');

const MUHURLU =
  '---\nstatus: done\naudit: passed\nauditor_id: a4f21c9\n' +
  'diff: 3 dosya / +88 -12\nverification: npm test 43/43\n---\n';

ol('done/ altına Edit engellenir', () => {
  const r = calistir(KORU, {
    tool_name: 'Edit',
    tool_input: { file_path: '/p/.claude/relay/contracts/done/T1.md' },
  });
  esit(r.kod, 2);
  icerir(r.err, 'ENGELLENDİ');
});

ol('göreli Windows yolu da engellenir (mutlak yol şartı bypass ediyordu)', () => {
  esit(
    calistir(KORU, {
      tool_name: 'Write',
      tool_input: { file_path: '.claude\\relay\\contracts\\done\\T1.md', content: '#' },
    }).kod,
    2
  );
});

ol('mühürsüz Write engellenir, mühürlü Write geçer', () => {
  esit(
    calistir(KORU, {
      tool_name: 'Write',
      tool_input: {
        file_path: '/p/.claude/relay/contracts/done/T1.md',
        content: '---\nstatus: done\n---\n',
      },
    }).kod,
    2,
    'mühürsüz'
  );
  esit(
    calistir(KORU, {
      tool_name: 'Write',
      tool_input: { file_path: '/p/.claude/relay/contracts/done/T1.md', content: MUHURLU },
    }).kod,
    0,
    'mühürlü'
  );
});

ol('yarım mühür geçmez: dört alanın hepsi dolu olmalı', () => {
  const yaz = (c) =>
    calistir(KORU, {
      tool_name: 'Write',
      tool_input: { file_path: '/p/.claude/relay/contracts/done/T1.md', content: c },
    }).kod;
  esit(yaz('---\nstatus: done\naudit: passed\n---\n'), 2, 'tek satır mühür');
  esit(yaz(MUHURLU.replace('auditor_id: a4f21c9', 'auditor_id: —')), 2, 'kimlik boş');
  esit(yaz(MUHURLU.replace('diff: 3 dosya / +88 -12', 'diff:')), 2, 'diff boş');
  esit(yaz(MUHURLU.replace(/verification: .*/, 'verification: -')), 2, 'doğrulama tire');
  esit(yaz(MUHURLU.replace('audit: passed', 'audit: —')), 2, 'denetim yok');
});

ol('mühürlü dosyaya bile Edit yasak (bitmiş sözleşme değişmez)', () => {
  esit(
    calistir(KORU, {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/p/.claude/relay/contracts/done/T1.md',
        new_string: 'audit: passed',
      },
    }).kod,
    2
  );
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
  esit(
    calistir(KORU, {
      tool_name: 'Bash',
      tool_input: { command: 'cat .claude/relay/contracts/done/T1.md' },
    }).kod,
    0
  );
});

ol('duzyazidaki `>` yonlendirme sanilmaz', () => {
  const metin = 'python yaz.py  # contracts' + '/done aciklamasi: <sebep> ve <zaman>';
  esit(calistir(KORU, { tool_name: 'Bash', tool_input: { command: metin } }).kod, 0);
});

ol('zincirin baska halkasindaki yazma fiili done/ ile iliskilendirilmez', () => {
  const metin = 'rm -f /tmp/x.txt; cat .claude/relay/contracts' + '/done/T1.md';
  esit(calistir(KORU, { tool_name: 'Bash', tool_input: { command: metin } }).kod, 0);
});

ol('mühürlü sözleşmenin kabuktan taşınması geçer', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-muhur-'));
  const src = path.join(p, 'T1.md');
  fs.writeFileSync(src, MUHURLU);
  esit(
    calistir(KORU, {
      tool_name: 'Bash',
      tool_input: {
        command: 'mv ' + src.replace(/\\/g, '/') + ' /p/.claude/relay/contracts/done/T1.md',
      },
    }).kod,
    0
  );
});

ol('açık sözleşmeye yazma serbest', () => {
  esit(
    calistir(KORU, {
      tool_name: 'Edit',
      tool_input: { file_path: '/p/.claude/relay/contracts/T1.md' },
    }).kod,
    0
  );
});

ol('sözleşme şablonu mühür alanlarını taşıyor', () => {
  const t = fs.readFileSync(
    path.join(KOK, 'skills', 'relay', 'assets', 'contract.template.md'),
    'utf8'
  );
  for (const alan of ['audit:', 'auditor_id:', 'diff:', 'verification:']) icerir(t, alan);
});

ol('hiçbir ajan sözleşmeyi done/ altına taşımakla görevlendirilmemiş', () => {
  for (const a of ['builder.md', 'ui-builder.md', 'scribe.md']) {
    const md = fs.readFileSync(path.join(KOK, 'agents', a), 'utf8');
    const gorev = md
      .split('\n')
      .filter((l) => /^\d+\./.test(l.trim()))
      .join('\n');
    if (/status:\s*done/.test(gorev)) throw new Error(a + ': ajana `status: done` yazdırılıyor');
    if (/`?contracts\/done\/`?'?a taşı/.test(gorev))
      throw new Error(a + ': ajana taşıma yaptırılıyor');
    icerir(md, 'submitted', a);
  }
});

console.log('\nStatusline');

ol('çalışan ajan ve sözleşme ilerlemesi basılır', () => {
  const { p } = proje(2, 1);
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: { subagent_type: 'teknesyum:auditor', description: 'T3 dogrulama' },
  });
  const r = calistir(DURUM, {
    cwd: p,
    session_id: 'oturum-1',
    model: { display_name: 'Opus' },
    workspace: { current_dir: p },
  });
  icerir(r.out, 'auditor');
  icerir(r.out, '1/3');
});

ol('bayat çalışan kaydı gösterilmez (oturum ajan çalışırken düşerse)', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(
    path.join(live, '_running.json'),
    JSON.stringify([
      { type: 'builder', desc: 'bayat', start: Date.now() - 3 * 60 * 60 * 1000 },
      { type: 'auditor', desc: 'taze', start: Date.now() },
    ])
  );
  const r = calistir(DURUM, {
    cwd: p,
    session_id: 'oturum-1',
    model: { display_name: 'Opus' },
    workspace: { current_dir: p },
  });
  icerir(r.out, 'auditor');
  if (r.out.includes('bayat')) throw new Error('3 saatlik kayıt hâlâ çalışıyor görünüyor');
});

ol('alt çizgili kayıtlar ajan sanılmaz (hayalet ⨯ satırı)', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(path.join(live, '_running.json'), '[]');
  fs.writeFileSync(path.join(live, '_hook-debug.json'), '{"toplam":3}');
  const r = calistir(DURUM, {
    cwd: p,
    session_id: 'oturum-1',
    model: { display_name: 'Opus' },
    workspace: { current_dir: p },
  });
  if (/⨯/.test(r.out)) throw new Error('hayalet ölü ajan satırı: ' + r.out);
});

ol('dünkü ölü ajan gösterilmez', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  const eski = new Date(Date.now() - 30 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
  const yeni = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.writeFileSync(
    path.join(live, 'a1.json'),
    JSON.stringify({
      agent_id: 'a1',
      agent_type: 'builder',
      stop_reason: 'unknown',
      last_seen: eski,
    })
  );
  let r = calistir(DURUM, {
    cwd: p,
    session_id: 'oturum-1',
    model: { display_name: 'Opus' },
    workspace: { current_dir: p },
  });
  if (r.out.includes('builder')) throw new Error('30 saatlik ölü ajan hâlâ gösteriliyor');
  fs.writeFileSync(
    path.join(live, 'a1.json'),
    JSON.stringify({
      agent_id: 'a1',
      agent_type: 'builder',
      stop_reason: 'max_tokens',
      last_seen: yeni,
    })
  );
  r = calistir(DURUM, {
    cwd: p,
    session_id: 'oturum-1',
    model: { display_name: 'Opus' },
    workspace: { current_dir: p },
  });
  icerir(r.out, 'bağlamı doldu', 'taze ölü ajan');
});

ol('susmus ajan kayip gosterilir', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  const eski = new Date(Date.now() - 20 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const yeni = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const dur = () =>
    calistir(DURUM, {
      cwd: p,
      session_id: 'oturum-1',
      model: { display_name: 'Opus' },
      workspace: { current_dir: p },
    });
  fs.writeFileSync(
    path.join(live, 'a1.json'),
    JSON.stringify({ agent_id: 'a1', agent_type: 'builder', stop_reason: null, last_seen: eski })
  );
  icerir(dur().out, 'yanıt yok', '20 dakikadir susan ajan');
  fs.writeFileSync(
    path.join(live, 'a1.json'),
    JSON.stringify({ agent_id: 'a1', agent_type: 'builder', stop_reason: null, last_seen: yeni })
  );
  if (dur().out.includes('yanıt yok')) throw new Error('taze ajan kayip sayildi');
});

ol('alt klasörden açılan oturumda röle bulunur', () => {
  const { p } = proje(2, 1);
  const alt = path.join(p, 'src', 'backend');
  fs.mkdirSync(alt, { recursive: true });
  calistir(IZLE, {
    ...ort(alt),
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: { subagent_type: 'builder', description: 'derin' },
  });
  const r = calistir(DURUM, {
    cwd: alt,
    session_id: 'oturum-1',
    model: { display_name: 'Opus' },
    workspace: { current_dir: alt },
  });
  icerir(r.out, '1/3', 'sözleşme ilerlemesi');
  icerir(r.out, 'builder', 'çalışan ajan');
});

function worktreeProje() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-worktree-'));
  const main = path.join(p, 'main');
  const wt = path.join(p, 'worktree');
  fs.mkdirSync(main, { recursive: true });
  spawnSync('git', ['-C', main, 'init', '--initial-branch=main'], { encoding: 'utf8' });
  fs.writeFileSync(path.join(main, 'index.js'), 'const a = 1;\n');
  spawnSync('git', ['-C', main, 'add', 'index.js'], { encoding: 'utf8' });
  spawnSync(
    'git',
    [
      '-C',
      main,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-m',
      'init',
    ],
    { encoding: 'utf8' }
  );
  const relay = path.join(main, '.claude', 'relay');
  fs.mkdirSync(path.join(relay, 'contracts', 'done'), { recursive: true });
  fs.writeFileSync(path.join(relay, 'contracts', 'T1.md'), '---\nstatus: active\n---\n');
  spawnSync('git', ['-C', main, 'worktree', 'add', '--detach', wt], { encoding: 'utf8' });
  return { main, wt, relay };
}

ol('worktree cwd kanonik röleyi bulur ve canlı izi ayırır', () => {
  const { wt, relay } = worktreeProje();
  const r = calistir(IZLE, {
    ...ort(wt),
    hook_event_name: 'PostToolUse',
    agent_id: 'a1',
    agent_type: 'builder',
    tool_input: { file_path: path.join(relay, 'contracts', 'T1.md') },
  });
  esit(r.kod, 0);
  const worktrees = path.join(relay, 'live', 'worktrees');
  const izler = fs.existsSync(worktrees)
    ? fs.readdirSync(worktrees).filter((f) => fs.existsSync(path.join(worktrees, f, 'a1.json')))
    : [];
  if (izler.length !== 1) throw new Error('worktree izi common izine karıştı');
});

ol('worktree sözleşme durumu canonical yoldan korunur', () => {
  const { wt, relay } = worktreeProje();
  const f = path.join(relay, 'contracts', 'T1.md');
  const r = calistir(KORU, {
    cwd: wt,
    tool_name: 'Write',
    tool_input: { file_path: f, content: '---\nstatus: open\n---\n' },
  });
  esit(r.kod, 2, 'worktree sözleşmesi gerilememeli');
  icerir(r.err, 'geriye alınamaz');
});

ol('bozuk girdide çökmez', () => {
  const r = spawnSync(process.execPath, [DURUM], { input: 'bu json degil', encoding: 'utf8' });
  esit(r.status, 0);
});

function sozlesmeProje(eskiDurum) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-durum-'));
  const c = path.join(p, '.claude', 'relay', 'contracts');
  fs.mkdirSync(c, { recursive: true });
  const f = path.join(c, 'T1.md');
  fs.writeFileSync(f, '---\nname: T1\nstatus: ' + eskiDurum + '\n---\n');
  return f;
}

ol('sözleşme durumu geriye alınamaz', () => {
  const f = sozlesmeProje('submitted');
  const r = calistir(KORU, {
    tool_name: 'Write',
    tool_input: { file_path: f, content: '---\nname: T1\nstatus: open\n---\n' },
  });
  esit(r.kod, 2, 'gerileme engellenmeli');
  icerir(r.err, 'geriye alınamaz');
});

ol('sözleşme durumu ileri gidebilir', () => {
  const f = sozlesmeProje('active');
  esit(
    calistir(KORU, {
      tool_name: 'Edit',
      tool_input: { file_path: f, old_string: 'status: active', new_string: 'status: submitted' },
    }).kod,
    0
  );
});

ol('blocked her durumdan yazılabilir', () => {
  const f = sozlesmeProje('submitted');
  esit(
    calistir(KORU, {
      tool_name: 'Edit',
      tool_input: { file_path: f, old_string: 'x', new_string: 'status: blocked' },
    }).kod,
    0
  );
});

ol('bozuk js yazımı ayrıştırma hatasıyla geri döner', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-sozdizim-'));
  const f = path.join(d, 'bozuk.js');
  fs.writeFileSync(f, 'function a( {\n');
  const r = calistir(IZLE, {
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    cwd: d,
    tool_input: { file_path: f },
  });
  icerir(r.out, 'ayrıştırılamıyor');
  icerir(r.out, 'block');
});

ol('sağlam js sessiz geçer', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-sozdizim2-'));
  const f = path.join(d, 'iyi.js');
  fs.writeFileSync(f, 'const a = 1;\n');
  const r = calistir(IZLE, {
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    cwd: d,
    tool_input: { file_path: f },
  });
  esit(r.out, '', 'temiz dosyada çıktı olmamalı');
});

ol('ESM kaynağı CommonJS sanılıp yanlış alarm verilmez', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-esm-'));
  const f = path.join(d, 'mod.js');
  fs.writeFileSync(f, "import x from 'y';\nexport default x;\n");
  esit(
    calistir(IZLE, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      cwd: d,
      tool_input: { file_path: f },
    }).out,
    ''
  );
});

ol('bozuk json geri döner, tsconfig denetlenmez', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-json-'));
  const a = path.join(d, 'a.json');
  fs.writeFileSync(a, '{ "x": }');
  icerir(
    calistir(IZLE, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      cwd: d,
      tool_input: { file_path: a },
    }).out,
    'ayrıştırılamıyor'
  );
  const b = path.join(d, 'tsconfig.json');
  fs.writeFileSync(b, '{ // yorum\n "x": 1 }');
  esit(
    calistir(IZLE, {
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      cwd: d,
      tool_input: { file_path: b },
    }).out,
    ''
  );
});

const UICHECKUP = path.join(KOK, 'scripts', 'uicheckup.js');
const UICHECKUP_APPLY = path.join(KOK, 'scripts', 'uicheckup-apply.js');

function uiCheckupProje() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-uicheckup-'));
  fs.mkdirSync(path.join(p, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(p, 'src', 'Panel.jsx'),
    'export default function Panel() { return <div>HELLO</div>; }\n'
  );
  fs.writeFileSync(path.join(p, 'src', 'theme.css'), '.panel { color: rgba(1, 2, 3, 1); }\n');
  return p;
}

function uiCheckupScan(p) {
  const r = spawnSync(process.execPath, [UICHECKUP, p], { encoding: 'utf8' });
  esit(r.status, 0, 'uicheckup taraması');
  return JSON.parse(r.stdout);
}

function uiCheckupPlan(p) {
  const plan = uiCheckupScan(p);
  const file = path.join(p, 'ui-plan.json');
  fs.writeFileSync(file, JSON.stringify(plan));
  return { plan, file };
}

function uiCheckupApply(args) {
  return spawnSync(process.execPath, [UICHECKUP_APPLY, ...args], { encoding: 'utf8' });
}

ol('uicheckup taraması deterministik plan ve digest üretir', () => {
  const p = uiCheckupProje();
  const first = uiCheckupScan(p);
  const second = uiCheckupScan(p);
  esit(JSON.stringify(first), JSON.stringify(second), 'aynı tarama aynı planı üretmeli');
  if (!/^[a-f0-9]{64}$/.test(first.digest)) throw new Error('plan digest yok');
  if (!first.files.length || !first.files.every((record) => /^[a-f0-9]{64}$/.test(record.digest)))
    throw new Error('dosya digest yok');
  if (!first.findings.length) throw new Error('bulgu yok');
});

ol('onaysız apply hedefe yazmaz', () => {
  const p = uiCheckupProje();
  const { plan, file } = uiCheckupPlan(p);
  const before = fs.readFileSync(path.join(p, 'src', 'Panel.jsx'), 'utf8');
  const r = uiCheckupApply(['--plan', file, '--plan-digest', plan.digest, '--target', p]);
  if (r.status === 0 || !/approve/i.test(r.stderr)) throw new Error('onaysız apply reddedilmedi');
  esit(fs.readFileSync(path.join(p, 'src', 'Panel.jsx'), 'utf8'), before, 'hedef değişti');
});

ol('stale plan değişen dosyayı reddeder', () => {
  const p = uiCheckupProje();
  const { plan, file } = uiCheckupPlan(p);
  fs.appendFileSync(path.join(p, 'src', 'Panel.jsx'), 'const changed = true;\n');
  const r = uiCheckupApply([
    '--approve',
    '--plan',
    file,
    '--plan-digest',
    plan.digest,
    '--target',
    p,
  ]);
  if (r.status === 0 || !/stale plan/i.test(r.stderr)) throw new Error('stale plan reddedilmedi');
});

ol('onaylı apply güvenli manifest üretir', () => {
  const p = uiCheckupProje();
  const { plan, file } = uiCheckupPlan(p);
  const r = uiCheckupApply([
    '--approve',
    '--plan',
    file,
    '--plan-digest',
    plan.digest,
    '--target',
    p,
  ]);
  esit(r.status, 0, 'onaylı apply');
  const manifest = JSON.parse(r.stdout);
  esit(manifest.approved, true, 'manifest onay durumu');
  esit(manifest.writeTarget, false, 'manifest yazma durumu');
  esit(manifest.handoff, 'ui-builder/relay', 'manifest aktarımı');
});

ol('apply plan path traversal reddeder', () => {
  const p = uiCheckupProje();
  const { plan, file } = uiCheckupPlan(p);
  plan.files[0].file = '../outside.txt';
  const copy = { ...plan };
  delete copy.digest;
  plan.digest = require('crypto').createHash('sha256').update(JSON.stringify(copy)).digest('hex');
  fs.writeFileSync(file, JSON.stringify(plan));
  const r = uiCheckupApply([
    '--approve',
    '--plan',
    file,
    '--plan-digest',
    plan.digest,
    '--target',
    p,
  ]);
  if (r.status === 0 || !/traversal|kök dışı/i.test(r.stderr))
    throw new Error('path traversal reddedilmedi');
});

const HARITA = path.join(KOK, 'scripts', 'harita.js');

function haritaProje() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-harita-'));
  fs.mkdirSync(path.join(p, 'src'), { recursive: true });
  fs.mkdirSync(path.join(p, 'node_modules', 'paket'), { recursive: true });
  fs.writeFileSync(path.join(p, 'node_modules', 'paket', 'index.js'), 'module.exports = 1;');
  fs.writeFileSync(
    path.join(p, 'src', 'a.js'),
    "const b = require('./b');\nconst x = require('lodash');\n"
  );
  fs.writeFileSync(path.join(p, 'src', 'b.js'), "import c from './c.js';\nexport default c;\n");
  fs.writeFileSync(path.join(p, 'src', 'c.js'), 'export default 1;\n');
  fs.writeFileSync(path.join(p, 'src', 'yalniz.js'), 'const q = 1;\n');
  return p;
}

ol('harita ic bagi cozer, dis paketi ayirir', () => {
  const p = haritaProje();
  const r = spawnSync(process.execPath, [HARITA, p], { encoding: 'utf8' });
  esit(r.status, 0, 'harita cikmali');
  const j = JSON.parse(fs.readFileSync(path.join(p, '.claude', 'harita.json'), 'utf8'));
  esit(j['src/a.js'].ic[0], 'src/b.js', 'goreli require cozulmeli');
  esit(j['src/b.js'].ic[0], 'src/c.js', 'import cozulmeli');
  esit(j['src/a.js'].dis.includes('lodash'), true, 'dis paket ayrilmali');
  esit(j['node_modules/paket/index.js'], undefined, 'node_modules taranmamali');
});

ol('harita yetimi ve merkezi isaretler', () => {
  const p = haritaProje();
  spawnSync(process.execPath, [HARITA, p], { encoding: 'utf8' });
  const m = fs.readFileSync(path.join(p, '.claude', 'harita.md'), 'utf8');
  icerir(m, 'src/yalniz.js', 'yetim listelenmeli');
  icerir(m, '## Bağlar');
});

ol('harita donguyu bulur', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-dongu-'));
  fs.writeFileSync(path.join(p, 'a.js'), "require('./b');\n");
  fs.writeFileSync(path.join(p, 'b.js'), "require('./a');\n");
  spawnSync(process.execPath, [HARITA, p], { encoding: 'utf8' });
  icerir(fs.readFileSync(path.join(p, '.claude', 'harita.md'), 'utf8'), '## Döngüler');
});

ol('harita C# using satirini ad alanina baglar', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cs-'));
  fs.writeFileSync(path.join(p, 'Model.cs'), 'namespace App.Models;\nclass M {}\n');
  fs.writeFileSync(
    path.join(p, 'Svc.cs'),
    'using App.Models;\nusing System.IO;\nnamespace App.Svc;\n'
  );
  spawnSync(process.execPath, [HARITA, p], { encoding: 'utf8' });
  const j = JSON.parse(fs.readFileSync(path.join(p, '.claude', 'harita.json'), 'utf8'));
  esit(j['Svc.cs'].ns[0], 'App.Models', 'ic ad alani baglanmali');
  esit(j['Svc.cs'].dis.includes('System'), true, 'cerceve ad alani dis sayilmali');
});

const PLATFORM = path.join(KOK, 'scripts', 'platform-denetim.js');

function platformProje(cfg) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-platform-'));
  fs.writeFileSync(
    path.join(p, 'app.js'),
    'const kok = "C:\\Users\\ali";\nconst x = require("child_process");\n'
  );
  fs.writeFileSync(path.join(p, 'App.csproj'), '<TargetFramework>net8.0-windows</TargetFramework>');
  if (cfg) {
    fs.mkdirSync(path.join(p, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(p, '.claude', 'teknesyum.json'), JSON.stringify(cfg));
  }
  return p;
}

ol('platform denetimi gomulu yolu ve tek platform hedefini bulur', () => {
  const p = platformProje(null);
  const r = spawnSync(process.execPath, [PLATFORM, p, '--kati'], { encoding: 'utf8' });
  icerir(r.stdout, 'gömülü sürücü harfi');
  icerir(r.stdout, 'tek platform hedefi');
  icerir(r.stdout, 'CI iş akışı yok');
  esit(r.status, 1, '--kati bulguda 1 donmeli');
});

ol('proje bazinda kapatilan kural bulgu uretmez', () => {
  const p = platformProje({ platformlar: ['win'], platformNeden: 'kabuk ilişkilendirmesi' });
  const r = spawnSync(process.execPath, [PLATFORM, p, '--kati'], { encoding: 'utf8' });
  icerir(r.stdout, 'Kural bu projede kapalı');
  icerir(r.stdout, 'kabuk ilişkilendirmesi');
  esit(r.status, 0, 'kapali projede kapi acik kalmali');
});

ol('paket ve eklenti surumu ayni', () => {
  const a = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(KOK, '.claude-plugin', 'plugin.json'), 'utf8'));
  esit(a.version, b.version, 'surumler ayrismis');
});

ol('urun standardi paketlenir ve skill ona isaret eder', () => {
  const f = path.join(KOK, 'skills', 'relay', 'references', 'standartlar.md');
  esit(fs.existsSync(f), true, 'standartlar.md olmali');
  const st = fs.readFileSync(f, 'utf8');
  icerir(st, 'platformlar');
  icerir(st, 'SHA256SUMS');
  icerir(fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8'), 'standartlar.md');
});

ol('yonlendirici sablon AGENTS.md adini tasir', () => {
  const a = path.join(KOK, 'skills', 'relay', 'assets', 'folder-agents.template.md');
  esit(fs.existsSync(a), true, 'folder-agents.template.md olmali');
  icerir(fs.readFileSync(a, 'utf8'), '@AGENTS.md');
  icerir(
    fs.readFileSync(path.join(KOK, 'agents', 'scribe.md'), 'utf8'),
    'folder-agents.template.md'
  );
});

function acikSozlesmeProje() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-donus-'));
  const c = path.join(p, '.claude', 'relay', 'contracts');
  fs.mkdirSync(c, { recursive: true });
  fs.writeFileSync(path.join(c, 'T1.md'), '---\nname: T1\nstatus: active\n---\n');
  return p;
}

function stopIle(cwd, mesaj) {
  const t = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-iz-')), 'x.jsonl');
  fs.writeFileSync(
    t,
    JSON.stringify({
      type: 'assistant',
      message: { role: 'assistant', content: [{ type: 'text', text: mesaj }] },
    }) + '\n'
  );
  return calistir(IZLE, { hook_event_name: 'Stop', cwd, transcript_path: t });
}

ol('acik sozlesmede donus blogu olmadan kapanilmaz', () => {
  const r = stopIle(acikSozlesmeProje(), 'T1 tamamlandı, tüm kabul kriterleri karşılandı.');
  icerir(r.out, 'dönüş bloğu');
  icerir(r.out, 'block');
});

ol('donus blogu verilmisse engel yok', () => {
  const m = 'T1 tamamlandı.\n\n```\nT1 teslim edildi.\nRapor: .claude/relay/T1.md ## Rapor\n```\n';
  esit(stopIle(acikSozlesmeProje(), m).out, '', 'donus blogu varken susmali');
});

ol('acik sozlesme yokken bitis cumlesi engellenmez', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  fs.mkdirSync(path.join(p, '.claude', 'relay'), { recursive: true });
  esit(stopIle(p, 'Hepsi tamamlandı, testler geçti.').out, '', 'sozlesme yoksa sessiz');
});

function taptazeProje(ekle) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-yeni-'));
  fs.mkdirSync(path.join(p, '.claude', 'relay', 'contracts'), { recursive: true });
  fs.writeFileSync(path.join(p, 'index.js'), 'const a = 1;\n');
  if (ekle) {
    fs.mkdirSync(path.join(p, 'docs', 'taramalar'), { recursive: true });
    fs.writeFileSync(path.join(p, 'docs', 'taramalar', ekle), 'gerekce\n');
  }
  return p;
}

function ilkSozlesme(p) {
  return calistir(KORU, {
    tool_name: 'Write',
    tool_input: {
      file_path: path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
      content: '---\nname: T1\nstatus: open\n---\n',
    },
  });
}

ol('sifirdan projede on arastirmasiz ilk sozlesme engellenir', () => {
  const r = ilkSozlesme(taptazeProje(null));
  esit(r.kod, 2, 'engellenmeli');
  icerir(r.err, 'ön araştırma');
});

ol('ATLANDI.md kapiyi acar', () => {
  esit(ilkSozlesme(taptazeProje('ATLANDI.md')).kod, 0);
});

ol('taramalar varsa kapi acik', () => {
  esit(ilkSozlesme(taptazeProje('aider.md')).kod, 0);
});

ol('yerlesik projede on arastirma istenmez', () => {
  const p = taptazeProje(null);
  for (let i = 0; i < 12; i++) fs.writeFileSync(path.join(p, 'm' + i + '.js'), 'const a = 1;\n');
  esit(ilkSozlesme(p).kod, 0, '10+ kaynak dosyali proje yeni sayilmaz');
});

ol('scout ajani paketlenir', () => {
  const a = fs.readFileSync(path.join(KOK, 'agents', 'scout.md'), 'utf8');
  icerir(a, 'name: scout');
  icerir(a, 'docs/taramalar/');
  esit(/tools:.*Write/.test(a), true, 'scout yazabilmeli');
  esit(/tools:.*Edit/.test(a), false, 'scout kod duzenlememeli');
});

ol('uicheckup kod adlarini buyuk harf bulgusu saymaz', () => {
  const p = uiCheckupProje();
  fs.writeFileSync(
    path.join(p, 'src', 'Sabit.jsx'),
    'const API_URL = "https://x/API";\nexport const A = () => <div>Panel acildi</div>;\n'
  );
  const r = uiCheckupScan(p);
  const bulgu = r.findings.filter((f) => f.file === 'src/Sabit.jsx');
  esit(bulgu.length, 0, 'kod adlari bulgu uretmemeli');
});

ol('uicheckup palet disi rengi ve punto sapmasini yakalar', () => {
  const p = uiCheckupProje();
  fs.writeFileSync(
    path.join(p, 'src', 'Kart.css'),
    '.kart { color: #123456; }\n.ad { font-size: 11px; }\n.iyi { color: #00f3ff; font-size: 14px; }\n'
  );
  const r = uiCheckupScan(p);
  const bulgu = r.findings.filter((f) => f.file === 'src/Kart.css');
  esit(bulgu.length, 2, 'iki bulgu bekleniyor');
  esit(
    bulgu.every((f) => f.line < 3),
    true,
    'palet ici satir bulgu uretmemeli'
  );
});

ol('uicheckup yalniz atif yapilan katalog kurallarini basar', () => {
  const p = uiCheckupProje();
  const r = uiCheckupScan(p);
  const atif = new Set(r.findings.map((f) => f.rule));
  esit(
    r.catalog.rules.every((rule) => atif.has(rule.id)),
    true,
    'atif yapilmayan kural basilmamali'
  );
  esit(r.truncated, 0, 'tavan asilmadi');
});

ol('platform denetimi olmayan yolu bildirir', () => {
  const r = spawnSync(
    process.execPath,
    [PLATFORM, path.join(os.tmpdir(), 'teknesyum-yok-' + Date.now())],
    {
      encoding: 'utf8',
    }
  );
  esit(r.status, 2, 'olmayan yol icin cikis kodu');
  if (!/yol yok/.test(r.stderr)) throw new Error('olmayan yol bildirilmedi');
});

ol('govdeli CLAUDE.md engellenir, isaretci serbest', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-agents-'));
  fs.mkdirSync(path.join(p, 'src'), { recursive: true });
  const yaz = (dosya, icerik) =>
    calistir(KORU, {
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: dosya, content: icerik },
    });
  const govdeli = yaz(path.join(p, 'src', 'CLAUDE.md'), '# src\n\nBurada arayuz durur.\n');
  esit(govdeli.kod, 2, 'govdeli CLAUDE.md engellenmeli');
  icerir(govdeli.err, 'AGENTS.md');
  esit(yaz(path.join(p, 'src', 'CLAUDE.md'), '@AGENTS.md\n').kod, 0, 'isaretci serbest');
  esit(
    yaz(path.join(p, 'src', 'AGENTS.md'), '# src\n\nBurada arayuz durur.\n').kod,
    0,
    'AGENTS.md serbest'
  );
});

function oturumProjesi() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-oturum-'));
  const sat = [
    {
      type: 'user',
      sessionId: 'S1',
      timestamp: '2026-01-01T10:00:00.000Z',
      cwd: p,
      version: '2.1.0',
      message: { role: 'user', content: 'ilk istek<system-reminder>gizli not</system-reminder>' },
    },
    {
      type: 'assistant',
      sessionId: 'S1',
      timestamp: '2026-01-01T10:00:05.000Z',
      message: {
        role: 'assistant',
        model: 'claude-opus-5',
        usage: { input_tokens: 10, cache_read_input_tokens: 90, output_tokens: 7 },
        content: [
          { type: 'thinking', thinking: 'gizli dusunce' },
          { type: 'text', text: 'ilk cevap' },
          { type: 'tool_use', name: 'Edit', input: { file_path: path.join(p, 'a.js') } },
        ],
      },
    },
    {
      type: 'user',
      sessionId: 'S1',
      timestamp: '2026-01-01T10:00:06.000Z',
      toolUseResult: { ok: true },
      message: { role: 'user', content: [{ type: 'tool_result', content: 'tamam' }] },
    },
    {
      type: 'assistant',
      sessionId: 'S1',
      isSidechain: true,
      timestamp: '2026-01-01T10:00:07.000Z',
      message: { role: 'assistant', content: [{ type: 'text', text: 'alt ajan konusmasi' }] },
    },
    {
      type: 'queue-operation',
      operation: 'enqueue',
      sessionId: 'S1',
      content: 'kuyrukta bekleyen is',
    },
    { type: 'last-prompt', sessionId: 'S1', lastPrompt: 'yazdim ama gondermedim' },
  ];
  fs.writeFileSync(
    path.join(p, 'kaynak.jsonl'),
    sat.map((x) => JSON.stringify(x)).join('\n') + '\n'
  );
  return p;
}

function oturumCalistir(...ek) {
  const r = spawnSync(process.execPath, [OTURUM, ...ek], { encoding: 'utf8' });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

ol('oturum kaydi ozet, ham ve durum uretir', () => {
  const p = oturumProjesi();
  const r = oturumCalistir(
    'kaydet',
    'sinav',
    '--proje',
    p,
    '--transkript',
    path.join(p, 'kaynak.jsonl')
  );
  esit(r.kod, 0, 'kaydet cikis kodu');
  const dip = path.join(p, '.claude', 'oturumlar', 'sinav');
  for (const f of ['ozet.md', 'ham.jsonl', 'durum.json'])
    if (!fs.existsSync(path.join(dip, f))) throw new Error('eksik dosya: ' + f);
  const d = JSON.parse(fs.readFileSync(path.join(dip, 'durum.json'), 'utf8'));
  esit(d.oturumId, 'S1', 'oturum kimligi');
  esit(d.tur, 1, 'tur sayisi');
  esit(d.taslak, 'yazdim ama gondermedim', 'gonderilmemis metin');
  esit(d.kuyruk.length, 1, 'kuyruk');
  esit(d.altAjanMesaji, 1, 'alt ajan sayimi');
});

ol('ozet gizli icerigi disarida birakir, gerekeni tasir', () => {
  const p = oturumProjesi();
  oturumCalistir('kaydet', 'sinav', '--proje', p, '--transkript', path.join(p, 'kaynak.jsonl'));
  const o = fs.readFileSync(path.join(p, '.claude', 'oturumlar', 'sinav', 'ozet.md'), 'utf8');
  icerir(o, 'ilk istek');
  icerir(o, 'ilk cevap');
  icerir(o, 'yazdim ama gondermedim');
  icerir(o, 'kuyrukta bekleyen is');
  if (o.includes('gizli not')) throw new Error('system-reminder ozete sizdi');
  if (o.includes('gizli dusunce')) throw new Error('dusunce blogu ozete sizdi');
  if (o.includes('alt ajan konusmasi')) throw new Error('alt ajan konusmasi ana akisa karisti');
});

ol('yukle kaydi sarmalayarak geri verir', () => {
  const p = oturumProjesi();
  oturumCalistir('kaydet', 'sinav', '--proje', p, '--transkript', path.join(p, 'kaynak.jsonl'));
  const r = oturumCalistir('yukle', '--proje', p);
  esit(r.kod, 0, 'yukle cikis kodu');
  icerir(r.out, '<<<KAYIT sinav>>>');
  icerir(r.out, '<<<KAYIT SONU>>>');
  icerir(r.out, 'ilk cevap');
  icerir(oturumCalistir('liste', '--proje', p).out, 'sinav');
});

ol('iki sohbetin kaydi birbirini ezmez', () => {
  const p = oturumProjesi();
  const kaynak = path.join(p, 'kaynak.jsonl');
  const ikinci = path.join(p, 'ikinci.jsonl');
  fs.writeFileSync(ikinci, fs.readFileSync(kaynak, 'utf8').replace(/"S1"/g, '"S2"'));

  esit(oturumCalistir('kaydet', 'ortak', '--proje', p, '--transkript', kaynak).kod, 0, 'ilk kayit');
  const carpisma = oturumCalistir('kaydet', 'ortak', '--proje', p, '--transkript', ikinci);
  esit(carpisma.kod, 1, 'baska oturumun kaydina yazmak reddedilmeli');
  icerir(carpisma.err, '--ustune');
  esit(
    JSON.parse(fs.readFileSync(path.join(p, '.claude', 'oturumlar', 'ortak', 'durum.json'), 'utf8'))
      .oturumId,
    'S1',
    'reddedilen kayit ilk sahibinde kalmali'
  );

  esit(
    oturumCalistir('kaydet', 'ortak', '--proje', p, '--transkript', kaynak).kod,
    0,
    'kendi kaydini tazeleyebilir'
  );
  const zorla = oturumCalistir('kaydet', 'ortak', '--proje', p, '--transkript', ikinci, '--ustune');
  esit(zorla.kod, 0, '--ustune ile yazilabilmeli');

  const son = JSON.parse(fs.readFileSync(path.join(p, '.claude', 'oturumlar', 'SON.json'), 'utf8'));
  esit(Object.keys(son.oturumlar).length, 2, 'her oturumun kendi isaretcisi olmali');
});

ol('adsiz kayit oturum kimligini tasir, yukle hepsini listeler', () => {
  const p = oturumProjesi();
  const kaynak = path.join(p, 'kaynak.jsonl');
  const ikinci = path.join(p, 'ikinci.jsonl');
  fs.writeFileSync(
    ikinci,
    fs
      .readFileSync(kaynak, 'utf8')
      .replace(/"S1"/g, '"S2"')
      .replace('ilk istek', 'oteki sohbetin istegi')
  );
  oturumCalistir('kaydet', '--proje', p, '--transkript', kaynak);
  oturumCalistir('kaydet', '--proje', p, '--transkript', ikinci);

  const klasor = fs
    .readdirSync(path.join(p, '.claude', 'oturumlar'))
    .filter((f) => fs.statSync(path.join(p, '.claude', 'oturumlar', f)).isDirectory());
  esit(klasor.length, 2, 'iki ayri klasor olmali');
  if (!klasor.every((f) => /-S[12]$/.test(f)))
    throw new Error('adsiz kayit oturum kimligi tasimali');

  const r = oturumCalistir('yukle', '--proje', p);
  icerir(r.out, '<<<KAYIT DİZİNİ · 2 kayıt>>>');
  icerir(r.out, 'oturum S2');
  if ((r.out.match(/<<<KAYIT SONU>>>/g) || []).length !== 1)
    throw new Error('argumansiz yukle tek govde acmali');

  const t = oturumCalistir('yukle', 'hepsi', '--proje', p);
  esit((t.out.match(/<<<KAYIT SONU>>>/g) || []).length, 2, 'hepsi iki govde acmali');
  icerir(t.out, 'oteki sohbetin istegi');
});

ol('olmayan kayit ve kacis denemesi reddedilir', () => {
  const p = oturumProjesi();
  esit(oturumCalistir('yukle', '--proje', p).kod, 1, 'kayitsiz yukle cikis kodu');
  oturumCalistir('kaydet', 'sinav', '--proje', p, '--transkript', path.join(p, 'kaynak.jsonl'));
  const yok = oturumCalistir('yukle', 'olmayan', '--proje', p);
  esit(yok.kod, 1, 'olmayan kayit cikis kodu');
  icerir(yok.err, 'bulunamad');
  oturumCalistir('kaydet', '../disari', '--proje', p, '--transkript', path.join(p, 'kaynak.jsonl'));
  if (fs.existsSync(path.join(p, '.claude', 'disari')))
    throw new Error('kayit adi kayit kokunun disina cikti');
});

const PREMIUM = path.join(KOK, 'scripts', 'premium.js');

function premiumKopya() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-premium-'));
  fs.mkdirSync(path.join(p, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(p, 'skills', 'relay'), { recursive: true });
  for (const f of fs.readdirSync(path.join(KOK, 'agents')))
    fs.copyFileSync(path.join(KOK, 'agents', f), path.join(p, 'agents', f));
  fs.copyFileSync(
    path.join(KOK, 'skills', 'relay', 'SETTINGS.md'),
    path.join(p, 'skills', 'relay', 'SETTINGS.md')
  );
  return { p, cfg: fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-premium-cfg-')) };
}

function premiumCalistir(komut, p, cfg) {
  const r = spawnSync(process.execPath, [PREMIUM, komut, '--kok', p], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

function ajanMetni(p) {
  return fs
    .readdirSync(path.join(p, 'agents'))
    .map((f) => fs.readFileSync(path.join(p, 'agents', f), 'utf8'))
    .join('\n');
}

ol('premium profili sonnet ve haiku bırakır, eforu yükseltir', () => {
  const { p, cfg } = premiumKopya();
  esit(premiumCalistir('ac', p, cfg).kod, 0, 'premium ac cikis kodu');
  const a = ajanMetni(p);
  if (/^model: (sonnet|haiku)$/m.test(a)) throw new Error('premium profilinde sonnet/haiku kaldı');
  esit((a.match(/^model: opus$/gm) || []).length, 5, 'bes ajan da opus olmali');
  if (!/^effort: xhigh$/m.test(a)) throw new Error('xhigh efor yok');
  if (!/^effort: low$/m.test(a)) throw new Error('scribe düşük eforda kalmalı');
  const s = fs.readFileSync(path.join(p, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  icerir(s, 'default_model      : opus');
  icerir(s, 'parallel_width     : 6');
  icerir(s, 'worktree_isolation : on');
  esit(JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8')).premium, true);
});

ol('premium kapatildiginda dosyalar bire bir geri doner', () => {
  const { p, cfg } = premiumKopya();
  const once =
    ajanMetni(p) + fs.readFileSync(path.join(p, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  premiumCalistir('ac', p, cfg);
  premiumCalistir('kapat', p, cfg);
  const sonra =
    ajanMetni(p) + fs.readFileSync(path.join(p, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  esit(sonra === once, true, 'kapat sonrasi dosyalar ayni olmali');
  esit(JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8')).premium, false);
  icerir(premiumCalistir('durum', p, cfg).out, 'standart');
});

ol('premium durumu konfig ile dosyalar ayrisinca uyusmazlik bildirir', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('ac', p, cfg);
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ premium: false }));
  icerir(premiumCalistir('durum', p, cfg).out, 'UYUŞMAZLIK');
});

ol('premium notu yalnizca acikken enjekte edilir', () => {
  const { p } = proje(1, 0);
  const kapali = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-pcfg0-'));
  const acik = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-pcfg1-'));
  fs.writeFileSync(path.join(kapali, 'teknesyum.json'), JSON.stringify({ dil: 'tr' }));
  fs.writeFileSync(path.join(acik, 'teknesyum.json'), JSON.stringify({ dil: 'tr', premium: true }));
  const iste = (cfg) =>
    calistir(
      IZLE,
      { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'yeni bir modül yaz' },
      { CLAUDE_CONFIG_DIR: cfg }
    ).out;
  if (iste(kapali).includes('Premium mod'))
    throw new Error('premium kapaliyken not enjekte edildi');
  icerir(iste(acik), 'Premium mod açık');
});

const RC = path.join(KOK, 'scripts', 'rc.js');

function rcCalistir(arg, ek) {
  return spawnSync(process.execPath, [RC].concat(arg), {
    encoding: 'utf8',
    env: { ...process.env, TEKNESYUM_DIL: 'tr', ...(ek || {}) },
  });
}

function rcEv() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-rcev-'));
  return { USERPROFILE: d, HOME: d };
}

ol('rc metin kipinde pencere acmaz, komutu basar', () => {
  const r = rcCalistir(['--metin', '--ad', 'DenemeProje'], rcEv());
  esit(r.status, 0, 'metin kipi calismali');
  icerir(r.stdout, 'remote-control --name');
  icerir(r.stdout, 'DenemeProje');
  icerir(r.stdout, '--spawn same-dir');
});

ol('rc acilis sorularini kapatir, gelismis kip geri acar', () => {
  const { komutSatiri } = require(RC);
  esit(
    komutSatiri('claude', 'A', ['--spawn', 'same-dir']),
    '"claude" remote-control --name "A" --spawn same-dir'
  );
  const evDizin = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-rcev-'));
  const ayar = path.join(evDizin, '.claude.json');
  const anahtar = process.cwd().replace(/\\/g, '/');
  fs.writeFileSync(ayar, JSON.stringify({ projects: {} }));
  rcCalistir(['--metin', '--ad', 'A'], { USERPROFILE: evDizin, HOME: evDizin });
  let j = JSON.parse(fs.readFileSync(ayar, 'utf8'));
  esit(j.remoteDialogSeen, true, 'evet hayir sorusu kapatilmali');
  esit(j.projects[anahtar].remoteControlSpawnMode, 'same-dir', 'kip sorusu kapatilmali');
  const g = rcCalistir(['--gelismis', '--metin', '--ad', 'A'], {
    USERPROFILE: evDizin,
    HOME: evDizin,
  });
  j = JSON.parse(fs.readFileSync(ayar, 'utf8'));
  esit(j.projects[anahtar].remoteControlSpawnMode, undefined, 'gelismis kipte soru geri gelmeli');
  esit(/--spawn/.test(g.stdout), false, 'gelismis kipte kip dayatilmamali');
});

ol('rcall arsivlenmis ve tamamlanmis klasorleri disarida birakir', () => {
  const { elenir, projeler } = require(RC);
  esit(elenir('!Arşivlendi', []), true, 'unlem ile baslayan elenmeli');
  esit(elenir('.claude', []), true, 'nokta ile baslayan elenmeli');
  esit(elenir('Runly', []), false, 'proje elenmemeli');
  esit(elenir('Runly', ['runly']), true, 'atla listesi calismali');
  const dip = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-rcall-'));
  for (const ad of ['Alfa', 'Beta', '!Tamamlandı', '_eski']) {
    fs.mkdirSync(path.join(dip, ad, '.git'), { recursive: true });
  }
  fs.mkdirSync(path.join(dip, 'DosyaYok'));
  const { alinan, elenen } = projeler(dip);
  esit(
    alinan.map((x) => x.ad).join(','),
    'Alfa,Beta',
    'yalniz gercek ve arsivlenmemis projeler alinmali'
  );
  esit(elenen.length, 2, 'elenen klasorler sayilmali');
});

ol('rcall metin kipinde her proje icin komut basar', () => {
  const dip = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-rcall2-'));
  fs.mkdirSync(path.join(dip, 'Gama', '.git'), { recursive: true });
  const r = rcCalistir(['--hepsi', '--metin', '--kok', dip], rcEv());
  esit(r.status, 0, 'metin kipi calismali');
  icerir(r.stdout, 'Gama');
  icerir(r.stdout, 'remote-control --name');
});

ol('rcall proje bulamazsa kod 6 verir', () => {
  const dip = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-rcall3-'));
  const r = rcCalistir(['--hepsi', '--metin', '--kok', dip], rcEv());
  esit(r.status, 6, 'bos klasorde cikis kodu 6');
});

ol('rc istemci yoksa kurulum satirini verir', () => {
  const bos = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-rc-bos-'));
  const r = rcCalistir(['--metin', '--ad', 'X'], {
    PATH: bos,
    Path: bos,
    USERPROFILE: bos,
    HOME: bos,
  });
  esit(r.status, 3, 'istemci yoksa cikis kodu 3');
  icerir(r.stdout, 'install');
  icerir(r.stdout, '/rc kur');
});

ol('rc surum esigini bilir', () => {
  const { eski, EN_AZ } = require(RC);
  esit(eski([2, 1, 100]), true, 'esik alti eski sayilmali');
  esit(eski(EN_AZ), false, 'esik surumu eski degil');
  esit(eski([2, 2, 0]), false, 'ust surum eski degil');
  esit(eski(null), false, 'okunamayan surum engel degil');
});

ol('rc komutu betigi cagirir ve pencere acmayi kendine birakmaz', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'rc.md'), 'utf8');
  icerir(k, 'scripts/rc.js');
  icerir(k, '--kur');
  esit(/--metin|kaydetme/.test(k), false, 'rc yuzeyi sade kalmali');
  esit(/pencere açmaya/.test(k) || /pencere açma/.test(k), true, 'model pencere acmamali');
  const g = fs.readFileSync(path.join(KOK, 'commands', 'rcadvanced.md'), 'utf8');
  icerir(g, '--gelismis');
  icerir(g, '--kaydetme');
  const h = fs.readFileSync(path.join(KOK, 'commands', 'rcall.md'), 'utf8');
  icerir(h, '--hepsi');
  icerir(h, 'rcAtla');
});

ol('kayit baska klasorde acilan oturumun transkriptini bulur', () => {
  const p = oturumProjesi();
  const evDizin = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ev-'));
  const baska = path.join(evDizin, '.claude', 'projects', 'C--baska-klasor');
  fs.mkdirSync(baska, { recursive: true });
  fs.copyFileSync(path.join(p, 'kaynak.jsonl'), path.join(baska, 'S1.jsonl'));
  const r = spawnSync(process.execPath, [OTURUM, 'kaydet', 'uzak', '--proje', p], {
    encoding: 'utf8',
    env: { ...process.env, USERPROFILE: evDizin, HOME: evDizin, CLAUDE_CODE_SESSION_ID: 'S1' },
  });
  esit(r.status, 0, 'baska klasordeki transkript bulunmali');
  const durum = path.join(p, '.claude', 'oturumlar', 'uzak', 'durum.json');
  esit(fs.existsSync(durum), true, 'kayit yazilmali');
  esit(JSON.parse(fs.readFileSync(durum, 'utf8')).oturumId, 'S1', 'dogru oturum');
});

function filoKur() {
  const dip = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-filo-'));
  const evDizin = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ev-'));
  const kaynak = oturumProjesi();
  for (const ad of ['Alfa', 'Beta']) {
    const p = path.join(dip, ad);
    fs.mkdirSync(path.join(p, '.git'), { recursive: true });
    const t = path.join(evDizin, '.claude', 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
    fs.mkdirSync(t, { recursive: true });
    fs.copyFileSync(path.join(kaynak, 'kaynak.jsonl'), path.join(t, ad + '-1.jsonl'));
  }
  fs.mkdirSync(path.join(dip, '!Tamamlandı', '.git'), { recursive: true });
  const c = path.join(dip, 'Alfa', '.claude', 'relay', 'contracts');
  fs.mkdirSync(path.join(c, 'done'), { recursive: true });
  fs.writeFileSync(path.join(c, 'T1.md'), 'status: submitted\n');
  fs.writeFileSync(path.join(c, 'done', 'T0.md'), 'status: done\n');
  return { dip, evDizin };
}

ol('loadall butun projelerin durumunu tek ekranda verir', () => {
  const { dip, evDizin } = filoKur();
  const r = spawnSync(process.execPath, [OTURUM, 'toplu-yukle', '--kok', dip], {
    encoding: 'utf8',
    env: { ...process.env, USERPROFILE: evDizin, HOME: evDizin, TEKNESYUM_DIL: 'tr' },
  });
  esit(r.status, 0, 'filo durumu calismali');
  icerir(r.stdout, 'FİLO DURUMU · 2 proje');
  icerir(r.stdout, '## Alfa');
  icerir(r.stdout, '## Beta');
  icerir(r.stdout, 'submitted: T1');
  icerir(r.stdout, '1 açık / 1 bitti');
  icerir(r.stdout, 'Dışarıda kalan klasörler: !Tamamlandı');
  icerir(r.stdout, '- Klasör: `' + path.join(dip, 'Alfa') + '`');
  icerir(r.stdout, 'Alfa projesinde kaldığımız yerden devam ediyoruz.');
  icerir(r.stdout, 'Kayıt yok, önceki oturumu transkriptten devral: /load son');
  icerir(r.stdout, 'T1 submitted');
  icerir(r.stdout, 'Denetim bekleyenden başla.');
  esit((r.stdout.match(/Devam promptu:/g) || []).length, 2, 'her proje kendi promptunu almali');
});

ol('saveall her projeyi kendi klasorune kaydeder ve depoya sizdirmaz', () => {
  const { dip, evDizin } = filoKur();
  const r = spawnSync(process.execPath, [OTURUM, 'toplu-kaydet', '--kok', dip], {
    encoding: 'utf8',
    env: { ...process.env, USERPROFILE: evDizin, HOME: evDizin, TEKNESYUM_DIL: 'tr' },
  });
  esit(r.status, 0, 'toplu kayit calismali');
  icerir(r.stdout, '2/2 proje kaydedildi');
  for (const ad of ['Alfa', 'Beta']) {
    const dizin = path.join(dip, ad, '.claude', 'oturumlar');
    const kayit = fs
      .readdirSync(dizin, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    esit(kayit.length, 1, ad + ' icin bir kayit olmali');
    esit(fs.existsSync(path.join(dizin, kayit[0], 'ozet.md')), true, 'ozet yazilmali');
    esit(fs.readFileSync(path.join(dizin, '.gitignore'), 'utf8').trim(), '*', 'kayit git disi');
  }
});

ol('load son kayit olmadan onceki oturumu transkriptten devralir', () => {
  const p = oturumProjesi();
  const evDizin = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ev-'));
  const dizin = path.join(evDizin, '.claude', 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
  fs.mkdirSync(dizin, { recursive: true });
  fs.copyFileSync(path.join(p, 'kaynak.jsonl'), path.join(dizin, 'ONCEKI.jsonl'));
  const ort = { ...process.env, USERPROFILE: evDizin, HOME: evDizin, TEKNESYUM_DIL: 'tr' };
  const r = spawnSync(process.execPath, [OTURUM, 'yukle', 'son', '--proje', p], {
    encoding: 'utf8',
    env: { ...ort, CLAUDE_CODE_SESSION_ID: 'BASKA' },
  });
  esit(r.status, 0, 'kayit olmadan devralinmali');
  icerir(r.stdout, 'ÖNCEKİ OTURUM');
  icerir(r.stdout, 'ONCEKI');
  // Argümansız /load da kayıt yokken aynı yere düşer.
  const b = spawnSync(process.execPath, [OTURUM, 'yukle', '--proje', p], {
    encoding: 'utf8',
    env: { ...ort, CLAUDE_CODE_SESSION_ID: 'BASKA' },
  });
  esit(b.status, 0, 'kayitsiz /load transkripte dusmeli');
  icerir(b.stdout, 'ÖNCEKİ OTURUM');
  // Devralınacak oturum bu oturumun kendisiyse geri dönülecek bir şey yoktur.
  const c = spawnSync(process.execPath, [OTURUM, 'yukle', 'son', '--proje', p], {
    encoding: 'utf8',
    env: { ...ort, CLAUDE_CODE_SESSION_ID: 'ONCEKI' },
  });
  esit(c.status, 1, 'kendi transkripti devralinmamali');
});

ol('acilis acik sozlesme varken onceki oturumu haber verir', () => {
  const { p } = proje(2, 1);
  const evDizin = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ev-'));
  const dizin = path.join(evDizin, '.claude', 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
  fs.mkdirSync(dizin, { recursive: true });
  fs.writeFileSync(path.join(dizin, 'ESKI.jsonl'), '{}\n');
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'SessionStart', session_id: 'YENI' },
    { CLAUDE_CONFIG_DIR: konfig(true), USERPROFILE: evDizin, HOME: evDizin }
  );
  icerir(JSON.parse(r.out).systemMessage, '/load son');
});

const KAPSAYICI = path.join(KOK, 'hooks', 'kapsayici.js');

function kapsayiciKur() {
  const dip = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kap-'));
  fs.mkdirSync(path.join(dip, 'Alfa', '.git'), { recursive: true });
  fs.mkdirSync(path.join(dip, 'Beta', '.git'), { recursive: true });
  fs.mkdirSync(path.join(dip, 'Alfa', 'src'), { recursive: true });
  return dip;
}

ol('kapsayici klasor taninir, projenin kendisi tanınmaz', () => {
  const { kok } = require(KAPSAYICI);
  const dip = kapsayiciKur();
  esit(kok(dip), path.resolve(dip), 'ust klasor kapsayici sayilmali');
  esit(kok(path.join(dip, 'Alfa')), null, 'proje kapsayici sayilmamali');
  esit(kok(fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'))), null, 'bos klasor degil');
});

ol('dokunulan dosya etkin projeyi belirler', () => {
  const { izle, etkin } = require(KAPSAYICI);
  const dip = kapsayiciKur();
  const durum = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-dur-')), 'k.json');
  izle(dip, durum, { tool_input: { file_path: path.join(dip, 'Alfa', 'src', 'a.js') } });
  esit(etkin(durum).ad, 'Alfa', 'ilk proje secilmeli');
  izle(dip, durum, { tool_input: { file_path: path.join(dip, 'Beta', 'b.js') } });
  esit(etkin(durum).ad, 'Beta', 'son dokunulan proje etkin olmali');
  izle(dip, durum, { tool_input: { file_path: path.join(os.tmpdir(), 'disarida.js') } });
  esit(etkin(durum).ad, 'Beta', 'kapsayici disi yol etkini degistirmemeli');
});

ol('ust klasorde biriken ajan hafizasi projeye tasinir, dizin birlestirilir', () => {
  const { tasi } = require(KAPSAYICI);
  const dip = kapsayiciKur();
  const kaynak = path.join(dip, '.claude', 'agent-memory', 'teknesyum-builder');
  const varis = path.join(dip, 'Alfa', '.claude', 'agent-memory', 'teknesyum-builder');
  fs.mkdirSync(kaynak, { recursive: true });
  fs.mkdirSync(varis, { recursive: true });
  fs.writeFileSync(path.join(kaynak, 'MEMORY.md'), '- [Yeni](yeni.md) — yeni bilgi\n');
  fs.writeFileSync(path.join(kaynak, 'yeni.md'), 'govde\n');
  fs.writeFileSync(path.join(varis, 'MEMORY.md'), '- [Eski](eski.md) — eski bilgi\n');
  const n = tasi(dip, path.join(dip, 'Alfa'));
  esit(n, 2, 'iki dosya tasinmali');
  esit(fs.existsSync(path.join(varis, 'yeni.md')), true, 'govde tasinmali');
  const dizin = fs.readFileSync(path.join(varis, 'MEMORY.md'), 'utf8');
  icerir(dizin, 'eski.md');
  icerir(dizin, 'yeni.md');
  esit(fs.existsSync(path.join(dip, '.claude')), false, 'bosalan ust klasor silinmeli');
});

ol('kanca ust klasorde acilan oturumda projeyi izler ve tur sonunda tasir', () => {
  const dip = kapsayiciKur();
  const cfg = konfig(true);
  const oturum = { cwd: dip, session_id: 'kap-1', transcript_path: '/x/kap-1.jsonl' };
  const a = calistir(
    IZLE,
    { ...oturum, hook_event_name: 'SessionStart' },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  icerir(JSON.parse(a.out).systemMessage, 'üst klasör');
  calistir(
    IZLE,
    {
      ...oturum,
      hook_event_name: 'PostToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: path.join(dip, 'Alfa', 'src', 'a.js') },
    },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  const b = calistir(
    IZLE,
    { ...oturum, hook_event_name: 'UserPromptSubmit', prompt: 'devam' },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  icerir(JSON.parse(b.out).hookSpecificOutput.additionalContext, 'Alfa');
  const kaynak = path.join(dip, '.claude', 'agent-memory', 'teknesyum-builder');
  fs.mkdirSync(kaynak, { recursive: true });
  fs.writeFileSync(path.join(kaynak, 'not.md'), 'x\n');
  calistir(IZLE, { ...oturum, hook_event_name: 'Stop' }, { CLAUDE_CONFIG_DIR: cfg });
  esit(
    fs.existsSync(path.join(dip, 'Alfa', '.claude', 'agent-memory', 'teknesyum-builder', 'not.md')),
    true,
    'hafiza projeye tasinmali'
  );
});

console.log(
  '\n' + (kaldi.length ? '⨯ KALDI' : '✓ GEÇTİ') + '  ' + gecti + '/' + (gecti + kaldi.length)
);
if (kaldi.length) {
  for (const k of kaldi) console.log('   - ' + k);
  process.exit(1);
}
