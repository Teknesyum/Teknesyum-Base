const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// ÖLÇÜLDÜ (25.08.2026, dış denetim TB-001/TB-004 + tehdit modeli zincir C): mühür dört
// alanın *varlığını* doğruluyordu, doğruluğunu değil. Denetim kaydı kalıcı dizine yazılır,
// tek sözleşme + tek tur + tek HEAD'e bağlanır ve tüketildikten sonra yeniden kullanılamaz.
const ALANLAR = [
  'contractId',
  'auditorRunId',
  'headSha',
  'diffHash',
  'owns',
  'verification',
  'result',
  'createdAt',
];

const GECTI = /^(passed|gecti|geçti)$/i;

function denetimDizini(relay) {
  return path.join(relay, 'audits');
}

function ozet(veri) {
  return crypto.createHash('sha256').update(veri).digest('hex');
}

// Kayıt HEAD'e ve sahip olunan dosyaların o andaki içeriğine birlikte bağlanır: eski bir
// denetim kaydı yeni bir ağaçla eşleşemez, dosya kanca sonrası değişirse hash tutmaz.
function dosyaOzeti(kok, liste) {
  const satir = liste
    .slice()
    .sort()
    .map((p) => {
      let g;
      try {
        g = fs.readFileSync(path.join(kok, p));
      } catch {
        g = Buffer.alloc(0);
      }
      return String(p).replace(/\\/g, '/') + ' ' + ozet(g);
    });
  return ozet(satir.join('\n'));
}

function ownsListesi(metin) {
  const ham = (String(metin).match(/^owns:[ \t]*\[([^\]]*)\]/im) || [])[1] || '';
  return ham
    .split(',')
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function alanDegeri(ad, metin) {
  const m = String(metin).match(new RegExp('^' + ad + ':[ \\t]*(.+)$', 'im'));
  return m ? m[1].trim() : '';
}

function kayitYolu(relay, id, tur) {
  return path.join(denetimDizini(relay), String(id) + '-' + String(tur) + '.json');
}

function kayitOku(yol) {
  try {
    return JSON.parse(fs.readFileSync(yol, 'utf8'));
  } catch {
    return null;
  }
}

function kume(liste) {
  return liste
    .map((x) => String(x).replace(/\\/g, '/').trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

// null → kayıt geçerli · metin → neden geçersiz olduğu.
function kayitDogrula(kayit, beklenen) {
  if (!kayit || typeof kayit !== 'object') return 'denetim kaydı okunamadı';
  for (const a of ALANLAR) if (kayit[a] === undefined) return 'denetim kaydında eksik alan: ' + a;
  if (kayit.usedAt) return 'denetim kaydı zaten kullanılmış: ' + kayit.usedAt;
  if (String(kayit.contractId) !== String(beklenen.id))
    return 'kayıt başka sözleşmeye ait: ' + kayit.contractId;
  if (!GECTI.test(String(kayit.result))) return 'denetim sonucu geçmedi: ' + kayit.result;
  if (String(kayit.headSha) !== String(beklenen.headSha))
    return 'kayıt başka bir HEAD için yazılmış: ' + String(kayit.headSha).slice(0, 8);
  if (!Array.isArray(kayit.owns) || !kayit.owns.length) return 'kayıtta owns kümesi boş';
  if (kume(kayit.owns) !== kume(beklenen.owns))
    return 'kayıttaki owns kümesi sözleşmeyle aynı değil';
  if (!Array.isArray(kayit.verification) || !kayit.verification.length)
    return 'kayıtta doğrulama kanıtı yok';
  if (String(kayit.diffHash) !== String(beklenen.diffHash))
    return 'sahip olunan dosyalar denetimden sonra değişmiş';
  return null;
}

// Denetçi kimliği canlı izde gerçekten denetçi mi ve denetim turunda dosyaya yazmış mı.
function denetciSaglam(relay, runId) {
  const kayit = kayitOku(path.join(relay, 'live', String(runId).replace(/[^\w.-]/g, '') + '.json'));
  if (!kayit) return null;
  const rol = String(kayit.agent_type || '?').replace(/^teknesyum:/, '');
  if (rol !== 'auditor') return 'auditor_id denetçi olmayan bir ajan kaydına işaret ediyor: ' + rol;
  const yazilan = Array.isArray(kayit.files) ? kayit.files : [];
  if (yazilan.length) return 'denetçi denetim turunda dosyaya yazmış: ' + yazilan.join(', ');
  return null;
}

function kayitTuket(yol, sha) {
  const kayit = kayitOku(yol);
  if (!kayit) return false;
  kayit.usedAt = new Date().toISOString();
  kayit.completedSha = sha;
  const hedef = yol.replace(/\.json$/i, '.used.json');
  fs.writeFileSync(hedef, JSON.stringify(kayit, null, 2), 'utf8');
  try {
    fs.unlinkSync(yol);
  } catch {}
  return true;
}

function defterYolu(relay) {
  return path.join(denetimDizini(relay), 'defter.jsonl');
}

function defterOku(relay) {
  let ham = '';
  try {
    ham = fs.readFileSync(defterYolu(relay), 'utf8');
  } catch {
    return null;
  }
  const out = [];
  for (const satir of ham.split('\n')) {
    if (!satir.trim()) continue;
    try {
      out.push(JSON.parse(satir));
    } catch {}
  }
  return out;
}

function defterEkle(relay, kayit) {
  fs.mkdirSync(denetimDizini(relay), { recursive: true });
  fs.appendFileSync(defterYolu(relay), JSON.stringify(kayit) + '\n', 'utf8');
}

// Defter yoksa done/ altında zaten duran sözleşmeler devralınır: geçmişe dönük suçlama
// yapmaz, bundan sonrasını sayar. Devralma açıkça kaydedilir.
function defterKur(relay) {
  const mevcut = defterOku(relay);
  if (mevcut) return mevcut;
  const done = path.join(relay, 'contracts', 'done');
  let liste = [];
  try {
    liste = fs.readdirSync(done).filter((f) => /\.md$/i.test(f));
  } catch {}
  const damga = new Date().toISOString();
  for (const f of liste)
    defterEkle(relay, { id: f.replace(/\.md$/i, ''), kaynak: 'devralindi', at: damga });
  if (!liste.length) defterEkle(relay, { kaynak: 'defter-acildi', at: damga });
  return defterOku(relay) || [];
}

function gitTasinan(kok, relay) {
  const r = spawnSync('git', ['-C', kok, 'diff', '--name-status', 'HEAD', '--', relay], {
    encoding: 'utf8',
    timeout: 20000,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.error || r.status !== 0) return null;
  const out = [];
  for (const satir of String(r.stdout || '').split('\n')) {
    const p = satir.split('\t').pop();
    const m = /contracts\/done\/([A-Za-z]{1,4}\d{1,4})\.md$/i.exec(String(p).replace(/\\/g, '/'));
    if (m && !/^D/.test(satir)) out.push(m[1]);
  }
  return out;
}

// Kanca aracın beyan ettiği komutu görür, sürecin ne yaptığını değil: `node -e renameSync`,
// `python -c os.rename`, junction alias ve hardlink hepsi kancanın altından geçer. Sonuç
// yine de diskte durur — done/ altındaki her sözleşme defterle karşılaştırılır.
function doneDenetle(kok, relay) {
  const defter = defterKur(relay);
  const bilinen = new Set(defter.map((x) => x && x.id).filter(Boolean));
  const done = path.join(relay, 'contracts', 'done');
  let diskte = [];
  try {
    diskte = fs
      .readdirSync(done)
      .filter((f) => /\.md$/i.test(f))
      .map((f) => f.replace(/\.md$/i, ''));
  } catch {
    return [];
  }
  const gitten = gitTasinan(kok, relay);
  const aday = gitten === null ? diskte : Array.from(new Set(diskte.concat(gitten)));
  return aday.filter((id) => !bilinen.has(id));
}

module.exports = {
  ALANLAR,
  denetimDizini,
  ozet,
  dosyaOzeti,
  ownsListesi,
  alanDegeri,
  kayitYolu,
  kayitOku,
  kayitDogrula,
  denetciSaglam,
  kayitTuket,
  defterYolu,
  defterOku,
  defterEkle,
  defterKur,
  doneDenetle,
};
