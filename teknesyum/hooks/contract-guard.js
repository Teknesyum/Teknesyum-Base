const fs = require('fs');
const path = require('path');
const { s: ceviri, dil, profil } = require('./dil.js');
const { read, norm, safe, roleKoku } = require('./ortak.js');
const { SIRA, sozlesmeAdi, durum, bilinenDurum } = require('./contract-schema.js');

let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let j = {};
  try {
    j = JSON.parse(raw);
  } catch {
    return kapaliDus('kanca girdisi JSON olarak okunamadı');
  }
  try {
    karar(j);
  } catch (e) {
    return kapaliDus('kapı beklenmedik hatayla düştü: ' + String((e && e.message) || e));
  }
  uyariBas();
  process.exit(0);
});

// ÖLÇÜLDÜ (tehdit modeli, kontrol kapsam tablosu): kapı her beklenmedik durumda sessizce
// açılıyordu — bozuk kanca JSON'u tek başına korumanın tamamını kaldırıyordu. Varsayılan
// artık kapalı tarafa düşmek; açık taraf `TEKNESYUM_KAPI_ACIK=1` ile bilerek seçilir.
function kapaliDus(neden) {
  if (process.env.TEKNESYUM_KAPI_ACIK === '1') {
    uyariBas();
    return process.exit(0);
  }
  process.stderr.write(
    'ENGELLENDİ: ' +
      [
        neden + '.',
        'Kapı doğrulama yapamadığı için kapalı tarafa düştü.',
        'Bilerek geçmek için `TEKNESYUM_KAPI_ACIK=1` ile çalıştır.',
      ].join('\n')
  );
  return process.exit(2);
}

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

function sorunYaz(live, satir, etiket) {
  try {
    fs.mkdirSync(live, { recursive: true });
    fs.appendFileSync(
      path.join(live, '_sorun.log'),
      new Date().toISOString().replace('T', ' ').slice(0, 19) +
        ' | contract-guard | ' +
        (etiket || 'mühür kanıtı') +
        ' | ' +
        satir +
        '\n'
    );
  } catch {}
  return null;
}
function relayKoku(start) {
  const r = roleKoku(start);
  return r ? r.relay : null;
}

function canonical(hedef) {
  const absolute = path.resolve(hedef);
  const relay = relayKoku(path.dirname(absolute));
  if (!relay) return null;
  const contracts = path.join(relay, 'contracts');
  const relative = path.relative(contracts, absolute);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) return null;
  if (!sozlesmeAdi(relative)) return null;
  return absolute;
}

// ÖLÇÜLDÜ (tur 2 denetimi, K4): bilinmeyen durum sessizce geçiyordu ve iki adımlık
// yıkama mümkündü — `status: bozuk` Write sessiz geçer, ardından `bozuk -> open`
// yazılırken eski durum bilinmediği için gerileme denetimi hiç çalışmazdı. Sessiz
// `return` yok: bilinmeyen yeni durum da, bilinmeyen eski durum da kapalı tarafa düşer;
// eski taraf ayrıca `_sorun.log`'a yazılır. Mesajlar dil.js'te değil burada — dil.js
// bu sözleşmenin owns kümesinde yok, kalıp ECO_ATLAMA ile aynı.
const DURUM_ENGELI = {
  yeni: {
    tr: (d) => [
      'Bilinmeyen sözleşme durumu yazılamaz: `' + d + '`.',
      'Geçerli durumlar: open, active, submitted, blocked, accepted, done, sealed.',
    ],
    en: (d) => [
      'Unknown contract status cannot be written: `' + d + '`.',
      'Valid statuses: open, active, submitted, blocked, accepted, done, sealed.',
    ],
  },
  eski: {
    tr: (d) => [
      'Sözleşmenin dosyadaki durumu tanınmıyor: `' + d + '` — geçiş gerileme sayıldı.',
      'Önce `status:` satırını geçerli bir duruma düzelt; hangi durum olacağı T0 kararıdır.',
    ],
    en: (d) => [
      "The contract's current status is not recognized: `" + d + '` — treated as a regression.',
      'Fix the `status:` line to a valid status first; which one is a T0 decision.',
    ],
  },
};

function durumEngeli(taraf, d) {
  const g = DURUM_ENGELI[taraf];
  return engelle(...(dil() === 'tr' ? g.tr(d) : g.en(d)));
}

function gerileme(hedef, yeniMetin) {
  if (!canonical(hedef)) return;
  const yeni = durum(yeniMetin);
  if (yeni === null) return;
  if (!bilinenDurum(yeni)) return durumEngeli('yeni', yeni);
  let eski = null;
  try {
    eski = durum(fs.readFileSync(hedef, 'utf8'));
  } catch {
    return;
  }
  if (!bilinenDurum(eski)) {
    const relay = relayKoku(path.dirname(path.resolve(hedef)));
    if (relay)
      sorunYaz(
        path.join(relay, 'live'),
        'bilinmeyen eski durum: ' + (eski === null ? '—' : eski) + ' — ' + path.basename(hedef),
        'durum yıkaması'
      );
    return durumEngeli('eski', eski === null ? '—' : eski);
  }
  if (yeni === 'blocked' || eski === 'blocked') return;
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

// ÖLÇÜLDÜ: sıfırdan projede mimari, benzerleri görülmeden kuruluyordu; üçüncü aşamada
// sökülüyordu. Ön araştırma bir kere yapılır, kalıcıdır. Kapı yalnızca hiç iş yapılmamış
// ve gerçekten yeni olan projede kapalıdır — atlamak serbest, sessizce atlamak değil.
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

const ECO_ATLAMA = {
  tr: () => [
    'eco profilinde ön araştırma kapısı geçildi, araştırma yapılmadı.',
    'Gerekçeyi `docs/taramalar/ATLANDI.md` dosyasına tek satır yaz; atlama',
    '`.claude/relay/live/_sorun.log` dosyasına kaydedildi.',
    'Atlamak serbest, sessizce atlamak değil.',
  ],
  en: () => [
    'The eco profile let the prior-art gate through; no research was done.',
    'Write one line of reasoning into `docs/taramalar/ATLANDI.md`; the skip was',
    'recorded in `.claude/relay/live/_sorun.log`.',
    'Skipping is fine, skipping silently is not.',
  ],
};

function onArastirma(hedef) {
  const canonicalPath = canonical(hedef) || planYolu(hedef);
  if (!canonicalPath) return;
  if (fs.existsSync(canonicalPath)) return;
  const relay = relayKoku(path.dirname(canonicalPath));
  const kok = relay && path.dirname(path.dirname(relay));
  if (!kok || !yeniProje(kok)) return;
  if (profil() !== 'eco') return engelle(...ceviri('onArastirma'));
  sorunYaz(
    path.join(relay, 'live'),
    norm(path.relative(kok, canonicalPath)) + ' — gerekçe dosyası yok',
    'eco ön araştırma atlandı'
  );
  return uyar(...(dil() === 'tr' ? ECO_ATLAMA.tr() : ECO_ATLAMA.en()));
}

const YONLENDIRICI_AD = /(^|\/)CLAUDE\.md$/i;

function duzenlenmis(hedef, t) {
  const yeni = String(t.new_string || '');
  let govde;
  try {
    govde = fs.readFileSync(hedef, 'utf8');
  } catch {
    return yeni;
  }
  const eski = String(t.old_string || '');
  if (!eski) return govde + yeni;
  if (t.replace_all) return govde.split(eski).join(yeni);
  const i = govde.indexOf(eski);
  return i === -1 ? govde : govde.slice(0, i) + yeni + govde.slice(i + eski.length);
}

// ÖLÇÜLDÜ: yönlendirici dosyanın adı `AGENTS.md` diye kararlaştırıldı ama oturumlar
// klasör başına gövdeli `CLAUDE.md` yazmaya devam etti — bu projeyi okuyan tek araç
// Claude Code değil. Tek satırlık işaretçi (`@AGENTS.md`) serbest, gövdelisi değil.
// Ev dizinindeki `~/.claude/CLAUDE.md` kuralın dışındadır.
function yonlendirici(hedef, icerik) {
  const yol = norm(path.resolve(hedef));
  if (!YONLENDIRICI_AD.test(yol)) return;
  if (/(^|\/)\.claude\/CLAUDE\.md$/i.test(yol)) return;
  const satir = String(icerik)
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith('<!--'));
  if (satir.length <= 2 && satir.every((x) => /^@\S+\.md$/.test(x))) return;
  return engelle(...ceviri('yonlendiriciDosya'));
}

// Klasör yolu mühürlenemez (bkz. denetim-kaydi.js/ownsKusuru). Açılışta reddedilirse
// sözleşme hiç yanlış doğmaz; tamamlamada reddetmek işi bittikten sonra durdurur.
function ownsSemasi(hedef, icerik) {
  const n = norm(path.resolve(hedef));
  if (!/[\\/]contracts[\\/][^\\/]+\.md$/i.test(n)) return;
  if (/[\\/]done[\\/]/i.test(n)) return;
  if (!/^owns:/im.test(icerik)) return;
  const kotu = ownsKumesi(icerik).filter((x) => /[\\/]$/.test(String(x)));
  if (!kotu.length) return;
  return engelle(
    'ENGELLENDİ: owns klasör yolu içeriyor — ' + kotu.join(', '),
    '',
    'Klasörün özeti içeriği değişse de değişmez; böyle bir sözleşme mühürlenirse',
    'mühür yalan söyler. 27.08.2026 doğrulamasında 42 sözleşmenin 7si bu delikten geçmiş.',
    'Sözleşmenin dokunacağı dosyaları tek tek yaz.'
  );
}

function karar(j) {
  const arac = j.tool_name || '';
  const t = j.tool_input || {};

  if (/^(Write|Edit|NotebookEdit)$/.test(arac)) {
    const hedef = t.file_path || t.notebook_path || '';
    if (!hedef) return;
    if (arac === 'Write') onArastirma(hedef);
    if (arac === 'Write') yonlendirici(hedef, t.content || '');
    if (arac === 'Write') ownsSemasi(hedef, t.content || '');
    else if (arac === 'Edit' && YONLENDIRICI_AD.test(norm(path.resolve(hedef))))
      yonlendirici(hedef, duzenlenmis(hedef, t));
    gerileme(hedef, arac === 'Write' ? t.content || '' : t.new_string || '');
    if (!DONE.test(norm(hedef))) return;
    // ÖLÇÜLDÜ (T7 / TB-001): mühürlü Write done/ altına yerleşmeye izin veriyordu, ama
    // mühür dört alanın varlığından ibaretti. Tamamlama artık tek canonical komuttan
    // geçer; Write ve Edit hiçbir koşulda meşru değil.
    const sebep = arac === 'Write' ? muhurSebebi(t.content || '', hedef) : '';
    return engelle(
      ...ceviri('doneSaltOkunur'),
      ...(sebep ? [sebep] : []),
      ...ceviri('doneCanonical')
    );
  }

  if (arac !== 'Bash') return;
  const komut = String(t.command || '');
  if (!/contracts[\\/]done/i.test(komut)) return;
  // ÖLÇÜLDÜ (tehdit modeli, kontrol kapsam tablosu): deny-list `node -e renameSync`,
  // `install`, `ln`, `mklink`, .NET API çağrısı ve özel binary'yi görmüyordu. Liste
  // tersine çevrildi: `done/` yolunu içeren parça ya canonical komuttur ya da bilinen
  // bir okuma komutu; geri kalan her şey bilinmeyendir ve engellenir.
  const parca = komut.split(/[\n;]|&&|\|\||\|/).filter((x) => /contracts[\\/]done/i.test(x));
  if (!parca.length) return;
  if (parca.every(izinli)) return;
  return engelle(...ceviri('doneKabuk'), ...ceviri('doneCanonical'));
}

const CANONICAL = /contract\.js["']?[ \t]+complete\b/i;

const OKUMA = new Set([
  'cat',
  'type',
  'less',
  'more',
  'head',
  'tail',
  'wc',
  'ls',
  'dir',
  'grep',
  'rg',
  'egrep',
  'fgrep',
  'find',
  'stat',
  'file',
  'diff',
  'cmp',
  'sed',
  'awk',
  'cut',
  'sort',
  'uniq',
  'tr',
  'basename',
  'dirname',
  'realpath',
  'readlink',
  'md5sum',
  'sha256sum',
  'get-content',
  'get-childitem',
  'select-string',
  'test-path',
  'resolve-path',
  'get-item',
]);

const GIT_OKUMA = new Set([
  'status',
  'diff',
  'log',
  'show',
  'ls-files',
  'grep',
  'cat-file',
  'blame',
]);

function izinli(parca) {
  const p = String(parca)
    .replace(/#[^\n]*$/g, '')
    .trim();
  if (!/contracts[\\/]done/i.test(p)) return true;
  if (CANONICAL.test(p)) return true;
  if (/>>?[ \t]*["']?[^\s"'|;&]*contracts[\\/]done/i.test(p)) return false;
  if (/[ \t]-i\b/.test(p) || /-delete\b|-exec\b/.test(p)) return false;
  const m = /^[(\s]*(?:[A-Za-z_]\w*=\S*\s+)*(\S+)/.exec(p);
  if (!m) return false;
  const ad = path
    .basename(m[1].replace(/["']/g, ''))
    .toLowerCase()
    .replace(/\.(exe|cmd|bat|ps1)$/, '');
  if (ad === 'git') {
    const alt = (p.match(/\bgit\b[^\S\n]+(?:-C[^\S\n]+\S+[^\S\n]+)?([a-z-]+)/i) || [])[1];
    return GIT_OKUMA.has(String(alt).toLowerCase());
  }
  return OKUMA.has(ad);
}

function engelle(...satir) {
  process.stderr.write('ENGELLENDİ: ' + satir.join('\n'));
  process.exit(2);
}

const _uyari = [];

function uyar(...satir) {
  _uyari.push(satir.join('\n'));
}

function uyariBas() {
  if (!_uyari.length) return;
  try {
    process.stdout.write(JSON.stringify({ systemMessage: '\nUYARI: ' + _uyari.join('\n') }));
  } catch {}
}
