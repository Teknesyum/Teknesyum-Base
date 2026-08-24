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
const kapsayici = require('../hooks/kapsayici.js');

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

// `audit` bir eşiktir: sözleşmenin geri dönüş maliyeti bu seviyede ya da üstündeyse
// denetçi açılır. Sözleşme kendi seviyesini `risk:` alanında söyleyebilir; söylemezse
// diskte ölçülebilen tek yayılma göstergesi olan `owns` sayısı vekil olarak kullanılır.
const RISK_SIRA = ['medium', 'high', 'critical', 'very-critical'];
const DENETIM_ACIKLAMA = {
  off: 'denetim kapalı',
  'very-critical': 'yalnız geri dönüşü olmayan sözleşmeler (risk: very-critical · owns ≥ 5)',
  critical: 'kritik ve üstü (risk: critical · owns ≥ 3)',
  high: 'geri dönüşü pahalı olan her şey (risk: high · owns ≥ 2)',
  'every-contract': 'her sözleşme',
};

function sozlesmeRiski(govde) {
  const m = govde.match(/^risk:[ \t]*(medium|high|critical|very-critical)[ \t]*$/im);
  if (m) return m[1].toLowerCase();
  const n = owns(govde);
  return n >= 5 ? 'very-critical' : n >= 3 ? 'critical' : n >= 2 ? 'high' : 'medium';
}

function denetlenirMi(kip, govde) {
  if (kip === 'off') return false;
  if (kip === 'every-contract') return true;
  const esik = RISK_SIRA.indexOf(kip);
  if (esik < 0) return true;
  return RISK_SIRA.indexOf(sozlesmeRiski(govde)) >= esik;
}

function denetim(relay, dugme) {
  const kip = dugme.audit;
  const dizin = relay ? path.join(relay, 'contracts', 'done') : null;
  const hepsi = dizin ? dosyalar(dizin).filter((f) => /\.md$/i.test(f)) : [];
  const muhursuz = [];
  let bakilan = 0;
  for (const f of hepsi) {
    const govde = oku(path.join(dizin, f)) || '';
    if (!denetlenirMi(kip, govde)) continue;
    bakilan++;
    if (!MUHUR.test(govde) || !KANIT.every((r) => r.test(govde))) muhursuz.push(f);
  }
  const aciklama = DENETIM_ACIKLAMA[kip] || 'her sözleşme';
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

// Lisans, adla aynı adımda kararlaşan bir alan (relay §2 madde 6) ama kuralın kapısı
// yoktu: on Teknesyum deposunun altısı sorulmadan MIT, dördü hiç lisanssız açılmıştı.
// Lisanssız depo "herkese açık" değil, telif hukukunda "tüm hakları saklıdır" demektir.
// Ölçüldü: docs/openlogs/kapali/HATA-lisans-adimi-yok.md
//
// Ölçüt iki şey soruyor: lisans **var mı**, ve depo lisansı hakkında **tek bir şey mi**
// söylüyor. İkincisi ilkinden daha sık kırılıyor — bir yüzey güncellenip öteki
// unutulduğunda depo iki farklı lisans beyan ediyor ve hangisinin geçerli olduğu
// mahkemede belirsizleşiyor.
const LISANS_IZI = [
  [/GNU AFFERO GENERAL PUBLIC LICENSE/i, 'AGPL-3.0'],
  [/GNU GENERAL PUBLIC LICENSE[\s\S]{0,400}Version 3/i, 'GPL-3.0'],
  [/GNU LESSER GENERAL PUBLIC LICENSE/i, 'LGPL-3.0'],
  [/Mozilla Public License Version 2\.0/i, 'MPL-2.0'],
  [/Apache License[\s\S]{0,200}Version 2\.0/i, 'Apache-2.0'],
  [/PolyForm Noncommercial/i, 'PolyForm-Noncommercial'],
  [/PolyForm Shield/i, 'PolyForm-Shield'],
  [/Permission is hereby granted, free of charge/i, 'MIT'],
  [/Redistribution and use in source and binary forms/i, 'BSD'],
];

// Aile karşılaştırması: `AGPL-3.0-or-later`, `AGPL-3.0-only` ve `AGPL-3.0` aynı şeyi
// söylüyor. Sürüm ve `-or-later` kuyruğu atılır, kalan çekirdek karşılaştırılır.
function lisansAilesi(x) {
  return String(x || '')
    .trim()
    .replace(/-(or-later|only)$/i, '')
    .replace(/[-_ ]?v?\d+(\.\d+)*$/, '')
    .toUpperCase();
}

function lisansMetni(kok) {
  for (const f of dosyalar(kok)) {
    if (!/^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f)) continue;
    const g = oku(path.join(kok, f));
    if (g && g.trim()) return { dosya: f, govde: g };
  }
  return null;
}

function lisansKimligi(govde) {
  for (const [desen, ad] of LISANS_IZI) if (desen.test(govde)) return ad;
  return null;
}

// Deponun lisans hakkında konuştuğu her yüzey. Her biri `{ nerede, ne }` döner;
// `ne` null ise o yüzey lisanstan hiç söz etmiyor demektir ve sessizlik ihlal değildir.
function lisansYuzeyleri(kok) {
  const cikan = [];
  const ekle = (nerede, ne) => {
    if (ne) cikan.push({ nerede, ne: String(ne) });
  };

  const pj = jsonOku(path.join(kok, 'package.json'));
  if (pj) ekle('package.json', pj.license);

  for (const y of [
    path.join(kok, '.claude-plugin', 'plugin.json'),
    path.join(kok, 'teknesyum', '.claude-plugin', 'plugin.json'),
  ]) {
    const pl = jsonOku(y);
    if (pl) ekle(gorece(kok, y), pl.license);
  }

  const py = oku(path.join(kok, 'pyproject.toml'));
  if (py) ekle('pyproject.toml', (py.match(/^license[ \t]*=[ \t]*"([^"]+)"/im) || [])[1]);

  for (const f of dosyalar(kok)) {
    if (!/\.(csproj|fsproj|vbproj)$/i.test(f)) continue;
    const g = oku(path.join(kok, f)) || '';
    ekle(f, (g.match(/<PackageLicenseExpression>([^<]+)</i) || [])[1]);
  }

  // README rozeti ve "License: X" cümlesi. Rozet metni kullanıcının gördüğü beyandır;
  // dosya doğru ama rozet yanlışsa depo yine iki şey söylüyor demektir.
  const ry = belgeAra(kok, 'README');
  const rg = ry ? oku(ry) || '' : '';
  if (rg) {
    const rozet =
      (rg.match(/alt="License[ :]+([A-Za-z0-9.+-]+)"/i) || [])[1] ||
      (rg.match(/shields\.io\/badge\/[Ll]icense-([A-Za-z0-9.%+-]+?)-/) || [])[1];
    ekle('README rozeti', rozet && decodeURIComponent(rozet.replace(/%20/g, ' ')));
  }
  return cikan;
}

function lisans(kok) {
  const dosya = lisansMetni(kok);
  if (!dosya) {
    return {
      ad: 'Lisans',
      gecti: false,
      olcu: 'LICENSE yok — depo "tüm hakları saklıdır" durumunda',
      eksik: ['LICENSE dosyası yok; lisanssız depo kullanılamaz, kopyalanamaz, dağıtılamaz'],
    };
  }
  const kimlik = lisansKimligi(dosya.govde);
  const yuzey = lisansYuzeyleri(kok);
  const eksik = [];
  const durum = [dosya.dosya + ' — ' + (kimlik || 'tanınmayan metin')];

  if (!kimlik)
    eksik.push(dosya.dosya + ' bilinen bir lisans metnine benzemiyor; metin birebir kopyalanmalı');

  const aile = lisansAilesi(kimlik);
  for (const y of yuzey) {
    const uyar = kimlik && lisansAilesi(y.ne) !== aile;
    durum.push(y.nerede + ' — ' + y.ne);
    if (uyar) eksik.push(y.nerede + ' "' + y.ne + '" diyor, ' + dosya.dosya + ' "' + kimlik + '"');
  }

  // Katkı alan depoda telifin dağılmaması için DCO. İkisi birlikte girer: CONTRIBUTING
  // katkı çağrısıdır, DCO o katkının hangi şartla alındığıdır. Biri varken öteki yoksa
  // depo katkı istiyor ama şartını söylemiyor demektir.
  const katki = dosyalar(kok).some((f) => /^contributing(\.(md|txt))?$/i.test(f));
  const dco = dosyalar(kok).some((f) => /^dco(\.(md|txt))?$/i.test(f));
  if (katki && !dco) eksik.push('CONTRIBUTING var, DCO yok — katkının şartı yazılı değil');
  if (dco && !katki) eksik.push('DCO var, CONTRIBUTING yok — şart var, çağrı yok');
  if (katki && dco) durum.push('DCO + CONTRIBUTING');

  return {
    ad: 'Lisans',
    gecti: !eksik.length,
    olcu: durum.join(' · '),
    eksik,
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
  Lisans: () =>
    'LICENSE yaz ya da beyanları hizala; karar kullanıcınındır, varsayılan seçilmez ' +
    '(relay §2 madde 6).',
};

// Standart tek projeye göre yazılmıştır: eşikler bir deponun ön araştırması, bir
// kaynak ağacının kapsamı, bir README'nin sürümüdür. Projeleri barındıran üst
// klasörde çalıştırıldığında bunların hiçbiri anlam taşımaz — ölçülen sayı on beş
// projenin toplamı olur, "755 dosya incelenmemiş" gibi kapatılamaz bir eksik çıkar.
// O yüzden ölçmeden önce durur ve hangi projede çalışacağını sorar.
function kapsayiciRapor(profil, kap) {
  const q = (y) => (/\s/.test(y) ? '"' + y + '"' : y);
  return (
    [
      'tarama: ' + profil + ' · kök: ' + path.basename(kap.kok),
      'DURDU — burası kapsayıcı klasör, tek proje değil',
      '',
      norm(kap.kok) + ' kendisi bir proje değil; altında ' + kap.altlar.length + ' proje var.',
      'Standart tek projeye göre ölçülür; burada ölçülen her sayı ' +
        kap.altlar.length +
        ' projenin toplamı olur.',
      '',
      'alt projeler: ' + kap.altlar.join(', '),
      '',
      'yapılacak: kullanıcıya hangi projenin denetleneceğini sor, sonra o kökte çalıştır:',
      '  node tarama.js ' + profil + ' --proje ' + q(norm(path.join(kap.kok, '<ad>'))),
      '',
      'Denetlenecek proje henüz yoksa önce klasörü kur — kullanıcıya sor:',
      '  ' + norm(path.join(kap.kok, '<yeni-ad>')) + ' açılsın mı?',
      '',
      'Kapsayıcının kendisi gerçekten denetlenecekse --kapsayici ekle.',
    ].join('\n') + '\n'
  );
}

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

// `/scan ui` dördüncü bir kiptir, profilden bağımsızdır. Öteki üç kip ihlal arar;
// bu kip ihlalin yanında **eksikliği** de arar. Yalnız yasak listesine bakan bir denetim
// hiç hareket etmeyen bir arayüzü temiz raporlar, rapor da yalan olur.
const UI_KIPI = 'ui';
const UI_UZANTI = new Set(['.css', '.tsx', '.jsx', '.vue', '.svelte', '.xaml', '.axaml']);
const MODUL_UZANTI = new Set(['.ts', '.js', '.mjs', '.cjs']);
const UI_ATLA = new Set([
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
  '.next',
  '.claude',
  'graphify-out',
]);
const HAREKET_PAKETI = ['motion', 'framer-motion', 'gsap', 'animejs', '@formkit/auto-animate'];
const YASAK_OZELLIK = /transition[^;]*\b(width|height|top|left|margin|box-shadow|filter)\b/i;
const BILESEN_ADI = /(panel|dialog|modal|drawer|sheet|popover|tooltip|toast|menu|accordion)/i;
const HAREKET_IZI =
  /transition|animate|animation|motion\.|AnimatePresence|@keyframes|Storyboard|useSpring/i;
const LISTE_HAREKETI =
  /AnimatePresence|autoAnimate|auto-animate|@keyframes|transition|layout[ =}]/i;
const STIL_ADI = /^(theme|global|globals|index|app|main|style|styles)\.css$/i;
const UI_BULGU_TAVANI = 40;
const AZALTILMIS_BLOK = [
  '@media (prefers-reduced-motion: reduce) {',
  '  *, *::before, *::after {',
  '    animation-duration: 0.01ms !important;',
  '    animation-iteration-count: 1 !important;',
  '    transition-duration: var(--tk-t-instant) !important;',
  '  }',
  '}',
].join('\n');

// Palet, süre ölçeği ve tavan burada ikinci kez yazılmaz — `teknesyum-ui` standardının
// `theme.css`'i tek kaynaktır. Okunamazsa varsayılana düşülmez: ölçüyü uydurmak,
// ölçüsüz kalmaktan kötüdür. O maddeler atlanır ve not düşülür.
function uiTema() {
  const adaylar = [
    path.resolve(__dirname, '..', 'skills', 'teknesyum-ui', 'assets', 'theme.css'),
    path.resolve(__dirname, '..', '..', 'skills', 'teknesyum-ui', 'assets', 'theme.css'),
  ];
  for (const aday of adaylar) {
    const govde = oku(aday);
    if (!govde) continue;
    const palet = new Set((govde.match(/#[0-9a-fA-F]{3,8}\b/g) || []).map(hexNorm));
    const sure = [];
    for (const m of govde.matchAll(/--(tk-t-[a-z]+)\s*:\s*(\d+(?:\.\d+)?)(ms|s)\b/g)) {
      sure.push({ ad: '--' + m[1], ms: m[3] === 's' ? Number(m[2]) * 1000 : Number(m[2]) });
    }
    if (!palet.size || !sure.length) continue;
    sure.sort((a, b) => a.ms - b.ms);
    return { palet, sure, tavan: sure[sure.length - 1].ms, kaynak: norm(aday) };
  }
  return null;
}

function hexNorm(deger) {
  const v = String(deger).toLowerCase();
  if (v.length === 4) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  if (v.length === 9 && v.endsWith('ff')) return v.slice(0, 7);
  return v;
}

function isik(hex) {
  const k = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

function siyahaKarsi(hex) {
  return (isik(hex) + 0.05) / 0.05;
}

function uiDosyalar(kok) {
  const ui = [];
  const modul = [];
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
        if (!UI_ATLA.has(e.name)) yigin.push(tam);
        continue;
      }
      const uz = path.extname(e.name).toLowerCase();
      if (UI_UZANTI.has(uz)) ui.push(tam);
      else if (MODUL_UZANTI.has(uz)) modul.push(tam);
    }
  }
  return { ui: ui.sort(), modul: modul.sort() };
}

function hareketPaketleri(kok) {
  const p = jsonOku(path.join(kok, 'package.json'));
  if (!p) return [];
  const hepsi = Object.assign({}, p.dependencies || {}, p.devDependencies || {});
  return HAREKET_PAKETI.filter((ad) => hepsi[ad]).map((ad) => ({ ad, surum: String(hepsi[ad]) }));
}

function ithalDeseni(ad) {
  return new RegExp('[\'"]' + ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:/[^\'"]*)?[\'"]');
}

function uiBulgu(kol, tur, dosya, satir, mesaj, islem) {
  return { kol, tur, dosya, satir, mesaj, islem: islem || null, duzeltildi: false };
}

function bolVirgul(deger) {
  const out = [];
  let derinlik = 0;
  let bas = 0;
  for (let i = 0; i < deger.length; i++) {
    const c = deger[i];
    if (c === '(') derinlik++;
    else if (c === ')') derinlik--;
    else if (c === ',' && !derinlik) {
      out.push(deger.slice(bas, i));
      bas = i + 1;
    }
  }
  out.push(deger.slice(bas));
  return out;
}

function gecisAc(satirMetni) {
  let y = satirMetni.replace(/\btransition-all\b/g, 'transition-[opacity,transform]');
  y = y.replace(
    /(transition-property\s*:\s*)([^;{}]*)/gi,
    (_, bas, deger) =>
      bas +
      bolVirgul(deger)
        .map((p) => (p.trim().toLowerCase() === 'all' ? 'opacity, transform' : p.trim()))
        .join(', ')
  );
  return y.replace(
    /(\btransition\s*:\s*)([^;{}]*)/gi,
    (_, bas, deger) =>
      bas +
      bolVirgul(deger)
        .map((p) => {
          const s = p.trim();
          if (!/^all\b/i.test(s)) return s;
          const kuyrukMetni = s.slice(3).trim();
          return ['opacity', 'transform']
            .map((a) => (kuyrukMetni ? a + ' ' + kuyrukMetni : a))
            .join(', ');
        })
        .join(', ')
  );
}

function enYakinToken(ms, tema) {
  let en = tema.sure[0];
  for (const t of tema.sure) if (Math.abs(t.ms - ms) < Math.abs(en.ms - ms)) en = t;
  return en.ad;
}

function sureTokenle(satirMetni, tema) {
  const y = satirMetni.replace(
    /\bduration-(\d+(?:\.\d+)?)\b/g,
    (_, n) => 'duration-[var(' + enYakinToken(Number(n), tema) + ')]'
  );
  return y.replace(/\b(?:transition|animation)(?:-duration)?\s*:\s*([^;{}]*)/gi, (t, deger) => {
    const yeni = deger.replace(
      /(\d+(?:\.\d+)?)(ms|s)\b/g,
      (_, n, birim) =>
        'var(' + enYakinToken(birim === 's' ? Number(n) * 1000 : Number(n), tema) + ')'
    );
    return t.slice(0, t.length - deger.length) + yeni;
  });
}

function sureOlculeri(satirMetni) {
  const out = [];
  for (const m of satirMetni.matchAll(/\bduration-(\d+(?:\.\d+)?)\b/g))
    out.push({ metin: m[0], ms: Number(m[1]) });
  for (const m of satirMetni.matchAll(/\b(?:transition|animation)(?:-duration)?\s*:\s*([^;{}]*)/gi))
    for (const d of m[1].matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g))
      out.push({ metin: d[0], ms: d[2] === 's' ? Number(d[1]) * 1000 : Number(d[1]) });
  return out;
}

const UI_ISLEM = { gecisAc, sureTokenle };

function uiSatirlari(dosya, metin, tema, bulgular) {
  const uz = path.extname(dosya).toLowerCase();
  const web = uz !== '.xaml' && uz !== '.axaml';
  metin.split(/\r?\n/).forEach((satirMetni, sira) => {
    const satir = sira + 1;
    if (
      /\btransition-all\b/.test(satirMetni) ||
      /transition(?:-property)?\s*:[^;{}]*\ball\b/i.test(satirMetni)
    ) {
      bulgular.push(
        uiBulgu(
          'ihlal',
          'transitionAll',
          dosya,
          satir,
          'transition-all — yalnız opacity ve transform animasyonlanır',
          'gecisAc'
        )
      );
    }
    if (YASAK_OZELLIK.test(satirMetni)) {
      bulgular.push(
        uiBulgu(
          'ihlal',
          'yasakOzellik',
          dosya,
          satir,
          'yerleşim özelliği animasyonlanıyor — boyut değişimi scale ile yapılır',
          null
        )
      );
    }
    if (tema) {
      const olcu = sureOlculeri(satirMetni);
      const asan = olcu.filter((o) => o.ms > tema.tavan);
      const sabit = olcu.filter((o) => o.ms <= tema.tavan);
      if (asan.length) {
        bulgular.push(
          uiBulgu(
            'ihlal',
            'sureTavani',
            dosya,
            satir,
            asan[0].metin + ' — ' + tema.tavan + ' ms tavanının üstünde',
            'sureTokenle'
          )
        );
      } else if (sabit.length) {
        bulgular.push(
          uiBulgu(
            'ihlal',
            'sabitSure',
            dosya,
            satir,
            sabit[0].metin + ' — sabit süre token değil',
            'sureTokenle'
          )
        );
      }
    }
    if (tema && web) {
      for (const m of satirMetni.match(/#[0-9a-fA-F]{3,8}\b/g) || []) {
        if (tema.palet.has(hexNorm(m))) continue;
        bulgular.push(
          uiBulgu('ihlal', 'tokenDisiRenk', dosya, satir, m + ' — palet dışı renk', null)
        );
        break;
      }
    }
    const yazi = satirMetni.match(
      /(?:^|[^-\w])(?:color|Foreground)\s*[:=]\s*"?(#[0-9a-fA-F]{3,8})\b/i
    );
    if (yazi) {
      const h = hexNorm(yazi[1]);
      if (h.length === 7 && (!tema || !tema.palet.has(h)) && siyahaKarsi(h) < 7) {
        bulgular.push(
          uiBulgu(
            'ihlal',
            'kontrast',
            dosya,
            satir,
            yazi[1] + ' — siyah zeminde ' + siyahaKarsi(h).toFixed(1) + ':1, 7:1 altı',
            null
          )
        );
      }
    }
    if (/\btext-shadow\s*:/i.test(satirMetni) && !/text-shadow\s*:\s*none/i.test(satirMetni)) {
      bulgular.push(
        uiBulgu('ihlal', 'metneGlow', dosya, satir, 'metne glow verilmez — glow kutuya', null)
      );
    }
    const wpf = satirMetni.match(
      /Storyboard\.TargetProperty\s*=\s*"[^"]*\b(LayoutTransform|Effect)/
    );
    if (wpf) {
      bulgular.push(
        uiBulgu(
          'ihlal',
          wpf[1] === 'LayoutTransform' ? 'wpfYerlesim' : 'wpfGolge',
          dosya,
          satir,
          wpf[1] + ' animasyon hedefi — Storyboard yalnız RenderTransform ve Opacity üstünde',
          null
        )
      );
    }
    if (
      web &&
      uz !== '.css' &&
      /\bhover:/.test(satirMetni) &&
      !/\btransition\b/.test(satirMetni) &&
      !/\bduration-/.test(satirMetni)
    ) {
      bulgular.push(
        uiBulgu('durgunluk', 'hoverGecisYok', dosya, satir, 'hover var, geçiş yok', null)
      );
    }
  });
}

function stilBolumleri(dosya, metin) {
  const uz = path.extname(dosya).toLowerCase();
  if (uz === '.css') return [{ metin, ofset: 0 }];
  if (uz !== '.vue' && uz !== '.svelte') return [];
  const out = [];
  for (const m of metin.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const bas = m.index + m[0].indexOf(m[1]);
    out.push({ metin: m[1], ofset: (metin.slice(0, bas).match(/\n/g) || []).length });
  }
  return out;
}

function cssKurallari(metin, ofset) {
  const out = [];
  const yigin = [];
  let satir = 1;
  let bas = 0;
  let basSatir = 1;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (c === '{') {
      const ham = metin.slice(bas, i).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
      const bosluk = (/^\s*/.exec(ham)[0].match(/\n/g) || []).length;
      yigin.push({ sec: ham.trim(), satir: ofset + basSatir + bosluk, govdeBas: i + 1 });
      bas = i + 1;
      basSatir = satir;
    } else if (c === '}') {
      const k = yigin.pop();
      if (k) {
        k.govde = metin.slice(k.govdeBas, i);
        out.push(k);
      }
      bas = i + 1;
      basSatir = satir;
    } else if (c === '\n') {
      satir++;
    }
  }
  return out;
}

function uiBloklari(dosya, metin, bulgular) {
  for (const bolum of stilBolumleri(dosya, metin)) {
    const kurallar = cssKurallari(bolum.metin, bolum.ofset).filter((k) => !k.govde.includes('{'));
    const indeks = new Map();
    for (const k of kurallar)
      for (const s of k.sec.split(',')) {
        const t = s.trim();
        if (t && !indeks.has(t)) indeks.set(t, k);
      }
    for (const k of kurallar) {
      if (
        /drop-shadow\(/i.test(k.govde) &&
        /(font-size|font-weight|font-family|letter-spacing)/i.test(k.govde)
      ) {
        bulgular.push(
          uiBulgu('ihlal', 'metneGlow', dosya, k.satir, 'metin öğesine drop-shadow', null)
        );
      }
      if (!/:hover\b/.test(k.sec)) continue;
      if (/\btransition\b/i.test(k.govde)) continue;
      if (!/\b(color|background|border|opacity|transform|box-shadow|filter|outline)/i.test(k.govde))
        continue;
      const temel = k.sec
        .split(',')
        .map((s) =>
          s
            .trim()
            .replace(/:hover\b/g, '')
            .trim()
        )
        .filter(Boolean);
      if (temel.some((t) => indeks.has(t) && /\btransition\b/i.test(indeks.get(t).govde))) continue;
      bulgular.push(
        uiBulgu(
          'durgunluk',
          'hoverGecisYok',
          dosya,
          k.satir,
          k.sec + ' — hover var, geçiş yok',
          null
        )
      );
    }
  }
}

function stilHedefi(kok, ui) {
  const css = ui.filter((f) => path.extname(f).toLowerCase() === '.css');
  if (!css.length) return null;
  const adli = css.filter((f) => STIL_ADI.test(path.basename(f)));
  const aday = adli.length ? adli : css;
  return aday.sort((a, b) => {
    const x = gorece(kok, a);
    const y = gorece(kok, b);
    return x.split('/').length - y.split('/').length || x.localeCompare(y);
  })[0];
}

function uiTara(kok, notlar) {
  const tema = uiTema();
  if (!tema) notlar.push('teknesyum-ui theme.css okunamadı — renk ve süre maddeleri atlandı');
  const { ui, modul } = uiDosyalar(kok);
  const govde = new Map();
  const bulgular = [];
  for (const f of ui) {
    const metin = oku(f);
    if (metin === null) continue;
    const g = gorece(kok, f);
    govde.set(g, metin);
    uiSatirlari(g, metin, tema, bulgular);
    uiBloklari(g, metin, bulgular);
  }
  const paket = hareketPaketleri(kok);
  const gorulen = new Set();
  const arananlar = [...govde.values()];
  for (const p of paket) {
    const re = ithalDeseni(p.ad);
    if (arananlar.some((t) => re.test(t))) gorulen.add(p.ad);
  }
  for (const f of modul) {
    if (gorulen.size === paket.length) break;
    const metin = oku(f);
    if (metin === null) continue;
    for (const p of paket)
      if (!gorulen.has(p.ad) && ithalDeseni(p.ad).test(metin)) gorulen.add(p.ad);
  }
  const tumu = arananlar.join('\n');
  // Kullanıcının şikâyetinin birebir karşılığı: kütüphane kurulu, kimse çağırmamış.
  // Bu satır raporun başlığıdır; yasak listesi taraması bunu hiç göremez.
  for (const p of paket) {
    if (gorulen.has(p.ad)) continue;
    bulgular.push(
      uiBulgu(
        'durgunluk',
        'kuruluKullanilmamis',
        '',
        0,
        p.ad + ' kurulu (' + p.surum + '), hiç import edilmemiş',
        null
      )
    );
  }
  const reaktif = paket.find(
    (p) => (p.ad === 'motion' || p.ad === 'framer-motion') && gorulen.has(p.ad)
  );
  if (reaktif && !/\bMotionConfig\b/.test(tumu)) {
    bulgular.push(
      uiBulgu(
        'durgunluk',
        'motionConfigYok',
        '',
        0,
        reaktif.ad + ' import ediliyor ama MotionConfig sarmalayıcısı yok — reducedMotion gelmiyor',
        null
      )
    );
  }
  const webVar = ui.some((f) => /\.(css|tsx|jsx|vue|svelte)$/i.test(f));
  const xamlVar = ui.some((f) => /\.(xaml|axaml)$/i.test(f));
  if (webVar && !/prefers-reduced-motion/.test(tumu)) {
    const hedef = stilHedefi(kok, ui);
    bulgular.push(
      uiBulgu(
        'durgunluk',
        'azaltilmisHareketYok',
        hedef ? gorece(kok, hedef) : '',
        0,
        'prefers-reduced-motion bloğu hiçbir dosyada yok',
        hedef ? 'azaltilmisEkle' : null
      )
    );
  }
  if (webVar && !/:focus-visible/.test(tumu)) {
    bulgular.push(
      uiBulgu('durgunluk', 'odakHalkasiYok', '', 0, ':focus-visible kuralı hiç yok', null)
    );
  }
  if (xamlVar && !/FocusVisualStyle/.test(tumu)) {
    bulgular.push(
      uiBulgu('durgunluk', 'odakHalkasiYok', '', 0, 'FocusVisualStyle hiç geçmiyor', null)
    );
  }
  for (const [g, metin] of govde) {
    const ad = path.basename(g);
    if (BILESEN_ADI.test(ad) && !HAREKET_IZI.test(metin)) {
      bulgular.push(uiBulgu('durgunluk', 'gecissizBilesen', g, 1, 'giriş/çıkış tanımı yok', null));
    }
    if (/\.(tsx|jsx)$/i.test(g) && /\.map\(/.test(metin) && !LISTE_HAREKETI.test(metin)) {
      bulgular.push(
        uiBulgu(
          'durgunluk',
          'animasyonsuzListe',
          g,
          1,
          'liste render var, konum animasyonu yok',
          null
        )
      );
    }
  }
  bulgular.sort(
    (a, b) => a.dosya.localeCompare(b.dosya) || a.satir - b.satir || a.tur.localeCompare(b.tur)
  );
  return { bulgular, tema, dosya: govde.size, paket };
}

// Otomatik düzeltme yalnız mekanik ve geri alınabilir olanda yapılır. Hangi tokenın
// geleceği belli olan satır yazılır; hangi hareketin ekleneceği, hangi tonun türetileceği
// karardır — o bulgular raporda kalır.
function uiDuzelt(kok, bulgular, tema) {
  const satirlar = new Map();
  const ekler = new Map();
  for (const b of bulgular) {
    if (!b.islem) continue;
    if (b.islem === 'azaltilmisEkle') {
      if (!b.dosya) continue;
      ekler.set(b.dosya, AZALTILMIS_BLOK);
      b.duzeltildi = true;
      continue;
    }
    if (b.islem === 'sureTokenle' && !tema) continue;
    if (!satirlar.has(b.dosya)) satirlar.set(b.dosya, new Map());
    const dosyaSatir = satirlar.get(b.dosya);
    if (!dosyaSatir.has(b.satir)) dosyaSatir.set(b.satir, new Set());
    dosyaSatir.get(b.satir).add(b.islem);
    b.duzeltildi = true;
  }
  for (const [dosya, dosyaSatir] of satirlar) {
    const tam = path.join(kok, dosya);
    const metin = oku(tam);
    if (metin === null) continue;
    const eol = metin.includes('\r\n') ? '\r\n' : '\n';
    const L = metin.split(/\r?\n/);
    for (const [no, islemler] of dosyaSatir) {
      if (L[no - 1] === undefined) continue;
      let y = L[no - 1];
      for (const ad of ['gecisAc', 'sureTokenle']) if (islemler.has(ad)) y = UI_ISLEM[ad](y, tema);
      L[no - 1] = y;
    }
    fs.writeFileSync(tam, L.join(eol), 'utf8');
  }
  for (const [dosya, blok] of ekler) {
    const tam = path.join(kok, dosya);
    const metin = oku(tam);
    if (metin === null) continue;
    fs.writeFileSync(tam, metin.replace(/\s*$/, '') + '\n\n' + blok + '\n', 'utf8');
  }
  return bulgular.filter((b) => b.duzeltildi);
}

// `--tamamla` dosyaya yazar. Kullanıcı yazılanı geri alabilmeli; kirli ağaçta yazılan
// satır kendi değişikliğine karışır ve `git checkout` ikisini birden götürür.
function uiKirli(kok) {
  const durum = git(kok, 'status', '--porcelain');
  if (durum === null)
    return { sebep: 'git sorulamadı — çalışma ağacının temiz olduğu doğrulanamadı' };
  const satir = durum.split('\n').filter((s) => s.trim());
  return satir.length
    ? { sebep: satir.length + ' dosyada bekleyen değişiklik var', liste: satir.slice(0, 10) }
    : null;
}

function uiBaslik(bulgular) {
  const b = bulgular.find((x) => x.tur === 'kuruluKullanilmamis');
  if (b) return b.mesaj;
  const d = bulgular.find((x) => x.kol === 'durgunluk');
  if (d) return (d.dosya ? d.dosya + ' — ' : '') + d.mesaj;
  return bulgular.length ? 'durgunluk yok, ihlal var' : 'hareket eksiği bulunamadı';
}

function uiYer(b) {
  return b.dosya ? b.dosya + (b.satir ? ':' + b.satir : '') : 'proje';
}

function uiKirliRapor(kirli) {
  return (
    [
      'tarama: ui',
      'DURDU — çalışma ağacı temiz değil, --tamamla yazmaz',
      '',
      kirli.sebep + ". Önce commit et ya da stash'le, sonra yeniden çalıştır.",
      'Bayraksız `node tarama.js ui` her zaman salt okurdur, o çalışır.',
    ]
      .concat(kirli.liste ? [''].concat(kirli.liste.map((s) => '  ' + s)) : [])
      .join('\n') + '\n'
  );
}

function uiRapor(sonuc) {
  const L = [];
  L.push('tarama: ui · proje: ' + sonuc.proje + (sonuc.surum ? ' ' + sonuc.surum : ''));
  L.push(
    sonuc.bulgular.length
      ? 'SONUÇ: KALDI — ' +
          sonuc.bulgular.length +
          ' bulgu · ' +
          sonuc.kollar.ihlal +
          ' ihlal · ' +
          sonuc.kollar.durgunluk +
          ' durgunluk'
      : 'SONUÇ: GEÇTİ — arayüz standardı karşılanıyor'
  );
  L.push('başlık: ' + sonuc.baslik);
  L.push('');
  [
    ['ihlal', 'İhlal'],
    ['durgunluk', 'Durgunluk'],
  ].forEach(([kol, ad], i) => {
    const liste = sonuc.bulgular.filter((b) => b.kol === kol);
    L.push(
      i +
        1 +
        '. ' +
        ad.padEnd(18) +
        (liste.length ? 'KALDI' : 'GEÇTİ').padEnd(7) +
        liste.length +
        ' bulgu'
    );
    for (const b of liste.slice(0, UI_BULGU_TAVANI))
      L.push('   ' + uiYer(b) + ' ' + b.mesaj + (b.duzeltildi ? ' [düzeltildi]' : ''));
    if (liste.length > UI_BULGU_TAVANI)
      L.push('   … ' + (liste.length - UI_BULGU_TAVANI) + ' bulgu daha');
  });
  L.push('');
  L.push('süre: ' + (sonuc.sure_ms / 1000).toFixed(2) + ' sn · ' + sonuc.dosya + ' arayüz dosyası');
  for (const n of sonuc.notlar) L.push('not: ' + n);
  if (sonuc.tamamla) {
    L.push('');
    const kalan = sonuc.bulgular.filter((b) => !b.duzeltildi);
    L.push(
      '--tamamla · ' +
        sonuc.duzeltilen.length +
        ' düzeltme yazıldı, ' +
        kalan.length +
        ' bulgu bırakıldı'
    );
    for (const b of sonuc.duzeltilen) L.push('- yazıldı: ' + uiYer(b) + ' ' + b.mesaj);
    if (kalan.length) L.push('karar gerektirdiği için düzeltilmedi:');
    for (const b of kalan.slice(0, UI_BULGU_TAVANI)) L.push('- ' + uiYer(b) + ' ' + b.mesaj);
  }
  return L.join('\n') + '\n';
}

function uiMain(bayrak, bilinmeyen) {
  const t0 = Date.now();
  const kok = path.resolve(arg('proje') || process.cwd());
  const kap = bayrak.includes('--kapsayici') ? null : kapsayici.kesin(kok);
  if (kap) {
    process.stdout.write(
      bayrak.includes('--json')
        ? JSON.stringify(
            { kip: UI_KIPI, durum: 'kapsayici', kok: norm(kap.kok), altlar: kap.altlar },
            null,
            2
          ) + '\n'
        : kapsayiciRapor(UI_KIPI, kap)
    );
    process.exit(2);
  }
  const tamamla = bayrak.includes('--tamamla');
  if (tamamla) {
    const kirli = uiKirli(kok);
    if (kirli) {
      process.stdout.write(
        bayrak.includes('--json')
          ? JSON.stringify({ kip: UI_KIPI, durum: 'kirli', sebep: kirli.sebep }, null, 2) + '\n'
          : uiKirliRapor(kirli)
      );
      process.exit(2);
    }
  }
  const notlar = bilinmeyen.map((b) => 'bilinmeyen bayrak yok sayıldı: ' + b);
  const { bulgular, tema, dosya, paket } = uiTara(kok, notlar);
  const duzeltilen = tamamla ? uiDuzelt(kok, bulgular, tema) : [];
  const sonuc = {
    kip: UI_KIPI,
    proje: path.basename(kok),
    kok: norm(kok),
    surum: surum(kok),
    sure_ms: Date.now() - t0,
    dosya,
    paket,
    baslik: uiBaslik(bulgular),
    tamamla,
    kollar: {
      ihlal: bulgular.filter((b) => b.kol === 'ihlal').length,
      durgunluk: bulgular.filter((b) => b.kol === 'durgunluk').length,
    },
    bulgular,
    duzeltilen,
    notlar,
  };
  sonuc.gecti = !bulgular.some((b) => !b.duzeltildi);
  process.stdout.write(
    bayrak.includes('--json') ? JSON.stringify(sonuc, null, 2) + '\n' : uiRapor(sonuc)
  );
  process.exit(sonuc.gecti ? 0 : 1);
}

function kullanim() {
  return (
    [
      'kullanım: node tarama.js <eco|normal|premium|ui> [--tamamla] [--json] [--proje <yol>]',
      '',
      'Profil verilmeden çalışmaz — hangi standarda göre denetleyeceğini kendi seçmez.',
      'Kapsayıcı klasörde çalışmaz — üst klasörde ölçülen sayı projelerin toplamı olur.',
      '',
      '  eco      1 depo · haiku+ · değişen dosyalar · denetim kritik sözleşmelerde · belge şartı yok',
      '  normal   10 depo · sonnet+ · değişen dosyalar + komşuları · her sözleşme denetlenir · README',
      '  premium  50 depo · opus/high+ · baştan sona her kaynak dosya · her sözleşme · README + CHANGELOG + skill',
      '  ui       profilden bağımsız · yalnız arayüz dosyaları · ihlal + durgunluk · beş saniyenin altında',
      '',
      '  --tamamla  eco/normal/premium: çıktının sonuna "ne yapılmalı" bölümü ekler, dosya yazmaz.',
      '             ui: mekanik olanı düzeltir, karar gerektireni rapor eder; kirli ağaçta çalışmaz.',
      '  --json     ayrıştırılabilir çıktı.',
      '  --proje    denetlenecek kök (varsayılan: bulunulan dizin).',
      '  --kapsayici  kapsayıcı kapısını aş — üst klasörü tek projeymiş gibi denetle.',
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

// `--proje ui` diyen bir çağrıda konum argümanı taranırken bayrak değeri kip sanılıyordu.
function konumlu() {
  const a = process.argv.slice(2);
  const out = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--proje') i++;
    else if (!a[i].startsWith('--')) out.push(a[i]);
  }
  return out;
}

function main() {
  const bayrak = process.argv.slice(2).filter((x) => x.startsWith('--'));
  const bilinmeyen = bayrak.filter(
    (b) => !['--tamamla', '--json', '--proje', '--kapsayici'].includes(b)
  );
  const konum = konumlu();
  if (konum.includes(UI_KIPI)) return uiMain(bayrak, bilinmeyen);
  const profil = konum.find((x) => PROFILLER.includes(x));
  if (!profil) {
    process.stdout.write(kullanim());
    process.exit(2);
  }
  const kok = path.resolve(arg('proje') || process.cwd());
  const kap = bayrak.includes('--kapsayici') ? null : kapsayici.kesin(kok);
  if (kap) {
    process.stdout.write(
      bayrak.includes('--json')
        ? JSON.stringify(
            { profil, durum: 'kapsayici', kok: norm(kap.kok), altlar: kap.altlar },
            null,
            2
          ) + '\n'
        : kapsayiciRapor(profil, kap)
    );
    process.exit(2);
  }
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
    lisans(kok),
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
