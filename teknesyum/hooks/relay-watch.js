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

  if (j.hook_event_name === 'SessionStart') return acilis(root);
  if (j.hook_event_name === 'UserPromptSubmit') return hatirlat(j);
  if (j.hook_event_name === 'Stop') return paketDenetle(j);

  // Röle kurulu projede izler proje içinde durur (/report oradan okur). Kurulu değilse
  // — üst klasörde, rastgele bir dizinde açılmış oturumda — oturuma özel genel dizine
  // yazarız. Kullanıcının klasör ayarlamasını beklemeyiz.
  const live = root
    ? izYolu(root)
    : path.join(genelKok(), safe(j.session_id || 'oturum'));
  try { fs.mkdirSync(live, { recursive: true }); } catch { return; }
  if (!root) supur();

  if (process.env.TEKNESYUM_DEBUG) iz(live, j);

  // ÖLÇÜLDÜ: alt ajanın araç kullanımları hook'a çoğunlukla ulaşmıyor — worktree
  // izolasyonlu bir koşuda ulaştı (16 adım), diğerlerinde hiç. Güvenilir adım sayacı
  // kurulamaz. Kesin ölçülebilen: başlangıç (ana oturumdaki Agent çağrısı) ve
  // bitiş (SubagentStop).
  if (j.hook_event_name === 'PreToolUse') {
    if (/^(Agent|Task)$/.test(j.tool_name || '')) {
      const n = calisanEkle(live, j);
      const t = j.tool_input || {};
      const rol = String(t.subagent_type || '?').replace(/^teknesyum:/, '');
      const tanim = String(t.description || '').slice(0, 60);
      duyur(
        'görev veriliyor · ' + rol + (t.model ? ' · ' + t.model : '') +
        (tanim ? ' · ' + tanim : '') + (n > 1 ? '   [' + n + ' ajan çalışıyor]' : '')
      );
    }
    return;
  }

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
  // Bitmiş sayılan bir ajandan yeni olay geliyorsa bitmemiştir. Kaydı geri aç;
  // aksi halde `ended` sabit kalır, `last_seen` ilerler ve kayıt kendiyle çelişir.
  if (s.ended && j.hook_event_name !== 'SubagentStop') { s.ended = null; s.stop_reason = null; }
  s.last_seen = now;
  s.identity = j.agent_id ? 'agent_id' : 'transcript';

  switch (j.hook_event_name) {
    case 'SubagentStart':
      s.started = now;
      s.stop_reason = null;
      break;

    case 'PostToolUse': {
      s.steps++;
      const t = j.tool_input || {};
      const target = t.file_path || t.notebook_path || '';
      const proj = root ? path.dirname(path.dirname(root)) : (j.cwd || process.cwd());
      s.last_action = (j.tool_name || '?') + (target ? ' ' + short(target, proj) : '');

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
      duyur('bitti · ' + rol + (c ? ' · ' + (c.ambiguous ? 'süre belirsiz' : gecen(c.start)) : ''));
      // Ölçüldü: bu olayın payload'ında `stop_reason` alanı YOK. Eksikliği ölüm sanma —
      // aksi halde normal biten her ajan statusline'da ⨯ görünür.
      s.stop_reason = j.stop_reason || 'end_turn';
      // `ended` başlangıçtan önce olamaz. Olduysa kayıt karışmıştır; uydurma yerine
      // alanı boş bırak — yanlış zaman, zamansızlıktan kötüdür.
      s.ended = (s.started && now < s.started) ? null : now;
      if (j.last_assistant_message) s.last_word = String(j.last_assistant_message).slice(0, 300);
      break;
    }
  }

  yaz(file, s);
}

const CALISAN = '_running.json';

function calisanEkle(live, j) {
  const f = path.join(live, CALISAN);
  const l = read(f) || [];
  const t = j.tool_input || {};
  l.push({
    type: t.subagent_type || '?',
    desc: String(t.description || '').slice(0, 60),
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
// bildiririz: görev verildi, ajan bitti, oturum açıldı. TEKNESYUM_SESSIZ=1 kapatır.
function duyur(mesaj) {
  if (process.env.TEKNESYUM_SESSIZ) return;
  try { process.stdout.write(JSON.stringify({ systemMessage: 'Teknesyum ▸ ' + mesaj })); } catch {}
}

// Ajan açılmayan oturumda eklenti baştan sona sessizdi: kullanıcı devrede olup olmadığını
// göremiyordu. Ölçüyü model yapar, ama ölçüldüğünü söylemesi artık zorunlu.
function hatirlat(j) {
  if (process.env.TEKNESYUM_SESSIZ) return;
  // ÖLÇÜLDÜ: metin her istekte ~90 token yazıyordu ve geçmişte kalıcı. 60 mesajlık
  // oturumda 5000+ token, hepsi aynı cümlenin kopyası. Kural bir kez okunduğunda
  // geçmişte duruyor; ikinci kopyası bilgi taşımıyor. İlk iki istekte yazılır.
  if (sayacGecti(j)) return;
  const metin =
    'Teknesyum Base: iş talebiyse relay §1 ile ölç, ilk satır ' +
    '`Teknesyum ▸ ölçü: <büyüklük> → <karar>`. Ajan açmasan da yaz (örn. ' +
    '`tek dosya → ajan gerekmedi`). Salt soru/sohbette satırı yazma.';
  try {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: metin },
    }));
  } catch {}
}

// Oturum başına kaç kez yazdığımızı sayar. Sayaç dosyası oturuma özel; `supur()`
// bir günü geçenleri zaten atıyor.
function sayacGecti(j) {
  const id = safe((j && j.session_id) || 'oturum');
  const dosya = path.join(genelKok(), id + '.hatirlatma');
  let n = 0;
  try { n = parseInt(fs.readFileSync(dosya, 'utf8'), 10) || 0; } catch {}
  if (n >= 2) return true;
  try {
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    fs.writeFileSync(dosya, String(n + 1));
  } catch {}
  return false;
}

// Ölçüldü: kural multi-session.md §5'te yazılıydı ve yine de sohbete 120 satırlık paket
// basıldı. Yazılı kural yeterli değilse kapıya bekçi konur — paket dosyaya, kullanıcıya
// tek satır. Yalnızca iki işaret birden varsa tetiklenir; normal kod bloğu dokunulmaz.
const PAKET_BASLIK = /^#{1,3}[ \t]*(GÖREV|GOREV|TASK)\b/im;
const PAKET_ALAN = /^[ \t]*(Depo|Repo|Yığın|Yigin|Stack|Kabuk|Shell)[ \t]*:/im;

function paketDenetle(j) {
  if (j.stop_hook_active) return;
  const metin = sonMesaj(j.transcript_path);
  if (!metin) return;
  for (const blok of metin.match(/```[\s\S]*?```/g) || []) {
    if (blok.split('\n').length < 25) continue;
    if (!PAKET_BASLIK.test(blok) || !PAKET_ALAN.test(blok)) continue;
    return process.stdout.write(JSON.stringify({
      decision: 'block',
      reason:
        'Teknesyum: görev paketini sohbete basma. Paket dosyaya yazılır, kullanıcıya ' +
        'tek satır verilir (multi-session.md §5). Paketi `.claude/relay/G<n>.md` altına ' +
        'yaz, sonra sadece şunu bas: "`.claude/relay/G<n>.md` oku ve içindeki görevi ' +
        'eksiksiz uygula." Paketi çalıştıracak taraf dosyayı kendi okur; kullanıcının ' +
        '120 satır kopyalaması gerekmez.',
    }));
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
  } catch { return null; }
  const satir = ham.split('\n').filter(Boolean);
  for (let i = satir.length - 1; i >= 0; i--) {
    let o;
    try { o = JSON.parse(satir[i]); } catch { continue; }
    if (!o.message || o.message.role !== 'assistant') continue;
    const ic = o.message.content;
    if (typeof ic === 'string') return ic;
    if (Array.isArray(ic)) {
      const t = ic.filter((p) => p && p.type === 'text').map((p) => p.text).join('\n');
      if (t) return t;
    }
  }
  return null;
}

function gecen(start) {
  const s = Math.max(0, Math.round((Date.now() - start) / 1000));
  return s < 60 ? s + ' sn' : Math.round(s / 60) + ' dk';
}

// stdout tek JSON taşır — açılışta söylenecek her şey tek satırda birleşir.
function acilis(root) {
  const parca = [];
  if (kurulumEksik()) parca.push('kurulum eksik · /setup çalıştır, gerekeni sorarım');
  if (root) {
    const acik = say(path.join(root, 'contracts'));
    const biten = say(path.join(root, 'contracts', 'done'));
    if (!acik && !biten) parca.push('röle kurulu · sözleşme yok');
    else parca.push('röle kurulu · sözleşme ' + biten + '/' + (acik + biten) + ' bitti' +
      (acik ? ' · ' + acik + ' açık · kaldığım yerden sürdürüyorum' : ''));
  }
  if (parca.length) duyur(parca.join('   ·   '));
}

// Plugin kendini kuramaz: statusline kullanıcının settings.json'ına yazılır. Eksikse
// oturum açılışında bir kez söyleriz — kullanıcının komut ezberlemesini bekleme.
function kurulumEksik() {
  const kok = process.env.CLAUDE_CONFIG_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
  if (!fs.existsSync(path.join(kok, 'teknesyum-statusline.js'))) return true;
  const s = read(path.join(kok, 'settings.json'));
  return !(s && s.statusLine && /teknesyum-statusline/.test(String(s.statusLine.command || '')));
}

function say(dir) {
  try { return fs.readdirSync(dir).filter((f) => /\.md$/i.test(f)).length; } catch { return 0; }
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
  try { fs.unlinkSync(gf); } catch {}
}

function iz(live, j) {
  const f = path.join(live, '_hook-debug.json');
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
  yaz(f, d);
  izSatiri(live, j, ev, now);
}

// Sayaç "hook ateşledi mi" sorusunu cevaplıyor ama "ajan neden yarım kesildi"
// sorusunu cevaplamıyor: sıra kayboluyor. Zaman damgalı tek satırlık günlük,
// hangi ajanın hangi olaydan sonra sustuğunu gösterir.
function izSatiri(live, j, ev, now) {
  const kimlik = j.agent_id ? 'id:' + j.agent_id
    : transcriptKimligi(j) ? 'tr:' + transcriptKimligi(j)
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
  const satir = [now, ev, kimlik, (j.tool_name || ''), alan.join(' ')].join(' | ') + '\n';
  try { fs.appendFileSync(path.join(live, '_hook-debug.log'), satir); } catch {}
}

// 2.0.0'da `canli/` → `live/` oldu. Eski klasörü olan projede oraya yazmaya devam
// ederiz; yoksa yeni adı kullanırız. Kimsenin izi kaybolmaz.
function izYolu(root) {
  const yeni = path.join(root, 'live');
  const eski = path.join(root, 'canli');
  if (!fs.existsSync(yeni) && fs.existsSync(eski)) return eski;
  return yeni;
}

function genelKok() {
  const ev = process.env.CLAUDE_CONFIG_DIR ||
    path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
  return izYolu(path.join(ev, 'teknesyum'));
}

// Röle kurulu olmayan oturumların izleri kalıcı değil; bir günü geçeni at.
function supur() {
  const kok = genelKok();
  let l = [];
  try { l = fs.readdirSync(kok); } catch { return; }
  // İzler `last_word` alanında ajan çıktısı taşıyor. Eskiden temizlik 12 klasör
  // birikmeden başlamıyordu; az oturum açan kullanıcıda hiç çalışmıyordu.
  const sinir = Date.now() - 24 * 60 * 60 * 1000;
  for (const d of l) {
    const p = path.join(kok, d);
    try { if (fs.statSync(p).mtimeMs < sinir) fs.rmSync(p, { recursive: true, force: true }); } catch {}
  }
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

// Paralel ajanlarda birden çok hook süreci aynı dosyaya yazıyor. Doğrudan writeFileSync
// truncate ile başlar: okuyan taraf yarım JSON yakalayabilir. Geçici dosya + rename
// atomiktir — okuyan ya eski ya yeni içeriği görür, arada bir hal yok.
function yaz(f, veri) {
  const tmp = f + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(veri, null, 2));
    fs.renameSync(tmp, f);
  } catch { try { fs.unlinkSync(tmp); } catch {} }
}
function norm(p) { return path.normalize(p).replace(/\\/g, '/'); }
function safe(s) { return String(s).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80); }
function short(p, proj) {
  const n = norm(p);
  const pn = norm(proj) + '/';
  return n.startsWith(pn) ? n.slice(pn.length) : path.basename(n);
}
