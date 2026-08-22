const fs = require('fs');
const path = require('path');

// Oturum projenin kendisinde değil, projeleri barındıran üst klasörde açıldığında
// Claude Code'un proje başına tuttuğu her şey o üst klasöre yazılır: ajan hafızası
// `<üst>/.claude/agent-memory` altına düşer, on proje aynı kovayı paylaşır. Klasör
// seçimini kullanıcıdan beklemek yerine hangi projede çalışıldığını izleriz ve turun
// sonunda üst klasörde biriken hafızayı ait olduğu projeye taşırız.

function varMi(...p) {
  try {
    return fs.existsSync(path.join(...p));
  } catch {
    return false;
  }
}

// ÖLÇÜLDÜ: `kok` her araç çağrısında bir `readdirSync` ve alt klasör başına üç
// `existsSync` yapıyordu; yirmi projelik üst klasörde altmışın üzerinde dosya sorgusu.
// Yanıt aynı dizin için değişmez, kanca süreci tek olay yaşar — bir kez sorulur.
const _projeBellek = new Map();
const _kokBellek = new Map();

function projeMi(d) {
  const anahtar = path.resolve(d);
  if (_projeBellek.has(anahtar)) return _projeBellek.get(anahtar);
  const sonuc =
    varMi(anahtar, '.git') || varMi(anahtar, 'package.json') || varMi(anahtar, '.claude', 'relay');
  _projeBellek.set(anahtar, sonuc);
  return sonuc;
}

function altlar(d) {
  try {
    return fs
      .readdirSync(d, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

// Kapsayıcı klasör: kendisi proje değil, ama altında en az bir proje var.
function kok(cwd) {
  const d = path.resolve(cwd || '.');
  if (_kokBellek.has(d)) return _kokBellek.get(d);
  const sonuc = kokSor(d);
  _kokBellek.set(d, sonuc);
  return sonuc;
}

function kokSor(d) {
  if (projeMi(d)) return null;
  return altlar(d).some((a) => projeMi(path.join(d, a))) ? d : null;
}

function altProje(kap, hedef) {
  if (!hedef) return null;
  let m;
  try {
    m = path.resolve(String(hedef));
  } catch {
    return null;
  }
  const dip = path.resolve(kap) + path.sep;
  if (!m.toLowerCase().startsWith(dip.toLowerCase())) return null;
  const ad = m.slice(dip.length).split(/[\\/]/)[0];
  if (!ad) return null;
  const yol = path.join(kap, ad);
  return projeMi(yol) ? { ad, yol } : null;
}

function durumOku(dosya) {
  try {
    return JSON.parse(fs.readFileSync(dosya, 'utf8'));
  } catch {
    return {};
  }
}

function durumYaz(dosya, d) {
  try {
    fs.mkdirSync(path.dirname(dosya), { recursive: true });
    fs.writeFileSync(dosya, JSON.stringify(d), 'utf8');
  } catch {}
}

function hedefYolu(j) {
  const t = j.tool_input || {};
  return t.file_path || t.path || t.notebook_path || null;
}

// Etkin proje son dokunulan projedir: hafıza turun sonunda taşınır, tur içinde
// çalışılan proje de sondan bir önceki değil sonuncusudur.
function izle(kap, dosya, j) {
  const p = altProje(kap, hedefYolu(j));
  if (!p) return null;
  const d = durumOku(dosya);
  if (d.etkin === p.yol) return p;
  d.etkin = p.yol;
  d.ad = p.ad;
  durumYaz(dosya, d);
  return p;
}

function etkin(dosya) {
  const d = durumOku(dosya);
  return d.etkin && fs.existsSync(d.etkin) ? { ad: d.ad, yol: d.etkin } : null;
}

function dosyalar(d) {
  try {
    return fs.readdirSync(d, { withFileTypes: true });
  } catch {
    return [];
  }
}

// MEMORY.md hafızanın dizini; üzerine yazmak karşı taraftaki satırları siler. İki
// dosya satır satır birleştirilir, tekrar eden satır bir kez kalır.
function dizinBirlestir(kaynak, varis) {
  const oku = (y) => {
    try {
      return fs.readFileSync(y, 'utf8').split(/\r?\n/);
    } catch {
      return [];
    }
  };
  const satir = [];
  for (const s of oku(varis).concat(oku(kaynak))) {
    const t = s.trim();
    if (!t || satir.includes(s)) continue;
    satir.push(s);
  }
  fs.writeFileSync(varis, satir.join('\n') + '\n', 'utf8');
}

function bosSil(d) {
  try {
    if (!fs.readdirSync(d).length) fs.rmdirSync(d);
  } catch {}
}

const CAKISMA_TAVANI = 50;

function bosAd(b) {
  for (let i = 2; i <= CAKISMA_TAVANI; i++) {
    const aday = b.replace(/(\.md)?$/, '-' + i + '$1');
    if (!fs.existsSync(aday)) return aday;
  }
  return null;
}

// Üst klasörde biriken ajan hafızasını etkin projeye taşır. Taşınan dosya sayısını
// döndürür; taşıyacak bir şey yoksa 0 ve hiçbir yere dokunulmaz.
function tasi(kap, hedef) {
  const kaynakKok = path.join(kap, '.claude', 'agent-memory');
  if (!hedef || !fs.existsSync(kaynakKok)) return 0;
  let n = 0;
  for (const ajan of dosyalar(kaynakKok)) {
    if (!ajan.isDirectory()) continue;
    const kaynak = path.join(kaynakKok, ajan.name);
    const varis = path.join(hedef, '.claude', 'agent-memory', ajan.name);
    try {
      fs.mkdirSync(varis, { recursive: true });
    } catch {
      continue;
    }
    for (const f of dosyalar(kaynak)) {
      if (!f.isFile()) continue;
      const a = path.join(kaynak, f.name);
      const b = path.join(varis, f.name);
      try {
        if (f.name === 'MEMORY.md' && fs.existsSync(b)) {
          dizinBirlestir(a, b);
          fs.unlinkSync(a);
        } else if (fs.existsSync(b)) {
          if (fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8')) fs.unlinkSync(a);
          else {
            const aday = bosAd(b);
            if (!aday) continue;
            fs.renameSync(a, aday);
          }
        } else {
          fs.renameSync(a, b);
        }
        n++;
      } catch {}
    }
    bosSil(kaynak);
  }
  bosSil(kaynakKok);
  bosSil(path.join(kap, '.claude'));
  return n;
}

module.exports = { kok, projeMi, altProje, izle, etkin, tasi, dizinBirlestir };
