// O6 — kimlik sapmasında blok, tek kaçış ayarı ve headless'ta susan kurulum uyarısı.
// Ana suite (run.js) sapmanın deftere yazıldığını doğruluyordu; burada denetlenen şey
// sapmanın bir şeyi *durdurup durdurmadığı* ve uyarının hangi koşulda basıldığı.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const KOK = path.join(__dirname, '..', 'teknesyum');
const IZLE = path.join(KOK, 'hooks', 'relay-watch.js');
const KOKTEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'teknesyum-o6-'));

let gecti = 0;
let kalan = 0;

function ol(ad, f) {
  try {
    f();
    gecti++;
    console.log('  ✓ ' + ad);
  } catch (e) {
    kalan++;
    console.log('  ⨯ ' + ad + '\n      ' + e.message);
  }
}

function icerir(govde, parca, not) {
  if (!String(govde).includes(parca))
    throw new Error((not || 'içermeli') + ': ' + parca + ' · bulunan: ' + String(govde).slice(0, 300));
}

function icermez(govde, parca, not) {
  if (String(govde).includes(parca))
    throw new Error((not || 'içermemeli') + ': ' + parca);
}

function calistir(yuk, ek) {
  const r = spawnSync(process.execPath, [IZLE], {
    maxBuffer: 32 * 1024 * 1024,
    input: JSON.stringify(yuk),
    encoding: 'utf8',
    env: {
      ...process.env,
      TEKNESYUM_SESSIZ: '',
      TEKNESYUM_DEBUG: '',
      TEKNESYUM_BEEP_SESSIZ: '1',
      TEKNESYUM_DIL: 'tr',
      TEKNESYUM_HEADLESS: '',
      TEKNESYUM_KIMLIK_KACIS: '',
      CLAUDE_CODE_SESSION_KIND: '',
      CLAUDE_CODE_ENTRYPOINT: '',
      COLUMNS: '',
      CLAUDE_CODE_SESSION_ID: '',
      CLAUDE_CODE_HOST_SESSION_ID: '',
      ...(ek || {}),
    },
  });
  return { out: (r.stdout || '').trim(), kod: r.status };
}

function proje() {
  const p = fs.mkdtempSync(path.join(KOKTEMP, 'proje-'));
  const relay = path.join(p, '.claude', 'relay');
  fs.mkdirSync(path.join(relay, 'contracts', 'done'), { recursive: true });
  fs.writeFileSync(path.join(relay, 'contracts', 'T1.md'), '#');
  return { p, live: path.join(relay, 'live') };
}

function konfig(profil, statusline) {
  const c = fs.mkdtempSync(path.join(KOKTEMP, 'cfg-'));
  fs.writeFileSync(path.join(c, 'teknesyum.json'), JSON.stringify({ dil: 'tr', profil }));
  if (statusline) {
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

const ort = (p) => ({ cwd: p, session_id: 'oturum-o6', transcript_path: '/x/oturum-o6.jsonl' });

// premium profilde builder opus/xhigh bekler; transkriptte sonnet duruyorsa sapma vardır.
// `cagri` verilirse önce PreToolUse koşar — beklenti o çağrı kaydından gelir.
function sapanAjanBitir(p, ek, gercek, cagri) {
  const d = fs.mkdtempSync(path.join(KOKTEMP, 'ajantr-'));
  const at = path.join(d, 'agent-o6.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', message: { model: gercek || 'claude-sonnet-4-5' } }) + '\n'
  );
  if (cagri)
    calistir(
      {
        ...ort(p),
        hook_event_name: 'PreToolUse',
        tool_name: 'Agent',
        tool_input: { subagent_type: 'teknesyum:builder', model: cagri },
      },
      ek
    );
  return calistir(
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'o6',
      agent_type: 'teknesyum:builder',
      agent_transcript_path: at,
      effort: { level: 'xhigh' },
    },
    ek
  );
}

function gunluk(live) {
  try {
    return fs.readFileSync(path.join(live, '_sorun.log'), 'utf8');
  } catch {
    return '';
  }
}

console.log('\nO6 — kimlik sapması');

ol('sapma artık blok döndürür, yalnız deftere not düşmez', () => {
  const { p, live } = proje();
  const r = sapanAjanBitir(p, konfig('premium', true), null, 'opus');
  const o = JSON.parse(r.out);
  if (o.decision !== 'block') throw new Error('karar: ' + JSON.stringify(o).slice(0, 200));
  icerir(o.reason, 'builder');
  icerir(o.reason, 'model beyan');
  icerir(gunluk(live), 'engellendi');
});

ol('sapma yoksa blok da yok', () => {
  const { p, live } = proje();
  const r = sapanAjanBitir(p, konfig('premium', true), 'claude-opus-4-5');
  const o = r.out ? JSON.parse(r.out) : {};
  if (o.decision === 'block') throw new Error('sapmasız ajan bloklandı: ' + o.reason);
  icermez(gunluk(live), 'engellendi');
});

// Tur 2 · madde 1: beklenti çağrı kaydından değil profilden geliyorsa beyan bilinmiyor
// demektir; meşru bir çağrı ezmesi yanlış bloka dönmesin diye o sapma yalnız yazılır.
ol('çağrı kaydı yokken model sapması bloklamaz, yalnız deftere düşer', () => {
  const { p, live } = proje();
  const r = sapanAjanBitir(p, konfig('premium', true));
  const o = r.out ? JSON.parse(r.out) : {};
  if (o.decision === 'block') throw new Error('çağrı kaydı yokken bloklandı: ' + o.reason);
  icerir(gunluk(live), 'builder | model');
  icerir(gunluk(live), 'yalnız kayıt (çağrı kaydı yok)');
});

ol('efor sapması bloklamaz, yalnız deftere düşer', () => {
  const { p, live } = proje();
  const d = fs.mkdtempSync(path.join(KOKTEMP, 'ajantr-'));
  const at = path.join(d, 'agent-o6e.jsonl');
  fs.writeFileSync(
    at,
    JSON.stringify({ type: 'assistant', message: { model: 'claude-opus-4-5' } }) + '\n'
  );
  const r = calistir(
    {
      ...ort(p),
      hook_event_name: 'SubagentStop',
      agent_id: 'o6e',
      agent_type: 'teknesyum:builder',
      agent_transcript_path: at,
      effort: { level: 'low' },
    },
    konfig('premium', true)
  );
  // Efor cagri aninda gecilemiyor (SETTINGS.md:110, :216). Blok atilirsa ajan
  // kendi eforunu duzeltemedigi icin kilitlenir; olculdu 26.08 — denetci rolu
  // sekiz ardisik uyariyla hic calisamadi.
  const o = r.out ? JSON.parse(r.out) : {};
  if (o.decision === 'block') throw new Error('efor sapmasi bloklamamali');
  icerir(gunluk(live), 'builder | efor');
});

ol('kaçış ayarı açıkken blok kalkar ama kayıt kalır', () => {
  const { p, live } = proje();
  const r = sapanAjanBitir(p, {
    ...konfig('premium', true),
    TEKNESYUM_KIMLIK_KACIS: '1',
  }, null, 'opus');
  const o = r.out ? JSON.parse(r.out) : {};
  if (o.decision === 'block') throw new Error('kaçış açıkken hâlâ bloklandı');
  icerir(gunluk(live), 'kaçış kullanıldı (kimlik_kacis)');
});

ol('kaçış kapalıyken gerekçe ayarın adını yazar', () => {
  const { p, live } = proje();
  const r = sapanAjanBitir(p, konfig('premium', true), null, 'opus');
  const o = JSON.parse(r.out);
  if (o.decision !== 'block') throw new Error('ayarsız koşuda blok düşmüş');
  icerir(o.reason, 'kimlik_kacis', 'kaçışın adı gerekçede yazmalı');
  icerir(gunluk(live), 'engellendi');
});

console.log('\nO6 — kurulum uyarısı');

function acilisMetni(r) {
  if (!r.out) return '';
  const o = JSON.parse(r.out);
  return o.systemMessage || (o.hookSpecificOutput || {}).additionalContext || '';
}

ol('interaktif oturumda uyarı neyin eksik olduğunu söyler', () => {
  const { p } = proje();
  const m = acilisMetni(
    calistir({ ...ort(p), hook_event_name: 'SessionStart' }, konfig('normal', false))
  );
  icerir(m, 'statusline', 'uyarı genel değil, eksiği adıyla anmalı');
});

ol('statusline dosyası varken bağlantı eksiğini ayrı söyler', () => {
  const { p } = proje();
  const ek = konfig('normal', false);
  fs.writeFileSync(path.join(ek.CLAUDE_CONFIG_DIR, 'teknesyum-statusline.js'), '//');
  const m = acilisMetni(calistir({ ...ort(p), hook_event_name: 'SessionStart' }, ek));
  icerir(m, 'settings.json', 'bağlanmamış statusline ayrı anlatılmalı');
});

ol('headless koşuda kurulum uyarısı hiç basılmaz', () => {
  const { p } = proje();
  const m = acilisMetni(
    calistir({ ...ort(p), hook_event_name: 'SessionStart' }, {
      ...konfig('normal', false),
      TEKNESYUM_HEADLESS: '1',
    })
  );
  icermez(m, 'statusline', 'headless koşuda kurulum uyarısı basıldı');
  icerir(m, 'röle kurulu', 'röle satırı headless koşuda da yazılmalı');
});

ol('arka plan oturumu ve yönlendirilmiş -p çıktısı da headless sayılır', () => {
  const { p } = proje();
  for (const ek of [
    { CLAUDE_CODE_SESSION_KIND: 'bg' },
    { CLAUDE_CODE_ENTRYPOINT: 'cli' },
  ]) {
    const m = acilisMetni(
      calistir({ ...ort(p), hook_event_name: 'SessionStart' }, { ...konfig('normal', false), ...ek })
    );
    icermez(m, 'statusline', JSON.stringify(ek) + ' koşusunda uyarı basıldı');
  }
});

ol('terminale bağlı koşuda uyarı yine basılır', () => {
  const { p } = proje();
  const m = acilisMetni(
    calistir({ ...ort(p), hook_event_name: 'SessionStart' }, {
      ...konfig('normal', false),
      CLAUDE_CODE_ENTRYPOINT: 'cli',
      COLUMNS: '120',
    })
  );
  icerir(m, 'statusline', 'terminale bağlı koşuda uyarı susmamalı');
});

try {
  fs.rmSync(KOKTEMP, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
} catch {}

if (kalan) {
  console.error('\nO6 — ' + gecti + ' geçti, ' + kalan + ' kaldı');
  process.exit(1);
}
console.log('\nO6 — ' + gecti + ' doğrulama geçti, 0 düştü.\nGEÇTİ');
