const fs = require('fs');
const path = require('path');
const { s: ceviri } = require('./dil.js');
const { konfigKok, izKoku, oturumKimligi, read, yaz, safe } = require('./ortak.js');

const SURUCU = /^mcp__computer-use__/;
const PENCERE = /^mcp__Windows-MCP__(.+)$/;
const PENCERE_MUAF = new Set([
  'Screenshot',
  'Snapshot',
  'Scrape',
  'PowerShell',
  'FileSystem',
  'Registry',
  'Process',
  'Wait',
  'Clipboard',
]);

const BASSIZ =
  /(^|\s)-{1,2}(headless|test|no-window|nowindow|no-gui|nogui|offscreen|ci)(=[^\s]*)?(\s|$)/i;
const AYIRAC = /[\n;]|&&|\|\||\|/;
const DOTNET_GUI = /^run$/i;
const PAKET = /^(npm|pnpm|yarn|npx)$/i;
const ELEKTRON = /^electron[\w:.-]*$/i;
const CIKTI_EXE = /(^|[\\/])bin[\\/](debug|release)[\\/].*\.exe$/i;
const BASLAT = /^start-process$/i;
const TUR_TAVAN = 15 * 60 * 1000;
const SURE_TAVAN = 240;

function genelKok() {
  return izKoku(path.join(konfigKok(), 'teknesyum'));
}

function kimlik(sid) {
  return safe(sid || oturumKimligi() || 'oturum');
}

function kuyrukYolu(sid) {
  return path.join(genelKok(), kimlik(sid) + '.ekran.json');
}

function turDamgasi(sid) {
  const d = read(path.join(genelKok(), kimlik(sid) + '.tur'));
  const t = d && Number(d.t);
  return Number.isFinite(t) && t > 0 ? String(t) : null;
}

function kapali() {
  const yol = path.join(konfigKok(), 'teknesyum.json');
  const c = read(yol);
  if (c) return c.ekran_kapisi === false;
  try {
    return /"ekran_kapisi"\s*:\s*false/.test(fs.readFileSync(yol, 'utf8'));
  } catch {
    return false;
  }
}

function acikMi(sid) {
  const a = (read(kuyrukYolu(sid)) || {}).acik;
  if (!a || !Number.isFinite(Number(a.ts))) return false;
  const gecen = Date.now() - Number(a.ts);
  if (gecen < 0) return false;
  if (Number(a.dakika) > 0) return gecen < Number(a.dakika) * 60000;
  const tur = turDamgasi(sid);
  return tur !== null && a.tur === tur && gecen < TUR_TAVAN;
}

function kaydet(sid, degis) {
  const d = read(kuyrukYolu(sid)) || {};
  degis(d);
  try {
    fs.mkdirSync(genelKok(), { recursive: true });
  } catch {}
  yaz(kuyrukYolu(sid), d);
  return d;
}

function damga() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function kuyruga(sid, arac) {
  return kaydet(sid, (d) => {
    d.kuyruk = d.kuyruk || {};
    const k = d.kuyruk[arac] || { kez: 0, ilk: damga() };
    k.kez += 1;
    k.son = damga();
    d.kuyruk[arac] = k;
  });
}

function bildirimGerekli(sid) {
  const tur = turDamgasi(sid);
  let gerek = false;
  kaydet(sid, (d) => {
    gerek = d.bildirim !== tur;
    d.bildirim = tur;
  });
  return gerek;
}

function elektronMu(cwd) {
  try {
    return /electron/i.test(fs.readFileSync(path.join(cwd || '.', 'package.json'), 'utf8'));
  } catch {
    return false;
  }
}

function sozcuk(parca) {
  const s = [];
  for (const m of String(parca).matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g))
    s.push(m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3]);
  while (s.length && (s[0] === '&' || s[0] === 'call' || /^\$?env:/i.test(s[0]))) s.shift();
  return s;
}

function calistirir(parca, cwd) {
  const s = sozcuk(parca);
  if (!s.length) return false;
  const ilk = s[0].replace(/^\.[\\/]/, '');
  if (/^dotnet$/i.test(ilk)) return DOTNET_GUI.test(s[1] || '');
  if (PAKET.test(ilk)) {
    const arg = s[1] === 'run' || s[1] === 'exec' ? s[2] : s[1];
    if (ELEKTRON.test(arg || '')) return true;
    return arg === 'start' && elektronMu(cwd);
  }
  if (BASLAT.test(ilk)) return s.some((x) => /\.exe$/i.test(x));
  return CIKTI_EXE.test(ilk);
}

function arayuzAcar(komut, cwd) {
  for (const parca of String(komut).split(AYIRAC)) {
    if (BASSIZ.test(parca)) continue;
    if (calistirir(parca, cwd)) return true;
  }
  return false;
}

function kol(j) {
  const arac = String(j.tool_name || '');
  if (SURUCU.test(arac)) return 'ekranSurucu';
  const w = arac.match(PENCERE);
  if (w) return PENCERE_MUAF.has(w[1]) ? null : 'ekranSurucu';
  if (arac !== 'Bash') return null;
  return arayuzAcar((j.tool_input || {}).command, j.cwd) ? 'ekranArayuz' : null;
}

function bekleyen(d) {
  const k = (d && d.kuyruk) || {};
  return Object.keys(k)
    .map((ad) => ad + ' ×' + k[ad].kez)
    .join(', ');
}

function karar(j) {
  if (kapali()) return;
  const anahtar = kol(j);
  if (!anahtar) return;
  const sid = j.session_id;
  if (acikMi(sid)) return;
  const d = kuyruga(sid, String(j.tool_name || '?'));
  if (bildirimGerekli(sid)) {
    try {
      process.stdout.write(JSON.stringify({ systemMessage: ceviri('ekranIstek', bekleyen(d)) }));
    } catch {}
  }
  process.stderr.write('ENGELLENDİ: ' + ceviri(anahtar));
  process.exit(2);
}

function ac(arg) {
  const sid = null;
  const istenen = Number(String(arg || '').trim());
  const sureli = Number.isFinite(istenen) && istenen > 0;
  const dakika = sureli ? Math.min(istenen, SURE_TAVAN) : 0;
  const tur = sureli ? null : turDamgasi(sid);
  if (!sureli && tur === null) {
    process.stdout.write(ceviri('ekranDamgaYok') + '\n');
    return;
  }
  let onceki = '';
  kaydet(sid, (d) => {
    onceki = bekleyen(d);
    d.acik = sureli ? { ts: Date.now(), dakika } : { ts: Date.now(), tur };
    d.kuyruk = {};
    d.bildirim = null;
  });
  const satir = [sureli ? ceviri('ekranAcikSure', dakika) : ceviri('ekranAcikTur')];
  if (onceki) satir.push(ceviri('ekranBekleyen', onceki));
  process.stdout.write(satir.join('\n') + '\n');
}

if (process.argv.length > 2) {
  if (process.argv[2] === '--ac') ac(process.argv[3]);
  process.exit(0);
} else {
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
    } catch {}
    process.exit(0);
  });
}
