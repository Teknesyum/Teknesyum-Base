#!/usr/bin/env node

// Konsey 27.08.2026 tur 2 hükmü: birincil metrik mühür YAPTIRIMINDAN değil, koşu
// sonrası SALT-OKUNUR doğrulayıcıdan türetilir. Bu betik hiçbir davranışı değiştirmez,
// hiçbir dosyaya yazmaz — yalnız okur ve oran üretir. Bench gecesi mühür zincirine
// dokunmamanın bedeli buydu: yaptırım yerine teşhis.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

function ozet(b) {
  return crypto.createHash('sha256').update(b).digest('hex');
}

function oku(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function jsonOku(p) {
  const s = oku(p);
  if (s === null) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function alan(ad, metin) {
  const m = String(metin).match(new RegExp('^' + ad + ':[ \t]*(.+)$', 'im'));
  return m ? m[1].trim() : '';
}

function ownsListesi(metin) {
  const ham = (String(metin).match(/^owns:[ \t]*\[([^\]]*)\]/im) || [])[1] || '';
  return ham
    .split(',')
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function gitGoster(kok, sha, yol) {
  const r = spawnSync('git', ['-C', kok, 'show', sha + ':' + yol.split(String.fromCharCode(92)).join('/')], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  return r.status === 0 ? r.stdout : null;
}

// dosyaOzeti'nin birebir kopyasi, ama icerigi diskten degil verilen sha'dan aliyor.
function ozetSha(kok, sha, liste) {
  const satir = liste
    .slice()
    .sort()
    .map((p) => {
      const g = gitGoster(kok, sha, p);
      return String(p).split(String.fromCharCode(92)).join('/') + ' ' + ozet(g || Buffer.alloc(0));
    });
  return ozet(satir.join('\n'));
}

function defterOku(relay) {
  const s = oku(path.join(relay, 'audits', 'defter.jsonl'));
  if (!s) return [];
  return s
    .split('\n')
    .filter((x) => x.trim())
    .map((x) => {
      try {
        return JSON.parse(x);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function dogrula(kok) {
  const relay = path.join(kok, '.claude', 'relay');
  const doneDizin = path.join(relay, 'contracts', 'done');
  let dosyalar = [];
  try {
    dosyalar = fs.readdirSync(doneDizin).filter((f) => f.endsWith('.md'));
  } catch {
    return { hata: 'bitmis sozlesme dizini yok: ' + doneDizin };
  }
  const defter = defterOku(relay);
  const sonuc = [];

  for (const dosya of dosyalar) {
    const id = path.basename(dosya, '.md');
    const metin = oku(path.join(doneDizin, dosya)) || '';
    const tur = alan('round', metin) || '0';
    const owns = ownsListesi(metin);
    const kusur = [];
    const belirsiz = [];

    const usedYol = path.join(relay, 'audits', id + '-' + tur + '.used.json');
    const used = jsonOku(usedYol);
    if (!used) kusur.push('kanit yok: ' + path.basename(usedYol) + ' bulunamadi');

    const satir = defter.find((d) => d.id === id);
    // Karsilanmadi olarak kapanan sozlesme MUHURLENMEDI: denetim kaydi aranmaz, orana
    // katilmaz. Konsey hukmu 27.08.2026 — is korunur, kazanc olculmedi sayilir.
    if (satir && satir.sonuc === 'karsilanmadi') {
      sonuc.push({ id, tur, owns, kusur: [], belirsiz: [], dusuk: false, muhursuz: true });
      continue;
    }
    if (!satir) kusur.push('defterde satir yok');
    else if (satir.kaynak === 'devralindi') kusur.push('defter satiri devralindi (kanit degil)');

    if (used) {
      if (used.result !== 'passed') kusur.push('denetim sonucu: ' + used.result);
      const canli = jsonOku(path.join(relay, 'live', String(used.auditorRunId) + '.json'));
      // OLCULDU 27.08.2026: live/ kayitlari bir gunde supuruluyor. Cozulmeyen kimlik
      // uzun omurlu depoda sahtecilik degil SAKLAMA artefaktidir; orana katilmaz,
      // ayri sayilir. Bench kosusu saatler surdugu icin orada kayit hala durur.
      if (!canli) belirsiz.push('auditorRunId cozulmuyor (kayit supurulmus olabilir): ' + used.auditorRunId);
      else {
        const tip = String(canli.agent_type || '').replace(/^teknesyum:/, '');
        if (tip !== 'auditor') kusur.push('denetci degil: agent_type=' + (tip || '?'));
        if (Array.isArray(canli.files) && canli.files.length)
          kusur.push('denetci dosya yazmis: ' + canli.files.length + ' dosya');
      }
      // OLCULDU 27.08.2026: dosyaOzeti klasor yolunu okuyamayinca bos tampon sayiyor.
      // owns listesinde klasor olan sozlesmenin diffHash'i icerikten bagimsiz sabit —
      // yani muhur o sozlesme icin hicbir sey dogrulamiyor. Ayri kusur olarak sayilir.
      const klasor = owns.filter((p) => {
        try {
          return fs.statSync(path.join(kok, p)).isDirectory();
        } catch {
          return false;
        }
      });
      if (klasor.length) kusur.push('owns klasor iceriyor, diffHash bos: ' + klasor.join(' '));

      if (used.completedSha && owns.length && !klasor.length) {
        const beklenen = ozetSha(kok, used.completedSha, owns);
        // OLCULDU 27.08.2026: diffHash muhurleme aninda CALISMA AGACINDAN hesaplaniyor,
        // o agac hicbir yere kaydedilmiyor. Kirli agacla muhurlenen sozlesmede commit'ten
        // yeniden uretilen ozet mesru olarak tutmaz. Yani hash ucuncu tarafca DOGRULANAMAZ:
        // bu bir sahtecilik kaniti degil, muhrun tasarim zaafi. Orana katmiyoruz.
        if (beklenen !== used.diffHash)
          belirsiz.push('diffHash commit icerigiyle tutmuyor — muhur calisma agacindan hesaplanmis, bagimsiz dogrulanamaz');
      }
    }
    sonuc.push({ id, tur, owns, kusur, belirsiz, dusuk: kusur.length > 0 });
  }

  const muhurlu = sonuc.filter((x) => !x.muhursuz);
  const dusen = muhurlu.filter((x) => x.dusuk);
  const belirsizler = muhurlu.filter((x) => !x.dusuk && x.belirsiz.length);
  return {
    kok,
    toplam: sonuc.length,
    muhurlu: muhurlu.length,
    muhursuz: sonuc.length - muhurlu.length,
    dusen: dusen.length,
    belirsiz: belirsizler.length,
    oran: muhurlu.length ? Number((dusen.length / muhurlu.length).toFixed(4)) : null,
    kayitlar: sonuc,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const jsonMu = argv.includes('--json');
  const kok = argv.find((a) => !a.startsWith('--')) || process.cwd();
  const r = dogrula(path.resolve(kok));
  if (jsonMu) {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
    return;
  }
  if (r.hata) {
    process.stderr.write(r.hata + '\n');
    process.exitCode = 2;
    return;
  }
  process.stdout.write(
    'muhur dogrulamasi · ' + r.kok + '\n' +
      'bitmis sozlesme: ' + r.toplam + ' (muhurlu ' + r.muhurlu +
      ' · muhursuz kapanis ' + r.muhursuz + ')\n' +
      'dusen: ' + r.dusen + ' · belirsiz: ' + r.belirsiz +
      ' · yanlis tamam orani: ' + (r.oran === null ? '—' : (r.oran * 100).toFixed(1) + '%') +
      ' (payda: muhurlu)\n\n'
  );
  for (const k of r.kayitlar) {
    if (!k.dusuk) continue;
    process.stdout.write('  ' + k.id + ' (tur ' + k.tur + ')\n');
    for (const c of k.kusur) process.stdout.write('      - ' + c + '\n');
  }
}

if (require.main === module) main();
module.exports = { dogrula };
