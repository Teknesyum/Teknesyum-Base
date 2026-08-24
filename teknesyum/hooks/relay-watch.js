const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { s: ceviri, premium, profil } = require('./dil.js');
const { PROFIL, sapmalar, sapmaSatiri } = require('../scripts/premium.js');
const kapsayici = require('./kapsayici.js');
const {
  konfigKok,
  transkriptDizini,
  read,
  yaz,
  norm,
  safe,
  roleKoku,
  izKoku,
} = require('./ortak.js');

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', (d) => (raw += d));
  process.stdin.on('end', () => {
    try {
      run(JSON.parse(raw));
    } catch {}
    ciktiBas();
    process.exit(0);
  });
}

// Yürürlükteki kanca olayı. `duyur` kanalını buna göre seçiyor: tur içi olaylar modele,
// `Stop`/`StopFailure` kullanıcıya. Üstte duruyor çünkü `run` ilk satırında yazıyor.
let _olay = null;
let _cikti = null;

function ciktiEkle(alan) {
  _cikti = Object.assign(_cikti || {}, alan);
}

function ciktiBas() {
  if (!_cikti) return;
  const o = _cikti;
  _cikti = null;
  try {
    process.stdout.write(JSON.stringify(o));
  } catch {}
}

function run(j) {
  _olay = j.hook_event_name;
  const root = findRelay(j.cwd || process.cwd());
  const kap = kapsayici.kok(j.cwd || process.cwd());
  const kapDurum = kap
    ? path.join(genelKok(), safe(j.session_id || 'oturum') + '.kapsayici')
    : null;
  turDamga(j);
  if (j.hook_event_name === 'PostToolUse') {
    if (kap) kapsayici.izle(kap, kapDurum, j);
    const bozuk = sozdizim(j);
    if (bozuk) ciktiEkle({ decision: 'block', reason: bozuk });
  }

  if (j.hook_event_name === 'SessionStart') {
    return acilis(
      root,
      kap ? ceviri('kapsayiciAcilis', path.basename(kap)) : '',
      j.session_id,
      j.cwd
    );
  }
  if (j.hook_event_name === 'UserPromptSubmit') {
    const k = String(j.prompt || '').match(/^[ ]*\/([a-z0-9:-]+)/i);
    if (k) kullanimSay('komut:' + k[1].toLowerCase());
    turBasla(j, root);
    puslaHatirlat(j);
    return hatirlat(j, root, kap && kapsayici.etkin(kapDurum));
  }
  if (j.hook_event_name === 'Stop') {
    if (kap) kapsayiciTopla(kap, kapDurum);
    paketDenetle(j, root);
    return turBitir(j, root);
  }
  if (j.hook_event_name === 'PostCompact') return sikismaSonrasi(root);
  if (j.hook_event_name === 'SessionEnd') {
    if (kap) kapsayiciTopla(kap, kapDurum);
    return oturumKapat(root, j);
  }
  if (j.hook_event_name === 'StopFailure') return kesintiYaz(root, j);

  // Röle kurulu projede izler proje içinde durur (/report oradan okur). Kurulu değilse
  // — üst klasörde, rastgele bir dizinde açılmış oturumda — oturuma özel genel dizine
  // yazarız. Kullanıcının klasör ayarlamasını beklemeyiz.
  const live = root ? izYolu(root) : path.join(genelKok(), safe(j.session_id || 'oturum'));
  try {
    fs.mkdirSync(live, { recursive: true });
  } catch {
    return;
  }
  supur();
  saglikTara(live, root);

  if (debugAcik()) iz(live, j);

  if (j.hook_event_name === 'PostToolUse' && /^Skill$/.test(j.tool_name || '')) {
    const ad = (j.tool_input && (j.tool_input.skill || j.tool_input.name)) || '?';
    kullanimSay('skill:' + String(ad).toLowerCase());
  }
  if (j.hook_event_name === 'SubagentStart') {
    kullanimSay('ajan:' + String(j.agent_type || '?').replace(/^teknesyum:/, ''));
  }

  // ÖLÇÜLDÜ (20.08.2026): alt ajanın araç olayları artık `agent_id` ile geliyor — 509
  // olaylı günlükte PostToolUse'ların 207'si ajanlı. Adım sayacı çalışıyor. Gelmeyen tek
  // şey `cwd`: ajan başka bir projede çalışsa da olay ana oturumun kökünü taşır, izler
  // oraya yazılır.
  // ÖLÇÜLDÜ: başarısız `Edit` de PostToolUse üretiyordu; adım sayılıyor ve `last_action`
  // başarılı görünüyordu. Başarısızlık ayrı olayla gelir — adım saymaz, iz bırakır.
  if (j.hook_event_name === 'PostToolUseFailure') {
    const kim = j.agent_id || transcriptKimligi(j);
    const hedef =
      (j.tool_input && (j.tool_input.file_path || j.tool_input.path || j.tool_input.command)) || '';
    sorunYaz(
      live,
      [
        kim || 'ana oturum',
        j.tool_name || '?',
        String(hedef).slice(0, 120),
        String(j.error || j.error_type || 'hata').slice(0, 200),
      ].join(' | ')
    );
    debugBildir(live, aksama(j), false);
    if (!kim) return;
    const f = path.join(live, safe(kim) + '.json');
    const k = read(f);
    if (!k) return;
    k.last_error =
      (j.tool_name || '?') + ': ' + String(j.error_type || j.error || 'hata').slice(0, 80);
    yaz(f, k);
    return;
  }

  if (j.hook_event_name === 'PreToolUse') {
    if (/^(Agent|Task)$/.test(j.tool_name || '')) {
      const n = calisanEkle(live, j);
      const t = j.tool_input || {};
      const rol = String(t.subagent_type || '?').replace(/^teknesyum:/, '');
      const tanim = String(t.description || '').slice(0, 60);
      if (rol === 'advisor') gorusKaydet(root, t);
      duyur(ceviri('gorev', rol, t.model, tanim, n));
    }
    return;
  }

  // Kimlik iki kanaldan gelebilir: `agent_id` (bugün olayların çoğunda var) ve ajanın
  // kendi transcript dosyasının adı. İkincisi yedektir — eski sürümlerde ve bazı
  // olaylarda `agent_id` gelmiyor. Biri düşerse diğeri ajanı tanımaya devam eder.
  const agentId = j.agent_id || transcriptKimligi(j);
  if (!agentId) {
    if (j.hook_event_name === 'PostToolUse') anaKapsam(root, j);
    return;
  }

  const file = path.join(live, safe(agentId) + '.json');
  if (j.agent_id) birlestir(live, file, transcriptKimligi(j));
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const s = read(file) || {
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
  // Bitmiş sayılan bir ajandan yeni olay geliyorsa bitmemiştir. Kaydı geri aç;
  // aksi halde `ended` sabit kalır, `last_seen` ilerler ve kayıt kendiyle çelişir.
  if (s.ended && j.hook_event_name !== 'SubagentStop') {
    s.ended = null;
    s.stop_reason = null;
  }
  s.last_seen = now;
  s.identity = j.agent_id ? 'agent_id' : 'transcript';
  s.transcript = ajanTranskripti(j) || s.transcript || null;

  switch (j.hook_event_name) {
    case 'SubagentStart':
      s.started = now;
      s.stop_reason = null;
      s.tekrar = 0;
      s.dongu_boy = null;
      s.dongu_bildirildi = false;
      s.sessiz_bildirildi = false;
      break;

    case 'PostToolUse': {
      s.steps++;
      const t = j.tool_input || {};
      const target = t.file_path || t.notebook_path || '';
      const proj = root ? path.dirname(path.dirname(root)) : j.cwd || process.cwd();
      const eylem = (j.tool_name || '?') + (target ? ' ' + short(target, proj) : '');
      if (eylem === s.last_action) {
        s.tekrar = (s.tekrar || 0) + 1;
      } else {
        s.tekrar = 0;
        s.dongu_boy = null;
        s.dongu_bildirildi = false;
      }
      s.last_action = eylem;
      s.sessiz_bildirildi = false;
      s.boy = transkriptBoyu(s.transcript);
      if (s.dongu_boy === null || s.dongu_boy === undefined) s.dongu_boy = s.boy;
      dongu(live, root, s);

      if (target) {
        const n = norm(target);
        const m = n.match(/\/relay\/contracts\/(?:done\/)?(T[^/]+)\.md$/i);
        if (m && !s.contract) s.contract = m[1];
        if (!m && /^(Write|Edit|NotebookEdit)$/.test(j.tool_name || '')) {
          const rel = short(target, proj);
          if (!s.files.includes(rel)) s.files.push(rel);
        }
      }
      break;
    }

    case 'SubagentStop': {
      const c = calisanKapat(live, j.agent_type);
      const rol = String((c && c.type) || j.agent_type || 'ajan').replace(/^teknesyum:/, '');
      duyur(ceviri('bitti', rol, c ? (c.ambiguous ? ceviri('sureBelirsiz') : gecen(c.start)) : ''));
      // Ölçüldü: bu olayın payload'ında `stop_reason` alanı YOK. Eksikliği ölüm sanma —
      // aksi halde normal biten her ajan statusline'da ⨯ görünür.
      s.stop_reason = j.stop_reason || 'end_turn';
      // `ended` başlangıçtan önce olamaz. Olduysa kayıt karışmıştır; uydurma yerine
      // alanı boş bırak — yanlış zaman, zamansızlıktan kötüdür.
      s.ended = s.started && now < s.started ? null : now;
      if (j.last_assistant_message) s.last_word = String(j.last_assistant_message).slice(0, 300);
      Object.assign(s, kimlikOku(j));
      kimlikDenetle(live, j.agent_type, s, c);
      debugBildir(live, aksama(j), true);
      kapsamYaz(
        root,
        (s.files || []).map((f) => ({
          dosya: f,
          model: s.model || null,
          effort: s.effort || null,
          t: now,
          ajan: rolAdi(s),
        }))
      );
      break;
    }
  }

  yaz(file, s);
}

// ÖLÇÜLDÜ: hook yükünde `effort: { level: "high" }` alanı her olayda geliyor ve
// okunmuyordu. Model yükte yok — ajanın kendi transcript'inin son asistan satırında
// duruyor. İkisi birlikte "beyan edilen model/efor gerçekten uygulandı mı" sorusunu
// mekanik olarak cevaplar; ajan tanımındaki `model:`/`effort:` artık doğrulanabilir.
// ÖLÇÜLDÜ: bozuk yazılan bir dosya, denetçi ajan sırası gelene kadar fark edilmiyordu;
// arada beş on araç çağrısı daha yapılmış oluyor ve düzeltme pahalıya patlıyordu.
// Ayrıştırma hatası bir sonraki adımdan önce modele geri veriliyor.
const DENETLENEN = { '.js': 1, '.cjs': 1, '.mjs': 1, '.json': 1 };
// `node --check` .js dosyasını CommonJS sayar; ESM kaynakta yanlış alarm verir.
const ESM_YANILGISI = /Cannot use import statement|Unexpected token 'export'|await is only valid/;

function sozdizim(j) {
  if (!/^(Write|Edit|NotebookEdit)$/.test(j.tool_name || '')) return '';
  const t = j.tool_input || {};
  const f = String(t.file_path || t.notebook_path || '');
  const uz = path.extname(f).toLowerCase();
  if (!DENETLENEN[uz]) return '';
  // jsonc: yorum kabul eden ayar dosyaları JSON.parse'tan geçmez, denetlenmez.
  if (uz === '.json' && /[/]{1}[.]vscode[/]|(^|[/])tsconfig/i.test(norm(f))) return '';
  let govde = '';
  try {
    govde = fs.readFileSync(f, 'utf8');
  } catch {
    return '';
  }
  if (uz === '.json') {
    try {
      JSON.parse(govde);
      return '';
    } catch (e) {
      return bozukMesaj(f, String(e.message));
    }
  }
  try {
    execFileSync(process.execPath, ['--check', f], {
      stdio: ['ignore', 'ignore', 'pipe'],
      timeout: 5000,
    });
    return '';
  } catch (e) {
    const h = String((e.stderr && e.stderr.toString()) || e.message || '');
    if (ESM_YANILGISI.test(h)) return '';
    return bozukMesaj(f, h);
  }
}

function bozukMesaj(f, hata) {
  const ilk = hata.split('\n').filter(Boolean).slice(0, 5).join('\n');
  return ceviri('sozdizimBozuk', f, ilk);
}

function kimlikOku(j) {
  const out = {};
  const e = j.effort;
  const lvl = e && typeof e === 'object' ? e.level : e;
  if (lvl) out.effort = String(lvl);
  const tp = j.agent_transcript_path || j.transcript_path;
  const son = sonAsistan(tp);
  if (son) {
    if (son.model) out.model = String(son.model);
    if (son.effort) out.effort = String(son.effort);
  }
  return out;
}

// Ajan tanımları kancanın iki dizin yukarısında: kanca `<eklenti>/hooks/` altından
// çalışır, tanımlar `<eklenti>/agents/` altındadır. `CLAUDE_PLUGIN_ROOT` ortam
// değişkenine ihtiyaç yok, yol `__dirname`den kesin çıkar.
const TANIM_DIZINI = path.join(__dirname, '..', 'agents');

function tanimOku(type) {
  const ad = String(type || '').replace(/^teknesyum:/, '');
  if (!/^[a-z0-9._-]+$/i.test(ad)) return null;
  const govde = metin(path.join(TANIM_DIZINI, ad + '.md'));
  if (!govde) return null;
  const bas = govde.split(/^---[ \t]*$/m)[1];
  if (!bas) return null;
  const al = (k) => {
    const m = bas.match(new RegExp('^' + k + ':[ \\t]*(.+)$', 'm'));
    return m ? m[1].trim() : '';
  };
  return { effort: al('effort') };
}

function beklenenModel(rol) {
  const p = PROFIL[profil()];
  return (p && p[rol] && p[rol].model) || '';
}

function kimlikDenetle(live, type, s, c) {
  const t = tanimOku(type);
  if (!t) return;
  const rol = String(type || '?').replace(/^teknesyum:/, '');
  const bekle = String((c && c.model) || beklenenModel(rol));
  const model = String(s.model || '');
  const efor = String(s.effort || '');
  const uyar = (alan, beyan, gercek) =>
    sorunYaz(live, [rol, alan, 'beyan: ' + beyan, 'gerçek: ' + gercek].join(' | '));
  if (bekle && model && !model.toLowerCase().includes(bekle.toLowerCase())) {
    uyar('model', bekle, model);
  }
  if (t.effort && efor && efor.toLowerCase() !== t.effort.toLowerCase()) {
    uyar('efor', t.effort, efor);
  }
}

// Transcript'in sonundan geriye doğru ilk asistan satırını bulur. Dosya büyük olabilir;
// yalnızca son 256 kB okunur.
function sonAsistan(tp) {
  if (!tp) return null;
  let ham;
  try {
    const fd = fs.openSync(tp, 'r');
    const boy = fs.fstatSync(fd).size;
    const bas = Math.max(0, boy - 262144);
    const buf = Buffer.alloc(boy - bas);
    fs.readSync(fd, buf, 0, buf.length, bas);
    fs.closeSync(fd);
    ham = buf.toString('utf8');
  } catch {
    return null;
  }
  const satir = ham.split('\n');
  for (let i = satir.length - 1; i >= 0; i--) {
    if (!satir[i].includes('"assistant"')) continue;
    let o;
    try {
      o = JSON.parse(satir[i]);
    } catch {
      continue;
    }
    if (!o || o.type !== 'assistant') continue;
    return { model: o.message && o.message.model, effort: o.effort };
  }
  return null;
}

function transkriptBoyu(yol) {
  if (!yol) return 0;
  try {
    return fs.statSync(yol).size;
  } catch {
    return 0;
  }
}

function ajanTranskripti(j) {
  if (j.agent_transcript_path) return String(j.agent_transcript_path);
  const tp = j.transcript_path;
  if (!tp) return null;
  const base = path.basename(String(tp)).replace(/\.jsonl$/i, '');
  return base && base !== j.session_id ? String(tp) : null;
}

function altTranskript(live) {
  let toplam = 0;
  for (const f of dosyalar(live)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const a = read(path.join(live, f));
    if (a && a.transcript) toplam += transkriptBoyu(a.transcript);
  }
  return toplam;
}

const AYAR_DOSYASI = path.join(__dirname, '..', 'skills', 'relay', 'SETTINGS.md');
const SESSIZLIK_DK = 10;
const DONGU_TEKRAR = 5;
const SAGLIK_ARA = 60 * 1000;
const SAGLIK_DAMGA = '_saglik';

function ayarSayi(root, anahtar, varsayilan) {
  const sapma = sapmalar(profil())[anahtar];
  if (/^\d+$/.test(String(sapma))) return parseInt(sapma, 10);
  for (const f of [root ? path.join(root, 'SETTINGS.md') : null, AYAR_DOSYASI]) {
    if (!f) continue;
    const govde = metin(f);
    if (!govde) continue;
    const m = govde.match(new RegExp('^[ \\t]*' + anahtar + '[ \\t]*:[ \\t]*(\\d+)', 'm'));
    if (m) return parseInt(m[1], 10);
  }
  return varsayilan;
}

function rolAdi(a) {
  return String((a && a.agent_type) || 'ajan').replace(/^teknesyum:/, '');
}

// Kapsam kaydı `live/` gibi süpürülmez: "bu dosya incelendi mi" sorusu haftalar sonra da
// cevaplanmalı — `/scan` sertifikası bunun üstünde durur. `live/<ajan>.json` bir günü
// geçince atılır, kayıt kalıcıdır. Dosya yolu başına tek giriş tutulur, en son inceleyen
// kazanır. Tavan proje başına kaynak dosya sayısının çok üstündedir; aşılırsa en eski
// giriş düşer, dosya sınırsız büyümez.
const KAPSAM_TAVAN = 4000;

function kapsamYaz(root, giris) {
  if (!root || !giris || !giris.length) return;
  const f = path.join(root, 'kapsam.json');
  const d = read(f) || {};
  for (const g of giris) {
    if (!g.dosya) continue;
    d[g.dosya] = { model: g.model || null, effort: g.effort || null, t: g.t, ajan: g.ajan };
  }
  const anahtar = Object.keys(d);
  if (anahtar.length > KAPSAM_TAVAN) {
    anahtar.sort((a, b) => String(d[a].t || '').localeCompare(String(d[b].t || '')));
    for (const a of anahtar.slice(0, anahtar.length - KAPSAM_TAVAN)) delete d[a];
  }
  yaz(f, d);
}

// Ana oturumun dokunuşu da incelemedir: T0 bir dosyayı açıp düzelttiyse o dosya
// görülmüştür. Ajan kaydı burada yok — `agent_id` gelmiyor — o yüzden kayıt doğrudan
// yazılır; model ve efor ajandakiyle aynı iki kanaldan okunur.
function anaKapsam(root, j) {
  if (!root || !/^(Write|Edit|NotebookEdit)$/.test(j.tool_name || '')) return;
  const t = j.tool_input || {};
  const hedef = t.file_path || t.notebook_path || '';
  if (!hedef) return;
  if (/\/relay\/contracts\/(?:done\/)?T[^/]+\.md$/i.test(norm(hedef))) return;
  const k = kimlikOku(j);
  kapsamYaz(root, [
    {
      dosya: short(hedef, path.dirname(path.dirname(root))),
      model: k.model || null,
      effort: k.effort || null,
      t: new Date().toISOString().replace('T', ' ').slice(0, 19),
      ajan: 'ana oturum',
    },
  ]);
}

function dongu(live, root, s) {
  if (s.dongu_bildirildi) return;
  if ((s.tekrar || 0) + 1 < ayarSayi(root, 'agent_loop', DONGU_TEKRAR)) return;
  if (!(s.boy > s.dongu_boy)) return;
  s.dongu_bildirildi = true;
  const kim = s.agent_id || '?';
  const n = (s.tekrar || 0) + 1;
  duyur(ceviri('ajanDongu', rolAdi(s), kim, n, s.last_action), 1, true);
  sorunYaz(live, ['döngü', rolAdi(s), kim, n + ' kez ' + s.last_action].join(' | '));
}

function saglikTara(live, root) {
  const damga = path.join(live, SAGLIK_DAMGA);
  try {
    if (Date.now() - fs.statSync(damga).mtimeMs < SAGLIK_ARA) return;
  } catch {}
  try {
    fs.writeFileSync(damga, '');
  } catch {}
  const sinir = ayarSayi(root, 'agent_stall', SESSIZLIK_DK) * 60 * 1000;
  for (const f of dosyalar(live)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const yol = path.join(live, f);
    const a = read(yol);
    if (!a || a.ended || a.stop_reason || a.sessiz_bildirildi) continue;
    const t = Date.parse(String(a.last_seen || '').replace(' ', 'T') + 'Z');
    if (isNaN(t)) continue;
    const gecen = Date.now() - t;
    if (gecen < sinir) continue;
    a.sessiz_bildirildi = true;
    yaz(yol, a);
    const kim = a.agent_id || f.slice(0, -5);
    const dk = Math.round(gecen / 60000);
    duyur(ceviri('ajanSessiz', rolAdi(a), kim, dk, a.last_action || '—'), 1, true);
    sorunYaz(live, ['sessiz', rolAdi(a), kim, dk + ' dakika', a.last_action || '—'].join(' | '));
  }
}

function aksama(j) {
  const kim = j.agent_id || transcriptKimligi(j) || 'ana oturum';
  const rol = String(j.agent_type || 'ajan').replace(/^teknesyum:/, '');
  if (j.hook_event_name === 'PostToolUseFailure') {
    const t = j.tool_input || {};
    const arac = j.tool_name || '?';
    return {
      ne: j.is_interrupt ? ceviri('debugKesinti', arac) : ceviri('debugAracHatasi', arac),
      nerede: ceviri('debugNerede', rol, kim),
      ayrinti: String(
        (t.file_path || t.path || t.command || '') + ' ' + (j.error || j.error_type || '')
      )
        .trim()
        .slice(0, 200),
    };
  }
  if (j.hook_event_name === 'SubagentStop') {
    return {
      ne: ceviri('debugAjanDurdu'),
      nerede: ceviri('debugNerede', rol, kim),
      ayrinti: String(j.stop_reason || 'end_turn').slice(0, 80),
    };
  }
  return null;
}

function debugBildir(live, a, gunluk) {
  if (!a || !debugAcik()) return;
  duyur(ceviri('debugOlay', a.ne, a.nerede), 1, true);
  if (gunluk) sorunYaz(live, ['debug', a.ne, a.nerede, a.ayrinti].filter(Boolean).join(' | '));
}

const TUR_EK = '.tur';

function turYolu(j) {
  return path.join(genelKok(), safe(j.session_id || 'oturum') + TUR_EK);
}

function turIzi(j, root) {
  return root ? izYolu(root) : path.join(genelKok(), safe(j.session_id || 'oturum'));
}

// Tur süresi duvar saatiydi: kullanıcı ekrandan uzaklaşsa, oturum dursa, API geri
// çekilmeye girse hepsi süreye giriyordu. Ölçülebilen boşlukları düşüyoruz.
// Toplama yerine çıkarma seçildi: araçların `duration_ms` toplamı beklemeyi hiç
// saymaz ama modelin düşünme süresini de saymaz — turun büyük kısmı düşünmeyken
// gerçeğin çok altında bir sayı basardı. Çıkarma düşünmeyi korur, yalnız uzun
// sessizlikleri atar.
// ÖLÇÜLDÜ (22.08.2026): 1218 olaylık `_hook-debug.log` üzerinde ardışık olay arası
// boşluk p50 7 sn, p90 25 sn, p95 40 sn. 120 sn'yi yalnız 27 boşluk aşıyor ve
// duraklamanın tamamı (182487 sn) o 27'nin içinde. Eşik oraya konuldu.
// ÖLÇÜLDÜ: aynı günlükte 4 olayın `duration_ms` değeri 60 sn'yi aşıyor, en uzunu
// 140,6 sn. Çıplak çıkarma bu gerçek çalışmayı duraklama sayardı; boşluktan önce
// olayın kendi `duration_ms` süresi düşülür, kalan eşiği aşarsa duraklamadır.
// ÖLÇÜLDÜ: izin istemi beklenirken geçen süre hiçbir olayla damgalanmıyor —
// `PreToolUse` payload'ında `duration_ms` yok, aracın çalışması ile arasında damga
// yok. O boşluk kapatılamıyor; süre bu yüzden `~` ile yaklaşık işaretlenir.
const DURAK_ESIGI = 120000;

// Ölçülen pencere kullanıcının inputundan kullanıcının inputuna kadardır. Her istem yeni
// bir pencere açar; önceki pencerenin bakiyesi taşınmaz, çünkü önceki pencere kapanırken
// makbuzunu zaten basmıştır (`turBitir`). Bir dönem engelli kapanış ertelenip zincir
// boyunca birikiyordu; kullanıcı 23.08.2026'da kuralı tersine çevirdi.
function turBasla(j, root) {
  const f = turYolu(j);
  const now = Date.now();
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(
      f,
      JSON.stringify({
        t: now,
        son: now,
        durak: 0,
        sn0: 0,
        boyAna: transkriptBoyu(j.transcript_path),
        boyAlt: altTranskript(turIzi(j, root)),
      })
    );
  } catch {}
}

// Turun içindeki her olay bir damgadır: iki damga arası, aracın kendi süresi
// düşüldükten sonra eşiği aşıyorsa o aralıkta çalışılmamıştır.
function durakToplami(d, now, j) {
  const bosluk = now - (d.son || d.t);
  const is = Math.max(0, Number(j && j.duration_ms) || 0);
  const bos = bosluk - is;
  return (d.durak || 0) + (bos > DURAK_ESIGI ? bos : 0);
}

function turDamga(j) {
  const ev = j.hook_event_name;
  if (ev === 'UserPromptSubmit' || ev === 'Stop') return;
  const f = turYolu(j);
  const d = read(f);
  if (!d || !d.t) return;
  const now = Date.now();
  d.durak = durakToplami(d, now, j);
  d.son = now;
  yaz(f, d);
}

// "Her şey gerçekten bitti mi?" — `Stop` bu soruyu cevaplamıyor. Ana oturumun turu
// bitmiş olabilir ama arka planda ajanlar sürüyordur; kullanıcının ekranında sol taraftaki
// nokta hâlâ yanıp söner ve "2 running tasks" yazar. Makbuz o anda basılırsa yalan söyler,
// ses o anda çalarsa duran bir şey yokken "durdu" der.
//
// Ölçülebilir cevap `_running.json` içinde: `SubagentStart` kaydı ekliyor, `SubagentStop`
// siliyor, statusline zaten oradan okuyor. Liste boşsa açık ajan yoktur.
//
// BAYAT_CALISAN: ajan çökerse kaydı silinmez ve makbuz sonsuza kadar ertelenir. Bu yüzden
// kayıt yaşı da ölçülür — iki saati aşan kayıt ölü sayılır ve ertelemeyi tutmaz. Yanlış
// zamanlı makbuz kötüdür, hiç gelmeyen makbuz daha kötüdür.
const BAYAT_CALISAN = 2 * 60 * 60 * 1000;

function acikIsVar(iz) {
  const l = read(path.join(iz, CALISAN));
  if (!Array.isArray(l) || !l.length) return 0;
  const simdi = Date.now();
  return l.filter((x) => simdi - (Number(x && x.start) || 0) < BAYAT_CALISAN).length;
}

function turBitir(j, root) {
  const f = turYolu(j);
  const d = read(f);
  if (!d || !d.t) return;
  const now = Date.now();
  const sn =
    (d.sn0 || 0) + Math.max(0, Math.round((now - d.t - durakToplami(d, now, null)) / 1000));
  const iz = turIzi(j, root);
  const ana = Math.max(0, transkriptBoyu(j.transcript_path) - (d.boyAna || 0));
  const alt = Math.max(0, altTranskript(iz) - (d.boyAlt || 0));
  // Arka planda ajan varken tur bitmiş sayılmaz. Kullanıcının ekranında nokta hâlâ yanıp
  // söner ve "N running tasks" yazar; o anda basılan makbuz yalan söyler. Ölçü ertelenir,
  // damga korunur, süre ve token bir sonraki kapanışa birikir.
  //
  // ÖNEMLİ: damga dosyası yalnız **gerçekten basılan** dalda silinir. Erteleme dalında
  // silinirse ertelenen turun süresi ve token tabanı kaybolur — eski `bekleyen`
  // mekanizmasının kırıldığı yer buydu (fable, 23.08.2026).
  if (acikIsVar(iz)) {
    yaz(f, {
      t: now,
      son: now,
      durak: 0,
      sn0: sn,
      boyAna: d.boyAna || 0,
      boyAlt: d.boyAlt || 0,
      bekleyen: 1,
    });
    return;
  }
  try {
    fs.unlinkSync(f);
  } catch {}
  bitisSesi(j);
  turOzetiBas(ceviri('turOzeti', sureMetni(sn), tokenMetni(ana), tokenMetni(alt)), iz);
}

// Bitiş sesi `Stop` olayına değil, makbuzun basıldığı yere bağlıdır. `Stop` bir turda
// birden çok kez gelir — model soru sorup durduğunda, engelli kapanışta, alt ajan
// dönüşünde. Makbuz o ara duraklarda bilerek basılmaz (yukarıdaki erken dönüş); ses de
// basılmamalı. İkisi tek karardan beslenince "işin gerçekten bitti" sinyali tek olur.
//
// Ayrı süreç: `Media.SoundPlayer.PlaySync()` çalma boyunca (0,4 s) bloklar, kanca o
// kadar bekleyemez. Süreç `detached` doğar, `unref` ile bırakılır, turu tutmaz.
// `duyur` seviye 1 istiyor, ses istemiyor — yönlendirme kapalıyken de duyulur.
function bitisSesi(j) {
  try {
    const { spawn } = require('child_process');
    const c = spawn(process.execPath, [path.join(__dirname, 'beep.js')], {
      detached: true,
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true,
    });
    c.on('error', () => {});
    c.stdin.on('error', () => {});
    c.stdin.end(
      JSON.stringify({
        hook_event_name: 'Stop',
        cwd: j.cwd,
        session_id: j.session_id,
      })
    );
    c.unref();
  } catch {}
}

// Makbuz akışa basılmaz, **statusline'a yazılır.** Üç kanal denendi ve ikisi kapalı:
//
//   'model'     → `additionalContext`. Önek yok ama `Stop` cevap yazıldıktan sonra
//                 çalışıyor; modelin elindeki tek yol yeni bir mesaj yazmak ve
//                 "cevabının en altına yaz" talimatını doğru anlayan model cevabı
//                 yeniden üretiyor. Üç turun üçünde de tekrarladı (ölçüldü 23.08.2026).
//   'kullanici' → `systemMessage`. Render katmanı satırı
//                 `[hookName, " says: ", content]` olarak kuruyor ve `hookName` olay
//                 adından geliyor — konfigden değil, komut adından değil. Yani
//                 **`Stop says:` öneki hiçbir ayarla kaldırılamıyor.** Kullanıcı o
//                 metni istemiyor; kanal bu yüzden kapandı (ölçüldü 23.08.2026).
//   'statusline'→ Bizim kendi betiğimiz, önek üretmiyor. Seçilen yol.
//
// Bölüşme nettir: **`turBitir` hesaplar, statusline yalnız gösterir.** İki yerde hesap,
// iki farklı sayı demektir. Kanca satırı hazır metin olarak `_makbuz.json` dosyasına
// yazar; betik okur ve basar, tek bir toplama bile yapmaz.
const MAKBUZ = '_makbuz.json';

function turOzetiBas(satir, iz) {
  if (!iz) return;
  try {
    fs.mkdirSync(iz, { recursive: true });
    yaz(path.join(iz, MAKBUZ), { metin: satir, ts: Date.now() });
  } catch {}
}

function tokenMetni(bayt) {
  const t = Math.round(bayt / 4);
  return t >= 1000 ? Math.round(t / 1000) + 'k' : String(t);
}

function sureMetni(sn) {
  return sn < 60 ? ceviri('turSuresi', 0, sn) : ceviri('turSuresi', Math.floor(sn / 60), sn % 60);
}

const CALISAN = '_running.json';

function calisanEkle(live, j) {
  const f = path.join(live, CALISAN);
  const l = read(f) || [];
  const t = j.tool_input || {};
  l.push({
    type: t.subagent_type || '?',
    desc: String(t.description || '').slice(0, 60),
    model: t.model || null,
    start: Date.now(),
  });
  yaz(f, l);
  return l.length;
}

// Stop olayını başlangıç kaydına bağlayan bir kimlik alanı yok; eşleştirme tipten
// yapılıyor. Aynı tipten birden çok ajan açıksa hangisinin bittiği bilinemez —
// o durumda süre uydurulmaz, `ambiguous` döner. Yanlış süre, süresizlikten kötüdür.
function calisanKapat(live, type) {
  const f = path.join(live, CALISAN);
  const l = read(f);
  if (!Array.isArray(l) || !l.length) return null;
  const ayni = type ? l.filter((x) => x.type === type).length : 0;
  let i = type ? l.findIndex((x) => x.type === type) : -1;
  if (i < 0) i = 0;
  const [c] = l.splice(i, 1);
  yaz(f, l);
  if (!c) return null;
  return ayni > 1 ? { ...c, ambiguous: true } : c;
}

// Kullanıcı ajanların içini göremez. Base'in devreye girdiği her anı tek satır
// bildiririz: görev verildi, ajan bitti, oturum açıldı.
// Seviye `~/.claude/teknesyum.json` içindeki `steering` alanından okunur:
// 0 hiç yazma · 1 temel yönlenmeler (varsayılan) · 2 her dokunuş.
// TEKNESYUM_SESSIZ=1 eski davranış için 0'a eşdeğerdir.
let _seviye = null;

function seviye() {
  if (_seviye !== null) return _seviye;
  if (process.env.TEKNESYUM_SESSIZ) return (_seviye = 0);
  const e = process.env.TEKNESYUM_STEERING;
  if (e !== undefined && e !== '') {
    const n = parseInt(e, 10);
    if (n === 0 || n === 1 || n === 2) return (_seviye = n);
  }
  const kok = konfigKok();
  const c = read(path.join(kok, 'teknesyum.json'));
  const v = c && c.steering;
  return (_seviye = v === 0 || v === 2 ? v : 1);
}

// ÖLÇÜLDÜ (22.08.2026): `systemMessage` satırının başındaki `PreToolUse:Agent says: `
// öneki kaldırılamıyor. Claude Code 2.1.237 render katmanı satırı
// `jsxs(Cg, { children: [Co.hookName, " says: ", Co.content] })` olarak kuruyor ve
// `hookName` runtime'da üretiliyor, konfigden gelmiyor. Önek kabul edildi; geriye
// satırın kendisinin düzgün görünmesi kalıyor. İçeriği yeni satırla başlatmak öneki
// kendi satırında bırakır — ama render'ın baştaki `\n` kırpıp kırpmadığı ölçülmedi.
// Bu yüzden iki biçim de üretilebilir, seçim tek sabitte:
//   'blok'  → içerik yeni satırla başlar, önek üstte tek başına kalır
//   'satir' → içerik önekle aynı satırda kalır (2.39.0'a kadarki davranış)
//
// ÖLÇÜLDÜ (23.08.2026, kullanıcı ekran görüntüsü): `'blok'` öneki kendi satırında
// bırakmıyor, **iki kez** bastırıyor — render hem kutu başlığına hem içeriğin önüne
// `Stop says:` koyuyor. Yukarıdaki "ölçülmedi" notunun cevabı budur. `'satir'` tek
// satır veriyor ve önek altı karakterle sınırlı kalıyor.
const BILDIRIM_BICIMI = 'satir';

const _duyuru = [];

// Kanalın adı olayın adıdır ve render katmanı `<olay> says:` önekini oradan kuruyor —
// `Stop says:`, `PreToolUse:Agent says:`. Önek hiçbir ayarla kaldırılamıyor (ölçüldü,
// 23.08.2026) ve kullanıcı o metni istemiyor.
//
// Makbuz statusline'a taşındı ama yönlendirme satırları burada kalmıştı. Onların çözümü
// ayrı: bu olayların **hepsi tur içinde** ateşleniyor — `PreToolUse`, `PostToolUse`,
// `SubagentStart/Stop`, `SessionStart`. Yani satır modele **cevap yazılmadan önce**
// ulaşıyor ve model onu kendi cevabının içine basabiliyor; önek doğmuyor.
//
// `Stop`'ta bu yol kapalıydı ve sebebi başkaydı: `Stop` cevap yazıldıktan sonra çalışır,
// modelin elindeki tek yol yeni bir mesaj yazmaktır, o da cevabı tekrarlatır. Tur içi
// olaylarda o risk yok.
function duyur(mesaj, min, tam) {
  if (seviye() < (min || 1)) return;
  _duyuru.push(tam ? mesaj : 'Teknesyum ▸ ' + mesaj);
  const govde = _duyuru.join('\n');
  if (_olay === 'Stop' || _olay === 'StopFailure') {
    ciktiEkle({ systemMessage: BILDIRIM_BICIMI === 'blok' ? '\n' + govde : govde });
    return;
  }
  ciktiEkle({
    hookSpecificOutput: {
      hookEventName: _olay || 'PostToolUse',
      additionalContext: ceviri('yonlendirmeYonerge', govde),
    },
  });
}

// Ajan açılmayan oturumda eklenti baştan sona sessizdi: kullanıcı devrede olup olmadığını
// göremiyordu. Ölçüyü model yapar, ama ölçüldüğünü söylemesi artık zorunlu.
// Üst klasörde açılan oturumda hafızayı turun sonunda ait olduğu projeye taşırız.
// Çıktı yazmaz: `Stop` olayında karar bloğuyla aynı akışa iki JSON yazmak çıktıyı bozar.
function kapsayiciTopla(kap, durum) {
  const p = kapsayici.etkin(durum);
  if (p) kapsayici.tasi(kap, p.yol);
}

function hatirlat(j, root, etkinProje) {
  // Kayıt, röle ve harita oturumun açıldığı klasörü değil projeyi bekliyor; modele
  // hangi projede olduğunu söylemezsek `--proje` parametresini boş geçer. Bu satır
  // ölçü hatırlatması susmuş olsa da yazılır.
  const kapMetin = etkinProje ? ceviri('kapsayiciEtkin', etkinProje.ad, etkinProje.yol) : '';
  if (seviye() === 0) return kapEkle(kapMetin);
  // ÖLÇÜLDÜ: metin her istekte ~90 token yazıyordu ve geçmişte kalıcı. 60 mesajlık
  // oturumda 5000+ token, hepsi aynı cümlenin kopyası. Kural bir kez okunduğunda
  // geçmişte duruyor; ikinci kopyası bilgi taşımıyor. İlk iki istekte yazılır.
  // ÖLÇÜLDÜ (22.08.2026): eco profilinde tavan 1, metinler kısa sürümleriyle ve fark
  // satırları olmadan gidiyor. Oturum başına enjeksiyon 1286 karakterden 778'e iniyor;
  // steering 2 ayarlıyken 2450 karakterden yine 778'e.
  const eko = profil() === 'eco';
  if (sayacGecti(j, eko ? 1 : 2)) return kapEkle(kapMetin);
  let metin =
    (kapMetin ? kapMetin + ' ' : '') +
    ceviri(eko ? 'olcuKisa' : 'olcu') +
    ' ' +
    ceviri(eko ? 'dilTalimatiKisa' : 'dilTalimati');
  if (premium()) metin += ' ' + ceviri('premiumNotu');
  else if (eko) metin += ' ' + ceviri('ecoNotu');
  const sapma = sapmaSatiri(profil());
  if (sapma) metin += ' ' + ceviri('dugmeSapma', sapma);
  // Dördüncü tura girmiş ve denetimi hâlâ geçmemiş sözleşme varsa görüş hatırlatılır.
  // Bloklamaz; §1.5.1 madde 2'nin ölçülebilir yarısı budur.
  if (root) {
    const g = gorusGerekenler(root);
    if (g.length) metin += ' ' + ceviri('gorusHatirlat', g.map((x) => x.id + ' (tur ' + x.tur + ')').join(', '));
  }
  const rota = yeniIsRotasi(root, j.prompt);
  if (rota) metin += ' ' + rota;
  if (platformNotuYok(j.cwd)) metin += ' ' + ceviri('platformNotu');
  if (yeniProjeIstegi(j)) metin += ' ' + ceviri('onArastirmaHatirlatma');
  // Seviye 2'de kullanıcı her dokunuşu görmek istiyor: base olmasaydı olmayacak her
  // kararın kendi satırı olur. Biçim relay SKILL 7.2'de.
  if (!eko && seviye() === 2) metin += ' ' + ceviri('seviye2');
  baglamEkle(metin);
}

// Kullanıcı "puşla" diyor, `/pusla` yazmıyor. İki depoyu birden göndermek modelin o anki
// hatırlamasına bırakılırsa er geç unutulur ve unutulduğu tur fark edilmez — kişisel
// dosyanın yedeklenmediği, makine değişince anlaşılır. Deterministik araç modelden önce
// gelir: kelime geçtiğinde akış hatırlatılır.
//
// Ayna kurulu değilse hiç yazılmaz. Eklentiyi kuran başkasının istemini benim iş akışımla
// kirletmeyiz; `/ozel kur` çalıştırılmadan bu satır hiç doğmaz.
// Üç yazım da aynı sözdür: `puşla`, `pusla`, `pushla`. Klavye şapkasız olduğunda ikisi
// birden çıkıyor ve hangisinin yazıldığı kullanıcının umurunda değil; tetikleyici de
// ayırmamalı. `h` isteğe bağlı, çünkü "pushla" İngilizce push'un Türkçe çekimi.
const PUSLA_SOZU = /(^|[^a-zçğıöşü])pu[şs]h?la/i;

function puslaHatirlat(j) {
  const p = String(j.prompt || '');
  if (/^[ ]*\//.test(p)) return;
  if (!PUSLA_SOZU.test(p)) return;
  try {
    if (!fs.existsSync(path.join(konfigKok(), 'teknesyum-ozel.json'))) return;
  } catch {
    return;
  }
  baglamEkle(ceviri('puslaAkisi', path.join(__dirname, '..', 'scripts', 'ozel.js')));
}

// `ciktiEkle` alanı olduğu gibi değiştiriyor: aynı turda iki ayrı çağrı yapılırsa ikincisi
// birincinin metnini siliyor ve silinen taraf sessizce kayboluyor. Bağlam tek alan olduğu
// için birleştirilerek yazılır.
function baglamEkle(metin) {
  if (!metin) return;
  const o = (_cikti && _cikti.hookSpecificOutput) || {};
  const onceki = o.hookEventName === 'UserPromptSubmit' ? o.additionalContext || '' : '';
  ciktiEkle({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: onceki ? onceki + ' ' + metin : metin,
    },
  });
}

function kapEkle(metin) {
  return baglamEkle(metin);
}

// Oturum başına kaç kez yazdığımızı sayar. Sayaç dosyası oturuma özel; `supur()`
// bir günü geçenleri zaten atıyor.
//
function sayacGecti(j, tavan) {
  const id = safe((j && j.session_id) || 'oturum');
  const dosya = path.join(genelKok(), id + '.hatirlatma');
  const p = profil();
  let n = 0;
  try {
    const [eski, sayi] = String(fs.readFileSync(dosya, 'utf8')).trim().split(' ');
    if (eski === p) n = parseInt(sayi, 10) || 0;
  } catch {}
  if (n >= (tavan || 2)) return true;
  try {
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    fs.writeFileSync(dosya, p + ' ' + (n + 1));
  } catch {}
  return false;
}

// Ölçüldü: kural multi-session.md §5'te yazılıydı ve yine de sohbete 120 satırlık paket
// basıldı. Yazılı kural yeterli değilse kapıya bekçi konur — devrin iki yönü de dosyayla
// yürür, sohbete yalnızca işaretçi çıkar. Normal kod bloğu dokunulmaz.
const PAKET_BASLIK = /^#{1,3}[ \t]*(GÖREV|GOREV|TASK)\b/im;
const PAKET_ALAN = /^[ \t]*(Depo|Repo|Yığın|Yigin|Stack|Kabuk|Shell)[ \t]*:/im;
const RAPOR_BASLIK = /^#{1,3}[ \t]*(RAPOR|REPORT)\b|^[ \t]*(Rapor|Report)[ \t]*:/im;
const KOPYA_EMRI =
  /(kopyala|kopyalay|yapıştır|yapistir|copy (this|the|everything)|paste (this|it|the))/i;
const TAVAN = 25;

function paketDenetle(j, root) {
  const govde = j.stop_hook_active ? '' : sonMesaj(j.transcript_path);
  if (!govde) return { govde: '', engel: '' };
  const engel = devirIhlali(govde) || donusEksik(root, govde) || sendenEksik(root, govde);
  if (engel) ciktiEkle({ decision: 'block', reason: engel });
  return { govde, engel: engel || '' };
}

// ÖLÇÜLDÜ: tavan vardı, taban yoktu. Uzun bloğu engelliyorduk ama işini bitiren işçi
// hiçbir şey vermeden susabiliyordu — patron oturumuna taşınacak tek satır çıkmıyordu.
// Açık bir paket/sözleşme varken bitiş bildiren mesaj, dönüş bloğu olmadan kapanmaz.
const BITIS =
  /(tamamland|bitti|kapand|geçti|gecti|teslim ed|tüm kabul|tum kabul|karşıland|karsiland|hazır|hazir|all (tests|checks) pass|is (done|complete))/i;
const DONUS_ALAN = /^[ \t]*(rapor|report)[ \t]*:/im;

function donusEksik(root, govde) {
  if (!root || !acikIs(root)) return;
  if (!BITIS.test(govde.slice(-1500))) return;
  for (const { govde: blok } of bloklar(govde)) if (DONUS_ALAN.test(blok)) return;
  return ceviri('donusEksik');
}

// ÖLÇÜLDÜ: iş oturum limitinde yarıda kaldı, dönüş bloğu yazıldı ama kullanıcı "ne
// yapmam gerekiyor" sorusunun cevabını bulamadı. İş duruyorsa duruşun bedeli
// kullanıcıya düşer; ne zaman, hangi metinle sürdüreceği yazılmadan kapanılmaz.
const DURAKLAMA =
  /(oturum limiti|kullanım limiti|kullanim limiti|usage limit|limite takıl|limite takil|durdurdum|yarıda kal|yarida kal|devam edilecek|kaldığı yerden|kaldigi yerden|limit dön|limit don|resets? (at|on)|rate limit)/i;
const SENDEN_ALAN = /^[ \t#*]*(senden|needed|from you|senden istediklerim)[ \t]*:?/im;

// ÖLÇÜLDÜ (22.08.2026): kapı yalnız duraklamada ve yalnız açık sözleşme varken
// duruyordu. Kullanıcıdan iş isteyen ama duraklamayan turlar hiç yakalanmadı —
// kural yazılıydı, dört tur üst üste unutuldu ve kullanıcı fark etti. Kalıp listesi
// kasten dar: yanlış pozitif bir turu yakar, yanlış negatifi kullanıcı görür.
const ISTEK =
  /(yeniden başlat|yeniden baslat|kapatıp aç|kapatip ac|restart|onayla|onayını|onayini|kararını (yaz|ver)|karar ver|hangisini seç|hangisini sec|sen (yap|aç|ac|çalıştır|calistir|seç|sec)\b)/i;

function sendenEksik(root, govde) {
  const son = govde.slice(-1500);
  if (!ISTEK.test(son) && !(root && acikIs(root) && DURAKLAMA.test(son))) return;
  if (SENDEN_ALAN.test(govde)) return;
  return ceviri('sendenEksik');
}

// ÖLÇÜLDÜ: ön araştırma kapısı yalnız ilk sözleşme dosyasında duruyordu. İki proje
// "plan yap, işe girişme" diye başladı, sözleşme hiç yazılmadı ve 10+ depo taraması
// atlandı. Araştırma plandan önce gelir; niyet cümlesinde hatırlatılır.
const YENI_PROJE =
  /(yeni bir? proje|sıfırdan|sifirdan|diye bir klasör|klasör oluştur|proje başlat|alt yapı oluştur|altyapı oluştur|uygulama yapa(cağız|lım)|program yapa(cağız|lım)|new project|from scratch|greenfield)/i;

function yeniProjeIstegi(j) {
  if (!YENI_PROJE.test(String(j.prompt || ''))) return false;
  try {
    return !fs.existsSync(path.join(path.resolve(j.cwd || '.'), 'docs', 'taramalar'));
  } catch {
    return false;
  }
}

// Proje hangi platformlar için yazılıyor? Not yoksa model uygun bir anda tek soru sorar.
// Kanca yalnız gerçek bir proje kökünde konuşur — geçici klasörde soru sordurmak gürültüdür.
function platformNotuYok(cwd) {
  const kok = path.resolve(cwd || '.');
  try {
    if (!fs.existsSync(path.join(kok, '.git'))) return false;
  } catch {
    return false;
  }
  const c = read(path.join(kok, '.claude', 'teknesyum.json'));
  return !(c && c.platformlar);
}

function acikIs(root) {
  return acikSozlesmeler(root).some((s) => s.durum === 'active' || s.durum === 'submitted');
}

// §1.5.1 madde 2 — "bir hata üç turdur çözülmedi ve kök neden hâlâ belirsiz" — dokuz
// tetikleyicinin **kancadan görülebilen** olanı. Liste yazılıydı ama kimse ölçmüyordu:
// tetikleyici bir kancanın değil modelin dikkatinin üstünde duruyordu ve beş tur boyunca
// hiç ateşlenmedi (docs/openlogs/HATA-ikinci-gorus-tetiklenmiyor.md).
//
// Sözleşme `round` ve `audit` alanlarını zaten taşıyor; okumak yeni bir mekanizma
// gerektirmiyor. Uyarı **bloklamaz** — modelin dikkatini çeker, kararı ona bırakır.
function gorusGerekenler(root) {
  const dir = path.join(root, 'contracts');
  const cikan = [];
  for (const f of dosyalar(dir)) {
    if (!/^[A-Z]+[0-9]+\.md$/i.test(f)) continue;
    const g = (metin(path.join(dir, f)) || '').slice(0, 1500);
    const durum = (g.match(/^status:[ \t]*(\w+)/im) || [])[1];
    if (!durum || durum.toLowerCase() === 'done') continue;
    const tur = parseInt((g.match(/^round:[ \t]*(\d+)/im) || [])[1] || '0', 10);
    const denetim = ((g.match(/^audit:[ \t]*(.+)$/im) || [])[1] || '').trim().toLowerCase();
    if (tur >= 3 && denetim !== 'passed') cikan.push({ id: f.slice(0, -3), tur });
  }
  return cikan;
}

// Ölçü 3 — "advisor her açıldığında kayda satır düşsün". Kayıt olmadan "kaç kez
// ateşlendi" sorusu ölçülemez ve tetiklenmeyen tetikleyici bir daha görünmez
// (docs/openlogs/HATA-ikinci-gorus-tetiklenmiyor.md §5.3).
//
// Satırın taşıdığı asıl bilgi `bekleyen` alanıdır: görüş açıldığı anda dördüncü turda
// bekleyen sözleşme **var mıydı**. Varsa ve görüş o turda açıldıysa tetikleyici çalıştı;
// tur tur birikince "kullanıcı sorunca mı açılıyor" sorusu dosyadan cevaplanır.
function gorusKaydet(root, t) {
  if (!root) return;
  try {
    const bekleyen = gorusGerekenler(root)
      .map((x) => x.id)
      .join(',');
    const satir =
      new Date().toISOString().slice(0, 16).replace('T', ' ') +
      ' | advisor | ' +
      (String(t.description || '—').slice(0, 60) || '—') +
      ' | bekleyen: ' +
      (bekleyen || '—') +
      '\n';
    fs.appendFileSync(path.join(root, 'GORUS.md'), satir);
  } catch {}
}

function acikSozlesmeler(root) {
  const dir = path.join(root, 'contracts');
  return dosyalar(dir)
    .filter((f) => /^T[^/]+\.md$/i.test(f))
    .map((f) => {
      const govde = metin(path.join(dir, f));
      const d = (govde || '').slice(0, 1200).match(/^status:[ \t]*(open|active|submitted)/im);
      if (!d) return null;
      const owns = (govde.match(/^owns:[ \t]*\[([^\]]*)\]/im) || [])[1] || '';
      const title = (govde.match(/^title:[ \t]*(.+)$/im) || [])[1] || f.slice(0, -3);
      return {
        id: f.slice(0, -3),
        durum: d[1].toLowerCase(),
        title: title.trim(),
        owns: owns
          .split(',')
          .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean),
      };
    })
    .filter(Boolean);
}

function yeniIsRotasi(root, prompt) {
  if (!root || !prompt) return '';
  const acik = acikSozlesmeler(root);
  if (!acik.length) return '';
  const istek = String(prompt);
  const eslesen = acik.filter((s) => s.owns.some((o) => o && istek.includes(o)));
  if (eslesen.length > 1) {
    return ceviri('rotaCakisma', eslesen.map((x) => x.id).join(', '));
  }
  if (eslesen.length === 1) return ceviri('rotaEslesme', eslesen[0].id);
  return ceviri('rotaYeni');
}

// Sohbete basılan uzun blokları arar: üç tırnaklı kod bloğu ve `---` ile ayrılmış bölge.
function bloklar(metin) {
  const out = [];
  const kod = /```[\s\S]*?```/g;
  let m;
  while ((m = kod.exec(metin))) out.push({ govde: m[0], bas: m.index });
  const cizgi = /^-{3,}[ \t]*$/gm;
  const yer = [];
  while ((m = cizgi.exec(metin))) yer.push(m.index);
  for (let i = 0; i + 1 < yer.length; i++) {
    out.push({ govde: metin.slice(yer[i], yer[i + 1]), bas: yer[i] });
  }
  return out;
}

function devirIhlali(metin) {
  for (const { govde: blok, bas } of bloklar(metin)) {
    if (blok.split('\n').length < TAVAN) continue;
    // Kopyalama emri bloğun hemen öncesinde aranır. Metnin herhangi bir yerinde arayınca
    // `---` ayraç kullanan uzun ama masum cevaplar da engelleniyordu.
    const kopya = KOPYA_EMRI.test(metin.slice(Math.max(0, bas - 400), bas));

    if (PAKET_BASLIK.test(blok) && PAKET_ALAN.test(blok)) {
      return ceviri('paketSohbete');
    }

    if (RAPOR_BASLIK.test(blok)) {
      return ceviri('raporSohbete');
    }

    if (kopya) {
      return ceviri('kopyaIsteme');
    }
  }
}

function sonMesaj(tp) {
  if (!tp) return null;
  let ham;
  try {
    const fd = fs.openSync(tp, 'r');
    const boy = fs.fstatSync(fd).size;
    const bas = Math.max(0, boy - 262144);
    const buf = Buffer.alloc(boy - bas);
    fs.readSync(fd, buf, 0, buf.length, bas);
    fs.closeSync(fd);
    ham = buf.toString('utf8');
  } catch {
    return null;
  }
  const satir = ham.split('\n').filter(Boolean);
  for (let i = satir.length - 1; i >= 0; i--) {
    let o;
    try {
      o = JSON.parse(satir[i]);
    } catch {
      continue;
    }
    if (!o.message || o.message.role !== 'assistant') continue;
    const ic = o.message.content;
    if (typeof ic === 'string') return ic;
    if (Array.isArray(ic)) {
      const t = ic
        .filter((p) => p && p.type === 'text')
        .map((p) => p.text)
        .join('\n');
      if (t) return t;
    }
  }
  return null;
}

function gecen(start) {
  const sn = Math.max(0, Math.round((Date.now() - start) / 1000));
  return sn < 60 ? ceviri('saniye', sn) : ceviri('dakika', Math.round(sn / 60));
}

// Worktree açan oturum kapanırken kopyayı bırakıyor; 31 tanesi 20 MB etti. Kanca budama
// yapmaz — silmek kullanıcının kararı — ama biriktiğini açılışta bir kez söyler.
function worktreeSayisi(proje) {
  try {
    return fs
      .readdirSync(path.join(proje, '.claude', 'worktrees'), { withFileTypes: true })
      .filter((e) => e.isDirectory()).length;
  } catch {
    return 0;
  }
}

// stdout tek JSON taşır — açılışta söylenecek her şey tek satırda birleşir.
// Uzak denetimden ya da başka bir pencereden yürüyen iş yarım kalıyor: `/save`
// çalışmadığı için yeni sohbet önceki oturumun varlığından habersiz açılıyordu.
// Sözleşme açıkken önceki oturumun transkripti duruyorsa devralınacağını söyleriz.
function oncekiOturum(proje, simdiki) {
  const dizin = transkriptDizini(proje);
  let l = [];
  try {
    l = fs.readdirSync(dizin);
  } catch {
    return null;
  }
  let enYeni = 0;
  for (const f of l) {
    if (!f.endsWith('.jsonl') || f.slice(0, -6) === simdiki) continue;
    try {
      const t = fs.statSync(path.join(dizin, f)).mtimeMs;
      if (t > enYeni) enYeni = t;
    } catch {}
  }
  if (!enYeni) return null;
  const dk = Math.round((Date.now() - enYeni) / 60000);
  if (dk > 7 * 24 * 60) return null;
  return dk < 90 ? ceviri('dakikaOnce', dk) : ceviri('saatOnce', Math.round(dk / 60));
}

// Açık hata günlüğü sayısı. Günlükler iki yerde durabilir — makine geneli makara ve
// Teknesyum Base deposu — ama açılışta yalnız sayı gerekiyor; `log.js`'i ayrı süreç
// olarak çağırmak açılışa yüz milisaniye eklerdi, dizin okumak bedava.
function acikGunlukSayisi(cwd) {
  let n = 0;
  const say = (d) => {
    try {
      n += fs.readdirSync(d).filter((f) => f.startsWith('HATA-') && f.endsWith('.md')).length;
    } catch {}
  };
  say(path.join(konfigKok(), 'teknesyum', 'openlogs'));
  // Proje kökü kancaya girdiden gelir; `process.cwd()` kancanın çalıştırıldığı yer olup
  // proje olmak zorunda değil ve başka bir projenin günlüklerini sayardı.
  if (cwd) say(path.join(cwd, 'docs', 'openlogs'));
  return n;
}

function acilis(root, kapNotu, oturumId, cwd) {
  const parca = [];
  if (kapNotu) parca.push(kapNotu);
  if (kurulumEksik()) parca.push(ceviri('kurulumEksik'));
  if (premium()) parca.push(ceviri('premiumAcik'));
  if (root) {
    const acik = say(path.join(root, 'contracts'));
    const biten = say(path.join(root, 'contracts', 'done'));
    if (!acik && !biten) parca.push(ceviri('roleSozlesmeYok'));
    else parca.push(ceviri('roleDurum', biten, acik + biten, acik));
    if (acik) {
      const once = oncekiOturum(path.dirname(path.dirname(root)), oturumId);
      if (once) parca.push(ceviri('oncekiOturumVar', once));
    }
    const w = worktreeSayisi(path.dirname(path.dirname(root)));
    if (w) parca.push(ceviri('worktreeBirikim', w));
    const n = sorunSayisi(izYolu(root));
    if (n) parca.push(ceviri('sorunBirikim', n));
  }
  const gunluk = acikGunlukSayisi(cwd);
  if (gunluk) parca.push(ceviri('acikGunluk', gunluk));
  // Bildirme yordamı oturum başına bir kez ve her projede yazılır. İstek başına yazılsaydı
  // aynı cümle otuz kez tekrarlanırdı; hiç yazılmasaydı başka projedeki oturum bozuk
  // davranışı görüp yalnız o sohbette anlatır, kayıt hiç doğmazdı.
  //
  // Seviye 0 "base sessizce çalışsın" demek ve bu, modele giden metni de kapsar: sessiz
  // kip isteyen kullanıcı enjeksiyon da istemiyor.
  if (seviye() >= 1)
    ciktiEkle({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext:
          ceviri('gunlukProseduru') + (gunluk ? ' ' + ceviri('acikGunluk', gunluk) : ''),
      },
    });
  if (parca.length) duyur(parca.join('   ·   '));
  const g = guncellemeBak();
  if (g) duyur(ceviri('guncellemeVar', g.uzak, g.kurulu));
}

// Eklenti kendi güncellemesini haber vermiyordu: kullanıcı yeni sürüm çıktığını ancak
// elle bakarsa öğreniyordu. Açılışta günde bir kez sorulur.
//
// Damga ağ çağrısından ÖNCE yazılır. Sonra yazılsaydı ağ yokken her oturum zaman
// aşımını baştan öderdi; açılış kullanıcının beklediği yer. Kaybedilen şey bir günlük
// gecikme, kazanılan şey ağsız makinede sıfır bekleme.
//
// Ağ yoksa, git yoksa, depo erişilemezse hiçbir şey yazılmaz. Uyarının yokluğu
// "güncelsin" demek değil; bunu her açılışta söylemek bilgi değil gürültü olur.
const SURUM_DAMGA = '_surum';
const SURUM_ARA = 24 * 60 * 60 * 1000;

function guncellemeBak() {
  const damga = path.join(genelKok(), SURUM_DAMGA);
  try {
    if (Date.now() - fs.statSync(damga).mtimeMs < SURUM_ARA) return null;
  } catch {}
  try {
    fs.mkdirSync(path.dirname(damga), { recursive: true });
    fs.writeFileSync(damga, '');
  } catch {}
  try {
    const d = require('../scripts/surum.js').durum();
    return d.yeni ? d : null;
  } catch {
    return null;
  }
}

// Alt ajanın yaşadığı aksaklık kullanıcıya ekran görüntüsüyle ulaşmamalı. Araç
// başarısızlıkları `_sorun.log`'a düşer; açılışta biriken varsa kaç tane olduğunu
// söyleriz ki model dosyayı açıp sebebi görsün.
function sorunSayisi(live) {
  try {
    return fs.readFileSync(path.join(live, '_sorun.log'), 'utf8').split('\n').filter(Boolean)
      .length;
  } catch {
    return 0;
  }
}

function sorunYaz(live, satir) {
  try {
    fs.mkdirSync(live, { recursive: true });
    fs.appendFileSync(
      path.join(live, '_sorun.log'),
      new Date().toISOString().replace('T', ' ').slice(0, 19) + ' | ' + satir + '\n'
    );
  } catch {}
}

// Plugin kendini kuramaz: statusline kullanıcının settings.json'ına yazılır. Eksikse
// oturum açılışında bir kez söyleriz — kullanıcının komut ezberlemesini bekleme.
function kurulumEksik() {
  const kok = konfigKok();
  if (!fs.existsSync(path.join(kok, 'teknesyum-statusline.js'))) return true;
  const s = read(path.join(kok, 'settings.json'));
  return !(s && s.statusLine && /teknesyum-statusline/.test(String(s.statusLine.command || '')));
}

function say(dir) {
  try {
    return fs.readdirSync(dir).filter((f) => /\.md$/i.test(f)).length;
  } catch {
    return 0;
  }
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
    yaz(hedef, h);
  } else if (g && !h) {
    // ÖLÇÜLDÜ (aee32fa5b45ba552b): geçici dosya olduğu gibi kopyalanınca önceki ajanın
    // `ended`/`stop_reason`/`last_word` alanları yeni ajana geçti; kayıtta `ended`
    // `started`'dan ÖNCE göründü. Birleştirme yalnızca iş alanlarını taşır, yaşam
    // döngüsü alanlarını asla.
    yaz(hedef, {
      steps: g.steps || 0,
      contract: g.contract || null,
      last_action: g.last_action || '—',
      files: g.files || [],
    });
  }
  try {
    fs.unlinkSync(gf);
  } catch {}
}

// Oturum uygulamadan açılıyor; kabuk yok, ortam değişkeni geçmiyor. Bu yüzden bayrak
// ayar dosyasından da okunur: `~/.claude/teknesyum.json` içinde `"debug": true`.
// Ortam değişkeni terminalden açan için duruyor, ikisinden biri yeter.
let _debug = null;
function debugAcik() {
  if (_debug !== null) return _debug;
  if (process.env.TEKNESYUM_DEBUG) return (_debug = true);
  const kok = konfigKok();
  const c = read(path.join(kok, 'teknesyum.json'));
  return (_debug = !!(c && c.debug));
}

function iz(live, j) {
  const f = path.join(live, '_hook-debug.json');
  const d = read(f) || {
    toplam: 0,
    ajanli: 0,
    olaylar: {},
    ilk: null,
    son: null,
    ornek_alanlar: null,
  };
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
  yaz(f, d);
  izSatiri(live, j, ev, now);
}

// Sayaç "hook ateşledi mi" sorusunu cevaplıyor ama "ajan neden yarım kesildi"
// sorusunu cevaplamıyor: sıra kayboluyor. Zaman damgalı tek satırlık günlük,
// hangi ajanın hangi olaydan sonra sustuğunu gösterir.
function izSatiri(live, j, ev, now) {
  const kimlik = j.agent_id
    ? 'id:' + j.agent_id
    : transcriptKimligi(j)
      ? 'tr:' + transcriptKimligi(j)
      : '-';
  const alan = [];
  for (const k of Object.keys(j)) {
    const v = j[k];
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) {
      const t = String(v);
      // Uzun metin (transcript, mesaj gövdesi) günlüğü boğar; kısa skalerler yeter.
      if (t.length <= 60) alan.push(k + '=' + t);
    }
  }
  const satir = [now, ev, kimlik, j.tool_name || '', alan.join(' ')].join(' | ') + '\n';
  const f = path.join(live, '_hook-debug.log');
  try {
    fs.appendFileSync(f, satir);
  } catch {
    return;
  }
  izKirp(f);
}

// Günlük röle kurulu projede hiç budanmıyordu ve sonsuza kadar büyüyordu. Tavan bayt
// üzerinden bakılır — tek `statSync`, her yazmada dosyayı okumak pahalı. Aşınca son
// IZ_SATIR satır kalır: kırpılmış dosya tavanın yarısı kadardır, bu da bir sonraki
// kırpmaya kadar bin satırlık pay bırakır — kırpma her yazmada tekrarlamaz.
const IZ_TAVAN = 512 * 1024;
const IZ_SATIR = 1000;

function izKirp(f) {
  let boy = 0;
  try {
    boy = fs.statSync(f).size;
  } catch {
    return;
  }
  if (boy <= IZ_TAVAN) return;
  try {
    const l = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
    fs.writeFileSync(f, l.slice(-IZ_SATIR).join('\n') + '\n');
  } catch {}
}

function izYolu(root) {
  const temel = izKoku(root);
  return _worktree ? path.join(temel, 'worktrees', safe(_worktree)) : temel;
}

// Genel kök makine geneli: hatırlatma sayacı, kapsayıcı durumu ve `kullanim.json`
// buraya düşer. Worktree eki proje içindeki izler içindir; genel köke uygulanırsa
// worktree'de açılan oturum sayacı sıfırdan başlatır, kullanım istatistiğini böler.
function genelKok() {
  return izKoku(path.join(konfigKok(), 'teknesyum'));
}

// Genel kökteki izler kalıcı değil; bir günü geçeni at. Röle kurulu projede de
// çalışır — orada proje `live/` dizini ayrıdır, süpürme ona hiç dokunmaz.
// Süpürme her araç çağrısında bir readdir ve giriş başına bir stat demek; damga
// dosyası bunu saat başına bir kereye indirir.
const SUPUR_DAMGA = '_supur';
const SUPUR_ARA = 60 * 60 * 1000;
// Kullanım sayacı birikimli: süpürülürse özelliğin geçmişi silinir, ölçü kaybolur.
const SUPUR_MUAF = { 'kullanim.json': 1, [SUPUR_DAMGA]: 1 };

function supur() {
  const kok = genelKok();
  const damga = path.join(kok, SUPUR_DAMGA);
  try {
    if (Date.now() - fs.statSync(damga).mtimeMs < SUPUR_ARA) return;
  } catch {}
  let l = [];
  try {
    l = fs.readdirSync(kok);
  } catch {
    return;
  }
  // İzler `last_word` alanında ajan çıktısı taşıyor. Eskiden temizlik 12 klasör
  // birikmeden başlamıyordu; az oturum açan kullanıcıda hiç çalışmıyordu.
  const sinir = Date.now() - 24 * 60 * 60 * 1000;
  for (const d of l) {
    if (SUPUR_MUAF[d]) continue;
    const p = path.join(kok, d);
    try {
      if (fs.statSync(p).mtimeMs < sinir) fs.rmSync(p, { recursive: true, force: true });
    } catch {}
  }
  try {
    fs.writeFileSync(damga, '');
  } catch {}
}

// Sıkışma bağlamı yer: açık sözleşmeler ve rota konumu özetin içinde eriyor, model
// devam ederken neyin açık kaldığını uydurmaya başlıyor. `PostCompact` çıktısı bağlama
// geri enjekte edilir — disiplin yerine süreç.
function sikismaSonrasi(root) {
  if (!root) return;
  const satir = [];
  const acik = dosyalar(path.join(root, 'contracts')).filter((f) => f.endsWith('.md'));
  if (acik.length) {
    satir.push(ceviri('sikismaAcik', acik.map((f) => f.slice(0, -3)).join(', ')));
  }
  const proje = path.dirname(path.dirname(root));
  for (const f of dosyalar(path.join(proje, 'docs'))) {
    if (!f.startsWith('ROTA-') || !f.endsWith('.md')) continue;
    const govde = metin(path.join(proje, 'docs', f));
    if (govde && /^\*\*Durum:\*\*\s*kapandı\s*$/m.test(govde)) continue;
    const m = govde && govde.match(/^\*\*Kaldığım yer:\*\*(.*)$/m);
    satir.push(ceviri('sikismaRota', f, m ? m[1].trim() : ''));
  }
  const canli = dosyalar(izYolu(root)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const yasayan = canli.map((f) => read(path.join(izYolu(root), f))).filter((a) => a && !a.ended);
  if (yasayan.length) {
    satir.push(ceviri('sikismaAjan', yasayan.map((a) => a.agent_type).join(', ')));
  }
  if (satir.length) process.stdout.write(satir.join(' | '));
}

// Oturum kapanınca çalışan kaydı silinmezse ajanlar sonsuza kadar "çalışıyor" görünür.
function oturumKapat(root, j) {
  if (!root) return;
  const live = izYolu(root);
  try {
    fs.unlinkSync(path.join(live, CALISAN));
  } catch {}
  for (const f of dosyalar(live)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const a = read(path.join(live, f));
    if (!a || a.ended) continue;
    a.ended = new Date().toISOString().replace('T', ' ').slice(0, 19);
    a.stop_reason = 'session_end';
    a.last_error = a.last_error || 'oturum kapandı: ' + (j.reason || 'bilinmiyor');
    yaz(path.join(live, f), a);
  }
}

// StopFailure yalnız API hatasında gelir (rate_limit, overloaded, ...). Çıktısı yok
// sayılır; tek işi kayıt noktasını mühürlemek — sonraki oturum nerede kesildiğini bilsin.
function kesintiYaz(root, j) {
  if (!root) return;
  const live = izYolu(root);
  try {
    fs.mkdirSync(live, { recursive: true });
  } catch {
    return;
  }
  const f = path.join(live, '_kesinti.json');
  const l = read(f) || [];
  l.push({
    t: new Date().toISOString().replace('T', ' ').slice(0, 19),
    sebep: String(j.error || j.error_type || 'bilinmiyor').slice(0, 40),
    oturum: String(j.session_id || '').slice(0, 8),
  });
  yaz(f, l.slice(-20));
}

function dosyalar(d) {
  try {
    return fs.readdirSync(d);
  } catch {
    return [];
  }
}
function metin(f) {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch {
    return null;
  }
}

// Hangi özellik hiç kullanılmıyor? Sayacı olmayan özellik ölçülemez, ölçülemeyen özellik
// token yükü olarak kalır. Tek dosya, tek satır artış — sohbete hiçbir şey basmaz.
function kullanimSay(anahtar) {
  try {
    const f = path.join(genelKok(), 'kullanim.json');
    const d = read(f) || {};
    const e = d[anahtar] || { n: 0 };
    e.n++;
    e.son = new Date().toISOString().slice(0, 10);
    d[anahtar] = e;
    yaz(f, d);
  } catch {}
}

let _worktree = null;

function findRelay(start) {
  const r = roleKoku(start);
  if (!r) return null;
  if (r.worktree) _worktree = r.worktree;
  return r.relay;
}
function short(p, proj) {
  const n = norm(p);
  const pn = norm(proj) + '/';
  return n.startsWith(pn) ? n.slice(pn.length) : path.basename(n);
}

module.exports = { ayarSayi };
