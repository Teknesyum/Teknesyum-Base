const fs = require('fs');
const path = require('path');

// Proje içi bağ haritası. Model çağırmaz, ayrıştırıcı kurmaz — kaynak dosyalardan
// import/require/using satırlarını okur, dosya→dosya kenarları çıkarır. Maliyeti disk
// okumasıdır; ajan dosya açmak yerine bu haritayı sorgular.

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
  'graphify-out',
  '.next',
  '.claude',
  'Debug',
  'Release',
]);
const KAYNAK = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.cs']);
const COZUM = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
];

const JS_IMPORT = /(?:^|[^\w.])(?:import|export)\s+(?:[^'"\n;]*?\sfrom\s*)?['"]([^'"]+)['"]/g;
const JS_REQUIRE = /(?:^|[^\w.])(?:require|import)\s*\(\s*['"]([^'"]+)['"]/g;
const PY_IMPORT = /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm;
const CS_USING = /^\s*using\s+(?:static\s+)?([\w.]+)\s*;/gm;
const CS_NS = /^\s*namespace\s+([\w.]+)/m;

function tara(kok) {
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
      if (e.name.startsWith('.')) continue;
      const tam = path.join(d, e.name);
      if (e.isDirectory()) {
        if (!ATLA.has(e.name)) yigin.push(tam);
      } else if (KAYNAK.has(path.extname(e.name).toLowerCase())) {
        out.push(tam);
      }
    }
  }
  return out.sort();
}

function esle(re, metin) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(metin))) {
    const v = m[1] || m[2];
    if (v) out.push(v);
  }
  return out;
}

function coz(kaynak, spec, varlik) {
  if (!spec.startsWith('.')) return null;
  const temel = path.resolve(path.dirname(kaynak), spec);
  for (const ek of COZUM) {
    const aday = path.normalize(temel + ek);
    if (varlik.has(aday)) return aday;
  }
  return null;
}

function kur(kok) {
  const dosyalar = tara(kok);
  const varlik = new Set(dosyalar);
  const csAd = new Map();
  const govde = new Map();

  for (const f of dosyalar) {
    let s = '';
    try {
      s = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    govde.set(f, s);
    if (path.extname(f).toLowerCase() === '.cs') {
      const m = s.match(CS_NS);
      // C#'ta `using` bir dosyayi degil ad alanini gosterir; ad alanini tek bir dosyaya
      // baglamak sahte kenar uretiyordu. Ad alani kendi dugumudur, altinda dosyalari durur.
      if (m) csAd.set(m[1], (csAd.get(m[1]) || []).concat(f));
    }
  }

  const dugum = new Map();
  for (const f of dosyalar) {
    dugum.set(f, {
      ic: [],
      ns: [],
      dis: [],
      gelen: [],
      satir: (govde.get(f) || '').split('\n').length,
    });
  }

  for (const f of dosyalar) {
    const s = govde.get(f) || '';
    const uz = path.extname(f).toLowerCase();
    let spec;
    if (uz === '.py') spec = esle(PY_IMPORT, s);
    else if (uz === '.cs') spec = esle(CS_USING, s);
    else spec = esle(JS_IMPORT, s).concat(esle(JS_REQUIRE, s));

    const n = dugum.get(f);
    for (const sp of spec) {
      const hedef = coz(f, sp, varlik);
      if (hedef && hedef !== f) {
        if (!n.ic.includes(hedef)) n.ic.push(hedef);
      } else if (!hedef && uz === '.cs' && csAd.has(sp)) {
        if (!n.ns.includes(sp)) n.ns.push(sp);
      } else if (!hedef && !sp.startsWith('.')) {
        const d = sp.split('/')[0].split('.')[0];
        if (d && !n.dis.includes(d)) n.dis.push(d);
      }
    }
  }

  for (const [f, n] of dugum) for (const h of n.ic) dugum.get(h).gelen.push(f);
  return { dugum, csAd };
}

// Döngü refactor sırasındaki en pahalı sürprizdir: iki modül birbirini çağırıyorsa
// birini taşımak diğerini kırar. Ajan bunu dosya açmadan görmeli.
function donguler(dugum) {
  const durum = new Map();
  const yol = [];
  const bulunan = [];
  function gez(f) {
    durum.set(f, 1);
    yol.push(f);
    for (const h of dugum.get(f).ic) {
      const d = durum.get(h) || 0;
      if (d === 1) {
        const i = yol.indexOf(h);
        if (i >= 0) bulunan.push(yol.slice(i).concat(h));
      } else if (d === 0) gez(h);
    }
    yol.pop();
    durum.set(f, 2);
  }
  for (const f of dugum.keys()) if (!durum.get(f)) gez(f);
  return bulunan.slice(0, 20);
}

function yaz(kok, grafik) {
  const { dugum, csAd } = grafik;
  const rel = (f) => path.relative(kok, f).replace(/\\/g, '/');
  const liste = [...dugum.entries()];
  const bag = liste.reduce((a, [, n]) => a + n.ic.length + n.ns.length, 0);

  const merkez = liste
    .filter(([, n]) => n.gelen.length > 1)
    .sort((a, b) => b[1].gelen.length - a[1].gelen.length)
    .slice(0, 12);
  const yetim = liste.filter(([, n]) => !n.gelen.length && !n.ic.length && !n.ns.length);
  const nsSay = new Map();
  for (const [, n] of liste) for (const a of n.ns) nsSay.set(a, (nsSay.get(a) || 0) + 1);
  const adAlani = [...nsSay.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const dngs = donguler(dugum);

  const L = [];
  L.push('# Harita — ' + path.basename(kok));
  L.push('');
  L.push(liste.length + ' dosya · ' + bag + ' bağ · ' + new Date().toISOString().slice(0, 10));
  L.push('');
  L.push('`node harita.js` üretti, elle düzenleme. Dosya açmadan önce buraya bak.');
  if (merkez.length) {
    L.push('');
    L.push('## Merkezler — dokunmadan önce düşün');
    for (const [f, n] of merkez) L.push('- `' + rel(f) + '` ← ' + n.gelen.length);
  }
  if (dngs.length) {
    L.push('');
    L.push('## Döngüler');
    for (const c of dngs) L.push('- ' + c.map(rel).join(' → '));
  }
  if (yetim.length) {
    L.push('');
    L.push('## Yetimler — kimse almıyor, kimseyi almıyor');
    for (const [f] of yetim.slice(0, 40)) L.push('- `' + rel(f) + '`');
  }
  if (adAlani.length) {
    L.push('');
    L.push('## Ad alanları — kaç dosya kullanıyor');
    for (const [a, c] of adAlani) {
      const d = (csAd.get(a) || []).map(rel);
      const kuyruk = d.slice(0, 4).join(', ') + (d.length > 4 ? ' …' : '');
      L.push('- `' + a + '` ← ' + c + '  ·  ' + kuyruk);
    }
  }
  L.push('');
  L.push('## Bağlar');
  for (const [f, n] of liste) {
    const hedef = n.ic.map(rel).concat(n.ns.map((a) => 'ns:' + a));
    if (!hedef.length) continue;
    L.push('`' + rel(f) + '` (' + n.satir + 's) → ' + hedef.join(', '));
  }
  L.push('');

  const json = {};
  for (const [f, n] of liste) {
    json[rel(f)] = {
      satir: n.satir,
      ic: n.ic.map(rel),
      ns: n.ns,
      gelen: n.gelen.map(rel),
      dis: n.dis.sort(),
    };
  }

  const relay = path.join(kok, '.claude', 'relay');
  const hedef = fs.existsSync(relay) ? relay : path.join(kok, '.claude');
  fs.mkdirSync(hedef, { recursive: true });
  fs.writeFileSync(path.join(hedef, 'harita.md'), L.join('\n'), 'utf8');
  fs.writeFileSync(path.join(hedef, 'harita.json'), JSON.stringify(json, null, 1), 'utf8');
  return { hedef, dosya: liste.length, bag, dongu: dngs.length, yetim: yetim.length };
}

function main() {
  const arg = process.argv.slice(2).filter((x) => !x.startsWith('--'));
  const kok = path.resolve(arg[0] || process.cwd());
  const r = yaz(kok, kur(kok));
  process.stdout.write(
    r.dosya +
      ' dosya · ' +
      r.bag +
      ' bağ · ' +
      r.dongu +
      ' döngü · ' +
      r.yetim +
      ' yetim → ' +
      path.relative(kok, r.hedef).replace(/\\/g, '/') +
      '/harita.md\n'
  );
}

if (require.main === module) main();
module.exports = { kur, yaz, tara };
