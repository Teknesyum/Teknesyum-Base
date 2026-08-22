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
const KOMUT = [
  /(^|\s)dotnet\s+run(\s|$)/i,
  /(^|\s)(npm|pnpm|yarn|npx)\s+(run\s+)?electron[\w:.-]*(\s|$)/i,
  /(^|\s)start-process\b[^\n]*\.exe/i,
  /bin[\\/](debug|release)[\\/][^\s"']*\.exe/i,
];
const BASLAT = /(^|\s)(npm|pnpm|yarn)\s+(run\s+)?start(\s|$)/i;

const TUR_TAVAN = 15 * 60 * 1000;

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
  try {
    return String(fs.statSync(path.join(genelKok(), kimlik(sid) + '.tur')).mtimeMs);
  } catch {
    return '';
  }
}

function kapali() {
  const c = read(path.join(konfigKok(), 'teknesyum.json'));
  return !!(c && c.ekran_kapisi === false);
}

function acikMi(sid) {
  const a = (read(kuyrukYolu(sid)) || {}).acik;
  if (!a || !Number.isFinite(Number(a.ts))) return false;
  const gecen = Date.now() - Number(a.ts);
  if (Number(a.dakika) > 0) return gecen < Number(a.dakika) * 60000;
  return a.tur === turDamgasi(sid) && gecen < TUR_TAVAN;
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

function arayuzAcar(komut, cwd) {
  for (const parca of String(komut).split(AYIRAC)) {
    if (BASSIZ.test(parca)) continue;
    if (KOMUT.some((r) => r.test(parca))) return true;
    if (BASLAT.test(parca) && elektronMu(cwd)) return true;
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
  const dakika = Number(String(arg || '').trim());
  const gecerli = Number.isFinite(dakika) && dakika > 0;
  const d = kaydet(sid, (x) => {
    x.acik = gecerli
      ? { ts: Date.now(), dakika: Math.min(dakika, 240) }
      : { ts: Date.now(), tur: turDamgasi(sid) };
  });
  const satir = [gecerli ? ceviri('ekranAcikSure', Math.min(dakika, 240)) : ceviri('ekranAcikTur')];
  const b = bekleyen(d);
  if (b) satir.push(ceviri('ekranBekleyen', b));
  process.stdout.write(satir.join('\n') + '\n');
}

function durum() {
  const sid = null;
  const d = read(kuyrukYolu(sid)) || {};
  const satir = [acikMi(sid) ? ceviri('ekranAcik') : ceviri('ekranKapali')];
  const b = bekleyen(d);
  if (b) satir.push(ceviri('ekranBekleyen', b));
  process.stdout.write(satir.join('\n') + '\n');
}

if (process.argv.length > 2) {
  const bayrak = process.argv[2];
  if (bayrak === '--ac') ac(process.argv[3]);
  else durum();
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
