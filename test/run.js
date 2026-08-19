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

ol('komut kümesi beş komut ve eski adlar hiçbir yerde geçmiyor', () => {
  const v = fs
    .readdirSync(path.join(KOK, 'commands'))
    .filter((f) => f.endsWith('.md'))
    .sort();
  esit(v.join(','), 'help.md,report.md,rule.md,setup.md,uisetup.md');
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
  icerir(o.hookSpecificOutput.additionalContext, 'ölçü:');
  icerir(o.hookSpecificOutput.additionalContext, 'ajan gerekmedi');
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
  if (r.includes('fark ·')) throw new Error('seviye 1 fark satırı istemiyor: ' + r);
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
  icerir(r, 'fark ·');
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

console.log(
  '\n' + (kaldi.length ? '⨯ KALDI' : '✓ GEÇTİ') + '  ' + gecti + '/' + (gecti + kaldi.length)
);
if (kaldi.length) {
  for (const k of kaldi) console.log('   - ' + k);
  process.exit(1);
}
