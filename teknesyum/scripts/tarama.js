#!/usr/bin/env node

// Profil standardı denetimi — sertifika. Projenin şu anki halinin eco/normal/premium
// ölçütlerine uyup uymadığını dört maddede söyler: ön araştırma, kapsam, denetim, belge.
//
// Betik salt okurdur. Hiçbir dosyayı değiştirmez, ajan açmaz, model çağırmaz —
// `--tamamla` bayrağı da bunu değiştirmez, yalnız çıktıya "T0 ne yapmalı" bölümü ekler.
//
// Eşikler burada ikinci kez yazılmaz: `research_repos`, `audit`, `default_model` ve
// `parallel_width` `premium.js` içindeki `DUGME` tablosundan okunur. `premium.js`
// `require` edilemez — dosya yüklenince argümanla profil yazmaya başlar — o yüzden
// tablo metinden ayrıştırılır. Yalnız bu betiğe özgü olan üç ölçüt aşağıda durur.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tara, kur } = require('./harita.js');
const { roleKoku, norm } = require('../hooks/ortak.js');

const PROFILLER = ['eco', 'normal', 'premium'];

const OLCUT = {
  eco: { kapsam: 'degisen', efor: '', belge: [] },
  normal: { kapsam: 'komsu', efor: '', belge: ['README'] },
  premium: { kapsam: 'tum', efor: 'high', belge: ['README', 'CHANGELOG', 'SKILL'] },
};

const KAPSAM_ADI = {
  degisen: 'değişen dosyalar',
  komsu: 'değişen dosyalar + komşuları',
  tum: 'baştan sona, her kaynak dosya',
};

const MODEL_SIRA = { haiku: 1, sonnet: 2, fable: 2, opus: 3 };
const EFOR_SIRA = { low: 1, medium: 2, high: 3, xhigh: 4 };

const MUHUR = /^audit:[ \t]*(passed|gecti)[ \t]*$/im;
const KANIT = ['auditor_id', 'diff', 'verification'].map(
  (ad) => new RegExp('^' + ad + ':[ \\t]*(?![—\\-]?[ \\t]*$)\\S', 'im')
);

const BELGE = {
  README: { ad: 'README.md', desen: /^readme\.md$/i },
  CHANGELOG: { ad: 'CHANGELOG.md', desen: /^changelog\.md$/i },
  SKILL: { ad: 'SKILL.md', desen: /^skill\.md$/i },
};

function oku(f) {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch {
    return null;
  }
}

function jsonOku(f) {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
}

function dosyalar(d) {
  try {
    return fs.readdirSync(d);
  } catch {
    return [];
  }
}

// `DUGME` gövdesi biome ile biçimlenir: iki boşluk girinti, tek tırnaklı değerler.
// Ayrıştırma başarısız olursa varsayılana düşülmez — eşiği uydurmak, eşiksiz kalmaktan
// kötüdür; çağıran taraf durur.
function dugmeTablosu() {
  const govde = oku(path.join(__dirname, 'premium.js'));
  if (!govde) return null;
  const tablo = govde.match(/const DUGME = \{([\s\S]*?)\n\};/);
  if (!tablo) return null;
  const out = {};
  for (const p of PROFILLER) {
    const blok = tablo[1].match(new RegExp('\\n  ' + p + ': \\{([\\s\\S]*?)\\n  \\}'));
    if (!blok) return null;
    const d = {};
    const re = /^[ \t]*([a-z_]+)[ \t]*:[ \t]*'([^']*)'/gm;
    let m;
    while ((m = re.exec(blok[1]))) d[m[1]] = m[2];
    out[p] = d;
  }
  return out;
}

function gorece(kok, f) {
  return path.relative(kok, f).replace(/\\/g, '/');
}

function git(kok, ...arg) {
  try {
    return execFileSync('git', ['-C', kok, ...arg], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
  } catch {
    return null;
  }
}

// Değişen küme iki kaynaktan gelir: çalışma ağacındaki fark ve son commit. Yalnız
// çalışma ağacına bakmak, işi commit'leyen oturumda kümeyi boşaltıyordu.
function degisenler(kok) {
  const durum = git(kok, 'status', '--porcelain');
  if (durum === null) return null;
  const out = new Set();
  for (const satir of durum.split('\n')) {
    const p = satir.slice(3).trim();
    if (p) out.add(p.split(' -> ').pop().replace(/^"|"$/g, ''));
  }
  const son = git(kok, 'diff', '--name-only', 'HEAD~1', 'HEAD');
  for (const satir of (son || '').split('\n')) {
    if (satir.trim()) out.add(satir.trim());
  }
  return out;
}

function modelSirasi(m) {
  const s = String(m || '').toLowerCase();
  for (const ad of Object.keys(MODEL_SIRA)) if (s.includes(ad)) return MODEL_SIRA[ad];
  return 0;
}

function eforSirasi(e) {
  return EFOR_SIRA[String(e || '').toLowerCase()] || 0;
}

function surum(kok) {
  const p = jsonOku(path.join(kok, 'package.json'));
  if (p && p.version) return String(p.version);
  const e = jsonOku(path.join(kok, '.claude-plugin', 'plugin.json'));
  if (e && e.version) return String(e.version);
  for (const d of dosyalar(kok)) {
    const alt = jsonOku(path.join(kok, d, '.claude-plugin', 'plugin.json'));
    if (alt && alt.version) return String(alt.version);
  }
  return null;
}

function belgeAra(kok, anahtar) {
  const b = BELGE[anahtar];
  for (const d of dosyalar(kok)) if (b.desen.test(d)) return path.join(kok, d);
  if (anahtar !== 'SKILL') return null;
  const yigin = [kok];
  const atla = new Set(['node_modules', '.git', 'dist', 'build', 'out']);
  while (yigin.length) {
    const d = yigin.pop();
    for (const e of (() => {
      try {
        return fs.readdirSync(d, { withFileTypes: true });
      } catch {
        return [];
      }
    })()) {
      if (e.isDirectory()) {
        if (!atla.has(e.name) && !e.name.startsWith('.')) yigin.push(path.join(d, e.name));
      } else if (b.desen.test(e.name)) return path.join(d, e.name);
    }
  }
  return null;
}

function onArastirma(kok, esik) {
  const dizin = path.join(kok, 'docs', 'taramalar');
  const hepsi = dosyalar(dizin).filter((f) => /\.md$/i.test(f));
  const depo = hepsi.filter((f) => !/^(RAPOR|ATLANDI)\.md$/i.test(f));
  const atlandi = hepsi.some((f) => /^ATLANDI\.md$/i.test(f));
  return {
    ad: 'Ön araştırma',
    gecti: depo.length >= esik,
    olcu: depo.length + '/' + esik + ' depo · docs/taramalar/',
    eksik: depo.length >= esik ? [] : [esik - depo.length + ' depo daha taranmalı'],
    atlandi,
    var: depo.length,
    esik,
  };
}

function kapsamHedefi(kok, kip, notlar) {
  const kaynak = tara(kok).map((f) => gorece(kok, f));
  if (kip === 'tum') return kaynak;
  const degisen = degisenler(kok);
  if (!degisen) {
    notlar.push('git sorulamadı — değişen dosya kümesi ölçülemedi, kapsam boş sayıldı');
    return [];
  }
  const kume = new Set(kaynak.filter((f) => degisen.has(f)));
  if (kip === 'komsu') {
    const { dugum } = kur(kok);
    for (const [f, n] of dugum) {
      const r = gorece(kok, f);
      if (!kume.has(r)) continue;
      for (const h of n.ic) kume.add(gorece(kok, h));
      for (const h of n.gelen) kume.add(gorece(kok, h));
    }
  }
  return [...kume].sort();
}

function kapsam(kok, relay, profil, dugme, notlar) {
  const kip = OLCUT[profil].kapsam;
  const hedef = kapsamHedefi(kok, kip, notlar);
  const kayit = relay ? jsonOku(path.join(relay, 'kapsam.json')) : null;
  if (!kayit) {
    notlar.push(
      relay
        ? 'kapsam.json yok — inceleme kaydı henüz oluşmamış, her dosya incelenmemiş sayıldı'
        : 'röle kökü bulunamadı — kapsam kaydı okunamadı'
    );
  }
  const gerekenModel = dugme.default_model;
  const gerekenEfor = OLCUT[profil].efor;
  const mSira = modelSirasi(gerekenModel);
  const eSira = eforSirasi(gerekenEfor);

  const incelenmemis = [];
  const dusuk = [];
  for (const f of hedef) {
    const k = kayit && kayit[f];
    if (!k) {
      incelenmemis.push(f);
      continue;
    }
    if (modelSirasi(k.model) < mSira) {
      dusuk.push(f + ' — ' + (k.model || 'model bilinmiyor') + ', ' + gerekenModel + ' gerekli');
      continue;
    }
    if (eSira && eforSirasi(k.effort) < eSira) {
      dusuk.push(f + ' — efor ' + (k.effort || 'bilinmiyor') + ', ' + gerekenEfor + ' gerekli');
    }
  }

  const temiz = hedef.length - incelenmemis.length - dusuk.length;
  const eksik = [];
  if (incelenmemis.length) eksik.push(incelenmemis.length + ' dosya hiç incelenmemiş');
  if (dusuk.length) eksik.push(dusuk.length + ' dosya profilin altında incelenmiş');
  return {
    ad: 'Kapsam',
    gecti: !incelenmemis.length && !dusuk.length,
    olcu:
      temiz +
      '/' +
      hedef.length +
      ' dosya · ' +
      KAPSAM_ADI[kip] +
      ' · ' +
      gerekenModel +
      (gerekenEfor ? '/' + gerekenEfor + '+' : '+'),
    eksik,
    incelenmemis,
    dusuk,
    hedef: hedef.length,
    gereken: { model: gerekenModel, efor: gerekenEfor || null },
  };
}

function owns(govde) {
  const m = String(govde).match(/^owns:[ \t]*(.*)$/m);
  if (!m) return 0;
  const satir = m[1].trim();
  if (satir.startsWith('[')) return satir.replace(/[[\]]/g, '').split(',').filter(Boolean).length;
  const kuyruk = String(govde)
    .slice(m.index + m[0].length)
    .split('\n');
  let n = 0;
  for (const s of kuyruk) {
    if (/^[ \t]+-[ \t]*\S/.test(s)) n++;
    else if (s.trim()) break;
  }
  return n;
}

function denetim(relay, dugme) {
  const kip = dugme.audit;
  const dizin = relay ? path.join(relay, 'contracts', 'done') : null;
  const hepsi = dizin ? dosyalar(dizin).filter((f) => /\.md$/i.test(f)) : [];
  const muhursuz = [];
  let bakilan = 0;
  for (const f of hepsi) {
    const govde = oku(path.join(dizin, f)) || '';
    const kritik = owns(govde) >= 3;
    if (kip === 'off') continue;
    if (kip === 'critical' && !kritik) continue;
    bakilan++;
    if (!MUHUR.test(govde) || !KANIT.every((r) => r.test(govde))) muhursuz.push(f);
  }
  const aciklama =
    kip === 'off'
      ? 'denetim kapalı'
      : kip === 'critical'
        ? 'yalnız kritik sözleşmeler (owns ≥ 3)'
        : 'her sözleşme';
  return {
    ad: 'Denetim',
    gecti: !muhursuz.length,
    olcu: bakilan - muhursuz.length + '/' + bakilan + ' sözleşme mühürlü · ' + aciklama,
    eksik: muhursuz.length ? [muhursuz.length + ' sözleşmenin mührü eksik veya çürük'] : [],
    muhursuz,
    kip,
    biten: hepsi.length,
  };
}

function belge(kok, profil) {
  const istenen = OLCUT[profil].belge;
  const s = surum(kok);
  const durum = [];
  const eksik = [];
  for (const anahtar of istenen) {
    const yol = belgeAra(kok, anahtar);
    if (!yol) {
      if (anahtar === 'SKILL') {
        durum.push('SKILL.md — projede skill yok, sayılmadı');
        continue;
      }
      eksik.push(BELGE[anahtar].ad + ' yok');
      durum.push(BELGE[anahtar].ad + ' — yok');
      continue;
    }
    const govde = oku(yol) || '';
    if (!govde.trim()) {
      eksik.push(BELGE[anahtar].ad + ' boş');
      durum.push(BELGE[anahtar].ad + ' — boş');
      continue;
    }
    if (anahtar === 'CHANGELOG' && s) {
      const en = (govde.match(/^##[ \t]*\[?v?(\d+\.\d+\.\d+)\]?/m) || [])[1];
      if (en !== s) {
        eksik.push('CHANGELOG.md en üstte ' + (en || 'sürüm başlığı yok') + ', sürüm ' + s);
        durum.push('CHANGELOG.md — ' + (en || 'başlıksız') + ' ≠ ' + s);
        continue;
      }
      durum.push('CHANGELOG.md — ' + en);
      continue;
    }
    durum.push(gorece(kok, yol));
  }
  return {
    ad: 'Belge tutarlılığı',
    gecti: !eksik.length,
    olcu: istenen.length ? durum.join(' · ') : 'bu profilde belge şartı yok',
    eksik,
    surum: s,
  };
}

const YAPILACAK = {
  'Ön araştırma': (m, d) =>
    m.var +
    ' depo tarandı, ' +
    m.esik +
    ' gerekli. Kalan ' +
    (m.esik - m.var) +
    " depoyu `scout` ajanlarına 2-3'er dağıt (paralel tavan " +
    d.parallel_width +
    '), her biri `docs/taramalar/<kisa-ad>.md` yazsın, sonra `RAPOR.md` ile birleştir.',
  Kapsam: (m) =>
    'Aşağıdaki dosyaları ' +
    m.gereken.model +
    (m.gereken.efor ? '/' + m.gereken.efor : '') +
    ' ile baştan sona incele. İnceleme kaydı ajan bitişinde kendiliğinden düşer; ' +
    'ana oturumda okuyup düzelttiğin dosya da sayılır.',
  Denetim: (m) =>
    m.muhursuz.length +
    ' sözleşmeyi `auditor` ajanına ver; GEÇTİ raporundan sonra `audit`, `auditor_id`, ' +
    '`diff`, `verification` alanlarını T0 doldurur, mührü ajan basmaz.',
  'Belge tutarlılığı': () => 'Eksik veya sürümle uyuşmayan belgeyi güncelle.',
};

function rapor(sonuc) {
  const L = [];
  const bayrak = (m) => (m.gecti ? 'GEÇTİ' : 'KALDI');
  L.push(
    'tarama: ' + sonuc.profil + ' · proje: ' + sonuc.proje + (sonuc.surum ? ' ' + sonuc.surum : '')
  );
  const kalan = sonuc.maddeler.filter((m) => !m.gecti);
  L.push(
    'SONUÇ: ' +
      (kalan.length
        ? 'KALDI — ' + kalan.length + ' eksik madde'
        : 'GEÇTİ — ' + sonuc.profil + ' standardı karşılanıyor')
  );
  L.push('');
  sonuc.maddeler.forEach((m, i) => {
    L.push(i + 1 + '. ' + m.ad.padEnd(18) + bayrak(m).padEnd(7) + m.olcu);
    for (const e of m.eksik) L.push('   eksik: ' + e);
    if (m.incelenmemis && m.incelenmemis.length) {
      L.push(
        '   incelenmemiş: ' + m.incelenmemis.slice(0, 12).join(', ') + kuyruk(m.incelenmemis, 12)
      );
    }
    if (m.dusuk && m.dusuk.length) {
      for (const d of m.dusuk.slice(0, 12)) L.push('   düşük: ' + d);
      if (m.dusuk.length > 12) L.push('   düşük: … ' + (m.dusuk.length - 12) + ' dosya daha');
    }
    if (m.muhursuz && m.muhursuz.length) {
      L.push('   mühürsüz: ' + m.muhursuz.slice(0, 12).join(', ') + kuyruk(m.muhursuz, 12));
    }
    if (!m.gecti) L.push('   yapılacak: ' + YAPILACAK[m.ad](m, sonuc.dugme));
  });
  if (sonuc.maddeler[0].atlandi) {
    L.push('');
    L.push('not: docs/taramalar/ATLANDI.md var — atlama gerekçesi yazılmış, eşik yine de aranır.');
  }
  for (const n of sonuc.notlar) L.push('not: ' + n);
  if (sonuc.tamamla) {
    L.push('');
    L.push("--tamamla · bu betik hiçbir dosyaya yazmadı. Aşağısı T0'ın işi:");
    if (!kalan.length) L.push('- kapatılacak eksik yok.');
    for (const m of kalan) L.push('- ' + m.ad + ': ' + YAPILACAK[m.ad](m, sonuc.dugme));
    L.push(
      '- ajan sayısı profile bağlı: ' +
        sonuc.profil +
        ' profilinde paralel tavan ' +
        sonuc.dugme.parallel_width +
        '.'
    );
  }
  return L.join('\n') + '\n';
}

function kuyruk(l, n) {
  return l.length > n ? ' … ' + (l.length - n) + ' dosya daha' : '';
}

function kullanim() {
  return (
    [
      'kullanım: node tarama.js <eco|normal|premium> [--tamamla] [--json] [--proje <yol>]',
      '',
      'Profil verilmeden çalışmaz — hangi standarda göre denetleyeceğini kendi seçmez.',
      '',
      '  eco      1 depo · haiku+ · değişen dosyalar · denetim kritik sözleşmelerde · belge şartı yok',
      '  normal   10 depo · sonnet+ · değişen dosyalar + komşuları · her sözleşme denetlenir · README',
      '  premium  50 depo · opus/high+ · baştan sona her kaynak dosya · her sözleşme · README + CHANGELOG + skill',
      '',
      '  --tamamla  çıktının sonuna "eksikleri kapatmak için ne yapılmalı" bölümü ekler.',
      '             Betik yine hiçbir dosyaya yazmaz; işi model yapar.',
      '  --json     ayrıştırılabilir çıktı.',
      '  --proje    denetlenecek kök (varsayılan: bulunulan dizin).',
      '',
      'Çıkış kodu: 0 geçti · 1 kaldı · 2 kullanım hatası. 1 çökme değildir, rapor doludur.',
    ].join('\n') + '\n'
  );
}

function arg(ad) {
  const i = process.argv.indexOf('--' + ad);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : '';
}

function main() {
  const bayrak = process.argv.slice(2).filter((x) => x.startsWith('--'));
  const profil = process.argv.slice(2).find((x) => PROFILLER.includes(x));
  if (!profil) {
    process.stdout.write(kullanim());
    process.exit(2);
  }
  const bilinmeyen = bayrak.filter((b) => !['--tamamla', '--json', '--proje'].includes(b));
  const kok = path.resolve(arg('proje') || process.cwd());
  const tablo = dugmeTablosu();
  if (!tablo) {
    process.stderr.write(
      'eşik tablosu okunamadı: ' + path.join(__dirname, 'premium.js') + ' içindeki DUGME\n'
    );
    process.exit(2);
  }
  const dugme = tablo[profil];
  const notlar = bilinmeyen.map((b) => 'bilinmeyen bayrak yok sayıldı: ' + b);
  const r = roleKoku(kok, { git: false });
  const relay = r ? r.relay : null;
  if (!relay) notlar.push('röle kökü yok — denetim ve kapsam maddeleri boş kümede ölçüldü');

  const maddeler = [
    onArastirma(kok, Number(dugme.research_repos) || 0),
    kapsam(kok, relay, profil, dugme, notlar),
    denetim(relay, dugme),
    belge(kok, profil),
  ];
  const sonuc = {
    profil,
    proje: path.basename(kok),
    kok: norm(kok),
    surum: surum(kok),
    dugme,
    tamamla: bayrak.includes('--tamamla'),
    gecti: maddeler.every((m) => m.gecti),
    maddeler,
    notlar,
  };
  process.stdout.write(
    bayrak.includes('--json') ? JSON.stringify(sonuc, null, 2) + '\n' : rapor(sonuc)
  );
  process.exit(sonuc.gecti ? 0 : 1);
}

if (require.main === module) main();
module.exports = { dugmeTablosu, OLCUT, modelSirasi, eforSirasi };
