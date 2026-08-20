const fs = require('fs');
const path = require('path');

// Taşınabilirlik denetimi. Model çağırmaz: kaynağı okur, tek platforma çivileyen kalıpları
// listeler. "Üç platformu destekliyoruz" iddiası ancak ölçülürse doğrudur; bu dosya ölçer.

const ATLA = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'bin',
  'obj',
  'coverage',
  'target',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  '.next',
  'Debug',
  'Release',
]);

const KAYNAK = new Set([
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.py',
  '.cs',
  '.rs',
  '.go',
  '.java',
  '.ps1',
  '.sh',
  '.csproj',
  '.yml',
  '.yaml',
  '.json',
  '.xaml',
]);

const KURAL = [
  {
    ad: 'gömülü sürücü harfi',
    re: /["'`][A-Za-z]:[\\/]/g,
    not: 'yol çalışma zamanında çözülmeli',
  },
  {
    ad: 'gömülü ev dizini',
    re: /%USERPROFILE%|%APPDATA%|%LOCALAPPDATA%|["'`]\/home\/|["'`]\/Users\//g,
    not: 'os.homedir() / Environment.GetFolderPath kullan',
  },
  {
    ad: 'kabuk çağrısı',
    re: /cmd\.exe|powershell(\.exe)?\s+-|\/bin\/(ba)?sh\b|shell:\s*true/g,
    not: 'süreci argüman dizisiyle doğrudan başlat',
  },
  {
    ad: 'tek platform hedefi',
    re: /<TargetFramework>[^<]*-windows<|<UseWPF>|<UseWindowsForms>|<RuntimeIdentifiers?>win-/g,
    not: 'çok platform isteniyorsa Avalonia; kabuk katmanıysa kapatma gerekçesi yaz',
  },
  {
    ad: 'ters bölü ile yol',
    re: /["'`][^"'`\n]*\\\\[^"'`\n]*["'`]\s*\+|\+\s*["'`]\\\\/g,
    not: 'path.join / Path.Combine',
  },
  {
    ad: 'platform dallanması',
    re: /process\.platform\s*===?\s*["'`]win32|OSPlatform\.Windows|sys\.platform\s*==\s*["'`]win/g,
    not: 'bilgi amaçlı — kabuk katmanında normal, iş mantığında değil',
    bilgi: true,
  },
];

function dosyalar(kok) {
  const out = [];
  const yigin = [kok];
  while (yigin.length) {
    const d = yigin.pop();
    let liste;
    try {
      liste = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of liste) {
      const tam = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!ATLA.has(e.name) && (e.name === '.github' || !e.name.startsWith('.'))) yigin.push(tam);
      } else if (KAYNAK.has(path.extname(e.name).toLowerCase())) {
        out.push(tam);
      }
    }
  }
  return out.sort();
}

function ayar(kok) {
  try {
    return JSON.parse(fs.readFileSync(path.join(kok, '.claude', 'teknesyum.json'), 'utf8'));
  } catch {
    return {};
  }
}

// Linux'ta `Utils.js` ile `utils.js` iki ayrı dosyadır. Windows'ta yazılan yanlış import
// orada patlar ve hata mesajı sebebi göstermez; çakışmayı burada yakalamak ucuzdur.
function harfCakismasi(liste, kok) {
  const gorulen = new Map();
  const out = [];
  for (const f of liste) {
    const k = path.relative(kok, f).toLowerCase();
    if (gorulen.has(k)) out.push([gorulen.get(k), f]);
    else gorulen.set(k, f);
  }
  return out;
}

function ciMatrisi(kok) {
  const dizin = path.join(kok, '.github', 'workflows');
  let liste = [];
  try {
    liste = fs.readdirSync(dizin).filter((f) => /\.ya?ml$/i.test(f));
  } catch {
    return null;
  }
  const eksik = new Set(['ubuntu', 'macos', 'windows']);
  for (const f of liste) {
    let s = '';
    try {
      s = fs.readFileSync(path.join(dizin, f), 'utf8');
    } catch {
      continue;
    }
    for (const os of [...eksik]) if (s.includes(os + '-')) eksik.delete(os);
  }
  return [...eksik];
}

function denetle(kok) {
  const cfg = ayar(kok);
  const liste = dosyalar(kok);
  const bulgu = [];

  for (const f of liste) {
    if (path.resolve(f) === path.resolve(__filename)) continue;
    let s = '';
    try {
      s = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const satirlar = s.split('\n');
    for (const k of KURAL) {
      k.re.lastIndex = 0;
      let m;
      while ((m = k.re.exec(s))) {
        const satir = s.slice(0, m.index).split('\n').length;
        const govde = satirlar[satir - 1] || '';
        if (/^\s*(re|pattern|regex)\s*:|new RegExp\(/.test(govde)) continue;
        bulgu.push({
          kural: k.ad,
          bilgi: !!k.bilgi,
          not: k.not,
          dosya: path.relative(kok, f).replace(/\\/g, '/'),
          satir,
          metin: govde.trim().slice(0, 90),
        });
      }
    }
  }

  return {
    platformlar: cfg.platformlar || null,
    neden: cfg.platformNeden || '',
    dosya: liste.length,
    bulgu,
    cakisma: harfCakismasi(liste, kok),
    ciEksik: ciMatrisi(kok),
  };
}

function yaz(r) {
  const L = [];
  if (r.platformlar) {
    L.push(
      'Kural bu projede kapalı · platformlar: ' +
        r.platformlar.join(', ') +
        (r.neden ? ' · ' + r.neden : ' · gerekçe yazılmamış')
    );
    L.push('');
  }
  const gercek = r.bulgu.filter((b) => !b.bilgi);
  const bilgi = r.bulgu.filter((b) => b.bilgi);

  const grup = new Map();
  for (const b of gercek) grup.set(b.kural, (grup.get(b.kural) || []).concat(b));
  for (const [ad, liste] of grup) {
    L.push(ad + ' (' + liste.length + ') — ' + liste[0].not);
    for (const b of liste.slice(0, 8)) L.push('  ' + b.dosya + ':' + b.satir + '  ' + b.metin);
    if (liste.length > 8) L.push('  … ' + (liste.length - 8) + ' tane daha');
    L.push('');
  }
  if (r.cakisma.length) {
    L.push('harf çakışması (' + r.cakisma.length + ') — Linux bunları iki dosya sayar');
    for (const [a, b] of r.cakisma.slice(0, 8)) L.push('  ' + a + '  ↔  ' + b);
    L.push('');
  }
  if (r.ciEksik === null) L.push('CI iş akışı yok — üç platform ölçülmüyor');
  else if (r.ciEksik.length) L.push('CI matrisinde eksik: ' + r.ciEksik.join(', '));
  else L.push('CI matrisi üç platformu da koşuyor');
  L.push('');
  L.push(
    r.dosya +
      ' dosya · ' +
      gercek.length +
      ' bulgu · ' +
      bilgi.length +
      ' bilgi notu · ' +
      r.cakisma.length +
      ' harf çakışması'
  );
  return L.join('\n') + '\n';
}

function main() {
  const arg = process.argv.slice(2);
  const kati = arg.includes('--kati');
  const kok = path.resolve(arg.find((a) => !a.startsWith('--')) || process.cwd());
  // ÖLÇÜLDÜ: olmayan yol için çıktı "0 dosya · 0 bulgu" idi — temiz proje ile yanlış yol
  // aynı görünüyordu. Yol yoksa ölçüm yapılmamıştır; sessiz geçilmez.
  if (!fs.existsSync(kok)) {
    process.stderr.write('yol yok: ' + kok + '\n');
    process.exitCode = 2;
    return;
  }
  const r = denetle(kok);
  process.stdout.write(yaz(r));
  if (kati && !r.platformlar && r.bulgu.some((b) => !b.bilgi)) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { denetle, yaz };
