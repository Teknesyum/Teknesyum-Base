const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const KOK = path.join(__dirname, '..', 'teknesyum');
const IZLE = path.join(KOK, 'hooks', 'relay-watch.js');
const KORU = path.join(KOK, 'hooks', 'contract-guard.js');
const DURUM = path.join(KOK, 'scripts', 'statusline.js');
const OTURUM = path.join(KOK, 'scripts', 'oturum.js');
const DIL = path.join(KOK, 'hooks', 'dil.js');

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
function icermez(s, p, not) {
  if (String(s).includes(p))
    throw new Error((not ? not + ': ' : '') + '"' + p + '" beklenmiyordu — gelen: ' + s);
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
      CLAUDE_CODE_SESSION_ID: '',
      CLAUDE_CODE_HOST_SESSION_ID: '',
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
    'ekran.md,help.md,load.md,loadall.md,premium.md,rc.md,rcadvanced.md,rcall.md,report.md,rule.md,save.md,saveall.md,scan.md,setup.md,uicheckup.md,uisetup.md,update.md'
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
  // ÖLÇÜLDÜ (22.08.2026): tarama raporları başka projelerin komut adlarını taşıyor —
  // `docs/taramalar/` altındaki bir rapor yabancı bir `/durum` komutundan söz edince
  // test bunu bizim eski adımız sandı. Kapsam kendi yüzeyimizle sınırlı.
  const YABANCI = (f) => f.replace(/\\/g, '/').includes('/docs/taramalar/');
  for (const f of yuru(path.join(__dirname, '..'))) {
    if (!/\.(md|js|json|tsx)$/.test(f) || f === __filename) continue;
    if (YABANCI(f)) continue;
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

ol('denetçi tanımında yazma veya çalıştırma aracı yok (tek başına garanti değil)', () => {
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
  icerir(o.hookSpecificOutput.additionalContext, 'Ölçüm ▸');
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

ol('kullanicidan is isteyen tur baslik olmadan kapanamaz', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-senden-'));
  const dur = (m) =>
    calistir(
      IZLE,
      { ...ort(p), hook_event_name: 'Stop', transcript_path: transcript(m) },
      konfig(true)
    ).out;

  const engel = JSON.parse(dur("Bitti. Claude Code'u yeniden başlat, profil o zaman yüklenir."));
  esit(engel.decision, 'block', 'istek var, başlık yok');
  icerir(engel.reason, 'Senden istediklerim');

  esit(
    dur("Bitti. Claude Code'u yeniden başlat.\n\n## Senden istediklerim\n\n1. Yeniden başlat."),
    '',
    'başlık varsa geçer'
  );
  esit(dur('İki dosya değişti, testler geçti.'), '', 'istek yoksa geçer');
  esit(dur('Sen bu işi nasıl yapardın diye düşündüm.'), '', 'dar kalıp: anlatı yakalanmaz');
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
  icerir(m, 'Görev ▸ ');
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
  icerir(JSON.parse(calistir(IZLE, yuk).out).systemMessage, ', 2 ajan çalışıyor');
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
  icerir(a.out, 'Görev ▸ ');
  icerir(b.out, ', 2 ajan çalışıyor');
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
  for (const a of ['advisor', 'auditor', 'builder', 'scout', 'scribe', 'ui-builder']) {
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
    'mv .claude/relay/contracts/T999.md .claude/relay/contracts/done/T999.md',
    'Move-Item .claude\\relay\\contracts\\T999.md .claude\\relay\\contracts\\done\\',
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

// `--separate-git-dir` kurulumunda `--git-common-dir` çıktısı `.git` ile bitmez. Koşulsuz
// bir üst dizine çıkan sürüm burada deponun rastgele komşusunu röle kökü sanıyordu,
// koşullu kırpan sürüm hiçbir şey bulmuyordu: iki kanca iki ayrı köke varıyordu. `kap`
// bilerek kurulmuş tuzak — depoyla ilgisi yok, kimse oraya sahip çıkmamalı.
function ayriGitDizini() {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ayrigit-'));
  const kap = path.join(p, 'kap');
  const depo = path.join(p, 'depo');
  const store = path.join(kap, 'store');
  fs.mkdirSync(depo, { recursive: true });
  fs.mkdirSync(path.join(kap, '.claude', 'relay', 'contracts'), { recursive: true });
  spawnSync('git', ['init', '--separate-git-dir=' + store, depo], { encoding: 'utf8' });
  return { depo, kap, store };
}

function ortakOku(cwd, ifade) {
  const r = spawnSync(
    process.execPath,
    [
      '-e',
      'const o=require(' +
        JSON.stringify(path.join(KOK, 'hooks', 'ortak.js')) +
        ');process.stdout.write(String(' +
        ifade +
        '))',
    ],
    { cwd, encoding: 'utf8' }
  );
  return ((r.stdout || '') + (r.stderr || '')).trim();
}

ol('git ortak dizini `.git` ile bitmiyorsa bir üst dizine kaçılmaz', () => {
  const { depo, store } = ayriGitDizini();
  esit(
    path.basename(ortakOku(depo, '(o.gitSor(process.cwd())||{}).common')),
    path.basename(store),
    'ortak dizin bir üst dizine kaydırılmamalı'
  );
  esit(
    ortakOku(depo, 'o.roleKoku(process.cwd()) === null'),
    'true',
    'deponun komşusundaki röle sahiplenilmemeli'
  );
});

ol('iki kanca da git kökünü ortak tabandan sorar', () => {
  for (const f of ['relay-watch.js', 'contract-guard.js']) {
    const govde = fs.readFileSync(path.join(KOK, 'hooks', f), 'utf8');
    if (govde.includes('git-common-dir')) throw new Error(f + ' git kökünü kendi hesaplıyor');
    icerir(govde, "require('./ortak.js')", f + ' ortak tabana bağlanmalı');
  }
});

ol("worktree cwd'sinde iki kanca aynı röle kökünü görür", () => {
  const { wt, relay } = worktreeProje();
  // Windows 8.3 kısa adı: `os.tmpdir()` `ADMINI~1` döner, git uzun adı. Aynı dizin.
  esit(
    ortakOku(wt, 'require("fs").realpathSync.native(o.roleKoku(process.cwd()).relay)'),
    fs.realpathSync.native(relay),
    'ortak taban ana depoyu bulmalı'
  );
  const izleme = calistir(IZLE, {
    ...ort(wt),
    hook_event_name: 'PostToolUse',
    agent_id: 'a1',
    agent_type: 'builder',
    tool_input: { file_path: path.join(relay, 'contracts', 'T1.md') },
  });
  esit(izleme.kod, 0, "izleyici worktree'den röleyi bulmalı");
  const koruma = calistir(KORU, {
    cwd: wt,
    tool_name: 'Write',
    tool_input: {
      file_path: path.join(relay, 'contracts', 'T1.md'),
      content: '---\nstatus: open\n---\n',
    },
  });
  esit(koruma.kod, 2, 'kanca aynı kökteki sözleşmeyi korumalı');
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

function profilCfg(profil) {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-profil-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ dil: 'tr', profil }));
  return { CLAUDE_CONFIG_DIR: cfg, TEKNESYUM_PREMIUM: '' };
}

function ilkSozlesmeProfilde(p, profil) {
  return calistir(
    KORU,
    {
      tool_name: 'Write',
      tool_input: {
        file_path: path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
        content: '---\nname: T1\nstatus: open\n---\n',
      },
    },
    profilCfg(profil)
  );
}

const sorunSatirlari = (p) => {
  try {
    return fs.readFileSync(path.join(p, '.claude', 'relay', 'live', '_sorun.log'), 'utf8');
  } catch {
    return '';
  }
};

ol('eco profilinde on arastirma kapisi engellemez, uyarir', () => {
  const p = taptazeProje(null);
  const r = ilkSozlesmeProfilde(p, 'eco');
  esit(r.kod, 0, 'eco kapiyi engellememeli');
  esit(r.err, '', 'eco engel mesaji yazmamali');
  icerir(r.out, 'UYARI');
  icerir(r.out, 'docs/taramalar/ATLANDI.md');
  icerir(r.out, 'sessizce atlamak değil');
});

ol('eco atlamasi _sorun.log dosyasina kalici iz birakir', () => {
  const p = taptazeProje(null);
  ilkSozlesmeProfilde(p, 'eco');
  const log = sorunSatirlari(p);
  icerir(log, 'eco ön araştırma atlandı');
  icerir(log, '.claude/relay/contracts/T1.md');
});

ol('normal ve premium profilde on arastirma kapisi hala engeller', () => {
  for (const profil of ['normal', 'premium']) {
    const r = ilkSozlesmeProfilde(taptazeProje(null), profil);
    esit(r.kod, 2, profil + ' engellemeli');
    icerir(r.err, 'ön araştırma');
    esit(r.out, '', profil + ' uyari basmamali');
  }
});

ol('eco uyarisi yalnizca kapinin durdugu yerde cikar', () => {
  const r = ilkSozlesmeProfilde(taptazeProje('ATLANDI.md'), 'eco');
  esit(r.kod, 0);
  esit(r.out, '', 'gerekce dosyasi varken uyari da cikmaz');
});

ol('research_repos eco profilinde 1 depoya iner', () => {
  const s = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  const satir = (s.match(/^\| `research_repos` \|.*$/m) || [])[0] || '';
  esit(satir.split('|')[2].trim(), '1', 'profil tablosunda eco sutunu');
  icerir(s.replace(/\s+/g, ' '), 'eco profilinde 1, normal profilde 10, premium profilde 50');
});

ol('SKILL eco bolumunu ve tersine donen ilke sirasini anlatir', () => {
  const s = fs
    .readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8')
    .replace(/\r/g, '');
  const duz = s.replace(/\s+/g, ' ');
  icerir(s, '## 0.1 Üç profil');
  icerir(duz, 'token tasarrufu > kullanıcı rahatlığı > kod verimliliği');
  for (const madde of ['Grep önce, oku sonra', '`Explore` açma', 'Tek ajan varsayılan'])
    icerir(duz, madde, 'eco T0 davranisi');
  icerir(duz, "`critical`'e düşer ama daha aşağı inmez; `critical` alt sınırdır");
  icerir(duz, "**eco'da kapı engellemez, uyarır.**");
  const i = duz.indexOf("**eco'da değişmeyenler.**");
  if (i < 0) throw new Error('eco degismeyenler basligi yok');
  const blok = duz.slice(i, i + 700);
  for (const kalan of ['Mühür kapısı', '`owns` disiplini', 'Kabul kriteri'])
    icerir(blok, kalan, 'eco degismeyenler listesi');
});

ol('eco sablon kisaltmasi kabul kriterini ve owns alanini dusurmez', () => {
  const t = fs
    .readFileSync(path.join(KOK, 'skills', 'relay', 'assets', 'contract.template.md'), 'utf8')
    .replace(/\r/g, '');
  const i = t.indexOf('eco profilinde bu şablon kısalır');
  if (i < 0) throw new Error('sablonda eco kurali yok');
  const asla = t.slice(t.indexOf('Asla düşmeyenler:', i), t.indexOf("eco'da düşenler:", i));
  for (const kalan of ['`owns`', '## Kabul kriteri', '## Kayıt noktası', 'mühür alanları'])
    icerir(asla, kalan, 'asla dusmeyenler');
  const dusen = t.slice(t.indexOf("eco'da düşenler:", i));
  for (const yasak of ['owns', 'Kabul kriteri'])
    if (dusen.includes(yasak)) throw new Error('eco dusenler listesine ' + yasak + ' karismis');
  for (const bas of ['## Kabul kriteri', '## Kayıt noktası', '## Çıktı', 'owns: []'])
    icerir(t, bas, 'sablon govdesi');
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

ol('Edit ile CLAUDE.md govdesi engellenir, isaretci duzenlemesi serbest', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-agents-edit-'));
  fs.mkdirSync(path.join(p, 'src'), { recursive: true });
  fs.mkdirSync(path.join(p, '.claude'), { recursive: true });
  const duzenle = (dosya, eski, yeni) =>
    calistir(KORU, {
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: dosya, old_string: eski, new_string: yeni },
    });
  const isaretci = path.join(p, 'src', 'CLAUDE.md');
  fs.writeFileSync(isaretci, '@AGENTS.md\n');
  const govdeli = duzenle(isaretci, '@AGENTS.md', '@AGENTS.md\n\n# src\n\nBurada arayuz durur.');
  esit(govdeli.kod, 2, 'Edit ile eklenen govde engellenmeli');
  icerir(govdeli.err, 'AGENTS.md');
  esit(duzenle(isaretci, '@AGENTS.md', '@KURALLAR.md').kod, 0, 'isaretci duzenlemesi serbest');
  const ev = path.join(p, '.claude', 'CLAUDE.md');
  fs.writeFileSync(ev, '# kisisel\n');
  esit(duzenle(ev, '# kisisel', '# kisisel\n\nUzun govde.').kod, 0, '.claude/CLAUDE.md disarida');
  esit(
    duzenle(path.join(p, 'src', 'AGENTS.md'), 'x', '# src\n\nBurada arayuz durur.').kod,
    0,
    'Edit ile AGENTS.md serbest'
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

// ÖLÇÜLDÜ (22.08.2026): bu yardımcı makinenin gerçek `teknesyum.json` dosyasını
// okuyordu. Geliştirici profili eco'ya alınca `/save` gzip'e geçti ve `ham.jsonl`
// bekleyen test düştü — kusur kayıtta değil testteydi. Koşu kendi konfig kökünü kurar.
function oturumCalistir(...ek) {
  const r = spawnSync(process.execPath, [OTURUM, ...ek], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: BOS_CFG },
  });
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

ol('argumansiz yukle cagiran oturumun kaydini acar', () => {
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

  const isaretli = (out) => out.split('\n').find((s) => s.startsWith('▸ ')) || '';
  const sonYolu = path.join(p, '.claude', 'oturumlar', 'SON.json');
  const onceki = process.env.CLAUDE_CODE_SESSION_ID;
  try {
    process.env.CLAUDE_CODE_SESSION_ID = 'S1';
    const kendi = oturumCalistir('yukle', '--proje', p);
    esit(kendi.kod, 0, 'yukle cikis kodu');
    icerir(isaretli(kendi.out), 'oturum S1');
    icerir(kendi.out, 'ilk istek');
    if (kendi.out.includes('oteki sohbetin istegi'))
      throw new Error('cagiran oturum otekinin kaydini acti');

    process.env.CLAUDE_CODE_SESSION_ID = 'YOK';
    const dusen = oturumCalistir('yukle', '--proje', p);
    esit(dusen.kod, 0, 'bilinmeyen kimlikte de acilmali');
    icerir(isaretli(dusen.out), 'oturum S2');
    icerir(dusen.out, 'oteki sohbetin istegi');

    process.env.CLAUDE_CODE_SESSION_ID = 'S1';
    fs.writeFileSync(sonYolu, '{bozuk', 'utf8');
    esit(oturumCalistir('yukle', '--proje', p).kod, 0, 'bozuk SON.json cokertmemeli');
    fs.writeFileSync(sonYolu, JSON.stringify({ son: 'eski-bicim' }) + '\n', 'utf8');
    const eski = oturumCalistir('yukle', '--proje', p);
    esit(eski.kod, 0, 'eski bicimli SON.json cokertmemeli');
    icerir(isaretli(eski.out), 'oturum S2');
  } finally {
    if (onceki === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
    else process.env.CLAUDE_CODE_SESSION_ID = onceki;
  }
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

function premiumCalistir(komut, p, cfg, ek) {
  const r = spawnSync(process.execPath, [PREMIUM, komut, '--kok', p], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: cfg,
      CLAUDE_CODE_SESSION_ID: '',
      CLAUDE_CODE_HOST_SESSION_ID: '',
      TEKNESYUM_DIL: 'tr',
      TEKNESYUM_PREMIUM: '',
      ...(ek || {}),
    },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

function ajanMetni(p) {
  return fs
    .readdirSync(path.join(p, 'agents'))
    .map((f) => fs.readFileSync(path.join(p, 'agents', f), 'utf8'))
    .join('\n');
}

const premiumTablo = require(PREMIUM);

function ayarMetni(p) {
  return fs.readFileSync(path.join(p, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
}

ol('premium profili sonnet ve haiku birakir, opus ve fable secer', () => {
  const { p, cfg } = premiumKopya();
  esit(premiumCalistir('premium', p, cfg).kod, 0, 'premium cikis kodu');
  const model = Object.keys(premiumTablo.PROFIL.premium).map(
    (a) => premiumTablo.PROFIL.premium[a].model
  );
  if (model.some((m) => m === 'sonnet' || m === 'haiku'))
    throw new Error('premium profilinde sonnet/haiku kaldı');
  esit(model.filter((m) => m === 'opus').length, 6, 'alti calisan ajan da opus olmali');
  esit(model.filter((m) => m === 'fable').length, 1, 'advisor fable kalmali');
  const out = premiumCalistir('premium', p, cfg).out;
  icerir(out, 'default_model opus');
  icerir(out, 'parallel_width 20');
  icerir(out, 'worktree_isolation on');
  const c = JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8'));
  esit(c.profil, 'premium');
  esit(c.premium, true);
});

// Kabul kriteri 1. Profil değiştirmek eskiden yedi ajan dosyasını ve `SETTINGS.md`'yi
// yeniden yazıyordu: depo içinden koşan her `/premium` çalışma ağacını kirletiyordu.
ol('hicbir profil ajan dosyasina ve SETTINGS.md ye yazmaz', () => {
  const { p, cfg } = premiumKopya();
  const once = ajanMetni(p) + ayarMetni(p);
  for (const ad of ['eco', 'normal', 'premium', 'ac', 'kapat', 'durum']) {
    esit(premiumCalistir(ad, p, cfg).kod, 0, ad + ' cikis kodu');
    esit(ajanMetni(p) + ayarMetni(p), once, ad + ' dosya yazdi');
  }
});

// Kabul kriteri 6. `model` alanı hiç yoksa çağrı parametresini ezme ihtimali de yok;
// `effort` ve `maxTurns` taban profilde donar, çağrı anında geçilemedikleri için.
ol('ajan dosyalarinda model alani yok, efor ve tur normal tabaninda', () => {
  const taban = premiumTablo.PROFIL[premiumTablo.TABAN];
  esit(premiumTablo.TABAN, 'normal', 'taban normal olmali');
  for (const ad of Object.keys(taban)) {
    const m = fs.readFileSync(path.join(KOK, 'agents', ad + '.md'), 'utf8').replace(/\r/g, '');
    const on = m.slice(0, m.indexOf('\n---', 4));
    if (/^model:/m.test(on)) throw new Error(ad + ' hâlâ model alanı taşıyor');
    esit((on.match(/^effort:[ \t]*(.+)$/m) || [])[1], taban[ad].effort, ad + ' eforu');
    esit((on.match(/^maxTurns:[ \t]*(.+)$/m) || [])[1], String(taban[ad].maxTurns), ad + ' turu');
  }
  const s = ayarMetni(KOK);
  icerir(s, 'makine varsayılanıdır');
  for (const [anahtar, deger] of Object.entries(premiumTablo.DUGME.normal))
    icerir(s, anahtar, 'SETTINGS.md ' + anahtar + ' ' + deger);
});

// Kabul kriteri 4'ün kaynağı. Taban `normal` olduğu için normal hiç sapmaz; enjeksiyona
// yazılacak satır da o yüzden yalnız eco ve premiumda oluşur.
ol('sapma tablosu yalniz tabandan ayrilan dugmeleri verir', () => {
  esit(Object.keys(premiumTablo.sapmalar('normal')).length, 0, 'taban profil sapmamali');
  const eco = premiumTablo.sapmalar('eco');
  esit(eco.parallel_width, '1');
  esit(eco.default_model, 'haiku');
  esit(eco.audit, 'critical');
  esit(eco.ask_threshold, undefined, 'tabanla ayni deger sapma sayilmamali');
  esit(eco.agent_stall, undefined, 'kanca dugmesi uc profilde de ayni');
  esit(premiumTablo.sapmalar('premium').parallel_width, '20');
  esit(premiumTablo.sapmalar('premium').plan_council, 'on');
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
  const c = JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8'));
  esit(c.profil, 'normal');
  esit(c.premium, false);
  icerir(premiumCalistir('durum', p, cfg).out, 'yürürlükteki profil: normal');
});

ol('uc profil de uygulanir, durum yururlukteki profili soyler', () => {
  const { p, cfg } = premiumKopya();
  const beklenen = {
    eco: ['varsayılan model: haiku', 'parallel_width 1', 'research_repos 1', 'audit critical'],
    normal: ['varsayılan model: sonnet', 'sapan düğme: yok — taban profil'],
    premium: [
      'varsayılan model: opus',
      'parallel_width 20',
      'research_repos 50',
      'worktree_isolation on',
    ],
  };
  for (const profil of ['eco', 'normal', 'premium']) {
    const uygula = premiumCalistir(profil, p, cfg);
    esit(uygula.kod, 0, profil + ' cikis kodu');
    for (const satir of beklenen[profil]) icerir(uygula.out, satir);
    esit(JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8')).profil, profil);
    const d = premiumCalistir('durum', p, cfg).out;
    icerir(d, 'yürürlükteki profil: ' + profil);
    icerir(d, 'düğme tabanı: SETTINGS.md — makine varsayılanı, profil onu ezmez');
    if (d.includes('UYUŞMAZLIK'))
      throw new Error(profil + ' uygulandiktan sonra uyusmazlik bildirildi');
  }
});

ol('eski cagrilar ve eski konfig premium/normal olarak okunur', () => {
  const { p, cfg } = premiumKopya();
  for (const eski of ['kapat', 'off', 'standart']) {
    premiumCalistir('ac', p, cfg);
    esit(premiumCalistir(eski, p, cfg).kod, 0, eski + ' cikis kodu');
    icerir(premiumCalistir('durum', p, cfg).out, 'yürürlükteki profil: normal');
  }
  for (const eski of ['ac', 'aç', 'on']) {
    premiumCalistir('kapat', p, cfg);
    esit(premiumCalistir(eski, p, cfg).kod, 0, eski + ' cikis kodu');
    icerir(premiumCalistir('durum', p, cfg).out, 'yürürlükteki profil: premium');
  }
  premiumCalistir('premium', p, cfg);
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ premium: true }));
  const eskiAcik = premiumCalistir('durum', p, cfg).out;
  icerir(eskiAcik, 'konfig profili: premium (eski premium alanından)');
  if (eskiAcik.includes('UYUŞMAZLIK'))
    throw new Error('eski premium:true konfigi premium sayilmadi');
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ premium: false }));
  icerir(premiumCalistir('durum', p, cfg).out, 'konfig profili: normal (eski premium alanından)');
});

ol('eco profili en ucuz modeli ve en dar paralelligi secer', () => {
  const { p, cfg } = premiumKopya();
  esit(premiumCalistir('eco', p, cfg).kod, 0, 'eco cikis kodu');
  const model = Object.keys(premiumTablo.PROFIL.eco).map((a) => premiumTablo.PROFIL.eco[a].model);
  esit(model.filter((m) => m === 'haiku').length, 7, 'yedi ajan da haiku olmali');
  const s = premiumTablo.sapmalar('eco');
  esit(s.plan_council, undefined, 'plan konseyi tabanda da kapali');
  esit(s.second_opinion, undefined, 'ikinci gorus tabanda da kapali');
  esit(s.model_escalation, undefined, 'model tirmanisi tabanda da acik');
  const cikti = premiumCalistir('eco', p, cfg).out;
  icerir(cikti, 'profil: eco');
  icerir(cikti, '1+ depo');
  icerir(cikti, 'dosya yazılmadı');
});

ol('premium plan konseyini acar ve arastirma tavanini 50 depoya cikarir', () => {
  const { p, cfg } = premiumKopya();
  const acikCikti = premiumCalistir('ac', p, cfg);
  esit(acikCikti.kod, 0, 'premium ac cikis kodu');
  icerir(acikCikti.out, 'plan konseyi: fable + opus');
  icerir(acikCikti.out, '50+ depo');
  icerir(acikCikti.out, 'plan_council on');
  icerir(acikCikti.out, 'research_repos 50');
  const kapaliCikti = premiumCalistir('kapat', p, cfg);
  icerir(kapaliCikti.out, 'sapan düğme: yok — taban profil');
  icerir(premiumCalistir('durum', p, cfg).out, 'plan konseyi: off');
});

function oturumProfilOku(cfg, sid) {
  const r = spawnSync(
    process.execPath,
    ['-e', 'process.stdout.write(require(process.argv[1]).profil())', DIL],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: cfg,
        CLAUDE_CODE_SESSION_ID: sid || '',
        CLAUDE_CODE_HOST_SESSION_ID: '',
        TEKNESYUM_PREMIUM: '',
        TEKNESYUM_DIL: 'tr',
      },
    }
  );
  return (r.stdout || '').trim();
}

function oturumlarDizini(cfg) {
  return path.join(cfg, 'teknesyum', 'oturumlar');
}

ol('iki oturum ayri profil kaydi tutar, profil her birine kendi cevabini verir', () => {
  const { p, cfg } = premiumKopya();
  esit(premiumCalistir('eco', p, cfg, { CLAUDE_CODE_SESSION_ID: 'oturum-a' }).kod, 0, 'eco kodu');
  esit(
    premiumCalistir('premium', p, cfg, { CLAUDE_CODE_SESSION_ID: 'oturum-b' }).kod,
    0,
    'premium kodu'
  );
  esit(
    fs.readdirSync(oturumlarDizini(cfg)).sort().join(','),
    'oturum-a.json,oturum-b.json',
    'oturum basina ayri dosya'
  );
  esit(oturumProfilOku(cfg, 'oturum-a'), 'eco');
  esit(oturumProfilOku(cfg, 'oturum-b'), 'premium');
  esit(oturumProfilOku(cfg, null), 'normal', 'kimliksiz surec makine varsayilanina dusmeli');
  esit(
    fs.existsSync(path.join(cfg, 'teknesyum.json')),
    false,
    'oturum kaydi varken makine varsayilani yazilmamali'
  );
  const k = JSON.parse(fs.readFileSync(path.join(oturumlarDizini(cfg), 'oturum-a.json'), 'utf8'));
  esit(k.profil, 'eco');
  if (!k.pid || !k.ts || !k.cwd) throw new Error('kayitta pid/ts/cwd eksik: ' + JSON.stringify(k));
});

ol('oturum kimligi yokken profil kaydi makineye yazilir', () => {
  const { p, cfg } = premiumKopya();
  const cikti = premiumCalistir('premium', p, cfg);
  esit(cikti.kod, 0, 'cikis kodu');
  icerir(cikti.out, 'kayıt: makine');
  const c = JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8'));
  esit(c.profil, 'premium');
  esit(c.premium, true);
  esit(fs.existsSync(oturumlarDizini(cfg)), false, 'kimlik yokken oturum kaydi acilmamali');
  icerir(premiumCalistir('durum', p, cfg).out, 'yürürlükteki profil: premium (kaynak: makine)');
});

ol('bayat oturum kaydi yok sayilir ve yeni kayit yazilirken silinir', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('eco', p, cfg);
  const dizin = oturumlarDizini(cfg);
  fs.mkdirSync(dizin, { recursive: true });
  const kayit = (ts) => JSON.stringify({ profil: 'premium', pid: 1, ts, cwd: p });
  fs.writeFileSync(path.join(dizin, 'bayat.json'), kayit(Date.now() - 8 * 24 * 3600 * 1000));
  fs.writeFileSync(path.join(dizin, 'taze.json'), kayit(Date.now()));
  esit(oturumProfilOku(cfg, 'bayat'), 'eco', 'bayat kayit makine varsayilanina dusmeli');
  esit(oturumProfilOku(cfg, 'taze'), 'premium', 'taze kayit okunmali');
  premiumCalistir('normal', p, cfg, { CLAUDE_CODE_SESSION_ID: 'yeni' });
  esit(fs.existsSync(path.join(dizin, 'bayat.json')), false, 'bayat kayit silinmeli');
  esit(fs.existsSync(path.join(dizin, 'taze.json')), true, 'taze kayit durmali');
});

ol('durum profil kaynagini ve eforun izole olmadigini soyler', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('normal', p, cfg);
  const makine = premiumCalistir('durum', p, cfg).out;
  icerir(makine, 'yürürlükteki profil: normal (kaynak: makine)');
  icerir(makine, 'efor: taban — oturuma izole değil, ajan dosyasından gelir');
  const sid = { CLAUDE_CODE_SESSION_ID: 'oturum-c' };
  icerir(premiumCalistir('premium', p, cfg, sid).out, 'kayıt: oturum');
  const d = premiumCalistir('durum', p, cfg, sid).out;
  icerir(d, 'yürürlükteki profil: premium (kaynak: oturum)');
  icerir(d, 'konfig profili: normal');
  if (d.includes('UYUŞMAZLIK')) throw new Error('oturum kaydi konfigle uyusmazlik sayildi');
  icerir(
    premiumCalistir('durum', p, cfg, { ...sid, TEKNESYUM_DIL: 'en' }).out,
    'effort: baseline — not isolated per session, it comes from the agent file'
  );
});

ol('okunamayan oturum kaydi bayat sayilmaz, silinmez', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('normal', p, cfg);
  const dizin = oturumlarDizini(cfg);
  fs.mkdirSync(dizin, { recursive: true });
  const yarim = path.join(dizin, 'yarim.json');
  fs.writeFileSync(yarim, '{"profil": "premi');
  const bos = path.join(dizin, 'bos.json');
  fs.writeFileSync(bos, '');
  premiumCalistir('eco', p, cfg, { CLAUDE_CODE_SESSION_ID: 'yazan' });
  esit(fs.existsSync(yarim), true, 'yarim yazilmis kayit silinmemeli');
  esit(fs.existsSync(bos), true, 'bos kayit silinmemeli');
  esit(oturumProfilOku(cfg, 'yarim'), 'normal', 'okunamayan kayit makine varsayilanina dusmeli');
});

// Kabul kriteri 3. Uyuşmazlık artık mümkün değil: dosya yazılmıyor, dolayısıyla dosya
// ile profil ayrışamıyor. İki oturum aynı tabanın üstünde kendi sapmasını taşır.
ol('durum iki oturumda ayri profil basar, uyusmazlik satiri hic cikmaz', () => {
  const { p, cfg } = premiumKopya();
  const A = { CLAUDE_CODE_SESSION_ID: 'oturum-A' };
  const B = { CLAUDE_CODE_SESSION_ID: 'oturum-B' };
  const once = ajanMetni(p) + ayarMetni(p);
  esit(premiumCalistir('eco', p, cfg, A).kod, 0, 'A eco kodu');
  esit(premiumCalistir('premium', p, cfg, B).kod, 0, 'B premium kodu');
  const a = premiumCalistir('durum', p, cfg, A).out;
  const b = premiumCalistir('durum', p, cfg, B).out;
  icerir(a, 'yürürlükteki profil: eco (kaynak: oturum)');
  icerir(a, 'paralel: 1 ajan · ön araştırma: 1+ depo · denetim: critical');
  icerir(a, 'plan konseyi: off');
  icerir(a, 'sapan düğme: audit critical');
  icerir(b, 'yürürlükteki profil: premium (kaynak: oturum)');
  icerir(b, 'paralel: 20 ajan · ön araştırma: 50+ depo · denetim: every-contract');
  icerir(b, 'plan konseyi: fable + opus');
  icerir(b, 'sapan düğme: fix_ceiling 8');
  for (const [ad, cikti] of [
    ['ajan dosyaları', a],
    ['relay düğmeleri', b],
  ])
    if (cikti.includes(ad + ':')) throw new Error(ad + ' uyusmazlik satiri hâlâ basiliyor');
  if (a.includes('UYUŞMAZLIK') || b.includes('UYUŞMAZLIK'))
    throw new Error('dosya yazilmiyorken uyusmazlik bildirildi');
  esit(ajanMetni(p) + ayarMetni(p), once, 'iki oturum da dosyaya dokunmamali');
});

ol('plan konseyi uyesi hicbir sey yazamaz', () => {
  const m = fs.readFileSync(path.join(KOK, 'agents', 'planner.md'), 'utf8');
  const arac = (m.match(/^tools:[ \t]*(.+)$/m) || [])[1] || '';
  for (const yasak of ['Write', 'Edit', 'Bash', 'NotebookEdit']) {
    if (new RegExp('\\b' + yasak + '\\b').test(arac))
      throw new Error('planner ' + yasak + ' kullanabiliyor: ' + arac);
  }
  icerir(m, 'İş yapmazsın');
});

ol('premium ikinci gorusu acar, kapatinca geri alir', () => {
  const { p, cfg } = premiumKopya();
  const acikCikti = premiumCalistir('ac', p, cfg);
  esit(acikCikti.kod, 0, 'premium ac cikis kodu');
  icerir(acikCikti.out, 'ikinci görüş: fable');
  icerir(acikCikti.out, 'second_opinion on');
  premiumCalistir('kapat', p, cfg);
  const k = premiumCalistir('durum', p, cfg).out;
  icerir(k, 'ikinci görüş: off');
  if (k.includes('second_opinion')) throw new Error('normal profilde second_opinion sapma sayildi');
});

ol('gorus ayri bir advisor ajanindadir, planner yalniz konseyde kalir', () => {
  const gorus = fs.readFileSync(path.join(KOK, 'agents', 'advisor.md'), 'utf8').replace(/\r/g, '');
  const konsey = fs.readFileSync(path.join(KOK, 'agents', 'planner.md'), 'utf8').replace(/\r/g, '');
  for (const b of ['## Görüş\n', '## Gerekçe\n', '## Kaçırdığın şey\n']) icerir(gorus, b);
  icerir(gorus, '20 satır');
  for (const b of ['## Ayrım noktaları', '## Kavrayış', '## Reddettiklerim'])
    if (gorus.includes(b)) throw new Error('advisor içine konsey başlığı karışmış: ' + b);
  icerir(konsey, '## Ayrım noktaları');
  icerir(konsey, 'advisor');
  for (const kip of ['GÖRÜŞ:', '## Görüş kipi', 'Konsey kipi'])
    if (konsey.includes(kip)) throw new Error('planner hâlâ iki kipli: ' + kip);
});

ol('advisor yazma araci ve memory alani tasimaz', () => {
  const m = fs.readFileSync(path.join(KOK, 'agents', 'advisor.md'), 'utf8').replace(/\r/g, '');
  const on = m.slice(0, m.indexOf('\n---', 4));
  const arac = (on.match(/^tools:[ \t]*(.+)$/m) || [])[1] || '';
  if (!arac) throw new Error('advisor tools satırı yok, harness her aracı verir');
  for (const yasak of ['Write', 'Edit', 'Bash', 'NotebookEdit'])
    if (new RegExp('\\b' + yasak + '\\b').test(arac))
      throw new Error('advisor ' + yasak + ' kullanabiliyor: ' + arac);
  if (/^memory:/m.test(on))
    throw new Error('advisor memory alanı taşıyor, harness Write/Edit ekler');
  icerir(m, 'İş yapmazsın');
  icerir(m, '_sorun.log');
});

ol('advisor ucuz kalir, uc profilde de dusuk efordadir', () => {
  const src = fs.readFileSync(PREMIUM, 'utf8');
  const govde = src.slice(src.indexOf('const PROFIL'), src.indexOf('const PROFILLER'));
  const satirlar = govde.split('\n').filter((r) => r.trim().startsWith('advisor:'));
  esit(satirlar.length, 3, 'advisor üç profilde de tanımlı olmalı');
  for (const satir of satirlar)
    if (!/effort: 'low'/.test(satir))
      throw new Error('advisor düşük eforda değil: ' + satir.trim());
  icerir(satirlar[2], "model: 'fable'");
});

ol('on arastirma kapisi depo sayisini profile gore soyler', () => {
  const dilYolu = JSON.stringify(path.join(KOK, 'hooks', 'dil.js'));
  const oku = (premium) => {
    const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-depo-'));
    fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ dil: 'tr', premium }));
    const r = spawnSync(
      process.execPath,
      [
        '-e',
        'const d=require(' +
          dilYolu +
          ');process.stdout.write(String(d.depoSayisi())+"|"+d.s("onArastirma").join(" ")+"|"+d.s("onArastirmaHatirlatma"))',
      ],
      { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: cfg } }
    );
    return (r.stdout || '') + (r.stderr || '');
  };
  const kapali = oku(false);
  const acik = oku(true);
  icerir(kapali, '10|');
  icerir(kapali, 'en az 10 depoyu');
  if (/plan konseyini aç/.test(kapali)) throw new Error('standart profilde konsey notu cikmamali');
  icerir(acik, '50|');
  icerir(acik, 'en az 50 depoyu');
  icerir(acik, 'plan konseyini aç');
});

ol('ajan adi kurali modeli one alir, ornek bicime uyar', () => {
  const s = fs
    .readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8')
    .replace(/\r/g, '');
  const i = s.indexOf('**Ajan adı `<Model>-<İş Adı>` biçiminde yazılır.**');
  if (i < 0) throw new Error('ajan adlandırma kuralı SKILL.md içinde yok');
  const blok = (s.slice(i).match(/```\n([\s\S]*?)```/) || [])[1] || '';
  const ornek = blok.split('\n').filter((r) => r.trim());
  if (ornek.length < 2) throw new Error('adlandırma örneği yok: ' + JSON.stringify(blok));
  const baglac = ['ile', 've', 'veya', 'ya'];
  let baglacliOrnek = false;
  for (const ad of ornek) {
    const m = ad.match(/^(Opus|Fable|Sonnet|Haiku)-(.+)$/);
    if (!m) throw new Error('örnek `<Model>-<İş Adı>` biçiminde değil: ' + ad);
    for (const kelime of m[2].split(' ')) {
      if (baglac.includes(kelime)) {
        baglacliOrnek = true;
        continue;
      }
      if (!/^[A-ZÇĞİÖŞÜ]/.test(kelime))
        throw new Error('iş adında büyük harfle başlamayan kelime: ' + ad + ' → ' + kelime);
    }
  }
  esit(baglacliOrnek, true, 'kısa bağlaç istisnasını gösteren örnek yok');
  icerir(s, 'başlık ve dosya adı ilki büyük gerisi küçük');
});

ol('plan uretimi ikinci gorus tetikleyicisidir ve konseyden ayrilir', () => {
  const s = fs
    .readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8')
    .replace(/\r/g, '');
  const i = s.indexOf('## 1.5.1');
  const j = s.indexOf('## 1.6');
  if (i < 0 || j < i) throw new Error('§1.5.1 bulunamadı');
  const bolum = s.slice(i, j);
  icerir(bolum, 'Dokuz durumda açılır');
  icerir(bolum, 'plan oluştur');
  icerir(bolum, 'Plan konseyi (§1.5)');
});

ol('ikinci gorus tetikleyicileri dokuza cikti ve her biri olculebilir', () => {
  const s = fs
    .readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8')
    .replace(/\r/g, '');
  const bolum = s.slice(s.indexOf('## 1.5.1'), s.indexOf('## 1.6'));
  const madde = bolum.split('\n').filter((r) => /^\d+\. /.test(r));
  esit(madde.length, 9, 'dokuz tetikleyici olmali');
  for (const yeni of [
    'yeniden\n   üreten adımı',
    'İki ajanın raporu',
    'geçti/kaldı yapan komut yazılamadı',
    'sürüm etiketi',
  ])
    icerir(bolum, yeni);
  for (const belirsiz of ['kararsız kaldığında', 'emin olamadığında', 'şüphelendiğinde'])
    if (bolum.includes(belirsiz))
      throw new Error('ölçülemeyen tetikleyici cümlesi girmiş: ' + belirsiz);
  icerir(bolum, 'sık olan şeyin ucuz olması gerekir');
  icerir(bolum, '`advisor` ajanını');
});

ol('premium paralel tavani yirmidir ve gerekcesi yazili', () => {
  const s = fs
    .readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8')
    .replace(/\r/g, '');
  icerir(s, 'Paralel tavanı\n**yirmidir**');
  icerir(s, 'ölçüsü hızdır, token değil');
  icerir(s, 'bölünebilen işi bölmemek\ngerekçe ister');
  icerir(s, 'güvenlik ağıdır');
  const ayar = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  icerir(ayar, '| `parallel_width` | 1 | 2 | 20 |');
  icerir(ayar, 'güvenlik ağı olur');
});

ol('premium notu paralel acmayi varsayilan sayar', () => {
  const dilYolu = JSON.stringify(path.join(KOK, 'hooks', 'dil.js'));
  const oku = (d) => {
    const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-not-'));
    fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ dil: d, premium: true }));
    const r = spawnSync(
      process.execPath,
      ['-e', 'process.stdout.write(require(' + dilYolu + ').s("premiumNotu"))'],
      { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, TEKNESYUM_DIL: d } }
    );
    return (r.stdout || '') + (r.stderr || '');
  };
  const tr = oku('tr');
  icerir(tr, 'tek ajanla gitmek gerekçe ister');
  icerir(tr, 'plan istediği her');
  const en = oku('en');
  icerir(en, 'single agent needs a reason');
  icerir(en, 'the user asks for a plan');
});

ol('konfig elle degistirilse de durum uyusmazlik bildirmez', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('ac', p, cfg);
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ premium: false }));
  const d = premiumCalistir('durum', p, cfg).out;
  icerir(d, 'yürürlükteki profil: normal');
  if (d.includes('UYUŞMAZLIK')) throw new Error('uyusmazlik satiri geri gelmis');
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

function profilKonfig(ayar) {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-eco-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ dil: 'tr', ...ayar }));
  return cfg;
}

function profilIstek(p, cfg) {
  return calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'yeni bir modül yaz' },
    { CLAUDE_CONFIG_DIR: cfg, TEKNESYUM_PREMIUM: '', TEKNESYUM_STEERING: '' }
  ).out;
}

function enjeksiyonBoyu(cikti) {
  if (!cikti) return 0;
  const o = JSON.parse(cikti);
  const h = o.hookSpecificOutput;
  return h && h.additionalContext ? h.additionalContext.length : 0;
}

ol('eco notu yalnizca eco profilinde enjekte edilir', () => {
  const { p } = proje(1, 0);
  const eco = profilIstek(p, profilKonfig({ profil: 'eco' }));
  icerir(eco, 'Eco mod açık');
  icerir(eco, '`Explore` ajanı');
  icerir(eco, 'ajan açmak gerekçe');
  if (profilIstek(p, profilKonfig({ profil: 'normal' })).includes('Eco mod açık'))
    throw new Error('normal profilde eco notu enjekte edildi');
  const prem = profilIstek(p, profilKonfig({ profil: 'premium' }));
  if (prem.includes('Eco mod açık')) throw new Error('premium profilde eco notu enjekte edildi');
  icerir(prem, 'Premium mod açık');
});

ol('eco enjeksiyonu tek istekte biter, normal ikinci istekte de yazar', () => {
  const { p } = proje(1, 0);
  const eco = profilKonfig({ profil: 'eco' });
  icerir(profilIstek(p, eco), 'Eco mod açık');
  if (profilIstek(p, eco).includes('Teknesyum Base'))
    throw new Error('eco ikinci istekte de enjekte etti');
  const std = profilKonfig({ profil: 'normal' });
  icerir(profilIstek(p, std), 'Teknesyum Base', 'normal ilk istek');
  icerir(profilIstek(p, std), 'Teknesyum Base', 'normal ikinci istek');
  if (profilIstek(p, std).includes('Teknesyum Base'))
    throw new Error('normal ucuncu istekte enjeksiyon durmali');
});

// Kabul kriteri 5 — `Ö4`'ün bulduğu hata. Bench'te `/premium eco` görev isteminden sonra
// çalıştı, sayaç dolmuştu ve bağlam 72 tur boyunca premium metnini taşıdı; o koşu eco'yu
// hiç ölçmedi. Sayaç profili de tuttuğu için profil değişimi onu sıfırlar.
ol('profil degisince enjeksiyon sayaci sifirlanir', () => {
  const { p } = proje(1, 0);
  const cfg = profilKonfig({ profil: 'premium' });
  const profilYaz = (ad) =>
    fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ dil: 'tr', profil: ad }));
  icerir(profilIstek(p, cfg), 'Premium mod açık', 'premium ilk istek');
  icerir(profilIstek(p, cfg), 'Premium mod açık', 'premium ikinci istek');
  if (profilIstek(p, cfg).includes('Premium mod açık'))
    throw new Error('premium ucuncu istekte tavan calismali');
  profilYaz('eco');
  const ilk = profilIstek(p, cfg);
  icerir(ilk, 'Eco mod açık', 'profil degisince yeni blok ilk istekte gelmeli');
  icerir(ilk, 'Tabandan sapan düğmeler: ');
  if (ilk.includes('Premium mod açık')) throw new Error('eski profilin metni hâlâ geliyor');
  if (profilIstek(p, cfg).includes('Eco mod açık'))
    throw new Error('sifirlanan sayac eco tavanini da uygulamali');
});

ol('profil degismediyse sayac sifirlanmaz, tavan yerinde durur', () => {
  const { p } = proje(1, 0);
  const cfg = profilKonfig({ profil: 'normal' });
  icerir(profilIstek(p, cfg), 'Teknesyum Base', 'ilk istek');
  icerir(profilIstek(p, cfg), 'Teknesyum Base', 'ikinci istek');
  if (profilIstek(p, cfg).includes('Teknesyum Base'))
    throw new Error('ayni profilde tavan asildi, sayac sifirlanmis');
});

ol('eco fark satirlarini enjekte etmez, steering 2 ayarliyken bile', () => {
  const { p } = proje(1, 0);
  const eco = profilIstek(p, profilKonfig({ profil: 'eco', steering: 2 }));
  icerir(eco, 'Eco mod açık');
  if (eco.includes('Fark ▸')) throw new Error('eco profilinde seviye 2 metni enjekte edildi');
  icerir(profilIstek(p, profilKonfig({ profil: 'normal', steering: 2 })), 'Fark ▸');
});

ol('eco oturum basina normalden az karakter enjekte eder', () => {
  const { p } = proje(1, 0);
  const toplam = (ayar) => {
    const cfg = profilKonfig(ayar);
    let n = 0;
    for (let i = 0; i < 3; i++) n += enjeksiyonBoyu(profilIstek(p, cfg));
    return n;
  };
  const e = toplam({ profil: 'eco' });
  const s = toplam({ profil: 'normal' });
  if (!(e < s * 0.75)) throw new Error('eco enjeksiyonu kisalmadi: ' + e + ' / ' + s);
});

// Kabul kriteri 2. `ayarSayi` yan etkisiz çağrılabilsin diye kanca `require.main`
// arkasında; burada üç katmanın sırası ölçülüyor.
function ayarOku(cfg, sid, anahtar, root) {
  const r = spawnSync(
    process.execPath,
    [
      '-e',
      'process.stdout.write(String(require(process.argv[1]).ayarSayi(' +
        (root ? JSON.stringify(root) : 'null') +
        ',process.argv[2],99)))',
      IZLE,
      anahtar,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_CONFIG_DIR: cfg,
        CLAUDE_CODE_SESSION_ID: sid || '',
        CLAUDE_CODE_HOST_SESSION_ID: '',
        TEKNESYUM_PREMIUM: '',
        TEKNESYUM_DIL: 'tr',
      },
    }
  );
  return (r.stdout || '').trim() + (r.status === 0 ? '' : ' HATA:' + (r.stderr || ''));
}

ol('iki oturum kimliginde parallel_width farkli deger doner', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('eco', p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-eco' });
  premiumCalistir('premium', p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-prem' });
  premiumCalistir('normal', p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-std' });
  esit(ayarOku(cfg, 'w-eco', 'parallel_width'), '1', 'eco oturumu');
  esit(ayarOku(cfg, 'w-prem', 'parallel_width'), '20', 'premium oturumu');
  esit(ayarOku(cfg, 'w-std', 'parallel_width'), '2', 'normal oturumu dosyadan okumali');
});

ol('sapmayan dugmede proje SETTINGS.md hala gecerli', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('eco', p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-kat' });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kat-'));
  fs.writeFileSync(path.join(root, 'SETTINGS.md'), 'agent_stall : 3\nparallel_width : 7\n');
  esit(ayarOku(cfg, 'w-kat', 'agent_stall', root), '3', 'sapmayan dugme projeden okunmali');
  esit(ayarOku(cfg, 'w-kat', 'parallel_width', root), '1', 'sapan dugmede oturum profili kazanir');
  esit(ayarOku(cfg, 'w-kat', 'agent_loop', root), '5', 'kanca dugmesi global tabandan gelir');
});

ol('enjeksiyona yalniz tabandan sapan dugmeler girer', () => {
  const { p } = proje(1, 0);
  const eco = profilIstek(p, profilKonfig({ profil: 'eco' }));
  icerir(eco, 'Tabandan sapan düğmeler: ');
  for (const s of ['parallel_width 1', 'default_model haiku', 'audit critical'])
    icerir(eco, s, 'eco sapmasi');
  for (const s of ['ask_threshold', 'approval_gate', 'worktree_isolation', 'report_length'])
    if (eco.includes(s)) throw new Error('tabandan sapmayan düğme enjekte edildi: ' + s);
  for (const s of ['agent_stall', 'agent_loop'])
    if (eco.includes(s)) throw new Error('kanca düğmesi enjekte edildi: ' + s);
  const prem = profilIstek(p, profilKonfig({ profil: 'premium' }));
  icerir(prem, 'parallel_width 20');
  icerir(prem, 'plan_council on');
  if (prem.includes('audit ')) throw new Error('premiumda tabanla ayni audit enjekte edildi');
});

ol('taban profil enjeksiyona dugme satiri yazmaz', () => {
  const { p } = proje(1, 0);
  const std = profilIstek(p, profilKonfig({ profil: 'normal' }));
  icerir(std, 'Teknesyum Base');
  if (std.includes('Tabandan sapan düğmeler'))
    throw new Error('normal profil kendi tabanindan sapti');
});

// Kabul kriteri 4. Sapma satırı eco'ya bayt ekliyor; eklediğinden fazlasını kısa
// metinlerle ve tek istekli tavanla geri veriyor mu, ölçü bu.
ol('eco enjeksiyonu normalinkinden az bayt tutar', () => {
  const { p } = proje(1, 0);
  const toplam = (ad) => {
    const cfg = profilKonfig({ profil: ad });
    let n = 0;
    for (let i = 0; i < 3; i++) n += enjeksiyonBoyu(profilIstek(p, cfg));
    return n;
  };
  const e = toplam('eco');
  const s = toplam('normal');
  if (!(e > 0 && s > 0)) throw new Error('enjeksiyon olculemedi: ' + e + ' / ' + s);
  if (!(e < s)) throw new Error('eco enjeksiyonu normalden buyuk: ' + e + ' / ' + s);
  const satir = (profilIstek(p, profilKonfig({ profil: 'eco' })).match(
    /Tabandan sapan düğmeler: [^"]*?(?=\\n|")/
  ) || [''])[0];
  if (!satir) throw new Error('eco sapma satiri bulunamadi');
  if (satir.length > 200) throw new Error('eco sapmasi 3-4 satiri asti: ' + satir.length);
});

ol('eco notu premium notunun yarisini gecmez', () => {
  const dilYolu = JSON.stringify(path.join(KOK, 'hooks', 'dil.js'));
  for (const d of ['tr', 'en']) {
    const r = spawnSync(
      process.execPath,
      [
        '-e',
        'const m=require(' +
          dilYolu +
          ');process.stdout.write(m.s("ecoNotu").length+" "+m.s("premiumNotu").length)',
      ],
      { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: BOS_CFG, TEKNESYUM_DIL: d } }
    );
    const [eco, prem] = String(r.stdout || '')
      .split(' ')
      .map(Number);
    if (!(eco > 0 && eco * 2 < prem)) throw new Error(d + ' eco notu uzun: ' + eco + ' / ' + prem);
  }
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
  return { USERPROFILE: d, HOME: d, CLAUDE_CONFIG_DIR: path.join(d, '.claude') };
}

// Transkriptler konfig kökünün altında durur. Yalnız `USERPROFILE`'ı ezen fikstür
// sonucu makinedeki `CLAUDE_CONFIG_DIR`'e bırakır: ayarı taşımış geliştiricide test
// başka bir dizine bakar. Kök açıkça sabitlenir.
function oturumEvi() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ev-'));
  return { ev: d, ort: { USERPROFILE: d, HOME: d, CLAUDE_CONFIG_DIR: path.join(d, '.claude') } };
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
  const { ev: evDizin, ort: evOrt } = oturumEvi();
  const baska = path.join(evDizin, '.claude', 'projects', 'C--baska-klasor');
  fs.mkdirSync(baska, { recursive: true });
  fs.copyFileSync(path.join(p, 'kaynak.jsonl'), path.join(baska, 'S1.jsonl'));
  const r = spawnSync(process.execPath, [OTURUM, 'kaydet', 'uzak', '--proje', p], {
    encoding: 'utf8',
    env: { ...process.env, ...evOrt, CLAUDE_CODE_SESSION_ID: 'S1' },
  });
  esit(r.status, 0, 'baska klasordeki transkript bulunmali');
  const durum = path.join(p, '.claude', 'oturumlar', 'uzak', 'durum.json');
  esit(fs.existsSync(durum), true, 'kayit yazilmali');
  esit(JSON.parse(fs.readFileSync(durum, 'utf8')).oturumId, 'S1', 'dogru oturum');
});

function filoKur() {
  const dip = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-filo-'));
  const { ev: evDizin, ort: evOrt } = oturumEvi();
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
  return { dip, evDizin, evOrt };
}

ol('loadall butun projelerin durumunu tek ekranda verir', () => {
  const { dip, evOrt } = filoKur();
  const r = spawnSync(process.execPath, [OTURUM, 'toplu-yukle', '--kok', dip], {
    encoding: 'utf8',
    env: { ...process.env, ...evOrt, TEKNESYUM_DIL: 'tr' },
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
  const { dip, evOrt } = filoKur();
  const r = spawnSync(process.execPath, [OTURUM, 'toplu-kaydet', '--kok', dip], {
    encoding: 'utf8',
    env: { ...process.env, ...evOrt, TEKNESYUM_DIL: 'tr' },
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
  const { ev: evDizin, ort: evOrt } = oturumEvi();
  const dizin = path.join(evDizin, '.claude', 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
  fs.mkdirSync(dizin, { recursive: true });
  fs.copyFileSync(path.join(p, 'kaynak.jsonl'), path.join(dizin, 'ONCEKI.jsonl'));
  const ort = { ...process.env, ...evOrt, TEKNESYUM_DIL: 'tr' };
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

// Transkript konfig kökünün altında aranır. Ev dizini bilerek boş bırakılır: eski
// sürüm `USERPROFILE`'a baktığı için konfig dizinini taşımış kullanıcıda bildirim hiç
// çıkmıyordu; test o kör noktayı ölçer.
// Konfig dizinini taşımış kullanıcıda transkriptler de onunla taşınır. Ev dizini
// boş bırakılır: `os.homedir()` okuyan sürüm burada hiçbir transkript bulamaz ve
// `/save`, `/load`, `/saveall`, `/loadall` sessizce çalışmaz olur.
ol('transkript konfig kökünü izler, ev dizinini değil', () => {
  const p = oturumProjesi();
  const bosEv = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bosev-'));
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfgtr-'));
  const dizin = path.join(cfg, 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
  fs.mkdirSync(dizin, { recursive: true });
  fs.copyFileSync(path.join(p, 'kaynak.jsonl'), path.join(dizin, 'ONCEKI.jsonl'));
  const taban = {
    ...process.env,
    USERPROFILE: bosEv,
    HOME: bosEv,
    CLAUDE_CONFIG_DIR: cfg,
    TEKNESYUM_DIL: 'tr',
  };
  const y = spawnSync(process.execPath, [OTURUM, 'yukle', 'son', '--proje', p], {
    encoding: 'utf8',
    env: { ...taban, CLAUDE_CODE_SESSION_ID: 'BASKA' },
  });
  esit(y.status, 0, 'konfig kökündeki transkript bulunmalı');
  icerir(y.stdout, 'ONCEKI');
  const k = spawnSync(process.execPath, [OTURUM, 'kaydet', 'sinav', '--proje', p], {
    encoding: 'utf8',
    env: { ...taban, CLAUDE_CODE_SESSION_ID: 'ONCEKI' },
  });
  esit(k.status, 0, 'kayıt konfig kökündeki transkripti bulmalı');
  esit(
    fs.existsSync(path.join(p, '.claude', 'oturumlar', 'sinav', 'durum.json')),
    true,
    'kayıt yazılmalı'
  );
});

ol('acilis acik sozlesme varken onceki oturumu haber verir', () => {
  const { p } = proje(2, 1);
  const k = konfig(true);
  const bosEv = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bosev-'));
  const dizin = path.join(k.CLAUDE_CONFIG_DIR, 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
  fs.mkdirSync(dizin, { recursive: true });
  fs.writeFileSync(path.join(dizin, 'ESKI.jsonl'), '{}\n');
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'SessionStart', session_id: 'YENI' },
    { ...k, USERPROFILE: bosEv, HOME: bosEv }
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

ol('ayni adli ucuncu hafiza dosyasi da korunur', () => {
  const { tasi } = require(KAPSAYICI);
  const dip = kapsayiciKur();
  const kaynak = path.join(dip, '.claude', 'agent-memory', 'teknesyum-builder');
  const varis = path.join(dip, 'Alfa', '.claude', 'agent-memory', 'teknesyum-builder');
  fs.mkdirSync(varis, { recursive: true });
  fs.writeFileSync(path.join(varis, 'not.md'), 'bir\n');
  for (const govde of ['iki', 'uc']) {
    fs.mkdirSync(kaynak, { recursive: true });
    fs.writeFileSync(path.join(kaynak, 'not.md'), govde + '\n');
    esit(tasi(dip, path.join(dip, 'Alfa')), 1, govde + ' tasinmali');
  }
  esit(fs.readFileSync(path.join(varis, 'not.md'), 'utf8'), 'bir\n', 'ilk dosya durmali');
  esit(fs.readFileSync(path.join(varis, 'not-2.md'), 'utf8'), 'iki\n', 'ikinci -2 olmali');
  esit(fs.readFileSync(path.join(varis, 'not-3.md'), 'utf8'), 'uc\n', 'ucuncu -3 olmali');
});

ol('kanca ust klasorde acilan oturumda projeyi izler ve tur sonunda tasir', () => {
  const dip = kapsayiciKur();
  const cfg = konfig(true);
  const oturum = { cwd: dip, session_id: 'kap-1', transcript_path: '/x/kap-1.jsonl' };
  const a = calistir(IZLE, { ...oturum, hook_event_name: 'SessionStart' }, cfg);
  icerir(JSON.parse(a.out).systemMessage, 'üst klasör');
  calistir(
    IZLE,
    {
      ...oturum,
      hook_event_name: 'PostToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: path.join(dip, 'Alfa', 'src', 'a.js') },
    },
    cfg
  );
  const b = calistir(
    IZLE,
    { ...oturum, hook_event_name: 'UserPromptSubmit', prompt: 'devam' },
    cfg
  );
  icerir(JSON.parse(b.out).hookSpecificOutput.additionalContext, 'Alfa');
  const kaynak = path.join(dip, '.claude', 'agent-memory', 'teknesyum-builder');
  fs.mkdirSync(kaynak, { recursive: true });
  fs.writeFileSync(path.join(kaynak, 'not.md'), 'x\n');
  calistir(IZLE, { ...oturum, hook_event_name: 'Stop' }, cfg);
  esit(
    fs.existsSync(path.join(dip, 'Alfa', '.claude', 'agent-memory', 'teknesyum-builder', 'not.md')),
    true,
    'hafiza projeye tasinmali'
  );
});

ol('kapsayici koku ikinci cagrida dizini yeniden okumaz', () => {
  const dip = kapsayiciKur();
  delete require.cache[require.resolve(KAPSAYICI)];
  const { kok } = require(KAPSAYICI);
  const asilOku = fs.readdirSync;
  const asilVar = fs.existsSync;
  let oku = 0;
  let vari = 0;
  fs.readdirSync = (...a) => {
    oku++;
    return asilOku.apply(fs, a);
  };
  fs.existsSync = (...a) => {
    vari++;
    return asilVar.apply(fs, a);
  };
  let ilk;
  let ikinci;
  try {
    ilk = kok(dip);
    const okuBir = oku;
    const variBir = vari;
    ikinci = kok(dip);
    esit(oku, okuBir, 'ikinci cagri readdirSync yapmamali');
    esit(vari, variBir, 'ikinci cagri existsSync yapmamali');
  } finally {
    fs.readdirSync = asilOku;
    fs.existsSync = asilVar;
  }
  esit(ilk, path.resolve(dip), 'ilk cevap');
  esit(ikinci, ilk, 'onbellek ayni cevabi vermeli');
});

ol('genel kok worktree oturumunda alt klasore kaymaz', () => {
  const { wt } = worktreeProje();
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  const yuk = {
    cwd: wt,
    session_id: 'wt-1',
    transcript_path: '/x/wt-1.jsonl',
    hook_event_name: 'UserPromptSubmit',
    prompt: '/report',
  };
  calistir(IZLE, yuk, { CLAUDE_CONFIG_DIR: cfg });
  calistir(IZLE, yuk, { CLAUDE_CONFIG_DIR: cfg });
  const kok = path.join(cfg, 'teknesyum', 'live');
  esit(fs.existsSync(path.join(kok, 'wt-1.hatirlatma')), true, 'sayac genel kokte olmali');
  esit(fs.existsSync(path.join(kok, 'kullanim.json')), true, 'kullanim genel kokte olmali');
  esit(
    fs.existsSync(path.join(kok, 'worktrees')),
    false,
    'genel kok worktree alt klasoru acmamali'
  );
});

ol('eski canli genel koku duruyorsa oraya yazmaya devam edilir', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  fs.mkdirSync(path.join(cfg, 'teknesyum', 'canli'), { recursive: true });
  calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: '/report' },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  esit(
    fs.existsSync(path.join(cfg, 'teknesyum', 'canli', 'kullanim.json')),
    true,
    'eski dizin varken yeni dizine kacilmamali'
  );
  esit(fs.existsSync(path.join(cfg, 'teknesyum', 'live')), false, 'iki dizine bolunmemeli');
});

ol('role kurulu projede de genel kok supurulur, kullanim sayaci korunur', () => {
  const { p } = proje(1, 0);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-cfg-'));
  const kok = path.join(cfg, 'teknesyum', 'live');
  const bayat = path.join(kok, 'eski-oturum');
  fs.mkdirSync(bayat, { recursive: true });
  fs.writeFileSync(path.join(bayat, 'a1.json'), '{}');
  const sayac = path.join(kok, 'kullanim.json');
  fs.writeFileSync(sayac, JSON.stringify({ 'komut:eski': { n: 3 } }));
  const gun = Date.now() - 30 * 60 * 60 * 1000;
  fs.utimesSync(bayat, gun / 1000, gun / 1000);
  fs.utimesSync(sayac, gun / 1000, gun / 1000);
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'a9',
      agent_type: 'builder',
      agent_transcript_path: '/x/a9.jsonl',
    },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  esit(fs.existsSync(bayat), false, 'role kurulu projede bayat iz duruyor');
  esit(fs.existsSync(sayac), true, 'birikimli kullanim sayaci supurulmemeli');
});

ol('debug gunlugu tavani asinca son satirlara kirpilir', () => {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  const g = path.join(live, '_hook-debug.log');
  fs.writeFileSync(g, ('x'.repeat(200) + '\n').repeat(5000));
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'PostToolUse',
      agent_id: 'a1',
      agent_type: 'builder',
      tool_name: 'Bash',
      tool_input: {},
    },
    { TEKNESYUM_DEBUG: '1' }
  );
  const l = fs.readFileSync(g, 'utf8').split('\n').filter(Boolean);
  esit(l.length, 1000, 'gunluk son bin satira inmeli');
  icerir(l[l.length - 1], 'PostToolUse', 'yeni satir korunmali');
});

// Ajan dosyasında `model` alanı kalmadı: modelin beyanı artık çağrının kendisidir.
// Efor beyanı hâlâ dosyadadır, çağrıda geçilemediği için.
ol('beyan edilen model ve efor tutmazsa sorun gunlugune yazilir', () => {
  const { p, live } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ajantr-'));
  const at = path.join(d, 'agent-b1.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-4-5' } }) + '\n'
  );
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'PreToolUse',
      tool_name: 'Agent',
      tool_input: { subagent_type: 'teknesyum:scribe', model: 'haiku' },
    },
    konfig(true)
  );
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'b1',
      agent_type: 'teknesyum:scribe',
      agent_transcript_path: at,
      effort: { level: 'xhigh' },
    },
    konfig(true)
  );
  const g = fs.readFileSync(path.join(live, '_sorun.log'), 'utf8');
  icerir(g, 'scribe | model | beyan: haiku | gerçek: claude-opus-4-5', 'model uyusmazligi');
  icerir(g, 'scribe | efor | beyan: low | gerçek: xhigh', 'efor uyusmazligi');
});

ol('cagrida model gecilmediyse model beyani da yoktur, uyari acilmaz', () => {
  const { p, live } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ajantr-'));
  const at = path.join(d, 'agent-b3.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-4-5' } }) + '\n'
  );
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'b3',
      agent_type: 'teknesyum:scribe',
      agent_transcript_path: at,
      effort: { level: 'low' },
    },
    konfig(true)
  );
  let g = '';
  try {
    g = fs.readFileSync(path.join(live, '_sorun.log'), 'utf8');
  } catch {}
  if (g.includes('scribe | model')) throw new Error('beyansiz model uyari acti: ' + g);
});

ol('beyanla uyusan ajan sorun gunlugu acmaz', () => {
  const { p, live } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ajantr-'));
  const at = path.join(d, 'agent-b2.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', message: { model: 'claude-haiku-4-5' } }) + '\n'
  );
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'b2',
      agent_type: 'teknesyum:scribe',
      agent_transcript_path: at,
      effort: { level: 'low' },
    },
    konfig(true)
  );
  esit(fs.existsSync(path.join(live, '_sorun.log')), false, 'uyusan ajan sorun yazmamali');
});

ol('cagrida secilen model beyan sayilir, uyusmazlik uydurulmaz', () => {
  const { p, live } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ajantr-'));
  const at = path.join(d, 'agent-b3.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-4-5' } }) + '\n'
  );
  const cfg = konfig(true);
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'PreToolUse',
      tool_name: 'Agent',
      tool_input: { subagent_type: 'teknesyum:scribe', description: 'agir is', model: 'opus' },
    },
    cfg
  );
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'b3',
      agent_type: 'teknesyum:scribe',
      agent_transcript_path: at,
      effort: { level: 'low' },
    },
    cfg
  );
  esit(fs.existsSync(path.join(live, '_sorun.log')), false, 'ezilen model uyusmazlik sayilmamali');
});

console.log('\nKoruma — mühür kanıtı');

function kanitProje(kayitlar) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kanit-'));
  const relay = path.join(p, '.claude', 'relay');
  const live = path.join(relay, 'live');
  fs.mkdirSync(path.join(relay, 'contracts', 'done'), { recursive: true });
  fs.mkdirSync(live, { recursive: true });
  for (const id of Object.keys(kayitlar || {}))
    fs.writeFileSync(path.join(live, id + '.json'), JSON.stringify(kayitlar[id]));
  return { relay, live, hedef: path.join(relay, 'contracts', 'done', 'T1.md') };
}

const KANITLI = (fark) =>
  '---\nstatus: done\nowns: [src/a.js, src/b.js]\naudit: passed\nauditor_id: d1\n' +
  'diff: ' +
  (fark || 'src/a.js, src/b.js') +
  '\nverification: node test/run.js → exit 0\n---\n';

const muhurYaz = (hedef, govde) =>
  calistir(KORU, { tool_name: 'Write', tool_input: { file_path: hedef, content: govde } });

ol('mühür kanıtı: dosyaya yazmış denetçi kaydı mührü düşürür', () => {
  const { hedef } = kanitProje({ d1: { agent_type: 'teknesyum:auditor', files: ['src/a.js'] } });
  const r = muhurYaz(hedef, KANITLI());
  esit(r.kod, 2, 'yazmış denetçi geçmemeli');
  icerir(r.err, 'denetim geçersiz');
  icerir(r.err, 'src/a.js');
});

ol('mühür kanıtı: temiz denetçi kaydıyla geçer', () => {
  const { hedef } = kanitProje({ d1: { agent_type: 'teknesyum:auditor', files: [] } });
  esit(muhurYaz(hedef, KANITLI()).kod, 0);
});

ol('mühür kanıtı: auditor_id denetçi olmayan bir ajana aitse reddedilir', () => {
  const { hedef } = kanitProje({ d1: { agent_type: 'teknesyum:builder', files: [] } });
  const r = muhurYaz(hedef, KANITLI());
  esit(r.kod, 2);
  icerir(r.err, 'denetçi olmayan');
});

ol('mühür kanıtı: diff owns ile kesişmiyorsa reddedilir', () => {
  const { hedef } = kanitProje({ d1: { agent_type: 'auditor', files: [] } });
  const r = muhurYaz(hedef, KANITLI('docs/RAPOR.md'));
  esit(r.kod, 2);
  icerir(r.err, 'owns kümesiyle kesişmiyor');
});

ol('mühür kanıtı: auditor_id live/ altında yoksa biçim denetimine düşülür', () => {
  const { hedef, live } = kanitProje({});
  esit(muhurYaz(hedef, KANITLI()).kod, 0, 'kayıt yokken kilitlenmemeli');
  icerir(fs.readFileSync(path.join(live, '_sorun.log'), 'utf8'), 'live/d1.json yok');
});

ol('mühür kanıtı: kabuktan taşımada da aranır', () => {
  const { relay } = kanitProje({ d1: { agent_type: 'auditor', files: ['src/a.js'] } });
  const kaynak = path.join(relay, 'contracts', 'T1.md');
  fs.writeFileSync(kaynak, KANITLI());
  const komut =
    'mv ' + kaynak.replace(/\\/g, '/') + ' ' + norm2(path.join(relay, 'contracts', 'done'));
  esit(calistir(KORU, { tool_name: 'Bash', tool_input: { command: komut } }).kod, 2);
});

function norm2(p) {
  return p.replace(/\\/g, '/');
}

console.log('\nAjan sağlığı');

function damga(dk) {
  return new Date(Date.now() - dk * 60000).toISOString().replace('T', ' ').slice(0, 19);
}

function saglikProje(kayit) {
  const { p, live } = proje(1, 0);
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(path.join(live, 'a1.json'), JSON.stringify(kayit));
  return { p, live };
}

const TETIK = (p) => ({
  ...ort(p),
  hook_event_name: 'PostToolUse',
  tool_name: 'Read',
  tool_input: {},
});

ol('sessiz kalmis ajan bildirilir, tazesi bildirilmez', () => {
  const eski = saglikProje({
    agent_id: 'a1',
    agent_type: 'teknesyum:builder',
    last_seen: damga(25),
    ended: null,
    stop_reason: null,
    last_action: 'Bash npm test',
    steps: 4,
  });
  const r = calistir(IZLE, TETIK(eski.p));
  icerir(JSON.parse(r.out).systemMessage, 'Sağlık ▸');
  icerir(JSON.parse(r.out).systemMessage, 'dakikadır sessiz');
  icerir(JSON.parse(r.out).systemMessage, 'TaskStop');
  icerir(fs.readFileSync(path.join(eski.live, '_sorun.log'), 'utf8'), 'sessiz');

  const taze = saglikProje({
    agent_id: 'a1',
    agent_type: 'teknesyum:builder',
    last_seen: damga(1),
    ended: null,
    stop_reason: null,
    last_action: 'Bash npm test',
    steps: 4,
  });
  const t = calistir(IZLE, TETIK(taze.p));
  if (t.out.includes('Sağlık ▸')) throw new Error('taze ajan sessiz sayildi: ' + t.out);
});

ol('bitmis ajan sessiz sayilmaz ve uyari bir kez cikar', () => {
  const bitmis = saglikProje({
    agent_id: 'a1',
    agent_type: 'teknesyum:builder',
    last_seen: damga(30),
    ended: damga(29),
    stop_reason: 'end_turn',
    last_action: 'Read x',
  });
  if (calistir(IZLE, TETIK(bitmis.p)).out.includes('Sağlık ▸'))
    throw new Error('biten ajan icin sessizlik uyarisi');

  const { p, live } = saglikProje({
    agent_id: 'a1',
    agent_type: 'teknesyum:builder',
    last_seen: damga(30),
    ended: null,
    stop_reason: null,
    last_action: 'Read x',
  });
  icerir(calistir(IZLE, TETIK(p)).out, 'Sağlık ▸');
  esit(JSON.parse(fs.readFileSync(path.join(live, 'a1.json'), 'utf8')).sessiz_bildirildi, true);
  fs.unlinkSync(path.join(live, '_saglik'));
  if (calistir(IZLE, TETIK(p)).out.includes('Sağlık ▸'))
    throw new Error('ayni sessizlik ikinci kez bildirildi');
});

ol('sessizlik esigi SETTINGS.md dugmesinden okunur', () => {
  const { p } = saglikProje({
    agent_id: 'a1',
    agent_type: 'teknesyum:builder',
    last_seen: damga(4),
    ended: null,
    stop_reason: null,
    last_action: 'Read x',
  });
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'SETTINGS.md'),
    '```\nagent_stall        : 2\n```\n'
  );
  icerir(calistir(IZLE, TETIK(p)).out, 'Sağlık ▸');
});

function dongulu(eylem, buyut) {
  const { p, live } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-dongu-'));
  const tp = path.join(d, 'agent-a1.jsonl');
  fs.writeFileSync(tp, 'x\n');
  let son = '';
  for (let i = 0; i < 6; i++) {
    if (buyut) fs.appendFileSync(tp, 'y'.repeat(500) + '\n');
    son = calistir(IZLE, {
      ...ort(p),
      hook_event_name: 'PostToolUse',
      agent_id: 'a1',
      agent_type: 'teknesyum:builder',
      agent_transcript_path: tp,
      tool_name: 'Bash',
      tool_input: { file_path: path.join(p, eylem(i)) },
    }).out;
    if (son.includes('döngüde')) break;
  }
  return { son, live };
}

ol('ayni eylemi tekrarlayan ajan donguye takildi sayilir', () => {
  const { son, live } = dongulu(() => 'src/a.js', true);
  icerir(son, 'Sağlık ▸');
  icerir(son, 'döngüde');
  icerir(son, 'TaskStop');
  icerir(fs.readFileSync(path.join(live, '_sorun.log'), 'utf8'), 'döngü');
});

ol('eylemi degisen ajan donguye takilmis sayilmaz', () => {
  const { son, live } = dongulu((i) => 'src/a' + i + '.js', true);
  if (son.includes('döngüde')) throw new Error('ilerleyen ajan dongu sayildi: ' + son);
  esit(fs.existsSync(path.join(live, '_sorun.log')), false, 'gereksiz sorun kaydi');
});

ol('transkripti buyumeyen ajan dongu degil sessizlik hanesine yazilir', () => {
  const { son } = dongulu(() => 'src/a.js', false);
  if (son.includes('döngüde')) throw new Error('duran transkriptle dongu bildirildi: ' + son);
});

console.log('\nDebug bildirimi');

const DEBUG_YUK = (p) => ({
  ...ort(p),
  hook_event_name: 'PostToolUseFailure',
  agent_id: 'a1',
  agent_type: 'teknesyum:builder',
  tool_name: 'Edit',
  tool_input: { file_path: 'src/a.js' },
  error: 'string_not_found',
});

ol('debug kapaliyken Debug satiri cikmaz, acikken cikar', () => {
  const { p } = proje(1, 0);
  const kapali = calistir(IZLE, DEBUG_YUK(p), { TEKNESYUM_DEBUG: '' });
  if (kapali.out.includes('Debug ▸')) throw new Error('debug kapaliyken satir cikti');
  const { p: p2, live } = proje(1, 0);
  const acik = calistir(IZLE, DEBUG_YUK(p2), { TEKNESYUM_DEBUG: '1' });
  const m = JSON.parse(acik.out).systemMessage;
  icerir(m, '`Teknesyum ▸ Debug ▸ ');
  icerir(m, 'Edit aracı hata verdi');
  icerir(m, 'builder ajanı · a1');
  if (m.includes('→')) throw new Error('cumle icinde ok var: ' + m);

  // ÖLÇÜLDÜ (22.08.2026): ana oturumda `agent_type` gelmiyor, rol varsayılana düşüyordu
  // ve satır "ajan ajanı, ana oturum" diye çıkıyordu. Ana oturumun rolü yok, adı var.
  const { p: p3 } = proje(1, 0);
  const yuk = DEBUG_YUK(p3);
  delete yuk.agent_id;
  delete yuk.agent_type;
  delete yuk.agent_transcript_path;
  const anaOturum = JSON.parse(calistir(IZLE, yuk, { TEKNESYUM_DEBUG: '1' }).out).systemMessage;
  icerir(anaOturum, 'ana oturum');
  if (/ajan[ıi] ajan|ajan ajan/.test(anaOturum))
    throw new Error('ana oturum rol adıyla yazıldı: ' + anaOturum);
  icerir(fs.readFileSync(path.join(live, '_sorun.log'), 'utf8'), 'string_not_found');
});

ol('kesilen arac cagrisi hata degil kesinti diye bildirilir', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, { ...DEBUG_YUK(p), is_interrupt: true }, { TEKNESYUM_DEBUG: '1' });
  icerir(JSON.parse(r.out).systemMessage, 'Edit aracı kesildi');
});

ol('ajan kapanisi debug acikken bildirilir ve gunluge dusser', () => {
  const { p, live } = proje(1, 0);
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'a1',
      agent_type: 'teknesyum:builder',
      agent_transcript_path: '/x/a1.jsonl',
    },
    { TEKNESYUM_DEBUG: '1' }
  );
  const m = JSON.parse(r.out).systemMessage;
  icerir(m, 'Debug ▸ bir ajan durdu');
  icerir(m, 'builder ajanı · a1');
  icerir(fs.readFileSync(path.join(live, '_sorun.log'), 'utf8'), 'bir ajan durdu');
});

ol('debug bildirimi ingilizce kurulumda ingilizce konusur', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, DEBUG_YUK(p), { TEKNESYUM_DEBUG: '1', TEKNESYUM_DIL: 'en' });
  icerir(JSON.parse(r.out).systemMessage, 'the Edit tool failed');
});

console.log('\nTur özeti');

function turProje() {
  const { p } = proje(1, 0);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-tur-'));
  return { p, ek: { CLAUDE_CONFIG_DIR: cfg } };
}

// Tur özeti `systemMessage` ile basılmıyor: `Stop says:` öneki oluşmasın diye satır
// `additionalContext` ile modele veriliyor.
function turSatiri(r) {
  const o = JSON.parse(r.out);
  return (o.hookSpecificOutput || {}).additionalContext || '';
}

ol('tur ozeti sure ve token tahminini tek satirda verir', () => {
  const { p, ek } = turProje();
  const t = transcript('merhaba');
  calistir(IZLE, { ...ort(p), transcript_path: t, hook_event_name: 'UserPromptSubmit' }, ek);
  fs.appendFileSync(t, 'z'.repeat(4000) + '\n');
  const m = turSatiri(
    calistir(IZLE, { ...ort(p), transcript_path: t, hook_event_name: 'Stop' }, ek)
  );
  icerir(m, 'Total Süre: ~');
  icerir(m, 'sn     Base tahmini, ana oturum + alt ajanlar: ~');
  const tok = parseInt(m.match(/: ~(\d+) token/)[1], 10);
  if (tok < 900 || tok > 1200) throw new Error('token tahmini bekleneni tutmadi: ' + tok);
});

// `Ö4`: bir koşunun `Stop` satırı ~313.500 token derken harness bütçe sayacı 171.114
// diyordu. İkisi de "Tahmini Token" adıyla görününce aynı koşu iki rakamla raporlandı.
// Ad artık neyi saydığını söylüyor; sayaçla karışacak çıplak ad geri gelmemeli.
ol('tur makbuzunun adi neyi saydigini soyler', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  icerir(m, 'Base tahmini, ana oturum + alt ajanlar:');
  if (/Tahmini Token/.test(m))
    throw new Error('makbuz hâlâ bütçe sayacıyla ayni adi tasiyor: ' + m);
});

ol('tur ozeti systemMessage kanalina hic yazmaz', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const o = JSON.parse(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek).out);
  esit(o.systemMessage, undefined, 'ozet systemMessage ile basilmis');
  esit(o.hookSpecificOutput.hookEventName, 'Stop');
});

ol('damgasiz Stop tur ozeti basmaz', () => {
  const { p, ek } = turProje();
  esit(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek).out, '', 'damgasiz ozet cikti');
});

ol('tur ozeti Stop engelini bozmaz, tek JSON kalir', () => {
  const { p, ek } = turProje();
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'contracts', 'T0.md'),
    '---\nstatus: active\n---\n'
  );
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'devam' }, ek);
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'Stop',
      transcript_path: transcript('T0 tamamlandı, tüm kabul kriterleri karşılandı.'),
    },
    ek
  );
  const o = JSON.parse(r.out);
  esit(o.decision, 'block');
  icerir(o.reason, 'dönüş bloğu');
  icerir(o.hookSpecificOutput.additionalContext, 'Total Süre: ');
});

ol('bir dakikayi asan tur dakika ve saniye ile yazilir', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const f = path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum', 'live', 'oturum-1.tur');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  d.t = Date.now() - 215000;
  fs.writeFileSync(f, JSON.stringify(d));
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  icerir(m, 'Total Süre: ~3dk 35sn');
});

ol('ingilizce kurulumda tur ozeti ingilizce yazilir', () => {
  const { p, ek } = turProje();
  calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'UserPromptSubmit' },
    {
      ...ek,
      TEKNESYUM_DIL: 'en',
    }
  );
  const m = turSatiri(
    calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, { ...ek, TEKNESYUM_DIL: 'en' })
  );
  icerir(m, 'Total Time: ~');
  icerir(m, 'Base estimate, main session + subagents: ~');
});

ol('alt ajan transkripti de token tahminine girer', () => {
  const { p, ek } = turProje();
  const at = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-alt-')), 'agent-a1.jsonl');
  fs.writeFileSync(at, 'x\n');
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'SubagentStart',
    agent_id: 'a1',
    agent_type: 'teknesyum:builder',
    agent_transcript_path: at,
  });
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  fs.appendFileSync(at, 'y'.repeat(8000) + '\n');
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  const tok = parseInt(m.match(/: ~(\d+) token/)[1], 10);
  if (tok < 1900 || tok > 2200) throw new Error('alt ajan transkripti sayilmadi: ' + tok);
});

// Turun `.tur` damgasini geriye alir: `ms` turun basindan bu yana gecen duvar saati,
// `sonMs` son olaydan bu yana gecen sessizlik. Ikisi ayrilinca duraklama olculebilir.
function turGeriAl(ek, ms, sonMs) {
  const f = path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum', 'live', 'oturum-1.tur');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const simdi = Date.now();
  d.t = simdi - ms;
  d.son = simdi - (sonMs === undefined ? ms : sonMs);
  fs.writeFileSync(f, JSON.stringify(d));
}

ol('duraklamali turda sure duvar saatinden kucuk cikar', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  turGeriAl(ek, 600000, 300000);
  calistir(IZLE, { ...ort(p), hook_event_name: 'PostToolUse', tool_name: 'Read' }, ek);
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  icerir(m, 'Total Süre: ~5dk ');
  if (m.includes('10dk')) throw new Error('duvar saati düşülmemiş: ' + m);
});

ol('duraklamasiz kisa turda sure duvar saatine yakin kalir', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  turGeriAl(ek, 40000);
  calistir(IZLE, { ...ort(p), hook_event_name: 'PostToolUse', tool_name: 'Read' }, ek);
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  const sn = parseInt(m.match(/~(\d+)sn/)[1], 10);
  if (sn < 38 || sn > 42) throw new Error('duraklamasiz tur duvar saatinden saptı: ' + m);
});

ol('uzun suren arac duraklama sayilmaz', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  turGeriAl(ek, 300000);
  calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'PostToolUse', tool_name: 'Bash', duration_ms: 299000 },
    ek
  );
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  icerir(m, 'Total Süre: ~5dk ');
});

console.log('\nBildirim biçimi');

// Kullanicinin canlida cevirecegi sabit budur; testi de o dosyayi kopyalayip sabiti
// degistirerek kosar, boylece iki bicimin de uretilebildigi gercekten olculur.
// Kanca `../scripts/premium.js` ve `../agents/` yollarını `__dirname` üzerinden çözüyor;
// kopya da eklentinin yerleşimini birebir taşımak zorunda, yoksa require patlar.
function bicimKopya(bicim) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bicim-'));
  fs.mkdirSync(path.join(d, 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(d, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(d, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(d, 'skills', 'relay'), { recursive: true });
  const kaynak = path.join(KOK, 'hooks');
  for (const f of fs.readdirSync(kaynak)) {
    if (!f.endsWith('.js')) continue;
    let govde = fs.readFileSync(path.join(kaynak, f), 'utf8');
    if (f === 'relay-watch.js') {
      const eski = "const BILDIRIM_BICIMI = 'blok';";
      if (!govde.includes(eski)) throw new Error('BILDIRIM_BICIMI sabiti bulunamadı');
      govde = govde.replace(eski, "const BILDIRIM_BICIMI = '" + bicim + "';");
    }
    fs.writeFileSync(path.join(d, 'hooks', f), govde);
  }
  fs.copyFileSync(PREMIUM, path.join(d, 'scripts', 'premium.js'));
  for (const f of fs.readdirSync(path.join(KOK, 'agents')))
    fs.copyFileSync(path.join(KOK, 'agents', f), path.join(d, 'agents', f));
  fs.copyFileSync(
    path.join(KOK, 'skills', 'relay', 'SETTINGS.md'),
    path.join(d, 'skills', 'relay', 'SETTINGS.md')
  );
  return path.join(d, 'hooks', 'relay-watch.js');
}

const AJAN_YUK = (p) => ({
  ...ort(p),
  hook_event_name: 'PreToolUse',
  tool_name: 'Agent',
  tool_input: {
    subagent_type: 'teknesyum:builder',
    model: 'opus',
    description: 'Opus-Ortak Katman',
  },
});

ol('ajan bildirimi Görev kalibina cekildi', () => {
  const { p } = proje(1, 0);
  const m = JSON.parse(calistir(IZLE, AJAN_YUK(p)).out).systemMessage;
  icerir(m, 'Teknesyum ▸ Görev ▸ Opus-Ortak Katman — builder rolünde opus ile açıldı');
});

ol('ajan bitisi de ayni kalibi kullanir', () => {
  const { p } = proje(1, 0);
  calistir(IZLE, AJAN_YUK(p));
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'SubagentStop',
    agent_id: 'a1',
    agent_type: 'teknesyum:builder',
    agent_transcript_path: '/x/a1.jsonl',
  });
  icerir(JSON.parse(r.out).systemMessage, 'Teknesyum ▸ Görev ▸ builder bitti — ');
});

ol('acilis satiri alan listesi olarak kalir', () => {
  const { p } = proje(1, 0);
  const m = JSON.parse(
    calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }).out
  ).systemMessage;
  icerir(m, 'röle kurulu · sözleşme 0/1 bitti · 1 açık');
  esit(m.split('▸').length, 2, 'durum satırına etiket oku girmiş');
});

ol('blok biciminde icerik yeni satirla baslar', () => {
  const { p } = proje(1, 0);
  const m = JSON.parse(calistir(bicimKopya('blok'), AJAN_YUK(p)).out).systemMessage;
  esit(m[0], '\n', 'blok biçiminde satır başı yok');
  icerir(m, 'Teknesyum ▸ Görev ▸ ');
});

ol('sabit satir yapilinca icerik onekle ayni satirda kalir', () => {
  const { p } = proje(1, 0);
  const m = JSON.parse(calistir(bicimKopya('satir'), AJAN_YUK(p)).out).systemMessage;
  if (m.startsWith('\n')) throw new Error('satır biçiminde satır başı kalmış: ' + m);
  icerir(m, 'Teknesyum ▸ Görev ▸ ');
});

ol('dugmeler uc profilde de tanimli', () => {
  const src = fs.readFileSync(PREMIUM, 'utf8');
  const govde = src.slice(src.indexOf('const DUGME'), src.indexOf('function arg'));
  for (const anahtar of ['agent_stall', 'agent_loop']) {
    esit((govde.match(new RegExp(anahtar + ':', 'g')) || []).length, 3, anahtar + ' üç profilde');
  }
  const s = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  icerir(s, 'agent_stall        : 10');
  icerir(s, 'agent_loop         : 5');
});

ol('premium turu sagligi dugmelerini kaydirmaz', () => {
  const { p, cfg } = premiumKopya();
  const once = fs.readFileSync(path.join(p, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  premiumCalistir('ac', p, cfg);
  const sonra = fs.readFileSync(path.join(p, 'skills', 'relay', 'SETTINGS.md'), 'utf8');
  for (const satir of ['agent_stall        : 10', 'agent_loop         : 5']) {
    icerir(once, satir);
    icerir(sonra, satir);
  }
});

// Profil `~/.claude/teknesyum.json` içinden okunuyor; test makinedeki gerçek ayara
// bakmasın diye her koşu kendi konfig kökünü kurar.
function profilKonfigi(ad) {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-profil-cfg-'));
  fs.writeFileSync(path.join(cfg, 'teknesyum.json'), JSON.stringify({ profil: ad }) + '\n');
  return cfg;
}

function profilliOturum(ad, ...ek) {
  const r = spawnSync(process.execPath, [OTURUM, ...ek], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: profilKonfigi(ad) },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

ol('eco kaydi ham transkripti sikistirir, normal bire bir kopyalar', () => {
  const p = oturumProjesi();
  const kaynak = path.join(p, 'kaynak.jsonl');
  esit(
    profilliOturum('eco', 'kaydet', 'eko', '--proje', p, '--transkript', kaynak).kod,
    0,
    'eco kaydet cikis kodu'
  );
  const dip = path.join(p, '.claude', 'oturumlar', 'eko');
  esit(fs.existsSync(path.join(dip, 'ham.jsonl.gz')), true, 'eco gzipli yazmali');
  esit(fs.existsSync(path.join(dip, 'ham.jsonl')), false, 'eco duz kopya birakmamali');
  esit(
    zlib.gunzipSync(fs.readFileSync(path.join(dip, 'ham.jsonl.gz'))).toString('utf8'),
    fs.readFileSync(kaynak, 'utf8'),
    'gzipli kopya kaynakla ayni olmali'
  );
  esit(
    JSON.parse(fs.readFileSync(path.join(dip, 'durum.json'), 'utf8')).ham,
    'ham.jsonl.gz',
    'durum.json hangi ham dosyasi yazildigini soylemeli'
  );

  for (const ad of ['normal', 'premium']) {
    const q = oturumProjesi();
    const k = path.join(q, 'kaynak.jsonl');
    esit(
      profilliOturum(ad, 'kaydet', 'duz', '--proje', q, '--transkript', k).kod,
      0,
      ad + ' kaydet cikis kodu'
    );
    const d = path.join(q, '.claude', 'oturumlar', 'duz');
    esit(fs.existsSync(path.join(d, 'ham.jsonl.gz')), false, ad + ' gzip yazmamali');
    esit(
      fs.readFileSync(path.join(d, 'ham.jsonl'), 'utf8'),
      fs.readFileSync(k, 'utf8'),
      ad + ' bire bir kopyalamali'
    );
  }

  // Profil değişip aynı kayıt tazelenince eski ham dosyası kalmamalı: `--tam` bayat
  // döküm açmasın.
  esit(
    profilliOturum('normal', 'kaydet', 'eko', '--proje', p, '--transkript', kaynak).kod,
    0,
    'ayni kayit normalde tazelenebilmeli'
  );
  esit(fs.existsSync(path.join(dip, 'ham.jsonl.gz')), false, 'gzipli kalinti silinmeli');
  esit(fs.existsSync(path.join(dip, 'ham.jsonl')), true, 'duz kopya yazilmali');
});

ol('eco kaydi --tam ile acilir, ham kaybolunca anlasilir hata verir', () => {
  const p = oturumProjesi();
  const kaynak = path.join(p, 'kaynak.jsonl');
  profilliOturum('eco', 'kaydet', 'eko', '--proje', p, '--transkript', kaynak);
  const tam = profilliOturum('eco', 'yukle', 'eko', '--proje', p, '--tam');
  esit(tam.kod, 0, 'gzipli kayitta --tam calismali');
  icerir(tam.out, 'ilk cevap');

  fs.unlinkSync(path.join(p, '.claude', 'oturumlar', 'eko', 'ham.jsonl.gz'));
  const kaynaktan = profilliOturum('eco', 'yukle', 'eko', '--proje', p, '--tam');
  esit(kaynaktan.kod, 0, 'kaynak transkript diskteyken --tam calismali');
  icerir(kaynaktan.out, 'ilk cevap');

  fs.unlinkSync(kaynak);
  const yok = profilliOturum('eco', 'yukle', 'eko', '--proje', p, '--tam');
  esit(yok.kod, 1, 'ham kaynagi yokken --tam durmali');
  icerir(yok.err, 'ham transkript yok');
  const uyarili = profilliOturum('eco', 'yukle', 'eko', '--proje', p);
  esit(uyarili.kod, 0, 'ozet yine acilmali');
  icerir(uyarili.out, 'UYARI:');
  icerir(uyarili.out, 'ham transkript yok');
});

ol('eco filo dokumu tek satira iner, devam promptu kisalmaz', () => {
  const { dip, evOrt } = filoKur();
  fs.mkdirSync(evOrt.CLAUDE_CONFIG_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(evOrt.CLAUDE_CONFIG_DIR, 'teknesyum.json'),
    JSON.stringify({ profil: 'eco' }) + '\n'
  );
  const r = spawnSync(process.execPath, [OTURUM, 'toplu-yukle', '--kok', dip], {
    encoding: 'utf8',
    env: { ...process.env, ...evOrt, TEKNESYUM_DIL: 'tr' },
  });
  esit(r.status, 0, 'eco filo durumu calismali');
  icerir(r.stdout, '## Alfa');
  icerir(r.stdout, 'röle 1 açık / 1 bitti');
  if (r.stdout.includes('- Klasör:')) throw new Error('eco dort satirlik blogu basti');
  if (r.stdout.includes('submitted: T1')) throw new Error('eco sozlesme adlarini dokmemeli');
  esit((r.stdout.match(/^- /gm) || []).length, 2, 'proje basina tek durum satiri olmali');
  icerir(r.stdout, 'Alfa projesinde kaldığımız yerden devam ediyoruz.');
  icerir(r.stdout, 'T1 submitted');
  icerir(r.stdout, 'Denetim bekleyenden başla.');
  esit((r.stdout.match(/Devam promptu:/g) || []).length, 2, 'her proje kendi promptunu almali');
});

ol('eco baslik tamponu kucultur, normal yarim megabayt okur', () => {
  const dip = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-baslik-'));
  const { ev: evDizin, ort: evOrt } = oturumEvi();
  const p = path.join(dip, 'Gama');
  fs.mkdirSync(path.join(p, '.git'), { recursive: true });
  const t = path.join(evDizin, '.claude', 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
  fs.mkdirSync(t, { recursive: true });
  const dolgu = JSON.stringify({
    type: 'user',
    message: { role: 'user', content: 'x'.repeat(200) },
  });
  const satir = [];
  for (let i = 0; i < 600; i++) satir.push(dolgu);
  satir.push(JSON.stringify({ type: 'ai-title', aiTitle: 'GEC GELEN BASLIK' }));
  const govde = satir.join('\n') + '\n';
  fs.writeFileSync(path.join(t, 'Gama-1.jsonl'), govde);
  if (govde.length < 64 * 1024 || govde.length > 512 * 1024)
    throw new Error('fikstur iki tampon arasinda olmali: ' + govde.length);

  const filo = (ad) => {
    fs.mkdirSync(evOrt.CLAUDE_CONFIG_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(evOrt.CLAUDE_CONFIG_DIR, 'teknesyum.json'),
      JSON.stringify({ profil: ad }) + '\n'
    );
    return spawnSync(process.execPath, [OTURUM, 'toplu-yukle', '--kok', dip], {
      encoding: 'utf8',
      env: { ...process.env, ...evOrt, TEKNESYUM_DIL: 'tr' },
    }).stdout;
  };
  if (filo('eco').includes('GEC GELEN BASLIK')) throw new Error('eco 64 kB tamponun otesini okudu');
  icerir(filo('normal'), 'GEC GELEN BASLIK');
});

ol('durum uc profilin ayirt edici degerlerini basar', () => {
  const { p, cfg } = premiumKopya();
  const beklenen = {
    eco: ['paralel: 1 ajan', 'ön araştırma: 1+ depo', 'denetim: critical'],
    normal: ['paralel: 2 ajan', 'ön araştırma: 10+ depo', 'denetim: every-contract'],
    premium: ['paralel: 20 ajan', 'ön araştırma: 50+ depo', 'denetim: every-contract'],
  };
  for (const ad of ['eco', 'normal', 'premium']) {
    esit(premiumCalistir(ad, p, cfg).kod, 0, ad + ' cikis kodu');
    const out = premiumCalistir('durum', p, cfg).out;
    icerir(out, 'yürürlükteki profil: ' + ad);
    for (const s of beklenen[ad]) icerir(out, s);
  }
});

ol('premium yardimi ve belgesi uc profili esit anlatir', () => {
  const y = spawnSync(process.execPath, [PREMIUM], { encoding: 'utf8' }).stdout || '';
  for (const s of ['node premium.js eco', 'node premium.js normal', 'node premium.js premium'])
    icerir(y, s);
  icerir(y, 'ham.jsonl.gz');
  const k = fs.readFileSync(path.join(KOK, 'commands', 'premium.md'), 'utf8');
  icerir(k, 'üç profil arasında geçiş');
  for (const b of ['## eco', '## normal', '## premium']) icerir(k, b);
  icerir(k, 'ham.jsonl.gz');
});

ol('premium belgesi ve yardimi hicbir yere yazmadigini soyler', () => {
  const y = spawnSync(process.execPath, [PREMIUM], { encoding: 'utf8' }).stdout || '';
  icerir(y, 'Hiçbiri depo dosyası yazmaz');
  const k = fs.readFileSync(path.join(KOK, 'commands', 'premium.md'), 'utf8');
  icerir(k, '**Betik hiçbir depo dosyası yazmaz.**');
  icerir(k, 'oturum profili → proje');
  icerir(k, '`model` alanı yoktur');
  for (const eski of ['Betik ajan frontmatter', 'uyuşmazlığı söyler'])
    if (k.includes(eski)) throw new Error('belge hâlâ yazan betigi anlatiyor: ' + eski);
});

// CLI gövdesi `require.main` arkasında: kanca `premium.js`'i sapma tablosu için require
// ediyor, o sırada `yardim()` çalışıp stdout'a yazsaydı kancanın JSON çıktısı bozulurdu.
ol('premium.js require edildiginde CLI calismaz', () => {
  const r = spawnSync(
    process.execPath,
    ['-e', 'require(process.argv[1]);process.stdout.write("SESSIZ")', PREMIUM],
    { encoding: 'utf8' }
  );
  esit((r.stdout || '').trim(), 'SESSIZ', 'require CLI ciktisi bastı: ' + r.stdout);
  esit(r.status, 0, 'require cikis kodu');
});

console.log('\nSürüm kontrolü');

const SURUM = path.join(KOK, 'scripts', 'surum.js');
const surum = require(SURUM);

// Uzak sorgu hiç gerçek ağa çıkmamalı: `origin` yerel bir bare depoya bakar, `ls-remote`
// dosya sisteminden okur. CI ağsız koşabilir.
function git(a, d) {
  spawnSync('git', a, { cwd: d, stdio: 'ignore' });
}

function surumKur(kuruluSurum, etiket, pazarsiz) {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-surum-'));
  const bare = path.join(c, 'bare');
  fs.mkdirSync(bare);
  git(['init', '-q', '--bare'], bare);
  const w = path.join(c, 'w');
  fs.mkdirSync(w);
  git(['init', '-q'], w);
  git(['config', 'user.email', 't@t'], w);
  git(['config', 'user.name', 't'], w);
  fs.writeFileSync(path.join(w, 'a'), 'x');
  git(['add', 'a'], w);
  git(['commit', '-qm', 'x'], w);
  for (const e of [].concat(etiket)) git(['tag', e], w);
  git(['remote', 'add', 'origin', bare], w);
  git(['push', '-q', 'origin', 'HEAD', '--tags'], w);
  const mp = path.join(c, 'plugins', 'marketplaces', 'teknesyum');
  if (!pazarsiz) {
    fs.mkdirSync(mp, { recursive: true });
    git(['init', '-q'], mp);
    git(['remote', 'add', 'origin', bare], mp);
  }
  if (kuruluSurum) {
    fs.mkdirSync(path.join(c, 'plugins'), { recursive: true });
    fs.writeFileSync(
      path.join(c, 'plugins', 'installed_plugins.json'),
      JSON.stringify({
        version: 2,
        plugins: { 'teknesyum@teknesyum': [{ version: kuruluSurum, gitCommitSha: 'abc123' }] },
      })
    );
  }
  return { cfg: c, pazar: mp, damga: path.join(c, 'teknesyum', 'live', '_surum') };
}

function surumAcilis(cfg) {
  const { p } = proje(1, 0);
  const r = calistir(
    IZLE,
    { ...ort(p), hook_event_name: 'SessionStart' },
    { CLAUDE_CONFIG_DIR: cfg }
  );
  return JSON.parse(r.out || '{}').systemMessage || '';
}

function surumCalistir(cfg, ek) {
  const r = spawnSync(process.execPath, [SURUM].concat(ek || []), {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg },
  });
  return { out: (r.stdout || '').trim(), kod: r.status };
}

ol('karsilastir semveri sayisal siralar, dizgi olarak degil', () => {
  esit(surum.karsilastir('2.10.0', '2.9.0'), 1, '2.10.0 > 2.9.0');
  esit(surum.karsilastir('2.9.0', '2.10.0'), -1, '2.9.0 < 2.10.0');
  esit(surum.karsilastir('2.40.0', '2.40.0'), 0, '2.40.0 == 2.40.0');
  esit(surum.karsilastir('3.0.0', '2.99.9'), 1, '3.0.0 > 2.99.9');
});

ol('uzak en yuksek etiketi secer, v onekini kirpar', () => {
  const { pazar } = surumKur(null, ['v2.9.0', 'v2.10.0', 'v2.10.0-rc1', 'bozuk']);
  esit(surum.uzak(pazar), '2.10.0');
});

ol('uzak erisilemeyen depoda null doner, cokmez', () => {
  const { cfg, pazar } = surumKur(null, 'v1.0.0');
  fs.rmSync(path.join(pazar, '.git', 'config'), { force: true });
  esit(surum.uzak(pazar), null, 'origin okunamayinca null');
  esit(surum.uzak(path.join(cfg, 'boyle-bir-depo-yok')), null, 'depo yokken null');
});

ol('uzak cagrisi zaman asimiyla sinirli — acilis askida kalmaz', () => {
  const src = fs.readFileSync(SURUM, 'utf8');
  icerir(src, 'timeout: UZAK_ZAMAN_ASIMI');
  const m = src.match(/UZAK_ZAMAN_ASIMI\s*=\s*(\d+)/);
  if (!m) throw new Error('UZAK_ZAMAN_ASIMI sabiti yok');
  if (Number(m[1]) > 3000) throw new Error('zaman asimi cok uzun: ' + m[1]);
});

ol('--json ciktisi ayristirilabilir', () => {
  const { cfg } = surumKur('1.0.0', 'v9.9.9');
  const r = surumCalistir(cfg, ['--json']);
  esit(r.kod, 0, 'cikis kodu');
  const j = JSON.parse(r.out);
  esit(j.kurulu, '1.0.0');
  esit(j.uzak, '9.9.9');
  esit(j.yeni, true);
  esit(j.sha, 'abc123');
  esit(j.komut, 'claude plugin update teknesyum@teknesyum');
});

ol('bayraksiz calistirmada insan okur satir cikar', () => {
  const { cfg } = surumKur('9.9.9', 'v9.9.9');
  const r = surumCalistir(cfg);
  esit(r.kod, 0, 'cikis kodu');
  icerir(r.out, 'güncel');
  icerir(r.out, '9.9.9');
});

ol('yeni surum varken acilis satiri cikar', () => {
  const { cfg } = surumKur('1.0.0', 'v9.9.9');
  const m = surumAcilis(cfg);
  icerir(m, 'Teknesyum ▸ Güncelleme ▸ 9.9.9 çıktı, kurulu sürüm 1.0.0 — /update ile güncelle');
});

ol('guncelken acilis satiri cikmaz', () => {
  const { cfg } = surumKur('9.9.9', 'v9.9.9');
  const m = surumAcilis(cfg);
  if (m.includes('Güncelleme ▸')) throw new Error('guncelken satir cikti: ' + m);
});

ol('damga tazeyken ikinci kontrol yapilmaz', () => {
  const { cfg, damga } = surumKur('1.0.0', 'v9.9.9');
  icerir(surumAcilis(cfg), 'Güncelleme ▸');
  if (!fs.existsSync(damga)) throw new Error('damga yazilmadi: ' + damga);
  const ikinci = surumAcilis(cfg);
  if (ikinci.includes('Güncelleme ▸')) throw new Error('damga tazeyken tekrar bakildi');
  fs.rmSync(damga);
  icerir(surumAcilis(cfg), 'Güncelleme ▸', 'damga silinince tekrar bakilmali');
});

ol('damga eskiyince yeniden bakilir', () => {
  const { cfg, damga } = surumKur('1.0.0', 'v9.9.9');
  surumAcilis(cfg);
  const eski = Date.now() - 25 * 60 * 60 * 1000;
  fs.utimesSync(damga, eski / 1000, eski / 1000);
  icerir(surumAcilis(cfg), 'Güncelleme ▸');
});

ol('pazar deposu yokken acilis sessiz kalir ve beklemez', () => {
  const { cfg } = surumKur('1.0.0', 'v9.9.9', true);
  const t = Date.now();
  const m = surumAcilis(cfg);
  if (m.includes('Güncelleme ▸')) throw new Error('depo yokken satir cikti: ' + m);
  if (Date.now() - t > 3000) throw new Error('acilis bekledi: ' + (Date.now() - t) + 'ms');
});

ol('kurulu kayit okunamayinca acilis sessiz kalir', () => {
  const { cfg } = surumKur(null, 'v9.9.9');
  const m = surumAcilis(cfg);
  if (m.includes('Güncelleme ▸')) throw new Error('kayit yokken satir cikti: ' + m);
});

ol('/update komutu marketplace adli cagriyi verir', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'update.md'), 'utf8');
  icerir(k, 'claude plugin update teknesyum@teknesyum');
  icerir(k, 'scripts/surum.js');
  icerir(k, '--json');
  icerir(k, '/premium');
  const h = fs.readFileSync(path.join(KOK, 'commands', 'help.md'), 'utf8');
  icerir(h, '| `/update` |');
});

const TARAMA = path.join(KOK, 'scripts', 'tarama.js');

function taramaProje(depo) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-tarama-'));
  fs.mkdirSync(path.join(p, '.claude', 'relay', 'contracts', 'done'), { recursive: true });
  fs.mkdirSync(path.join(p, 'docs', 'taramalar'), { recursive: true });
  fs.mkdirSync(path.join(p, 'src'), { recursive: true });
  for (let i = 0; i < (depo || 0); i++)
    fs.writeFileSync(path.join(p, 'docs', 'taramalar', 'depo' + i + '.md'), '# depo\n');
  fs.writeFileSync(path.join(p, 'src', 'a.js'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(p, 'src', 'b.js'), 'module.exports = 2;\n');
  fs.writeFileSync(path.join(p, 'README.md'), '# proje\n');
  fs.writeFileSync(path.join(p, 'CHANGELOG.md'), '## [1.0.0]\n');
  fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }));
  return p;
}

function taramaCalistir(p, ...arg) {
  const r = spawnSync(process.execPath, [TARAMA, ...arg, '--proje', p], { encoding: 'utf8' });
  return { out: r.stdout || '', err: r.stderr || '', kod: r.status };
}

function kapsamKur(p, kayit) {
  fs.writeFileSync(path.join(p, '.claude', 'relay', 'kapsam.json'), JSON.stringify(kayit));
}

function agac(kok) {
  const out = [];
  const yigin = [kok];
  while (yigin.length) {
    const d = yigin.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const tam = path.join(d, e.name);
      if (e.isDirectory()) yigin.push(tam);
      else out.push(path.relative(kok, tam) + ':' + fs.statSync(tam).size);
    }
  }
  return out.sort();
}

ol('tarama profil verilmeden kullanimi basip cikar', () => {
  const r = spawnSync(process.execPath, [TARAMA], { encoding: 'utf8' });
  esit(r.status, 2, 'kullanim kodu');
  icerir(r.stdout, 'kullanım:');
  esit(
    spawnSync(process.execPath, [TARAMA, '--json'], { encoding: 'utf8' }).status,
    2,
    'bayrak profil yerine gecmez'
  );
});

function taramaKapsayici() {
  const kap = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kapsayici-'));
  for (const ad of ['alfa', 'beta']) {
    fs.mkdirSync(path.join(kap, ad), { recursive: true });
    fs.writeFileSync(path.join(kap, ad, 'package.json'), '{"name":"' + ad + '"}');
  }
  return kap;
}

ol('tarama kapsayici klasorde olcmeden durur', () => {
  const kap = taramaKapsayici();
  const r = taramaCalistir(kap, 'premium', '--tamamla');
  esit(r.kod, 2, 'kapsayici kullanim hatasidir, kaldi degil');
  icerir(r.out, 'DURDU');
  icerir(r.out, 'kapsayıcı klasör');
  icerir(r.out, 'alt projeler: alfa, beta');
  icerir(r.out, '--proje');
  icerir(r.out, '<yeni-ad>');
  icermez(r.out, 'SONUÇ:');
});

ol('tarama kapsayici kapisini --kapsayici asar', () => {
  const kap = taramaKapsayici();
  const r = taramaCalistir(kap, 'eco', '--kapsayici');
  icermez(r.out, 'DURDU');
  icerir(r.out, 'SONUÇ:');
});

ol('tarama kapsayici raporu --json ile ayristirilabilir', () => {
  const kap = taramaKapsayici();
  const j = JSON.parse(taramaCalistir(kap, 'normal', '--json').out);
  esit(j.durum, 'kapsayici', 'durum alani');
  esit(j.altlar.join(','), 'alfa,beta', 'alt proje listesi');
});

ol('tarama ustundeki role klasoru projeyi kapsayici saydirmaz', () => {
  const p = taramaProje(1);
  const alt = path.join(p, 'ic');
  fs.mkdirSync(path.join(alt, 'x'), { recursive: true });
  fs.writeFileSync(path.join(alt, 'x', 'package.json'), '{}');
  const r = taramaCalistir(p, 'eco');
  icermez(r.out, 'DURDU');
});

ol('kapsayici.kesin role klasorune aldanmaz', () => {
  const k = require(path.join(KOK, 'hooks', 'kapsayici.js'));
  const kap = taramaKapsayici();
  fs.mkdirSync(path.join(kap, '.claude', 'relay'), { recursive: true });
  const s = k.kesin(kap);
  esit(!!s, true, 'role klasoru kapsayiciyi projeye cevirmemeli');
  esit(k.kok(kap), null, 'gevsek olcu role klasorune takiliyor — kesin olcu bunun icin var');
  fs.writeFileSync(path.join(kap, 'package.json'), '{}');
  esit(k.kesin(kap), null, 'guclu iz varsa proje sayilir');
});

ol('tarama esikleri premium.js DUGME tablosundan okur, kopyalamaz', () => {
  const t = require(TARAMA).dugmeTablosu();
  esit(t.eco.research_repos, '1', 'eco');
  esit(t.normal.research_repos, '10', 'normal');
  esit(t.premium.research_repos, '50', 'premium');
  esit(t.premium.default_model, 'opus', 'premium modeli');
  esit(t.eco.audit, 'critical', 'eco denetimi');
  esit(
    /research_repos[ \t]*:/.test(fs.readFileSync(TARAMA, 'utf8')),
    false,
    'esik ikinci kez yazilmamali'
  );
});

ol('uc profil uc farkli on arastirma esigi uygular', () => {
  const p = taramaProje(3);
  const madde = (profil) => JSON.parse(taramaCalistir(p, profil, '--json').out).maddeler[0];
  esit(madde('eco').esik, 1, 'eco esigi');
  esit(madde('normal').esik, 10, 'normal esigi');
  esit(madde('premium').esik, 50, 'premium esigi');
  esit(madde('eco').gecti, true, '3 depo eco esigini gecer');
  esit(madde('normal').gecti, false, '3 depo normal esiginin altinda');
});

ol('uc profil uc farkli kapsam kipi uygular', () => {
  const p = taramaProje(50);
  const kapsam = (profil) => JSON.parse(taramaCalistir(p, profil, '--json').out).maddeler[1];
  esit(kapsam('premium').hedef, 2, 'premium her kaynak dosyayi ister');
  esit(kapsam('premium').gereken.model, 'opus', 'premium modeli');
  esit(kapsam('premium').gereken.efor, 'high', 'premium eforu');
  esit(kapsam('eco').gereken.model, 'haiku', 'eco modeli');
  esit(kapsam('eco').gereken.efor, null, 'eco efor sarti koymaz');
  esit(kapsam('normal').gereken.model, 'sonnet', 'normal modeli');
});

ol('tarama incelenmemis dosyayi raporlar', () => {
  const p = taramaProje(50);
  kapsamKur(p, {
    'src/a.js': { model: 'claude-opus-4-5', effort: 'xhigh', t: '2026-08-22 10:00:00', ajan: 'T0' },
  });
  const r = taramaCalistir(p, 'premium');
  esit(r.kod, 1, 'eksik varken kaldi');
  icerir(r.out, 'incelenmemiş: src/b.js');
  if (r.out.includes('incelenmemiş: src/a.js')) throw new Error('incelenen dosya sayilmali');
});

ol('tarama profilin altinda model ve efor ile incelenmis dosyayi ayirir', () => {
  const p = taramaProje(50);
  kapsamKur(p, {
    'src/a.js': { model: 'claude-haiku-4-5', effort: 'xhigh', t: '2026-08-22 10:00:00', ajan: 'x' },
    'src/b.js': { model: 'claude-opus-4-5', effort: 'medium', t: '2026-08-22 10:00:00', ajan: 'y' },
  });
  const r = taramaCalistir(p, 'premium');
  icerir(r.out, 'src/a.js — claude-haiku-4-5, opus gerekli');
  icerir(r.out, 'src/b.js — efor medium, high gerekli');
  const j = JSON.parse(taramaCalistir(p, 'premium', '--json').out);
  esit(j.maddeler[1].incelenmemis.length, 0, 'ikisi de kayitta');
  esit(j.maddeler[1].dusuk.length, 2, 'ikisi de profilin altinda');
});

ol('tarama muhursuz sozlesmeyi sayar, mühürlüyü gecirir', () => {
  const p = taramaProje(50);
  const done = path.join(p, '.claude', 'relay', 'contracts', 'done');
  fs.writeFileSync(path.join(done, 'T1.md'), MUHURLU + '# is\n');
  fs.writeFileSync(path.join(done, 'T2.md'), '---\nstatus: done\naudit: —\n---\n');
  const j = JSON.parse(taramaCalistir(p, 'premium', '--json').out);
  esit(j.maddeler[2].muhursuz.join(','), 'T2.md', 'yalniz muhursuz olan');
  icerir(taramaCalistir(p, 'premium').out, 'mühürsüz: T2.md');
});

ol('eco denetimi yalniz kritik sozlesmeye bakar', () => {
  const p = taramaProje(50);
  const done = path.join(p, '.claude', 'relay', 'contracts', 'done');
  fs.writeFileSync(path.join(done, 'T1.md'), '---\nowns:\n  - a\n  - b\n  - c\naudit: —\n---\n');
  fs.writeFileSync(path.join(done, 'T2.md'), '---\nowns:\n  - a\naudit: —\n---\n');
  esit(JSON.parse(taramaCalistir(p, 'eco', '--json').out).maddeler[2].muhursuz.length, 1, 'eco');
  esit(
    JSON.parse(taramaCalistir(p, 'premium', '--json').out).maddeler[2].muhursuz.length,
    2,
    'premium'
  );
});

ol('tarama belge tutarliligini surumle karsilastirir', () => {
  const p = taramaProje(50);
  esit(JSON.parse(taramaCalistir(p, 'normal', '--json').out).maddeler[3].gecti, true, 'README var');
  fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ name: 'x', version: '2.0.0' }));
  const r = taramaCalistir(p, 'premium');
  icerir(r.out, 'CHANGELOG.md — 1.0.0 ≠ 2.0.0');
  esit(JSON.parse(taramaCalistir(p, 'eco', '--json').out).maddeler[3].gecti, true, 'eco sart yok');
});

ol('tarama --json ayristirilabilir', () => {
  const p = taramaProje(1);
  const r = taramaCalistir(p, 'eco', '--json');
  const j = JSON.parse(r.out);
  esit(j.profil, 'eco');
  esit(j.maddeler.length, 4, 'dort madde');
  esit(
    j.maddeler.map((m) => m.ad).join(','),
    'Ön araştırma,Kapsam,Denetim,Belge tutarlılığı',
    'madde adlari'
  );
  esit(Array.isArray(j.maddeler[1].incelenmemis), true, 'incelenmemis listesi');
});

ol('tarama --tamamla hicbir dosyayi degistirmez', () => {
  const p = taramaProje(2);
  const once = agac(p).join('|');
  const r = taramaCalistir(p, 'premium', '--tamamla');
  icerir(r.out, '--tamamla · bu betik hiçbir dosyaya yazmadı');
  icerir(r.out, 'paralel tavan 20');
  esit(agac(p).join('|'), once, 'dosya agaci degismemeli');
  const b = taramaCalistir(p, 'premium');
  if (b.out.includes('--tamamla ·')) throw new Error('bayraksiz cagride tamamla boumu cikti');
});

ol('kapsam kaydi SubagentStop ile dolar', () => {
  const { p } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kapsam-'));
  const at = path.join(d, 'agent-k1.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', effort: 'xhigh', message: { model: 'claude-opus-4-5' } }) +
      '\n'
  );
  const olay = (ek) =>
    calistir(
      IZLE,
      { ...ort(p), agent_id: 'k1', agent_type: 'teknesyum:builder', ...ek },
      konfig(true)
    );
  olay({
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    tool_input: { file_path: path.join(p, 'src', 'x.js') },
  });
  olay({ hook_event_name: 'SubagentStop', agent_transcript_path: at, effort: { level: 'high' } });
  const k = JSON.parse(fs.readFileSync(path.join(p, '.claude', 'relay', 'kapsam.json'), 'utf8'));
  esit(k['src/x.js'].model, 'claude-opus-4-5', 'model');
  esit(k['src/x.js'].effort, 'xhigh', 'efor');
  esit(k['src/x.js'].ajan, 'builder', 'ajan');
});

ol('kapsam kaydi ana oturum dokunusunu da alir', () => {
  const { p } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-anakapsam-'));
  const tp = path.join(d, 'oturum-1.jsonl');
  fs.writeFileSync(
    tp,
    JSON.stringify({ type: 'assistant', effort: 'high', message: { model: 'claude-opus-4-5' } }) +
      '\n'
  );
  calistir(
    IZLE,
    {
      cwd: p,
      session_id: 'oturum-1',
      transcript_path: tp,
      hook_event_name: 'PostToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: path.join(p, 'src', 'y.js') },
    },
    konfig(true)
  );
  const k = JSON.parse(fs.readFileSync(path.join(p, '.claude', 'relay', 'kapsam.json'), 'utf8'));
  esit(k['src/y.js'].ajan, 'ana oturum', 'ana oturum sayilmali');
  esit(k['src/y.js'].model, 'claude-opus-4-5', 'model');
});

ol('kapsam kaydi sozlesme dosyasini incelenen dosya saymaz', () => {
  const { p } = proje(1, 0);
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kapsam-s-'));
  const tp = path.join(d, 'oturum-1.jsonl');
  fs.writeFileSync(tp, JSON.stringify({ type: 'assistant', message: { model: 'x' } }) + '\n');
  const dokun = (hedef) =>
    calistir(
      IZLE,
      {
        cwd: p,
        session_id: 'oturum-1',
        transcript_path: tp,
        hook_event_name: 'PostToolUse',
        tool_name: 'Edit',
        tool_input: { file_path: hedef },
      },
      konfig(true)
    );
  dokun(path.join(p, '.claude', 'relay', 'contracts', 'T0.md'));
  dokun(path.join(p, 'src', 'z.js'));
  const k = JSON.parse(fs.readFileSync(path.join(p, '.claude', 'relay', 'kapsam.json'), 'utf8'));
  esit(Object.keys(k).join(','), 'src/z.js', 'yalniz kaynak dosya kayda girmeli');
});

ol('/scan komutu uc profili esit anlatir ve betigi cagirir', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'scan.md'), 'utf8');
  icerir(k, 'scripts/tarama.js');
  icerir(k, '$ARGUMENTS');
  for (const profil of ['eco', 'normal', 'premium']) icerir(k, '`' + profil + '`');
  icerir(k, '--tamamla');
  icerir(k, 'kapsam.json');
  const h = fs.readFileSync(path.join(KOK, 'commands', 'help.md'), 'utf8');
  icerir(h, '| `/scan` |');
});

const EKRAN = path.join(KOK, 'hooks', 'ekran-kapisi.js');
const SID = 'oturum-1';

function ekranKok(c) {
  return path.join(c, 'teknesyum', 'live');
}

function ekranCfg(kapaliMi) {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ekran-'));
  fs.mkdirSync(ekranKok(c), { recursive: true });
  if (kapaliMi) fs.writeFileSync(path.join(c, 'teknesyum.json'), '{"ekran_kapisi":false}');
  return c;
}

function ekranTurYolu(c) {
  return path.join(ekranKok(c), SID + '.tur');
}

function ekranTur(c, ms) {
  const t = ms || Date.now();
  fs.writeFileSync(ekranTurYolu(c), JSON.stringify({ t, son: t, durak: 0, boy: 0 }));
}

function ekranTurDokun(c) {
  const d = JSON.parse(fs.readFileSync(ekranTurYolu(c), 'utf8'));
  d.son = Date.now();
  d.durak = (d.durak || 0) + 1;
  fs.writeFileSync(ekranTurYolu(c), JSON.stringify(d));
  const ileri = Date.now() / 1000 + 5;
  fs.utimesSync(ekranTurYolu(c), ileri, ileri);
}

function ekranTurBitir(c) {
  fs.unlinkSync(ekranTurYolu(c));
}

function ekranDurumu(c) {
  return JSON.parse(fs.readFileSync(path.join(ekranKok(c), SID + '.ekran.json'), 'utf8'));
}

function ekranYaz(c, d) {
  fs.writeFileSync(path.join(ekranKok(c), SID + '.ekran.json'), JSON.stringify(d));
}

function ekranCagri(c, yuk) {
  return calistir(
    EKRAN,
    { session_id: SID, hook_event_name: 'PreToolUse', ...yuk },
    { CLAUDE_CONFIG_DIR: c, CLAUDE_CODE_SESSION_ID: SID }
  );
}

function ekranArac(c, arac, ek) {
  return ekranCagri(c, { tool_name: arac, tool_input: ek || {} });
}

function ekranBash(c, komut, cwd) {
  return ekranCagri(c, { tool_name: 'Bash', tool_input: { command: komut }, cwd: cwd || '.' });
}

function ekranAc(c, dakika) {
  const arg = dakika === undefined ? [] : [String(dakika)];
  const r = spawnSync(process.execPath, [EKRAN, '--ac', ...arg], {
    encoding: 'utf8',
    env: {
      ...process.env,
      TEKNESYUM_DIL: 'tr',
      CLAUDE_CONFIG_DIR: c,
      CLAUDE_CODE_SESSION_ID: SID,
    },
  });
  return (r.stdout || '').trim();
}

ol('ekran kapisi computer-use cagrisini kapaliyken engeller aciksa gecirir', () => {
  const c = ekranCfg();
  const kapali = ekranArac(c, 'mcp__computer-use__computer');
  esit(kapali.kod, 2, 'kapali kapi exit 2 vermeli');
  icerir(kapali.err, 'ENGELLENDİ');
  ekranTur(c);
  ekranAc(c);
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 0, 'acik kapi gecirmeli');
});

ol('ekran kapisi Windows-MCP okuma araclarini hicbir zaman engellemez', () => {
  const c = ekranCfg();
  for (const arac of [
    'Screenshot',
    'Snapshot',
    'Scrape',
    'PowerShell',
    'FileSystem',
    'Registry',
    'Process',
    'Wait',
    'Clipboard',
  ]) {
    esit(ekranArac(c, 'mcp__Windows-MCP__' + arac).kod, 0, arac + ' muaf olmali');
  }
});

ol('ekran kapisi Windows-MCP Click cagrisini kapaliyken engeller', () => {
  const c = ekranCfg();
  esit(ekranArac(c, 'mcp__Windows-MCP__Click').kod, 2, 'Click engellenmeli');
  esit(ekranArac(c, 'mcp__Windows-MCP__Type').kod, 2, 'Type engellenmeli');
});

ol('ekran kapisi ayni turda bes denemede tek bildirim basar', () => {
  const c = ekranCfg();
  ekranTur(c);
  let bildirim = 0;
  for (let i = 0; i < 5; i++) {
    const r = ekranArac(c, 'mcp__computer-use__computer');
    esit(r.kod, 2, 'her deneme engellenmeli');
    if (r.out) bildirim++;
    ekranTurDokun(c);
  }
  esit(bildirim, 1, 'tur basina tek bildirim');
  esit(ekranDurumu(c).kuyruk['mcp__computer-use__computer'].kez, 5, 'kuyruk bes saymali');
});

ol('ekran kapisi yeni turda bildirimi bir kez daha basar', () => {
  const c = ekranCfg();
  ekranTur(c, Date.now() - 90000);
  esit(ekranArac(c, 'mcp__computer-use__computer').out === '', false, 'ilk turda bildirim');
  ekranTurDokun(c);
  esit(ekranArac(c, 'mcp__computer-use__computer').out, '', 'ayni turda ikinci bildirim yok');
  ekranTurBitir(c);
  ekranTur(c, Date.now());
  esit(ekranArac(c, 'mcp__computer-use__computer').out === '', false, 'yeni turda bildirim');
});

ol('ekran_kapisi false iken hicbir cagri engellenmez', () => {
  const c = ekranCfg(true);
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 0, 'surucu gecmeli');
  esit(ekranArac(c, 'mcp__Windows-MCP__Click').kod, 0, 'Click gecmeli');
  esit(ekranBash(c, 'dotnet run').kod, 0, 'dotnet run gecmeli');
});

ol('/ekran bir tur acar sonraki turda kapi yine kapalidir', () => {
  const c = ekranCfg();
  ekranTur(c, Date.now() - 60000);
  icerir(ekranAc(c), 'bir tur');
  ekranTurDokun(c);
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 0, 'tur ici olay kapiyi kapatmamali');
  ekranTurDokun(c);
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 0, 'acildigi turda gecmeli');
  ekranTurBitir(c);
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 2, 'tur bitince kapali');
  ekranTur(c, Date.now());
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 2, 'sonraki turda kapali');
});

ol('/ekran tur damgasi yokken kapiyi acmaz', () => {
  const c = ekranCfg();
  icerir(ekranAc(c), 'kapalı tarafa');
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 2, 'damgasiz tek tur acilmamali');
  esit(
    fs.existsSync(path.join(ekranKok(c), SID + '.ekran.json')) && ekranDurumu(c).acik,
    undefined
  );
  icerir(ekranAc(c, 10), '10 dakika');
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 0, 'sureli acma damgasiz da calismali');
});

ol('/ekran kuyrugu sifirlar', () => {
  const c = ekranCfg();
  ekranArac(c, 'mcp__computer-use__computer');
  ekranArac(c, 'mcp__computer-use__computer');
  icerir(ekranAc(c, 5), 'mcp__computer-use__computer ×2');
  esit(Object.keys(ekranDurumu(c).kuyruk).length, 0, 'kuyruk bosalmali');
  esit(ekranAc(c, 5).includes('Kuyrukta'), false, 'ikinci acmada eski sayac gorunmemeli');
});

ol('/ekran 10 on dakika acik tutar damga eskiyince kapanir', () => {
  const c = ekranCfg();
  icerir(ekranAc(c, 10), '10 dakika');
  esit(ekranDurumu(c).acik.dakika, 10, 'sure kaydedilmeli');
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 0, 'sure icinde gecmeli');
  const d = ekranDurumu(c);
  d.acik.ts = Date.now() - 11 * 60000;
  ekranYaz(c, d);
  esit(ekranArac(c, 'mcp__computer-use__computer').kod, 2, 'sure dolunca kapanmali');
});

ol('ekran kapisi dotnet test ve build cagrilarini hicbir zaman engellemez', () => {
  const c = ekranCfg();
  for (const k of [
    'dotnet test',
    'dotnet build',
    'dotnet restore',
    'dotnet build -c Release --no-restore',
    'dotnet test tests/X.Tests --logger trx',
    'npm test',
    'dotnet build && dotnet test',
  ]) {
    esit(ekranBash(c, k).kod, 0, k + ' engellenmemeli');
  }
});

ol('ekran kapisi dotnet run ve pencere acan komutlari kapaliyken engeller', () => {
  const c = ekranCfg();
  for (const k of [
    'dotnet run',
    'dotnet run --project src/App',
    'dotnet build && dotnet run',
    'npm run electron:dev',
    'yarn electron',
    'Start-Process bin/Release/App.exe',
    './bin/Debug/net8.0-windows/App.exe',
  ]) {
    esit(ekranBash(c, k).kod, 2, k + ' engellenmeli');
  }
  ekranTur(c);
  ekranAc(c);
  esit(ekranBash(c, 'dotnet run').kod, 0, '/ekran sonrasi gecmeli');
});

ol('ekran kapisi komut metninde gecen ama calistirmayan kullanimi gecirir', () => {
  const c = ekranCfg();
  for (const k of [
    'echo dotnet run',
    'git commit -m "dotnet run duzeltmesi"',
    'rg "dotnet run"',
    'ls bin/Debug/net8.0/App.exe',
    'rm bin/Release/App.exe',
    'grep -n "npm run electron" package.json',
    'cat docs/x.md | rg "Start-Process App.exe"',
    'sed -i "s/dotnet run/dotnet test/" README.md',
  ]) {
    esit(ekranBash(c, k).kod, 0, k + ' engellenmemeli');
  }
});

ol('ekran kapisi bassiz bayrak tasiyan komutu kapaliyken de gecirir', () => {
  const c = ekranCfg();
  for (const k of [
    'dotnet run -- --headless',
    'dotnet run --project src/App -- --test',
    'npm run electron -- --headless',
    'dotnet run -- --offscreen',
  ]) {
    esit(ekranBash(c, k).kod, 0, k + ' gecmeli');
  }
});

ol('ekran kapisi npm start yalniz electron projesinde engellenir', () => {
  const c = ekranCfg();
  const bos = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-npm-'));
  fs.writeFileSync(path.join(bos, 'package.json'), '{"name":"x"}');
  esit(ekranBash(c, 'npm start', bos).kod, 0, 'electron olmayan projede gecmeli');
  const el = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-el-'));
  fs.writeFileSync(path.join(el, 'package.json'), '{"devDependencies":{"electron":"30"}}');
  esit(ekranBash(c, 'npm start', el).kod, 2, 'electron projesinde engellenmeli');
});

ol('ekran kapisi engelleme mesaji bassiz alternatifi ve pencere recetesini verir', () => {
  const c = ekranCfg();
  const m = ekranBash(c, 'dotnet run').err;
  icerir(m, 'dotnet test');
  icerir(m, 'UIA');
  icerir(m, 'ShowActivated=false');
  icerir(m, 'Left=-32000');
  icerir(m, '/ekran');
  icerir(m, 'masaustu-izolasyon.md');
  icerir(ekranArac(c, 'mcp__computer-use__computer').err, '/ekran');
});

ol('ekran kapisi hooks.json ile baglidir ve tek blokla sokulur', () => {
  const h = JSON.parse(fs.readFileSync(path.join(KOK, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const blok = h.PreToolUse.filter((x) => /ekran-kapisi/.test(JSON.stringify(x)));
  esit(blok.length, 1, 'kapi tek blokta durmali');
  icerir(blok[0].matcher, 'Bash');
  icerir(blok[0].matcher, 'computer-use');
  icerir(blok[0].matcher, 'Windows-MCP');
  const k = fs.readFileSync(path.join(KOK, 'commands', 'ekran.md'), 'utf8');
  icerir(k, 'hooks/ekran-kapisi.js');
  icerir(k, 'argument-hint: [dakika]');
  icerir(k, 'ekran_kapisi');
  icermez(fs.readFileSync(IZLE, 'utf8'), 'ekran-kapisi');
  const d = fs.readFileSync(path.join(__dirname, '..', 'docs', 'masaustu-izolasyon.md'), 'utf8');
  icerir(d, 'ekran_kapisi');
  icerir(d, 'hooks/ekran-kapisi.js');
});

console.log(
  '\n' + (kaldi.length ? '⨯ KALDI' : '✓ GEÇTİ') + '  ' + gecti + '/' + (gecti + kaldi.length)
);
if (kaldi.length) {
  for (const k of kaldi) console.log('   - ' + k);
  process.exit(1);
}
