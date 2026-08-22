// Kancaların ve betiklerin ortak tabanı. Aynı kavramın üç ayrı gövdesi olduğunda
// biri düzeltiliyor öteki geride kalıyordu: kanca sözleşmeyi bir kökte korurken
// izleyici başka köke bakıyordu. Buradaki tek gövde ikisini aynı yere bağlar.
//
// Bu dosya proje içinden hiçbir şey `require` etmez — `dil.js` konfig kökünü buradan
// alır, `relay-watch.js` ikisini birden alır. Taban bağımlılık kurarsa daire olur.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function ev() {
  return process.env.USERPROFILE || process.env.HOME || '.';
}

function konfigKok() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(ev(), '.claude');
}

// Transkriptler Claude Code'un konfig dizininin altında durur. Konfig kökü
// `CLAUDE_CONFIG_DIR` ile taşınmışsa transkriptler de onunla taşınır; ev dizinini
// doğrudan okumak, dizini taşımış kullanıcıda `/save`, `/load` ve "önceki oturum var"
// bildirimini sessizce kırıyordu.
function transkriptKok() {
  return path.join(konfigKok(), 'projects');
}

function transkriptDizini(proje) {
  return path.join(transkriptKok(), path.resolve(proje).replace(/[^a-zA-Z0-9]/g, '-'));
}

function oturumKimligi() {
  const s = process.env.CLAUDE_CODE_SESSION_ID || process.env.CLAUDE_CODE_HOST_SESSION_ID;
  return s ? String(s) : null;
}

function oturumProfilYolu(sid) {
  return path.join(konfigKok(), 'teknesyum', 'oturumlar', safe(sid) + '.json');
}

function read(f) {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
}

// Paralel ajanlarda birden çok hook süreci aynı dosyaya yazıyor. Doğrudan writeFileSync
// truncate ile başlar: okuyan taraf yarım JSON yakalayabilir. Geçici dosya + rename
// atomiktir — okuyan ya eski ya yeni içeriği görür, arada bir hal yok.
function yaz(f, veri) {
  const tmp = f + '.' + process.pid + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(veri, null, 2));
    fs.renameSync(tmp, f);
  } catch {
    try {
      fs.unlinkSync(tmp);
    } catch {}
  }
}

function norm(p) {
  return path.normalize(String(p)).replace(/\\/g, '/');
}

function safe(s) {
  return String(s)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
}

function varMi(...p) {
  try {
    return fs.existsSync(path.join(...p));
  } catch {
    return false;
  }
}

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

// `common` aranan şey ana worktree'nin çalışma dizini. `--git-common-dir` bunu değil
// git deposunu verir; ikisi yalnız standart `<kök>/.git` yerleşiminde bir üst dizinle
// birbirine bağlıdır. Koşul o yüzden açıkça yazılır: son parça `.git` değilse
// (`--separate-git-dir`, elle verilmiş `GIT_COMMON_DIR`) bir üst dizin ana worktree
// değil, deponun rastgele komşusudur. Röle kökünü bulamamak geri dönülebilir —
// çağıran başka yola düşer; yanlış kökü bulmak değil, kanca yabancı bir dizindeki
// sözleşmeleri korumaya başlar. Koşulsuz `dirname` tahmini gerçek diye sunuyordu.
function gitSor(start) {
  try {
    const top = path.resolve(
      execFileSync('git', ['-C', path.resolve(start), 'rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    );
    let common = execFileSync('git', ['-C', top, 'rev-parse', '--git-common-dir'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    common = path.resolve(top, common);
    if (path.basename(common).toLowerCase() === '.git') common = path.dirname(common);
    return { top, common };
  } catch {
    return null;
  }
}

// Röle kökü: önce dosya sisteminde yukarı yürünür, bulunamazsa git ana worktree'sine
// sorulur — linked worktree'de açılan oturum ana depodaki röleyi görsün diye.
// `worktree` alanı yalnız git yoluyla bulunduğunda ve ana kökten farklıyken dolar.
// `git: false` diyen çağıran süreç açmaz: statusline her istemde yeniden koşuyor,
// oradaki 20-60 ms doğrudan gecikme olarak görünür.
function roleKoku(start, secenek) {
  let d = path.resolve(start || '.');
  for (;;) {
    const c = path.join(d, '.claude', 'relay');
    if (fs.existsSync(c)) return { relay: c, worktree: null };
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  if (secenek && secenek.git === false) return null;
  const git = gitBilgisi(start);
  if (!git) return null;
  const relay = path.join(git.common, '.claude', 'relay');
  if (!fs.existsSync(relay)) return null;
  return { relay, worktree: norm(git.top) !== norm(git.common) ? git.top : null };
}

// 2.0.0'da `canli/` → `live/` oldu. Eski klasörü olan projede oraya yazmaya devam
// ederiz; yoksa yeni adı kullanırız. Kimsenin izi kaybolmaz.
function izKoku(root) {
  const yeni = path.join(root, 'live');
  const eski = path.join(root, 'canli');
  return !fs.existsSync(yeni) && fs.existsSync(eski) ? eski : yeni;
}

// İki ayrı soru, iki ayrı ölçüt — ortaklaşan gövde, ortaklaşmayan işaretler.
// `kapsayici` üst klasörü projeden ayırmaya çalışıyor: oturum `Projeler` altında
// açıldığında orada da bir `.claude` oluşur, onu proje işareti saymak kapsayıcı
// tespitini tümden kapatır. `filo` ise uzak denetime girecek her klasörü topluyor;
// orada belgeyle ayakta duran proje de sayılır.
const PROJE_IZI = {
  kapsayici: ['.git', 'package.json', '.claude/relay'],
  filo: ['.git', 'AGENTS.md', 'package.json', '.claude', 'CLAUDE.md'],
};

// ÖLÇÜLDÜ: `kok` her araç çağrısında bir `readdirSync` ve alt klasör başına üç
// `existsSync` yapıyordu; yirmi projelik üst klasörde altmışın üzerinde dosya sorgusu.
// Yanıt aynı dizin için değişmez, kanca süreci tek olay yaşar — bir kez sorulur.
const _projeBellek = new Map();

function projeMi(d, izler) {
  const iz = izler || PROJE_IZI.kapsayici;
  const kok = path.resolve(d);
  const anahtar = kok + '|' + iz.join(',');
  if (_projeBellek.has(anahtar)) return _projeBellek.get(anahtar);
  const sonuc = iz.some((f) => varMi(kok, ...f.split('/')));
  _projeBellek.set(anahtar, sonuc);
  return sonuc;
}

module.exports = {
  ev,
  konfigKok,
  transkriptKok,
  transkriptDizini,
  oturumKimligi,
  oturumProfilYolu,
  read,
  yaz,
  norm,
  safe,
  varMi,
  gitBilgisi,
  gitSor,
  roleKoku,
  izKoku,
  projeMi,
  PROJE_IZI,
};
