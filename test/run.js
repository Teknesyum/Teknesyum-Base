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

// Yönlendirme satırları artık modele gidiyor: kanca `systemMessage` kullansa render
// katmanı satırın başına `<olay> says:` öneki koyuyor ve o önek hiçbir ayarla
// kaldırılamıyor (ölçüldü 23.08.2026). Tur içi olaylar `additionalContext`e geçti;
// `Stop` ve `StopFailure` hâlâ kullanıcı kanalında çünkü orada model cevabı tekrarlıyor.
// Testler iki kanalı da okumalı.
function duyuruMetni(r) {
  if (!r || !r.out) return '';
  let o;
  try {
    o = JSON.parse(r.out);
  } catch {
    return '';
  }
  return o.systemMessage || (o.hookSpecificOutput || {}).additionalContext || '';
}

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
    'autocompact.md,beep.md,ekran.md,help.md,load.md,loadall.md,log.md,ozel.md,premium.md,pusla.md,rc.md,rcadvanced.md,rcall.md,report.md,rule.md,save.md,saveall.md,scan.md,setup.md,uicheckup.md,uisetup.md,update.md'
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
  const m = duyuruMetni(r);
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

// "Susar" kullaniciya bir sey basmaz demek. Gunluk bildirme yordami modele giden baglamdir
// ve rolesiz projede de yazilir — bozukluk cogunlukla rolesiz bir projede gorulur.
ol('röle kurulu değilse ve makine bağlıysa açılışta kullanıcıya bir şey basmaz', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const m = JSON.parse(
    calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(true)).out
  );
  esit(m.systemMessage, undefined, 'kullaniciya satir cikmamali');
  esit(Object.keys(m).join(','), 'hookSpecificOutput', 'baska alan olmamali');
  icerir(m.hookSpecificOutput.additionalContext, 'bozuk davranırsa');
});

ol('statusline bağlı değilse açılışta kurulumu hatırlatır', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-bos-'));
  const m = JSON.parse(
    calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(false)).out
  );
  icerir(m.hookSpecificOutput.additionalContext, 'kurulum eksik');
});

ol('açılışta iki uyarı olsa da stdout tek JSON kalır', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, konfig(false));
  const m = duyuruMetni(r);
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
  const m = duyuruMetni(r);
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
  icerir(duyuruMetni(calistir(IZLE, yuk)), ', 2 ajan çalışıyor');
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
  const m = duyuruMetni(r);
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
  const ek = { CLAUDE_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kapi-')) };
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
    '---\nstatus: active\n---\n'
  );
  const m = 'T3 oturum limitine takildi, isi guvenli noktada durdurdum.\nRapor: PLAN.md';
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'Stop',
      transcript_path: transcript(m),
    },
    ek
  );
  const o = JSON.parse(r.out);
  esit(o.decision, 'block');
  icerir(o.reason, 'Senden istediklerim');
});

ol('senden bolumu varsa duraklama serbest', () => {
  const { p } = proje(0, 0);
  const ek = { CLAUDE_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kapi-')) };
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
    '---\nstatus: active\n---\n'
  );
  const m =
    'T3 oturum limitine takildi.\nRapor: PLAN.md\n\n## Senden istediklerim\n\n1. Limit donunce yaz: `T3 devam`';
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'Stop',
      transcript_path: transcript(m),
    },
    ek
  );
  esit(r.out, '', 'gecerli duraklama engellendi');
});

ol('duraklama yoksa senden bolumu istenmez', () => {
  const { p } = proje(0, 0);
  const ek = { CLAUDE_CONFIG_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-kapi-')) };
  fs.writeFileSync(
    path.join(p, '.claude', 'relay', 'contracts', 'T1.md'),
    '---\nstatus: active\n---\n'
  );
  const r = calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'Stop',
      transcript_path: transcript('T3 uzerinde calisiyorum, band olcumu suruyor.'),
    },
    ek
  );
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
  icerir(duyuruMetni(r), 'süre belirsiz');
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
  const argv = Array.isArray(komut) ? komut : [komut];
  const r = spawnSync(process.execPath, [PREMIUM, ...argv, '--kok', p], {
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

ol('hicbir profil ajan dosyasina ve SETTINGS.md ye yazmaz', () => {
  const { p, cfg } = premiumKopya();
  const once = ajanMetni(p) + ayarMetni(p);
  for (const ad of ['eco', 'normal', 'premium', 'ac', 'kapat', 'durum']) {
    esit(premiumCalistir(ad, p, cfg).kod, 0, ad + ' cikis kodu');
    esit(ajanMetni(p) + ayarMetni(p), once, ad + ' dosya yazdi');
  }
});

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

ol('autocompact tablosu premium.js ile post-install.js arasinda ayni', () => {
  const kaynak = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'post-install.js'), 'utf8');
  const m = kaynak.match(/const AUTOCOMPACT = (\{[^}]*\})/);
  if (!m) throw new Error('post-install.js AUTOCOMPACT tablosunu kaybetmis');
  const kurulum = JSON.parse(m[1].replace(/([a-z]+):/g, '"$1":').replace(/'/g, '"'));
  for (const profil of ['eco', 'normal', 'premium'])
    esit(
      String(kurulum[profil]),
      premiumTablo.DUGME[profil].autocompact,
      profil + ' penceresi iki tabloda ayristi'
    );
});

ol('autocompact modele hic yazilmaz, sapma satirinda gorunmez', () => {
  esit(premiumTablo.sapmalar('eco').autocompact, '100000', 'sapma tablosunda olmali');
  esit(premiumTablo.DUGME.normal.autocompact, 'auto', 'taban Claude Code varsayilanini kullanmali');
  if (/autocompact/.test(premiumTablo.sapmaSatiri('eco')))
    throw new Error('kanca dugmesi modele enjekte ediliyor: ' + premiumTablo.sapmaSatiri('eco'));
  if (/autocompact/.test(premiumTablo.sapmaSatiri('premium')))
    throw new Error('premium sapma satirinda autocompact var');
});

ol('--genel makine varsayilanini ve pencereyi birlikte yazar', () => {
  const { p, cfg } = premiumKopya();
  const r = premiumCalistir(['eco', '--genel'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'oturum-9' });
  esit(r.kod, 0, r.err);
  icerir(r.out, 'kayıt: makine');
  icerir(r.out, 'autoCompactWindow: 100000');
  const k = JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8'));
  esit(k.profil, 'eco');
  esit(
    JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8')).autoCompactWindow,
    100000
  );
});

ol('oturum profili pencereyi tasimaz, durum bunu soyler', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir(['premium', '--genel'], p, cfg);
  esit(
    JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8')).autoCompactWindow,
    1000000
  );
  const ek = { CLAUDE_CODE_SESSION_ID: 'oturum-7' };
  const r = premiumCalistir(['eco', 'this'], p, cfg, ek);
  icerir(r.out, 'kayıt: oturum');
  icerir(r.out, 'oturum profili makine ayarını taşımaz');
  esit(
    JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8')).autoCompactWindow,
    1000000,
    'oturum profili makine penceresini ezmis'
  );
  const d = premiumCalistir('durum', p, cfg, ek);
  icerir(d.out, 'yürürlükteki profil: eco (kaynak: oturum)');
  icerir(d.out, 'sıkıştırma penceresi: 1000000 · eco profili 100000 ister');
});

ol('autocompact komutu profilden turetir, sayi verilince elle yazar', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir(['premium', '--genel'], p, cfg);
  const t = premiumCalistir('autocompact', p, cfg);
  icerir(t.out, 'autoCompactWindow: 1000000');
  const e = premiumCalistir(['autocompact', '432000'], p, cfg);
  esit(e.kod, 0, e.err);
  icerir(e.out, 'yazıldı (elle)');
  esit(
    JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8')).autoCompactWindow,
    432000
  );
  esit(premiumCalistir(['autocompact', 'bes'], p, cfg).kod, 1, 'sayi olmayan deger kabul edildi');
  esit(premiumCalistir(['autocompact', '50000'], p, cfg).kod, 1, 'alt sinirin altini kabul etti');
  esit(premiumCalistir(['autocompact', '2000000'], p, cfg).kod, 1, 'ust siniri asani kabul etti');
  const o = premiumCalistir(['autocompact', 'auto'], p, cfg);
  esit(o.kod, 0, o.err);
  esit(
    JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8')).autoCompactWindow,
    undefined,
    'auto anahtari silmeliydi'
  );
});

ol('sapma tablosu yalniz tabandan ayrilan dugmeleri verir', () => {
  esit(Object.keys(premiumTablo.sapmalar('normal')).length, 0, 'taban profil sapmamali');
  const eco = premiumTablo.sapmalar('eco');
  esit(eco.parallel_width, '1');
  esit(eco.default_model, 'haiku');
  esit(eco.audit, 'very-critical');
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
    eco: ['varsayılan model: haiku', 'parallel_width 1', 'research_repos 1', 'audit very-critical'],
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
  esit(
    premiumCalistir(['eco', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'oturum-a' }).kod,
    0,
    'eco kodu'
  );
  esit(
    premiumCalistir(['premium', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'oturum-b' }).kod,
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

ol('ciplak komut makineye yazar, oturum kaydi acmaz', () => {
  const { p, cfg } = premiumKopya();
  const ek = { CLAUDE_CODE_SESSION_ID: 'kapsam-1' };
  const r = premiumCalistir('eco', p, cfg, ek);
  esit(r.kod, 0, r.err);
  icerir(r.out, 'kayıt: makine');
  esit(JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8')).profil, 'eco');
  esit(
    fs.existsSync(path.join(oturumlarDizini(cfg), 'kapsam-1.json')),
    false,
    'ciplak komut oturum kaydi acmamali'
  );
});

ol('this eki yalniz oturumu yazar, makine dosyasi ellenmez', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('normal', p, cfg);
  const once = fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8');
  const ek = { CLAUDE_CODE_SESSION_ID: 'kapsam-2' };
  const r = premiumCalistir(['eco', 'this'], p, cfg, ek);
  esit(r.kod, 0, r.err);
  icerir(r.out, 'kayıt: oturum');
  esit(oturumProfilOku(cfg, 'kapsam-2'), 'eco');
  esit(fs.readFileSync(path.join(cfg, 'teknesyum.json'), 'utf8'), once, 'makine dosyasi ellenmis');
});

ol('this tek basina bu sohbeti premium yapar', () => {
  const { p, cfg } = premiumKopya();
  const ek = { CLAUDE_CODE_SESSION_ID: 'kapsam-3' };
  const r = premiumCalistir('this', p, cfg, ek);
  esit(r.kod, 0, r.err);
  icerir(r.out, 'profil: premium');
  icerir(r.out, 'kayıt: oturum');
  esit(oturumProfilOku(cfg, 'kapsam-3'), 'premium');
});

ol('oturum kaydi varken ciplak komut sessiz golgelemeyi uc satirda soyler', () => {
  const { p, cfg } = premiumKopya();
  const ek = { CLAUDE_CODE_SESSION_ID: 'kapsam-4' };
  premiumCalistir(['eco', 'this'], p, cfg, ek);
  const r = premiumCalistir('premium', p, cfg, ek);
  esit(r.kod, 0, r.err);
  icerir(r.out, 'Makine varsayılanı premium oldu.');
  icerir(r.out, 'Bu sohbette eco yürürlükte — oturuma özel ayar üstte kalır.');
  icerir(r.out, 'Bu sohbeti de geneline döndürmek için: /premium this sil');
  esit(oturumProfilOku(cfg, 'kapsam-4'), 'eco', 'ciplak komut oturum kaydini ezmemeli');
});

ol('golge uyarisi yalniz gercek golgede cikar', () => {
  const { p, cfg } = premiumKopya();
  const ek = { CLAUDE_CODE_SESSION_ID: 'kapsam-5' };
  const yok = premiumCalistir('premium', p, cfg, ek);
  if (yok.out.includes('üstte kalır')) throw new Error('kayit yokken golge uyarisi cikti');
  premiumCalistir(['premium', 'this'], p, cfg, ek);
  const ayni = premiumCalistir('premium', p, cfg, ek);
  if (ayni.out.includes('üstte kalır')) throw new Error('ayni degerde golge uyarisi cikti');
});

ol('this sil oturum kaydini kaldirir, makine varsayilanina donulur', () => {
  const { p, cfg } = premiumKopya();
  const ek = { CLAUDE_CODE_SESSION_ID: 'kapsam-6' };
  premiumCalistir('premium', p, cfg);
  premiumCalistir(['eco', 'this'], p, cfg, ek);
  esit(oturumProfilOku(cfg, 'kapsam-6'), 'eco');
  const r = premiumCalistir(['this', 'sil'], p, cfg, ek);
  esit(r.kod, 0, r.err);
  icerir(r.out, 'oturuma özel profil silindi');
  icerir(r.out, 'yürürlükteki profil: premium (makine)');
  esit(oturumProfilOku(cfg, 'kapsam-6'), 'premium', 'silme sonrasi makine varsayilani gecerli');
  const yine = premiumCalistir(['this', 'sil'], p, cfg, ek);
  esit(yine.kod, 0, 'ikinci silme hata vermemeli');
  icerir(yine.out, 'zaten yoktu');
});

ol('this sil oturum kaydindaki oteki anahtarlari korur', () => {
  const { p, cfg } = premiumKopya();
  const ek = { CLAUDE_CODE_SESSION_ID: 'kapsam-7' };
  premiumCalistir(['eco', 'this'], p, cfg, ek);
  const yol = path.join(oturumlarDizini(cfg), 'kapsam-7.json');
  const k = JSON.parse(fs.readFileSync(yol, 'utf8'));
  k.beep = { kapali: true };
  fs.writeFileSync(yol, JSON.stringify(k));
  premiumCalistir(['this', 'sil'], p, cfg, ek);
  esit(fs.existsSync(yol), true, 'beep ayari varken dosya silinmemeli');
  const son = JSON.parse(fs.readFileSync(yol, 'utf8'));
  esit(son.profil, undefined, 'profil anahtari kalmis');
  esit(son.beep.kapali, true, 'beep anahtari silinmis');
});

ol('kapsam eki almayan alt komut this yazilinca hata basmaz', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir('normal', p, cfg);
  const d = premiumCalistir(['durum', 'this'], p, cfg);
  esit(d.kod, 0, d.err);
  icerir(d.out, 'yürürlükteki profil: normal');
  const a = premiumCalistir(['autocompact', 'this'], p, cfg);
  esit(a.kod, 0, a.err);
  icerir(a.out, 'autoCompactWindow: auto');
});

ol('this oturum kimligi yokken acikca durur', () => {
  const { p, cfg } = premiumKopya();
  const r = premiumCalistir(['eco', 'this'], p, cfg);
  esit(r.kod, 1, 'kimliksiz this sessizce makineye yazmis');
  icerir(r.err, 'oturum kimliği ister');
  esit(fs.existsSync(path.join(cfg, 'teknesyum.json')), false, 'makine dosyasi yazilmis');
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
  premiumCalistir(['normal', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'yeni' });
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
  icerir(premiumCalistir(['premium', 'this'], p, cfg, sid).out, 'kayıt: oturum');
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
  premiumCalistir(['eco', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'yazan' });
  esit(fs.existsSync(yarim), true, 'yarim yazilmis kayit silinmemeli');
  esit(fs.existsSync(bos), true, 'bos kayit silinmemeli');
  esit(oturumProfilOku(cfg, 'yarim'), 'normal', 'okunamayan kayit makine varsayilanina dusmeli');
});

ol('durum iki oturumda ayri profil basar, uyusmazlik satiri hic cikmaz', () => {
  const { p, cfg } = premiumKopya();
  const A = { CLAUDE_CODE_SESSION_ID: 'oturum-A' };
  const B = { CLAUDE_CODE_SESSION_ID: 'oturum-B' };
  const once = ajanMetni(p) + ayarMetni(p);
  esit(premiumCalistir(['eco', 'this'], p, cfg, A).kod, 0, 'A eco kodu');
  esit(premiumCalistir(['premium', 'this'], p, cfg, B).kod, 0, 'B premium kodu');
  const a = premiumCalistir('durum', p, cfg, A).out;
  const b = premiumCalistir('durum', p, cfg, B).out;
  icerir(a, 'yürürlükteki profil: eco (kaynak: oturum)');
  icerir(a, 'paralel: 1 ajan · ön araştırma: 1+ depo · denetim: very-critical');
  icerir(a, 'plan konseyi: off');
  icerir(a, 'sapan düğme: audit very-critical');
  icerir(b, 'yürürlükteki profil: premium (kaynak: oturum)');
  icerir(b, 'paralel: 20 ajan · ön araştırma: 50+ depo · denetim: high');
  icerir(b, 'plan konseyi: fable + opus');
  icerir(b, 'sapan düğme: audit high · fix_ceiling 8');
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

ol('advisor ucuz kalir, premiumda medium otekilerde low', () => {
  const src = fs.readFileSync(PREMIUM, 'utf8');
  const govde = src.slice(src.indexOf('const PROFIL'), src.indexOf('const PROFILLER'));
  const satirlar = govde.split('\n').filter((r) => r.trim().startsWith('advisor:'));
  esit(satirlar.length, 3, 'advisor üç profilde de tanımlı olmalı');
  for (const satir of satirlar.slice(0, 2))
    if (!/effort: 'low'/.test(satir))
      throw new Error('advisor düşük eforda değil: ' + satir.trim());
  icerir(satirlar[2], "model: 'fable'");
  icerir(satirlar[2], "effort: 'medium'");
  if (/effort: '(high|xhigh)'/.test(satirlar[2]))
    throw new Error('premium advisor planner kopyasina donmus: ' + satirlar[2].trim());
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
  icerir(bolum, 'Dokuz hatırlatma maddesi');
  icerir(bolum, 'plan oluştur');
  icerir(bolum, 'Plan konseyi (§1.5)');
  // Varsayilan acmaktir: liste izin listesi degil hatirlatma listesi, ve acmamanin
  // gerekcesi sayili. Bakma ani da kural — liste vardi, bakma ani yoktu, tetikleyici
  // bes tur boyunca hic atesleneme di (docs/openlogs/HATA-ikinci-gorus-tetiklenmiyor.md).
  icerir(bolum, 'Varsayılan açmaktır, açmamak gerekçe ister');
  icerir(bolum, 'Açmamanın üç gerekçesi vardır');
  icerir(bolum, 'Ne zaman bakılacağı da kuraldır');
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

function enjeksiyonOlcu(p, ayar) {
  const cfg = profilKonfig(ayar);
  const tek = enjeksiyonBoyu(profilIstek(p, cfg));
  let toplam = tek;
  for (let i = 0; i < 2; i++) toplam += enjeksiyonBoyu(profilIstek(p, cfg));
  return { tek, toplam };
}

ol('eco oturum basina normalden az karakter enjekte eder', () => {
  const { p } = proje(1, 0);
  const e = enjeksiyonOlcu(p, { profil: 'eco' }).toplam;
  const s = enjeksiyonOlcu(p, { profil: 'normal' }).toplam;
  if (!(e < s * 0.75)) throw new Error('eco enjeksiyonu kisalmadi: ' + e + ' / ' + s);
});

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
  premiumCalistir(['eco', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-eco' });
  premiumCalistir(['premium', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-prem' });
  premiumCalistir(['normal', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-std' });
  esit(ayarOku(cfg, 'w-eco', 'parallel_width'), '1', 'eco oturumu');
  esit(ayarOku(cfg, 'w-prem', 'parallel_width'), '20', 'premium oturumu');
  esit(ayarOku(cfg, 'w-std', 'parallel_width'), '2', 'normal oturumu dosyadan okumali');
});

ol('sapmayan dugmede proje SETTINGS.md hala gecerli', () => {
  const { p, cfg } = premiumKopya();
  premiumCalistir(['eco', 'this'], p, cfg, { CLAUDE_CODE_SESSION_ID: 'w-kat' });
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
  for (const s of ['parallel_width 1', 'default_model haiku', 'audit very-critical'])
    icerir(eco, s, 'eco sapmasi');
  for (const s of ['ask_threshold', 'approval_gate', 'worktree_isolation', 'report_length'])
    if (eco.includes(s)) throw new Error('tabandan sapmayan düğme enjekte edildi: ' + s);
  for (const s of ['agent_stall', 'agent_loop'])
    if (eco.includes(s)) throw new Error('kanca düğmesi enjekte edildi: ' + s);
  const prem = profilIstek(p, profilKonfig({ profil: 'premium' }));
  icerir(prem, 'parallel_width 20');
  icerir(prem, 'plan_council on');
  icerir(prem, 'audit high', 'premium denetim esigi enjekte edilmeli');
});

ol('taban profil enjeksiyona dugme satiri yazmaz', () => {
  const { p } = proje(1, 0);
  const std = profilIstek(p, profilKonfig({ profil: 'normal' }));
  icerir(std, 'Teknesyum Base');
  if (std.includes('Tabandan sapan düğmeler'))
    throw new Error('normal profil kendi tabanindan sapti');
});

ol('eco istek basina da normalden az bayt tutar', () => {
  const { p } = proje(1, 0);
  const e = enjeksiyonOlcu(p, { profil: 'eco' });
  const s = enjeksiyonOlcu(p, { profil: 'normal' });
  if (!(e.tek > 0 && s.tek > 0)) throw new Error('enjeksiyon olculemedi: ' + e.tek + ' / ' + s.tek);
  if (!(e.tek < s.tek))
    throw new Error('eco istek basina normalden buyuk: ' + e.tek + ' / ' + s.tek);
  if (!(e.toplam < s.toplam))
    throw new Error('eco oturum basina normalden buyuk: ' + e.toplam + ' / ' + s.toplam);
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
  icerir(duyuruMetni(r), '/load son');
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
  icerir(duyuruMetni(a), 'üst klasör');
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

function ajanBitir(p, ek, tanim) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ajantr-'));
  const at = path.join(d, 'agent-' + tanim.id + '.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', message: { model: tanim.gercek } }) + '\n'
  );
  if (tanim.cagri)
    calistir(
      IZLE,
      {
        ...ort(p),
        hook_event_name: 'PreToolUse',
        tool_name: 'Agent',
        tool_input: { subagent_type: 'teknesyum:' + tanim.rol, model: tanim.cagri },
      },
      ek
    );
  calistir(
    IZLE,
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: tanim.id,
      agent_type: 'teknesyum:' + tanim.rol,
      agent_transcript_path: at,
      effort: { level: tanim.efor },
    },
    ek
  );
}

function sorunGunlugu(live) {
  try {
    return fs.readFileSync(path.join(live, '_sorun.log'), 'utf8');
  } catch {
    return '';
  }
}

ol('beyan edilen model ve efor tutmazsa sorun gunlugune yazilir', () => {
  const { p, live } = proje(1, 0);
  ajanBitir(p, konfig(true), {
    id: 'b1',
    rol: 'scribe',
    cagri: 'haiku',
    gercek: 'claude-opus-4-5',
    efor: 'xhigh',
  });
  const g = sorunGunlugu(live);
  icerir(g, 'scribe | model | beyan: haiku | gerçek: claude-opus-4-5', 'model uyusmazligi');
  icerir(g, 'scribe | efor | beyan: low | gerçek: xhigh', 'efor uyusmazligi');
});

ol('cagri model gecmediyse beklenen model profilden turetilir', () => {
  const { p, live } = proje(1, 0);
  ajanBitir(p, konfig(true), { id: 'b4', rol: 'scribe', gercek: 'claude-opus-4-5', efor: 'low' });
  icerir(
    sorunGunlugu(live),
    'scribe | model | beyan: haiku | gerçek: claude-opus-4-5',
    'normal profilde scribe haiku bekler'
  );
});

ol('premium oturumunda sessiz model dususu yakalanir', () => {
  const { p, live } = proje(1, 0);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-dusus-'));
  fs.writeFileSync(
    path.join(cfg, 'teknesyum.json'),
    JSON.stringify({ dil: 'tr', profil: 'premium' })
  );
  ajanBitir(
    p,
    { CLAUDE_CONFIG_DIR: cfg },
    {
      id: 'b5',
      rol: 'builder',
      gercek: 'claude-sonnet-4-5',
      efor: 'medium',
    }
  );
  icerir(
    sorunGunlugu(live),
    'builder | model | beyan: opus | gerçek: claude-sonnet-4-5',
    'premiumda sonnet ile acilan ajan bildirilmeli'
  );
});

ol('cagri modeli profil beklentisini ezer', () => {
  const { p, live } = proje(1, 0);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ezme-'));
  fs.writeFileSync(
    path.join(cfg, 'teknesyum.json'),
    JSON.stringify({ dil: 'tr', profil: 'premium' })
  );
  ajanBitir(
    p,
    { CLAUDE_CONFIG_DIR: cfg },
    {
      id: 'b6',
      rol: 'builder',
      cagri: 'sonnet',
      gercek: 'claude-sonnet-4-5',
      efor: 'medium',
    }
  );
  if (sorunGunlugu(live).includes('builder | model'))
    throw new Error('cagrida gecilen model profil yuzunden uyari acti');
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
  icerir(duyuruMetni(r), 'Sağlık ▸');
  icerir(duyuruMetni(r), 'dakikadır sessiz');
  icerir(duyuruMetni(r), 'TaskStop');
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
  const m = duyuruMetni(acik);
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
  const anaOturum = duyuruMetni(calistir(IZLE, yuk, { TEKNESYUM_DEBUG: '1' }));
  icerir(anaOturum, 'ana oturum');
  if (/ajan[ıi] ajan|ajan ajan/.test(anaOturum))
    throw new Error('ana oturum rol adıyla yazıldı: ' + anaOturum);
  icerir(fs.readFileSync(path.join(live, '_sorun.log'), 'utf8'), 'string_not_found');
});

ol('kesilen arac cagrisi hata degil kesinti diye bildirilir', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, { ...DEBUG_YUK(p), is_interrupt: true }, { TEKNESYUM_DEBUG: '1' });
  icerir(duyuruMetni(r), 'Edit aracı kesildi');
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
  const m = duyuruMetni(r);
  icerir(m, 'Debug ▸ bir ajan durdu');
  icerir(m, 'builder ajanı · a1');
  icerir(fs.readFileSync(path.join(live, '_sorun.log'), 'utf8'), 'bir ajan durdu');
});

ol('debug bildirimi ingilizce kurulumda ingilizce konusur', () => {
  const { p } = proje(1, 0);
  const r = calistir(IZLE, DEBUG_YUK(p), { TEKNESYUM_DEBUG: '1', TEKNESYUM_DIL: 'en' });
  icerir(duyuruMetni(r), 'the Edit tool failed');
});

console.log('\nTur özeti');

let _turLive = null;

function turProje() {
  const { p, live } = proje(1, 0);
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-tur-'));
  _turLive = live;
  return { p, live, ek: { CLAUDE_CONFIG_DIR: cfg } };
}

// Makbuz akisa basilmaz, statusline'in okudugu `_makbuz.json` dosyasina yazilir. Iki kanal
// olculdu ve elendi: `additionalContext` cevabin tamamini tekrarlatiyor (Stop cevap
// yazildiktan sonra calisiyor), `systemMessage` ise render katmaninda kaldirilamayan
// `Stop says:` onegi aliyor. Ayrinti: docs/HATA-tur-makbuzu-tekrari.md ve relay-watch.js.
function turSatiri(r, live) {
  const d = live || _turLive;
  if (!d) return '';
  try {
    const m = JSON.parse(fs.readFileSync(path.join(d, '_makbuz.json'), 'utf8'));
    return (m && m.metin) || '';
  } catch {
    return '';
  }
}

// Makbuz dosyasini turlar arasi sifirlar; ayni sahnede iki olcum yapilirken eski satirin
// yeni turun sonucu sanilmasini engeller.
function makbuzSil(live) {
  try {
    fs.unlinkSync(path.join(live || _turLive, '_makbuz.json'));
  } catch {}
}

ol('tur ozeti sure ve token tahminini tek satirda verir', () => {
  const { p, ek } = turProje();
  const t = transcript('merhaba');
  calistir(IZLE, { ...ort(p), transcript_path: t, hook_event_name: 'UserPromptSubmit' }, ek);
  fs.appendFileSync(t, 'z'.repeat(4000) + '\n');
  const m = turSatiri(
    calistir(IZLE, { ...ort(p), transcript_path: t, hook_event_name: 'Stop' }, ek)
  );
  icerir(m, 'Total Süre: ');
  icerir(m, ' <> Ana Oturum: ');
  icerir(m, ' Token <> Alt Ajanlar: ');
  if (/~/.test(m)) throw new Error('makbuzda hâlâ ~ var: ' + m);
  esit(m.match(/Ana Oturum: (\S+) Token/)[1], '1k', 'ana oturum tahmini: ' + m);
  esit(m.match(/Alt Ajanlar: (\S+) Token/)[1], '0', 'alt ajan sifir olmali: ' + m);
});

ol('tur makbuzunun adi neyi saydigini soyler', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  icerir(m, 'Ana Oturum:');
  icerir(m, 'Alt Ajanlar:');
  if (/Tahmini Token/.test(m))
    throw new Error('makbuz hâlâ bütçe sayacıyla ayni adi tasiyor: ' + m);
});

// Makbuz iki kanaldan da çıkmaz: `additionalContext` cevabı tekrarlatıyor,
// `systemMessage` kaldırılamayan `Stop says:` öneki alıyor. Kullanıcı o öneki açıkça
// istemedi (23.08.2026). Tek kanal statusline'ın okuduğu dosya.
ol('makbuz akisa hic basilmaz, yalniz statusline dosyasina yazilir', () => {
  const { p, ek, live } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const r = calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek);
  const o = r.out ? JSON.parse(r.out) : {};
  esit(o.hookSpecificOutput, undefined, 'ozet modele verilmis, cevap tekrarlanir');
  if (o.systemMessage && /Total Süre/.test(o.systemMessage))
    throw new Error('makbuz systemMessage ile basilmis, `Stop says:` onegi gelir');
  icerir(turSatiri(r, live), 'Total Süre: ', 'makbuz dosyasina yazilmali');
});

ol('damgasiz Stop tur ozeti basmaz', () => {
  const { p, ek } = turProje();
  esit(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek).out, '', 'damgasiz ozet cikti');
});

// Ölçülen pencere kullanıcının inputundan kullanıcının inputuna kadardır. Klavye
// kullanıcıya geçtiği her an makbuz basılır — iş engellendiyse de, yarım kaldıysa da,
// "Senden istediklerim" denip bekleme başladıysa da. Eski davranış erteliyordu; kullanıcı
// 23.08.2026'da tersine çevirdi: o ana kadarki maliyet o anda görülmeli.
ol('engellenen tur da makbuzunu basar, damga birikmez', () => {
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
  esit(o.decision, 'block', 'engel yine çalışmalı');
  icerir(o.reason, 'dönüş bloğu');
  icerir(turSatiri(r), 'Total Süre: ', 'engellenen tur da makbuz basmalı');
  const damga = path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum', 'live', 'oturum-1.tur');
  esit(fs.existsSync(damga), false, 'damga silinmeli, birikmemeli');
});

ol('senden istediklerim diyen tur da makbuzunu basar', () => {
  const { p, ek } = turProje();
  const damga = path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum', 'live', 'oturum-1.tur');
  const soru = transcript('Iki yol var.\n\n## Senden istediklerim\n\n1. Hangisi?');
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'basla' }, ek);
  const d1 = JSON.parse(fs.readFileSync(damga, 'utf8'));
  d1.t = Date.now() - 40000;
  fs.writeFileSync(damga, JSON.stringify(d1));
  const ilk = calistir(IZLE, { ...ort(p), hook_event_name: 'Stop', transcript_path: soru }, ek);
  icerir(turSatiri(ilk), 'Total Süre: 40sn', 'soru soran tur o ana kadarki maliyeti basmalı');
  esit(fs.existsSync(damga), false, 'damga silinmeli');
  // Sonraki istem yeni bir pencere açar; önceki pencerenin süresi taşınmaz.
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'birincisi' }, ek);
  const d2 = JSON.parse(fs.readFileSync(damga, 'utf8'));
  esit(d2.sn0, 0, 'yeni pencere sıfırdan başlamalı');
  d2.t = Date.now() - 20000;
  fs.writeFileSync(damga, JSON.stringify(d2));
  const son = calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek);
  icerir(turSatiri(son), 'Total Süre: 20sn', 'ikinci pencere yalnız kendi süresini saymalı');
});

ol('bir dakikayi asan tur dakika ve saniye ile yazilir', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const f = path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum', 'live', 'oturum-1.tur');
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  d.t = Date.now() - 215000;
  fs.writeFileSync(f, JSON.stringify(d));
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  icerir(m, 'Total Süre: 3dk 35sn');
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
  icerir(m, 'Total Time: ');
  icerir(m, ' <> Main Session: ');
  icerir(m, ' Tokens <> Subagents: ');
  if (/~/.test(m)) throw new Error('ingilizce makbuzda hâlâ ~ var: ' + m);
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
  esit(m.match(/Alt Ajanlar: (\S+) Token/)[1], '2k', 'alt ajan transkripti sayilmadi: ' + m);
  esit(m.match(/Ana Oturum: (\S+) Token/)[1], '0', 'ana oturum alt ajanla karismis: ' + m);
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
  icerir(m, 'Total Süre: 5dk ');
  if (m.includes('10dk')) throw new Error('duvar saati düşülmemiş: ' + m);
});

ol('duraklamasiz kisa turda sure duvar saatine yakin kalir', () => {
  const { p, ek } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  turGeriAl(ek, 40000);
  calistir(IZLE, { ...ort(p), hook_event_name: 'PostToolUse', tool_name: 'Read' }, ek);
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek));
  const sn = parseInt(m.match(/Total Süre: (\d+)sn/)[1], 10);
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
  icerir(m, 'Total Süre: 5dk ');
});

console.log('\nBildirim biçimi');

// Kullanicinin canlida cevirecegi sabit budur; testi de o dosyayi kopyalayip sabiti
// degistirerek kosar, boylece iki bicimin de uretilebildigi gercekten olculur.
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
      const desen = /const BILDIRIM_BICIMI = '(blok|satir)';/;
      if (!desen.test(govde)) throw new Error('BILDIRIM_BICIMI sabiti bulunamadı');
      govde = govde.replace(desen, "const BILDIRIM_BICIMI = '" + bicim + "';");
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
  const m = duyuruMetni(calistir(IZLE, AJAN_YUK(p)));
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
  icerir(duyuruMetni(r), 'Teknesyum ▸ Görev ▸ builder bitti — ');
});

ol('acilis satiri alan listesi olarak kalir', () => {
  const { p } = proje(1, 0);
  const m = duyuruMetni(calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }));
  icerir(m, 'röle kurulu · sözleşme 0/1 bitti · 1 açık');
  esit(m.split('▸').length, 2, 'durum satırına etiket oku girmiş');
});

// Tur içi olaylar `systemMessage` kullanmıyor: o kanal render katmanında
// `<olay> says:` öneki alıyor ve önek kaldırılamıyor. Yönlendirme satırları modele
// gidiyor, model onları kendi cevabının içinde basıyor — önek doğmuyor.
// `BILDIRIM_BICIMI` artık yalnız `Stop`/`StopFailure` kanalını yönetiyor.
ol('tur ici olaylar kullanici kanalini hic kullanmaz', () => {
  const { p } = proje(1, 0);
  for (const yuk of [
    AJAN_YUK(p),
    { ...ort(p), hook_event_name: 'SessionStart' },
    { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt: 'x' },
  ]) {
    const r = calistir(IZLE, yuk);
    if (!r.out) continue;
    const o = JSON.parse(r.out);
    if (o.systemMessage)
      throw new Error(yuk.hook_event_name + ' systemMessage kullanmis: ' + o.systemMessage);
  }
  const m = duyuruMetni(calistir(IZLE, AJAN_YUK(p)));
  icerir(m, 'Teknesyum ▸ Görev ▸ ');
  icerir(m, 'olduğu gibi', 'satirin harfiyen basilmasi istenmeli');
});

ol('sabit satir yapilinca icerik onekle ayni satirda kalir', () => {
  const { p } = proje(1, 0);
  const m = duyuruMetni(calistir(bicimKopya('satir'), AJAN_YUK(p)));
  if (m.startsWith('\n')) throw new Error('satır biçiminde satır başı kalmış: ' + m);
  icerir(m, 'Teknesyum ▸ Görev ▸ ');
});

// ÖLÇÜLDÜ (23.08.2026, kullanıcı ekran görüntüsü): `blok` biçimi öneki kendi satırında
// bırakmıyor, iki kez bastırıyor — ekranda "Stop says: / Stop says: …" çıkıyor. Yürürlükteki
// biçim `satir` olmalı. Makbuz `systemMessage` ile basıldığı için ters tırnak da taşımamalı;
// o kanal markdown işlemiyor ve tırnaklar harfiyen görünüyordu.
ol('yururlukteki bildirim bicimi satir ve makbuzda ters tirnak yok', () => {
  const k = fs.readFileSync(path.join(KOK, 'hooks', 'relay-watch.js'), 'utf8');
  icerir(k, "const BILDIRIM_BICIMI = 'satir';");
  const d = fs.readFileSync(path.join(KOK, 'hooks', 'dil.js'), 'utf8');
  const blok = d.slice(d.indexOf('turOzeti: {'), d.indexOf('turOzetiYonerge'));
  icermez(blok, '`', 'makbuz metninde ters tırnak kalmamalı');
  const { p, ek, live } = turProje();
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const m = turSatiri(calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek), live);
  if (m.includes('`')) throw new Error('makbuzda ters tırnak var: ' + JSON.stringify(m));
  icerir(m, 'Total Süre: ');
  esit(m.split('\n').length, 1, 'makbuz tek satır olmalı');
});

// Arka planda ajan varken makbuz basılmaz ve ses çalmaz: kullanıcının ekranında nokta
// hâlâ yanıp söner ve "N running tasks" yazar. Damga erteleme dalında **silinmez** —
// silinirse ertelenen turun süresi ve token tabanı kaybolur (fable, 23.08.2026).
ol('acik ajan varken makbuz ertelenir, bitince toplam basilir', () => {
  const { p, ek, live } = turProje();
  fs.mkdirSync(live, { recursive: true });
  const kosan = path.join(live, '_running.json');
  fs.writeFileSync(kosan, JSON.stringify([{ type: 'teknesyum:builder', start: Date.now() }]));
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  const damga = path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum', 'live', 'oturum-1.tur');
  const d1 = JSON.parse(fs.readFileSync(damga, 'utf8'));
  d1.t = Date.now() - 30000;
  fs.writeFileSync(damga, JSON.stringify(d1));

  calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek);
  esit(turSatiri({}, live), '', 'ajan calisirken makbuz basilmis');
  esit(fs.existsSync(damga), true, 'erteleme dalinda damga silinmemeli');
  esit(JSON.parse(fs.readFileSync(damga, 'utf8')).bekleyen, 1, 'bekleyen isareti yok');

  fs.writeFileSync(kosan, '[]');
  const d2 = JSON.parse(fs.readFileSync(damga, 'utf8'));
  d2.t = Date.now() - 20000;
  fs.writeFileSync(damga, JSON.stringify(d2));
  calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek);
  const m2 = turSatiri({}, live);
  icerir(m2, 'Total Süre: ', 'ajan bitince makbuz basilmali');
  if (!/(49|50|51)sn/.test(m2)) throw new Error('ertelenen sure birikmemis: ' + m2);
  esit(fs.existsSync(damga), false, 'basildiktan sonra damga silinmeli');
});

ol('bayat calisan kaydi makbuzu sonsuza kadar ertelemez', () => {
  const { p, ek, live } = turProje();
  fs.mkdirSync(live, { recursive: true });
  fs.writeFileSync(
    path.join(live, '_running.json'),
    JSON.stringify([{ type: 'x', start: Date.now() - 3 * 60 * 60 * 1000 }])
  );
  calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit' }, ek);
  calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, ek);
  icerir(turSatiri({}, live), 'Total Süre: ', 'olu kayit ertelemeyi tutmamali');
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
    eco: ['paralel: 1 ajan', 'ön araştırma: 1+ depo', 'denetim: very-critical'],
    normal: ['paralel: 2 ajan', 'ön araştırma: 10+ depo', 'denetim: critical'],
    premium: ['paralel: 20 ajan', 'ön araştırma: 50+ depo', 'denetim: high'],
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
  return duyuruMetni(r);
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
  icerir(m, 'Teknesyum ▸ Güncelleme ▸ 9.9.9 çıktı, kurulu sürüm 1.0.0 — /update --guncelle');
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

function etiketDepo(paketSurum, etiketler) {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-etiket-'));
  git(['init', '-q'], c);
  git(['config', 'user.email', 't@t'], c);
  git(['config', 'user.name', 't'], c);
  if (paketSurum)
    fs.writeFileSync(path.join(c, 'package.json'), JSON.stringify({ version: paketSurum }));
  fs.writeFileSync(path.join(c, 'a'), 'x');
  git(['add', '-A'], c);
  git(['commit', '-qm', 'x'], c);
  for (const e of [].concat(etiketler || [])) git(['tag', e], c);
  return c;
}

ol('etiket denetimi surum etiketten yeniyken uyarir', () => {
  const d = etiketDepo('2.51.0', ['v2.42.0', 'v2.43.0']);
  const e = surum.etiketDurumu(d);
  esit(e.surum, '2.51.0', 'paket surumu okunur');
  esit(e.etiket, '2.43.0', 'en yuksek etiket secilir');
  esit(e.etiketsiz, true, 'surum etiketten yeni');
  const m = surum.etiketMetni(e);
  icerir(m, 'Etiket');
  icerir(m, '2.51.0');
  icerir(m, '2.43.0');
});

ol('etiket denetimi surum ile etiket tutunca hic satir uretmez', () => {
  const d = etiketDepo('2.52.0', ['v2.51.0', 'v2.52.0']);
  const e = surum.etiketDurumu(d);
  esit(e.etiketsiz, false, 'tutuyor');
  esit(surum.etiketMetni(e), null, 'tutuyorken uyari satiri cikmamali');
  esit(surum.etiketMetni(null), null, 'etiket bilinmiyorken de cikmamali');
});

ol('etiket denetimi hic etiket yokken uyarir, etiket surumden yeniyken susar', () => {
  esit(surum.etiketDurumu(etiketDepo('1.0.0', [])).etiketsiz, true, 'hic etiket yok');
  icerir(surum.etiketMetni(surum.etiketDurumu(etiketDepo('1.0.0', []))), 'Etiket');
  esit(
    surum.etiketDurumu(etiketDepo('1.0.0', ['v1.2.0'])).etiketsiz,
    false,
    'etiket ileride ise uyarilmaz'
  );
});

ol('etiket denetimi paket ya da depo yokken null doner, cokmez', () => {
  esit(surum.etiketDurumu(etiketDepo(null, ['v1.0.0'])), null, 'package.json yok');
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-etiket-'));
  fs.writeFileSync(path.join(c, 'package.json'), JSON.stringify({ version: '1.0.0' }));
  esit(surum.etiketDurumu(c), null, 'git deposu degil');
  esit(surum.etiketDurumu(path.join(c, 'yok')), null, 'dizin yok');
});

ol('etiket denetimi zaman asimiyla sinirli — pano askida kalmaz', () => {
  const src = fs.readFileSync(SURUM, 'utf8');
  icerir(src, 'timeout: ETIKET_ZAMAN_ASIMI');
  const m = src.match(/ETIKET_ZAMAN_ASIMI\s*=\s*(\d+)/);
  if (!m) throw new Error('ETIKET_ZAMAN_ASIMI sabiti yok');
  if (Number(m[1]) > 3000) throw new Error('zaman asimi cok uzun: ' + m[1]);
});

ol('durum ciktisi etiket alanini tasir, pano ikinci kontrol yazmaz', () => {
  const { cfg } = surumKur('1.0.0', 'v9.9.9');
  const r = surumCalistir(cfg, ['--json']);
  const j = JSON.parse(r.out);
  if (!('etiket' in j)) throw new Error('durum ciktisinda etiket alani yok');
});

ol('guncelle komut bulunamayinca sebebi doner, cokmez', () => {
  const { cfg } = surumKur('1.0.0', 'v9.9.9');
  const r = spawnSync(process.execPath, [SURUM, 'guncelle'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, PATH: path.join(cfg, 'bos-dizin') },
  });
  esit(r.status, 0, 'cikis kodu sifir kalmali, pano devam etsin');
  const out = (r.stdout || '').trim();
  icerir(out, 'claude plugin update teknesyum@teknesyum');
});

function sahteClaude(cfg) {
  const d = path.join(cfg, 'sahte-yol');
  fs.mkdirSync(d, { recursive: true });
  if (process.platform === 'win32')
    fs.writeFileSync(
      path.join(d, 'claude.cmd'),
      '@echo Updated plugin teknesyum@teknesyum' + String.fromCharCode(13, 10)
    );
  else
    fs.writeFileSync(
      path.join(d, 'claude'),
      ['#!/bin/sh', 'echo Updated', ''].join(String.fromCharCode(10)),
      { mode: 0o755 }
    );
  return d + path.delimiter + process.env.PATH;
}

ol('guncelle komut basariyla donse bile kurulu surum hedefe ulasmadiysa tutmadi der', () => {
  const { cfg } = surumKur('1.0.0', 'v9.9.9');
  const r = spawnSync(process.execPath, [SURUM, 'guncelle', '--json'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, PATH: sahteClaude(cfg) },
  });
  const j = JSON.parse((r.stdout || '').trim());
  esit(j.calisti, true, 'komut calisti');
  esit(j.hedef, '9.9.9', 'hedef surum uzaktan gelir');
  esit(j.sonra, '1.0.0', 'kurulu surum guncelleme sonrasi tekrar okunur');
  esit(j.tuttu, false, 'kurulu surum hedefe ulasmadi, tutmus sayilamaz');
});

ol('guncelle sonucu json olarak da okunur ve dogrulama alanlari tasir', () => {
  const { cfg } = surumKur('1.0.0', 'v9.9.9');
  const r = spawnSync(process.execPath, [SURUM, 'guncelle', '--json'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, PATH: path.join(cfg, 'bos-dizin') },
  });
  const j = JSON.parse((r.stdout || '').trim());
  esit(j.calisti, false, 'komut yokken calismadi');
  esit(j.tuttu, false, 'calismayan guncelleme tutmus sayilmaz');
  esit(j.sonra, '1.0.0', 'kurulu surum guncelleme sonrasi tekrar okunur');
  if (!('hedef' in j)) throw new Error('hedef alani yok');
  if (!j.sebep) throw new Error('sebep bos');
});

ol('guncelleme hedefe ulasmadiysa metin bunu acikca soyler', () => {
  const tutmadi = surum.guncelleMetni({
    calisti: true,
    tuttu: false,
    once: '2.42.1',
    sonra: '2.43.0',
    hedef: '2.51.0',
    komut: surum.GUNCELLEME_KOMUTU,
  });
  icerir(tutmadi, '2.43.0');
  icerir(tutmadi, '2.51.0');
  const tuttu = surum.guncelleMetni({
    calisti: true,
    tuttu: true,
    once: '2.42.1',
    sonra: '2.52.0',
    hedef: '2.52.0',
    komut: surum.GUNCELLEME_KOMUTU,
  });
  icerir(tuttu, '2.52.0');
  icermez(tuttu, 'tutmad', 'tutan guncelleme uyari basmamali');
});

ol('/update bayraksiz salt okur, guncellemeyi yalniz --guncelle tetikler', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'update.md'), 'utf8');
  icerir(k, '--guncelle');
  icerir(k, 'scripts/surum.js" guncelle');
  icerir(k, 'etiketsiz');
  const bas = k.slice(0, k.indexOf('## `--guncelle` verildiyse'));
  icerir(bas, 'Pano salt okurdur');
  const d = fs.readFileSync(path.join(KOK, 'hooks', 'dil.js'), 'utf8');
  icerir(d, '/update --guncelle', 'acilis satiri dogru bayragi gostermeli');
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
  esit(t.eco.audit, 'very-critical', 'eco denetimi');
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
  fs.writeFileSync(path.join(done, 'T2.md'), '---\nstatus: done\nrisk: high\naudit: —\n---\n');
  const j = JSON.parse(taramaCalistir(p, 'premium', '--json').out);
  esit(j.maddeler[2].muhursuz.join(','), 'T2.md', 'yalniz muhursuz olan');
  icerir(taramaCalistir(p, 'premium').out, 'mühürsüz: T2.md');
});

ol('denetim esigi geri donus maliyetine gore acilir', () => {
  const p = taramaProje(50);
  const done = path.join(p, '.claude', 'relay', 'contracts', 'done');
  const sozlesme = (n) =>
    '---\nowns:\n' +
    'abcde'
      .slice(0, n)
      .split('')
      .map((h) => '  - ' + h)
      .join('\n') +
    '\naudit: —\n---\n';
  fs.writeFileSync(path.join(done, 'T1.md'), sozlesme(5));
  fs.writeFileSync(path.join(done, 'T2.md'), sozlesme(3));
  fs.writeFileSync(path.join(done, 'T3.md'), sozlesme(2));
  fs.writeFileSync(path.join(done, 'T4.md'), sozlesme(1));
  const bak = (profil) =>
    JSON.parse(taramaCalistir(p, profil, '--json').out).maddeler[2].muhursuz.length;
  esit(bak('eco'), 1, 'eco yalniz geri donusu olmayani denetler');
  esit(bak('normal'), 2, 'normal kritik ve ustunu denetler');
  esit(bak('premium'), 3, 'premium basit sozlesmeyi denetlemez');
});

ol('sozlesme kendi risk seviyesini soyleyebilir, owns vekili ezilir', () => {
  const p = taramaProje(50);
  const done = path.join(p, '.claude', 'relay', 'contracts', 'done');
  fs.writeFileSync(
    path.join(done, 'T1.md'),
    '---\nowns:\n  - a\nrisk: very-critical\naudit: —\n---\n'
  );
  fs.writeFileSync(
    path.join(done, 'T2.md'),
    '---\nowns:\n  - a\n  - b\n  - c\nrisk: medium\naudit: —\n---\n'
  );
  const bak = (profil) =>
    JSON.parse(taramaCalistir(p, profil, '--json').out).maddeler[2].muhursuz.join(',');
  esit(bak('eco'), 'T1.md', 'tek dosyali sozlesme risk alanıyla denetime girmeli');
  esit(bak('normal'), 'T1.md', 'medium diyen uc dosyali sozlesme denetim disi kalmali');
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
  esit(j.maddeler.length, 5, 'bes madde: dordu profille olculur, lisans her profilde ayni');
  esit(
    j.maddeler.map((m) => m.ad).join(','),
    'Ön araştırma,Kapsam,Denetim,Belge tutarlılığı,Lisans',
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

const UI_CSS = [
  '.tk-btn {',
  '  padding: 14px 20px;',
  '}',
  '.tk-btn:hover {',
  '  background: rgba(0, 243, 255, 0.2);',
  '}',
  '.kart {',
  '  transition: all 500ms ease;',
  '}',
  '',
].join('\n');

function uiProje(secenek) {
  const o = secenek || {};
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-uikip-'));
  const yaz = (gorece, govde) => {
    const tam = path.join(p, gorece);
    fs.mkdirSync(path.dirname(tam), { recursive: true });
    fs.writeFileSync(tam, govde);
  };
  yaz(
    'package.json',
    JSON.stringify({
      name: 'uikip',
      version: '1.0.0',
      dependencies: o.bagimlilik || { motion: '^13.1.1' },
    })
  );
  if (o.css !== false) yaz('src/app.css', o.css || UI_CSS);
  if (o.yabanci !== false) {
    yaz('src/gizli.ts', 'export const x = "transition: all 900ms";\n');
    yaz('NOTLAR.md', 'transition: all 900ms ease;\n');
  }
  return { p, yaz, css: path.join(p, 'src', 'app.css') };
}

function uiCalistir(p, ...arg) {
  const r = spawnSync(process.execPath, [TARAMA, 'ui', ...arg, '--proje', p], { encoding: 'utf8' });
  return { out: r.stdout || '', err: r.stderr || '', kod: r.status };
}

function uiJson(p, ...arg) {
  return JSON.parse(uiCalistir(p, '--json', ...arg).out);
}

function uiDepo(p) {
  const vcs = (...a) => spawnSync('git', ['-C', p, ...a], { encoding: 'utf8' });
  vcs('init', '-q');
  vcs('add', '-A');
  vcs('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'ilk');
  return vcs;
}

// S1 denetimi (23.08.2026) dort uretim davranisinin hicbir assertion'a degmedigini
// gosterdi: kurgu dosyalarinda ne `hover:` utility'si, ne bilesen adi, ne `.map(`, ne de
// tavan altinda kalan sabit sure vardi. Rapor o dallari calisiyor sayiyordu; olculmemisti.
ol('ui kipi tailwind hover utility"sinde gecis eksigini yakalar', () => {
  const { p, yaz } = uiProje();
  yaz('src/Dugme.tsx', 'export const D = () => <b className="hover:opacity-100">x</b>;\n');
  yaz('src/Iyi.tsx', 'export const I = () => <b className="transition hover:opacity-100">y</b>;\n');
  // `.css` bulgusu ayri bir daldan (blok cozumlemesi) gelir ve kendi testi var; burada
  // olculen yalniz tailwind utility dali.
  const b = uiJson(p).bulgular.filter(
    (x) => x.tur === 'hoverGecisYok' && /\.tsx$/.test(x.dosya || '')
  );
  esit(b.length, 1, 'yalniz gecissiz olan bulgu vermeli');
  esit(b[0].dosya, 'src/Dugme.tsx');
  icerir(b[0].mesaj, 'hover var, geçiş yok');
});

ol('ui kipi gecissiz bileseni ve animasyonsuz listeyi yakalar', () => {
  const { p, yaz } = uiProje();
  yaz('src/Panel.tsx', 'export const P = () => <div>durgun</div>;\n');
  yaz(
    'src/Modal.tsx',
    'import { motion } from "motion";\nexport const M = () => <motion.div />;\n'
  );
  yaz('src/Liste.tsx', 'export const L = (a) => <ul>{a.map((x) => <li>{x}</li>)}</ul>;\n');
  yaz(
    'src/Canli.tsx',
    'import { AnimatePresence } from "motion";\nexport const C = (a) => <AnimatePresence>{a.map((x) => <li>{x}</li>)}</AnimatePresence>;\n'
  );
  const j = uiJson(p);
  const bilesen = j.bulgular.filter((x) => x.tur === 'gecissizBilesen').map((x) => x.dosya);
  esit(bilesen.join(','), 'src/Panel.tsx', 'hareket izi olan bilesen bulgu vermemeli');
  const liste = j.bulgular.filter((x) => x.tur === 'animasyonsuzListe').map((x) => x.dosya);
  esit(liste.join(','), 'src/Liste.tsx', 'AnimatePresence listeyi kurtarmali');
});

ol('ui kipi tavan altindaki sabit sureyi token disi sayar', () => {
  const { p } = uiProje({
    css: ['.hizli {', '  transition: opacity 90ms ease;', '}', ''].join('\n'),
  });
  const j = uiJson(p);
  const sabit = j.bulgular.filter((x) => x.tur === 'sabitSure');
  esit(sabit.length, 1, 'tavan altinda kalan sure sabitSure olmali');
  icerir(sabit[0].mesaj, 'sabit süre token değil');
  esit(
    j.bulgular.some((x) => x.tur === 'sureTavani'),
    false,
    'tavan asilmadigi icin sureTavani cikmamali'
  );
});

ol('ui kipi yalniz arayuz dosyalarina bakar, ajan acmaz', () => {
  const { p } = uiProje();
  const j = uiJson(p);
  esit(j.kip, 'ui', 'kip alani');
  esit(j.dosya, 1, 'yalniz src/app.css taranmali');
  esit(
    j.bulgular.every((b) => !b.dosya || b.dosya === 'src/app.css'),
    true,
    'ts ve md dosyasi bulguya girmemeli'
  );
  const r = uiCalistir(p);
  icermez(r.out, 'gizli.ts');
  icermez(r.out, 'NOTLAR.md');
  icermez(r.out, 'ajan');
  icermez(r.out, 'scout');
});

ol('ui durgunluk kolu motion kurulu ama import yoksa basliga yazar', () => {
  const { p, yaz } = uiProje();
  const r = uiCalistir(p);
  icerir(r.out, 'başlık: motion kurulu');
  icerir(r.out, 'hiç import edilmemiş');
  const j = uiJson(p);
  esit(j.baslik.startsWith('motion kurulu'), true, 'baslik alani');
  esit(
    j.bulgular.some((b) => b.tur === 'kuruluKullanilmamis' && b.kol === 'durgunluk'),
    true,
    'bulgu turu'
  );
  yaz(
    'src/Kutu.tsx',
    "import { motion } from 'motion/react';\nexport const Kutu = () => <motion.div />;\n"
  );
  esit(
    uiJson(p).bulgular.some((b) => b.tur === 'kuruluKullanilmamis'),
    false,
    'import varken bulgu kalkmali'
  );
  icermez(uiCalistir(p).out, 'başlık: motion kurulu');
  esit(
    uiJson(p).bulgular.some((b) => b.tur === 'motionConfigYok'),
    true,
    'import var ama sarmalayici yok'
  );
});

ol('ui hoveri olup gecisi olmayan ogeyi bulur', () => {
  const { p, yaz } = uiProje();
  const h = uiJson(p).bulgular.filter((b) => b.tur === 'hoverGecisYok');
  esit(h.length, 1, 'tek hover bulgusu');
  esit(h[0].dosya, 'src/app.css', 'dosya');
  esit(h[0].satir, 4, 'kural satiri');
  esit(h[0].kol, 'durgunluk', 'durgunluk kolu');
  yaz(
    'src/app.css',
    [
      '.tk-btn {',
      '  transition: opacity var(--tk-t-instant) var(--tk-e-out);',
      '}',
      '.tk-btn:hover {',
      '  background: rgba(0, 243, 255, 0.2);',
      '}',
      '',
    ].join('\n')
  );
  esit(
    uiJson(p).bulgular.some((b) => b.tur === 'hoverGecisYok'),
    false,
    'taban secicide transition varsa bulgu yok'
  );
});

ol('ui ihlal kolu yasak ozellik, tavan, token disi renk ve metne glow bulur', () => {
  const { p } = uiProje({
    css: [
      '.a { transition: width 200ms ease; }',
      '.b { transition: opacity 900ms var(--tk-e-out); }',
      '.c { color: #ff0000; }',
      '.d { text-shadow: 0 0 8px #00f3ff; }',
      '.e { transition-property: all; }',
      '.f { color: #6b7280; }',
      '',
    ].join('\n'),
  });
  const tur = uiJson(p)
    .bulgular.filter((b) => b.kol === 'ihlal')
    .map((b) => b.tur);
  for (const beklenen of [
    'yasakOzellik',
    'sureTavani',
    'tokenDisiRenk',
    'metneGlow',
    'transitionAll',
    'kontrast',
  ])
    esit(tur.includes(beklenen), true, beklenen + ' bulunmali');
});

ol('ui kipi WPF yerlesim ve golge animasyonunu ayirir', () => {
  const { p, yaz } = uiProje({ css: false, yabanci: false });
  yaz(
    'ui/Ana.xaml',
    [
      '<Window>',
      '  <DoubleAnimation Storyboard.TargetProperty="(UIElement.LayoutTransform).(ScaleTransform.ScaleX)" />',
      '  <DoubleAnimation Storyboard.TargetProperty="(UIElement.Effect).(BlurEffect.Radius)" />',
      '</Window>',
      '',
    ].join('\n')
  );
  const j = uiJson(p);
  const tur = j.bulgular.map((b) => b.tur);
  esit(tur.includes('wpfYerlesim'), true, 'LayoutTransform animasyon hedefi');
  esit(tur.includes('wpfGolge'), true, 'Effect animasyon hedefi');
  esit(
    j.bulgular.some((b) => b.tur === 'odakHalkasiYok' && b.mesaj.includes('FocusVisualStyle')),
    true,
    'xaml odak halkasi'
  );
});

ol('ui --tamamla yalniz mekanik olani duzeltir', () => {
  const { p, css } = uiProje({
    css: [
      '.kart {',
      '  transition: all 500ms ease;',
      '  color: #6b7280;',
      '}',
      '.rozet:hover {',
      '  background: #123456;',
      '}',
      '',
    ].join('\n'),
  });
  const vcs = uiDepo(p);
  const r = uiCalistir(p, '--tamamla');
  const govde = fs.readFileSync(css, 'utf8');
  icerir(govde, 'transition: opacity var(--tk-t-slow) ease, transform var(--tk-t-slow) ease;');
  icermez(govde, 'transition: all');
  icerir(govde, 'prefers-reduced-motion');
  icerir(govde, '#6b7280');
  icerir(govde, '#123456');
  icermez(govde.split('.rozet:hover')[1].split('}')[0], 'transition');
  icermez(govde, '@keyframes');
  icerir(r.out, '[düzeltildi]');
  icerir(r.out, 'karar gerektirdiği için düzeltilmedi');
  icerir(r.out, '- yazıldı: src/app.css:2');
  esit(
    vcs('status', '--porcelain').stdout.trim().length > 0,
    true,
    'degisiklik geri alinabilir olmali'
  );
  const kalan = uiCalistir(p).out;
  icerir(kalan, '#6b7280 — palet dışı renk');
  icerir(kalan, 'hover var, geçiş yok');
});

ol('ui --tamamla kirli calisma agacinda calismaz', () => {
  const { p, css } = uiProje();
  uiDepo(p);
  fs.writeFileSync(css, fs.readFileSync(css, 'utf8') + '.ek { color: #ff0000; }\n');
  const once = fs.readFileSync(css, 'utf8');
  const r = uiCalistir(p, '--tamamla');
  esit(r.kod, 2, 'kirli agac kullanim hatasidir, kaldi degil');
  icerir(r.out, 'DURDU');
  icerir(r.out, 'çalışma ağacı temiz değil');
  icermez(r.out, 'SONUÇ:');
  icermez(r.out, '[düzeltildi]');
  esit(fs.readFileSync(css, 'utf8'), once, 'hicbir dosya degismemeli');
  const b = uiCalistir(p);
  esit(b.kod, 1, 'bayraksiz cagri kirli agacta da calisir');
  icerir(b.out, 'SONUÇ:');
  esit(fs.readFileSync(css, 'utf8'), once, 'bayraksiz cagri salt okur');
});

ol('ui kipinde kapsayici kapisi gecerli', () => {
  const kap = taramaKapsayici();
  const r = uiCalistir(kap);
  esit(r.kod, 2, 'kapsayici kullanim hatasidir');
  icerir(r.out, 'DURDU');
  icerir(r.out, 'kapsayıcı klasör');
  icerir(r.out, 'node tarama.js ui --proje');
  icermez(r.out, 'SONUÇ:');
  const j = uiJson(kap);
  esit(j.durum, 'kapsayici', 'durum alani');
  esit(j.kip, 'ui', 'kip alani');
  icermez(uiCalistir(kap, '--kapsayici').out, 'DURDU');
});

ol('ui kipi uc profil kipini bozmaz', () => {
  const p = taramaProje(1);
  const j = JSON.parse(taramaCalistir(p, 'eco', '--json').out);
  esit(j.profil, 'eco', 'profil alani');
  esit(j.maddeler.length, 5, 'bes madde: dordu profille olculur, lisans her profilde ayni');
  esit(j.kip, undefined, 'profil ciktisinda kip alani olmamali');
  const t = taramaCalistir(p, 'premium', '--tamamla');
  icerir(t.out, '--tamamla · bu betik hiçbir dosyaya yazmadı');
  icermez(t.out, 'başlık:');
  esit(uiJson(p).kip, 'ui', 'ui kipi profilden bagimsiz');
  const kap = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-uiad-'));
  fs.mkdirSync(path.join(kap, 'ui'), { recursive: true });
  fs.writeFileSync(path.join(kap, 'ui', 'package.json'), '{"name":"ui","version":"1.0.0"}');
  const a = spawnSync(process.execPath, [TARAMA, 'eco', '--proje', 'ui'], {
    encoding: 'utf8',
    cwd: kap,
  });
  icerir(a.stdout, 'tarama: eco', 'ui adli klasor bayrak degeriyken kip sanilmamali');
});

ol('ui suresini rapora yazar ve bes saniyenin altinda kalir', () => {
  const { p, yaz } = uiProje();
  for (let i = 0; i < 120; i++) yaz('src/b' + i + '.css', '.a { transition: all 400ms ease; }\n');
  const bas = Date.now();
  const r = uiCalistir(p);
  const gecen = Date.now() - bas;
  icerir(r.out, 'süre: ');
  icerir(r.out, ' sn · ');
  icerir(r.out, ' arayüz dosyası');
  const j = uiJson(p);
  esit(j.dosya, 121, 'butun arayuz dosyalari taranmali');
  esit(j.sure_ms < 5000, true, 'olcum bes saniyenin altinda: ' + j.sure_ms + ' ms');
  esit(gecen < 5000, true, 'surec toplami bes saniyenin altinda: ' + gecen + ' ms');
});

ol('ui olculeri teknesyum-ui theme.css dosyasindan okur, kopyalamaz', () => {
  const govde = fs.readFileSync(TARAMA, 'utf8');
  icerir(govde, 'theme.css');
  icermez(govde, '#00f3ff');
  icermez(govde, '--tk-t-base');
  const { p } = uiProje({ css: '.a { transition: opacity 380ms ease; }\n' });
  const j = uiJson(p);
  esit(
    j.bulgular.some((b) => b.tur === 'sureTavani'),
    true,
    '380 ms tavanin ustunde sayilmali'
  );
  icerir(uiCalistir(p).out, '360 ms tavanının üstünde');
});

ol('scan.md ui kipini anlatir', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'scan.md'), 'utf8');
  icerir(k, 'eco | normal | premium | ui');
  icerir(k, '/teknesyum:scan ui');
  icerir(k, 'durgunluk');
  icerir(k, '--tamamla');
  const h = fs.readFileSync(path.join(KOK, 'commands', 'help.md'), 'utf8');
  icerir(h, '/scan');
});

const BEEP = path.join(KOK, 'scripts', 'beep.js');
const BEEP_KANCA = path.join(KOK, 'hooks', 'beep.js');

function beepCfg() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-beep-cfg-'));
}

function beepCalistir(argv, cfg, ek) {
  const r = spawnSync(process.execPath, [BEEP, ...argv], {
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: cfg,
      CLAUDE_CODE_SESSION_ID: '',
      CLAUDE_CODE_HOST_SESSION_ID: '',
      TEKNESYUM_BEEP_SESSIZ: '1',
      TEKNESYUM_DIL: 'tr',
      ...(ek || {}),
    },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

function beepKanca(olay, cfg, ek) {
  const r = spawnSync(process.execPath, [BEEP_KANCA], {
    encoding: 'utf8',
    input: typeof olay === 'string' ? olay : JSON.stringify(olay),
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: cfg,
      CLAUDE_CODE_SESSION_ID: '',
      CLAUDE_CODE_HOST_SESSION_ID: '',
      TEKNESYUM_BEEP_SESSIZ: '1',
      ...(ek || {}),
    },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

function beepCoz(cfg, cwd, sid) {
  const eski = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = cfg;
  try {
    return require(BEEP_KANCA).coz(cwd || cfg, sid);
  } finally {
    if (eski === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = eski;
  }
}

function beepMakine(cfg) {
  return JSON.parse(fs.readFileSync(path.join(cfg, 'teknesyum-beep.json'), 'utf8'));
}

function beepOturumYolu(cfg, sid) {
  return path.join(cfg, 'teknesyum', 'oturumlar', sid + '.json');
}

ol('beep argumansiz uc olayi kaynagiyla basar, ayar dosyasi yazmaz', () => {
  const cfg = beepCfg();
  const r = beepCalistir([], cfg);
  esit(r.kod, 0, 'cikis kodu');
  for (const o of ['bekleme', 'bitti', 'hata']) icerir(r.out, o);
  icerir(r.out, 'Windows Startup.wav');
  icerir(r.out, 'ding.wav');
  icerir(r.out, 'Windows Default.wav');
  icerir(r.out, '(varsayılan)');
  icerir(r.out, 'kaynak');
  esit(fs.existsSync(path.join(cfg, 'teknesyum-beep.json')), false, 'ayar dosyasi acilmamali');
});

ol('beep durum tablosu sureyi wav basligindan okur', () => {
  const r = beepCalistir([], beepCfg());
  icerir(r.out, '0,22 s');
  icerir(r.out, '0,40 s');
  icerir(r.out, '0,41 s');
});

ol('ayar dosyasi hic yokken kanca sesi varsayilanla cozer', () => {
  const cfg = beepCfg();
  const a = beepCoz(cfg, null, null);
  esit(a.toptan.deger, false, 'toptan acik gelmeli');
  esit(a.olaylar.bitti.dosya, 'ding.wav');
  esit(a.olaylar.bitti.kapali, false);
  esit(a.olaylar.bitti.kaynak, 'varsayılan');
});

ol('beep bitti off yalniz o olayi kapatir, otekiler acik kalir', () => {
  const cfg = beepCfg();
  esit(beepCalistir(['bitti', 'off'], cfg).kod, 0, 'cikis kodu');
  esit(beepMakine(cfg).olaylar.bitti.kapali, true);
  const a = beepCoz(cfg, null, null);
  esit(a.olaylar.bitti.kapali, true, 'bitti kapali olmali');
  esit(a.olaylar.bekleme.kapali, false, 'bekleme acik kalmali');
  beepCalistir(['bitti', 'on'], cfg);
  esit(beepMakine(cfg).olaylar.bitti.kapali, false, 'on geri acmali');
});

ol('beep off uctagini susturur, beep on tek tek ayarlari korur', () => {
  const cfg = beepCfg();
  beepCalistir(['bitti', 'off'], cfg);
  beepCalistir(['off'], cfg);
  const kapali = beepCoz(cfg, null, null);
  esit(kapali.toptan.deger, true, 'toptan kapali olmali');
  beepCalistir(['on'], cfg);
  const acik = beepCoz(cfg, null, null);
  esit(acik.toptan.deger, false, 'toptan acilmali');
  esit(acik.olaylar.bitti.kapali, true, 'tek tek yapilmis ayar korunmali');
});

ol('beep <olay> <dosya> sesi degistirir ve dosyaya yazar', () => {
  const cfg = beepCfg();
  esit(beepCalistir(['bekleme', 'chord.wav'], cfg).kod, 0, 'cikis kodu');
  esit(beepMakine(cfg).olaylar.bekleme.dosya, 'chord.wav');
  const a = beepCoz(cfg, null, null);
  esit(a.olaylar.bekleme.dosya, 'chord.wav');
  esit(a.olaylar.bekleme.kaynak, 'makine');
});

ol('beep bip hz/ms yazar ve dosya alanini dusurur', () => {
  const cfg = beepCfg();
  esit(beepCalistir(['hata', 'bip', '900', '120'], cfg).kod, 0, 'cikis kodu');
  const o = beepMakine(cfg).olaylar.hata;
  esit(o.hz, 900);
  esit(o.ms, 120);
  esit(o.dosya, undefined, 'dosya alani kalmamali');
  esit(beepCalistir(['hata', 'bip', '9', '120'], cfg).kod, 1, 'gecersiz hz durmali');
});

ol('ciplak beep makineye yazar, oturum kaydi acmaz', () => {
  const cfg = beepCfg();
  const sid = 'beep-genel';
  beepCalistir(['off'], cfg, { CLAUDE_CODE_SESSION_ID: sid });
  esit(beepMakine(cfg).kapali, true);
  esit(fs.existsSync(beepOturumYolu(cfg, sid)), false, 'oturum kaydi acilmamali');
});

ol('beep this eki yalniz oturumu yazar, makine dosyasi ellenmez', () => {
  const cfg = beepCfg();
  const sid = 'beep-oturum';
  esit(beepCalistir(['off', 'this'], cfg, { CLAUDE_CODE_SESSION_ID: sid }).kod, 0, 'cikis kodu');
  esit(fs.existsSync(path.join(cfg, 'teknesyum-beep.json')), false, 'makine dosyasi acilmamali');
  const k = JSON.parse(fs.readFileSync(beepOturumYolu(cfg, sid), 'utf8'));
  esit(k.beep.kapali, true);
  esit(beepCoz(cfg, null, sid).toptan.kaynak, 'oturum');
});

ol('oturum kaydi varken ciplak beep sessiz golgelemeyi uc satirda soyler', () => {
  const cfg = beepCfg();
  const sid = 'beep-golge';
  beepCalistir(['off', 'this'], cfg, { CLAUDE_CODE_SESSION_ID: sid });
  const r = beepCalistir(['on'], cfg, { CLAUDE_CODE_SESSION_ID: sid });
  icerir(r.out, 'Makine varsayılanı yazıldı.');
  icerir(r.out, 'oturuma özel ayar üstte kalır');
  icerir(r.out, '/beep this sil');
});

ol('beep golge uyarisi oturum kaydi yokken cikmaz', () => {
  const cfg = beepCfg();
  const r = beepCalistir(['on'], cfg, { CLAUDE_CODE_SESSION_ID: 'beep-temiz' });
  icermez(r.out, 'oturuma özel ayar üstte kalır');
});

ol('beep this sil oturum kaydini kaldirir, makineye donulur', () => {
  const cfg = beepCfg();
  const sid = 'beep-sil';
  beepCalistir(['off', 'this'], cfg, { CLAUDE_CODE_SESSION_ID: sid });
  const r = beepCalistir(['this', 'sil'], cfg, { CLAUDE_CODE_SESSION_ID: sid });
  esit(r.kod, 0, 'cikis kodu');
  icerir(r.out, 'oturuma özel ses ayarı silindi');
  esit(fs.existsSync(beepOturumYolu(cfg, sid)), false, 'kayit silinmeli');
  esit(beepCoz(cfg, null, sid).toptan.deger, false, 'makine varsayilanina donmeli');
});

ol('beep this sil oturum kaydindaki profili korur', () => {
  const cfg = beepCfg();
  const sid = 'beep-profilli';
  const yol = beepOturumYolu(cfg, sid);
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(yol, JSON.stringify({ profil: 'eco', ts: Date.now() }));
  beepCalistir(['off', 'this'], cfg, { CLAUDE_CODE_SESSION_ID: sid });
  beepCalistir(['this', 'sil'], cfg, { CLAUDE_CODE_SESSION_ID: sid });
  const k = JSON.parse(fs.readFileSync(yol, 'utf8'));
  esit(k.profil, 'eco', 'profil anahtari korunmali');
  esit(k.beep, undefined, 'beep anahtari silinmeli');
});

ol('beep this oturum kimligi yokken acikca durur', () => {
  const r = beepCalistir(['off', 'this'], beepCfg());
  esit(r.kod, 1, 'cikis kodu');
  icerir(r.err, 'oturum kimliği');
});

ol('bozuk ayar dosyasi varsayilana duser, hata basmaz', () => {
  const cfg = beepCfg();
  fs.writeFileSync(path.join(cfg, 'teknesyum-beep.json'), '{bozuk');
  const r = beepCalistir([], cfg);
  esit(r.kod, 0, 'cikis kodu');
  esit(r.err, '', 'stderr bos olmali');
  icerir(r.out, 'ding.wav');
  esit(beepKanca({ hook_event_name: 'Stop', cwd: '.' }, cfg).kod, 0, 'kanca cikis kodu');
});

ol('beep kancasi hicbir girdide sifirdan farkli donmez', () => {
  const cfg = beepCfg();
  for (const olay of ['Notification', 'Stop', 'StopFailure', 'PostToolUse', 'SessionEnd']) {
    const r = beepKanca({ hook_event_name: olay, cwd: '.' }, cfg);
    esit(r.kod, 0, olay + ' cikis kodu');
    esit(r.out, '', olay + ' ekrana yazmamali');
  }
  esit(beepKanca('{}', cfg).kod, 0, 'bos nesne');
  esit(beepKanca('bozuk json', cfg).kod, 0, 'bozuk girdi');
  esit(beepKanca('', cfg).kod, 0, 'bos girdi');
});

ol('proje dosyasi oturum ve makinenin ustundedir', () => {
  const cfg = beepCfg();
  const proje = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-beep-proje-'));
  fs.mkdirSync(path.join(proje, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(proje, '.claude', 'teknesyum-beep.json'),
    JSON.stringify({ olaylar: { bitti: { dosya: 'chord.wav' } } })
  );
  fs.writeFileSync(
    path.join(cfg, 'teknesyum-beep.json'),
    JSON.stringify({ olaylar: { bitti: { dosya: 'Windows Ringout.wav' } } })
  );
  const a = beepCoz(cfg, proje, null);
  esit(a.olaylar.bitti.dosya, 'chord.wav');
  esit(a.olaylar.bitti.kaynak, 'proje');
});

ol('bayat oturum kaydi ses ayarini tasimaz', () => {
  const cfg = beepCfg();
  const sid = 'beep-bayat';
  const yol = beepOturumYolu(cfg, sid);
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  fs.writeFileSync(
    yol,
    JSON.stringify({ beep: { kapali: true }, ts: Date.now() - 8 * 24 * 60 * 60 * 1000 })
  );
  esit(beepCoz(cfg, null, sid).toptan.deger, false, 'bayat kayit okunmamali');
});

ol('beep gocu elle eklenmis ses kancalarini siler, otekilere dokunmaz', () => {
  const cfg = beepCfg();
  const ayar = {
    statusLine: { type: 'command', command: 'node kopru.js' },
    hooks: {
      Notification: [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: 'powershell -NoProfile -Command "[console]::beep(880,200)"',
            },
          ],
        },
      ],
      Stop: [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command:
                'powershell -NoProfile -Command "(New-Object Media.SoundPlayer \'x.wav\').PlaySync()"',
            },
            { type: 'command', command: 'node baska.js' },
          ],
        },
      ],
      PreToolUse: [{ hooks: [{ type: 'command', command: 'node koru.js' }] }],
    },
  };
  fs.writeFileSync(path.join(cfg, 'settings.json'), JSON.stringify(ayar, null, 2));
  const r = beepCalistir([], cfg);
  icerir(r.out, 'settings.json temizlendi');
  const s = JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'));
  esit(s.hooks.Notification, undefined, 'bos kalan olay silinmeli');
  esit(s.hooks.Stop[0].hooks.length, 1, 'ilgisiz kanca kalmali');
  esit(s.hooks.Stop[0].hooks[0].command, 'node baska.js');
  esit(s.hooks.PreToolUse[0].hooks[0].command, 'node koru.js');
  esit(s.statusLine.command, 'node kopru.js', 'kanca disi ayar korunmali');
  icermez(beepCalistir([], cfg).out, 'settings.json temizlendi', 'goc bir kez calismali');
});

ol('beep gocu ilgisiz powershell kancasini silmez', () => {
  const cfg = beepCfg();
  fs.writeFileSync(
    path.join(cfg, 'settings.json'),
    JSON.stringify({
      hooks: {
        Stop: [
          { hooks: [{ type: 'command', command: 'powershell -NoProfile -Command "git status"' }] },
        ],
      },
    })
  );
  icermez(beepCalistir([], cfg).out, 'settings.json temizlendi');
  const s = JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'));
  esit(s.hooks.Stop[0].hooks.length, 1, 'ilgisiz kanca durmali');
});

ol('hooks.json beep girisleri async ve ayri grupta', () => {
  const h = JSON.parse(fs.readFileSync(path.join(KOK, 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const olay of ['Notification', 'StopFailure']) {
    const grup = h[olay].filter((g) => g.hooks.some((k) => k.command.includes('hooks/beep.js')));
    esit(grup.length, 1, olay + ' icin tek beep grubu olmali');
    esit(grup[0].hooks.length, 1, olay + ' beep grubu yalniz beep tasimali');
    esit(grup[0].hooks[0].async, true, olay + ' async olmali');
  }
  icermez(JSON.stringify(h.Stop), 'beep.js', 'bitis sesi Stop kancasindan gelmemeli');
});

// Bitis sesi makbuzla ayni karardan beslenir: `Stop` bir turda birden cok kez gelir,
// makbuz ara duraklarda basilmaz, ses de basilmamali.
ol('bitis sesi tur makbuzuyla ayni yerden cikar', () => {
  const k = fs.readFileSync(path.join(KOK, 'hooks', 'relay-watch.js'), 'utf8');
  const g = k.indexOf('function turBitir');
  const ses = k.indexOf('bitisSesi(j)', g);
  const makbuz = k.indexOf('turOzetiBas(', ses);
  if (g < 0 || ses < 0 || makbuz < 0) throw new Error('turBitir akisi bulunamadi');
  esit(ses < makbuz, true, 'ses makbuzdan hemen once cagrilmali');
  // Yorumda eski davranisin adi geciyor; olculen sey kod, o yuzden yorum satirlari atilir.
  const govdeTur = k
    .slice(g, makbuz)
    .split('\n')
    .filter((s) => !s.trim().startsWith('//'))
    .join('\n');
  icerir(govdeTur, 'acikIsVar(iz)', 'makbuz ve ses acik is kapisindan gecmeli');
  const govde = k.slice(k.indexOf('function bitisSesi'));
  icerir(govde, 'detached: true', 'calma cagrisi turu bloklamamali');
  icerir(govde, 'unref()');
  icerir(govde, "hook_event_name: 'Stop'", 'beep.js olay adiyla cozer');
});

ol('beep.md ve help.md komutu anlatir', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'beep.md'), 'utf8');
  icerir(k, 'scripts/beep.js');
  icerir(k, 'Media.SoundPlayer');
  icerir(k, '/beep this sil');
  icerir(k, '/beep dinle');
  icerir(k, 'O üç satırı kısaltma');
  icerir(k, 'PushNotification');
  icerir(k, '`Stop` kancasına bağlı değildir', 'bitis sesinin kaynagi anlatilmali');
  icerir(fs.readFileSync(path.join(KOK, 'commands', 'help.md'), 'utf8'), '/beep');
});

ol('beep dinle uc sesi sirayla bildirir', () => {
  const r = beepCalistir(['dinle'], beepCfg());
  esit(r.kod, 0, 'cikis kodu');
  icerir(r.out, 'ses sırayla çalındı');
  icerir(r.out, 'bekleme · Windows Startup.wav');
  icerir(r.out, 'bitti · ding.wav');
  icerir(r.out, 'hata · Windows Default.wav');
  icerir(beepCalistir(['test'], beepCfg()).out, 'ses sırayla çalındı');
});

// Tarafsizlik: depoyu indiren kisi eklentiyi yazan kisinin kurallarini ve zevkini
// devralmaz. Sifir kural, sifir arayuz ayari ile karsilanir; neon standardi bir sablon
// olarak sunulur, sessizce yururluge girmez.
const KURULUM = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'post-install.js'), 'utf8');

ol('kurulum kural defterini bos acar, hazir kural yazmaz', () => {
  const m = KURULUM.match(/const RULES = `([\s\S]*?)`;/);
  if (!m) throw new Error('RULES sablonu bulunamadi');
  const govde = m[1];
  icerir(govde, '# Rules');
  icermez(govde, 'No comments in code');
  icermez(govde, 'teknesyum-ui');
  const madde = govde.split('\n').filter((s) => s.trim().startsWith('- '));
  esit(madde.length, 0, 'sablonda hazir kural kalmamali');
});

ol('setup kural dosyasini bos acar ve gerekcesini soyler', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'setup.md'), 'utf8');
  icermez(k, 'No comments in code');
  icermez(k, "Don't ask for routine approval");
  icerir(k, '**boş** oluştur');
  icerir(k, '/rule');
});

ol('ui standardi ayar dosyasi olmadan yururlukte degildir', () => {
  const k = fs.readFileSync(path.join(KOK, 'skills', 'teknesyum-ui', 'SKILL.md'), 'utf8');
  icerir(k, 'kendiliğinden yürürlüğe girmez');
  icerir(k, 'İkisi de yok');
  icerir(k, '/uisetup');
  icerir(k, 'Kendiliğinden yürürlüğe girmez', 'skill tanimi da soylemeli');
});

ol('uisetup sablonu sunar, kendiliginden dosya yazmaz', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'uisetup.md'), 'utf8');
  icerir(k, '/uisetup sablon');
  icerir(k, '/uisetup kendim');
  icerir(k, 'Kullanıcı istemeden bu dosyayı oluşturma');
  icerir(k, 'Arayüz standardı kurulu değil');
});

ol('ui-builder standart kapaliyken renk dayatmaz', () => {
  const k = fs.readFileSync(path.join(KOK, 'agents', 'ui-builder.md'), 'utf8');
  icerir(k, 'standart yürürlükte değildir');
  icerir(k, 'tek renk dayatmazsın');
  icerir(k, 'standart yürürlükteyken istisnasız');
});

ol('scan ui standart kurulu degilken bulgulari ihlal saymaz', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'scan.md'), 'utf8');
  icerir(k, 'standart kurulu değil, bulgular ihlal değil öneri');
});

// Ozel dosya aynasi: kisisel dosyalar tek private depoda, projeye gore bolunmus.
// Depo parca parca cekilir; testler bunu yerel bir bare depoyla uctan uca dogrular.
const OZEL = path.join(KOK, 'scripts', 'ozel.js');

function ozelCalistir(argv, cfg, cwd) {
  const r = spawnSync(process.execPath, [OZEL].concat(argv), {
    encoding: 'utf8',
    cwd: cwd || cfg,
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfg },
    timeout: 120000,
  });
  return { kod: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function gitCalistir(kok, argv) {
  return spawnSync('git', argv, {
    cwd: kok,
    encoding: 'utf8',
    timeout: 60000,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@t',
    },
  });
}

function ozelSahne() {
  const kok = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ozel-'));
  const cfg = path.join(kok, 'cfg');
  const proje = path.join(kok, 'proje');
  const uzak = path.join(kok, 'uzak.git');
  fs.mkdirSync(cfg);
  fs.mkdirSync(proje);
  gitCalistir(kok, ['init', '--bare', '--initial-branch=main', uzak]);
  gitCalistir(proje, ['init', '--initial-branch=main']);
  fs.writeFileSync(path.join(proje, 'not.txt'), 'x');
  gitCalistir(proje, ['add', '-A']);
  gitCalistir(proje, ['commit', '-m', 'ilk']);
  return { kok, cfg, proje, uzak };
}

ol('ozel kurulu degilken hicbir alt komut cokmez', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ozel-yok-'));
  for (const k of [[], ['pusla'], ['cek'], ['projeler'], ['ekle', 'a.txt']]) {
    const r = ozelCalistir(k, cfg);
    esit(r.kod, 0, (k[0] || 'durum') + ' cikis kodu 0 olmali');
    icerir(r.out, 'kurulu değil', (k[0] || 'durum') + ' kurulum yonergesi basmali');
  }
  esit(ozelCalistir(['pusla', '--sessiz'], cfg).out.trim(), '', 'sessiz kip hic yazmamali');
  esit(fs.existsSync(path.join(cfg, 'teknesyum-ozel.json')), false, 'ayar dosyasi acilmamali');
});

ol('ozel yollari ev ve proje koku onekiyle saklar', () => {
  const o = require(OZEL);
  esit(o.hedefAdi('~/.claude/teknesyum.json'), 'ev/.claude/teknesyum.json');
  esit(o.hedefAdi('./.claude/yerel.json'), 'proje/.claude/yerel.json');
  esit(o.kisalt(path.join(os.homedir(), '.claude', 'a.json'), 'C:/yok'), '~/.claude/a.json');
  esit(o.kisalt(path.join(os.tmpdir(), 'p', 'b.json'), path.join(os.tmpdir(), 'p')), './b.json');
  esit(o.slug('Teknesyum Base'), 'teknesyum-base');
  esit(o.slug('Şükrü Öğütçü'), 'sukru-ogutcu');
});

ol('ozel kur kismi klon acar, yalniz proje klasorunu serer', () => {
  const s = ozelSahne();
  const r = ozelCalistir(['kur', s.uzak, 'alfa'], s.cfg, s.proje);
  esit(r.kod, 0, 'kurulum cikis kodu');
  icerir(r.out, 'deponun kalanı diske serilmez');
  const a = JSON.parse(fs.readFileSync(path.join(s.cfg, 'teknesyum-ozel.json'), 'utf8'));
  esit(a.depo, s.uzak);
  // Anahtar `realpath` ile yazılır: Windows'ta `os.tmpdir()` 8.3 kısa yol verirken
  // `git rev-parse` uzun yol veriyor, ikisi `path.resolve` ile eşitlenmiyor.
  esit(a.projeler[fs.realpathSync.native(s.proje)], 'alfa');
  const klon = path.join(s.cfg, 'teknesyum-ozel');
  esit(fs.existsSync(path.join(klon, '.git')), true, 'klon acilmali');
  const filtre = gitCalistir(klon, ['config', '--get', 'remote.origin.promisor']).stdout || '';
  esit(filtre.trim(), 'true', 'promisor klon olmali — icerikler tembel iner');
  const sparse = gitCalistir(klon, ['sparse-checkout', 'list']).stdout || '';
  esit(sparse.trim(), 'alfa', 'yalniz bu projenin klasoru serilmeli');
});

ol('ozel ekle-pusla-cek dongusu dosyayi tasir', () => {
  const s = ozelSahne();
  ozelCalistir(['kur', s.uzak, 'alfa'], s.cfg, s.proje);
  fs.mkdirSync(path.join(s.proje, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(s.proje, '.claude', 'yerel.json'), '{"a":1}');

  const e = ozelCalistir(['ekle', './.claude/yerel.json'], s.cfg, s.proje);
  icerir(e.out, './.claude/yerel.json');
  icerir(ozelCalistir([], s.cfg, s.proje).out, 'yeni');

  const p = ozelCalistir(['pusla'], s.cfg, s.proje);
  esit(p.kod, 0, 'pusla cikis kodu');
  icerir(p.out, 'Push tamam.');
  const uzakAgac = gitCalistir(s.uzak, ['ls-tree', '-r', '--name-only', 'main']).stdout || '';
  icerir(uzakAgac, 'alfa/proje/.claude/yerel.json', 'dosya uzak depoya gitmeli');
  icerir(uzakAgac, 'alfa/ozel.json', 'manifest depoda durmali');

  icerir(ozelCalistir(['pusla'], s.cfg, s.proje).out, 'güncel', 'fark yokken commit acilmamali');

  fs.writeFileSync(path.join(s.proje, '.claude', 'yerel.json'), '{"a":2}');
  icerir(ozelCalistir([], s.cfg, s.proje).out, 'değişti');
  icerir(ozelCalistir(['pusla'], s.cfg, s.proje).out, 'Push tamam.');

  fs.writeFileSync(path.join(s.proje, '.claude', 'yerel.json'), '{"a":3}');
  const c = ozelCalistir(['cek'], s.cfg, s.proje);
  icerir(c.out, 'korundu', 'cek yereli sessizce ezmemeli');
  esit(fs.readFileSync(path.join(s.proje, '.claude', 'yerel.json'), 'utf8'), '{"a":3}');
  ozelCalistir(['cek', '--zorla'], s.cfg, s.proje);
  esit(
    fs.readFileSync(path.join(s.proje, '.claude', 'yerel.json'), 'utf8'),
    '{"a":2}',
    'zorla aynadakini yazmali'
  );
});

ol('ozel kaynak dosya silinince aynadaki kopyayi dusurmez', () => {
  const s = ozelSahne();
  ozelCalistir(['kur', s.uzak, 'alfa'], s.cfg, s.proje);
  fs.writeFileSync(path.join(s.proje, 'gizli.txt'), 'veri');
  ozelCalistir(['ekle', './gizli.txt'], s.cfg, s.proje);
  ozelCalistir(['pusla'], s.cfg, s.proje);
  fs.unlinkSync(path.join(s.proje, 'gizli.txt'));
  const d = ozelCalistir([], s.cfg, s.proje);
  icerir(d.out, 'kaynak yok');
  const p = ozelCalistir(['pusla'], s.cfg, s.proje);
  icerir(p.out, 'güncel', 'eksik kaynak yeni commit acmamali');
  esit(
    fs.existsSync(path.join(s.cfg, 'teknesyum-ozel', 'alfa', 'proje', 'gizli.txt')),
    true,
    'aynadaki kopya durmali'
  );
});

ol('ozel projeler listesi icerik indirmeden okunur', () => {
  const s = ozelSahne();
  ozelCalistir(['kur', s.uzak, 'alfa'], s.cfg, s.proje);
  fs.writeFileSync(path.join(s.proje, 'a.txt'), '1');
  ozelCalistir(['ekle', './a.txt'], s.cfg, s.proje);
  ozelCalistir(['pusla'], s.cfg, s.proje);
  const klon = path.join(s.cfg, 'teknesyum-ozel');
  gitCalistir(klon, ['sparse-checkout', 'set', 'beta']);
  const r = ozelCalistir(['projeler'], s.cfg, s.proje);
  icerir(r.out, 'alfa');
  icermez(r.out, '← bu makinede inen', 'serilmeyen klasor inen sayilmamali');
  esit(fs.existsSync(path.join(klon, 'alfa')), false, 'sparse disi klasor diske inmemeli');
  ozelCalistir(['ac', 'alfa'], s.cfg, s.proje);
  esit(fs.existsSync(path.join(klon, 'alfa', 'proje', 'a.txt')), true, 'ac klasoru geri sermeli');
});

// "Premium dedim, autocontext degismedi" iki ayri sebepten olur: deger oturum acilisinda
// okunur ve `1000000` bir tavandir. Ikisi de soylenmezse komut calismamis gorunur.
// Bir donem burada "Opus ~200k" yaziliyordu ve yanlisti: Opus 4.7 ve Sonnet 5 yerel 1M
// tasiyor, 200k kapatilmis halin sonucu. Gunluk bunu soyluyordu ve okunmamisti
// (docs/openlogs/HATA-200k-baglam-penceresi-iddiasi.md). Not artik sabit sayi soylemiyor,
// kisitlayan degiskeni olcuyor.
ol('tavan notu 200k iddiasi tasimaz, kisitlayan degiskeni olcer', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-tavan-'));
  const c = (ek) =>
    spawnSync(
      process.execPath,
      [path.join(KOK, 'scripts', 'premium.js'), 'autocompact', '900000'],
      {
        encoding: 'utf8',
        env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, ...ek },
        timeout: 60000,
      }
    ).stdout;
  const temiz = c({ CLAUDE_CODE_DISABLE_1M_CONTEXT: '', CLAUDE_CODE_MAX_CONTEXT_TOKENS: '' });
  icermez(temiz, '200k', 'sabit 200k iddiasi kalmamali');
  icermez(temiz, 'Opus', 'modele ozgu sayi soylenmemeli');
  icerir(temiz, 'tavan, garanti değil');
  const kisitli = c({
    CLAUDE_CODE_DISABLE_1M_CONTEXT: '1',
    CLAUDE_CODE_MAX_CONTEXT_TOKENS: '',
  });
  icerir(kisitli, 'CLAUDE_CODE_DISABLE_1M_CONTEXT', 'kisit varsa adiyla soylenmeli');
});

ol('autoCompactWindow yazilinca yeniden baslatma ve tavan notu basilir', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ac-'));
  const c = (a) =>
    spawnSync(process.execPath, [path.join(KOK, 'scripts', 'premium.js')].concat(a), {
      encoding: 'utf8',
      env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, CLAUDE_CODE_AUTO_COMPACT_WINDOW: '' },
      timeout: 60000,
    });
  const ilk = c(['autocompact', '900000']).stdout;
  icerir(ilk, 'tavan, garanti değil');
  icerir(ilk, 'Claude Code yeniden başlayınca');
  const ikinci = c(['autocompact', '900000']).stdout;
  icermez(ikinci, 'yeniden başlayınca', 'deger degismediyse yeniden baslatma notu cikmamali');
  icermez(
    c(['autocompact', '150000']).stdout,
    'tavan, garanti değil',
    '200k alti tavan notu almamali'
  );
});

// Kullanici "pusla" diyor, `/pusla` yazmiyor. Iki depoyu birden gondermeyi modelin
// hatirlamasina birakmak, unutuldugu turda fark edilmeyen bir yedek kaybidir.
ol('pusla sozu ayna kuruluyken iki depo akisini hatirlatir', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-pusla-'));
  const ek = konfig(true);
  const sor = (prompt) => {
    const r = calistir(IZLE, { ...ort(p), hook_event_name: 'UserPromptSubmit', prompt }, ek);
    try {
      return JSON.parse(r.out).hookSpecificOutput.additionalContext || '';
    } catch {
      return '';
    }
  };
  icermez(sor('puşla'), 'scripts' + path.sep + 'ozel.js', 'ayna kurulu degilken yazilmamali');
  fs.writeFileSync(path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum-ozel.json'), '{"depo":"x"}');
  const m = sor('tamamdır puşla');
  icerir(m, 'ozel.js');
  icerir(m, 'koşulsuz');
  icerir(sor('pusla bakalım'), 'ozel.js', 'sapkasiz yazim da yakalanmali');
  icerir(sor('pushla'), 'ozel.js', 'pushla ayni sozdur');
  icermez(sor('/pusla'), 'ozel.js', 'komut zaten kendi belgesinden geliyor');
  icermez(sor('puslu hava ve pusula yonu'), 'ozel.js', 'benzeyen kelime tetiklememeli');
});

// Bozuklugu goren oturumla onu cozebilecek oturum ayni degil; gunluk ikisinin arasindaki
// yol. Makara makine geneli, cunku baska projedeki oturum Base'in yerini bilmek zorunda
// kalirsa yol bulunamadigi her seferde gunluk hic yazilmaz.
// Alt ajanin bitisi kullanicinin isinin bitisi degil. Kanca gercekten ne yapiyor,
// kaynaga bakarak degil kosarak olculur.
ol('alt ajan bitisi ses vermez, ses yalniz tur makbuzuyla cikar', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ses-'));
  for (const olay of ['SubagentStop', 'SubagentStart', 'PostToolUse', 'UserPromptSubmit']) {
    const r = calistir(
      IZLE,
      { ...ort(p), hook_event_name: olay, agent_id: 'a1', prompt: 'x' },
      konfig(true)
    );
    icermez(r.out, 'beep', olay + ' ses tetiklememeli');
  }
  const k = fs.readFileSync(path.join(KOK, 'hooks', 'relay-watch.js'), 'utf8');
  const cagri = k.split('\n').filter((s) => /^\s*bitisSesi\(j\);/.test(s));
  esit(cagri.length, 1, 'bitisSesi tek yerden cagrilmali');
  const t = k.split('\n').filter((s) => /return turBitir\(/.test(s));
  esit(t.length, 1, 'turBitir tek yerden cagrilmali');
  const h = JSON.parse(fs.readFileSync(path.join(KOK, 'hooks', 'hooks.json'), 'utf8')).hooks;
  for (const olay of ['SubagentStop', 'SubagentStart', 'Stop', 'PostToolUse'])
    icermez(JSON.stringify(h[olay] || []), 'beep.js', olay + ' kancasinda beep olmamali');
});

ol('log gunlugu makaraya yazar, listeler ve iki turlu kapatir', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-log-'));
  const proje = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-logp-'));
  const c = (a, cwd) =>
    spawnSync(process.execPath, [path.join(KOK, 'scripts', 'log.js')].concat(a), {
      encoding: 'utf8',
      cwd: cwd || proje,
      env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, TEKNESYUM_BASE: '' },
      timeout: 60000,
    });
  icerir(c([]).stdout, 'Açık günlük yok');

  const y = c([
    'yaz',
    '--baslik',
    'Statusline yanlış sayıyor',
    '--belirti',
    'üç ajanı bir gösteriyor',
    '--kaynak',
    'bridge.js',
  ]);
  esit(y.status, 0, 'yaz cikis kodu');
  const yol = path.join(cfg, 'teknesyum', 'openlogs', 'HATA-statusline-yanlis-sayiyor.md');
  esit(fs.existsSync(yol), true, 'gunluk makaraya dusmeli');
  const govde = fs.readFileSync(yol, 'utf8');
  icerir(govde, '# Hata: Statusline yanlış sayıyor');
  icerir(govde, 'üç ajanı bir gösteriyor');
  icerir(govde, '## 2. Ölçü');
  icerir(c(['yaz', '--baslik', 'Statusline yanlış sayıyor']).stdout, 'zaten var');

  const l = c([]).stdout;
  icerir(l, '1 açık günlük');
  icerir(l, 'statusline-yanlis-sayiyor');
  icerir(l, 'makara');
  icerir(c(['oku', 'statusline']).stdout, '# Hata: Statusline yanlış sayıyor');
  esit(c(['sayi']).stdout.trim(), '1');

  // Depo kokunu isaret edince `al` gunlugu surum kontrolune tasir.
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-logb-'));
  fs.mkdirSync(path.join(base, 'teknesyum', '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(base, 'teknesyum', '.claude-plugin', 'plugin.json'), '{}');
  const cb = (a) =>
    spawnSync(process.execPath, [path.join(KOK, 'scripts', 'log.js')].concat(a), {
      encoding: 'utf8',
      cwd: proje,
      env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, TEKNESYUM_BASE: base },
      timeout: 60000,
    });
  icerir(cb(['al', 'statusline']).stdout, 'Depoya taşındı');
  const depoYol = path.join(base, 'docs', 'openlogs', 'HATA-statusline-yanlis-sayiyor.md');
  esit(fs.existsSync(depoYol), true, 'depoya tasinmali');
  esit(fs.existsSync(yol), false, 'makaradan kalkmali');
  icerir(cb([]).stdout, 'depo');

  icerir(cb(['arsivle', 'statusline']).stdout, 'Arşivlendi');
  esit(
    fs.existsSync(
      path.join(base, 'docs', 'openlogs', 'kapali', 'HATA-statusline-yanlis-sayiyor.md')
    ),
    true,
    'arsive tasinmali'
  );
  icerir(cb([]).stdout, 'Açık günlük yok', 'arsivlenen acik sayilmamali');

  cb(['yaz', '--baslik', 'İkinci hata']);
  esit(cb(['kapat', 'ikinci']).status, 0);
  icerir(cb([]).stdout, 'Açık günlük yok', 'kapat silmeli');
  esit(cb(['oku', 'ikinci']).status, 1, 'olmayan gunluk hata vermeli');
});

ol('acilis acik gunlugu ve bildirme yordamini soyler', () => {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-logacilis-'));
  const ek = konfig(true);
  const sor = () => calistir(IZLE, { ...ort(p), hook_event_name: 'SessionStart' }, ek);
  const bos = sor();
  icerir(bos.out, 'bozuk davranırsa', 'yordam her oturumda bir kez yazilmali');
  icermez(bos.out, 'açık hata günlüğü', 'gunluk yokken sayi satiri cikmamali');
  const d = path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum', 'openlogs');
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'HATA-deneme.md'), '# Hata: deneme');
  icerir(sor().out, 'açık hata günlüğü');
});

// Kosulabilir kriter: yetki degismiyor, komutu T0 kosuyor; degisen tek sey "gecti" derken
// neye bakildiginin sozlesmede yazili olmasi. Auditor'a Bash verilmedi.
ol('kosulabilir kriter CHECK ile yazilir, denetciye Bash verilmez', () => {
  const s = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'references', 'protocol.md'), 'utf8');
  icerir(s, 'CHECK:');
  icerir(s, 'Asıl şart çıkış kodudur');
  icerir(s, '`high` ve üstünde `CHECK`siz kriter sözleşmeye');
  icerir(s, 'alındı ve verilmeyecek', 'denetciye Bash verilmedigi yazili kalmali');
  const t = fs.readFileSync(
    path.join(KOK, 'skills', 'relay', 'assets', 'contract.template.md'),
    'utf8'
  );
  icerir(t, 'CHECK: <geçti/kaldı yapan kabuk komutu>');
  icerir(t, 'EXPECT: <çıktıda aranan dizgi — isteğe bağlı>');
  const a = fs.readFileSync(path.join(KOK, 'agents', 'auditor.md'), 'utf8');
  icerir(a, 'Çıkış kodu sıfır değilse KALDI');
  icerir(a, '? kanıtsız');
  const fm = a.slice(0, a.indexOf('---', 4));
  icermez(fm, 'Bash', 'auditor arac listesine Bash girmemeli');
  icerir(fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8'), 'CHECK:');
});

ol('log.md ve openlogs README yordami anlatir', () => {
  const k = fs.readFileSync(path.join(KOK, 'commands', 'log.md'), 'utf8');
  icerir(k, 'scripts/log.js');
  icerir(k, '/log arsivle');
  icerir(k, 'Karar senin değil kullanıcınındır');
  icerir(k, 'Çözemediysen günlüğü kapatma');
  const r = fs.readFileSync(path.join(__dirname, '..', 'docs', 'openlogs', 'README.md'), 'utf8');
  icerir(r, '/log yaz');
  icerir(r, '## 2. Ölçü');
  icerir(r, 'kararı kullanıcı verir');
  icerir(fs.readFileSync(path.join(KOK, 'commands', 'help.md'), 'utf8'), '/log');
});

ol('ozel.md ve pusla.md akisi anlatir', () => {
  const o = fs.readFileSync(path.join(KOK, 'commands', 'ozel.md'), 'utf8');
  icerir(o, 'scripts/ozel.js');
  icerir(o, '--filter=blob:none');
  icerir(o, 'sparse-checkout');
  icerir(o, 'Deponun tamamı hiçbir zaman çekilmez');
  icerir(o, '/ozel cek --zorla');
  const p = fs.readFileSync(path.join(KOK, 'commands', 'pusla.md'), 'utf8');
  icerir(p, 'scripts/ozel.js" pusla');
  icerir(p, 'koşullu değildir');
  icerir(p, 'test/run.js');
  const h = fs.readFileSync(path.join(KOK, 'commands', 'help.md'), 'utf8');
  icerir(h, '/ozel');
  icerir(h, '/pusla');
});

// U2 · tipografi dalgasi (docs/KARARLAR-ui-2026-08-23.md). Ayni degerler BES ayri elle
// yazilmis kopyada durur: SKILL §3 · theme.css · Theme.xaml · Palette.cs · ve
// references/components.md (Tailwind karsiliklari). Asagidaki testler kopyalarin
// ayrismasini yakalar — biri guncellenip otekiler unutulursa duserler.
//
// Bu blogun testleri DAVRANIS olcer, duzyazi degil. Bir cumlenin yeniden yazilmasi
// testi dusurmemeli; yalnizca kuralin bozulmasi dusurmeli. Bu yuzden pozitif
// eslemeler token adlari, sayilar, kod tanimlayicilari ve tablo yapisi uzerindendir.
// Eski metnin geri gelmesini yasaklayan NEGATIF eslemeler duzyazi olabilir: onlar
// asla yanlislikla dusmez, yalnizca bir seyi kacirabilirler.
const U2K = path.join(KOK, 'skills', 'teknesyum-ui');
const U2_SKILL = fs.readFileSync(path.join(U2K, 'SKILL.md'), 'utf8');
const U2_CSS = fs.readFileSync(path.join(U2K, 'assets', 'theme.css'), 'utf8');
const U2_XAML = fs.readFileSync(path.join(U2K, 'assets', 'Theme.xaml'), 'utf8');
const U2_CS = fs.readFileSync(path.join(U2K, 'assets', 'Palette.cs'), 'utf8');
const U2_TSX = fs.readFileSync(path.join(U2K, 'assets', 'Signature.tsx'), 'utf8');
const U2_SXAML = fs.readFileSync(path.join(U2K, 'assets', 'Signature.xaml'), 'utf8');
const U2_LAYOUT = fs.readFileSync(path.join(U2K, 'references', 'layout.md'), 'utf8');
const U2_DESKTOP = fs.readFileSync(path.join(U2K, 'references', 'desktop.md'), 'utf8');
const U2_MOTION = fs.readFileSync(path.join(U2K, 'references', 'motion.md'), 'utf8');
const U2_COMP = fs.readFileSync(path.join(U2K, 'references', 'components.md'), 'utf8');

// --- U2 yardimcilari. Hepsi bos sonucu HATA sayar: bir yardimci sessizce bos donerse
// ustundeki butun testler yesil kalirken hicbir sey olcmez (denetim turu 1, KRITIK 1).

// Markdown dosyasindaki ``` bloklarinin govdesi. Duzyazi icinde gecen `rounded-2xl`
// gibi ornekler kapsam disi kalsin diye yalniz cit icindekiler alinir.
function u2Kod(ad, k) {
  const l = k.match(/```[a-z]*\r?\n[\s\S]*?```/g) || [];
  if (!l.length) throw new Error(ad + ': hic kod blogu eslesmedi — desen bozuk olabilir');
  return l.join('\n');
}

// SKILL §3'teki rol tablosunu satir satir cozer. Rol adlarina bakmaz — kolon
// degerlerini okur, cunku rol adi yeniden yazilabilir, 24 punto yazilamaz.
// Kolonlar: rol | boyut (fs-N) | agirlik | satir | tracking | renk
function u2Roller() {
  const s3 = U2_SKILL.slice(U2_SKILL.indexOf('## 3. '), U2_SKILL.indexOf('## 4. '));
  const roller = [];
  for (const r of s3.split('\n')) {
    if (!r.startsWith('|')) continue;
    const h = r
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim().replace(/[*`]/g, ''));
    if (h.length !== 6) continue;
    const boyut = /^(\d+)\s*\(fs-(\d)\)$/.exec(h[1]);
    const agirlik = /^\d+$/.test(h[2]) ? Number(h[2]) : null;
    if (!boyut || agirlik === null) continue;
    const tr = h[4].replace('−', '-');
    roller.push({
      rol: h[0],
      boyut: Number(boyut[1]),
      fs: 'fs-' + boyut[2],
      agirlik,
      satir: Number(h[3]),
      tracking: tr === '0' ? 0 : Number(/^(-?[\d.]+)em$/.exec(tr)[1]),
    });
  }
  if (roller.length < 6)
    throw new Error('SKILL §3 rol tablosu cozulemedi, bulunan satir: ' + roller.length);
  return roller;
}

ol('ui font zincirinin basi bes kopyada da ayni, kuyrugu platform sinirina uyar', () => {
  // Ayrisma sayilan tek sey zincirin BASI: sans Atkinson → Segoe UI, mono Cascadia →
  // Consolas. Kuyrugu (`system-ui`, `ui-monospace`, `Courier New`) CSS'e ozgudur ve
  // .NET zincirinde karsiligi yoktur; onu aramak platform sinirini kusur saymak olur.
  icerir(U2_CSS, "'Atkinson Hyperlegible Next', 'Segoe UI'");
  icerir(U2_CSS, 'Cascadia Mono, Consolas');
  icerir(U2_XAML, 'Atkinson Hyperlegible Next, Segoe UI');
  icerir(U2_XAML, 'Cascadia Mono, Consolas');
  icerir(U2_SKILL, "'Atkinson Hyperlegible Next', 'Segoe UI'");
  icerir(U2_SKILL, 'Cascadia Mono, Consolas');
  icerir(U2_CS, '"Atkinson Hyperlegible Next", "Segoe UI"');
  icerir(U2_CS, '"Cascadia Mono", "Consolas"');
  // SKILL "birebir tasir" demez — kuyrugun kisaldigini ve bunun ayrisma olmadigini
  // yazili soyler. Yazmazsa bir sonraki denetci kuyrugu kusur sanir.
  icermez(U2_SKILL, 'bu iki satırı\nbirebir taşır');
  const s3 = U2_SKILL.slice(U2_SKILL.indexOf('## 3. '), U2_SKILL.indexOf('## 4. '));
  icerir(s3, 'ui-monospace');
  icerir(s3, 'platform sınırıdır');
  // Roboto tek kaynaga cekildi: CSS'ten cikarildi, SKILL zincirine de girmedi.
  icermez(U2_CSS, 'Roboto');
  icermez(U2_SKILL, 'Roboto');
});

ol('ui olcegi bes basamak, eski dort basamakli sabit px kalmadi', () => {
  for (const t of [
    '--tk-fs-1: 14px',
    '--tk-fs-2: 16px',
    '--tk-fs-3: 20px',
    '--tk-fs-4: 24px',
    '--tk-fs-5: 30px',
  ])
    icerir(U2_CSS, t);
  // Olcegi cumleden degil tablodan okur: rol tablosundaki butun boyutlar bes
  // basamagin icinde olmali ve besi de kullanilmis olmali.
  const boyut = [...new Set(u2Roller().map((r) => r.boyut))].sort((a, b) => a - b);
  esit(boyut.join(','), '14,16,20,24,30', 'SKILL §3 tablosundaki boyut kumesi');
  // fs tokeni ile punto birbirini tutmali (fs-1=14 … fs-5=30).
  for (const r of u2Roller())
    esit(r.fs, 'fs-' + (boyut.indexOf(r.boyut) + 1), r.rol + ' satirinda fs tokeni');
  icermez(U2_CSS, 'font-size: 28px');
  icermez(U2_XAML, '"FontSize" Value="28"');
  for (const v of [
    '"FontSize" Value="30"',
    '"FontSize" Value="24"',
    '"FontSize" Value="20"',
    '"FontSize" Value="14"',
  ])
    icerir(U2_XAML, v);
});

ol('ui agirligi 600, 700 hero disinda hicbir tipografi rolunde yok', () => {
  const govde = U2_CSS.slice(U2_CSS.indexOf('--- tipografi'), U2_CSS.indexOf('--- yüzeyler'));
  icermez(govde, 'font-weight: 700');
  icerir(govde, 'font-weight: 900', 'hero 900 kalir');
  icermez(U2_CSS, 'font-weight: 700', 'buton da 600');
  icermez(U2_XAML, '"FontWeight" Value="Bold"');
  icerir(U2_XAML, '"FontWeight" Value="SemiBold"');
  icerir(U2_XAML, '"FontWeight" Value="Black"', 'hero Black kalir');
  icermez(U2_TSX, 'font-bold');
  icermez(U2_SXAML, '"FontWeight" Value="Bold"');
  // Cumle degil tablo: hicbir rol 700 tasimaz, en agir rol tek basina hero'dur.
  const roller = u2Roller();
  for (const r of roller)
    if (r.agirlik === 700) throw new Error('SKILL §3 tablosunda 700 agirlik: ' + r.rol);
  const agir = roller.filter((r) => r.agirlik > 600);
  esit(agir.length, 1, 'yalniz bir rol 600 ustunde olabilir');
  esit(agir[0].agirlik, 900, 'o rol hero ve 900');
  esit(agir[0].boyut, 30, 'hero en buyuk basamak');
});

ol('ui satir yuksekligi ve satir uzunlugu iki platformda tanimli', () => {
  for (const t of [
    '--tk-lh-body: 1.5',
    '--tk-lh-heading: 1.2',
    '--tk-lh-mono: 1.4',
    '--tk-measure: 65ch',
  ])
    icerir(U2_CSS, t);
  icerir(U2_CSS, 'line-height: var(--tk-lh-body)');
  icerir(U2_CSS, 'max-width: var(--tk-measure)');
  icerir(U2_XAML, 'LineStackingStrategy" Value="BlockLineHeight"');
  icerir(U2_XAML, '"LineHeight" Value="24"');
  icerir(U2_SKILL, 'LineStackingStrategy="BlockLineHeight"');
});

ol('ui harf araligi boyutla ters orantili, WPF telafisi sessiz birakilmadi', () => {
  for (const t of [
    '--tk-tr-label: 0.15em',
    '--tk-tr-h3: 0.05em',
    '--tk-tr-h2: 0.02em',
    '--tk-tr-hero: -0.01em',
  ])
    icerir(U2_CSS, t);
  icermez(U2_CSS, 'letter-spacing: 0.1em');
  // Tablodan: tracking boyutla TERS orantili olmali. Cumle yeniden yazilabilir,
  // bu siralama yazilamaz.
  const em = u2Roller()
    .filter((r) => r.tracking !== 0)
    .sort((a, b) => a.boyut - b.boyut);
  for (let i = 1; i < em.length; i++)
    if (em[i].tracking >= em[i - 1].tracking)
      throw new Error('tracking boyutla artiyor: ' + em[i - 1].rol + ' → ' + em[i].rol);
  if (em.length < 3) throw new Error('tracking tasiyan rol sayisi az: ' + em.length);
  // WPF/WinForms telafisi sessiz birakilmadi. Isaretler kod tarafinda duruyor,
  // §3 ise telafinin hangi platformlarda gerektigini teknik adlariyla soyluyor.
  const s3 = U2_SKILL.slice(U2_SKILL.indexOf('## 3. '), U2_SKILL.indexOf('## 4. '));
  for (const ad of ['letter-spacing', 'WPF', 'WinForms', 'FontStyle'])
    icerir(s3, ad, 'tracking telafisi §3 icinde yazili degil');
  icerir(U2_XAML, 'TRACKING TELAFISI');
  icerir(U2_CS, 'AĞIRLIK TELAFİSİ');
});

ol('ui baslik hiyerarsisi boyutla ayrisir, uc seviye ayni degil', () => {
  const roller = u2Roller();
  const govde = roller.find((r) => r.agirlik === 400 && r.satir === 1.5 && r.tracking === 0);
  if (!govde) throw new Error('govde satiri tabloda bulunamadi');
  // Baslik/etiket rolleri: 600 agirlik, 1.2 satir. Ucu de gorsel olarak ayrisir.
  const baslik = roller.filter((r) => r.agirlik === 600 && r.satir === 1.2);
  if (baslik.length < 3) throw new Error('600/1.2 rol sayisi az: ' + baslik.length);
  const boyut = baslik.map((r) => r.boyut);
  esit(new Set(boyut).size, boyut.length, 'iki baslik seviyesi ayni boyutta');
  for (const b of baslik)
    if (b.boyut === govde.boyut)
      throw new Error('baslik govdeyle ayni boyutta: ' + b.rol + ' = ' + b.boyut);
  // Boyut yetmediginde ikinci sinyal cizgidir; CSS'te gercekten var.
  icerir(U2_CSS, '.tk-h3-rule');
  icerir(U2_CSS, 'border-bottom: 1px solid var(--tk-border-decorative)');
  // CSS siniflari tablodaki basamaklara bakar, sabit px yazmaz.
  for (const [sinif, fs] of [
    ['.tk-h2 {', '--tk-fs-4'],
    ['.tk-h3 {', '--tk-fs-3'],
    ['.tk-label {', '--tk-fs-1'],
  ]) {
    const g = U2_CSS.slice(U2_CSS.indexOf(sinif), U2_CSS.indexOf('}', U2_CSS.indexOf(sinif)));
    if (!g) throw new Error('CSS sinifi bulunamadi: ' + sinif);
    icerir(g, 'var(' + fs + ')', sinif + ' yanlis basamaga bakiyor');
    icerir(g, 'font-weight: 600', sinif);
  }
});

ol('ui olu soluk metin tokeni uc dosyadan silindi, yerine tooltip zorunlulugu geldi', () => {
  for (const k of [U2_CSS, U2_XAML, U2_CS]) icermez(k.toLowerCase(), 'textdim');
  icermez(U2_CSS, '--tk-text-dim');
  icerir(U2_CSS, 'ToolTip');
  icerir(U2_XAML, 'ZORUNLU');
  icerir(U2_CS, 'ZORUNLU');
  if (!/tooltip\s+zorunlu/i.test(U2_SKILL.replace(/\*/g, '')))
    throw new Error('SKILL tooltip zorunlulugunu soylemiyor');
});

ol('ui hero glow tek token, iki platformda ayni yogunluk', () => {
  icerir(U2_CSS, '--tk-glow-hero: 0 0 8px rgba(0, 243, 255, 0.8)');
  icerir(U2_CSS, 'drop-shadow(var(--tk-glow-hero))');
  // Oznitelik sirasina bagimli tek parca yerine oznitelik oznitelik: XAML'i
  // yeniden bicimlendirmek testi dusurmemeli, degeri degistirmek dusurmeli.
  const hg = /<DropShadowEffect[^>]*x:Key="HeroGlow"[^>]*\/>/.exec(U2_XAML);
  if (!hg) throw new Error('Theme.xaml icinde HeroGlow efekti bulunamadi');
  for (const oz of ['BlurRadius="8"', 'ShadowDepth="0"', 'Opacity="0.8"'])
    icerir(hg[0], oz, 'HeroGlow');
  icermez(U2_XAML, 'BlurRadius="10"');
  // Iki platformun ayni yogunlugu tasidigi SKILL'de token adiyla anilir.
  icerir(U2_SKILL, '--tk-glow-hero');
  icerir(U2_SKILL, 'HeroGlow');
});

ol('ui sayi ayrimi: veri sayisi mono, cumle ici sayi sans+tabular', () => {
  icerir(U2_CSS, 'font-variant-numeric: tabular-nums');
  icerir(U2_XAML, 'Typography.NumeralAlignment" Value="Tabular"');
  icerir(U2_SKILL, 'Typography.NumeralAlignment="Tabular"');
  icerir(U2_SKILL, 'font-variant-numeric: tabular-nums');
  // Ayrimi cumleden degil §3'teki iki satirlik tablodan okur: bir satir mono,
  // oteki sans+tabular demeli.
  const s3 = U2_SKILL.slice(U2_SKILL.indexOf('## 3. '), U2_SKILL.indexOf('## 4. '));
  const ayrim = s3
    .split('\n')
    .filter((r) => r.startsWith('|') && /\bmono\b|tabular/.test(r) && !/^\|\s*-/.test(r));
  if (ayrim.length < 2) throw new Error('sayi ayrimi tablosu bulunamadi: ' + ayrim.length);
  if (!ayrim.some((r) => /tabular/.test(r) && !/\.tk-mono/.test(r)))
    throw new Error('cumle ici sayi icin sans+tabular satiri yok');
  if (!ayrim.some((r) => /\.tk-mono|MonoValue/.test(r)))
    throw new Error('veri sayisi icin mono satiri yok');
});

ol('ui XAML Hint stili var, CSS ve WinForms karsiligiyla ayni olcude', () => {
  icerir(U2_XAML, 'x:Key="Hint"');
  icerir(U2_CSS, '.tk-hint');
  // Bosluk hizasi bicimlendirme isidir, kural degil.
  if (!/\bHint\s*=\s*new\(SansAdi,\s*10\.5f\)/.test(U2_CS))
    throw new Error('Palette.cs Hint fontu 10.5f degil');
});

ol('ui yaricapi tek deger, 16/12/8 merdiveni kalmadi', () => {
  icerir(U2_CSS, '--tk-r: 6px');
  icermez(U2_CSS, '--tk-r-box: 16px');
  icermez(U2_XAML, 'CornerRadius" Value="16"');
  icermez(U2_XAML, 'CornerRadius="12"');
  icerir(U2_XAML, 'CornerRadius="6"');
  icermez(U2_SKILL, 'kutu `16px`, buton/kart `12px`');
  icerir(U2_CS, 'public const int Radius = 6;');
  // Dort dosyada da tek bir yaricap sayisi gecer. XAML'da 6 disinda CornerRadius
  // yoksa merdiven gercekten kalkmis demektir — cumleye bakmaya gerek yok.
  const kose = [...U2_XAML.matchAll(/CornerRadius(?:="|" Value=")(\d+)"/g)].map((m) => m[1]);
  if (!kose.length) throw new Error('Theme.xaml icinde hic CornerRadius yok — desen bozuk');
  esit([...new Set(kose)].join(','), '6', 'Theme.xaml yaricap kumesi');
  // layout.md yaricabin tek kaynagini ve celiskinin kapandigi tarihi tasir.
  icerir(U2_LAYOUT, '--tk-r: 6px');
  icerir(U2_LAYOUT, '6 DIP');
});

ol('ui genel bir oncelik kurali yazmaz, celiskiler tek tek sorulur', () => {
  // Bu testin isi bir cumlenin varligi degil YOKLUGU: kestirme bir oncelik kurali
  // yazilmasin. Negatif esleme duzyazi olabilir, asla yanlislikla dusmez.
  for (const k of [U2_SKILL, U2_LAYOUT, U2_DESKTOP]) {
    icermez(k, 'Çelişkide `SKILL.md` kazanır');
    icermez(k, 'çelişkide SKILL.md kazanır');
  }
});

ol('ui renk tek basina anlam tasimaz, durum noktasi sekille de ayrisir', () => {
  icerir(U2_SKILL, 'WCAG 1.4.1');
  // Sekil farki CSS'te gercekten uygulanmis mi: biri dolu (dolgu var, cerceve yok),
  // oteki halka (dolgu seffaf, cerceve var). Iki sinif ayni gorunuyorsa test duser.
  const on = U2_CSS.slice(
    U2_CSS.indexOf('.tk-dot-on'),
    U2_CSS.indexOf('}', U2_CSS.indexOf('.tk-dot-on'))
  );
  const off = U2_CSS.slice(
    U2_CSS.indexOf('.tk-dot-off'),
    U2_CSS.indexOf('}', U2_CSS.indexOf('.tk-dot-off'))
  );
  if (!on || !off) throw new Error('durum noktasi siniflari bulunamadi');
  icerir(on, 'border: 0', 'dolu daire cerceve tasimaz');
  icerir(off, 'background: transparent', 'halkanin ici bos');
  if (!/border:\s*\dpx solid/.test(off)) throw new Error('halkanin cercevesi yok');
  icerir(U2_CSS, 'border-radius: 50%');
  // desktop.md ayni ayrimi kelimeleriyle tasir; cumlenin bicimi serbest.
  const d = U2_DESKTOP.replace(/\*/g, '');
  if (!/dolu daire/.test(d) || !/halka/.test(d))
    throw new Error('desktop.md durum noktasinin sekil farkini yazmiyor');
});

ol('ui olculmemis sayilar etiketli, olculmus gibi sunulmuyor', () => {
  const n = (U2_SKILL.match(/\(varsayılan, ölçülmedi\)/g) || []).length;
  if (n < 5) throw new Error('SKILL icinde en az bes etiket bekleniyordu, bulunan: ' + n);
  for (const konu of ['en az 11', '≥ 40 s', '1.4 s', '%20-30', '42×30 DIP']) icerir(U2_SKILL, konu);
  // Cümlenin yazımına değil, sayıların etiketli olmasına bakılır. Önceki hâl kapanış
  // `**`'ına, virgülüne ve kelime sırasına bağlıydı; cümle yeniden yazılınca kural
  // yerinde dururken test düşerdi (U2 tur 2 denetimi).
  const kenarSatiri = U2_LAYOUT.split('\n').find((r) => /240\s*DIP/.test(r));
  if (!kenarSatiri) throw new Error('layout.md icinde kenar cubugu olcusu bulunamadi');
  for (const sayi of ['240', '48'])
    if (!kenarSatiri.includes(sayi)) throw new Error('kenar cubugu olcusu eksik: ' + sayi);
  icerir(U2_LAYOUT, '(varsayılan, ölçülmedi)');
  // Pencere düğmesi 23.08.2026'da kullanıcı kararıyla 42×30'a sabitlendi; artık
  // "ölçülmedi" etiketi taşımıyor, kararın kendisi gerekçesiyle yazılı.
  icerir(U2_DESKTOP, '42×30 DIP');
});

// U2 celiskiyi kendi cozmedi, kullaniciya sordu — dogru davranis. Kullanici 23.08.2026'da
// 42x30 dedi; iki dosya artik ayni sayiyi tasiyor ve celiski bloklari kalkti.
ol('ui pencere dugmesi celiskisi 42x30 lehine kapandi', () => {
  icerir(U2_SKILL, '42×30 DIP');
  icerir(U2_DESKTOP, '42×30 DIP');
  icermez(U2_SKILL, 'Açık çelişki — karara bağlanmadı', 'celiski blogu kalkmali');
  icermez(U2_DESKTOP, 'Açık çelişki — karara bağlanmadı', 'celiski blogu kalkmali');
  // Eski değer yalnız **tarihçe cümlesinde** geçebilir. Önceki hâl o cümleyi düz yazı
  // deseniyle siliyordu; cümle yeniden yazılınca silme tutmaz ve test kural bozulmadan
  // düşerdi. Ölçülen şey artık şu: 52×36 geçen her satır bir tarihçe satırı mı?
  const TARIHCE = /(diyordu|kapand[ıi]|eskiden|bir d[öo]nem|kullanıcı karar)/i;
  for (const [ad, d] of [
    ['SKILL.md', U2_SKILL],
    ['desktop.md', U2_DESKTOP],
  ])
    for (const satir of d.split('\n').filter((r) => r.includes('52×36')))
      if (!TARIHCE.test(satir))
        throw new Error(ad + ': 52×36 kural gibi duruyor — ' + satir.trim().slice(0, 80));
});

ol('ui standardi yalniz karanliktir ve bunu §0 icinde soyler', () => {
  const sifir = U2_SKILL.slice(U2_SKILL.indexOf('## 0.'), U2_SKILL.indexOf('## 1.'));
  if (!/yalnız karanlık/i.test(sifir)) throw new Error('§0 karanlik beyanini tasimiyor');
  if (!/aydınlık/i.test(sifir)) throw new Error('§0 aydinlik paletin ne oldugunu soylemiyor');
});

ol('ui hareket gerekceleri motion.md icine tasindi ve gozden kacmiyor', () => {
  const s54 = U2_SKILL.slice(U2_SKILL.indexOf('## 5.4 '), U2_SKILL.indexOf('## 5.5 '));
  // Yonlendirme tablodan ONCE gelmeli: tabloyu okuyup gecen kisi gerekceyi kacirmasin.
  const atif = s54.indexOf('references/motion.md');
  const ilkSatir = s54.search(/\n\| /);
  if (atif < 0) throw new Error('§5.4 motion.md yonlendirmesi tasimiyor');
  if (ilkSatir < 0) throw new Error('§5.4 icinde tablo bulunamadi — desen bozuk');
  if (atif > ilkSatir) throw new Error('motion.md yonlendirmesi tablodan sonra geliyor');
  // Yonlendirme §5.4 disinda da en az bir yerde tekrarlanir (hata listesi / kapanis).
  const kac = (U2_SKILL.match(/references\/motion\.md/g) || []).length;
  if (kac < 3) throw new Error('SKILL motion.md atif sayisi az: ' + kac);
  // motion.md geri atif verir; okuyan hangi bolumun devami oldugunu bilir.
  icerir(U2_MOTION, '§5.4');
  // SKILL'de kalan tablonun HER satiri motion.md basligina atif verir.
  const satir = s54
    .split('\n')
    .filter((r) => r.startsWith('| ') && !r.startsWith('| Olay') && !r.startsWith('| Durum'));
  if (satir.length < 15) throw new Error('tablo satirlari eksik: ' + satir.length);
  for (const r of satir) if (!/M\d+/.test(r)) throw new Error('atifsiz tablo satiri: ' + r);
  for (const b of [
    '## M1 ',
    '## M2 ',
    '## M3 ',
    '## M4 ',
    '## M5 ',
    '## M6 ',
    '## M7 ',
    '## M8 ',
    '## M9 ',
    '## M10 ',
    '## M11 ',
    '## M12 ',
    '## M13 ',
    '## M14 ',
  ])
    icerir(U2_MOTION, b);
  // Tasinan gerekce SKILL'de tekrar edilmez; iki kopya kalirsa ayrisirlar.
  icermez(U2_SKILL, 'Kütüphane varsayılanı token değildir');
  icermez(U2_SKILL, 'Tabandan muaf olan tek şey');
});

// Bir testin kendisi olu olabilir ve yesil kalir. Bu yardimci eslesme sayisini olcer:
// sifir eslesme, "yorum yok" degil "desen bozuk" demektir ve test dusurulur.
function yorumlar(ad, k) {
  const desen = new RegExp('<!--' + '[\\s\\S]' + '*?-->', 'g');
  const l = k.match(desen) || [];
  if (!l.length) throw new Error(ad + ': hic yorum eslesmedi — desen bozuk olabilir');
  return l;
}

ol('ui XAML yorumlari cift tire tasimaz, dosya ayristirilabilir kalir', () => {
  // XML yorumunun icinde '--' gecmesi dosyayi ayristirilamaz yapar; CSS token
  // adlarini (--tk-*) yoruma yazarken tam olarak bu oldu. Test o hatayi tutar.
  // ÖLÇÜLDÜ (23.08.2026, U2 denetimi): burada `[\s\S]` yerine `[sS]` yazılıydı — ters
  // bölüler kabuk katmanında yenmişti. Sınıf yalnız 's'/'S' harfini eşliyordu, hiçbir
  // yorum tutmuyordu, `|| []` sessizce yutuyordu ve döngü gövdesi hiç çalışmıyordu.
  // Testin kendisi ölüydü ve 412/412 yeşil kalıyordu. Aşağıdaki `bosMu` kontrolü aynı
  // hatanın tekrarını yakalar: eşleşme sıfırsa test artık düşer.
  for (const [ad, k] of [
    ['Theme.xaml', U2_XAML],
    ['Signature.xaml', U2_SXAML],
  ])
    for (const y of yorumlar(ad, k))
      if (y.slice(4, -3).includes('--'))
        throw new Error(ad + ' yorumunda cift tire: ' + y.slice(0, 60));
});

// BESINCI KOPYA. components.md `SKILL.md` §5'in "kopyalanabilir siniflar" kaynagidir;
// standardi uygulayan ajan siniflari oradan kopyalar. Denetim turu 1'e kadar hicbir test
// bu dosyaya bakmiyordu ve dosya eski hiyerarsiyi (20/16/14, 700, 0.1em) ve eski yaricap
// merdivenini tasimaya devam ediyordu. Asagidakiler kod bloklarini olcer; duzyazi icinde
// "eski `rounded-2xl` kaldirildi" demek serbest, kod blogunda yazmak degil.
ol('ui kopyalanabilir siniflar tipografi olceginin tokenlarini okur', () => {
  const kod = u2Kod('components.md', U2_COMP);
  // Baslik uc basamakta ve tokenla: 24 / 20 / 14.
  for (const t of ['--tk-fs-4', '--tk-fs-3', '--tk-fs-1'])
    icerir(kod, 'var(' + t + ')', 'components.md baslik basamagi');
  for (const t of ['--tk-tr-h2', '--tk-tr-h3', '--tk-tr-label'])
    icerir(kod, 'var(' + t + ')', 'components.md tracking basamagi');
  icerir(kod, 'font-semibold');
  // Eski hiyerarsi: dort sinyalin dordu de ayni. Hicbiri kod blogunda kalmaz.
  for (const eski of ['font-bold', 'tracking-widest', 'text-base', 'text-xl', 'text-sm'])
    icermez(kod, eski, 'components.md kod blogunda Tailwind varsayilani');
  // Govdeyle ayni boyutta baslik kalmadi: fs-2 yalniz mono degerde gecebilir.
  // Sıfır eşleşme "başlık yok" değil "desen bozuk" demektir; tur 1'in ölü testi tam bu
  // sınıfta kaybolmuştu. Döngü boş geçerse iddia sessizce geçerdi.
  const basliklar = kod.split('\n').filter((r) => /^(h2|h3|lbl)\b/.test(r));
  if (basliklar.length < 3)
    throw new Error(
      'components.md kod blogunda uc baslik satiri bekleniyordu, bulunan: ' + basliklar.length
    );
  for (const b of basliklar) icermez(b, '--tk-fs-2', 'baslik govde basamagina inmis: ' + b);
});

ol('ui kopyalanabilir siniflarda yaricap tek deger, daire istisnasi duruyor', () => {
  const kod = u2Kod('components.md', U2_COMP);
  icerir(kod, 'rounded-[var(--tk-r)]');
  for (const eski of ['rounded-2xl', 'rounded-xl', 'rounded-lg', 'rounded-md'])
    icermez(kod, eski, 'components.md kod blogunda eski yaricap merdiveni');
  // Daire istisnasi kaldirilmadi: anahtar sapi, slider thumb, ilerleme cubugu.
  icerir(kod, 'rounded-full', 'daire istisnasi silinmis');
});

ol('ui odak stili depoda gercekten var olan adla anilir', () => {
  icermez(U2_SKILL, 'NeonFocusVisual');
  icerir(U2_SKILL, 'SystemParameters.FocusVisualStyleKey');
  icerir(U2_XAML, 'SystemParameters.FocusVisualStyleKey');
});

// ── Açık hata günlüklerinden doğan kurallar ────────────────────────────────────
// Bu testler bir hata günlüğünün ölçü maddesini kilitler. Kural gevşerse günlük
// yeniden açılmalı, sessizce geri gelmemeli.
ol('acik gunlukten dogan kurallar yerinde duruyor', () => {
  const relay = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8');

  // HATA-sohbet-metni-duz-yazi-duvari · ölçü 1
  const yedi = relay.slice(relay.indexOf('## 7. Kullanıcıya'), relay.indexOf('## 7.1'));
  icerir(yedi, 'Düz yazı duvarı yasak');
  icerir(yedi, '2-4 satır');
  icerir(yedi, 'Üç maddeden fazla');
  icerir(yedi, 'kapsamı **sohbet çıktısıdır.**', 'kapsam ayrimi yazili olmali');
  icerir(yedi, 'Sürümü yola yazma');
  icerir(yedi, 'kuruluEklentiKoku()');

  // HATA-surum-gomulu-yol · ölçü 1 — sürüm yola gömülmüyor, kayıttan çözülüyor
  const ortak = fs.readFileSync(path.join(KOK, 'hooks', 'ortak.js'), 'utf8');
  icerir(ortak, 'function kuruluEklentiKoku');
  icerir(ortak, 'installed_plugins.json');
  const govde = ortak.slice(
    ortak.indexOf('function kuruluEklentiKoku'),
    ortak.indexOf('module.exports')
  );
  if (/cache[\\/][^'"`]*[0-9]+\.[0-9]+\.[0-9]+/.test(govde))
    throw new Error('kuruluEklentiKoku icinde gomulu surum var');
  const m = require(path.join(KOK, 'hooks', 'ortak.js'));
  esit(typeof m.kuruluEklentiKoku, 'function', 'yardimci disa aktarilmali');
  esit(m.kuruluEklentiKoku('yok@yok'), null, 'kurulu olmayan eklenti null donmeli');
});

ol('ikinci gorus tetikleyicisi kancada olculuyor', () => {
  // HATA-ikinci-gorus-tetiklenmiyor · üç ölçü de burada kilitli.
  const rw = fs.readFileSync(path.join(KOK, 'hooks', 'relay-watch.js'), 'utf8');
  icerir(rw, 'function gorusGerekenler', 'olcu 1: tur/denetim okuyan kapi');
  icerir(rw, "if (rol === 'advisor') gorusKaydet(root, t);", 'olcu 3: gorus kaydi');
  icerir(rw, "ceviri('gorusHatirlat'", 'hatirlatma hatirlat() icine baglanmali');
  const dil = fs.readFileSync(path.join(KOK, 'hooks', 'dil.js'), 'utf8');
  icerir(dil, 'gorusHatirlat: {');

  // olcu 2: liste degil, bakma ani
  const relay = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8');
  const bes = relay.slice(relay.indexOf('## 1.5.1'), relay.indexOf('## 1.6'));
  icerir(bes, 'Bakma anları', 'olcu 2: bakma ani yazili olmali');
  icerir(bes, 'GORUS.md', 'olcu 3: kaydin yeri yazili olmali');

  // Kapi gercekten calisiyor mu: dorduncu turda ve denetimsiz sozlesme secilmeli
  const kv = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-gorus-'));
  const cdir = path.join(kv, 'contracts');
  fs.mkdirSync(cdir, { recursive: true });
  const yaz = (ad, g) => fs.writeFileSync(path.join(cdir, ad), g);
  yaz('A1.md', '---\nid: A1\nstatus: active\nround: 4\naudit: —\n---\n');
  yaz('A2.md', '---\nid: A2\nstatus: active\nround: 2\naudit: —\n---\n');
  yaz('A3.md', '---\nid: A3\nstatus: active\nround: 5\naudit: passed\n---\n');
  yaz('A4.md', '---\nid: A4\nstatus: done\nround: 9\naudit: —\n---\n');
  yaz('notlar.md', 'sozlesme degil');
  const fn = rw.slice(
    rw.indexOf('function gorusGerekenler'),
    rw.indexOf('function acikSozlesmeler')
  );
  const kur = new Function('fs', 'path', 'dosyalar', 'metin', fn + '\nreturn gorusGerekenler;')(
    fs,
    path,
    (d) => {
      try {
        return fs.readdirSync(d);
      } catch {
        return [];
      }
    },
    (f) => {
      try {
        return fs.readFileSync(f, 'utf8');
      } catch {
        return null;
      }
    }
  );
  esit(
    kur(kv)
      .map((x) => x.id)
      .join(','),
    'A1',
    'yalniz dorduncu tura girmis ve denetimi kalan sozlesme secilmeli'
  );
});

ol('denetim turunun durdurma kurali yazili ve olculebilir', () => {
  // HATA-denetim-turu-durdurma-kurali-yok · dort olcu.
  const den = fs.readFileSync(path.join(KOK, 'agents', 'auditor.md'), 'utf8');
  icerir(den, '**KRİTİK** — yalnız iki şeyden biri', 'kritik tanimi iki maddeyle sinirli');
  icerir(den, '**BORÇ**', 'borc kovasi olmali');
  icerir(den, '**KALDI yalnız şu üç halde yazılır:**', 'kaldi kosulu yazili olmali');
  if (/⨯ ÖNEMLİ/.test(den)) throw new Error('ONEMLI kovasi hala tur aciyor gibi duruyor');

  const pro = fs.readFileSync(
    path.join(KOK, 'skills', 'relay', 'references', 'protocol.md'),
    'utf8'
  );
  icerir(pro, '### Turun ne zaman biteceği', 'durdurma kurali basligi');
  icerir(pro, 'Üçüncü turdan sonra `advisor` zorunlu');
  icerir(pro, 'Beşinci turdan sonra durdurma kuralı');
  icerir(pro, 'borc: []', 'sozlesme formatinda borc alani');

  // Tabloya kaçmış satır geri kondu: tavan satiri tablonun icinde olmali.
  const tab = pro.slice(pro.indexOf('| Tur | Ne yapılır |'));
  const satirlar = tab.split('\n');
  const tavan = satirlar.findIndex((x) => x.startsWith('| tavan |'));
  esit(tavan, 4, 'tavan satiri tabloda kalmali (baslik, ayrac, 1-3, 4-5, tavan)');

  const sab = fs.readFileSync(
    path.join(KOK, 'skills', 'relay', 'assets', 'contract.template.md'),
    'utf8'
  );
  const on = sab.slice(0, sab.indexOf('---', 4));
  icerir(on, 'borc: []', 'sablon frontmatter borc tasimali');

  const sk = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8');
  icerir(sk, 'Denetim turunun durdurma kuralı `fix_ceiling`den ayrıdır');
});

ol('lisans olcutu lisanssiz depoyu ve celisen beyani yakalar', () => {
  // HATA-lisans-adimi-yok · kural yazildi, kapi yoktu. Kapi budur.
  const AGPL = 'GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, 19 November 2007\n';
  const MIT = 'MIT License\n\nPermission is hereby granted, free of charge, to any person\n';
  const kur = (dosyalar) => {
    const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-lisans-'));
    for (const [ad, govde] of Object.entries(dosyalar)) {
      const y = path.join(p, ad);
      fs.mkdirSync(path.dirname(y), { recursive: true });
      fs.writeFileSync(y, govde);
    }
    return p;
  };
  const tara = (p) => {
    const r = taramaCalistir(p, 'eco', '--json');
    return JSON.parse(r.out).maddeler.find((m) => m.ad === 'Lisans');
  };

  const yok = tara(kur({ 'README.md': '# x\n' }));
  esit(yok.gecti, false, 'lisanssiz depo kalmali');
  icerir(yok.eksik.join(' '), 'LICENSE dosyası yok');

  const temiz = tara(
    kur({
      'README.md': '# x\n',
      LICENSE: AGPL,
      'package.json': JSON.stringify({ name: 'x', license: 'AGPL-3.0-or-later' }),
    })
  );
  esit(temiz.gecti, true, 'AGPL-3.0 ile AGPL-3.0-or-later ayni ailedir: ' + temiz.eksik);

  const celiski = tara(
    kur({
      'README.md': '# x\n',
      LICENSE: AGPL,
      'package.json': JSON.stringify({ name: 'x', license: 'MIT' }),
    })
  );
  esit(celiski.gecti, false, 'iki farkli lisans beyani kalmali');
  icerir(celiski.eksik.join(' '), 'package.json "MIT" diyor');

  const rozet = tara(
    kur({
      'README.md': '<img src="a.svg" alt="License MIT">\n',
      LICENSE: AGPL,
    })
  );
  esit(rozet.gecti, false, 'README rozeti de bir beyandir');

  const mit = tara(
    kur({ 'README.md': '# x\n', LICENSE: MIT, 'package.json': JSON.stringify({ license: 'MIT' }) })
  );
  esit(mit.gecti, true, 'MIT de gecerli bir cevaptir, olcut lisans dayatmaz');

  const dcosuz = tara(kur({ 'README.md': '# x\n', LICENSE: AGPL, 'CONTRIBUTING.md': 'katkı' }));
  esit(dcosuz.gecti, false, 'katki cagrisi varken DCO yoksa kalmali');

  const sessiz = tara(kur({ 'README.md': '# x\n', LICENSE: AGPL }));
  esit(sessiz.gecti, true, 'lisanstan hic soz etmeyen yuzey ihlal degildir');
});

ol('uzun kosu kurallari yerinde: gozcu, olcum tekrari, kayit noktasi', () => {
  // HATA-olcum-beklemesi-kullaniciyi-bekletiyor · uc olcu.
  const relay = fs.readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8');
  const uc = relay.slice(relay.indexOf('## 3.3 Uzun dış koşu'), relay.indexOf('## 4. Kim yapacak'));
  if (!uc) throw new Error('§3.3 yok');
  icerir(uc, '**uyandırılarak yoklanmaz.**', 'olcu 2: ajan yoklanmaz');
  icerir(uc, 'Gözcü arkasında süreç bırakmaz', 'olcu 3: artakalan surec');
  icerir(uc, 'kayıt noktası talimatı baştan verilir', 'olcu 2: kayit noktasi');

  icerir(relay, '**Ölçüm tekrarı kapısı.**', 'olcu 1: olcum tekrari kapisi §6 da');
  const alti = relay.slice(
    relay.indexOf('## 6. Token disiplini'),
    relay.indexOf('## 7. Kullanıcıya')
  );
  icerir(alti, 'kaynağıyla alıntılar', 'olcu 1: belgeliyse alintilanir');

  const pro = fs.readFileSync(
    path.join(KOK, 'skills', 'relay', 'references', 'protocol.md'),
    'utf8'
  );
  icerir(pro, 'Uzun koşu içeren sözleşmede', 'olcu 1-2: sozlesme yazimina baglandi');
});

console.log('\nDepo sürüm kapısı');

const DEPO = path.join(KOK, 'scripts', 'depo-surum.js');
const depoSurum = require(DEPO);
const DEPO_SATIR = 'Teknesyum ▸ depo uzaktan geride — önce `git pull`, sonra iş';

function depoKur(kip) {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-depo-'));
  const bare = path.join(c, 'bare');
  fs.mkdirSync(bare);
  git(['init', '-q', '--bare'], bare);
  const w = path.join(c, 'w');
  fs.mkdirSync(w);
  git(['init', '-q'], w);
  git(['config', 'user.email', 't@t'], w);
  git(['config', 'user.name', 't'], w);
  fs.writeFileSync(path.join(w, 'a'), 'bir');
  git(['add', '.'], w);
  git(['commit', '-qm', 'bir'], w);
  git(['remote', 'add', 'origin', bare], w);
  git(['push', '-q', 'origin', 'HEAD'], w);
  if (kip === 'ileride') {
    fs.writeFileSync(path.join(w, 'a'), 'iki');
    git(['add', '.'], w);
    git(['commit', '-qm', 'iki'], w);
  }
  if (kip === 'geride') {
    const w2 = path.join(c, 'w2');
    git(['clone', '-q', bare, w2], c);
    git(['config', 'user.email', 't@t'], w2);
    git(['config', 'user.name', 't'], w2);
    fs.writeFileSync(path.join(w2, 'a'), 'uzak');
    git(['add', '.'], w2);
    git(['commit', '-qm', 'uzak'], w2);
    git(['push', '-q', 'origin', 'HEAD'], w2);
  }
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-depo-cfg-'));
  return { c, w, bare, cfg, kayit: path.join(cfg, 'teknesyum', 'live', 'depo-surum.json') };
}

function depoAstir(d) {
  git(['remote', 'set-url', 'origin', 'ssh://x@127.0.0.1/r'], d.w);
  git(['config', 'core.sshCommand', 'node -e "setTimeout(function(){},8000)"'], d.w);
}

function depoCoz(d) {
  git(['remote', 'set-url', 'origin', d.bare], d.w);
  git(['config', '--unset', 'core.sshCommand'], d.w);
}

function depoAcilis(d, kaynak, ort) {
  const r = calistir(
    IZLE,
    {
      cwd: d.w,
      session_id: 'oturum-1',
      transcript_path: '/x/oturum-1.jsonl',
      hook_event_name: 'SessionStart',
      source: kaynak || 'startup',
    },
    { CLAUDE_CONFIG_DIR: d.cfg, ...(ort || {}) }
  );
  return duyuruMetni(r);
}

ol('uzak ile yerel ayniysa geride degil ve acilis susar', () => {
  const d = depoKur('esit');
  const s = depoSurum.durum(d.w);
  esit(s.geride, false, 'esit depo geride degil');
  icermez(depoAcilis(d), 'depo uzaktan geride', 'esitken satir cikti');
});

ol('uzakta yerelde olmayan is varsa tek satir uyari basilir', () => {
  const d = depoKur('geride');
  esit(depoSurum.durum(d.w).geride, true, 'geride depo geride sayilmali');
  const m = depoAcilis(d);
  icerir(m, DEPO_SATIR);
  icermez(m, 'commit geride', 'sayi uydurulmus');
});

ol('yerel ileridiyse uyari basilmaz — push edilmemis is yalan uyari uretmez', () => {
  const d = depoKur('ileride');
  const s = depoSurum.durum(d.w);
  esit(s.geride, false, 'yerel ileride, geride degil');
  icermez(depoAcilis(d), 'depo uzaktan geride', 'yerel ileriyken satir cikti');
});

ol('git deposu degilse, origin yoksa, uzak erisilemezse sessiz kalinir', () => {
  const bos = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-depo-yok-'));
  esit(depoSurum.kok(bos), null, 'git deposu olmayan dizinde kok null');
  esit(depoSurum.durum(bos), null, 'git deposu olmayan dizinde durum null');

  const d = depoKur('esit');
  git(['remote', 'remove', 'origin'], d.w);
  esit(depoSurum.durum(d.w), null, 'origin yokken null');
  icermez(depoAcilis(d), 'depo uzaktan geride', 'origin yokken satir cikti');

  const y = depoKur('esit');
  git(['remote', 'set-url', 'origin', path.join(y.c, 'boyle-bir-depo-yok')], y.w);
  esit(depoSurum.durum(y.w), null, 'uzak erisilemezken null');
  icermez(depoAcilis(y), 'depo uzaktan geride', 'uzak erisilemezken satir cikti');
});

ol('ls-remote 3 saniyede donmezse vazgecilir, acilis askida kalmaz', () => {
  const d = depoKur('esit');
  depoAstir(d);
  const t = Date.now();
  const s = depoSurum.geride(d.w);
  const gecen = Date.now() - t;
  esit(s, null, 'uzak cevap vermeyince null');
  if (gecen < 2000) throw new Error('uzak hic asilmamis, olcum bos: ' + gecen + 'ms');
  if (gecen > 5000) throw new Error('zaman asimi tutmadi: ' + gecen + 'ms');

  const src = fs.readFileSync(DEPO, 'utf8');
  icerir(src, 'timeout: zamanAsimi', 'her git cagrisi zaman asimi tasimali');
  const sabit = src.match(/UZAK_ZAMAN_ASIMI\s*=\s*(\d+)/);
  if (!sabit) throw new Error('UZAK_ZAMAN_ASIMI sabiti yok');
  if (Number(sabit[1]) > 3000) throw new Error('zaman asimi cok uzun: ' + sabit[1]);
});

ol('ayni gun ikinci oturumda ag yeniden yoklanmaz', () => {
  const d = depoKur('geride');
  icerir(depoAcilis(d), DEPO_SATIR, 'ilk acilis uyarmali');
  const kayit = JSON.parse(fs.readFileSync(d.kayit, 'utf8'));
  const anahtar = Object.keys(kayit)[0];
  esit(kayit[anahtar].gun, new Date().toISOString().slice(0, 10), 'kayitta bugunun gunu');
  esit(kayit[anahtar].geride, true, 'kayitta sonuc');

  depoAstir(d);
  const t = Date.now();
  const m = depoAcilis(d);
  const gecen = Date.now() - t;
  icermez(m, 'depo uzaktan geride', 'ayni gun tekrar uyardi');
  if (gecen > 2500) throw new Error('ayni gun ag yeniden yoklandi: ' + gecen + 'ms');

  kayit[anahtar].gun = '2000-01-01';
  fs.writeFileSync(d.kayit, JSON.stringify(kayit));
  depoCoz(d);
  icerir(depoAcilis(d), DEPO_SATIR, 'gun degisince yeniden bakilmali');
});

ol('compact ve clear kaynaginda depo sorulmaz', () => {
  for (const kaynak of ['compact', 'clear']) {
    const d = depoKur('geride');
    icermez(depoAcilis(d, kaynak), 'depo uzaktan geride', kaynak + ' uyardi');
    if (fs.existsSync(d.kayit)) throw new Error(kaynak + ' kaydi yazdi — ag yoklanmis');
  }
});

ol('depo uyarisi dil.js ten gelir, tr ve en var', () => {
  const kaynak = fs.readFileSync(DIL, 'utf8');
  const blok = kaynak.slice(kaynak.indexOf('depoGeride: {'), kaynak.indexOf('olcu: {'));
  if (!blok) throw new Error('dil.js icinde depoGeride yok');
  icerir(blok, 'tr:', 'tr karsiligi yok');
  icerir(blok, 'en:', 'en karsiligi yok');
  const d = depoKur('geride');
  icerir(depoAcilis(d), 'önce `git pull`, sonra iş');
  const e = depoKur('geride');
  icerir(depoAcilis(e, null, { TEKNESYUM_DIL: 'en' }), '`git pull` first, then work');
});

ol('depo-surum.js require edilince CLI calismaz, sonuc nesne olarak okunur', () => {
  const r = spawnSync(
    process.execPath,
    ['-e', 'require(process.argv[1]);process.stdout.write("SESSIZ")', DEPO],
    { encoding: 'utf8' }
  );
  esit((r.stdout || '').trim(), 'SESSIZ', 'require CLI ciktisi bastı: ' + r.stdout);
  esit(r.status, 0, 'require cikis kodu');
  for (const ad of ['kok', 'dal', 'geride', 'durum', 'metin'])
    esit(typeof depoSurum[ad], 'function', ad + ' disa vurulmamis');

  const d = depoKur('geride');
  const s = depoSurum.durum(d.w);
  esit(s.geride, true, 'durum nesnesi sonucu tasir');
  esit(s.depo, depoSurum.kok(d.w), 'durum nesnesi depo yolunu tasir');
  if (!s.dal) throw new Error('durum nesnesi dal tasimali');
  icerir(depoSurum.metin(s), 'git pull', 'metin insan okur satir uretir');
  icerir(depoSurum.metin(depoSurum.durum(depoKur('esit').w)), 'güncel');
});

console.log('\nKesinti kuyruğu');

const RAPOR_KOMUT = path.join(KOK, 'commands', 'report.md');
const RELAY_SKILL = path.join(KOK, 'skills', 'relay', 'SKILL.md');
const COK_OTURUM = path.join(KOK, 'skills', 'relay', 'references', 'multi-session.md');

function json(f) {
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function kuyrukKur(sozlesme, acik) {
  const { p, live } = proje(sozlesme, 0);
  fs.mkdirSync(live, { recursive: true });
  const f = path.join(live, '_acik.json');
  if (acik) fs.writeFileSync(f, JSON.stringify(acik));
  return { p, live, f };
}

function sendMessageYuku(p, to, message) {
  return {
    cwd: p,
    effort: 'high',
    hook_event_name: 'PreToolUse',
    permission_mode: 'bypassPermissions',
    prompt_id: 'p-1',
    session_id: 'oturum-1',
    tool_input: { to, message },
    tool_name: 'SendMessage',
    tool_use_id: 'toolu_01',
    transcript_path: '/x/oturum-1.jsonl',
  };
}

function durumSatiri(p, session) {
  return calistir(DURUM, {
    cwd: p,
    session_id: session || 'oturum-1',
    model: { display_name: 'Opus' },
    workspace: { current_dir: p },
  }).out;
}

ol('_acik.json uc alan tasir, on satiri gecmez', () => {
  const { p, f } = kuyrukKur(1, {
    simdi: 'T3 yurutuluyor\nikinci satir',
    acikta: Array.from({ length: 15 }, (_, i) => 'madde ' + (i + 1)),
    sirada: 'T4 acilacak',
    fazladan: 'bu alan silinmeli',
  });
  calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    tool_input: { file_path: f },
  });
  const govde = fs.readFileSync(f, 'utf8');
  const d = JSON.parse(govde);
  esit(Object.keys(d).join(','), 'simdi,acikta,sirada', 'uc alan disinda alan kalmis');
  esit(d.acikta.length, 8, 'acikta tavani');
  esit(d.simdi, 'T3 yurutuluyor ikinci satir', 'simdi tek satira inmeli');
  esit(d.simdi.includes('\n'), false, 'simdi cok satirli');
  esit(1 + d.acikta.length + 1 <= 10, true, 'icerik satiri 10u gecti');
  esit(govde.trim().split('\n').length <= 10, true, 'dosya 10 satiri gecti: ' + govde);
});

ol('Stop kancasi acik madde varken tek satir basar, boska susar', () => {
  const dolu = kuyrukKur(1, { simdi: '', acikta: ['ikon seti', 'README adimi'], sirada: '' });
  const r = calistir(IZLE, { ...ort(dolu.p), hook_event_name: 'Stop' });
  const o = JSON.parse(r.out);
  icerir(o.systemMessage, 'Açıkta 2 madde');
  esit(o.systemMessage.split('\n').length, 1, 'tek satir olmali: ' + o.systemMessage);
  icermez(o.systemMessage, 'ikon seti', 'madde metni sohbete basiliyor');

  const bos = kuyrukKur(1, { simdi: 'T3', acikta: [], sirada: 'T4' });
  esit(calistir(IZLE, { ...ort(bos.p), hook_event_name: 'Stop' }).out, '', 'bos kuyrukta sustu');

  const yok = proje(1, 0);
  esit(calistir(IZLE, { ...ort(yok.p), hook_event_name: 'Stop' }).out, '', 'dosya yokken sustu');
});

ol('statusline acikta N · ajan X/Y gosterir', () => {
  const { p, live } = kuyrukKur(1, { simdi: '', acikta: ['a', 'b'], sirada: '' });
  const simdi = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.writeFileSync(
    path.join(live, '_running.json'),
    JSON.stringify([{ type: 'builder', desc: 'T3', start: Date.now() }])
  );
  for (const ad of ['a1', 'a2', 'a3']) {
    fs.writeFileSync(
      path.join(live, ad + '.json'),
      JSON.stringify({
        agent_id: ad,
        agent_type: 'builder',
        stop_reason: 'end_turn',
        ended: simdi,
        last_seen: simdi,
      })
    );
  }
  icerir(durumSatiri(p), 'açıkta 2 · ajan 1/3');
});

ol('acik madde yokken statusline acikta yazmaz', () => {
  const { p } = kuyrukKur(1, { simdi: 'T3', acikta: [], sirada: '' });
  icermez(durumSatiri(p), 'açıkta');
});

ol('hooks.json PreToolUse matcher SendMessage tasir', () => {
  const h = JSON.parse(fs.readFileSync(path.join(KOK, 'hooks', 'hooks.json'), 'utf8'));
  const hepsi = h.hooks.PreToolUse.map((x) => x.matcher || '');
  const pre = h.hooks.PreToolUse.find((x) => (x.matcher || '').includes('SendMessage'));
  if (!pre) throw new Error('SendMessage PreToolUse matcher inde yok: ' + hepsi.join(' / '));
  icerir(pre.hooks[0].command, 'relay-watch.js');
});

ol('5 satiri gecen SendMessage PreToolUse ta engellenir, cikis kodu 2', () => {
  const { p, live } = kuyrukKur(1, null);
  fs.writeFileSync(path.join(live, 'a1.json'), JSON.stringify({ agent_id: 'a1' }));
  const r = calistir(IZLE, sendMessageYuku(p, 'a1', 'DEGISTI\n1\n2\n3\n4\n5'));
  esit(r.kod, 2, 'engelleme cikis kodu 2 olmali (stdout: ' + r.out + ')');
  icerir(r.err, 'ENGELLEND');
  icerir(r.err, 'tavan 5');
  icerir(r.err, 's\u00f6zle\u015fme dosyas\u0131na yaz');
  esit(json(path.join(live, 'a1.json')).steered, undefined, 'engellenen mesaj kayda girdi');
});

ol('gecen yonlendirme steered[] e duser, kayitli sayi atilan sayiya esit', () => {
  const { p, live } = kuyrukKur(1, null);
  fs.writeFileSync(
    path.join(live, 'a1.json'),
    JSON.stringify({ agent_id: 'a1', agent_type: 'builder' })
  );
  const yolla = (m) => calistir(IZLE, sendMessageYuku(p, 'a1', m));

  esit(yolla('DEVAM - D1 indi, yol acik.').kod, 0, 'tek satir engellendi');
  esit(yolla('DUR\nsozlesme degisti\nbolum 3 yeniden').kod, 0, 'uc satir engellendi');
  esit(yolla('DEGISTI\n1\n2\n3\n4\n5\n6').kod, 2, 'alti satir gecti');

  const a = json(path.join(live, 'a1.json'));
  esit(a.steered.length, 2, 'atilan iki, kayitli ' + (a.steered || []).length);
  esit(a.steered[0].fiil, 'DEVAM');
  esit(a.steered[0].satir, 1);
  esit(a.steered[1].fiil, 'DUR');
  esit(a.steered[1].satir, 3);
  if (!a.steered[0].t) throw new Error('zaman damgasi yok');
  icerir(a.steered[1].metin, 'bolum 3 yeniden', 'metin kayda girmemis');
});

ol('kaydi olmayan hedefin yonlendirmesi ajan sanilmaz', () => {
  const { p, live } = kuyrukKur(1, null);
  esit(calistir(IZLE, sendMessageYuku(p, 'kimse', 'DEVAM - kayitsiz hedef')).kod, 0);
  esit(fs.existsSync(path.join(live, 'kimse.json')), false, 'hayalet ajan kaydi acildi');
  esit(fs.existsSync(path.join(live, '_steered.json')), true, 'yonlendirme kaybolmus');
  esit(json(path.join(live, '_steered.json'))[0].hedef, 'kimse');
  icermez(durumSatiri(p), '\u2a2f', 'hayalet olu ajan satiri dogdu');
});

ol('hedef [ref] ekiyle ve agent_id uzerinden cozulur', () => {
  const { p, live } = kuyrukKur(1, null);
  fs.writeFileSync(
    path.join(live, 'agent-7.json'),
    JSON.stringify({ agent_id: 'agent-7', agent_type: 'builder' })
  );
  esit(calistir(IZLE, sendMessageYuku(p, 'agent-7 [3fa9c1]', 'DEVAM - ref ekli')).kod, 0);
  esit(calistir(IZLE, sendMessageYuku(p, 'agent-7', 'DUR - duz ad')).kod, 0);
  const a = json(path.join(live, 'agent-7.json'));
  esit(a.steered.length, 2, 'ref ekli hedef cozulmedi');
  esit(fs.existsSync(path.join(live, '_steered.json')), false, 'cozulen hedef yedege dustu');
});

ol('debug izi tool_input anahtarlarini da kaydeder', () => {
  const { p, live } = kuyrukKur(1, null);
  calistir(IZLE, sendMessageYuku(p, 'kimse', 'DEVAM - tek satir'), { TEKNESYUM_DEBUG: '1' });
  const d = json(path.join(live, '_hook-debug.json'));
  esit(d.girdi['SendMessage:PreToolUse'], 'message,to', 'tool_input anahtarlari kaydedilmedi');
});

ol('acik is listesi hicbir turda baglama enjekte edilmez', () => {
  const { p } = kuyrukKur(1, {
    simdi: 'T3 yürütülüyor',
    acikta: ['ikon setini tema tokenlarına bağla', 'README kurulum adımı'],
    sirada: 'T4',
  });
  const r = calistir(IZLE, {
    ...ort(p),
    hook_event_name: 'UserPromptSubmit',
    prompt: 'devam',
  });
  const ek = (JSON.parse(r.out || '{}').hookSpecificOutput || {}).additionalContext || '';
  icermez(ek, 'ikon setini', 'kesinti maddesi baglama girdi');
  icermez(ek, 'T3 yürütülüyor', 'yuruyen is baglama girdi');
  icermez(ek, 'açıkta', 'durum blogu baglama girdi');
  icermez(JSON.stringify(JSON.parse(r.out || '{}')), 'systemMessage', 'tur basi satir bastı');
});

ol('yonlendirme tavani ve kuyruk satiri dil.js ten gelir, tr ve en var', () => {
  const kaynak = fs.readFileSync(DIL, 'utf8');
  const blok = kaynak.slice(
    kaynak.indexOf('aciktaKuyruk: {'),
    kaynak.indexOf('yonlendirmeYonerge')
  );
  icerir(blok, 'aciktaKuyruk');
  icerir(blok, 'yonlendirmeTavan');
  esit((blok.match(/\btr:/g) || []).length, 2, 'tr karsiligi eksik');
  esit((blok.match(/\ben:/g) || []).length, 2, 'en karsiligi eksik');
  const { p, live } = kuyrukKur(1, { simdi: '', acikta: ['a'], sirada: '' });
  fs.writeFileSync(path.join(live, 'a1.json'), JSON.stringify({ agent_id: 'a1' }));
  const en = calistir(IZLE, { ...ort(p), hook_event_name: 'Stop' }, { TEKNESYUM_DIL: 'en' });
  icerir(JSON.parse(en.out).systemMessage, '1 item(s) still open');
});

ol('/report acik maddeleri listeler', () => {
  const g = fs.readFileSync(RAPOR_KOMUT, 'utf8');
  icerir(g, 'live/_acik.json');
  icerir(g, 'AÇIKTA');
  icerir(g, '`acikta` boşalmadan kapanmaz');
});

ol('kesinti disiplini ve yonlendirme bicimi belgede', () => {
  const s = fs.readFileSync(RELAY_SKILL, 'utf8');
  icerir(s, '## 1.1.1 Kesinti');
  icerir(s, 'live/_acik.json');
  icerir(s, 'Durum bağlama basılmaz');
  const m = fs.readFileSync(COK_OTURUM, 'utf8');
  icerir(m, '## 5.3 Yönlendirme');
  icerir(m, 'Tavan 5 satır');
  icerir(m, 'steered[]');
  for (const fiil of ['DUR', 'DEVAM', 'DEĞİŞTİ']) icerir(m, fiil);
});

console.log('\nKayıt taşınabilirliği ve durum panosu');

function devirProjesi(blokA, blokB) {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-devir-'));
  const sat = [
    {
      type: 'user',
      sessionId: 'D1',
      timestamp: '2026-01-01T10:00:00.000Z',
      cwd: p,
      version: '2.1.0',
      message: { role: 'user', content: 'isi bitir' },
    },
    {
      type: 'assistant',
      sessionId: 'D1',
      timestamp: '2026-01-01T10:00:05.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'ara cevap' },
          { type: 'tool_use', name: 'Edit', input: { file_path: path.join(p, 'a.js') } },
        ],
      },
    },
    {
      type: 'assistant',
      sessionId: 'D1',
      timestamp: '2026-01-01T10:00:09.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'gizli dusunce' },
          { type: 'text', text: blokA },
          { type: 'tool_use', name: 'Bash', input: { command: 'npm test' } },
          { type: 'text', text: blokB },
        ],
      },
    },
  ];
  fs.writeFileSync(
    path.join(p, 'kaynak.jsonl'),
    sat.map((x) => JSON.stringify(x)).join('\n') + '\n'
  );
  return p;
}

ol('devir.md son asistan mesajini kirpmadan tasir, ozet kirpar', () => {
  const blokA = 'Senden istediklerim\n\n1. ' + 'a'.repeat(2600);
  const blokB = 'Ikinci blok da devirde durmali.';
  const p = devirProjesi(blokA, blokB);
  const r = oturumCalistir(
    'kaydet',
    'devirli',
    '--proje',
    p,
    '--transkript',
    path.join(p, 'kaynak.jsonl')
  );
  esit(r.kod, 0, 'kaydet cikis kodu: ' + r.err);
  const dip = path.join(p, '.claude', 'oturumlar', 'devirli');
  const devir = fs.readFileSync(path.join(dip, 'devir.md'), 'utf8');
  icerir(devir, blokA, 'ilk metin blogu tam gelmeli');
  icerir(devir, blokB, 'ikinci metin blogu da gelmeli');
  icermez(devir, 'kırpıldı', 'devir notu kirpilmaz');
  icermez(devir, 'ara cevap', 'onceki asistan mesaji devire girmez');
  icermez(devir, 'npm test', 'arac cagrilari devire girmez');
  icermez(devir, 'gizli dusunce', 'dusunce blogu devire girmez');
  const ozet = fs.readFileSync(path.join(dip, 'ozet.md'), 'utf8');
  icerir(ozet, 'karakter kırpıldı', 'ozet kirpiyor olmali ki karsilastirma anlamli olsun');
  icerir(ozet, 'devir.md', 'ozet devir notuna isaret etmeli');
  icerir(r.out, 'devir notu: devir.md');
  esit(JSON.parse(fs.readFileSync(path.join(dip, 'durum.json'), 'utf8')).devir, 'devir.md');
});

ol('yukle devir notunu ayri blok olarak geri verir', () => {
  const p = devirProjesi('Senden istediklerim: A maddesi', 'B maddesi');
  oturumCalistir('kaydet', 'geri', '--proje', p, '--transkript', path.join(p, 'kaynak.jsonl'));
  const y = oturumCalistir('yukle', 'geri', '--proje', p);
  esit(y.kod, 0, 'yukle cikis kodu: ' + y.err);
  icerir(y.out, '<<<DEVİR NOTU');
  icerir(y.out, 'Senden istediklerim: A maddesi');
  icerir(y.out, 'B maddesi');
});

ol('kayit yokken transkriptten devralinca da devir notu basilir', () => {
  const p = devirProjesi('Senden istediklerim: kaldigin yerden devam', 'son satir');
  const { ev: evDizin, ort: evOrt } = oturumEvi();
  const t = path.join(evDizin, '.claude', 'projects', p.replace(/[^a-zA-Z0-9]/g, '-'));
  fs.mkdirSync(t, { recursive: true });
  fs.copyFileSync(path.join(p, 'kaynak.jsonl'), path.join(t, 'D1.jsonl'));
  const r = spawnSync(process.execPath, [OTURUM, 'yukle', 'son', '--proje', p], {
    encoding: 'utf8',
    env: { ...process.env, ...evOrt },
  });
  esit(r.status, 0, 'devralma cikis kodu');
  icerir(r.stdout, 'ÖNCEKİ OTURUM');
  icerir(r.stdout, '<<<DEVİR NOTU');
  icerir(r.stdout, 'Senden istediklerim: kaldigin yerden devam');
});

function aynaKur(bare) {
  const c = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-ayna-'));
  let dip = bare;
  if (!dip) {
    dip = path.join(c, 'bare');
    fs.mkdirSync(dip);
    git(['init', '-q', '--bare'], dip);
  }
  const klon = path.join(c, 'klon');
  git(['clone', '-q', dip, klon], c);
  git(['config', 'user.email', 't@t'], klon);
  git(['config', 'user.name', 't'], klon);
  if (!bare) {
    fs.writeFileSync(path.join(klon, 'README'), 'ayna\n');
    git(['add', '.'], klon);
    git(['commit', '-qm', 'ilk'], klon);
    git(['push', '-q', '-u', 'origin', 'HEAD'], klon);
  }
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-aynacfg-'));
  return { c, bare: dip, klon, cfg };
}

function aynaBagla(a, projeler, ad) {
  const kayit = {};
  for (const p of [].concat(projeler)) kayit[p] = ad;
  fs.writeFileSync(
    path.join(a.cfg, 'teknesyum-ozel.json'),
    JSON.stringify({ surum: '1.0.0', depo: a.bare, klon: a.klon, projeler: kayit })
  );
}

function aynaKir(a) {
  git(['remote', 'set-url', 'origin', path.join(a.c, 'boyle-bir-depo-yok')], a.klon);
}

function aynaOturum(a, ...ek) {
  const r = spawnSync(process.execPath, [OTURUM, ...ek], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: a.cfg },
  });
  return { out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), kod: r.status };
}

function aynaAgaci(a) {
  return (
    spawnSync('git', ['-C', a.bare, 'ls-tree', '-r', '--name-only', 'HEAD'], { encoding: 'utf8' })
      .stdout || ''
  );
}

function kirliProje() {
  const p = oturumProjesi();
  git(['init', '-q'], p);
  git(['config', 'user.email', 't@t'], p);
  git(['config', 'user.name', 't'], p);
  fs.writeFileSync(path.join(p, 'a.js'), 'bir\n');
  git(['add', 'a.js'], p);
  git(['commit', '-qm', 'bir'], p);
  fs.writeFileSync(path.join(p, 'a.js'), 'iki\n');
  return p;
}

ol('save ayna kuruluyken dort dosyayi push eder, ham transkripti etmez', () => {
  const p = kirliProje();
  const a = aynaKur();
  aynaBagla(a, p, 'sinavproje');
  const r = aynaOturum(
    a,
    'kaydet',
    'sinav',
    '--proje',
    p,
    '--transkript',
    path.join(p, 'kaynak.jsonl')
  );
  esit(r.kod, 0, 'kaydet cikis kodu: ' + r.err);
  icerir(r.out, 'özel ayna: gönderildi');
  const agac = aynaAgaci(a);
  for (const f of ['ozet.md', 'durum.json', 'calisma.diff', 'devir.md'])
    icerir(agac, 'sinavproje/oturumlar/sinav/' + f, 'aynaya gitmeliydi');
  icermez(agac, 'ham.jsonl', 'ham transkript aynaya gitmemeli');
  esit(
    fs.existsSync(path.join(p, '.claude', 'oturumlar', 'sinav', 'ham.jsonl')),
    true,
    'ham transkript yerelde durmali'
  );
});

ol('ayna kurulu degilse kayit yerele yazilir, sebep soylenir, hata verilmez', () => {
  const p = oturumProjesi();
  const r = oturumCalistir(
    'kaydet',
    'yalnizyerel',
    '--proje',
    p,
    '--transkript',
    path.join(p, 'kaynak.jsonl')
  );
  esit(r.kod, 0, 'kurulu olmayan ayna hata degildir');
  icerir(r.out, 'özel ayna: kayıt yerelde; özel ayna kurulu değil, push edilmedi');
  const dip = path.join(p, '.claude', 'oturumlar', 'yalnizyerel');
  for (const f of ['ozet.md', 'durum.json', 'devir.md', 'ham.jsonl'])
    esit(fs.existsSync(path.join(dip, f)), true, 'yerel kayit tam olmali: ' + f);
});

ol('push basarisizsa kayit yerelde kalir ve sebep basilir, yutulmaz', () => {
  const p = oturumProjesi();
  const a = aynaKur();
  aynaBagla(a, p, 'kirikproje');
  aynaKir(a);
  const r = aynaOturum(
    a,
    'kaydet',
    'kirik',
    '--proje',
    p,
    '--transkript',
    path.join(p, 'kaynak.jsonl')
  );
  esit(r.kod, 0, 'push hatasi kaydi dusurmemeli');
  const onek = 'özel ayna: kayıt yerelde, push edilemedi: ';
  const satir = r.out.split('\n').find((l) => l.startsWith('özel ayna:')) || '';
  icerir(satir, onek);
  if (satir.replace(onek, '').trim().length < 3) throw new Error('sebep bos basildi: ' + satir);
  const dip = path.join(p, '.claude', 'oturumlar', 'kirik');
  for (const f of ['ozet.md', 'durum.json', 'devir.md', 'ham.jsonl'])
    esit(fs.existsSync(path.join(dip, f)), true, 'yerel kayit tam olmali: ' + f);
});

ol('bir makinede save, otekinde load — veri elle tasinmadan gelir', () => {
  const pA = devirProjesi('Senden istediklerim: A maddesi kalsin', 'ikinci blok');
  const pB = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-otekimakine-'));
  const A = aynaKur();
  aynaBagla(A, pA, 'ortakproje');
  const k = aynaOturum(
    A,
    'kaydet',
    'tasima',
    '--proje',
    pA,
    '--transkript',
    path.join(pA, 'kaynak.jsonl')
  );
  esit(k.kod, 0, 'ilk makinede kaydet: ' + k.err);
  icerir(k.out, 'özel ayna: gönderildi');

  const B = aynaKur(A.bare);
  aynaBagla(B, pB, 'ortakproje');
  const y = aynaOturum(B, 'yukle', '--proje', pB);
  esit(y.kod, 0, 'oteki makinede yukle: ' + y.err);
  icerir(y.out, 'özel ayna: çekildi');
  icerir(y.out, 'yerele inen: tasima');
  icerir(y.out, '<<<DEVİR NOTU');
  icerir(y.out, 'Senden istediklerim: A maddesi kalsin');
  const dip = path.join(pB, '.claude', 'oturumlar', 'tasima');
  for (const f of ['ozet.md', 'durum.json', 'devir.md'])
    esit(fs.existsSync(path.join(dip, f)), true, 'oteki makineye inmeliydi: ' + f);
  esit(fs.existsSync(path.join(dip, 'ham.jsonl')), false, 'ham transkript tasinmaz');
});

ol('ayna cekilemezse yereldeki kayitla devam edilir ve soylenir', () => {
  const p = oturumProjesi();
  const A = aynaKur();
  aynaBagla(A, p, 'cekilemez');
  const k = aynaOturum(
    A,
    'kaydet',
    'yereldeduran',
    '--proje',
    p,
    '--transkript',
    path.join(p, 'kaynak.jsonl')
  );
  icerir(k.out, 'özel ayna: gönderildi');
  aynaKir(A);
  const y = aynaOturum(A, 'yukle', '--proje', p);
  esit(y.kod, 0, 'cekilemeyen ayna yuklemeyi dusurmemeli');
  icerir(y.out, 'özel ayna: çekilemedi, yereldeki kayıt okunuyor');
  icerir(y.out, '<<<KAYIT DİZİNİ');
  icerir(y.out, 'yereldeduran');
});

ol('TEKNESYUM_AYNA=0 aynayi tumden kapatir', () => {
  const p = oturumProjesi();
  const a = aynaKur();
  aynaBagla(a, p, 'kapaliproje');
  const r = spawnSync(
    process.execPath,
    [OTURUM, 'kaydet', 'kapali', '--proje', p, '--transkript', path.join(p, 'kaynak.jsonl')],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: a.cfg, TEKNESYUM_AYNA: '0' } }
  );
  esit(r.status, 0, 'kapali ayna cikis kodu');
  icerir(r.stdout, 'özel ayna: kayıt yerelde; özel ayna kurulu değil, push edilmedi');
  icermez(aynaAgaci(a), 'kapaliproje');
});

function panoCalistir(cfgKok, proje, ek) {
  return spawnSync(process.execPath, [OTURUM, 'pano', '--proje', proje].concat(ek || []), {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CONFIG_DIR: cfgKok, TEKNESYUM_PREMIUM: '' },
  });
}

ol('pano bes satiri da basar ve sonunda hazir olup olmadigini soyler', () => {
  const s = surumKur('1.0.0', 'v1.2.0');
  const d = depoKur('geride');
  const r = panoCalistir(s.cfg, d.w);
  esit(r.status, 0, 'pano cikis kodu: ' + r.stderr);
  for (const b of ['Eklenti', 'Depo', 'Profil', 'Açık iş', 'Son kayıt']) icerir(r.stdout, b);
  icerir(r.stdout, '1.2.0 çıktı');
  icerir(r.stdout, 'git pull');
  icerir(r.stdout, 'Hazır değil · önce:');
  const t = panoCalistir(surumKur('1.0.0', 'v1.0.0').cfg, depoKur('esit').w);
  icerir(t.stdout, 'Hazır — kod yazmaya geçebiliriz.');
});

ol('pano sayilari surum.js ve depo-surum.js ten alir, ucuncu karsilastirma yazmaz', () => {
  const s = surumKur('1.0.0', 'v1.2.0');
  const d = depoKur('geride');
  const j = JSON.parse(panoCalistir(s.cfg, d.w, ['--json']).stdout);
  esit(j.eklenti.kurulu, '1.0.0', 'eklenti satiri surum.js ten gelir');
  esit(j.eklenti.uzak, '1.2.0', 'uzak surum surum.js ten gelir');
  esit(j.eklenti.yeni, true, 'yeni bayragi surum.js ten gelir');
  esit(j.depo.geride, true, 'depo satiri depo-surum.js ten gelir');
  esit(j.depo.dal, depoSurum.dal(depoSurum.kok(d.w)), 'dal depo-surum.js ten gelir');
  esit(j.kayit, null, 'kayit yokken bos gelir');
  const kaynak = fs.readFileSync(OTURUM, 'utf8');
  icermez(kaynak, 'ls-remote', 'oturum.js kendi surum sorgusunu yazmamali');
  icerir(kaynak, "'surum.js'", 'eklenti satiri surum.js i cagirmali');
  icerir(kaynak, "'depo-surum.js'", 'depo satiri depo-surum.js i cagirmali');
});

ol('pano ag yokken 3 saniyede doner, askida kalmaz', () => {
  const s = surumKur('1.0.0', 'v1.0.0');
  const d = depoKur('esit');
  depoAstir(d);
  const bas = Date.now();
  const r = panoCalistir(s.cfg, d.w, ['--json']);
  const sure = Date.now() - bas;
  esit(r.status, 0, 'pano askida kalmamali: ' + r.stderr);
  esit(JSON.parse(r.stdout).depo, null, 'donmeyen depo sorgusu bakilamadi olmali');
  if (sure > 4000) throw new Error('pano ' + sure + ' ms surdu, 3 saniyelik butce asildi');
  icerir(panoCalistir(s.cfg, d.w).stdout, 'Depo     · bakılamadı');
});

ol('pano son kaydi ve push durumunu soyler', () => {
  const p = oturumProjesi();
  const a = aynaKur();
  aynaBagla(a, p, 'panoproje');
  aynaOturum(a, 'kaydet', 'panokayit', '--proje', p, '--transkript', path.join(p, 'kaynak.jsonl'));
  const j = JSON.parse(panoCalistir(a.cfg, p, ['--json']).stdout);
  esit(j.kayit.ad, 'panokayit', 'son kayit adi');
  esit(j.kayit.ayna, 'gonderildi', 'push durumu kayitli olmali');
  icerir(panoCalistir(a.cfg, p).stdout, 'aynaya gönderildi');

  const q = oturumProjesi();
  oturumCalistir(
    'kaydet',
    'yerelkayit',
    '--proje',
    q,
    '--transkript',
    path.join(q, 'kaynak.jsonl')
  );
  const k = JSON.parse(panoCalistir(BOS_CFG, q, ['--json']).stdout);
  esit(k.kayit.ayna, 'yok', 'aynasiz kayit yalniz yerelde');
  icerir(panoCalistir(BOS_CFG, q).stdout, 'yalnız yerelde');
});

ol('profil satiri modu ve kaynagini soyler', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-profilkaynak-'));
  const sor = (ek) =>
    (
      spawnSync(
        process.execPath,
        ['-e', 'process.stdout.write(require(process.argv[1]).profilKaynak("S9"))', DIL],
        { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: cfg, ...(ek || {}) } }
      ).stdout || ''
    ).trim();
  esit(sor({ TEKNESYUM_PREMIUM: '' }), 'makine', 'oturum kaydi yokken makine');
  fs.mkdirSync(path.join(cfg, 'teknesyum', 'oturumlar'), { recursive: true });
  fs.writeFileSync(
    path.join(cfg, 'teknesyum', 'oturumlar', 'S9.json'),
    JSON.stringify({ profil: 'premium', ts: Date.now() })
  );
  esit(sor({ TEKNESYUM_PREMIUM: '' }), 'oturum', 'oturum kaydi varsa oturum');
  esit(sor({ TEKNESYUM_PREMIUM: '1' }), 'ortam', 'ortam degiskeni her ikisini de ezer');
});

ol('kayit komutlari devir notunu, ayna satirini ve panoyu anlatir', () => {
  const oku = (f) => fs.readFileSync(path.join(KOK, 'commands', f), 'utf8');
  const s = oku('save.md');
  icerir(s, 'devir.md');
  icerir(s, 'gönderilmez');
  icerir(s, 'push edilemedi');
  icerir(s, 'kurulu değil, push edilmedi');
  icerir(oku('saveall.md'), 'devir.md');
  icerir(oku('saveall.md'), 'özel ayna:');
  const l = oku('load.md');
  icerir(l, 'özel ayna:');
  icerir(l, 'DEVİR NOTU');
  icerir(oku('loadall.md'), 'özel ayna:');
  const u = oku('update.md');
  icerir(u, 'oturum.js" pano');
  icermez(u, 'surum.js" --json', 'pano artik tek kaynak');
  for (const b of ['Eklenti', 'Depo', 'Profil', 'Açık iş', 'Son kayıt']) icerir(u, b);
  icerir(u, '3 saniye');
});

console.log('\nAlt ajan relay protokolünü yüklemesin');

const AJANLAR = path.join(KOK, 'agents');
const ajanDosyalari = () => fs.readdirSync(AJANLAR).filter((f) => f.endsWith('.md'));
const ajanOku = (f) => fs.readFileSync(path.join(AJANLAR, f), 'utf8');
const relayDesc = () =>
  fs
    .readFileSync(path.join(KOK, 'skills', 'relay', 'SKILL.md'), 'utf8')
    .match(/^description: (.*)$/m)[1];

ol('yedi ajan tanimi da relay skillini acmayi yasaklar', () => {
  const a = ajanDosyalari();
  esit(a.length, 7, 'ajan sayisi');
  for (const f of a) {
    const g = ajanOku(f);
    icerir(g, 'teknesyum:relay', f);
    icerir(g, '**açma**', f);
  }
});

ol('yasakta kacis ifadesi yok', () => {
  for (const f of ajanDosyalari()) {
    const g = ajanOku(f).split("## Relay skill'i")[1].split('##')[0];
    for (const kacis of ['gerekmedikçe', 'gerekirse', 'genelde', 'çoğunlukla'])
      icermez(g, kacis, f);
  }
});

ol('relay description kapsam ibaresi tasir', () => {
  const d = relayDesc();
  icerir(d, 'ana oturumda');
  icerir(d, 'oturumda bir kez');
  icerir(d, 'alt ajan açmaz');
});

ol('relay description uzamamis', () => {
  if (relayDesc().length > 367) throw new Error('description uzadi: ' + relayDesc().length);
});

ol('relay description ornek talep listesi duruyor', () => {
  const d = relayDesc();
  icerir(d, 'İLK BURAYA BAK');
  for (const ornek of [
    'özellik ekleme',
    'uygulama yazma',
    'hata düzeltme',
    'refactor',
    'yeni proje',
    'şunu yapalım',
  ])
    icerir(d, ornek);
});

console.log(
  '\n' + (kaldi.length ? '⨯ KALDI' : '✓ GEÇTİ') + '  ' + gecti + '/' + (gecti + kaldi.length)
);
if (kaldi.length) {
  for (const k of kaldi) console.log('   - ' + k);
  process.exit(1);
}
