const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { s: ceviri, dil } = require('./dil.js');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try {
    j = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  try {
    karar(j);
  } catch {
    process.exit(0);
  }
  process.exit(0);
});

// Yol göreli de gelebilir (`.claude/relay/contracts/done/T1.md`). Başında `/` arayan
// eski desen bu biçimi kaçırıyordu — sınır `(^|/)` ile yazılır.
const DONE = /(^|\/)\.claude\/relay\/contracts\/done\//i;
// Mühür tek satır değil: `audit: passed` yazmak ucuz, denetçi kimliği + diff + doğrulama
// kanıtı yazmak değil. Dördü birden dolu olmadan done/ kapısı açılmaz. Alan `—` ise boş sayılır.
const MUHUR = /^audit:[ \t]*(passed|gecti)[ \t]*$/im;
const alan = (ad) => new RegExp('^' + ad + ':[ \\t]*(?![—\\-]?[ \\t]*$)\\S', 'im');
const KANIT = ['auditor_id', 'diff', 'verification'].map(alan);
const deger = (ad, s) => {
  const m = String(s).match(new RegExp('^' + ad + ':[ \\t]*(.+)$', 'im'));
  return m ? m[1].trim() : '';
};

// ÖLÇÜLDÜ: `tools:` satırı harness için tavan değil taban — denetçi ajanı ölçümde
// `Write, Edit` ile açıldı. Dört alanın dolu olması mührü doğrulamaz; alanların
// karşılığı `live/` kayıtlarında aranır. Denetçi turunda tek dosyaya yazmışsa denetim
// geçersizdir, araç listesi ne verirse versin.
const KANIT_SEBEP = {
  rol: {
    tr: 'auditor_id denetçi olmayan bir ajan kaydına işaret ediyor: ',
    en: 'auditor_id points at an agent record that is not an auditor: ',
  },
  yazma: {
    tr: 'Denetçi denetim turunda dosyaya yazmış, denetim geçersiz: ',
    en: 'The auditor wrote files during the audit; the audit is void: ',
  },
  kesisim: {
    tr: 'diff alanı sözleşmenin owns kümesiyle kesişmiyor: ',
    en: 'The diff field does not intersect the contract owns set: ',
  },
};

// `null` → mühür geçerli · `''` → biçim eksik · metin → kanıt çürük, sebebi bu satır.
function muhurSebebi(metin, kokIcin) {
  const s = String(metin);
  if (!MUHUR.test(s) || !KANIT.every((r) => r.test(s))) return '';
  return kanitSebebi(s, kokIcin);
}

// Kapalı tarafa düşme: `live/` okunamıyorsa veya kayıt yoksa mühür geçersiz sayılmaz —
// röle dışında elle taşınan meşru sözleşmeler kilitlenirdi. Biçim denetimiyle yetinilir,
// neyin doğrulanamadığı engel mesajına değil `_sorun.log`'a yazılır.
function kanitSebebi(s, kokIcin) {
  const relay = relayKoku(path.dirname(path.resolve(kokIcin || '.')));
  if (!relay) return null;
  const live = path.join(relay, 'live');
  const kimlik = safe(deger('auditor_id', s));
  const kayit = read(path.join(live, kimlik + '.json'));
  if (!kayit) return sorunYaz(live, 'live/' + kimlik + '.json yok — mühür biçimle geçti');

  const rol = String(kayit.agent_type || '?').replace(/^teknesyum:/, '');
  if (rol !== 'auditor') return sebep('rol', rol);
  const yazilan = Array.isArray(kayit.files) ? kayit.files : [];
  if (yazilan.length) return sebep('yazma', yazilan.join(', '));

  const owns = ownsKumesi(s);
  if (!owns.length) return sorunYaz(live, 'sözleşmede owns boş — diff kesişimi ölçülemedi');
  const fark = norm(deger('diff', s)).toLowerCase();
  if (!owns.some((o) => fark.includes(norm(o).toLowerCase())))
    return sebep('kesisim', deger('diff', s));
  return null;
}

function ownsKumesi(s) {
  const ham = (String(s).match(/^owns:[ \t]*\[([^\]]*)\]/im) || [])[1] || '';
  return ham
    .split(',')
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function sebep(anahtar, ek) {
  const g = KANIT_SEBEP[anahtar];
  return (dil() === 'tr' ? g.tr : g.en) + ek;
}

function read(f) {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
}

function safe(x) {
  return String(x)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
}

function sorunYaz(live, satir) {
  try {
    fs.mkdirSync(live, { recursive: true });
    fs.appendFileSync(
      path.join(live, '_sorun.log'),
      new Date().toISOString().replace('T', ' ').slice(0, 19) +
        ' | contract-guard | mühür kanıtı | ' +
        satir +
        '\n'
    );
  } catch {}
  return null;
}
// ÖLÇÜLDÜ: `>>?` serbest duruyordu ve düzyazıdaki `<sebep>` gibi bir metni yönlendirme
// sandı — `contracts/done/` sözünü içeren masum bir belge yazımı engellendi. Yönlendirme
// işareti boşlukla başlar; kelime ortasındaki `>` yönlendirme değildir.
const YAZMA_FIILI =
  /(^|[\s;|&])((mv|move-item|cp|copy-item|rm|remove-item|del|erase|touch|tee|sed\s+-i|set-content|add-content|out-file|new-item)\b|>>?)/i;

// ÖLÇÜLDÜ: sözleşme durumu ajanın beyanıyla ilerliyordu; bir düzeltme turunda `submitted`
// olan sözleşme yeniden `open` yazılıp denetim sırası sıfırlandı. Merdiven tek yönlüdür.
// `blocked` her iki yönde serbesttir — engel gerçek bir durumdur, kurtarma da öyle.
const SIRA = { open: 0, active: 1, submitted: 2, accepted: 3, done: 3 };

// ÖLÇÜLDÜ: her araç çağrısında iki `git rev-parse` süreci açılıyordu; Windows'ta süreç
// açmak 20-60 ms. Yanıt aynı kök için değişmez, hook süreci kısa ömürlüdür — bir kez
// sorulur, başarısızlık da önbelleklenir.
const _gitBellek = new Map();

function gitBilgisi(start) {
  const anahtar = path.resolve(start);
  if (_gitBellek.has(anahtar)) return _gitBellek.get(anahtar);
  const sonuc = gitSor(anahtar);
  _gitBellek.set(anahtar, sonuc);
  return sonuc;
}

function gitSor(start) {
  try {
    const top = path.resolve(
      execFileSync('git', ['-C', path.resolve(start), 'rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    );
    const git = execFileSync('git', ['-C', top, 'rev-parse', '--git-common-dir'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return { top, common: path.dirname(path.resolve(top, git)) };
  } catch {
    return null;
  }
}

function relayKoku(start) {
  let d = path.resolve(start);
  for (;;) {
    const relay = path.join(d, '.claude', 'relay');
    if (fs.existsSync(relay)) return relay;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  const git = gitBilgisi(start);
  if (!git) return null;
  const relay = path.join(git.common, '.claude', 'relay');
  return fs.existsSync(relay) ? relay : null;
}

function canonical(hedef) {
  const absolute = path.resolve(hedef);
  const relay = relayKoku(path.dirname(absolute));
  if (!relay) return null;
  const contracts = path.join(relay, 'contracts');
  const relative = path.relative(contracts, absolute);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;
  if (!/^T[^/\\]+\.md$/i.test(relative)) return null;
  return absolute;
}

function durum(metin) {
  const m = String(metin).match(/^status:[ \t]*([a-z]+)/im);
  return m ? m[1].toLowerCase() : null;
}

function gerileme(hedef, yeniMetin) {
  if (!canonical(hedef)) return;
  const yeni = durum(yeniMetin);
  if (yeni === null || SIRA[yeni] === undefined) return;
  let eski = null;
  try {
    eski = durum(fs.readFileSync(hedef, 'utf8'));
  } catch {
    return;
  }
  if (eski === null || SIRA[eski] === undefined) return;
  // ÖLÇÜLDÜ: canlı koşuda scribe `open`'dan doğrudan `submitted`'a atladı. Basamak
  // atlanınca sözleşme "kimse üzerinde çalışmıyor" görünür; ajan düşerse kurtarma
  // hangi işin yarım kaldığını bilemez. `active` işaretlemek bir satırlık iştir.
  if (eski === 'open' && SIRA[yeni] > SIRA.active) return engelle(...ceviri('basamakAtlama', yeni));
  // ÖLÇÜLDÜ: `submitted → active` protokolde meşru bir geçiş (protocol.md §2, denetçi
  // KALDI dedi → düzeltme turu) ama merdiven kuralı onu gerileme sayıp engelliyordu.
  // Geçiş serbesttir; tek şart kayıt noktasının turu yansıtması.
  if (eski === 'submitted' && yeni === 'active') {
    return kayitBayat(hedef) ? engelle(...ceviri('kayitBayat')) : undefined;
  }
  if (SIRA[yeni] >= SIRA[eski]) return;
  return engelle(...ceviri('gerileme', eski, yeni));
}

// Düzeltme turuna girerken kayıt noktası hala "tamamlandı" diyorsa, oturum kesilince
// kurtarma sözleşmeyi bitmiş sanar ve kalan maddeler kaybolur. Önce kayıt noktası
// güncellenir, sonra durum `active` olur.
const BITIS_IZI = /(tamamland|bitti|submitted|complete|finished|kabul edildi)/i;

function kayitBayat(hedef) {
  let govde = '';
  try {
    govde = fs.readFileSync(hedef, 'utf8');
  } catch {
    return false;
  }
  const bas = govde.match(/^##[ \t]*(Kay[ıi]t noktas[ıi]|Checkpoint)[ \t]*$/im);
  if (!bas) return false;
  const kalan = govde.slice(bas.index + bas[0].length);
  const son = kalan.search(/^##[ \t]/m);
  return BITIS_IZI.test(son === -1 ? kalan : kalan.slice(0, son));
}

// ÖLÇÜLDÜ: sıfırdan projede mimari, benzerleri görülmeden kuruluyordu; üçüncü dalgada
// sökülüyordu. Ön araştırma bir kere yapılır, kalıcıdır. Kapı yalnızca hiç iş yapılmamış
// ve gerçekten yeni olan projede kapalıdır — atlamak serbest, sessizce atlamak değil.
const CONTRACT_DIZIN = /^(.*)[/]\.claude[/]relay[/]contracts[/][^/]+\.md$/i;

function yeniProje(kok) {
  try {
    if (fs.existsSync(path.join(kok, 'docs', 'taramalar'))) return false;
  } catch {
    return false;
  }
  try {
    if (fs.readdirSync(path.join(kok, '.claude', 'relay', 'contracts', 'done')).length)
      return false;
  } catch {}
  try {
    const { tara } = require('../scripts/harita.js');
    return tara(kok).length < 10;
  } catch {
    return false;
  }
}

// ÖLÇÜLDÜ: kapı yalnız ilk sözleşmede duruyordu. İki proje "plan yap, işe girişme"
// diye başladı; sözleşme yazılmadığı için kapı hiç ateşlemedi ve 10+ depo taraması
// atlandı. Araştırma plandan önce gelir — `PLAN.md` de kapının arkasındadır.
function planYolu(hedef) {
  const mutlak = path.resolve(hedef);
  const relay = relayKoku(path.dirname(mutlak));
  if (!relay) return null;
  return norm(mutlak) === norm(path.join(relay, 'PLAN.md')) ? mutlak : null;
}

function onArastirma(hedef) {
  const canonicalPath = canonical(hedef) || planYolu(hedef);
  if (!canonicalPath) return;
  if (fs.existsSync(canonicalPath)) return;
  const relay = relayKoku(path.dirname(canonicalPath));
  const kok = relay && path.dirname(path.dirname(relay));
  if (!kok || !yeniProje(kok)) return;
  return engelle(...ceviri('onArastirma'));
}

// ÖLÇÜLDÜ: yönlendirici dosyanın adı `AGENTS.md` diye kararlaştırıldı ama oturumlar
// klasör başına gövdeli `CLAUDE.md` yazmaya devam etti — bu projeyi okuyan tek araç
// Claude Code değil. Tek satırlık işaretçi (`@AGENTS.md`) serbest, gövdelisi değil.
// Ev dizinindeki `~/.claude/CLAUDE.md` kuralın dışındadır.
function yonlendirici(hedef, icerik) {
  const yol = norm(path.resolve(hedef));
  if (!/(^|\/)CLAUDE\.md$/i.test(yol)) return;
  if (/(^|\/)\.claude\/CLAUDE\.md$/i.test(yol)) return;
  const satir = String(icerik)
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith('<!--'));
  if (satir.length <= 2 && satir.every((x) => /^@\S+\.md$/.test(x))) return;
  return engelle(...ceviri('yonlendiriciDosya'));
}

function karar(j) {
  const arac = j.tool_name || '';
  const t = j.tool_input || {};

  if (/^(Write|Edit|NotebookEdit)$/.test(arac)) {
    const hedef = t.file_path || t.notebook_path || '';
    if (!hedef) return;
    if (arac === 'Write') onArastirma(hedef);
    if (arac === 'Write') yonlendirici(hedef, t.content || '');
    gerileme(hedef, arac === 'Write' ? t.content || '' : t.new_string || '');
    if (!DONE.test(norm(hedef))) return;
    // Write mührü taşıyorsa denetimden geçmiş sözleşmenin yerleşmesidir; Edit hiçbir
    // koşulda meşru değil — bitmiş sözleşme değiştirilmez.
    if (arac === 'Edit') return engelle(...ceviri('doneSaltOkunur'));
    const sebep = muhurSebebi(t.content || '', hedef);
    if (sebep === null) return;
    return engelle(...ceviri('doneSaltOkunur'), ...(sebep ? [sebep] : []));
  }

  if (arac !== 'Bash') return;
  const komut = String(t.command || '');
  if (!/contracts[\\/]done/i.test(komut)) return;
  // Yazma fiili komutun herhangi bir yerinde değil, `done/` yolunun geçtiği parçada
  // aranır. Zincirin başka bir halkasındaki `rm` bu yolla ilgisizdir.
  const parca = komut
    .split(/[\n;]|&&|\|\||\|/)
    .filter((x) => /contracts[\\/]done/i.test(x) && YAZMA_FIILI.test(x));
  if (!parca.length) return; // okuma serbest: cat, ls, grep

  // Tek meşru yazma: denetimi geçmiş bir sözleşmeyi done/ altına taşımak. Kaynak
  // dosyada mühür varsa geçir. Komuttan kaynak çıkaramıyorsak kapalı tarafa düş.
  let curuk = '';
  for (const aday of yollar(parca.join(' '))) {
    if (DONE.test(norm(aday))) continue;
    let govde = null;
    try {
      govde = fs.readFileSync(aday, 'utf8');
    } catch {}
    if (govde === null) continue;
    const sebep = muhurSebebi(govde, aday);
    if (sebep === null) return;
    if (sebep) curuk = sebep;
  }
  return engelle(...ceviri('doneKabuk'), ...(curuk ? [curuk] : []));
}

function yollar(komut) {
  const out = [];
  for (const m of komut.matchAll(/["']?([\w.~\-/\\:]+\.md)["']?/g)) out.push(m[1]);
  return out;
}

function norm(p) {
  return path.normalize(String(p)).replace(/\\/g, '/');
}

function engelle(...satir) {
  process.stderr.write('ENGELLENDİ: ' + satir.join('\n'));
  process.exit(2);
}
